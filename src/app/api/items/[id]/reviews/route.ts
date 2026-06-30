import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { error, handleError } from "@/lib/api-helpers";
import { createRateLimiter } from "@/lib/rate-limit";

const reviewLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

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

  const auth = await requireAuth().catch(() => ({ authorized: false as const }));
  const isOwner = auth.authorized && (auth.role === "admin" || auth.role === "owner");

  const [reviews, stats] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, rating: true, comment: true, menuItemId: true, createdAt: true, ...(isOwner ? { customerName: true, customerPhone: true } : {}) },
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
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const limit = reviewLimiter.check(ip);
    if (!limit.success) {
      return error("لقد تجاوزت الحد الأقصى من التقييمات. حاول مرة أخرى لاحقاً", 429);
    }

    const { id } = await params;
    const itemId = Number(id);
    if (Number.isNaN(itemId)) {
      return error("Invalid ID", 400);
    }

    const body = await req.json();
    const { comment: rawComment, customerName: rawName, customerPhone: rawPhone } = body;
    const rating = body.rating;

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return error("التقييم يجب أن يكون بين 1 و 5", 400);
    }

    // Validate string lengths
    const comment = typeof rawComment === "string" ? rawComment.slice(0, 500) : "";
    const customerName = typeof rawName === "string" ? rawName.slice(0, 50) : "";
    const customerPhone = typeof rawPhone === "string" ? rawPhone.slice(0, 30) : "";

    const item = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) {
      return error("الصنف غير موجود", 404);
    }

    const review = await prisma.review.create({
      data: { rating, comment, customerName, customerPhone, menuItemId: itemId },
    });

    // Recalculate avg rating and count atomically in a transaction
    await prisma.$transaction(async (tx) => {
      const agg = await tx.review.aggregate({
        where: { menuItemId: itemId },
        _avg: { rating: true },
        _count: true,
      });
      await tx.menuItem.update({
        where: { id: itemId },
        data: {
          avgRating: agg._avg.rating,
          ratingCount: agg._count,
        },
      });
    });

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
