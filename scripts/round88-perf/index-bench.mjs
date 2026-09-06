#!/usr/bin/env node
/**
 * round88-index-bench.mjs (A2) — production-scale index measurement harness.
 *
 * WHAT THIS DOES
 *   setup   : (re)create scratch DB `smartmenu_perf` on the embedded Postgres
 *             (:5434), replay every committed migration in the exact applied
 *             order (copied from the dev DB's _prisma_migrations rows, so the
 *             checksums are the real ones), then seed a synthetic dataset at
 *             production scale (161 restaurants / 321 users — the sizes the
 *             production /api/public/stats reported in Sep 2026 — plus grown
 *             tables for orders/items/reviews/events/loyalty).
 *   explain : run EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) on the captured
 *             query set (see capture-queries.mjs) N times, write medians to
 *             a JSON file, print a table.
 *   indexes : create (--drop to remove) the round88 candidate indexes.
 *
 * The dev DB itself (smartmenu) holds only seed data (9 items) — EXPLAIN there
 * is meaningless because the planner picks seq scans on tiny tables. All
 * before/after evidence for the round88 indexes comes from THIS scratch DB.
 *
 * Zero new dependencies (node:pg is a project dependency). Deterministic
 * PRNG (mulberry32) so every setup produces identical data.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import pg from 'pg';

const PG_ADMIN = 'postgresql://postgres:postgres@localhost:5434/postgres'; // allow-secret-check: local embedded dev instance, seeded credentials
const PERF_DB = process.env.PERF_DB_NAME || 'smartmenu_perf';
const PERF_URL = `postgresql://postgres:postgres@localhost:5434/${PERF_DB}`; // allow-secret-check: local embedded dev instance, seeded credentials
const DEV_URL = 'postgresql://postgres:postgres@localhost:5434/smartmenu'; // allow-secret-check: local embedded dev instance, seeded credentials
const OUT_DIR = 'scripts/round88-perf/results';
const RUNS = 5;

/* ─── pinned benchmark identities (deterministic, created by seed) ─────── */
const REST = 100; // mid-range restaurant
const OWNER = 101; // owner of restaurant 100
const USER = 200; // plain USER role with sparse system events
const ADMIN = 1;

/* ─── deterministic PRNG ───────────────────────────────────────────────── */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function connectAdmin() {
  const c = new pg.Client({ connectionString: PG_ADMIN });
  await c.connect();
  return c;
}

/* ─── setup: create DB + replay migrations in real applied order ───────── */
async function setup() {
  const admin = await connectAdmin();
  await admin.query(`DROP DATABASE IF EXISTS "${PERF_DB}"`);
  await admin.query(`CREATE DATABASE "${PERF_DB}"`);

  // Migration order + checksums straight from the dev DB (applied order, not
  // lexicographic dir order — 0_zz…/10_…/11_… must replay in the right sequence).
  const dev = new pg.Client({ connectionString: DEV_URL });
  await dev.connect();
  const { rows: migrations } = await dev.query(
    `SELECT migration_name, checksum, finished_at::text AS finished_at,
            applied_steps_count, logs, rolled_back_at::text AS rolled_back_at, started_at::text AS started_at
       FROM _prisma_migrations ORDER BY finished_at ASC`
  );
  await dev.end();

  const perf = new pg.Client({ connectionString: PERF_URL });
  await perf.connect();
  for (const m of migrations) {
    const sql = readFileSync(`prisma/migrations/${m.migration_name}/migration.sql`, 'utf8');
    await perf.query(sql);
  }
  // Record the applied migrations with the REAL checksums — the perf DB is now
  // indistinguishable from a legit `migrate deploy` target for these files.
  await perf.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ(3) NOT NULL,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ(3),
    started_at TIMESTAMPTZ(3) NOT NULL,
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  )`);
  for (const m of migrations) {
    await perf.query(
      `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [crypto.randomUUID(), m.checksum, m.finished_at, m.migration_name, m.logs, null, m.finished_at, m.applied_steps_count ?? 0]
    );
  }
  await perf.end();
  await admin.end();
  console.log(`setup: DB ${PERF_DB} created, ${migrations.length} migrations replayed (order + checksums from dev DB).`);
}

/* ─── seed: synthetic data at production scale ─────────────────────────── */
const RESTAURANTS = 161; // matches production /api/public/stats count
const USERS = 321; // 1 admin + 160 owners + 160 USERs
const CATS_PER_REST = 6;
const ITEMS_PER_REST = 60;
const ORDERS_PER_REST = 250; // over 120 days
const REVIEWS = 30000;
const SYSEVENTS = 60000;
const AUDIT = 25000;
const TX_PER_REST = 400; // RewardTransaction
const REFS_PER_REST = 150; // Referral
const CARDS_PER_REST = 25;
const SUBPAYMENTS = 1500;

const pad = (n, w = 4) => String(n).padStart(w, '0');
const money = (n) => (Math.round(n * 100) / 100).toFixed(2);

async function seed() {
  const c = new pg.Client({ connectionString: PERF_URL });
  await c.connect();
  const rnd = mulberry32(88);
  const t0 = Date.now();
  const NOW = Date.now();
  const DAY = 86400000;

  async function insertBatched(table, cols, rows, batch = 500) {
    for (let i = 0; i < rows.length; i += batch) {
      const chunk = rows.slice(i, i + batch);
      const values = [];
      const params = [];
      chunk.forEach((r, ri) => {
        const ph = r.map((v) => {
          params.push(v);
          return `$${params.length}`;
        });
        values.push(`(${ph.join(',')})`);
      });
      await c.query(
        `INSERT INTO "${table}" (${cols.map((x) => `"${x}"`).join(',')}) VALUES ${values.join(',')} ON CONFLICT DO NOTHING`,
        params
      );
    }
  }

  /* Plans (2 rows) */
  await insertBatched(
    'SubscriptionPlan',
    ['id', 'name', 'nameAr', 'price', 'periodDays', 'maxMenus', 'maxItems', 'maxOrders', 'sortOrder', 'isActive', 'createdAt', 'updatedAt', 'features'],
    [
      [1, 'free', 'مجاني', '0', 30, 1, 10, 500, 0, true, new Date(NOW - 400 * DAY).toISOString(), new Date(NOW - 400 * DAY).toISOString(), '[]'],
      [2, 'premium', 'بريميوم', '49', 30, 5, 200, 2000, 1, true, new Date(NOW - 400 * DAY).toISOString(), new Date(NOW - 400 * DAY).toISOString(), '[]'],
    ]
  );

  /* Restaurants */
  const restRows = [];
  for (let i = 1; i <= RESTAURANTS; i++) {
    restRows.push([
      i, `مطعم ${pad(i, 3)}`, `r${pad(i, 3)}`, 'وصف تجريبي', '', `091${pad(i, 7)}`, `092${pad(i, 7)}`, '', 'طرابلس',
      'amber', 'LYD', true, i <= 12, i <= 12 ? i : null, 2, new Date(NOW - (400 - i) * DAY).toISOString(), new Date().toISOString(),
      [], 200, 2000, '[]',
    ]);
  }
  await insertBatched(
    'Restaurant',
    ['id', 'name', 'slug', 'description', 'logo', 'phone', 'whatsapp', 'email', 'city', 'themeColor', 'currency', 'isActive', 'showOnLanding', 'featuredRank', 'planId', 'createdAt', 'updatedAt', 'gallery', 'maxItems', 'maxOrders', 'pickupTypes'],
    restRows
  );

  /* Users: 1 admin, 2..161 owners (owner of restaurant i-1), 162..321 USER role */
  const userRows = [];
  const pw = 'x';
  for (let i = 1; i <= USERS; i++) {
    const role = i === 1 ? 'super_admin' : i <= 161 ? 'owner' : 'USER';
    userRows.push([
      i, role === 'owner' ? `owner${pad(i)}` : role === 'super_admin' ? 'admin' : `user${pad(i)}`, pw,
      role === 'super_admin' ? 'PAID' : 'UNPAID', `اسم ${pad(i)}`, `u${i}@x.ly`, `091${pad(i, 7)}`,
      role === 'owner' ? i - 1 : null, 2, new Date(NOW - (300 - i / 2) * DAY).toISOString(), new Date().toISOString(),
      role, role === 'super_admin' ? ['MANAGE_RESTAURANTS', 'MANAGE_USERS', 'APPROVE_ORDERS', 'EDIT_SETTINGS', 'VIEW_ANALYTICS', 'MANAGE_SUBSCRIPTIONS'] : [],
      '{}',
    ]);
  }
  await insertBatched(
    'User',
    ['id', 'username', 'password', 'subscriptionStatus', 'name', 'email', 'phone', 'restaurantId', 'planId', 'createdAt', 'updatedAt', 'role', 'permissions', 'notificationPrefs'],
    userRows
  );

  /* UserRestaurant links (owner i ↔ restaurant i-1) */
  const links = [];
  for (let i = 2; i <= 161; i++) links.push([i, i - 1, i === 2, new Date(NOW - 300 * DAY).toISOString()]);
  await insertBatched('UserRestaurant', ['userId', 'restaurantId', 'isPrimary', 'createdAt'], links);

  /* Sessions for the three benchmark identities + every user (future expiry) */
  const { createHash } = await import('node:crypto');
  const hash = (s) => createHash('sha256').update(s).digest('hex');
  const sess = [];
  for (let i = 1; i <= USERS; i++) {
    sess.push([`sess-${pad(i, 6)}`, i, hash(`bench-token-${i}`), new Date(NOW + 12 * 3600000).toISOString(), new Date(NOW - 3600000).toISOString()]);
  }
  await insertBatched('Session', ['id', 'userId', 'token', 'expiresAt', 'createdAt'], sess);

  /* MenuCategory ×6 / restaurant */
  const cats = [];
  let catId = 0;
  for (let r = 1; r <= RESTAURANTS; r++) {
    for (let k = 1; k <= CATS_PER_REST; k++) {
      cats.push([++catId, `فئة ${k}`, `فئة ${k}`, '', k, true, r, new Date(NOW - 200 * DAY).toISOString(), new Date().toISOString()]);
    }
  }
  await insertBatched(
    'MenuCategory',
    ['id', 'name', 'nameAr', 'icon', 'sortOrder', 'isActive', 'restaurantId', 'createdAt', 'updatedAt'],
    cats
  );

  /* MenuItem ×60 / restaurant (85% available, 2 featured each) */
  const items = [];
  let itemId = 0;
  const names = ['برجر', 'شاورما', 'بيتزا', 'سلطة', 'عصير', 'قهوة', 'كيك', 'معكرونة', 'سمك', 'دجاج'];
  for (let r = 1; r <= RESTAURANTS; r++) {
    for (let k = 1; k <= ITEMS_PER_REST; k++) {
      const cat = (r - 1) * CATS_PER_REST + (k % CATS_PER_REST) + 1;
      itemId++;
      const featured = k <= 2;
      items.push([
        itemId, `${names[k % names.length]} ${k}`, `${names[k % names.length]} ${k}`, 'وصف', 'وصف',
        money(10 + rnd() * 40), rnd() < 0.2 ? money(8 + rnd() * 20) : null, '', k, cat,
        new Date(NOW - (150 - (k / ITEMS_PER_REST) * 150) * DAY).toISOString(), new Date().toISOString(),
        rnd() < 0.85 ? 'available' : 'unavailable', null, 0, [], [],
        featured, featured ? k : null, null, [],
      ]);
    }
  }
  await insertBatched(
    'MenuItem',
    ['id', 'name', 'nameAr', 'description', 'descriptionAr', 'price', 'discountedPrice', 'image', 'sortOrder', 'categoryId', 'createdAt', 'updatedAt', 'status', 'avgRating', 'ratingCount', 'dietaryTags', 'allergens', 'isFeatured', 'featuredRank', 'showcaseTag', 'showcaseTags'],
    items
  );

  /* Orders ×250 / restaurant over 120 days (weighted to recent) + OrderItems 1-3 each */
  const orders = [];
  let orderId = 0;
  const statuses = ['new', 'preparing', 'ready', 'completed', 'completed', 'completed', 'completed', 'completed', 'cancelled'];
  const pickups = ['inside', 'takeaway', 'delivery'];
  for (let r = 1; r <= RESTAURANTS; r++) {
    for (let k = 0; k < ORDERS_PER_REST; k++) {
      orderId++;
      // 50% of orders fall in the last 30 days (recent-weighted like a live shop)
      const daysBack = rnd() < 0.5 ? rnd() * 30 : 30 + rnd() * 90;
      const when = new Date(NOW - daysBack * DAY);
      const nItems = 1 + Math.floor(rnd() * 3);
      let sub = 0;
      for (let q = 0; q < nItems; q++) sub += 10 + rnd() * 40;
      orders.push([
        orderId, `ORD-B${pad(orderId, 6)}`, `عميل ${pad(orderId, 5)}`, `091${pad(orderId, 7)}`, '',
        money(sub), '0.00', money(sub), false, r, when.toISOString(), when.toISOString(),
        pickups[Math.floor(rnd() * 3)], statuses[Math.floor(rnd() * statuses.length)],
      ]);
    }
  }
  await insertBatched(
    'Order',
    ['id', 'orderNo', 'customerName', 'customerPhone', 'notes', 'subtotal', 'discount', 'total', 'whatsappSent', 'restaurantId', 'createdAt', 'updatedAt', 'pickupType', 'status'],
    orders
  );

  /* OrderItems 1-3 per order, referencing items of the SAME restaurant */
  const orderItems = [];
  for (let o = 1; o <= orderId; o++) {
    const r = Math.floor((o - 1) / ORDERS_PER_REST) + 1;
    const base = (r - 1) * ITEMS_PER_REST;
    const nItems = 1 + Math.floor(rnd() * 3);
    for (let q = 0; q < nItems; q++) {
      const it = base + 1 + Math.floor(rnd() * ITEMS_PER_REST);
      orderItems.push([o, it, 1 + Math.floor(rnd() * 3), '', money(10 + rnd() * 40), '[]']);
    }
  }
  await insertBatched('OrderItem', ['orderId', 'itemId', 'quantity', 'notes', 'price', 'modifiersJson'], orderItems);

  /* Reviews (random items; menuItemId restrict-delete FK satisfied) */
  const reviews = [];
  for (let i = 0; i < REVIEWS; i++) {
    const it = 1 + Math.floor(rnd() * itemId);
    reviews.push([
      1 + Math.floor(rnd() * 5), rnd() < 0.3 ? 'تعليق تجريبي' : '', `زائر ${pad(i, 5)}`, `092${pad(i, 7)}`, it,
      new Date(NOW - rnd() * 120 * DAY).toISOString(),
    ]);
  }
  await insertBatched('Review', ['rating', 'comment', 'customerName', 'customerPhone', 'menuItemId', 'createdAt'], reviews);

  /* LoyaltyCards: 25 / restaurant */
  const cards = [];
  let cardId = 0;
  for (let r = 1; r <= RESTAURANTS; r++) {
    for (let k = 1; k <= CARDS_PER_REST; k++) {
      cardId++;
      const spent = 100 + rnd() * 2000;
      cards.push([
        cardId, `093${pad(r, 3)}${pad(k, 4)}`, `عميل ${pad(cardId, 5)}`, Math.floor(1 + rnd() * 20),
        money(spent), Math.floor(spent / 10), `REF${pad(cardId, 6)}`, r, new Date(NOW - rnd() * 90 * DAY).toISOString(),
        ['bronze', 'bronze', 'silver', 'silver', 'gold', 'platinum'][Math.floor(rnd() * 6)],
      ]);
    }
  }
  await insertBatched(
    'LoyaltyCard',
    ['id', 'customerPhone', 'customerName', 'totalOrders', 'totalSpent', 'points', 'referralCode', 'restaurantId', 'createdAt', 'tier', 'updatedAt'],
    cards.map((r) => [...r, new Date().toISOString()])
  );

  /* Referrals: 150 / restaurant (referrers from same restaurant) */
  const refs = [];
  const refStats = ['pending', 'pending', 'converted', 'converted', 'converted', 'expired'];
  for (let r = 1; r <= RESTAURANTS; r++) {
    for (let k = 1; k <= REFS_PER_REST; k++) {
      const card = (r - 1) * CARDS_PER_REST + 1 + Math.floor(rnd() * CARDS_PER_REST);
      const when = new Date(NOW - rnd() * 90 * DAY);
      refs.push([
        `RC${pad(r, 3)}${pad(k, 4)}`, card, `094${pad(r, 3)}${pad(k, 4)}`, `مدعو ${pad(k, 4)}`, 10, 10, null,
        when.toISOString(), rnd() < 0.5 ? when.toISOString() : null, r, refStats[Math.floor(rnd() * refStats.length)],
      ]);
    }
  }
  await insertBatched(
    'Referral',
    ['referralCode', 'referrerId', 'referredPhone', 'referredName', 'discountPercent', 'referrerRewardPct', 'orderId', 'createdAt', 'convertedAt', 'restaurantId', 'status'],
    refs
  );

  /* RewardTransactions: 400 / restaurant */
  const txs = [];
  for (let r = 1; r <= RESTAURANTS; r++) {
    for (let k = 1; k <= TX_PER_REST; k++) {
      const card = (r - 1) * CARDS_PER_REST + 1 + Math.floor(rnd() * CARDS_PER_REST);
      txs.push([
        card, Math.floor(rnd() * 50) - 10, 'حركة نقاط', null, r,
        new Date(NOW - rnd() * 120 * DAY).toISOString(), rnd() < 0.5 ? 'earn' : 'redeem',
      ]);
    }
  }
  await insertBatched(
    'RewardTransaction',
    ['cardId', 'points', 'description', 'orderId', 'restaurantId', 'createdAt', 'type'],
    txs
  );

  /* SystemEvents: 60k platform + 15.6k user-scoped (sparse per user) */
  const evs = [];
  const evTypes = ['payment', 'order', 'telegram', 'config', 'session'];
  for (let i = 0; i < SYSEVENTS; i++) {
    const isUserScoped = i % 4 === 0; // 25% carry metadata.userId
    const uid = isUserScoped ? 1 + Math.floor(rnd() * USERS) : null;
    evs.push([
      evTypes[Math.floor(rnd() * evTypes.length)], `عنوان ${pad(i, 5)}`, `تفصيل ${pad(i, 5)}`,
      ['info', 'info', 'info', 'warning', 'error'][Math.floor(rnd() * 5)],
      JSON.stringify(uid ? { userId: uid } : { note: i }), rnd() < 0.2,
      new Date(NOW - (SYSEVENTS - i) * (5000 * 60) / 6).toISOString(), // oldest→newest, ~2 months
    ]);
  }
  await insertBatched(
    'SystemEvent',
    ['eventType', 'title', 'message', 'severity', 'metadata', 'read', 'createdAt'],
    evs.map((e) => [e[0], e[1], e[2], e[3], e[4], e[5], e[6]])
  );

  /* AuditLog ×25k */
  const audits = [];
  const acts = ['login', 'create', 'update', 'delete', 'export'];
  for (let i = 0; i < AUDIT; i++) {
    audits.push([
      acts[Math.floor(rnd() * acts.length)], 1 + Math.floor(rnd() * USERS), 'menuItem', 1 + Math.floor(rnd() * itemId),
      '{}', `10.0.0.${1 + Math.floor(rnd() * 200)}`, new Date(NOW - rnd() * 90 * DAY).toISOString(),
    ]);
  }
  await insertBatched('AuditLog', ['action', 'actorId', 'targetType', 'targetId', 'metadata', 'ip', 'createdAt'], audits);

  /* SubscriptionPayments */
  const pays = [];
  for (let i = 0; i < SUBPAYMENTS; i++) {
    const st = i < 100 ? 'pending' : i < 1300 ? 'verified' : 'cancelled';
    pays.push([
      i + 1, 162 + (i % 160), `095${pad(i, 7)}`, money(19 + (i % 5) * 10), ['libyana', 'madar', 'bank'][i % 3], 2, 'بريميوم',
      st, JSON.stringify({ tempUsername: null, tempRestaurants: [] }), new Date(NOW - rnd() * 120 * DAY).toISOString(),
    ]);
  }
  await insertBatched(
    'SubscriptionPayment',
    ['id', 'userId', 'phone', 'amount', 'provider', 'planId', 'planName', 'status', 'metadata', 'createdAt'],
    pays
  );

  /* Fresh planner stats — CRITICAL for honest index usage */
  await c.query('ANALYZE');
  const counts = await c.query(`
    SELECT relname, n_live_tup FROM pg_stat_user_tables
    WHERE relname IN ('Order','OrderItem','MenuItem','Review','SystemEvent','AuditLog','RewardTransaction','Referral','LoyaltyCard','SubscriptionPayment','Session','User','Restaurant','MenuCategory')
    ORDER BY n_live_tup DESC`);
  console.log('seed: done in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  for (const r of counts.rows) console.log(`   ${r.relname.padEnd(22)} ${r.n_live_tup}`);
  await c.end();
}

/* ─── candidate indexes (the round88 proposal) ─────────────────────────── */
const CANDIDATES = [
  {
    name: 'RewardTransaction_restaurantId_createdAt_idx',
    ddl: `CREATE INDEX "RewardTransaction_restaurantId_createdAt_idx" ON "RewardTransaction" ("restaurantId", "createdAt")`,
    drop: `DROP INDEX IF EXISTS "RewardTransaction_restaurantId_createdAt_idx"`,
    serves: 'loyalty/stats recentTransactions: WHERE restaurantId ORDER BY createdAt DESC LIMIT 10',
  },
  {
    name: 'Referral_restaurantId_createdAt_idx',
    ddl: `CREATE INDEX "Referral_restaurantId_createdAt_idx" ON "Referral" ("restaurantId", "createdAt")`,
    drop: `DROP INDEX IF EXISTS "Referral_restaurantId_createdAt_idx"`,
    serves: 'loyalty/stats recentReferrals: WHERE restaurantId ORDER BY createdAt DESC LIMIT 10',
  },
  {
    name: 'SubscriptionPayment_status_createdAt_idx',
    ddl: `CREATE INDEX "SubscriptionPayment_status_createdAt_idx" ON "SubscriptionPayment" ("status", "createdAt")`,
    drop: `DROP INDEX IF EXISTS "SubscriptionPayment_status_createdAt_idx"`,
    serves: 'admin/subscriptions list: WHERE status=pending ORDER BY createdAt DESC LIMIT 20',
  },
  {
    name: 'MenuItem_categoryId_sortOrder_idx',
    ddl: `CREATE INDEX "MenuItem_categoryId_sortOrder_idx" ON "MenuItem" ("categoryId", "sortOrder")`,
    drop: `DROP INDEX IF EXISTS "MenuItem_categoryId_sortOrder_idx"`,
    serves: '/api/items + public menu: WHERE category(restaurant) ORDER BY sortOrder ASC',
  },
  {
    name: 'SystemEvent_userId_idx (expression, hand-written)',
    ddl: `CREATE INDEX "SystemEvent_userId_idx" ON "SystemEvent" ((("metadata"#>ARRAY['userId']::text[])), "id")`,
    drop: `DROP INDEX IF EXISTS "SystemEvent_userId_idx"`,
    serves: '/api/user/events 15s poll: metadata.userId path filter + ORDER BY id ASC LIMIT 50',
  },
];

async function manageIndexes(drop) {
  const c = new pg.Client({ connectionString: PERF_URL });
  await c.connect();
  for (const cand of CANDIDATES) {
    const sql = drop ? cand.drop : cand.ddl;
    await c.query(sql);
    console.log(`${drop ? 'dropped' : 'created'}: ${cand.name}`);
    if (!drop) console.log(`   serves: ${cand.serves}`);
  }
  await c.query('ANALYZE');
  await c.end();
}

/* ─── EXPLAIN runner ───────────────────────────────────────────────────── */
function summarizePlan(node, acc = { scans: [], sorts: 0, loops: 0 }) {
  if (!node) return acc;
  const t = node['Node Type'];
  if (/Seq Scan/.test(t)) acc.scans.push(`SeqScan(${node['Relation Name'] ?? '?'})`);
  if (/^Index Scan/.test(t)) acc.scans.push(`IdxScan(${node['Index Name'] ?? '?'})`);
  if (/^Index Only Scan/.test(t)) acc.scans.push(`IdxOnly(${node['Index Name'] ?? '?'})`);
  if (/^Bitmap Index Scan/.test(t)) acc.scans.push(`Bitmap(${node['Index Name'] ?? '?'})`);
  if (/Sort/.test(t)) acc.sorts++;
  if (node['Actual Loops'] > 1) acc.loops = Math.max(acc.loops, node['Actual Loops']);
  for (const child of node['Plans'] ?? []) summarizePlan(child, acc);
  return acc;
}

async function explainPhase(phase) {
  const capturedPath = `${OUT_DIR}/captured-queries.json`;
  if (!existsSync(capturedPath)) {
    console.error(`no captured queries at ${capturedPath} — run capture-queries.mjs first`);
    process.exit(1);
  }
  const queries = JSON.parse(readFileSync(capturedPath, 'utf8'));
  const c = new pg.Client({ connectionString: PERF_URL });
  await c.connect();

  const results = [];
  for (const q of queries) {
    const stmtBest = [];
    for (const stmt of q.statements) {
      let best = null;
      for (let run = 0; run < RUNS; run++) {
        const { rows } = await c.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${stmt.sql}`, stmt.params);
        const plan = rows[0]['QUERY PLAN'][0];
        if (!best || plan['Execution Time'] < best['Execution Time']) best = plan;
      }
      stmtBest.push(best);
    }
    const ms = stmtBest.reduce((s, b) => s + b['Execution Time'], 0);
    const buffers = stmtBest.reduce(
      (s, b) => s + (b.Plan['Shared Hit Blocks'] ?? 0) + (b.Plan['Shared Read Blocks'] ?? 0),
      0
    );
    const scans = stmtBest.flatMap((b) => summarizePlan(b.Plan).scans);
    const sorts = stmtBest.reduce((s, b) => s + summarizePlan(b.Plan).sorts, 0);
    results.push({ name: q.name, ms, statements: q.statements.length, scans, sorts, buffers });
  }
  await c.end();

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/explain-${phase}.json`, JSON.stringify(results, null, 2));
  console.log(`\nphase=${phase} — ${RUNS} runs each, best-of-${RUNS} Execution Time summed per statement\n`);
  for (const r of results) {
    console.log(
      `${r.name.padEnd(34)} ${r.ms.toFixed(2).padStart(9)}ms  buffers=${String(r.buffers).padStart(7)}  ${r.scans.join(' + ') || '—'}${r.sorts ? ` (sorts:${r.sorts})` : ''}`
    );
  }
}

/* ─── compare ──────────────────────────────────────────────────────────── */
async function compare() {
  const before = JSON.parse(readFileSync(`${OUT_DIR}/explain-before.json`, 'utf8'));
  const after = JSON.parse(readFileSync(`${OUT_DIR}/explain-after.json`, 'utf8'));
  const bMap = new Map(before.map((r) => [r.name, r]));
  console.log('\n=== BEFORE → AFTER (best-of-5 Execution Time, summed over the group\'s statements) ===');
  console.log(`${'query'.padEnd(34)} ${'before'.padStart(9)} ${'after'.padStart(9)} ${'Δ'.padStart(9)}  plan change`);
  for (const a of after) {
    const b = bMap.get(a.name);
    if (!b) continue;
    const delta = b.ms - a.ms;
    const planChanged = JSON.stringify(b.scans) !== JSON.stringify(a.scans) || b.sorts !== a.sorts;
    console.log(
      `${a.name.padEnd(34)} ${b.ms.toFixed(2).padStart(8)}ms ${a.ms.toFixed(2).padStart(8)}ms ${(delta >= 0 ? '-' : '+') + Math.abs(delta).toFixed(2).padStart(7)}ms  ${planChanged ? `${b.scans.join('+') || '—'} → ${a.scans.join('+') || '—'}` : 'plan unchanged'}`
    );
  }
}

/* ─── CLI ──────────────────────────────────────────────────────────────── */
const cmd = process.argv[2];
if (cmd === 'setup') await setup();
else if (cmd === 'seed') await seed();
else if (cmd === 'explain') await explainPhase(process.argv[3] ?? 'before');
else if (cmd === 'indexes') await manageIndexes(process.argv.includes('--drop'));
else if (cmd === 'compare') await compare();
else {
  console.log(`usage:
  node scripts/round88-perf/index-bench.mjs setup            # recreate smartmenu_perf + replay migrations
  node scripts/round88-perf/index-bench.mjs seed             # synthetic production-scale data + ANALYZE
  node scripts/round88-perf/index-bench.mjs indexes [--drop] # create/drop the round88 candidates
  node scripts/round88-perf/index-bench.mjs explain before   # EXPLAIN ANALYZE the captured query set
  node scripts/round88-perf/index-bench.mjs explain after
  node scripts/round88-perf/index-bench.mjs compare          # before/after table`);
}
