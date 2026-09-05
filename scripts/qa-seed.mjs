/**
 * round86-D2 — QA seed for the localhost deep-journey suites.
 *
 * The qa-teams specs hardcode the production-shaped fixture:
 *   - testmulti1568 / testpass123 — multi-restaurant OWNER_A (313/315/316)
 *   - owner B — the IDOR victim owning restaurant 317
 *   - restaurant ids 313..317 (team7/round80 assert cross-tenant 403s on 317)
 *
 * Without this seed the new blocking CI step (qa-teams on localhost) cannot
 * log in. Idempotent: re-running refreshes passwords only.
 * Production guard mirrors ci-seed.mjs.
 */
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Refusing to seed production (ALLOW_SEED not set)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

// Same KDF family as src/lib/hash.ts v2 (600k) — accounts here are fresh
function hashPassword(password) {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 600_000, 64, 'sha512').toString('hex');
  // v2 format = "iterations:salt:hash" (mirrors src/lib/hash.ts)
  return `600000:${salt}:${hash}`;
}

const OWNER_A = 'testmulti1568';
const OWNER_A_PASS = 'testpass123';
const OWNER_B = 'qavictim_owner';
const OWNER_B_PASS = 'testpass123';

async function upsertUser(username, password, restaurantId) {
  const existing = await client.query('SELECT id FROM "User" WHERE username = $1', [username]);
  const hash = hashPassword(password);
  if (existing.rows.length > 0) {
    await client.query(
      'UPDATE "User" SET password = $1, "restaurantId" = $2, "updatedAt" = now() WHERE username = $3',
      [hash, restaurantId, username]
    );
    return existing.rows[0].id;
  }
  const res = await client.query(
    `INSERT INTO "User" (username, password, name, role, "subscriptionStatus", "restaurantId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'owner', 'PAID', $4, now(), now()) RETURNING id`,
    [username, hash, username, restaurantId]
  );
  return res.rows[0].id;
}

async function ensureRestaurant(id, name, slug, planId) {
  const existing = await client.query('SELECT id FROM "Restaurant" WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    await client.query(
      `INSERT INTO "Restaurant" (id, name, slug, description, phone, whatsapp, "planId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $5, $6, now(), now())`,
      [id, name, slug, `QA ${name}`, '0900000000', planId]
    );
  }
  // one active category so menu APIs behave
  const cat = await client.query(
    'SELECT id FROM "MenuCategory" WHERE "restaurantId" = $1 AND "isActive" = true LIMIT 1',
    [id]
  );
  if (cat.rows.length === 0) {
    await client.query(
      `INSERT INTO "MenuCategory" (name, "nameAr", icon, "sortOrder", "isActive", "restaurantId", "createdAt", "updatedAt")
       VALUES ('QA Cat', 'قسم', '☕', 1, true, $1, now(), now())`,
      [id]
    );
  }
}

async function linkOwner(ownerUserId, restaurantId, isPrimary) {
  await client.query(
    `INSERT INTO "UserRestaurant" ("userId", "restaurantId", "isPrimary")
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ownerUserId, restaurantId, isPrimary]
  );
}

async function main() {
  await client.connect();

  // free plan (fall back to whatever plan exists)
  const plan = await client.query(
    'SELECT id FROM "SubscriptionPlan" ORDER BY "sortOrder" ASC LIMIT 1'
  );
  const planId = plan.rows[0]?.id ?? 1;

  // restaurants first (User.restaurantId has an FK to Restaurant) — owners
  // are linked afterwards via UserRestaurant
  await ensureRestaurant(313, 'مطعم تجريبي أول', `qa-multi-a-${Date.now() % 100000}`, planId);
  await ensureRestaurant(315, 'مطعم الاختبار الثالث', `qa-multi-b-${Date.now() % 100000}`, planId);
  await ensureRestaurant(316, 'مقهى النخبة', `qa-multi-c-${Date.now() % 100000}`, planId);
  await ensureRestaurant(317, 'مطعم الضحية', `qa-victim-${Date.now() % 100000}`, planId);

  const ownerAId = await upsertUser(OWNER_A, OWNER_A_PASS, 313);
  const ownerBId = await upsertUser(OWNER_B, OWNER_B_PASS, 317);

  await linkOwner(ownerAId, 313, true);
  await linkOwner(ownerAId, 315, false);
  await linkOwner(ownerAId, 316, false);
  await linkOwner(ownerBId, 317, true);

  // team2-customer journeys run against the production slug al-waha-cafe-demo
  // (menu + cart + order flows, no auth). Clone the round83 waha cafe shape
  // under that slug so localhost runs see the same pages.
  const demo = await client.query(
    'SELECT id FROM "Restaurant" WHERE slug = $1',
    ['al-waha-cafe-demo']
  );
  if (demo.rows.length === 0) {
    const d = await client.query(
      `INSERT INTO "Restaurant" (name, slug, description, phone, whatsapp, "planId", "createdAt", "updatedAt")
       VALUES ('مقهى الواحة التجريبي', 'al-waha-cafe-demo', 'مقهى عائلي بروح ليبية', '0910000000', '0910000000', $1, now(), now())
       RETURNING id`,
      [planId]
    );
    const rid = d.rows[0].id;
    const cats = await client.query(
      `INSERT INTO "MenuCategory" (name, "nameAr", icon, "sortOrder", "isActive", "restaurantId", "createdAt", "updatedAt")
       VALUES ('Hot Drinks', 'مشروبات ساخنة', '☕', 1, true, $1, now(), now()),
              ('Desserts', 'الحلويات', '🍰', 2, true, $1, now(), now())
       RETURNING id`,
      [rid]
    );
    const hot = cats.rows[0].id;
    const dessert = cats.rows[1].id;
    await client.query(
      `INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "createdAt", "updatedAt")
       VALUES
        ('Caramel Latte', 'كابتشينو كراميل', 'latte with caramel', 'لاتيه بالكراميل', 8.5, '', 1, $1, 'available', now(), now()),
        ('Iced Americano', 'أمريكانو مثلج', 'iced americano', 'أمريكانو بارد', 7, '', 2, $1, 'available', now(), now()),
        ('Chocolate Cake', 'كيك الشوكولاتة', 'cake', 'كيك', 12, '', 1, $2, 'available', now(), now())`,
      [hot, dessert]
    );
    console.log('demo menu created: al-waha-cafe-demo');
  }

  // team4-payments + pricing assertions expect the production plan catalog:
  // names (مجاني/أساسي/بريميوم/احترافي/شركات) + price points '19' and '129'.
  // ci-seed provides Free only — complete the set here.
  const wantedPlans = [
    ['Basic', 'أساسي', 19, 2, 100, 1000, 2],
    ['Premium', 'بريميوم', 49, 3, 200, 2000, 3],
    ['Pro', 'احترافي', 89, 4, 250, 2500, 4],
    ['Business', 'شركات', 129, 5, 300, 3000, 5],
  ];
  for (const [name, nameAr, price, maxMenus, maxItems, maxOrders, sortOrder] of wantedPlans) {
    const exists = await client.query('SELECT id FROM "SubscriptionPlan" WHERE name = $1', [name]);
    if (exists.rows.length === 0) {
      await client.query(
        `INSERT INTO "SubscriptionPlan" (name, "nameAr", price, "periodDays", "maxMenus", "maxItems", "maxOrders", "sortOrder", features, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 30, $4, $5, $6, $7, $8, true, now(), now())`,
        [name, nameAr, price, maxMenus, maxItems, maxOrders, sortOrder, JSON.stringify(['دعم واتساب'])]
      );
    } else {
      // align the nameAr (ci-seed's Premium is 'المدفوعة'; the pricing test
      // expects the production naming)
      await client.query('UPDATE "SubscriptionPlan" SET "nameAr" = $1 WHERE name = $2', [nameAr, name]);
    }
  }

  console.log(
    `QA seed ready: ${OWNER_A}/${OWNER_A_PASS} (313/315/316) + ${OWNER_B} owns 317 (IDOR victim), plan=${planId}`
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
