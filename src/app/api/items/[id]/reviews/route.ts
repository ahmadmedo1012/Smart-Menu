import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { error, handleError, success, validationError, parsePagination } from '@/lib/api-helpers';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { z } from 'zod';
import { getClientIp } from '@/lib/client-ip';
import { revalidateMenu } from '@/lib/menu-cache';

const reviewDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
// round87-A7: per-ITEM global ceiling — the per-IP limiter (5/min) is trivially
// sidestepped by rotating egress IPs, letting a competitor shift any item's
// public avgRating. 30 reviews/hour per item is orders of magnitude above any
// legitimate rate for a single menu item.
const itemReviewLimiter = createDbRateLimiter({ windowMs: 3_600_000, max: 30 });

const createReviewSchema = z.object({
        // r103-F5a: .int() — 4.5 passed min/max then hit the Prisma Int column as
        // a validation error (generic 400) instead of a clean 422 at the boundary.
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(500).default(''),
        customerName: z.string().max(50).default(''),
        customerPhone: z.string().max(30).default(''),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const { id } = await params;
                const itemId = Number(id);
                if (Number.isNaN(itemId)) {
                        return NextResponse.json({ success: false, error: 'معرف غير صالح' }, { status: 400 });
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
                // round90-F3: multi-menu aware — an owner whose PRIMARY restaurant
                // differs from the item's restaurant keeps PII via the UserRestaurant
                // link (same ownership pattern as items/[id], orders/[id], settings).
                // Previously only auth.restaurantId was compared, so the owner of a
                // second (linked) menu lost his own branch's review PII.
                let isOwner = false;
                // r93-W1a (MED-1 — بقية عائلة r92-B1): العضوية الدور وحدها كانت
                // تمنح sub_admin (ولو بأذونات صفرية) فرع isOwner فيقرأ أسماء
                // وأرقام هواتف مراجعات كل مطاعم المنصة عبر أرقام أصناف متتالية.
                // الفلسفة الآن نفس r92-B1 (orders:87 وstats-queries:70):
                //   - admin/super_admin: ثقة كاملة (نفس دلالة requirePermission).
                //   - sub_admin: يرى PII فقط بإذن VIEW_ANALYTICS (نفس بوابة
                //     restaurants/[id]:88-90) أو بربط ملكية فعلي UserRestaurant
                //     لمطعم الصنف — «المالك المرتبط يرى مطعمه فقط».
                //   - USER/مجهول: القراءة العامة بلا PII (دون تغيير — صفحة
                //     المنيو العامة تستدعي هذا المسار).
                if (auth.authorized && (auth.role === 'super_admin' || auth.role === 'admin')) {
                        isOwner = true;
                } else if (auth.authorized && auth.role === 'sub_admin') {
                        if ((auth.permissions ?? []).includes('VIEW_ANALYTICS')) {
                                isOwner = true;
                        } else {
                                // لا إذن → ملكية فعلية عبر رابط UserRestaurant فقط
                                const item = await prisma.menuItem.findUnique({
                                        where: { id: itemId },
                                        select: { category: { select: { restaurantId: true } } },
                                });
                                if (item) {
                                        const link = await prisma.userRestaurant.findUnique({
                                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: item.category.restaurantId } },
                                        });
                                        isOwner = !!link;
                                }
                        }
                } else if (auth.authorized && auth.role === 'owner') {
                        const item = await prisma.menuItem.findUnique({
                                where: { id: itemId },
                                select: { category: { select: { restaurantId: true } } },
                        });
                        if (item && item.category.restaurantId === auth.restaurantId) {
                                isOwner = true;
                        } else if (item) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: item.category.restaurantId } },
                                });
                                isOwner = !!link;
                        }
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

/**
 * r103-F5b: owner/staff moderation — the review surface was write-only for the
 * public (POST) with no way to remove spam/abusive reviews. Ownership ladder
 * mirrors the GET PII ladder exactly (r93-W1a):
 *   - super_admin/admin: full access
 *   - sub_admin: MANAGE_RESTAURANTS (destructive moderation needs more than
 *     VIEW_ANALYTICS) or a real UserRestaurant ownership link
 *   - owner: the item's restaurant is the primary restaurant or linked via
 *     UserRestaurant (multi-menu aware — round90-F3)
 * The public counters (ratingCount/avgRating) are recomputed exactly from the
 * remaining rows in the same transaction (set-based UPDATE ... FROM aggregate
 * subquery — no drift, no read-then-write race), then the ISR menu page is
 * revalidated synchronously (round92-A2 publish contract).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { id } = await params;
                const itemId = Number(id);
                if (Number.isNaN(itemId)) return error('معرف غير صالح', 400);

                const url = new URL(req.url);
                const reviewId = Number(url.searchParams.get('reviewId'));
                if (Number.isNaN(reviewId) || reviewId <= 0) return error('معرف التقييم غير صالح', 400);

                // Ownership ladder
                let allowed = false;
                if (auth.role === 'super_admin' || auth.role === 'admin') {
                        allowed = true;
                } else if (auth.role === 'sub_admin') {
                        if ((auth.permissions ?? []).includes('MANAGE_RESTAURANTS')) {
                                allowed = true;
                        } else {
                                const link = await prisma.userRestaurant.findFirst({
                                        where: {
                                                userId: auth.userId!,
                                                restaurant: { categories: { some: { items: { some: { id: itemId } } } } },
                                        },
                                });
                                allowed = !!link;
                        }
                } else if (auth.role === 'owner') {
                        const item = await prisma.menuItem.findUnique({
                                where: { id: itemId },
                                select: { category: { select: { restaurantId: true } } },
                        });
                        if (item) {
                                if (item.category.restaurantId === auth.restaurantId) {
                                        allowed = true;
                                } else {
                                        const link = await prisma.userRestaurant.findUnique({
                                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: item.category.restaurantId } },
                                        });
                                        allowed = !!link;
                                }
                        }
                }
                if (!allowed) return error('غير مصرح', 403);

                const deleted = await prisma.$transaction(async (tx) => {
                        const review = await tx.review.delete({
                                where: { id: reviewId },
                                select: { id: true, menuItemId: true, rating: true },
                        }).catch(() => null);
                        // P2025 (not found) OR a review belonging to another item →
                        // both mean the id is invalid for THIS item's scope.
                        if (!review || review.menuItemId !== itemId) return null;
                        // Exact recompute from remaining rows — mirrors the POST's
                        // incremental formula (round-76) but cannot drift.
                        await tx.$executeRaw`
                                UPDATE "MenuItem" m SET
                                        "ratingCount" = s.c,
                                        "avgRating" = s.a
                                FROM (
                                        SELECT COUNT(*)::int AS c, ROUND(AVG(rating), 1) AS a
                                        FROM "Review" WHERE "menuItemId" = ${itemId}
                                ) s
                                WHERE m.id = ${itemId}`;
                        return review;
                });
                if (!deleted) return error('التقييم غير موجود', 404);

                const itemForReval = await prisma.menuItem.findUnique({
                        where: { id: itemId },
                        select: { category: { select: { restaurantId: true } } },
                });
                await revalidateMenu(itemForReval?.category.restaurantId);

                return success({ deleted: true });
        } catch (e) {
                return handleError(e);
        }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                // Rate limit by IP
                const ip = getClientIp(req); // round91-D1: unified extraction
                const limit = await reviewDbLimiter.check(ip);
                if (!limit.success) {
                        return error('لقد تجاوزت الحد الأقصى من التقييمات. حاول مرة أخرى لاحقاً', 429);
                }

                const { id } = await params;
                const itemId = Number(id);
                if (Number.isNaN(itemId)) {
                        return error('معرف غير صالح', 400);
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

                // Incremental avg update (round-76 data agent): avoid re-aggregating
                // O(reviews) rows per POST — single atomic update from stored counters.
                // round90-F3 (T4 lost-update): the old read-then-write block computed
                // ABSOLUTE values (findUnique → count+1 → update) inside $transaction —
                // under READ COMMITTED two concurrent reviews both read the same
                // snapshot and both wrote ratingCount = N+1 (one update lost, avg
                // skewed). One set-based SQL statement reads and writes the row in a
                // single atomic step: SET expressions reference the OLD column values,
                // so every concurrent executor is serialized on the row lock and each
                // increment lands. The formula mirrors the previous app math exactly:
                //   new_avg = (COALESCE(old_avg,0) * old_count + rating) / (old_count + 1)
                // (old_count is 0 when avgRating IS NULL → the first review stores the
                // rating verbatim), rounded to 1 decimal like Math.round(avg*10)/10.
                // The review row + counters now share one transaction: a counter
                // failure rolls the review back instead of leaving it uncounted.
                const review = await prisma.$transaction(async (tx) => {
                        const created = await tx.review.create({
                                data: { rating, comment, customerName, customerPhone, menuItemId: itemId },
                        });
                        await tx.$executeRaw`
                                UPDATE "MenuItem" SET
                                        "ratingCount" = "ratingCount" + 1,
                                        "avgRating" = ROUND((COALESCE("avgRating", 0) * "ratingCount" + ${rating}) / ("ratingCount" + 1) * 10) / 10
                                WHERE id = ${itemId}`;
                        return created;
                });

                // round92-A2 companion: avgRating/ratingCount are SERVER-RENDERED on
                // the ISR-cached /menu/[slug] page — without this purge a fresh
                // review leaves the public rating badge stale for up to 60s.
                // Awaited (synchronous publish contract — see menu-cache.ts).
                const itemForReval = await prisma.menuItem.findUnique({
                        where: { id: itemId },
                        select: { category: { select: { restaurantId: true } } },
                });
                await revalidateMenu(itemForReval?.category.restaurantId);

                return success(review, 201);
        } catch (e) {
                return handleError(e);
        }
}
