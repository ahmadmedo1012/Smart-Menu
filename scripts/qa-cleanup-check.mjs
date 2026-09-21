#!/usr/bin/env node
/**
 * QA cleanup verification script — r119-S7 HARDENED.
 *
 * This tool used to delete with bare substring ILIKE '%qa%' — false-positive
 * REAL restaurants (e.g. «al-qahwa») matched and were deleted along with ALL
 * their orders, bypassing the API's has-orders guard (r118-B2) and its audit
 * rows. The r119 rewrite:
 *
 *   1. DRY-RUN BY DEFAULT — prints what WOULD be deleted, deletes nothing.
 *      Actual deletion requires the explicit `--apply` flag.
 *   2. Prefix/exact patterns instead of substring 'qa' anywhere:
 *      usernames must START with a QA pattern (qa_, qa-, p1_, p3_, bank,
 *      wallet), restaurant slugs/names likewise — «al-qahwa» can never match.
 *   3. `--ids 12,34` — delete by EXPLICIT id list (the recommended mode).
 *   4. Refuses matched restaurants that have orders (financial records,
 *      same 409 stance as the API) unless `--with-orders` is also passed.
 *   5. Never bypasses audit silently anymore: prints a reminder that manual
 *      SQL deletion is unaudited — prefer the admin API when possible.
 *
 * Run (dry-run):  DATABASE_URL="postgres://..." node scripts/qa-cleanup-check.mjs
 * Run (apply):    ... node scripts/qa-cleanup-check.mjs --apply
 * Run (by ids):   ... node scripts/qa-cleanup-check.mjs --ids 12,34 --apply
 */
import pg from 'pg';

// r119: prefix-anchored patterns ONLY (regex, case-insensitive ^ prefix) —
// a substring 'qa' anywhere in a real name (al-qahwa!) must never match.
const USER_PATTERNS = ['^(qa[-_])', '^p1_', '^p3_', '^(bank|wallet)[-_]'];
const REST_PATTERNS = ['^(qa[-_])', '^p3-cafe', '^p1-', '^(bank|wallet)[-_]'];

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const WITH_ORDERS = args.includes('--with-orders');
const idsIdx = args.indexOf('--ids');
const EXPLICIT_IDS =
  idsIdx !== -1 && args[idsIdx + 1]
    ? args[idsIdx + 1].split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0)
    : null;

function toWhere(column, patterns) {
  return patterns.map((p) => `${column} ~* '${p}'`).join(' OR ');
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL env not set — aborting (refusing to guess).');
    process.exit(1);
  }

  if (!APPLY) {
    console.log('*** DRY-RUN (default) — nothing will be deleted. Pass --apply to delete. ***\n');
  }
  if (!EXPLICIT_IDS) {
    console.log('NOTE: pattern mode is heuristic. The SAFE mode is explicit ids:');
    console.log('      node scripts/qa-cleanup-check.mjs --ids 12,34 [--apply]\n');
  }

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  let users, rests;
  if (EXPLICIT_IDS) {
    users = await client.query(
      `SELECT id, username FROM "User" WHERE id = ANY($1) ORDER BY id`, [EXPLICIT_IDS]
    );
    rests = await client.query(
      `SELECT r.id, r.slug, r.name, r.logo IS NOT NULL AS has_logo
         FROM "Restaurant" r WHERE r.id = ANY($1) ORDER BY id`, [EXPLICIT_IDS]
    );
  } else {
    users = await client.query(
      `SELECT id, username FROM "User" WHERE ${toWhere('username', USER_PATTERNS)} ORDER BY id`
    );
    rests = await client.query(
      `SELECT r.id, r.slug, r.name, r.logo IS NOT NULL AS has_logo
         FROM "Restaurant" r WHERE ${toWhere('slug', REST_PATTERNS)}
            OR ${toWhere('name', REST_PATTERNS)} ORDER BY id`
    );
  }

  console.log('=== MATCHED ===');
  console.log(`users: ${users.rows.length}, restaurants: ${rests.rows.length}`);
  for (const u of users.rows) console.log(`  user #${u.id}  ${u.username}`);
  for (const r of rests.rows) console.log(`  rest #${r.id}  ${r.slug}  (${r.name}) logo=${r.has_logo}`);

  const restIds = rests.rows.map((r) => r.id);
  const userIds = users.rows.map((u) => u.id);

  // r119: financial-records stance — refuse restaurants with orders unless forced.
  if (restIds.length) {
    const withOrders = await client.query(
      `SELECT "restaurantId" AS id, COUNT(*)::int AS n FROM "Order"
        WHERE "restaurantId" = ANY($1) GROUP BY "restaurantId"`, [restIds]
    );
    if (withOrders.rows.length > 0) {
      const summary = withOrders.rows.map((r) => `#${r.id} (${r.n} orders)`).join(', ');
      if (!WITH_ORDERS) {
        console.error(
          `\nABORT: matched restaurants have ORDERS (financial records): ${summary}.\n` +
            'Refusing to delete. Resolve via the admin API (409 guard + audit) or pass --with-orders if you really mean it.'
        );
        await client.end();
        process.exit(1);
      }
      console.warn(`\nWARNING: --with-orders passed — deleting restaurants WITH orders: ${summary}`);
    }
  }

  if (!APPLY) {
    console.log('\n=== DRY-RUN RESULT: nothing deleted. Re-run with --apply to proceed. ===');
    await client.end();
    return;
  }

  if (restIds.length || userIds.length) {
    console.warn(
      '\nReminder: direct SQL deletion is UNAUDITED (no AuditLog rows) and bypasses API guards. Prefer the admin API.'
    );
    await client.query('BEGIN');
    try {
      if (restIds.length) {
        await client.query(`DELETE FROM "UserRestaurant" WHERE "restaurantId" = ANY($1)`, [restIds]);
        await client.query(`DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "restaurantId" = ANY($1))`, [restIds]);
        await client.query(`DELETE FROM "Order" WHERE "restaurantId" = ANY($1)`, [restIds]);
        await client.query(`DELETE FROM "Restaurant" WHERE id = ANY($1)`, [restIds]);
      }
      if (userIds.length) {
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

  await client.end();
}

main().catch((e) => {
  console.error('Script failed:', e.message);
  process.exit(1);
});
