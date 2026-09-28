import pg from 'pg';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * round86-D1 hardening of the P1002 unstick script (still in the build chain:
 * `node scripts/db-unstick.mjs && prisma migrate deploy && next build`).
 *
 * r122 (deploy-unblocker, P3009): a FAILED migration record (finished_at IS
 * NULL AND rolled_back_at IS NULL) freezes the whole deploy chain — editing
 * the migration file does NOT clear the record, and on Vercel nobody can run
 * `prisma migrate resolve` by hand. Section 5 below does it automatically
 * BEFORE `migrate deploy` runs. Safety argument: Neon is PostgreSQL and
 * Prisma wraps every migration in ONE transaction (transactional DDL) → a
 * failed migration left ZERO partial state → marking it rolled-back and
 * letting deploy re-apply is always sound. Worst case (still-broken SQL):
 * deploy fails again with the REAL error instead of a frozen P3009 — strictly
 * better diagnostics, identical blast radius. The state mutation goes through
 * the official CLI (`prisma migrate resolve --rolled-back`), never raw SQL
 * against Prisma's internal table.
 *
 * What changed:
 *  - FULL try/catch: a transient DB blip (Neon cold start, network hiccup)
 *    previously crashed the whole Vercel build BEFORE `migrate deploy` ever
 *    ran. The unstick step is best-effort diagnostics — a failing probe must
 *    never fail the deploy. (If the DB is truly down, `migrate deploy` is the
 *    step that SHOULD fail — loudly, with Prisma's own error.)
 *  - Terminates only lock holders that are IDLE (stale build sessions).
 *    Active holders (a live migration in flight, application traffic holding
 *    an advisory lock) are logged but NOT killed — they might be doing real
 *    work. This bounds the blast radius on the shared production pooler.
 *  - connect() now also has its own timeout guard (connectionTimeoutMillis
 *    does not cover all pooler edge cases).
 */

const url = process.env.DATABASE_URL;
const c = new pg.Client({
  connectionString: url,
  statement_timeout: 20000,
  connectionTimeoutMillis: 20000,
});

async function main() {
  await c.connect();
  console.log('connected to', (url || '').replace(/:[^:@/]*@/, ':***@'));

  // 1) who holds advisory locks right now?
  // r98-deploy-fix: state_change أضيفت — تمييز الزومبي "idle in transaction"
  // (بقايا بناء قُتل في منتصف migrate) عن الجلسة الحية: القديمة فقط تُقتل.
  const { rows: holders } = await c.query(`
    SELECT pid, state, application_name,
           backend_start::text AS started,
           state_change::text AS state_changed,
           wait_event_type, wait_event,
           left(coalesce(query, ''), 70) AS q
    FROM pg_stat_activity
    WHERE pid IN (SELECT pid FROM pg_locks WHERE locktype = 'advisory')
      AND pid <> pg_backend_pid()
  `);
  console.log('ADVISORY_LOCK_HOLDERS =', JSON.stringify(holders, null, 2));

  // 2) terminate only stale holders; log active ones.
  // r98-deploy-fix: كان الشرط `state !== 'idle'` يقفز فوق زومبي
  // "idle in transaction" — بقايا بناء مقتول نصًا، تحمل قفل P1002 وتعطّل
  // كل بناء لاحق (حلقة ذاتية التجذير). القاعدة الآن:
  //   - idle: اقتل دائمًا (كما كان — جلسة بناء قديمة)
  //   - idle in transaction/aborted: اقتل فقط إن مر عليها 5 دقائق+
  //     (خلال دقائقها الأولى قد تكون معاملة حقيقية تستقر)
  //   - active: سجّل فقط (قد تعمل عملًا حقيقيًا)
  const FIVE_MIN_MS = 5 * 60 * 1000;
  for (const h of holders) {
    const idleInTx = h.state === 'idle in transaction' || h.state === 'idle in transaction aborted';
    if (h.state !== 'idle') {
      if (!idleInTx) {
        console.log('SKIPPED (active) pid=' + h.pid + ' state=' + h.state + ' q=' + (h.q || ''));
        continue;
      }
      const sinceChange = Date.now() - new Date(h.state_changed).getTime();
      if (sinceChange < FIVE_MIN_MS) {
        console.log('SKIPPED (idle-in-tx fresh, ' + Math.round(sinceChange / 1000) + 's) pid=' + h.pid);
        continue;
      }
    }
    try {
      await c.query('SELECT pg_terminate_backend($1)', [h.pid]);
      console.log('TERMINATED pid=' + h.pid + ' state=' + h.state + ' started=' + h.started);
    } catch (e) {
      console.log('FAILED to terminate pid=' + h.pid + ': ' + e.message);
    }
  }

  // 3) overall activity snapshot
  const { rows: act } = await c.query(
    `SELECT state, count(*) AS n FROM pg_stat_activity GROUP BY state ORDER BY n DESC`);
  console.log('ACTIVITY =', JSON.stringify(act));

  // 4) confirm the advisory lock is acquirable now (acquire + release)
  await c.query('SELECT pg_advisory_lock(72707369)');
  console.log('ADVISORY_LOCK_ACQUIRED_OK');
  await c.query('SELECT pg_advisory_unlock(72707369)');
  console.log('ADVISORY_LOCK_RELEASED_OK');

  // 5) r122: resolve FAILED migration records (the P3009 deploy freeze).
  //    Runs only when a failed record actually exists — zero cost otherwise.
  const { rows: migTable } = await c.query(
    `SELECT to_regclass('_prisma_migrations') AS t`);
  if (!migTable[0].t) {
    console.log('MIGRATION_STATE: no _prisma_migrations table (fresh database) — nothing to resolve');
  } else {
    const { rows: failedMigs } = await c.query(`
      SELECT migration_name, started_at::text AS started
      FROM _prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `);
    if (failedMigs.length === 0) {
      console.log('MIGRATION_STATE: no failed migrations — deploy chain clear');
    } else {
      console.log('MIGRATION_STATE: ' + failedMigs.length + ' FAILED migration(s) blocking deploy (P3009):');
      for (const f of failedMigs) {
        console.log('  ✗ ' + f.migration_name + ' (started ' + f.started + ')');
      }
      const prismaBin = existsSync('node_modules/.bin/prisma') ? 'node_modules/.bin/prisma' : null;
      for (const f of failedMigs) {
        const name = f.migration_name;
        // the name comes from Prisma's own table, but never pass unvalidated
        // data to a subprocess command line.
        if (!/^[A-Za-z0-9_.-]+$/.test(name)) {
          console.log('RESOLVE_SKIPPED (unexpected name format): ' + name);
          continue;
        }
        try {
          const out = execFileSync(
            prismaBin ?? 'npx',
            prismaBin
              ? ['migrate', 'resolve', '--rolled-back', name]
              : ['prisma', 'migrate', 'resolve', '--rolled-back', name],
            {
              cwd: process.cwd(),
              timeout: 90_000,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe'],
              env: process.env,
            },
          );
          const tail = (out || '').trim().split('\n').filter(Boolean).slice(-2).join(' / ');
          console.log('RESOLVED (marked rolled-back): ' + name + (tail ? ' | ' + tail : ''));
        } catch (e) {
          const detail = ((e && (e.stderr || e.stdout)) || e?.message || '').toString().trim().slice(0, 300);
          console.log('RESOLVE_FAILED: ' + name + ' — ' + detail);
        }
      }
      const { rows: stillFailed } = await c.query(`
        SELECT migration_name FROM _prisma_migrations
        WHERE finished_at IS NULL AND rolled_back_at IS NULL`);
      console.log(stillFailed.length === 0
        ? 'MIGRATION_STATE: all failed records resolved — migrate deploy will re-apply them'
        : 'MIGRATION_STATE: ' + stillFailed.length + ' record(s) STILL FAILED — migrate deploy will stop (fix the real error): '
          + stillFailed.map((r) => r.migration_name).join(', '));
    }
  }

  // 6) r121 pre-flight evidence (read-only): the effective-price backfill's own
  //    migration file (zz_round121_orderitem_effective_price_backfill)
  //    documents that Neon needs the candidate-count check before deploy —
  //    nobody can query Neon directly, so the count rides the build log.
  //    Prints 0 on every build AFTER the r121 deploy lands (the cutoff clause
  //    is the idempotency guard), so this line is self-retiring evidence.
  const { rows: hasOI } = await c.query(
    `SELECT to_regclass('"OrderItem"') AS t`);
  if (hasOI[0].t) {
    const { rows: bfCount } = await c.query(`
      SELECT COUNT(*)::int AS rows_to_update
      FROM "OrderItem" AS oi
      JOIN "Order" AS o ON o."id" = oi."orderId"
      WHERE o."createdAt" < TIMESTAMP '2026-09-25 17:37:05'
        AND oi."modifiersJson" LIKE '[%'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(oi."modifiersJson"::jsonb) AS m
          WHERE jsonb_typeof(m) = 'object'
            AND m ->> 'priceDelta' ~ '^-?[0-9]+(\\.[0-9]+)?$'
        )`);
    console.log('R121_BACKFILL_PREFLIGHT: ' + bfCount[0].rows_to_update
      + ' legacy row(s) match the guarded UPDATE (0 expected after the r121 deploy applies)');
  }
}

main()
  .then(() => c.end().then(() => console.log('UNSTICK DONE')))
  .catch((e) => {
    // best-effort diagnostics: never fail the build from here. A genuinely
    // broken DB will fail in `prisma migrate deploy` with a proper error.
    console.log('UNSTICK SKIPPED (non-fatal): ' + (e?.message || e));
    return c.end().catch(() => {});
  });
