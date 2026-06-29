import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      plans,
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
        select: { id: true, name: true, price: true, restaurants: { select: { id: true } } },
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
      prisma.order.aggregate({
        where: { createdAt: { gte: today } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.systemEvent.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.restaurant.count({ where: { planId: { not: null } } }),
    ]);

    // Revenue trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueTrend = await prisma.$queryRaw<{ date: string; revenue: number }[]>`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(total), 0) as revenue
      FROM "Order"
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Order volume trend (last 30 days)
    const orderVolumeTrend = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "Order"
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Top items across all restaurants
    const topItems = await prisma.orderItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 15,
    });

    const topItemIds = topItems.map((t) => t.itemId);
    const topItemDetails = topItemIds.length > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: topItemIds } },
          select: { id: true, name: true, nameAr: true },
        })
      : [];
    const topItemMap = new Map(topItemDetails.map((i) => [i.id, i.nameAr || i.name]));

    const topItemsFormatted = topItems.map((t) => ({
      itemId: t.itemId,
      name: topItemMap.get(t.itemId) ?? "Unknown",
      totalSold: t._sum.quantity ?? 0,
    }));

    // Growth rates (MoM)
    const thirtyDaysBefore = new Date();
    thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 60);

    const [currentMonthUsers, prevMonthUsers] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
      }),
    ]);

    const [currentMonthRestaurants, prevMonthRestaurants] = await Promise.all([
      prisma.restaurant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.restaurant.count({
        where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
      }),
    ]);

    // AOV
    const aovData = await prisma.order.aggregate({
      _avg: { total: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const aovPrevData = await prisma.order.aggregate({
      _avg: { total: true },
      where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
    });

    const userGrowthPct = prevMonthUsers > 0
      ? Math.round(((currentMonthUsers - prevMonthUsers) / prevMonthUsers) * 100)
      : 0;

    const restaurantGrowthPct = prevMonthRestaurants > 0
      ? Math.round(((currentMonthRestaurants - prevMonthRestaurants) / prevMonthRestaurants) * 100)
      : 0;

    const noPlanCount = totalRestaurants - linkedRestaurants;
    const restaurantsOnFreePlans = plans
      .filter((p) => Number(p.price) === 0)
      .reduce((sum, p) => sum + p.restaurants.length, 0);
    const freePlanCount = noPlanCount + restaurantsOnFreePlans;
    const paidPlans = plans.filter((p) => Number(p.price) > 0);
    const monthlyRevenue = paidPlans.reduce(
      (sum, p) => sum + Number(p.price) * p.restaurants.length,
      0
    );

    return success({
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
      ordersToday: { count: ordersToday._count, revenue: ordersToday._sum.total ?? 0 },
      systemEvents,
      onlineCount: 0,
      linkedRestaurants,
      revenueTrend: revenueTrend.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
      orderVolumeTrend: orderVolumeTrend.map((r) => ({ date: r.date, count: Number(r.count) })),
      topItems: topItemsFormatted,
      userGrowthPct,
      restaurantGrowthPct,
      avgOrderValue: Number(aovData._avg.total ?? 0),
      avgOrderValuePrev: Number(aovPrevData._avg.total ?? 0),
    });
  } catch (e) {
    return handleError(e);
  }
}
