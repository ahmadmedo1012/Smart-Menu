import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = Number(searchParams.get("restaurantId")) || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      totalItems,
      popularItems,
      recentOrders,
      statusCounts,
    ] = await Promise.all([
      prisma.order.count({ where: { restaurantId } }),
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: today } },
      }),
      prisma.menuItem.count(),
      prisma.orderItem.groupBy({
        by: ["itemId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
      prisma.order.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          items: {
            include: { item: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { restaurantId },
        _count: true,
      }),
    ]);

    // Resolve item names for popular items
    const itemIds = popularItems.map((p: { itemId: number }) => p.itemId);
    const items = itemIds.length > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, name: true },
        })
      : [];
    const itemMap = new Map(items.map((i: { id: number; name: string }) => [i.id, i.name]));

    const popular = popularItems.map(
      (p: { itemId: number; _sum: { quantity: number | null } }) => ({
        itemId: p.itemId,
        name: itemMap.get(p.itemId) ?? "Unknown",
        totalSold: p._sum.quantity ?? 0,
      })
    );

    const statusBreakdown: Record<string, number> = {};
    for (const s of statusCounts) {
      statusBreakdown[s.status] = s._count;
    }

    return success({
      totalOrders,
      todayOrders,
      totalItems,
      popularItems: popular,
      recentOrders,
      statusBreakdown,
    });
  } catch (e) {
    return handleError(e);
  }
}
