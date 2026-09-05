import pg from 'pg';

const url = process.env.DATABASE_URL;
const c = new pg.Client({
  connectionString: url,
  statement_timeout: 20000,
  connectionTimeoutMillis: 20000,
});
await c.connect();
console.log('connected to', (url || '').replace(/:[^:@/]*@/, ':***@'));

// 1) who holds advisory locks right now?
const { rows: holders } = await c.query(`
  SELECT pid, state, application_name,
         backend_start::text AS started,
         wait_event_type, wait_event,
         left(coalesce(query, ''), 70) AS q
  FROM pg_stat_activity
  WHERE pid IN (SELECT pid FROM pg_locks WHERE locktype = 'advisory')
    AND pid <> pg_backend_pid()
`);
console.log('ADVISORY_LOCK_HOLDERS =', JSON.stringify(holders, null, 2));

// 2) terminate them (stale build sessions)
for (const h of holders) {
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

await c.end();
console.log('UNSTICK DONE');
