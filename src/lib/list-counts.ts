import { prisma } from './db';

/**
 * round88-A2 — per-page relation counts for LIST endpoints.
 *
 * WHY: Prisma compiles `_count: { select: { <rel> } }` on a findMany into
 *   LEFT JOIN (SELECT "<fk>", COUNT(*) FROM "<child>" WHERE 1=1 GROUP BY "<fk>") aggr
 * — a FULL-TABLE aggregate of the child table, executed on EVERY list call,
 * regardless of the parent WHERE/pagination. Measured on the round88 perf DB
 * (161 restaurants / 40,250 orders / 80,718 order items / 9,660 items):
 *   - /api/orders list:      30.2ms / 621 buffers (SeqScan OrderItem)
 *   - /api/categories list:   1.2ms /  12 buffers (SeqScan MenuItem)
 *   - /api/restaurants list:  6.8ms /  55 buffers (SeqScan Order + MenuCategory)
 * All three grew linearly with PLATFORM-WIDE data while serving a 20-row page.
 *
 * These helpers count only the ids actually fetched on the page (one grouped
 * index lookup per child), and return the same numbers Prisma's COALESCE
 * would have produced (missing/empty → 0). Response shapes are unchanged.
 */
async function toCountMap(
  rows: Array<{ key: number; count: number }>
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.key, r.count);
  return map;
}

/** OrderItem count per orderId — /api/orders list rows (`_count.items`). */
export async function orderItemCountByOrder(orderIds: number[]): Promise<Map<number, number>> {
  if (orderIds.length === 0) return new Map();
  const rows = await prisma.orderItem.groupBy({
    by: ['orderId'],
    _count: { _all: true },
    where: { orderId: { in: orderIds } },
  });
  return toCountMap(rows.map((r) => ({ key: r.orderId, count: r._count._all })));
}

/** MenuItem count per categoryId — /api/categories list rows (`_count.items`). */
export async function itemCountByCategory(categoryIds: number[]): Promise<Map<number, number>> {
  if (categoryIds.length === 0) return new Map();
  const rows = await prisma.menuItem.groupBy({
    by: ['categoryId'],
    _count: { _all: true },
    where: { categoryId: { in: categoryIds } },
  });
  return toCountMap(rows.map((r) => ({ key: r.categoryId, count: r._count._all })));
}

/** Order count per restaurantId — /api/restaurants list rows (`_count.orders`). */
export async function orderCountByRestaurant(
  restaurantIds: number[]
): Promise<Map<number, number>> {
  if (restaurantIds.length === 0) return new Map();
  const rows = await prisma.order.groupBy({
    by: ['restaurantId'],
    _count: { _all: true },
    where: { restaurantId: { in: restaurantIds } },
  });
  return toCountMap(rows.map((r) => ({ key: r.restaurantId, count: r._count._all })));
}

/** MenuCategory count per restaurantId — /api/restaurants list rows (`_count.categories`). */
export async function categoryCountByRestaurant(
  restaurantIds: number[]
): Promise<Map<number, number>> {
  if (restaurantIds.length === 0) return new Map();
  const rows = await prisma.menuCategory.groupBy({
    by: ['restaurantId'],
    _count: { _all: true },
    where: { restaurantId: { in: restaurantIds } },
  });
  return toCountMap(rows.map((r) => ({ key: r.restaurantId, count: r._count._all })));
}
