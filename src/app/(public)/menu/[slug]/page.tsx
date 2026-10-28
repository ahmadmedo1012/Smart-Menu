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
import { SITE_ORIGIN } from '@/lib/seo';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getRestaurantBySlug } from '@/lib/menu-queries';
// r134-W2 (#5): JSON-LD telephone rides the ONE wa.me normalizer (E.164).
import { normalizeWaNumber } from '@/lib/whatsapp';
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
        const origin = SITE_ORIGIN; // r126 (M7): unified origin (was localhost:3000 fallback)
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
                        locale: 'ar_AR',
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
//
// r135-SOLD-OUT: unavailable items now CROSS THE WIRE (status serialized as
// isAvailable) so the customer grid renders them greyed-out with a
// «غير متوفر حالياً» chip instead of silently vanishing — NN/g pattern:
// disable-and-keep-visible beats removal (no layout shift, preserves desire,
// sets expectations). The ORDER API keeps re-validating availability at
// submit (route.ts ownership + status checks) — server stays money-truth.
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
        const origin = SITE_ORIGIN; // r126 (M7): unified origin (was localhost:3000 fallback)
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
                        // r135-SOLD-OUT: ALL statuses selected (was: status:'available'
                        // filter) — sold-out items ship with isAvailable:false and the
                        // customer grid greys them out. Only the ORDER API still gates
                        // on availability (server re-validation stays the truth).
                        where: { category: { is: { restaurantId: restaurant.id, isActive: true } } },
                        select: {
                                // round86-B7: no per-item category embed (categories are sent
                                // once and joined by categoryId client-side) — ~15-25% smaller flight
                                id: true, name: true, nameAr: true, description: true, descriptionAr: true,
                                price: true, discountedPrice: true, image: true, sortOrder: true,
                                categoryId: true, createdAt: true, status: true,
                                dietaryTags: true, allergens: true, avgRating: true, ratingCount: true,
                                // w3-f1 (F1-2): modifier groups — ONE hierarchical select, no
                                // per-item round-trips (no N+1).
                                // r135-SOLD-OUT: unavailable OPTIONS also cross the wire now
                                // (isAvailable serialized per option) so the OrderDialog can
                                // render them as disabled «غير متوفر» chips instead of making
                                // them vanish — regulars can tell their usual add-on is out of
                                // stock. Groups with ZERO available options are still dropped
                                // by the serializer below so they can never block validation.
                                modifierGroups: {
                                        orderBy: { sortOrder: 'asc' },
                                        select: {
                                                id: true, nameAr: true, name: true,
                                                minSelect: true, maxSelect: true, required: true,
                                                options: {
                                                        orderBy: { sortOrder: 'asc' },
                                                        select: { id: true, nameAr: true, name: true, priceDelta: true, isAvailable: true },
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

        // 4-b (P15, 3-b audit «sold-out leads the menu»): the wire order was the
        // raw DB sortOrder — a sold-out/QA item with a low sortOrder LED its
        // category (the live demo menus render «TestLimitItem» first, greyed
        // but on top). The customer grid's reading order should never let an
        // unorderable item outrank an orderable one: partition per category,
        // available first (by their own sortOrder), unavailable last (by
        // theirs). r135's greyed-out rendering is untouched — only the ORDER
        // changes; the ORDER API's server-side status checks remain the truth.
        const availabilityRank = (i: { status: string }) => (i.status === 'available' ? 0 : 1);
        const serializedItems = [...items]
                .sort(
                        (a, b) =>
                                availabilityRank(a) - availabilityRank(b) ||
                                a.sortOrder - b.sortOrder ||
                                a.id - b.id,
                )
                .map(
                ({ price, discountedPrice, avgRating, ratingCount, createdAt, status, ...rest }) => ({
                        id: rest.id,
                        name: rest.name,
                        nameAr: rest.nameAr,
                        description: rest.description,
                        descriptionAr: rest.descriptionAr,
                        image: rest.image,
                        sortOrder: rest.sortOrder,
                        categoryId: rest.categoryId,
                        createdAt: createdAt.toISOString(),
                        // r135-SOLD-OUT: availability flag instead of server-side vanishing.
                        isAvailable: status === 'available',
                        dietaryTags: rest.dietaryTags,
                        allergens: rest.allergens,
                        price: Number(price),
                        discountedPrice: discountedPrice !== null ? Number(discountedPrice) : null,
                        avgRating: avgRating !== null ? Number(avgRating) : null,
                        ratingCount,
                        isPopular: popularIds.has(rest.id) && status === 'available',
                        isNew: !popularIds.has(rest.id) && createdAt.getTime() > SEVEN_DAYS_AGO.getTime() && status === 'available',
                        isFeatured: featuredMap.get(rest.id)?.isFeatured === true && status === 'available',
                        featuredRank: status === 'available' ? featuredMap.get(rest.id)?.featuredRank ?? null : null,
                        showcaseTags: status === 'available' ? featuredMap.get(rest.id)?.showcaseTags ?? null : null,
                        // w3-f1 (F1-2) + r135-SOLD-OUT: groups keep ≥1 AVAILABLE option
                        // (a group with zero bookable options must not render — and must not
                        // block required-group validation); unavailable options stay in the
                        // payload with isAvailable:false so the dialog can grey them out.
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
                                                isAvailable: o.isAvailable,
                                        })),
                                }))
                                .filter((g) => g.options.some((o) => o.isAvailable)),
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

        // r115-F123: Google's Restaurant rich-result guidelines mark priceRange
        // and image as RECOMMENDED — Lighthouse/a11y audits flagged the missing
        // priceRange. Computed from the REAL item prices (discount-aware) so it
        // can never drift from the rendered menu. Address added when the owner
        // filled it (free-text; schema.org accepts a Text address).
        const effectivePrices = items.map((i) => Number(i.discountedPrice ?? i.price));
        const restaurantImage = restaurant.logo
                ? restaurant.logo.startsWith('http') ? restaurant.logo : `${origin}${restaurant.logo}`
                : (Array.isArray(restaurant.gallery) && restaurant.gallery.length > 0
                        ? (restaurant.gallery[0] as string).startsWith('http') ? (restaurant.gallery[0] as string) : `${origin}${restaurant.gallery[0]}`
                        : undefined);

        // r134-W2 (#5): E.164 with the explicit + prefix — the raw owner string
        // (local 09…, +218…, Eastern digits ٠٩١٢…) used to leak verbatim into
        // schema.org; validators drop non-E.164 values, so the field was dead
        // weight for exactly the restaurants the wa.me fold fixed.
        const wa = normalizeWaNumber(restaurant.phone || restaurant.whatsapp);

        // r138 (F1): ساعات الدوام المهيكلة (r137) تُصدَّر أخيرًا إلى الآلة — كانت
        // محمّلة في الصفحة نفسها (تُغذّي شارة MenuHero) لكن jsonLd أهملها، فكان
        // الدوام غائبًا عن Google/الخرائط بينما هو أهم إجابة يبحث عنها الزبون.
        // اتفاقية التخزين: dayOfWeek برقم getDay (0=الأحد..6=السبت)؛ الصفوف
        // المغلقة تُحذف (لا معنى لتصدير يوم مغلق)؛ العابر لمنتصف الليل
        // (closesAt < opensAt) يُصدَّر كما هو — مواصفة schema.org تسمح بعبور
        // الإغلاق لليوم التالي؛ «00:00 → 00:00» يعني دوامًا متواصلًا 24 ساعة
        // (اتفاقية lib/opening-hours) فيُصدَّر 00:00–23:59.
        const SCHEMA_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
        const openHoursSpec = restaurant.hours
                .filter((h) => !h.closed)
                .map((h) => {
                        const alwaysOpen = h.opensAt === h.closesAt;
                        return {
                                '@type': 'OpeningHoursSpecification',
                                dayOfWeek: `https://schema.org/${SCHEMA_DAY_NAMES[h.dayOfWeek] ?? 'Sunday'}`,
                                opens: alwaysOpen ? '00:00' : h.opensAt,
                                closes: alwaysOpen ? '23:59' : h.closesAt,
                        };
                });

        // r138 (F4): العنوان يُرقّى من نص حر إلى PostalAddress مع المدينة —
        // العمود موجود في قاعدة البيانات منذ الأصل ولم يكن يُصدَّر. تحتفظ
        // الحقول الاختيارية بحذفها عند الفراغ (سياسة r121-L-3: لا اختلاق قيم).
        const hasPostalAddress = !!(restaurant.address || restaurant.city);

        const jsonLd = {
                '@context': 'https://schema.org',
                '@type': 'Restaurant',
                name: restaurant.name,
                description: restaurant.description,
                url: `${origin}/menu/${slug}`,
                telephone: wa ? `+${wa}` : undefined,
                // r121-L-3: حقل المطبخ الثابت («ليبي» لكل مطعم — حتى بيتزا روما
                // «الإيطالية») حُذف: لا يوجد حقل مطبخ في قاعدة البيانات أصلًا،
                // وحذف الحقل الاختياري أفضل من اختلاق قيمة.
                ...(effectivePrices.length > 0 ? {
                        priceRange: `${Math.min(...effectivePrices)}-${Math.max(...effectivePrices)} د.ل`,
                } : {}),
                ...(restaurantImage ? { image: restaurantImage } : {}),
                // r138 (F4): PostalAddress بدل النص الحر — المدينة عمود حقيقي
                // في قاعدة البيانات كان يُهمل. عنوان الشارع يبقى نصًا حرًا
                // (هكذا يكتبه المالك) داخل streetAddress.
                ...(hasPostalAddress ? {
                        address: {
                                '@type': 'PostalAddress',
                                ...(restaurant.address ? { streetAddress: restaurant.address } : {}),
                                ...(restaurant.city ? { addressLocality: restaurant.city } : {}),
                        },
                } : {}),
                // r138 (F1): see openHoursSpec above — only exported when the
                // owner actually filled the r137 week editor (no rows = field
                // omitted entirely, never an empty array).
                ...(openHoursSpec.length > 0 ? { openingHoursSpecification: openHoursSpec } : {}),
                hasMenu: {
                        '@type': 'Menu',
                        name: `قائمة ${restaurant.name}`,
                        // r135: language + Arabic-first names — the rendered page is
                        // Arabic (lang=ar dir=rtl), so the machine-readable menu must
                        // carry the Arabic name when it exists (nameAr || name), not
                        // the English fallback. (W7-G: descriptions retired — see the
                        // MenuItem comment below.)
                        inLanguage: 'ar',
                        hasMenuSection: categories.map((c) => ({
                                '@type': 'MenuSection',
                                name: c.nameAr || c.name,
                                hasMenuItem: (itemsByCategory.get(c.id) ?? [])
                                        // r135-SOLD-OUT: only AVAILABLE items are advertised to
                                        // machines — sold-out items stay visible to humans but
                                        // must not be offered as orderable in schema.org.
                                        .filter((i) => i.status === 'available')
                                        .map((i) => ({
                                                '@type': 'MenuItem',
                                                name: i.nameAr || i.name,
                                                /* W7-G (P2, A2 audit — JSON-LD trim): وصف الصنف حُذف من
                                                   الـschema — اختياري في schema.org، وكان يُشحن مرتين
                                                   (نفس النص يعيش في حمولة RAC المُسلسَلة التي ترسم
                                                   البطاقات)؛ منيو العرض التوضيحي وحده كان يضيف
                                                   ~25 وصفاً عربياً كاملاً للصفحة (340KB خام). الأسماء
                                                   والأسعار والعروض وaggregateRating تبقى كما هي. */
                                                offers: {
                                                        '@type': 'Offer',
                                                        // r133 (A12 N7): schema.org price is a STRING —
                                                        // a number primitive is silently dropped by validators.
                                                        // r136: يطابق السعر المعروض على البطاقة — المخفّض إن
                                                        // وُجد (نفس معادلة priceRange أعلاه)؛ كان يُعلن الأساس
                                                        // فتظهر النتائج الغنية أغلى من الصفحة.
                                                        price: String(i.discountedPrice ?? i.price),
                                                        priceCurrency: 'LYD',
                                                },
                                                // r138 (F10): التقييم الحقيقي للصنف يُصدَّر — كان
                                                // avgRating/ratingCount محمّلين في الصفحة نفسها
                                                // (يغذّيان نجوم البطاقة) دون أن يريهما الآلة. الخط
                                                // الأحمر الثابت: لا يُشتق تقييم المطعم من تقييمات
                                                // الأصناف (self-serving = spam policy) — التصدير
                                                // داخل MenuItem فقط، وبعدّ تقييمات حقيقي ≥1.
                                                ...(i.avgRating != null && i.ratingCount != null && i.ratingCount > 0 ? {
                                                        aggregateRating: {
                                                                '@type': 'AggregateRating',
                                                                ratingValue: Number(i.avgRating),
                                                                ratingCount: i.ratingCount,
                                                                bestRating: 5,
                                                                worstRating: 1,
                                                        },
                                                } : {}),
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
                                        /* r138-exec-2 (J1): هاتف المطعم لرسالة بوابة
                                           الواتساب في الإضافة السريعة (بديل تواصل). */
                                        phone: restaurant.phone,
                                        /* r137: رسوم التوصيل تعبر كرقم (تسمية خيار التوصيل في
                                           OrderDialog) — null = الميزة مطفأة. */
                                        deliveryFee:
                                                restaurant.deliveryFee == null ? null : Number(restaurant.deliveryFee),
                                }}
                                categories={serializedCategories}
                                serializedItems={serializedItems}
                        />

                        {/* r151 (LIVE-AUDIT-SM1 P2-3): التذييل القانوني الأدنى للسطح
                            الأساسي للزبون — الخصوصية/الشروط كانت تُفتحان من الهبوط
                            فقط (قياس حي: القائمة العامة بلا تذييل قانوني إطلاقًا).
                            رابطان نصيان بنمط الصف القانوني في تذييل الأسطول
                            (توأم SL/SO) وأرضية لمس 44 عموديًا. خادمي خالص —
                            لا عميل ولا حالة ولا بيانات إضافية. */}
                        <footer className="relative z-10 mx-auto mt-14 w-full max-w-4xl xl:max-w-6xl px-4 pb-[calc(env(safe-area-inset-bottom)+84px)] sm:pb-10">
                                {/* P29-C1 (قانون الرصيف العمودي): كان الصف القانوني يُزاح
                                    أفقيًا (ps-20/pe-20 — موجات W7-H/W7-H2) هربًا من أقراص
                                    واتساب (end-4 = يسار RTL) والعودة للأعلى (start-4 =
                                    يمين RTL) — لكن 229px روابط + حزاما قرصين (>176px)
                                    لا يتسعان أفقيًا تحت 420px، فكان القرص يغطي الرابط
                                    (قياس حي: تقاطع 51×32px على منيو الواحة @320،
                                    16×32px @390، و4×44px على الباقات @390-320).
                                    الرصيف العمودي يحلّه من الجذر: آخر محتوى يصعد فوق
                                    قمة القرص الأعلى (bottom+1rem+size-14 = 72px) بهامش
                                    أمان 12px ⇒ padding-bottom ≥ 84px تحت sm — والصف
                                    يعود لتمركزه الصادق بلا إزاحات عرضية قابلة للكسر. */}
                                <div className="flex items-center justify-center gap-2 border-t border-border/40 pt-2 sm:gap-6">
                                        <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                سياسة الخصوصية
                                        </Link>
                                        <Link href="/terms" className="inline-flex min-h-11 items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                شروط الاستخدام
                                        </Link>
                                </div>
                        </footer>
                </div>
        );
}
