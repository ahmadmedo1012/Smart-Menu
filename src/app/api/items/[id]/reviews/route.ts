import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { error, handleError } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const itemId = Number(id);
  if (Number.isNaN(itemId)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const minRating = searchParams.get("minRating");

  const where: any = { menuItemId: itemId };
  if (minRating) {
    const min = Number(minRating);
    if (!Number.isNaN(min) && min >= 1 && min <= 5) {
      where.rating = { gte: min };
    }
  }

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));

  const [reviews, stats] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, rating: true, comment: true, customerName: true, customerPhone: true, menuItemId: true, createdAt: true },
    }),
    prisma.review.aggregate({
      where: { menuItemId: itemId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: reviews,
    stats: {
      avgRating: stats._avg.rating,
      totalCount: stats._count,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const itemId = Number(id);
    if (Number.isNaN(itemId)) {
      return error("Invalid ID", 400);
    }

    const body = await req.json();
    const { rating, comment, customerName, customerPhone } = body;

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return error("التقييم يجب أن يكون بين 1 و 5", 400);
    }

    const item = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) {
      return error("الصنف غير موجود", 404);
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment ?? "",
        customerName: customerName ?? "",
        customerPhone: customerPhone ?? "",
        menuItemId: itemId,
      },
    });

    // Recalculate avg rating and count
    const agg = await prisma.review.aggregate({
      where: { menuItemId: itemId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        avgRating: agg._avg.rating,
        ratingCount: agg._count,
      },
    });

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
