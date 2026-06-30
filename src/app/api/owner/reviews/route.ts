import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const minRating = searchParams.get("minRating");

  const where: any = {};
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
