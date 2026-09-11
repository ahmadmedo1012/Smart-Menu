import { prisma, withRetry } from '@/lib/db';
import { success, error as apiError, handleError } from '@/lib/api-helpers';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

// mobile-menu (r100): a PUBLIC, unauthenticated read endpoint backing the
// React Native menu screen. The web /menu/[slug] page reads the same tables
// server-side via Prisma; the mobile app cannot — so it consumes this JSON.
// Mirrors the r93-N7 posture of the restaurants/[id] GET: cheap public DB
// queries must sit behind a per-IP rate limit even before any 404/401 is
// computed, otherwise anonymous traffic can drive unbounded query load.
// 60/min/IP is the same ceiling as the restaurant GET family (a single
// mobile menu visit makes exactly ONE call here).
const publicMenuLimiter = createDbRateLimiter({ windowMs: 60_000, max: 60 });

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        // Rate-limit BEFORE any DB work — even the 404 path pays the budget
        // (an anonymous scanner probing slugs must not generate free queries).
        const ip = getClientIp(request);
        const { success: allowed } = await publicMenuLimiter.check(`public-menu:${ip}`);
        if (!allowed) return apiError('طلبات كثيرة جدًا، حاول بعد 60 ثانية', 429);

        const { slug } = await params;
        // Slug format guard — mirrors the admin slugField regex; a slug that can
        // never exist fails cheap at the regex, not at the DB unique index.
        if (!/^[a-z0-9-]{1,100}$/.test(slug)) return apiError('رابط غير صالح', 400);

        // Dedicated lookup (NOT the shared getRestaurantBySlug): that projection
        // is a locked contract (tests/unit/menu-queries.test.ts forbids
        // themeColor/currency in the web RSC payload); the mobile menu screen
        // needs those two, so this route owns its own select. Same resilience
        // (withRetry — Neon transient errors) and the same isActive gate (an
        // inactive restaurant serves no public menu anywhere).
        const restaurant = await withRetry(() =>
                prisma.restaurant.findUnique({
                        where: { slug, isActive: true },
                        select: {
                                id: true,
                                name: true,
                                slug: true,
                                description: true,
                                logo: true,
                                phone: true,
                                whatsapp: true,
                                email: true,
                                address: true,
                                workingHours: true,
                                themeColor: true,
                                currency: true,
                        },
                })
        );
        if (!restaurant) return apiError('المطعم غير موجود', 404);

        // Same visibility rules as the web page render (isActive / available),
        // so mobile customers never see what the web menu would hide.
        const [categories, items] = await Promise.all([
            prisma.menuCategory.findMany({
                where: { isActive: true, restaurantId: restaurant.id },
                orderBy: { sortOrder: 'asc' },
                select: { id: true, name: true, nameAr: true, sortOrder: true, isActive: true },
            }),
            prisma.menuItem.findMany({
                where: { status: 'available', category: { is: { restaurantId: restaurant.id } } },
                orderBy: { sortOrder: 'asc' },
                select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    description: true,
                    descriptionAr: true,
                    price: true,
                    discountedPrice: true,
                    image: true,
                    isFeatured: true,
                    categoryId: true,
                    dietaryTags: true,
                    allergens: true,
                    avgRating: true,
                    ratingCount: true,
                },
            }),
        ]);

        // Prisma Decimal serializes as a JSON string — the mobile client types
        // these as numbers, so coerce explicitly (same reason the web serializer
        // formats prices before crossing the RSC boundary).
        return success({
            restaurant: {
                id: restaurant.id,
                name: restaurant.name,
                slug: restaurant.slug,
                description: restaurant.description,
                logo: restaurant.logo,
                phone: restaurant.phone,
                whatsapp: restaurant.whatsapp,
                email: restaurant.email,
                address: restaurant.address,
                workingHours: restaurant.workingHours,
                themeColor: restaurant.themeColor,
                currency: restaurant.currency,
            },
            categories,
            items: items.map((i) => ({
                ...i,
                price: Number(i.price),
                discountedPrice: i.discountedPrice == null ? null : Number(i.discountedPrice),
                avgRating: i.avgRating == null ? null : Number(i.avgRating),
            })),
        });
    } catch (e) {
        return handleError(e);
    }
}
