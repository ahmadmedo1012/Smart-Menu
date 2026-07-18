import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { error as logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ requireRestaurant: true });
    if (!auth.authorized || !auth.restaurantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const minRating = searchParams.get("minRating");

    const where: any = {};
    // Get all item IDs for this restaurant (relation doesn't allow nested restaurantId)
    const itemIds = await prisma.menuItem.findMany({
      where: { category: { restaurantId: auth.restaurantId } },
      select: { id: true },
    });
    where.menuItemId = { in: itemIds.map(i => i.id) };
    if (minRating) {
      const min = Number(minRating);
      if (!Number.isNaN(min) && min >= 1 && min <= 5) {
        where.rating = { gte: min };
      }
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        select: { id: true, rating: true, comment: true, customerName: true, customerPhone: true, menuItemId: true, createdAt: true, menuItem: { select: { id: true, name: true, nameAr: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: reviews, total, page, pageSize });
  } catch (e) {
    logError("[reviews] error", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
