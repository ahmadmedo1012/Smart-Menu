#!/usr/bin/env node
/** r97: quick local DB state check (sandbox mirror on :5434). */
import pg from "pg";
(async () => {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query(`
    SELECT r.slug, r."showOnLanding",
      (SELECT COUNT(*) FROM "MenuItem" m JOIN "MenuCategory" cat ON m."categoryId" = cat.id
        WHERE cat."restaurantId" = r.id) AS items
    FROM "Restaurant" r ORDER BY r.id`);
  console.log(rows.map((r) => `${r.slug}: ${r.items} items (landing=${r.showOnLanding})`).join("\n"));
  const { rows: admins } = await c.query('SELECT username FROM "User" WHERE role = $1', ["admin"]);
  console.log("admins:", admins.map((a) => a.username).join(","));
  const { rows: plans } = await c.query("SELECT COUNT(*)::int AS n FROM \"SubscriptionPlan\"");
  console.log("plans:", plans[0].n);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
