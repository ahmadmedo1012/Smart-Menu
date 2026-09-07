import { notFound } from 'next/navigation';
export const revalidate = 60;
export const dynamicParams = true;

// round92-A2: ISR was silently dead in production. The App Router contract
// (next 16 docs, generate-static-params.md): a dynamic segment WITHOUT a
// generateStaticParams export is rendered dynamically on EVERY request —
// `revalidate`/`dynamicParams` exports are ignored for it. Live proof
// (r92 1-a audit): 9 requests on 3 menu slugs → x-vercel-cache: MISS ×9,
// age:0, cache-control private,no-cache,no-store — while / and /pricing
// (prerendered) answer in 0.09s vs the menu's 0.42s SSR + 5 Prisma queries
// per QR scan. The historical comment below ("resolved on demand … the
// 60-second revalidation still keeps subsequent requests warm") described
// this exact intent but removing generateStaticParams entirely also removed
// the ISR path. Returning [] is the documented "all paths at runtime" form:
// ZERO DB queries at build (the original Neon-timeout concern stays solved
// — an empty array reads nothing), every slug is generated on first visit
// and cached with the 60s revalidation. dynamicParams=true (above) keeps
// unknown slugs generatable on demand; notFound() keeps real 404s for bots.
export async function generateStaticParams() {
        return [];
}
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import { getRestaurantBySlug } from '@/lib/menu-queries';
import { MenuHero } from '@/components/menu/MenuHero';
import { MenuClientSection } from '@/components/menu/MenuClientSection';
import { ReferralHandler } from '@/components/menu/ReferralHandler';

// round86-B12: computed INSIDE the page function — a module-level constant
// is frozen at process start, so a long-lived lambda would silently widen
// the "new this week" window by days. Per-render it is ISR-correct (each
// revalidation re-runs the function and bakes a fresh cutoff).
function sevenDaysAgo() {
        return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

// Menu slugs are resolved on demand instead of all being prerendered during
// every build — generateStaticParams above returns [] (round92-A2), so a
// growing restaurant list never opens hundreds of DB queries at build time
// and deployment never depends on a transient Neon timeout. On-demand ISR
// (round92-A2): the first visit per slug renders and caches the page, and
// the 60-second revalidation keeps subsequent requests warm and fresh.

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
        // round88-E9: describe the card for screen readers / previews that
        // render alt text — the logo is a square avatar, the fallback is the
        // branded 1200×630 card. (Dynamic per-restaurant card rendering was
        // evaluated and deferred — see the 88-E worklog entry.)
        const ogAlt = restaurant.logo
                ? `شعار ${restaurant.name}`
                : `بطاقة معاينة لقائمة ${restaurant.name} — الربط الذكي`;
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
                                        alt: ogAlt,
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

// round90-F4 (advisory S2, gstack simplification): the triple fallback
// chain (showcaseTags → round79 base columns → []) guarded a migration
// window that has closed — migration 18 DROPPED the legacy single showcaseTag
// column and migration 19 is applied in production (131 live checks in
// r89-closure; the local DB is at 19/19), so a missing-column P2022 is no
// longer reachable. ONE query now, still failure-TOLERANT: a transient DB
// error degrades the showcase away (.catch → []) instead of breaking the
// menu page. r86-B2 scoping stays (category join — MenuItem has NO
// restaurantId column in schema.prisma).
async function fetchShowcaseFlags(restaurantId: number) {
        return prisma
                .$queryRaw<
                        Array<{
                                id: number;
                                isFeatured: boolean;
                                featuredRank: number | null;
                                showcaseTags: string[] | null;
                        }>
                >`
                        SELECT "id", "isFeatured", "featuredRank", "showcaseTags"
                        FROM "MenuItem"
                        WHERE "isFeatured" = true
                          AND "categoryId" IN (
                                SELECT "id" FROM "MenuCategory" WHERE "restaurantId" = ${restaurantId}
                          )
                `
                .catch(
                        () =>
                                [] as Array<{
                                        id: number;
                                        isFeatured: boolean;
                                        featuredRank: number | null;
                                        showcaseTags: string[] | null;
                                }>
                );
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
        const { slug } = await params;
        const origin = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
        const SEVEN_DAYS_AGO = sevenDaysAgo();

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
                                // round86-B7: no per-item category embed (categories are sent
                                // once and joined by categoryId client-side), no status (the
                                // query filters to 'available' anyway) — ~15-25% smaller flight
                                id: true, name: true, nameAr: true, description: true, descriptionAr: true,
                                price: true, discountedPrice: true, image: true, sortOrder: true,
                                categoryId: true, createdAt: true,
                                dietaryTags: true, allergens: true, avgRating: true, ratingCount: true,
                                // w3-f1 (F1-2): modifier groups — ONE hierarchical select, no
                                // per-item round-trips (no N+1). Only AVAILABLE options cross
                                // the wire; the serializer below drops groups left empty by
                                // that filter, so a group whose options were all switched off
                                // disappears from the customer menu entirely.
                                modifierGroups: {
                                        orderBy: { sortOrder: 'asc' },
                                        select: {
                                                id: true, nameAr: true, name: true,
                                                minSelect: true, maxSelect: true, required: true,
                                                options: {
                                                        where: { isAvailable: true },
                                                        orderBy: { sortOrder: 'asc' },
                                                        select: { id: true, nameAr: true, name: true, priceDelta: true },
                                                },
                                        },
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
                // transient DB error (see fetchShowcaseFlags above).
                fetchShowcaseFlags(restaurant.id),
        ]);

        const popularIds = new Set(popularData.map((o) => o.itemId));
        // round90-F4 (performance P4): O(1) membership — the filter used
        // items.some() per featured row (O(F×I) on the hottest public page).
        const itemIds = new Set(items.map((i) => i.id));
        const featuredMap = new Map(
                featuredData
                        .filter((f) => itemIds.has(f.id))
                        .map((f) => [
                                f.id,
                                {
                                        isFeatured: f.isFeatured,
                                        featuredRank: f.featuredRank,
                                        // round83: tags array (null on the pre-round83 fallback →
                                        // FeaturedShowcase renders the scene without badges)
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
                ({ price, discountedPrice, avgRating, ratingCount, createdAt, ...rest }) => ({
                        id: rest.id,
                        name: rest.name,
                        nameAr: rest.nameAr,
                        description: rest.description,
                        descriptionAr: rest.descriptionAr,
                        image: rest.image,
                        sortOrder: rest.sortOrder,
                        categoryId: rest.categoryId,
                        createdAt: createdAt.toISOString(),
                        dietaryTags: rest.dietaryTags,
                        allergens: rest.allergens,
                        price: Number(price),
                        discountedPrice: discountedPrice !== null ? Number(discountedPrice) : null,
                        avgRating: avgRating !== null ? Number(avgRating) : null,
                        ratingCount,
                        isPopular: popularIds.has(rest.id),
                        isNew: !popularIds.has(rest.id) && createdAt.getTime() > SEVEN_DAYS_AGO.getTime(),
                        isFeatured: featuredMap.get(rest.id)?.isFeatured ?? false,
                        featuredRank: featuredMap.get(rest.id)?.featuredRank ?? null,
                        showcaseTags: featuredMap.get(rest.id)?.showcaseTags ?? null,
                        // w3-f1 (F1-2): groups that survived the available-options filter;
                        // empty ones are dropped here (a group with zero bookable options
                        // must not render — and must not block required-group validation).
                        modifierGroups: rest.modifierGroups
                                .map((g) => ({
                                        id: g.id,
                                        nameAr: g.nameAr,
                                        name: g.name,
                                        minSelect: g.minSelect,
                                        maxSelect: g.maxSelect,
                                        required: g.required,
                                        options: g.options.map((o) => ({
                                                id: o.id,
                                                nameAr: o.nameAr,
                                                name: o.name,
                                                priceDelta: Number(o.priceDelta),
                                                isAvailable: true,
                                        })),
                                }))
                                .filter((g) => g.options.length > 0),
                })
        );

        // round90-F4 (performance P4): group items by categoryId ONCE — the
        // JSON-LD builder used categories.map(c => items.filter(...)) which is
        // O(C×I) on the hottest public page. Insertion order preserves the
        // sortOrder-asc ordering within each category (same as the old filter).
        const itemsByCategory = new Map<number, typeof items>();
        for (const i of items) {
                const bucket = itemsByCategory.get(i.categoryId);
                if (bucket) bucket.push(i);
                else itemsByCategory.set(i.categoryId, [i]);
        }

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
                                hasMenuItem: (itemsByCategory.get(c.id) ?? []).map((i) => ({
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

                        {/* round86-B6: hero renders on the server (was inside the client
                            section — ~200 lines of static markup compiled into client chunks);
                            interactive pieces are islands via MenuIslands */}
                        <MenuHero restaurant={restaurant} slug={slug} origin={origin} hasContact={hasContact} />

                        {/* Hero + Menu + Loyalty — client islands for the interactive parts */}
                        <MenuClientSection
                                restaurant={{
                                        id: restaurant.id,
                                        name: restaurant.name,
                                        slug,
                                        logo: restaurant.logo,
                                        whatsapp: restaurant.whatsapp,
                                }}
                                categories={serializedCategories}
                                serializedItems={serializedItems}
                        />
                </div>
        );
}
