#!/usr/bin/env node
/**
 * CI/local DB seed — mirrors POST /api/seed (admin + default plans) without the
 * admin-auth chicken-and-egg: CI's Postgres service is empty after
 * `prisma migrate deploy`, and E2E auth suites need an admin + plans to log in.
 *
 * Idempotent: re-running refreshes plans, never duplicates the admin.
 * Safety: refuses to run in production unless ALLOW_SEED=true (same guard as
 * the API route). Test credentials only — never point this at production.
 */
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Refusing to seed production (ALLOW_SEED not set)');
  process.exit(1);
}

// INTENTIONALLY the legacy KDF (pbkdf2Sync, sha512, 100k, 64B, salt:hash) —
// src/lib/hash.ts now uses 600k (v2); the seed account stays on the legacy
// format so e2e exercises the verify + rehash-on-login upgrade path.
function hashPassword(password) {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const ADMIN_USER = process.env.SEED_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.SEED_ADMIN_PASS || 'admin123456';

// Same defaults as /api/seed route
const DEFAULT_PLANS = [
  { name: 'Free', nameAr: 'مجاني', price: 0, periodDays: 30, maxMenus: 1, maxItems: 10, maxOrders: 100, sortOrder: 1, features: ['منيو رقمي تفاعلي', '10 أصناف', 'طلبات واتساب', 'إحصائيات أساسية'] },
  { name: 'Premium', nameAr: 'المدفوعة', price: 29, periodDays: 30, maxMenus: 9999, maxItems: 9999, maxOrders: 99999, sortOrder: 2, features: ['جميع ميزات المجانية', 'أصناف غير محدودة', 'برنامج ولاء متكامل', 'QR كود مخصص', 'إحصائيات متقدمة', 'دعم فني فوري', 'تخصيص كامل'] },
];

const client = new Client({ connectionString: url });
await client.connect();

try {
  for (const p of DEFAULT_PLANS) {
    const { rows } = await client.query(
      `SELECT id FROM "SubscriptionPlan" WHERE name = $1`,
      [p.name]
    );
    if (rows.length > 0) {
      await client.query(
        `UPDATE "SubscriptionPlan" SET "nameAr"=$2, price=$3, "periodDays"=$4,
           "maxMenus"=$5, "maxItems"=$6, "maxOrders"=$7, "sortOrder"=$8, features=$9, "updatedAt"=now()
         WHERE id = $1`,
        [rows[0].id, p.nameAr, p.price, p.periodDays, p.maxMenus, p.maxItems, p.maxOrders, p.sortOrder, JSON.stringify(p.features)]
      );
    } else {
      await client.query(
        `INSERT INTO "SubscriptionPlan"
           (name, "nameAr", price, "periodDays", "maxMenus", "maxItems", "maxOrders", "sortOrder", features, "isActive", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,now(),now())`,
        [p.name, p.nameAr, p.price, p.periodDays, p.maxMenus, p.maxItems, p.maxOrders, p.sortOrder, JSON.stringify(p.features)]
      );
    }
    console.log(`plan upserted: ${p.name} (${p.nameAr})`);
  }

  const { rows: admins } = await client.query(
    `SELECT id, username FROM "User" WHERE username = $1`,
    [ADMIN_USER]
  );
  if (admins.length === 0) {
    await client.query(
      `INSERT INTO "User" (username, password, name, role, "subscriptionStatus", email, phone, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,'admin','UNPAID','','',now(),now())`,
      [ADMIN_USER, hashPassword(ADMIN_PASS), 'مدير النظام']
    );
    console.log(`admin created: ${ADMIN_USER}`);
  } else {
    console.log(`admin already exists: ${ADMIN_USER} (id=${admins[0].id}) — not touched`);
  }

  const { rows: proof } = await client.query(
    `SELECT (SELECT count(*) FROM "SubscriptionPlan") AS plans,
            (SELECT count(*) FROM "User" WHERE role='admin') AS admins`
  );
  console.log(`--- seed proof: plans=${proof[0].plans}, admins=${proof[0].admins} ---`);
} finally {
  await client.end();
}
