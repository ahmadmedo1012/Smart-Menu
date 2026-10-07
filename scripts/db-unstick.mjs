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
 * `prisma migrate resolve` by hand. Section 5 below clears it automatically
 * BEFORE `migrate deploy` runs, via a single direct-SQL UPDATE that is
 * byte-equivalent to the official CLI (state-captured on Prisma 7.10: the
 * CLI's only effect is `SET rolled_back_at = now()` on the failed record).
 * Direct SQL over the already-connected client deliberately avoids spawning
 * the Prisma CLI in the build image (engine binaries / install-scripts
 * allowlist / npx prompts are all failure modes a build box may hit).
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
  //
  //    Direct SQL, byte-equivalent to `prisma migrate resolve --rolled-back`:
  //    the CLI's ONLY effect on a failed record is `SET rolled_back_at = now()`
  //    (record kept, finished_at/logs/steps untouched — state-captured and
  //    verified on Prisma 7.10 in the r122 harness). Doing it over the
  //    already-connected pg client removes every subprocess dependency the
  //    Vercel build image may not satisfy (CLI spawn, engine binaries,
  //    install-scripts allowlist). `migrate deploy` then treats rolled-back
  //    records as not-applied and re-runs the CURRENT migration file.
  //
  //    Safety: Neon is PostgreSQL and Prisma wraps every migration in ONE
  //    transaction (transactional DDL) → a failed migration left ZERO partial
  //    state → re-apply is always sound. Worst case (still-broken SQL): deploy
  //    fails again with the REAL error instead of a frozen P3009.
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
      // ---- marker B (§5 ran, found nothing to resolve; self-retiring) ----
      // failure at ~50s with this path = the ledger was already clean and
      // migrate deploy still fails — different root cause than a stuck record.
      const { rows: r121pendingB } = await c.query(`
        SELECT COUNT(*)::int AS n FROM _prisma_migrations
        WHERE migration_name = ANY($1) AND finished_at IS NULL`,
        [['zz_round121_check_constraints', 'zz_round121_not_null_alignment',
          'zz_round122_orderitem_effective_price_backfill', 'zzz_round121_rewardtransaction_check_drop']]).catch(() => [{ n: 0 }]);
      if (r121pendingB[0].n > 0) {
        console.log('R122_DIAG: no failed records but r121/r122 unfinished (' + r121pendingB[0].n + ') — marker B (20s)');
        await new Promise((r) => setTimeout(r, 20_000));
        console.log('R122_DIAG: marker B elapsed (20s) — §5 ran clean; migrate deploy owns the outcome from here');
      }
    } else {
      console.log('MIGRATION_STATE: ' + failedMigs.length + ' FAILED migration(s) blocking deploy (P3009):');
      for (const f of failedMigs) {
        console.log('  ✗ ' + f.migration_name + ' (started ' + f.started + ')');
      }
      for (const f of failedMigs) {
        let resolved = false;
        // Tier 1: direct UPDATE on this connection (fast when it works).
        for (let attempt = 1; attempt <= 2 && !resolved; attempt++) {
          try {
            const res = await c.query(
              `UPDATE _prisma_migrations
               SET rolled_back_at = now()
               WHERE migration_name = $1
                 AND finished_at IS NULL
                 AND rolled_back_at IS NULL`,
              [f.migration_name]);
            if (res.rowCount >= 1) {
              console.log('RESOLVED via direct SQL: ' + f.migration_name + (attempt > 1 ? ' (attempt ' + attempt + ')' : ''));
              resolved = true;
            } else {
              console.log('RESOLVE_RACE (0 rows, already resolved): ' + f.migration_name);
              resolved = true;
            }
          } catch (e) {
            console.log('RESOLVE_FAILED direct (attempt ' + attempt + '): ' + f.migration_name
              + ' — pg code ' + e.code + ': ' + (e.message || '').toString().slice(0, 200));
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1_000));
          }
        }
        // Tier 2: one-shot FRESH connection (a different pooled server conn —
        // sidesteps any connection-local state blocking the tier-1 write).
        if (!resolved) {
          try {
            const pg2 = pg;
            const c2 = new pg2.Client({ connectionString: url, statement_timeout: 15000, connectionTimeoutMillis: 15000 });
            await c2.connect();
            try {
              const res = await c2.query(
                `UPDATE _prisma_migrations SET rolled_back_at = now()
                 WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
                [f.migration_name]);
              if (res.rowCount >= 1) {
                console.log('RESOLVED via fresh connection: ' + f.migration_name);
                resolved = true;
              } else {
                console.log('RESOLVE_RACE on fresh connection (0 rows): ' + f.migration_name);
                resolved = true;
              }
            } finally { await c2.end().catch(() => {}); }
          } catch (e) {
            console.log('RESOLVE_FAILED fresh-connection: ' + f.migration_name
              + ' — ' + (e.code || '') + ' ' + (e.message || '').toString().slice(0, 200));
          }
        }
        // Tier 3: the official CLI in a subprocess (its own connection; this
        // is the mechanism whose timing matched the one build that got past
        // P3009 — 726db1ba).
        if (!resolved) {
          for (let attempt = 1; attempt <= 2 && !resolved; attempt++) {
            try {
              const out = execFileSync(
                existsSync('node_modules/.bin/prisma') ? 'node_modules/.bin/prisma' : 'npx',
                existsSync('node_modules/.bin/prisma')
                  ? ['migrate', 'resolve', '--rolled-back', f.migration_name]
                  : ['prisma', 'migrate', 'resolve', '--rolled-back', f.migration_name],
                { cwd: process.cwd(), timeout: 120_000, encoding: 'utf8',
                  stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
              console.log('RESOLVED via prisma CLI: ' + f.migration_name + ' | '
                + (out || '').trim().split('\n').filter(Boolean).slice(-1).join('').slice(0, 120));
              resolved = true;
            } catch (e) {
              console.log('RESOLVE_FAILED cli (attempt ' + attempt + '): ' + f.migration_name
                + ' — ' + ((e.stderr || e.stdout || e.message) || '').toString().trim().slice(0, 250));
              if (attempt < 2) await new Promise((r) => setTimeout(r, 1_000));
            }
          }
        }
        if (!resolved) {
          console.log('UNRESOLVED after all 3 tiers: ' + f.migration_name
            + ' — migrate deploy will stop with P3009 (see tiers above for the per-tier errors)');
        }
      }
      const { rows: stillFailed } = await c.query(`
        SELECT migration_name FROM _prisma_migrations
        WHERE finished_at IS NULL AND rolled_back_at IS NULL`);
      console.log(stillFailed.length === 0
        ? 'MIGRATION_STATE: all failed records resolved — migrate deploy will re-apply them'
        : 'MIGRATION_STATE: ' + stillFailed.length + ' record(s) STILL FAILED — migrate deploy will stop (fix the real error): '
          + stillFailed.map((r) => r.migration_name).join(', '));
      // evidence dump for the build log: the ledger state of every
      // not-yet-finished migration after resolution
      const { rows: pendingView } = await c.query(`
        SELECT migration_name,
               finished_at IS NOT NULL AS applied,
               rolled_back_at IS NOT NULL AS rolled_back
        FROM _prisma_migrations
        WHERE finished_at IS NULL
        ORDER BY migration_name`);
      if (pendingView.length > 0) {
        console.log('MIGRATION_LEDGER (unfinished records): ' + JSON.stringify(pendingView));
      }
      // ---- TEMPORARY r122 DEPLOY DIAGNOSTIC (self-retiring) ------------------
      // The last 4 deployments all died in the migrate-deploy window despite a
      // locally-proven chain. These sleeps make the outcome readable from the
      // deployment TIMELINE alone (no log access needed):
      //   failure at ~130s = marker A2: resolution DID NOT clear the records
      //                       (RESOLVE_FAILED / STILL FAILED) -> migrate P3009s
      //   failure at ~75s  = marker A1: resolution OK; migrate deploy fails at
      //                       its own boot/apply (checksum/P1002/other)
      //   failure at ~30s  = the script never reached §5
      //   success          = fixed — markers auto-retire (gated on unfinished
      //                       r121/r122 records only)
      const { rows: r121pending } = await c.query(`
        SELECT COUNT(*)::int AS n FROM _prisma_migrations
        WHERE migration_name = ANY($1) AND finished_at IS NULL`,
        [['zz_round121_check_constraints', 'zz_round121_not_null_alignment',
          'zz_round122_orderitem_effective_price_backfill', 'zzz_round121_rewardtransaction_check_drop']]).catch(() => [{ n: 0 }]);
      if (stillFailed.length > 0) {
        console.log('R122_DIAG: marker A2 — records STILL FAILED after resolution; migrate deploy will P3009 (+60s)');
        await new Promise((r) => setTimeout(r, 60_000));
        console.log('R122_DIAG: marker A2 elapsed');
      } else if (r121pending[0].n > 0) {
        console.log('R122_DIAG: r121/r122 chain unfinished (' + r121pending[0].n + ' record(s)) — marker A1 (45s)');
        await new Promise((r) => setTimeout(r, 45_000));
        console.log('R122_DIAG: marker A1 elapsed (45s) — §5 resolved cleanly; migrate deploy owns the outcome from here');
      }
    }
  }

  // 6) r121 pre-flight evidence (read-only): the effective-price backfill
  //    (r122 rescue: zz_round122_orderitem_effective_price_backfill) documents
  //    that Neon needs the candidate-count check before deploy — nobody can
  //    query Neon directly, so the count rides the build log. Self-retiring:
  //    prints 0 on every build AFTER the deploy lands (the cutoff clause is
  //    the idempotency guard). Own try/catch: on production this flat count
  //    can itself hit the malformed-JSON legacy row — in that case the error
  //    IS the diagnostic (the v2 backfill's per-row guard handles such rows).
  try {
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
  } catch (e) {
    console.log('R121_BACKFILL_PREFLIGHT: count unavailable — ' + (e.message || e).toString().slice(0, 160)
      + ' (indicates a malformed legacy modifiersJson row; the r122 backfill skips such rows per-row)');
  }
}

main()
  .then(() => c.end().then(() => console.log('UNSTICK DONE')))
  .catch((e) => {
    // best-effort diagnostics: never fail the build from here. A genuinely
    // broken DB will fail in `prisma migrate deploy` with a proper error.
    console.log('UNSTICK SKIPPED (non-fatal): ' + (e?.message || e));
    return c.end().catch(() => {});
  })
  // §7 (r124): the deploy self-healing cascade. Runs AFTER the diagnostics
  // connection closed. Fail-open on internal errors (a bug here must never
  // break a healthy deploy); only FatalHealError (schema provably
  // un-ensurable) exits non-zero, with the actionable banner.
  .then(async () => {
    const { heal, FatalHealError } = await import('./deploy-heal.mjs');
    try {
      await heal(process.env.DATABASE_URL);
    } catch (e) {
      if (e instanceof FatalHealError) {
        console.error(String(e.message || e));
        process.exit(1);
      }
      console.log('[DEPLOY-FIX] INTERNAL ERROR (fail-open): ' + (e?.stack || e));
    }
  });
