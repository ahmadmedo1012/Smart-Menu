/**
 * capture-queries.mjs (A2) — captures the EXACT SQL Prisma emits for the
 * round88 benchmark query set, by running each query through the real
 * PrismaClient (same adapter the app uses) against the perf DB with the pg
 * Pool patched to record every statement.
 *
 * Run:  node --experimental-strip-types \
 *         --import ./scripts/round88-perf/round88-register.mjs \
 *         scripts/round88-perf/capture-queries.mjs
 *
 * Output: scripts/round88-perf/results/captured-queries.json
 *         [{ name, sql, params }]
 */
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

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

process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5434/smartmenu_perf'; // allow-secret-check: local embedded perf DB
process.env.SKIP_ENV_CHECK = '1';
const { prisma } = await import('../../src/lib/db.ts');

const REST = 100;
const OWNER = 101;
const USER = 200;
const today = new Date();
today.setHours(0, 0, 0, 0);
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

const QUERIES = [
  ['orders-list', () =>
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
        },
        skip: 0, take: 20,
      }),
      prisma.order.count({ where: { restaurantId: REST } }),
    ]).then((r) => orderItemCountByOrderRef(r[0].map((d) => d.id)))],
  ['orders-list-count', () => prisma.order.count({ where: { restaurantId: REST } })],
  ['orders-probe-count', () => prisma.order.count({ where: { restaurantId: REST, status: 'new' } })],
  ['orders-list-status-date', () =>
    prisma.order.findMany({
      where: { restaurantId: REST, status: 'completed', createdAt: { gte: new Date(Date.now() - 30 * 86400000), lte: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNo: true, createdAt: true },
      skip: 0, take: 20,
    })],
  ['stats-total-orders', () => prisma.order.count({ where: { restaurantId: REST } })],
  ['stats-today-orders', () => prisma.order.count({ where: { restaurantId: REST, createdAt: { gte: today } } })],
  ['stats-total-items', () => prisma.menuItem.count({ where: { category: { is: { restaurantId: REST } } } })],
  ['stats-popular-90d', () =>
    prisma.orderItem.groupBy({
      by: ['itemId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
      where: { order: { restaurantId: REST, createdAt: { gte: ninetyDaysAgo } } },
    })],
  ['stats-recent-orders', () =>
    prisma.order.findMany({
      where: { restaurantId: REST },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { items: { include: { item: { select: { id: true, name: true } } } } },
    })],
  ['stats-status-counts', () =>
    prisma.order.groupBy({ by: ['status'], where: { restaurantId: REST }, _count: true })],
  ['stats-today-revenue', () =>
    prisma.order.aggregate({ where: { restaurantId: REST, createdAt: { gte: today } }, _sum: { total: true } })],
  ['menu-items-all', () =>
    prisma.menuItem.findMany({
      where: { status: 'available', category: { is: { restaurantId: REST } } },
      select: {
        id: true, name: true, nameAr: true, description: true, descriptionAr: true,
        price: true, discountedPrice: true, image: true, sortOrder: true,
        categoryId: true, createdAt: true, dietaryTags: true, allergens: true, avgRating: true, ratingCount: true,
      },
      orderBy: { sortOrder: 'asc' },
    })],
  ['menu-popular-7d', () =>
    prisma.orderItem.groupBy({
      by: ['itemId'],
      _sum: { quantity: true },
      where: { order: { restaurantId: REST, createdAt: { gte: sevenDaysAgo }, status: { not: 'cancelled' } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })],
  ['menu-categories', () =>
    prisma.menuCategory.findMany({
      where: { isActive: true, restaurantId: REST },
      orderBy: { sortOrder: 'asc' },
    })],
  ['menu-restaurant-by-slug', () =>
    prisma.restaurant.findUnique({
      where: { slug: 'r0100', isActive: true },
      select: { id: true, name: true, slug: true, whatsapp: true },
    })],
  ['user-events', () =>
    prisma.systemEvent.findMany({
      where: { id: { gt: 0 }, metadata: { path: ['userId'], equals: USER } },
      orderBy: { id: 'asc' },
      take: 50,
    })],
  ['user-events-poll', () =>
    prisma.systemEvent.findMany({
      where: { id: { gt: 30000 }, metadata: { path: ['userId'], equals: USER } },
      orderBy: { id: 'asc' },
      take: 50,
    })],
  ['reviews-owner-list', () =>
    prisma.review.findMany({
      where: { menuItem: { is: { category: { is: { restaurantId: REST } } } } },
      select: {
        id: true, rating: true, comment: true, customerName: true, customerPhone: true,
        menuItemId: true, createdAt: true, menuItem: { select: { id: true, name: true, nameAr: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: 0, take: 20,
    })],
  ['reviews-owner-count', () =>
    prisma.review.count({ where: { menuItem: { is: { category: { is: { restaurantId: REST } } } } } })],
  ['reviews-owner-avg', () =>
    prisma.review.aggregate({
      _avg: { rating: true },
      where: { menuItem: { is: { category: { is: { restaurantId: REST } } } } },
    })],
  ['reviews-owner-dist', () =>
    prisma.review.groupBy({
      by: ['rating'],
      _count: { _all: true },
      where: { menuItem: { is: { category: { is: { restaurantId: REST } } } } },
    })],
  ['loyalty-recent-tx', () =>
    prisma.rewardTransaction.findMany({
      where: { restaurantId: REST },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, type: true, points: true, description: true, createdAt: true },
    })],
  ['loyalty-recent-refs', () =>
    prisma.referral.findMany({
      where: { restaurantId: REST },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, referralCode: true, status: true, createdAt: true, referredPhone: true },
    })],
  ['admin-subs-pending', () =>
    prisma.subscriptionPayment.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      skip: 0, take: 20,
      select: {
        id: true, userId: true, phone: true, amount: true, provider: true, planId: true,
        planName: true, status: true, metadata: true, createdAt: true,
        user: { select: { id: true, username: true, name: true } },
      },
    })],
  ['items-by-category', () =>
    prisma.menuItem.findMany({
      where: { categoryId: 595 },
      orderBy: { sortOrder: 'asc' },
      include: { category: { select: { id: true, name: true, nameAr: true } } },
      skip: 0, take: 20,
    })],
  ['admin-system-events-list', () =>
    prisma.systemEvent.findMany({
      orderBy: { createdAt: 'desc' },
      skip: 0, take: 20,
      select: { id: true, eventType: true, title: true, message: true, severity: true, metadata: true, read: true, createdAt: true },
    })],
  ['admin-stats-group-orders', () =>
    prisma.order.groupBy({ by: ['restaurantId'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } })],
  ['categories-list-owner', () =>
    Promise.all([
      prisma.menuCategory.findMany({
        where: { restaurantId: REST },
        orderBy: { sortOrder: 'asc' },
        skip: 0, take: 20,
      }),
      prisma.menuCategory.count({ where: { restaurantId: REST } }),
    ]).then(() => itemCountByCategoryRef([591, 592, 593, 594, 595, 596]))],
  ['restaurants-list-admin', () =>
    Promise.all([
      prisma.restaurant.findMany({
        where: {},
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { id: true, name: true, nameAr: true, price: true } } },
        skip: 0, take: 20,
      }),
      prisma.restaurant.count({ where: {} }),
    ]).then(() =>
      Promise.all([
        orderCountByRestaurantRef([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
        categoryCountByRestaurantRef([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
      ]))],
];

// refs resolved after prisma import (hoisting-safe)
let orderItemCountByOrderRef;
let itemCountByCategoryRef;
let orderCountByRestaurantRef;
let categoryCountByRestaurantRef;
try {
  const lc = await import('../../src/lib/list-counts.ts');
  orderItemCountByOrderRef = lc.orderItemCountByOrder;
  itemCountByCategoryRef = lc.itemCountByCategory;
  orderCountByRestaurantRef = lc.orderCountByRestaurant;
  categoryCountByRestaurantRef = lc.categoryCountByRestaurant;
} catch {
  /* helper import optional for capture */
}

const out = [];
for (const [name, run] of QUERIES) {
  captured.length = 0;
  await run();
  if (captured.length === 0) {
    console.error(`!! ${name}: no SQL captured`);
    process.exit(1);
  }
  out.push({
    name,
    statements: captured.map(({ text, values }) => ({ sql: text, params: values })),
  });
  console.log(`captured ${name}: ${captured.length} statement(s)`);
}

if (!existsSync('scripts/round88-perf/results')) mkdirSync('scripts/round88-perf/results', { recursive: true });
writeFileSync('scripts/round88-perf/results/captured-queries.json', JSON.stringify(out, null, 2));
console.log(`\nwrote ${out.length} queries to scripts/round88-perf/results/captured-queries.json`);
process.exit(0);
