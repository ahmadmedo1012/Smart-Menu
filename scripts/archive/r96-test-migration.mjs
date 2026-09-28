// r96-W3: اختبار محلي شامل لهجرة منيو الديمو على PGlite
// 1) تطبيق كل ملفات الهجرات بالترتيب (محاكاة migrate deploy)
// 2) التحقق من البيانات (مطعم/فئات/أصناف/خيارات/featured)
// 3) إعادة تشغيل هجرة r96 مرة ثانية (إثبات idempotency — لا ازدواج ولا تغيير)
// التشغيل: node scripts/r96-test-migration.mjs (يتطلب pglite يعمل على 5434)
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'postgresql://postgres:postgres@127.0.0.1:5434/postgres';
const MIG_DIR = 'prisma/migrations';

const c = new pg.Client({ connectionString: URL, statement_timeout: 60000 });

async function applyMigrations() {
  const dirs = fs.readdirSync(MIG_DIR).filter((d) => {
    const p = path.join(MIG_DIR, d);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'migration.sql'));
  }).sort();
  await c.query('CREATE TABLE IF NOT EXISTS "_prisma_migrations" (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ NOT NULL, migration_name VARCHAR(255) NOT NULL, logs TEXT, applied_steps_count INTEGER NOT NULL DEFAULT 0)');
  let applied = 0;
  for (const dir of dirs) {
    const { rows } = await c.query('SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1', [dir]);
    if (rows.length > 0) continue;
    const sql = fs.readFileSync(path.join(MIG_DIR, dir, 'migration.sql'), 'utf8');
    try {
      await c.query('BEGIN');
      await c.query(sql);
      await c.query('INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (gen_random_uuid()::text, \'local-test\', NOW(), $1, 0)', [dir]);
      await c.query('COMMIT');
      applied++;
    } catch (e) {
      await c.query('ROLLBACK');
      console.error(`[MIGRATION-FAIL] ${dir}: ${e.message}`);
      throw e;
    }
  }
  console.log(`[migrations] applied ${applied} new, total ${dirs.length}`);
}

async function verify(label) {
  const demo = await c.query(`SELECT name, slug, description, logo, city, "workingHours", gallery FROM "Restaurant" WHERE slug='al-waha-cafe-demo'`);
  const r = demo.rows[0];
  console.log(`[${label}] restaurant:`, r ? `${r.name} | logo=${r.logo} | city=${r.city} | gallery=${r.gallery?.length}` : 'MISSING!');

  const cats = await c.query(`SELECT c.name, c.icon, c."sortOrder" FROM "MenuCategory" c WHERE c."restaurantId"=(SELECT id FROM "Restaurant" WHERE slug='al-waha-cafe-demo') ORDER BY c."sortOrder"`);
  console.log(`[${label}] categories(${cats.rows.length}):`, cats.rows.map((x) => `${x.name}(${x.icon})`).join(' '));

  const items = await c.query(`SELECT mi.name, mi.price, mi.image, mi."isFeatured", mi."featuredRank" FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId"=c.id WHERE c."restaurantId"=(SELECT id FROM "Restaurant" WHERE slug='al-waha-cafe-demo') ORDER BY mi.name`);
  const withImg = items.rows.filter((x) => x.image && x.image.startsWith('/demo/'));
  const featured = items.rows.filter((x) => x.isFeatured).sort((a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99));
  console.log(`[${label}] items: ${items.rows.length} (بصور: ${withImg.length})`);
  console.log(`[${label}] featured:`, featured.map((x) => `${x.featuredRank}.${x.name}`).join(' | '));

  const mods = await c.query(`SELECT mi.name AS item, g."nameAr" AS grp, g."minSelect", g."maxSelect", g.required, count(o.id)::int AS opts FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId"=mi.id JOIN "MenuCategory" c ON mi."categoryId"=c.id LEFT JOIN "ModifierOption" o ON o."groupId"=g.id WHERE c."restaurantId"=(SELECT id FROM "Restaurant" WHERE slug='al-waha-cafe-demo') GROUP BY mi.name, g."nameAr", g."minSelect", g."maxSelect", g.required ORDER BY mi.name, g."nameAr"`);
  for (const m of mods.rows) console.log(`[${label}] modifier: ${m.item} → ${m.grp} (min${m.minSelect}/max${m.maxSelect}/req=${m.required}/${m.opts} خيارات)`);

  const dupes = await c.query(`SELECT mi.name, count(*)::int AS n FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId"=c.id WHERE c."restaurantId"=(SELECT id FROM "Restaurant" WHERE slug='al-waha-cafe-demo') GROUP BY mi.name HAVING count(*)>1`);
  console.log(`[${label}] duplicates: ${dupes.rows.length === 0 ? 'صفر ✓' : JSON.stringify(dupes.rows)}`);

  const hidden = await c.query(`SELECT "showOnLanding" FROM "Restaurant" WHERE slug='al-waha-cafeewewe'`);
  console.log(`[${label}] cafeewewe showOnLanding:`, hidden.rows[0]?.showOnLanding);
  return { itemCount: items.rows.length, imgCount: withImg.length };
}

(async () => {
  await c.connect();
  await applyMigrations();
  const first = await verify('run1');
  // إعادة تشغيل هجرة r96 حرفيًا (idempotency)
  const sql96 = fs.readFileSync(path.join(MIG_DIR, '20260909_round96_demo_menu', 'migration.sql'), 'utf8');
  await c.query(sql96);
  console.log('[idempotency] أعيد تشغيل هجرة r96 مرة ثانية ✓');
  const second = await verify('run2');
  if (first.itemCount !== second.itemCount || first.imgCount !== second.imgCount) {
    console.error('❌ IDEMPOTENCY FAILED: counts changed');
    process.exit(1);
  }
  console.log('✅ IDEMPOTENCY PROVEN: نفس الأعداد بعد إعادة التشغيل');
  await c.end();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
