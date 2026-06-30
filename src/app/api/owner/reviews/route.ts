import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { error as _error } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuth({ requireRestaurant: true });
  if (!auth.authorized || !auth.restaurantId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const minRating = searchParams.get("minRating");

  const where: any = { menuItem: { restaurantId: auth.restaurantId } };
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
}
