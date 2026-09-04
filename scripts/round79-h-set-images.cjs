const pg = require('pg');
(async () => {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // Two featured items get live images; the third keeps the letter-fallback
  // path so BOTH render branches are exercised by the Stage H gates.
  await c.query(
    `UPDATE "MenuItem" SET image = $1 WHERE id = 1`,
    ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80']
  );
  await c.query(
    `UPDATE "MenuItem" SET image = $1 WHERE id = 2`,
    ['https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80']
  );
  const r = await c.query(
    `SELECT id, name, "isFeatured", "featuredRank", "showcaseTag", LEFT(image, 50) AS img FROM "MenuItem" WHERE "isFeatured" = true ORDER BY "featuredRank"`
  );
  console.table(r.rows);
  await c.end();
})();
