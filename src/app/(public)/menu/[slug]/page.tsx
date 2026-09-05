import { notFound } from 'next/navigation';
export const revalidate = 60;
export const dynamicParams = true;
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import { getRestaurantBySlug } from '@/lib/menu-queries';
import { MenuClientSection } from '@/components/menu/MenuClientSection';
import { ReferralHandler } from '@/components/menu/ReferralHandler';

// Module-level cutoff: computed once per build/ISR revalidation,
// NOT per request — keeps the route static-friendly (revalidate=60 works).
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

// Menu slugs are resolved on demand instead of all being prerendered during
// every build. A growing restaurant list could otherwise open hundreds of DB
// queries at once and make deployment depend on a transient Neon timeout.
// The 60-second revalidation still keeps subsequent requests warm and fresh.

export async function generateMetadata({
        params,
}: {
        params: Promise<{ slug: string }>;
}): Promise<Metadata> {
        const { slug } = await params;
        const origin = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
        const restaurant = await getRestaurantBySlug(slug);
        if (!restaurant) notFound();
        const ogImage = restaurant.logo || '/og-default.png';
        return {
                title: restaurant.name,
                description: restaurant.description || `اطلع على قائمة ${restaurant.name} واطلب عبر واتساب`,
                alternates: { canonical: `/menu/${slug}` },
                openGraph: {
                        title: restaurant.name,
                        description: restaurant.description || `اطلع على قائمة ${restaurant.name} واطلب عبر واتساب`,
                        url: `${origin}/menu/${slug}`,
                        siteName: 'الربط الذكي',
                        images: [
                                {
                                        url: ogImage,
                                        ...(restaurant.logo ? { width: 512, height: 512 } : { width: 1200, height: 630 }),
                                },
                        ],
                        locale: 'ar_LY',
                        type: 'website',
                },
                twitter: {
                        // round84: wide card when the 1200×630 branded fallback is used,
                        // small square card when the restaurant has its own logo.
                        card: restaurant.logo ? 'summary' : 'summary_large_image',
                        title: restaurant.name,
                        description: restaurant.description || `اطلع على قائمة ${restaurant.name} واطلب عبر واتساب`,
                        images: [ogImage],
                },
        };
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
        const { slug } = await params;
        const origin = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';

        // Deduped with generateMetadata via React cache() — 1 DB query for both.
        const restaurant = await getRestaurantBySlug(slug);
        if (!restaurant) notFound();

        const [categories, items, popularData, featuredData] = await Promise.all([
                prisma.menuCategory.findMany({
                        where: { isActive: true, restaurantId: restaurant.id },
                        orderBy: { sortOrder: 'asc' },
                }),
                // Stage H: explicit select WITHOUT the new featured columns — the
                // deployed database may not have them yet (schema sync there is a
                // manual `prisma db push`, see README). Featured flags arrive via the
                // guarded raw query below, so a schema-lagging DB degrades to "no
                // showcase" instead of a broken menu page / failed build.
                prisma.menuItem.findMany({
                        where: { status: 'available', category: { is: { restaurantId: restaurant.id } } },
                        select: {
                                id: true, name: true, nameAr: true, description: true, descriptionAr: true,
                                price: true, discountedPrice: true, image: true, sortOrder: true,
                                categoryId: true, createdAt: true, status: true,
                                dietaryTags: true, allergens: true, avgRating: true, ratingCount: true,
                                category: {
                                        select: { id: true, name: true, nameAr: true, icon: true, sortOrder: true, isActive: true, restaurantId: true, createdAt: true, updatedAt: true },
                                },
                        },
                        orderBy: { sortOrder: 'asc' },
                }),
                prisma.orderItem.groupBy({
                        by: ['itemId'],
                        _sum: { quantity: true },
                        where: {
                                order: {
                                        restaurantId: restaurant.id,
                                        createdAt: { gte: SEVEN_DAYS_AGO },
                                        status: { not: 'cancelled' },
                                },
                        },
                        orderBy: { _sum: { quantity: 'desc' } },
                        take: 10,
                }),
                // Stage H: featured flags via guarded raw SQL — returns empty on a
                // DB that hasn't received the new columns yet (P2022/42703 → []).
                // Round83 §2.3: primary query reads showcaseTags (TEXT[]); if the
                // array column is missing (pre-round83 DB), the fallback re-queries
                // legacy columns only — the section renders with the single legacy
                // badge instead of disappearing (zero-downtime migration window).
                prisma
                        .$queryRaw<
                                Array<{
                                        id: number;
                                        isFeatured: boolean;
                                        featuredRank: number | null;
                                        showcaseTag: string | null;
                                        showcaseTags: string[] | null;
                                }>
                        >`
                                SELECT "id", "isFeatured", "featuredRank", "showcaseTag", "showcaseTags"
                                FROM "MenuItem"
                                WHERE "isFeatured" = true AND "restaurantId" = ${restaurant.id}
                        `
                        .catch(async () =>
                                prisma
                                        .$queryRaw<
                                                Array<{
                                                        id: number;
                                                        isFeatured: boolean;
                                                        featuredRank: number | null;
                                                        showcaseTag: string | null;
                                                }>
                                        >`
                                                SELECT "id", "isFeatured", "featuredRank", "showcaseTag"
                                                FROM "MenuItem"
                                                WHERE "isFeatured" = true AND "restaurantId" = ${restaurant.id}
                                        `
                                        .then(
                                                (rows) =>
                                                        rows.map((r) => ({
                                                                ...r,
                                                                showcaseTags: null as string[] | null,
                                                        }))
                                        )
                                        .catch(
                                                () =>
                                                        [] as Array<{
                                                                id: number;
                                                                isFeatured: boolean;
                                                                featuredRank: number | null;
                                                                showcaseTag: string | null;
                                                                showcaseTags: string[] | null;
                                                        }>
                                        )
                        ),
        ]);

        const popularIds = new Set(popularData.map((o) => o.itemId));
        const featuredMap = new Map(
                featuredData
                        .filter((f) => items.some((i) => i.id === f.id))
                        .map((f) => [
                                f.id,
                                {
                                        isFeatured: f.isFeatured,
                                        featuredRank: f.featuredRank,
                                        showcaseTag: f.showcaseTag,
                                        // round83: tags array (null on pre-round83 fallback →
                                        // FeaturedShowcase falls back to the legacy single tag)
                                        showcaseTags: f.showcaseTags ?? null,
                                },
                        ])
        );
        const serializedCategories = categories.map((c) => ({
                ...c,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
        }));

        const serializedItems = items.map(
                ({ price, discountedPrice, avgRating, ratingCount, category, ...rest }) => ({
                        id: rest.id,
                        name: rest.name,
                        nameAr: rest.nameAr,
                        description: rest.description,
                        descriptionAr: rest.descriptionAr,
                        image: rest.image,
                        sortOrder: rest.sortOrder,
                        categoryId: rest.categoryId,
                        createdAt: rest.createdAt.toISOString(),
                        status: rest.status,
                        dietaryTags: rest.dietaryTags,
                        allergens: rest.allergens,
                        price: Number(price),
                        discountedPrice: discountedPrice !== null ? Number(discountedPrice) : null,
                        avgRating: avgRating !== null ? Number(avgRating) : null,
                        ratingCount,
                        isPopular: popularIds.has(rest.id),
                        isNew: !popularIds.has(rest.id) && rest.createdAt.getTime() > SEVEN_DAYS_AGO.getTime(),
                        isFeatured: featuredMap.get(rest.id)?.isFeatured ?? false,
                        featuredRank: featuredMap.get(rest.id)?.featuredRank ?? null,
                        showcaseTag: featuredMap.get(rest.id)?.showcaseTag ?? null,
                        showcaseTags: featuredMap.get(rest.id)?.showcaseTags ?? null,
                        category: {
                                id: category.id,
                                name: category.name,
                                nameAr: category.nameAr,
                                icon: category.icon,
                                sortOrder: category.sortOrder,
                                isActive: category.isActive,
                                restaurantId: category.restaurantId,
                                createdAt: category.createdAt.toISOString(),
                                updatedAt: category.updatedAt.toISOString(),
                        },
                })
        );

        const jsonLd = {
                '@context': 'https://schema.org',
                '@type': 'Restaurant',
                name: restaurant.name,
                description: restaurant.description,
                url: `${origin}/menu/${slug}`,
                telephone: restaurant.phone || restaurant.whatsapp || undefined,
                servesCuisine: 'Libyan',
                hasMenu: {
                        '@type': 'Menu',
                        name: `قائمة ${restaurant.name}`,
                        hasMenuSection: categories.map((c) => ({
                                '@type': 'MenuSection',
                                name: c.name,
                                hasMenuItem: items
                                        .filter((i) => i.categoryId === c.id)
                                        .map((i) => ({
                                                '@type': 'MenuItem',
                                                name: i.name,
                                                description: i.description,
                                                offers: {
                                                        '@type': 'Offer',
                                                        price: Number(i.price),
                                                        priceCurrency: 'LYD',
                                                },
                                        })),
                        })),
                },
        };

        const hasContact = !!(
                restaurant.phone ||
                restaurant.whatsapp ||
                restaurant.email ||
                restaurant.address
        );

        return (
                // a11y(round84): the (public) layout already provides the single
                // <main id="main-content"> landmark — a second <main> here triggered
                // landmark-no-duplicate-main / landmark-main-is-top-level /
                // landmark-unique on every menu page. Visual div keeps min-h-dvh.
                <div className="relative min-h-dvh overflow-x-clip">
                        <ReferralHandler />
                        <div className="fixed inset-0 -z-10 bg-[var(--menu-glow)] pointer-events-none" />

                        <script
                                type="application/ld+json"
                                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
                        />

                        {/* Hero + Menu + Loyalty — fully client-rendered to avoid hydration mismatch */}
                        <MenuClientSection
                                restaurant={restaurant}
                                slug={slug}
                                origin={origin}
                                categories={serializedCategories}
                                serializedItems={serializedItems}
                                hasContact={hasContact}
                        />
                </div>
        );
}
