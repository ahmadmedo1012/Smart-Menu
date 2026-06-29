import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError, error } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    let restaurantId: number | undefined = Number(searchParams.get("restaurantId")) || undefined;

    if (auth.role === "owner") {
      if (!auth.restaurantId) return error("لا يوجد مطعم مرتبط", 400);
      restaurantId = auth.restaurantId;
    }
    if (!restaurantId) return error("معرف المطعم مطلوب", 400);

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Revenue last 7 days
    const revenue7d = await prisma.$queryRaw<{ date: string; revenue: number }[]>`
      SELECT DATE("createdAt") as date, COALESCE(SUM(total), 0) as revenue
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt") ORDER BY date ASC
    `;

    // Orders last 7 days
    const orders7d = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt") ORDER BY date ASC
    `;

    // Top items with growth
    const topItemsCurrent = await prisma.orderItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      where: { order: { restaurantId, createdAt: { gte: sevenDaysAgo } } },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const topItemsPrev = await prisma.orderItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      where: { order: { restaurantId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const topItemIds = topItemsCurrent.map((t) => t.itemId);
    const topItemDetails = topItemIds.length > 0
      ? await prisma.menuItem.findMany({ where: { id: { in: topItemIds } }, select: { id: true, name: true } })
      : [];
    const itemMap = new Map(topItemDetails.map((i) => [i.id, i.name]));
    const prevMap = new Map(topItemsPrev.map((t) => [t.itemId, t._sum.quantity ?? 0]));

    const topItems = topItemsCurrent.map((t) => {
      const prev = prevMap.get(t.itemId) ?? 0;
      const curr = t._sum.quantity ?? 0;
      return {
        itemId: t.itemId,
        name: itemMap.get(t.itemId) ?? "Unknown",
        totalSold: curr,
        growth: prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 100,
      };
    });

    // Hourly distribution
    const hourlyDistribution = await prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*)::int as count
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY hour ORDER BY hour ASC
    `;

    // AOV trend
    const aovTrend = await prisma.$queryRaw<{ date: string; aov: number }[]>`
      SELECT DATE("createdAt") as date, AVG(total)::decimal(10,2) as aov
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt") ORDER BY date ASC
    `;

    // Growth vs prev period
    const [currentCount, prevCount] = await Promise.all([
      prisma.order.count({ where: { restaurantId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
    ]);

    const growthPct = prevCount > 0
      ? Math.round(((currentCount - prevCount) / prevCount) * 100)
      : 0;

    return success({
      revenue7d: revenue7d.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
      orders7d: orders7d.map((r) => ({ date: r.date, count: Number(r.count) })),
      topItems,
      hourlyDistribution: hourlyDistribution.map((h) => ({ hour: h.hour, count: Number(h.count) })),
      aovTrend: aovTrend.map((a) => ({ date: a.date, aov: Number(a.aov) })),
      growthPct,
    });
  } catch (e) {
    return handleError(e);
  }
}
