#!/usr/bin/env node
/**
 * round94 (coordinator): inter-batch DB state reset for local e2e sweeps.
 *
 * WHY: the login/account backstop limiters are DB-backed (RateLimitEntry) and
 * survive server restarts. Running playwright batches back-to-back (the 10-min
 * Bash-session ceiling forces chunked sweeps) accumulates failure-path budget
 * from the lockout specs — 20 failures/15min gets exhausted globally and later
 * batches fail "login: valid creds succeed" with 429 cascades (team3/team4
 * beforeAll skips). CI never sees this (one fresh run per commit).
 *
 * WHAT (v2 — incident-learned): the first version ALSO deleted rows by loose
 * ILIKE '%qa%' needles and wiped the STABLE qa-seed fixtures (restaurants
 * 313-317 + their UserRestaurant links) → team9's authenticated /api/stats
 * returned 400 "معرف المطعم مطلوب". v2 deletes ONLY:
 *   1. All RateLimitEntry rows (the proven batch killer — volatile by design).
 *   2. PER-RUN artifacts: users/restaurants whose identifiers carry a
 *      timestamp suffix (6+ digits) — the pattern every generated fixture
 *      uses (qa_c...45889665, qa1-47297527, p3-cafe-51196999 ...).
 * STABLE fixtures (admin, waha_owner, al-waha-cafe, al-waha-cafe-demo,
 * testmulti1568's 313/315/316, qavictim_owner's 317) always survive.
 *
 * Run: DATABASE_URL="postgresql://postgres:postgres@localhost:5434/smartmenu" \
 *      node scripts/r94-db-reset.mjs
 */
import pg from 'pg';

// timestamped per-run identifiers only (6+ trailing digits)
const TS_USER = `username ~ '(qa|bank|wallet|p1_|p3_|r93_sim|sim|qac|qal|register)[^0-9]*[0-9]{6,}$'`;
const TS_REST = `(slug ~ '(qa|bank|wallet|p1|p3|sim)[^0-9]*[0-9]{6,}$' OR name ~ '(qa|bank|wallet|p1|p3|sim)[^0-9]*[0-9]{6,}$')`;

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('DATABASE_URL env not set — aborting.'); process.exit(1); }
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  // 1) volatile rate-limit state (the actual batch killer)
  const rl = await client.query('DELETE FROM "RateLimitEntry"');
  console.log(`[r94-reset] RateLimitEntry purged: ${rl.rowCount}`);

  // 2) per-run (timestamped) QA users — sessions first (FK)
  const users = await client.query(`SELECT id, username FROM "User" WHERE ${TS_USER}`);
  for (const u of users.rows) {
    await client.query('DELETE FROM "Session" WHERE "userId" = $1', [u.id]);
  }
  const du = await client.query(`DELETE FROM "User" WHERE ${TS_USER}`);
  console.log(`[r94-reset] per-run users deleted: ${du.rowCount} (${users.rows.map((u) => u.username).join(', ') || '-'})`);

  // 3) per-run (timestamped) QA restaurants — dependents first
  const rests = await client.query(`SELECT id, slug FROM "Restaurant" WHERE ${TS_REST}`);
  for (const r of rests.rows) {
    await client.query('DELETE FROM "Review" WHERE "menuItemId" IN (SELECT id FROM "MenuItem" WHERE "categoryId" IN (SELECT id FROM "MenuCategory" WHERE "restaurantId" = $1))', [r.id]);
    await client.query('DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "restaurantId" = $1)', [r.id]);
    await client.query('DELETE FROM "Order" WHERE "restaurantId" = $1', [r.id]);
    await client.query('DELETE FROM "MenuItem" WHERE "categoryId" IN (SELECT id FROM "MenuCategory" WHERE "restaurantId" = $1)', [r.id]);
    await client.query('DELETE FROM "MenuCategory" WHERE "restaurantId" = $1', [r.id]);
    await client.query('DELETE FROM "LoyaltyCard" WHERE "restaurantId" = $1', [r.id]);
    await client.query('DELETE FROM "UserRestaurant" WHERE "restaurantId" = $1', [r.id]);
  }
  const dr = await client.query(`DELETE FROM "Restaurant" WHERE ${TS_REST}`);
  console.log(`[r94-reset] per-run restaurants deleted: ${dr.rowCount} (${rests.rows.map((r) => r.slug).join(', ') || '-'})`);

  // 4) proof: STABLE fixtures intact + volatile cleared
  const proof = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM "User" WHERE username IN ('admin', 'waha_owner', 'testmulti1568', 'qavictim_owner')) AS core_users,
      (SELECT COUNT(*) FROM "Restaurant" WHERE slug IN ('al-waha-cafe', 'al-waha-cafe-demo')) AS core_restaurants,
      (SELECT COUNT(*) FROM "Restaurant" WHERE id IN (313, 315, 316, 317)) AS qa_fixtures,
      (SELECT COUNT(*) FROM "RateLimitEntry") AS rate_entries`);
  const p = proof.rows[0];
  console.log(`[r94-reset] proof: core_users=${p.core_users} (expect 4) · core_restaurants=${p.core_restaurants} (expect 2) · qa_fixtures=${p.qa_fixtures} (expect 4) · rate_entries=${p.rate_entries} (expect 0)`);
  const ok = p.core_users === '4' && p.core_restaurants === '2' && p.qa_fixtures === '4' && p.rate_entries === '0';
  if (!ok) {
    console.error('[r94-reset] PROOF FAILED — run the seed sequence: ci-seed + round83-seed + qa-seed + r93-sim-seed');
    process.exit(1);
  }
  await client.end();
  console.log('[r94-reset] OK');
}
main().catch((e) => { console.error('[r94-reset] ERROR', e.message); process.exit(1); });
