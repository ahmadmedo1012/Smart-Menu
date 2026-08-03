#!/usr/bin/env node
/**
 * QA cleanup verification script
 * Queries production DB for any QA/test artifacts (users/restaurants whose
 * name contains QA/bank/wallet/test-timestamp patterns), prints them, deletes
 * them, then re-queries to prove zero remain.
 *
 * Uses the `pg` driver directly (Prisma client is .ts-generated; pg is a
 * runtime dependency and avoids the TS build step).
 *
 * Run: DATABASE_URL="postgres://..." node scripts/qa-cleanup-check.mjs
 */
import pg from 'pg';

// Transliterated-literal patterns identifying QA artifacts from the E2E suites.
// We match on lowercase substrings.
const USER_NEEDLES = ['qa', 'bank', 'wallet', 'p1_', 'p3_'];
const REST_NEEDLES = ['qa', 'bank', 'wallet', 'p3-cafe', 'p1-'];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL env not set — aborting (refusing to guess).');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  const userWhere = USER_NEEDLES.map((n) => `username ILIKE '%${n}%'`).join(' OR ');
  const restWhere = REST_NEEDLES.map((n) => `(slug ILIKE '%${n}%' OR name ILIKE '%${n}%')`).join(' OR ');

  // ---- BEFORE ----
  const usersBefore = await client.query(
    `SELECT id, username FROM "User" WHERE ${userWhere} ORDER BY id`
  );
  const restsBefore = await client.query(
    `SELECT r.id, r.slug, r.name, r.logo IS NOT NULL AS has_logo
       FROM "Restaurant" r WHERE ${restWhere} ORDER BY id`
  );

  console.log('=== BEFORE CLEANUP ===');
  console.log(`users: ${usersBefore.rows.length}, restaurants: ${restsBefore.rows.length}`);
  for (const u of usersBefore.rows) console.log(`  user #${u.id}  ${u.username}`);
  for (const r of restsBefore.rows)
    console.log(`  rest #${r.id}  ${r.slug}  (${r.name}) logo=${r.has_logo}`);

  // ---- Count related rows that must also be removed (cascade safety) ----
  const restIds = restsBefore.rows.map((r) => r.id);
  const userIds = usersBefore.rows.map((u) => u.id);

  // Proceed only if we actually found something; otherwise just print zero.
  if (restIds.length || userIds.length) {
    await client.query('BEGIN');
    try {
      if (restIds.length) {
        await client.query(`DELETE FROM "UserRestaurant" WHERE "restaurantId" = ANY($1)`, [restIds]);
        await client.query(`DELETE FROM "Order" WHERE "restaurantId" = ANY($1)`, [restIds]);
        await client.query(`DELETE FROM "Restaurant" WHERE id = ANY($1)`, [restIds]);
      }
      if (userIds.length) {
        // any UserRestaurant row referencing the user
        await client.query(`DELETE FROM "UserRestaurant" WHERE "userId" = ANY($1)`, [userIds]);
        await client.query(`DELETE FROM "User" WHERE id = ANY($1)`, [userIds]);
      }
      await client.query('COMMIT');
      console.log(`\nDELETED: ${restIds.length} restaurants, ${userIds.length} users`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  } else {
    console.log('\nDELETED: 0 (nothing matched)');
  }

  // ---- AFTER ----
  const usersAfter = await client.query(
    `SELECT id, username FROM "User" WHERE ${userWhere} ORDER BY id`
  );
  const restsAfter = await client.query(
    `SELECT id, slug FROM "Restaurant" WHERE ${restWhere} ORDER BY id`
  );

  console.log('\n=== AFTER CLEANUP ===');
  console.log(`users: ${usersAfter.rows.length}, restaurants: ${restsAfter.rows.length}`);

  await client.end();
}

main().catch((e) => {
  console.error('Script failed:', e.message);
  process.exit(1);
});