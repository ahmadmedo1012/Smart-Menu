#!/usr/bin/env node
/**
 * Round83 seed — local verification DB (embedded-postgres :5434).
 * Creates the al-waha-cafe restaurant with 9 items (real images) and
 * 5 FEATURED items (ranks 1-5) so the FeaturedShowcase gates have data:
 *   - exit gate #2: two items with visibly different scene colors
 *   - exit gate #3: 2-3 badges per item around the image
 * Idempotent: refreshes values, never duplicates.
 * round88-C: the legacy single showcaseTag column is DROPPED — this seed
 * writes the showcaseTags array only (the sole badge storage since
 * migration 20260906055500).
 */
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import pg from 'pg';

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/smartmenu';

// round86-D9: production guard (mirrors ci-seed.mjs) — this script writes a
// test restaurant + waha_owner user; an env export pointing at production
// must never seed it silently.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Refusing to seed production (ALLOW_SEED not set)');
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });

function hashPassword(password) {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const OWNER_USER = 'waha_owner';
const OWNER_PASS = 'waha123456';

const CATS = [
  { name: 'Hot Drinks', nameAr: 'المشروبات الساخنة', icon: '☕', sortOrder: 1 },
  { name: 'Meals', nameAr: 'المأكولات', icon: '🍽️', sortOrder: 2 },
  { name: 'Desserts & Juices', nameAr: 'الحلويات والعصائر', icon: '🍰', sortOrder: 3 },
];

const ITEMS = [
  // catIndex, name, nameAr, desc, descAr, price, image, sortOrder
  [0, 'Caramel Latte', 'لاتيه كراميل', 'Double espresso with steamed milk and house caramel', 'إسبريسو مزدوج مع حليب مبخّر وكراميل البيت', 12, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80', 1],
  [0, 'Iced Americano', 'أمريكانو مثلج', 'Chilled double shot over ice', 'جرعة مزدوجة باردة على الثلج', 9, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80', 2],
  [0, 'Moroccan Tea', 'شاي مغربي', 'Fresh mint green tea', 'شاي أخضر بالنعناع الطازج', 8, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80', 3],
  [1, 'Waha Burger', 'برجر الواحة', 'Grilled beef, cheddar, secret sauce', 'لحم مشوي مع الشيدر وصوص الواحة السري', 25, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80', 1],
  [1, 'Margherita Pizza', 'بيتزا مارغريتا', 'Classic tomato, mozzarella, basil', 'طماطم وموزاريلا وريحان', 30, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', 2],
  [1, 'Chicken Pasta', 'باستا الدجاج', 'Creamy alfredo with grilled chicken', 'ألفريدو كريمي مع دجاج مشوي', 22, 'https://images.unsplash.com/photo-1563379926898-05f9a9d1bfed?w=800&q=80', 3],
  [2, 'Chocolate Cake', 'كيك الشوكولاتة', 'Warm fudge cake slice', 'قطعة كيك فدج دافئة', 14, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80', 1],
  [2, 'Mango Smoothie', 'عصير مانجو', 'Fresh mango blended with yogurt', 'مانجو طازج مخفوق مع اللبن', 11, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&q=80', 2],
  [2, 'Butter Croissant', 'كرواسون بالزبدة', 'Flaky French croissant', 'كرواسون فرنسي مقرمش', 7, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80', 3],
];

// Featured showcase: rank 1-5, badge list (2-3 each) — showcaseTags array.
const FEATURED = [
  { name: 'Caramel Latte', rank: 1, tags: ['مميز البيت', 'مصنوع يدويًا'] },
  { name: 'Waha Burger', rank: 2, tags: ['الأكثر طلبًا', 'بروتين مضاعف', 'صوص سري'] },
  { name: 'Chocolate Cake', rank: 3, tags: ['دافئ يقدم فورًا', 'شوكولاتة 70٪'] },
  { name: 'Mango Smoothie', rank: 4, tags: ['مانجو طازج', 'بدون سكر مضاف'] },
  { name: 'Margherita Pizza', rank: 5, tags: ['عجينة إيطالية', 'حجم عائلي'] },
];

async function main() {
  await client.connect();

  // 1) Premium plan must exist (run ci-seed first, or create minimal)
  const plan = await client.query(`SELECT id FROM "SubscriptionPlan" WHERE name = 'Premium'`);
  const planId = plan.rows[0]?.id ?? null;

  // 2) Owner user
  let owner = (await client.query(`SELECT id FROM "User" WHERE username = $1`, [OWNER_USER])).rows[0];
  if (!owner) {
    owner = (await client.query(
      `INSERT INTO "User" (username, password, name, role, "subscriptionStatus", email, phone, "planId", "createdAt", "updatedAt")
       VALUES ($1,$2,'مالك واحة','owner','PAID','owner@waha.ly','', $3, now(), now()) RETURNING id`,
      [OWNER_USER, hashPassword(OWNER_PASS), planId]
    )).rows[0];
    console.log(`owner created: ${OWNER_USER}/${OWNER_PASS}`);
  }

  // 3) Restaurant
  let rest = (await client.query(`SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe'`)).rows[0];
  if (!rest) {
    rest = (await client.query(
      `INSERT INTO "Restaurant" (name, slug, description, phone, whatsapp, address, "workingHours", city, "themeColor", "showOnLanding", "planId", "maxItems", "maxOrders", "createdAt", "updatedAt")
       VALUES ('مقهى الواحة','al-waha-cafe','مقهى عائلي بروح ليبية','0910000000','0910000000','شارع الجمهورية، طرابلس','8 صباحًا - 12 ليلًا','طرابلس','amber',true,$1,9999,99999,now(),now()) RETURNING id`,
      [planId]
    )).rows[0];
  }
  await client.query(`UPDATE "User" SET "restaurantId" = $1 WHERE id = $2`, [rest.id, owner.id]);
  await client.query(
    `INSERT INTO "UserRestaurant" ("userId", "restaurantId", "isPrimary") VALUES ($1,$2,true)
     ON CONFLICT ("userId","restaurantId") DO UPDATE SET "isPrimary" = true`,
    [owner.id, rest.id]
  );
  console.log(`restaurant al-waha-cafe id=${rest.id}`);

  // 4) Categories
  const catIds = [];
  for (const c of CATS) {
    let row = (await client.query(
      `SELECT id FROM "MenuCategory" WHERE name = $1 AND "restaurantId" = $2`, [c.name, rest.id]
    )).rows[0];
    if (!row) {
      row = (await client.query(
        `INSERT INTO "MenuCategory" (name, "nameAr", icon, "sortOrder", "isActive", "restaurantId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,true,$5,now(),now()) RETURNING id`,
        [c.name, c.nameAr, c.icon, c.sortOrder, rest.id]
      )).rows[0];
    }
    catIds.push(row.id);
  }
  console.log(`categories: ${catIds.join(', ')}`);

  // 5) Items (upsert by name+restaurant)
  const itemIds = {};
  for (const [ci, name, nameAr, desc, descAr, price, image, sortOrder] of ITEMS) {
    let row = (await client.query(
      `SELECT m.id FROM "MenuItem" m JOIN "MenuCategory" c ON c.id = m."categoryId"
       WHERE m.name = $1 AND c."restaurantId" = $2`, [name, rest.id]
    )).rows[0];
    if (!row) {
      row = (await client.query(
        `INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'available', now() - interval '30 days', now()) RETURNING id`,
        [name, nameAr, desc, descAr, price, image, sortOrder, catIds[ci]]
      )).rows[0];
    } else {
      await client.query(
        `UPDATE "MenuItem" SET "nameAr"=$2, description=$3, "descriptionAr"=$4, price=$5, image=$6, "sortOrder"=$7, "categoryId"=$8 WHERE id=$1`,
        [row.id, nameAr, desc, descAr, price, image, sortOrder, catIds[ci]]
      );
    }
    itemIds[name] = row.id;
  }
  console.log(`items: ${Object.keys(itemIds).length}`);

  // 6) Reset ALL featured flags first (so removed ones don't linger)
  await client.query(`UPDATE "MenuItem" SET "isFeatured" = false, "featuredRank" = NULL
    WHERE "categoryId" IN (SELECT id FROM "MenuCategory" WHERE "restaurantId" = $1)`, [rest.id]);

  // 7) Apply featured config — showcaseTags array (sole storage, round88-C)
  for (const f of FEATURED) {
    const id = itemIds[f.name];
    if (!id) throw new Error(`featured item not found: ${f.name}`);
    await client.query(
      `UPDATE "MenuItem" SET "isFeatured" = true, "featuredRank" = $1, "showcaseTags" = $2 WHERE id = $3`,
      [f.rank, f.tags, id]
    );
  }
  console.log('featured applied (showcaseTags array written)');

  // Proof
  const proof = await client.query(`
    SELECT "featuredRank", name, "nameAr", "isFeatured", "showcaseTags"
    FROM "MenuItem" WHERE "isFeatured" = true ORDER BY "featuredRank"`);
  console.log('--- DB proof (featured) ---');
  for (const r of proof.rows) console.log(' ', JSON.stringify(r));
  await client.end();
}

main().catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1); });
