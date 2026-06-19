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
      prisma.order.count({ where: { restaurantId, createdAt: { gte: today } } }),
      prisma.menuItem.count({ where: { category: { restaurantId } } }),
      prisma.orderItem.groupBy({
        by: ["itemId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
        where: { order: { restaurantId } },
      }),
      prisma.order.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: { include: { item: { select: { id: true, name: true } } } } },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { restaurantId },
        _count: true,
      }),
    ]);

    const itemIds = popularItems.map((p) => p.itemId);
    const items = itemIds.length > 0
      ? await prisma.menuItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true } })
      : [];
    const itemMap = new Map(items.map((i) => [i.id, i.name]));

    const popular = popularItems.map((p) => ({
      itemId: p.itemId,
      name: itemMap.get(p.itemId) ?? "Unknown",
      totalSold: p._sum.quantity ?? 0,
    }));

    const statusBreakdown: Record<string, number> = {};
    for (const s of statusCounts) statusBreakdown[s.status] = s._count;

    return success({ totalOrders, todayOrders, totalItems, popularItems: popular, recentOrders, statusBreakdown });
  } catch (e) {
    return handleError(e);
  }
}
