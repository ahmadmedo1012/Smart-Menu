#!/usr/bin/env node
/**
 * round88-before-routes.mjs (A2 takeover) — the "before" side of the LIST
 * endpoint rewrite (src/lib/list-counts.ts), kept reproducible.
 *
 * The routes themselves now ship the per-page grouped COUNT; the OLD form
 * (Prisma `_count` include — compiled into a full-table LEFT JOIN aggregate
 * over the child table, executed on EVERY page regardless of the parent
 * WHERE/pagination) only exists here, embedded as the exact query objects the
 * routes used before round88. Run against the perf DB with the round88
 * candidate indexes DROPPED to reproduce the true pre-round88 state:
 *
 *   node scripts/round88-perf/index-bench.mjs indexes --drop
 *   node --experimental-strip-types \
 *     --import ./scripts/round88-perf/round88-register.mjs \
 *     scripts/round88-perf/before-routes.mjs
 *
 * Measured (best-of-5 EXPLAIN ANALYZE, BUFFERS; take:20):
 *   orders-list-OLD       32.310ms / 624 buffers   SeqScan(OrderItem)
 *   categories-list-OLD    1.017ms /  15 buffers   IdxOnly(MenuItem_categoryId_idx)+sort
 *   restaurants-list-OLD   6.510ms /  57 buffers   SeqScan(Order)+SeqScan(MenuCategory)
 * The "after" side is `index-bench.mjs explain after` (categories-list-owner
 * 0.04ms / restaurants-list-admin 0.91ms / orders-list 0.13ms) — the remaining
 * restaurants-list cost is the row fetch itself (SeqScan Restaurant + Plan),
 * not the counts.
 */
import pg from 'pg';

const PERF_URL = 'postgresql://postgres:postgres@localhost:5434/smartmenu_perf'; // allow-secret-check: local embedded perf DB
const RUNS = 5;
const REST = 100;

const captured = [];
const origQuery = pg.Pool.prototype.query;
pg.Pool.prototype.query = async function (...args) {
  const [a, b] = args;
  const text = typeof a === 'object' && a ? a.text : a;
  const values = typeof a === 'object' && a ? a.values : b;
  if (typeof text === 'string' && !text.startsWith('EXPLAIN')) {
    captured.push({ text: text.replace(/\s+/g, ' ').trim(), values: values ?? [] });
  }
  return origQuery.apply(this, args);
};

process.env.DATABASE_URL = PERF_URL;
process.env.SKIP_ENV_CHECK = '1';
const { prisma } = await import('../../src/lib/db.ts');

const CASES = [
  ['orders-list-OLD-route', () =>
    Promise.all([
      prisma.order.findMany({
        where: { restaurantId: REST },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, orderNo: true, customerName: true, customerPhone: true,
          status: true, subtotal: true, discount: true, total: true,
          notes: true, pickupType: true, whatsappSent: true,
          createdAt: true, updatedAt: true,
          restaurant: { select: { id: true, name: true, slug: true } },
          _count: { select: { items: true } },
        },
        skip: 0, take: 20,
      }),
      prisma.order.count({ where: { restaurantId: REST } }),
    ])],
  ['categories-list-OLD-route', () =>
    Promise.all([
      prisma.menuCategory.findMany({
        where: { restaurantId: REST },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { items: true } } },
        skip: 0, take: 20,
      }),
      prisma.menuCategory.count({ where: { restaurantId: REST } }),
    ])],
  ['restaurants-list-OLD-route', () =>
    Promise.all([
      prisma.restaurant.findMany({
        where: {},
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true, categories: true } },
          plan: { select: { id: true, name: true, nameAr: true, price: true } },
        },
        skip: 0, take: 20,
      }),
      prisma.restaurant.count({ where: {} }),
    ])],
];

function summarizePlan(node, acc = { scans: [], sorts: 0 }) {
  if (!node) return acc;
  const t = node['Node Type'];
  if (/Seq Scan/.test(t)) acc.scans.push(`SeqScan(${node['Relation Name'] ?? '?'})`);
  if (/^Index Scan/.test(t)) acc.scans.push(`IdxScan(${node['Index Name'] ?? '?'})`);
  if (/^Index Only Scan/.test(t)) acc.scans.push(`IdxOnly(${node['Index Name'] ?? '?'})`);
  if (/^Bitmap Index Scan/.test(t)) acc.scans.push(`Bitmap(${node['Index Name'] ?? '?'})`);
  if (/Sort/.test(t)) acc.sorts++;
  for (const child of node['Plans'] ?? []) summarizePlan(child, acc);
  return acc;
}

const c = new pg.Client({ connectionString: PERF_URL });
await c.connect();
for (const [name, run] of CASES) {
  captured.length = 0;
  await run();
  let ms = 0, buffers = 0;
  const scans = [];
  let sorts = 0;
  for (const stmt of captured) {
    let best = null;
    for (let i = 0; i < RUNS; i++) {
      const { rows } = await c.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${stmt.text}`, stmt.values);
      const plan = rows[0]['QUERY PLAN'][0];
      if (!best || plan['Execution Time'] < best['Execution Time']) best = plan;
    }
    ms += best['Execution Time'];
    buffers += (best.Plan['Shared Hit Blocks'] ?? 0) + (best.Plan['Shared Read Blocks'] ?? 0);
    const s = summarizePlan(best.Plan);
    scans.push(...s.scans);
    sorts += s.sorts;
  }
  console.log(
    `${name.padEnd(28)} ${ms.toFixed(3).padStart(9)}ms  buffers=${String(buffers).padStart(6)}  stmts=${captured.length}  ${scans.join(' + ')}${sorts ? ` (sorts:${sorts})` : ''}`
  );
}
await c.end();
process.exit(0);
