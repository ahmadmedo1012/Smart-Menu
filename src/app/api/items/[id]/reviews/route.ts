import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

  const [reviews, stats] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
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
