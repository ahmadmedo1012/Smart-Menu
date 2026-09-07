#!/usr/bin/env node
/**
 * r93-S1 (محاكاة المستخدمين — الجولة 93) — بذرة تكميلية لرحلات المحاكاة.
 *
 * بيئة الجولة وصلت بذرتها الأساسية فقط (admin/smart123 + الخطط) بلا أي مطعم؛
 * جيش المحاكاة يحتاج الثلاثية التي تعهّدها CI (ci-seed + round83 + qa-seed)
 * مضافًا إليها ما لا يوفره أي سكربت قائم:
 *
 *   1. مجموعات خيارات (ModifierGroup/ModifierOption) على صنف من al-waha-cafe —
 *      رحلة الزبون تفحص «فتح صنف بخيارات → اختيار خيارات وكمية»، وround83-seed
 *      لا يزرع أي معدِّلات (رغم أن وصف الجولة يفترضها).
 *   2. حساب sub_admin بصلاحيات صفرية (r93_sim_sa) — بوابة PII المراجعات
 *      (r93-W1a/MED-1) تُختبر بجلسته الحقيقية، وإنشاؤه عبر /api/admin/admins
 *      محجوز لsuper_admin وحده (role=admin يُرفض من MANAGE_USERS بحارس r91)،
 *      لذا يُوَلَّد هنا كإعداد اختبار بنمط qavictim_owner في qa-seed.
 *   3. حساب super_admin (r93_sim_root) — رحلة «إنشاء sub_admin» عبر واجهة
 *      /admin/admins الحقيقية تتطلب super_admin (حارس r91: role=admin لا
 *      يملك MANAGE_USERS — منع تصعيد الصلاحيات)، والبذرة الأساسية للجولة
 *      تزرع admin/smart123 بدور admin فقط. يستخدمه r93-sim-admin.spec.ts
 *      لإنشاء sub_admin فعلي عبر الـUI ثم الدخول به لاختبار بوابة PII.
 *
 * Idempotent: إعادة التشغيل تحدّث القيم ولا تكرر صفًا أبدًا. حارس الإنتاج
 * نفس عائلة ci-seed/round83-seed/qa-seed.
 */
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import pg from 'pg';

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/smartmenu';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Refusing to seed production (ALLOW_SEED not set)');
  process.exit(1);
}

const SUB_ADMIN_USER = 'r93_sim_sa';
const SUB_ADMIN_PASS = 'SubSim#2026';
const SUPER_ADMIN_USER = 'r93_sim_root';
const SUPER_ADMIN_PASS = 'Root#Sim93';

// v2 KDF (600k) — نفس src/lib/hash.ts الحالي (لا مسار rehash عند الدخول)
function hashPassword(password) {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 600_000, 64, 'sha512').toString('hex');
  return `600000:${salt}:${hash}`;
}

/* مجموعات الخيارات على «لاتيه كراميل»: مجموعة إلزامية (الحجم) + اختيارية (إضافات) */
const GROUPS = [
  {
    nameAr: 'الحجم',
    name: 'Size',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    sortOrder: 1,
    options: [
      { nameAr: 'صغير', name: 'Small', priceDelta: 0, sortOrder: 1 },
      { nameAr: 'وسط', name: 'Medium', priceDelta: 1.5, sortOrder: 2 },
      { nameAr: 'كبير', name: 'Large', priceDelta: 2.5, sortOrder: 3 },
    ],
  },
  {
    nameAr: 'إضافات',
    name: 'Extras',
    minSelect: 0,
    maxSelect: 2,
    required: false,
    sortOrder: 2,
    options: [
      { nameAr: 'شوفان', name: 'Oat', priceDelta: 1, sortOrder: 1 },
      { nameAr: 'كراميل إضافي', name: 'Extra caramel', priceDelta: 1.5, sortOrder: 2 },
      { nameAr: 'حليب جوز الهند', name: 'Coconut milk', priceDelta: 2, sortOrder: 3 },
    ],
  },
];

async function main() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  // ── 1) خيارات «لاتيه كراميل» في al-waha-cafe ─────────────────────────────
  const item = (
    await client.query(
      `SELECT m.id FROM "MenuItem" m
       JOIN "MenuCategory" c ON c.id = m."categoryId"
       JOIN "Restaurant" r ON r.id = c."restaurantId"
       WHERE r.slug = 'al-waha-cafe' AND m.name = 'Caramel Latte'`
    )
  ).rows[0];
  if (!item) throw new Error('al-waha-cafe / Caramel Latte not found — run scripts/round83-seed.mjs first');

  // idempotent reset: مجموعات هذا الصنف تُحذف ثم تُعاد كتابتها (Cascade يمسح الخيارات)
  await client.query('DELETE FROM "ModifierGroup" WHERE "menuItemId" = $1', [item.id]);
  for (const g of GROUPS) {
    const grp = (
      await client.query(
        `INSERT INTO "ModifierGroup" ("nameAr", name, "minSelect", "maxSelect", required, "sortOrder", "menuItemId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) RETURNING id`,
        [g.nameAr, g.name, g.minSelect, g.maxSelect, g.required, g.sortOrder, item.id]
      )
    ).rows[0];
    for (const o of g.options) {
      await client.query(
        `INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,true,$4,$5,now(),now())`,
        [o.nameAr, o.name, o.priceDelta, o.sortOrder, grp.id]
      );
    }
  }
  console.log(`modifier groups on Caramel Latte (item ${item.id}): ${GROUPS.length} (${GROUPS.reduce((s, g) => s + g.options.length, 0)} options)`);

  // ── 2) sub_admin بأذونات صفرية (إعداد اختبار — قالب qa-seed) ─────────────
  const existing = await client.query('SELECT id FROM "User" WHERE username = $1', [SUB_ADMIN_USER]);
  if (existing.rows.length === 0) {
    await client.query(
      `INSERT INTO "User" (username, password, name, role, permissions, "subscriptionStatus", "createdAt", "updatedAt")
       VALUES ($1,$2,'مشرف محاكاة r93','sub_admin','{}'::"Permission"[],'UNPAID',now(),now())`,
      [SUB_ADMIN_USER, hashPassword(SUB_ADMIN_PASS)]
    );
    console.log(`sub_admin created: ${SUB_ADMIN_USER}/${SUB_ADMIN_PASS} (permissions=[])`);
  } else {
    await client.query("UPDATE \"User\" SET permissions = '{}'::\"Permission\"[] WHERE username = $1", [SUB_ADMIN_USER]);
    console.log(`sub_admin already exists: ${SUB_ADMIN_USER} (permissions reset to [])`);
  }

  // ── 3) super_admin لرحلة إنشاء sub_admin عبر الواجهة ──
  const existingRoot = await client.query('SELECT id FROM "User" WHERE username = $1', [SUPER_ADMIN_USER]);
  if (existingRoot.rows.length === 0) {
    await client.query(
      `INSERT INTO "User" (username, password, name, role, permissions, "subscriptionStatus", "createdAt", "updatedAt")
       VALUES ($1,$2,'مدير عام محاكاة r93','super_admin','{}'::"Permission"[],'UNPAID',now(),now())`,
      [SUPER_ADMIN_USER, hashPassword(SUPER_ADMIN_PASS)]
    );
    console.log(`super_admin created: ${SUPER_ADMIN_USER}/${SUPER_ADMIN_PASS}`);
  } else {
    console.log(`super_admin already exists: ${SUPER_ADMIN_USER}`);
  }

  const proof = await client.query(
    `SELECT (SELECT count(*) FROM "ModifierGroup" WHERE "menuItemId" = $1) AS groups,
            (SELECT count(*) FROM "ModifierOption" o JOIN "ModifierGroup" g ON g.id = o."groupId" WHERE g."menuItemId" = $1) AS options,
            (SELECT count(*) FROM "User" WHERE role = 'sub_admin') AS sub_admins`,
    [item.id]
  );
  console.log('--- seed proof:', JSON.stringify(proof.rows[0]), '---');
  await client.end();
}

main().catch((e) => {
  console.error('SEED FAILED:', e.message);
  process.exit(1);
});
