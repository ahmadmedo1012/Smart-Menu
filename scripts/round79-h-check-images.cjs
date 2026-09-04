const pg = require('pg');
(async () => {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    SELECT m.id, m.name, m."nameAr", LEFT(m.image, 60) AS img
    FROM "MenuItem" m
    JOIN "MenuCategory" cat ON cat.id = m."categoryId"
    JOIN "Restaurant" res ON res.id = cat."restaurantId"
    WHERE res.slug = 'al-waha-cafe' AND m.image <> ''
    LIMIT 6`);
  console.table(r.rows);
  await c.end();
})();
