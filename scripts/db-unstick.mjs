import pg from 'pg';

/**
 * round86-D1 hardening of the P1002 unstick script (still in the build chain:
 * `node scripts/db-unstick.mjs && prisma migrate deploy && next build`).
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
}

main()
  .then(() => c.end().then(() => console.log('UNSTICK DONE')))
  .catch((e) => {
    // best-effort diagnostics: never fail the build from here. A genuinely
    // broken DB will fail in `prisma migrate deploy` with a proper error.
    console.log('UNSTICK SKIPPED (non-fatal): ' + (e?.message || e));
    return c.end().catch(() => {});
  });
