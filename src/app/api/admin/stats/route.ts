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
    });
  } catch (e) {
    return handleError(e);
  }
}
