// r96-W3b: محاكاة سيناريو الإنتاج — مطعم موجود بـ16 صنفًا قديمًا (أسماء الإنتاج الحالية)
// ثم تطبيق الهجرة والتحقق من الإغناء + التحويلات + الخيارات + featured
import pg from 'pg';
import fs from 'node:fs';

const URL = 'postgresql://postgres:postgres@127.0.0.1:5434/postgres';
const c = new pg.Client({ connectionString: URL, statement_timeout: 60000 });

const OLD_ITEMS = [
  ['قهوة تركي', 'مشروبات ساخنة', 3], ['إسبريسو', 'مشروبات ساخنة', 4], ['كابتشينو', 'مشروبات ساخنة', 5], ['شاي', 'مشروبات ساخنة', 2],
  ['ليموناضة', 'مشروبات باردة', 4], ['سموثي', 'مشروبات باردة', 6], ['موهيتو', 'مشروبات باردة', 5], ['آيس كوفي', 'مشروبات باردة', 5],
  ['تشيز كيك', 'حلويات', 7], ['كنافة', 'حلويات', 6], ['كريب', 'حلويات', 5], ['بسبوسة', 'حلويات', 4],
  ['ساندويتش', 'وجبات خفيفة', 5], ['بطاطس مقلية', 'وجبات خفيفة', 3], ['سلطة', 'وجبات خفيفة', 4], ['برجر', 'وجبات خفيفة', 7],
];

(async () => {
  await c.connect();

  // 1) إنشاء حالة ما قبل الهجرة (تحاكي الإنتاج الحالي)
  await c.query(`INSERT INTO "Restaurant" (name, slug, description, logo, phone, whatsapp, "themeColor", "isActive", city, "showOnLanding", gallery, "updatedAt")
    SELECT 'مقهى الواحة - تجريبي', 'al-waha-cafe-demo', 'منيو تجريبي للاختبار - قهوة مختصة ومشروبات وحلويات شرقية', '', '0910089975', '0910089975', 'amber', true, 'طرابلس', true, '{}', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo')`);
  await c.query(`INSERT INTO "Restaurant" (name, slug, description, logo, "showOnLanding", "updatedAt")
    SELECT 'مقهى الواحة', 'al-waha-cafeewewe', 'قهوة مختصة', 'https://images.unsplash.com/x', true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Restaurant" WHERE slug = 'al-waha-cafeewewe')`);

  for (const [cat, icon] of [['مشروبات ساخنة', '☕'], ['مشروبات باردة', '🧃'], ['حلويات', '🍰'], ['وجبات خفيفة', '🍔']]) {
    await c.query(`INSERT INTO "MenuCategory" (name, icon, "sortOrder", "isActive", "restaurantId", "updatedAt")
      SELECT $1, $2, 0, true, r.id, NOW() FROM "Restaurant" r WHERE r.slug = 'al-waha-cafe-demo'
      AND NOT EXISTS (SELECT 1 FROM "MenuCategory" c WHERE c."restaurantId" = r.id AND c.name = $1)`, [cat, icon]);
  }
  for (const [name, cat, price] of OLD_ITEMS) {
    await c.query(`INSERT INTO "MenuItem" (name, price, "categoryId", "sortOrder", status, image, "updatedAt")
      SELECT $1, $3, c.id, 0, 'available', '', NOW()
      FROM "MenuCategory" c JOIN "Restaurant" r ON c."restaurantId" = r.id
      WHERE r.slug = 'al-waha-cafe-demo' AND c.name = $2
      AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = $1)`, [name, cat, price]);
  }
  const pre = await c.query(`SELECT count(*)::int AS n FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId"=c.id JOIN "Restaurant" r ON c."restaurantId"=r.id WHERE r.slug='al-waha-cafe-demo'`);
  const preImg = await c.query(`SELECT count(*)::int AS n FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId"=c.id JOIN "Restaurant" r ON c."restaurantId"=r.id WHERE r.slug='al-waha-cafe-demo' AND mi.image LIKE '/demo/%'`);
  console.log(`[pre] items=${pre.rows[0].n} (بصور demo: ${preImg.rows[0].n}) — كما في الإنتاج الآن`);

  // 2) تطبيق هجرة r96
  const sql96 = fs.readFileSync('prisma/migrations/20260909_round96_demo_menu/migration.sql', 'utf8');
  await c.query(sql96);

  // 3) التحقق
  const post = await c.query(`SELECT count(*)::int AS items,
    count(*) FILTER (WHERE mi.image LIKE '/demo/%')::int AS imgs,
    count(*) FILTER (WHERE mi."descriptionAr" <> '')::int AS descs,
    count(*) FILTER (WHERE mi."isFeatured")::int AS featured
    FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId"=c.id JOIN "Restaurant" r ON c."restaurantId"=r.id WHERE r.slug='al-waha-cafe-demo'`);
  console.log('[post]', JSON.stringify(post.rows[0]), '(المطلوب: items=25, imgs=25, descs=25, featured=5)');

  const cats = await c.query(`SELECT c.name, c.icon, c."sortOrder" FROM "MenuCategory" c JOIN "Restaurant" r ON c."restaurantId"=r.id WHERE r.slug='al-waha-cafe-demo' ORDER BY c."sortOrder"`);
  console.log('[post] categories:', cats.rows.map((x) => `${x.name}(${x.icon})`).join(' '));

  const renames = await c.query(`SELECT mi.name, mi.price, mi.image FROM "MenuItem" mi WHERE mi.name IN ('برجر الواحة','شاي أخضر بالنعناع','كنافة بالجبن','كنافة','شاي','برجر') ORDER BY mi.name`);
  console.log('[post] renamed items:', renames.rows.map((x) => `${x.name}=${x.price}د ${x.image}`).join(' | '));

  const mods = await c.query(`SELECT count(DISTINCT g.id)::int AS groups, count(o.id)::int AS options FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId"=mi.id JOIN "MenuCategory" c ON mi."categoryId"=c.id JOIN "Restaurant" r ON c."restaurantId"=r.id LEFT JOIN "ModifierOption" o ON o."groupId"=g.id WHERE r.slug='al-waha-cafe-demo'`);
  console.log('[post] modifiers:', JSON.stringify(mods.rows[0]), '(المطلوب: groups=4, options=11)');

  const hidden = await c.query(`SELECT "showOnLanding" AS v FROM "Restaurant" WHERE slug='al-waha-cafeewewe'`);
  console.log('[post] cafeewewe hidden:', hidden.rows[0].v === false ? '✓' : '✗');

  // 4) idempotency على سيناريو الإنتاج
  await c.query(sql96);
  const again = await c.query(`SELECT count(*)::int AS items FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId"=c.id JOIN "Restaurant" r ON c."restaurantId"=r.id WHERE r.slug='al-waha-cafe-demo'`);
  console.log('[re-run] items after 2nd run:', again.rows[0].n, again.rows[0].n === post.rows[0].items ? '✓ IDEMPOTENT' : '✗ FAILED');
  await c.end();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
