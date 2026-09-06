import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || 'https://smart-link.ly';

// Slug patterns of test/debug restaurants that must never be indexed
const TEST_SLUG_RE =
        /(^|-)(test|admin-test|demo|debug|bug|dev|cafe-t|restaurant-\d|178\d{10,}|^s?asas|^qq+|^-+|^sjj|^ede|^nigga|^sex)/i;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
        // round89-C3 (dx-2 ب-2): item counts per restaurant. The old shape
        // (`categories: { select: { _count: { select: { items: true } } } }`)
        // compiled into a FULL-TABLE aggregate LEFT JOIN of MenuItem plus every
        // category row materialized — just to SUM the per-category counts.
        // One grouped join returns the same per-restaurant totals directly.
        // (MenuItem belongs to a category, not the restaurant — counts must
        // route through MenuCategory.)
        const [restaurants, itemCounts] = await Promise.all([
                prisma.restaurant.findMany({
                        where: { isActive: true },
                        select: { id: true, slug: true, updatedAt: true },
                }),
                prisma.$queryRaw<{ restaurantId: number; items: bigint }[]>`
                        SELECT c."restaurantId" AS "restaurantId", COUNT(mi."id") AS "items"
                        FROM "MenuCategory" c
                        JOIN "MenuItem" mi ON mi."categoryId" = c."id"
                        GROUP BY c."restaurantId"
                `,
        ]);
        const itemsByRestaurant = new Map<number, number>(
                itemCounts.map((r) => [r.restaurantId, Number(r.items)])
        );

        const menuPages: MetadataRoute.Sitemap = restaurants
                .filter(
                        (r) =>
                                (itemsByRestaurant.get(r.id) ?? 0) > 0 && !TEST_SLUG_RE.test(r.slug)
                )
                .map((r) => ({
                        url: `${BASE_URL}/menu/${r.slug}`,
                        lastModified: r.updatedAt,
                        changeFrequency: 'daily',
                        priority: 0.8,
                }));

        return [
                { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
                {
                        url: `${BASE_URL}/pricing`,
                        lastModified: new Date(),
                        changeFrequency: 'monthly',
                        priority: 0.8,
                },
                {
                        url: `${BASE_URL}/terms`,
                        lastModified: new Date(),
                        changeFrequency: 'monthly',
                        priority: 0.4,
                },
                {
                        url: `${BASE_URL}/privacy`,
                        lastModified: new Date(),
                        changeFrequency: 'monthly',
                        priority: 0.4,
                },
                ...menuPages,
];
}
