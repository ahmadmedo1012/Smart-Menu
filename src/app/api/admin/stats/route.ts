import { unstable_cache } from 'next/cache';
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { popularItemsQuery, hydratePopularItems, revenueAggregate } from "@/lib/stats-queries";

// round89-C1 (dx-2 د): every query below is PLATFORM-WIDE (no session/
// restaurant/tenant filter — verified query-by-query), so the payload is
// byte-identical for every admin. The admin dashboard polls this route every
// 30s per open tab (admin/page.tsx), which re-ran ~21 aggregate queries each
// time (24 statements incl. auth). The whole data fetch is now wrapped in
// unstable_cache (Next 16 Data Cache — see node_modules/next/dist/docs/01-app/
// 02-guides/caching-without-cache-components.md) with a 60s ceiling + an
// `admin-stats` tag for future invalidation. IMPORTANT: requirePermission
// (session-derived) stays OUTSIDE the cache scope — an unauthorized caller
// never populates or reads the shared cache, and the 401/403 responses are
// never cached. Invalidation: producers (restaurant create/delete, payment
// verify/cancel, user signup) live in files outside this agent's scope — the
// 60s TTL bounds staleness; revalidateTag('admin-stats') is the hook for a
// future round.
const getAdminStatsData = unstable_cache(
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      plans,
      // round89-C4 (dx-2 ب-3): the plans query used to embed a full restaurant
      // row per plan (`restaurants: { select: { id: true } }`) only to count
      // `p.restaurants.length` — loading every restaurant on the platform into
      // memory per request. One grouped count per planId returns the same
      // numbers with a handful of rows.
      planRestaurantCounts,
      recentSignups,
      recentLogins,
      ordersToday,
      systemEvents,
      linkedRestaurants,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.order.count(),
      prisma.subscriptionPlan.findMany({
        select: { id: true, price: true },
      }),
      prisma.restaurant.groupBy({
        by: ['planId'],
        _count: { _all: true },
      }),
      prisma.restaurant.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          users: { take: 1, select: { id: true, name: true, username: true } },
        },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { lastLoginAt: "desc" },
        where: { lastLoginAt: { not: null } },
        select: {
          id: true,
          name: true,
          username: true,
          lastLoginAt: true,
          restaurant: { select: { id: true, name: true } },
        },
      }),
      prisma.order.aggregate(revenueAggregate({ since: today, withCount: true })),
      prisma.systemEvent.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { id: true, eventType: true, title: true, message: true, severity: true, createdAt: true, read: true },
      }),
      prisma.restaurant.count({ where: { planId: { not: null } } }),
    ]);

    // wave-2 hydrations (top-restaurant details, top-item names) and the
    // computed fields below run inside the cached function so a cache hit
    // skips them too.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysBefore = new Date();
    thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 60);
    // round86-B9: bound the window to 90 days — an unbounded full-table
    // groupBy re-ran on the admin dashboard's 30s poll and grew forever
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [
      topRestaurants,
      revenueTrend,
      orderVolumeTrend,
      topItems,
      currentMonthUsers,
      prevMonthUsers,
      currentMonthRestaurants,
      prevMonthRestaurants,
      aovData,
      aovPrevData,
    ] = await Promise.all([
      // Top 10 restaurants by order count
      prisma.order.groupBy({
        by: ["restaurantId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // Revenue trend (last 30 days)
      prisma.$queryRaw<{ date: string; revenue: number }[]>`
        SELECT
          DATE("createdAt") as date,
          COALESCE(SUM(total), 0) as revenue
        FROM "Order"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Order volume trend (last 30 days)
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT
          DATE("createdAt") as date,
          COUNT(*) as count
        FROM "Order"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Top items across all restaurants (90-day window)
      prisma.orderItem.groupBy(
        popularItemsQuery({ take: 15, since: ninetyDaysAgo })
      ),
      // Growth rates (MoM)
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
      }),
      prisma.restaurant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.restaurant.count({
        where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
      }),
      // AOV
      prisma.order.aggregate({
        _avg: { total: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.order.aggregate({
        _avg: { total: true },
        where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
      }),
    ]);

    // Wave 2 — hydrations that depend on wave-1 results
    const [topRestDetails, topItemsFormatted] = await Promise.all([
      (async () => {
        const topRestIds = topRestaurants.map(t => t.restaurantId);
        return topRestIds.length > 0
          ? prisma.restaurant.findMany({ where: { id: { in: topRestIds } }, select: { id: true, name: true, isActive: true, slug: true } })
          : [];
      })(),
      hydratePopularItems(topItems, "nameAr-fallback"),
    ]);
    const topRestMap = new Map(topRestDetails.map(r => [r.id, r]));
    const topRestaurantsFormatted = topRestaurants.map(t => ({
      restaurant: topRestMap.get(t.restaurantId) || null,
      orderCount: t._count.id,
    }));

    const userGrowthPct = prevMonthUsers > 0
      ? Math.round(((currentMonthUsers - prevMonthUsers) / prevMonthUsers) * 100)
      : 0;

    const restaurantGrowthPct = prevMonthRestaurants > 0
      ? Math.round(((currentMonthRestaurants - prevMonthRestaurants) / prevMonthRestaurants) * 100)
      : 0;

    const noPlanCount = totalRestaurants - linkedRestaurants;
    const countByPlanId = new Map<number, number>(
      planRestaurantCounts.map((g): [number, number] => [g.planId ?? -1, g._count._all])
    );
    const restaurantsOnFreePlans = plans
      .filter((p) => Number(p.price) === 0)
      .reduce((sum, p) => sum + (countByPlanId.get(p.id) ?? 0), 0);
    const freePlanCount = noPlanCount + restaurantsOnFreePlans;
    const monthlyRevenue = plans
      .filter((p) => Number(p.price) > 0)
      .reduce((sum, p) => sum + Number(p.price) * (countByPlanId.get(p.id) ?? 0), 0);

    return {
      totalUsers,
      totalRestaurants,
      totalOrders,
      freePlanCount,
      paidPlanCount: linkedRestaurants - restaurantsOnFreePlans,
      monthlyRevenue,
      recentSignups: recentSignups.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        createdAt: r.createdAt,
        owner: r.users[0] ?? null,
      })),
      recentLogins: recentLogins.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        lastLoginAt: u.lastLoginAt,
        restaurant: u.restaurant,
      })),
      ordersToday: { count: ordersToday._count ?? 0, revenue: ordersToday._sum?.total ?? 0 },
      systemEvents,
      topRestaurants: topRestaurantsFormatted,
      linkedRestaurants,
      revenueTrend: revenueTrend.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
      orderVolumeTrend: orderVolumeTrend.map((r) => ({ date: r.date, count: Number(r.count) })),
      topItems: topItemsFormatted,
      userGrowthPct,
      restaurantGrowthPct,
      avgOrderValue: Number(aovData._avg.total ?? 0),
      avgOrderValuePrev: Number(aovPrevData._avg.total ?? 0),
    };
  },
  ['admin-stats'],
  { revalidate: 60, tags: ['admin-stats'] }
);

export async function GET() {
  try {
    const auth = await requirePermission("VIEW_ANALYTICS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const data = await getAdminStatsData();
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}
