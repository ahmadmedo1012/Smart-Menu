import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";
// round92-A1: the r91 local `TEST_FIXTURE_SLUGS` const moved to its single
// source of truth in @/lib/landing (the RSC homepage path had NO exclusion —
// prod visitors saw the fixtures there). Import-only change: the where
// clause below is byte-identical to r91's.
import { TEST_FIXTURE_SLUGS } from "@/lib/landing";

// R91 F-C (D3 §4 prod data-quality finding): production /api/public/featured
// was surfacing internal test fixtures — slugs `settings-test-ts` (مطعم
// المرسى) and `ede` (برغر هاوس) — seeded QA rows that carry showOnLanding=true
// with NO other marker in the data (the Restaurant model has no isTest field
// or settings flag; naming IS the marker). Deliberately a NARROW exclusion
// list, not a broad name/slug regex: a /test|تجريبي|demo/ pattern would also
// hide the intended public demo restaurants (al-waha-cafe, al-waha-cafe-demo,
// al-waha-cafeewewe). Proper long-term fix is deactivating/un-featuring those
// prod rows — then this list can be emptied.

// Landing page hits this on every visit — static data (ranked restaurants),
// safe to revalidate at most every 60s instead of a DB query per request.
export const revalidate = 60;

export async function GET() {
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const restaurants = await prisma.restaurant.findMany({
            where: {
                isActive: true,
                showOnLanding: true,
                slug: { notIn: [...TEST_FIXTURE_SLUGS] },
            },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                logo: true,
                city: true,
                phone: true,
                whatsapp: true,
                themeColor: true,
                _count: {
                    select: {
                        orders: {
                            where: { createdAt: { gte: since }, status: "completed" },
                        },
                    },
                },
            },
            orderBy: { featuredRank: { sort: "asc", nulls: "last" } },
            take: 20,
        });

        const data = restaurants
            .map((r) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                description: r.description,
                logo: r.logo,
                city: r.city,
                phone: r.phone,
                whatsapp: r.whatsapp,
                themeColor: r.themeColor,
                orderCount: r._count.orders,
            }))
            .sort((a, b) => b.orderCount - a.orderCount)
            .slice(0, 10);

        return success(data);
    } catch (e) {
        return handleError(e);
    }
}
