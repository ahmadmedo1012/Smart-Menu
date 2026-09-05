import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { error, handleError, success, validationError, parsePagination } from '@/lib/api-helpers';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { z } from 'zod';

const reviewDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
// round87-A7: per-ITEM global ceiling — the per-IP limiter (5/min) is trivially
// sidestepped by rotating egress IPs, letting a competitor shift any item's
// public avgRating. 30 reviews/hour per item is orders of magnitude above any
// legitimate rate for a single menu item.
const itemReviewLimiter = createDbRateLimiter({ windowMs: 3_600_000, max: 30 });

const createReviewSchema = z.object({
        rating: z.number().min(1).max(5),
        comment: z.string().max(500).default(''),
        customerName: z.string().max(50).default(''),
        customerPhone: z.string().max(30).default(''),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const { id } = await params;
                const itemId = Number(id);
                if (Number.isNaN(itemId)) {
                        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
                }

                const url = new URL(req.url);
                const { searchParams } = url;
                const minRating = searchParams.get('minRating');

                // round85-C8: structurally typed where (ReviewWhereInput-compatible)
                const where: { menuItemId: number; rating?: { gte: number } } = { menuItemId: itemId };
                if (minRating) {
                        const min = Number(minRating);
                        if (!Number.isNaN(min) && min >= 1 && min <= 5) {
                                where.rating = { gte: min };
                        }
                }

                const { page, pageSize } = parsePagination(url);

                const auth = await requireAuth().catch(() => ({ authorized: false as const }));
                // PII leak guard (round-77): an 'owner' must not read customer
                // name/phone of ANOTHER restaurant's items — only role+ownership.
                let isOwner = false;
                if (auth.authorized && ['super_admin', 'sub_admin', 'admin'].includes(auth.role ?? '')) {
                        isOwner = true;
                } else if (auth.authorized && auth.role === 'owner') {
                        const item = await prisma.menuItem.findUnique({
                                where: { id: itemId },
                                select: { category: { select: { restaurantId: true } } },
                        });
                        isOwner = !!item && item.category.restaurantId === auth.restaurantId;
                }

                const [reviews, stats] = await Promise.all([
                        prisma.review.findMany({
                                where,
                                orderBy: { createdAt: 'desc' },
                                skip: (page - 1) * pageSize,
                                take: pageSize,
                                select: {
                                        id: true,
                                        rating: true,
                                        comment: true,
                                        menuItemId: true,
                                        createdAt: true,
                                        ...(isOwner ? { customerName: true, customerPhone: true } : {}),
                                },
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
                                avgRating: stats._avg.rating ?? null,
                                totalCount: stats._count,
                        },
                        meta: { total: stats._count, page, pageSize, totalPages: Math.ceil(stats._count / pageSize) },
                });
        } catch (e) {
                return handleError(e);
        }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                // Rate limit by IP
                const ip =
                        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        req.headers.get('x-real-ip') ||
                        'unknown';
                const limit = await reviewDbLimiter.check(ip);
                if (!limit.success) {
                        return error('لقد تجاوزت الحد الأقصى من التقييمات. حاول مرة أخرى لاحقاً', 429);
                }

                const { id } = await params;
                const itemId = Number(id);
                if (Number.isNaN(itemId)) {
                        return error('Invalid ID', 400);
                }

                const body = await req.json();
                const parsed = createReviewSchema.safeParse(body);
                if (!parsed.success) {
                        return validationError(parsed.error);
                }
                const { rating, comment, customerName, customerPhone } = parsed.data;

                const item = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { id: true } });
                if (!item) {
                        return error('الصنف غير موجود', 404);
                }

                // round87-A7: item-scoped ceiling (see comment above)
                const itemLimit = await itemReviewLimiter.check(`item-review:${itemId}`);
                if (!itemLimit.success) {
                        return error('عدد كبير من التقييمات على هذا الصنف مؤخراً. حاول مرة أخرى لاحقاً', 429);
                }

                const review = await prisma.review.create({
                        data: { rating, comment, customerName, customerPhone, menuItemId: itemId },
                });

                // Incremental avg update (round-76 data agent): avoid re-aggregating
                // O(reviews) rows per POST — single atomic update from stored counters.
                await prisma.$transaction(async (tx) => {
                        const item = await tx.menuItem.findUnique({ where: { id: itemId }, select: { avgRating: true, ratingCount: true } });
                        const count = (item?.ratingCount ?? 0) + 1;
                        const avg = item?.avgRating ? (Number(item.avgRating) * (count - 1) + rating) / count : rating;
                        await tx.menuItem.update({
                                where: { id: itemId },
                                data: { avgRating: Math.round(avg * 10) / 10, ratingCount: count },
                        });
                });

                return success(review, 201);
        } catch (e) {
                return handleError(e);
        }
}
