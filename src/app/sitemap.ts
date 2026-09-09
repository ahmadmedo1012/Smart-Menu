import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || 'https://smart-link.ly';

// round92-A5: the live sitemap advertised 9 junk restaurants (bssdn, hdydu,
// hvh, fafaef, sdsdsd, jjhhdhd, hgkjg, free-rest-1783368824, new-rest-300528)
// — keyboard-mash and test-script names that pollute crawl budget and expose
// the DB's neglected rows. Two defenses, each with its own cause:
//
//  1) JUNK_SLUG_PATTERNS — name-level rules for KNOWN garbage shapes:
//     - the r91 legacy regex (kept verbatim: guards settings-test-ts, ede,
//       restaurant-123, timestamp phones …)
//     - scripted test-restaurant prefixes (free-rest-…, new-rest-… — the two
//       exact families seen live; a real owner never names their business
//       "free-rest-<timestamp>")
//     - trailing 5+ digits — auto-generated numeric suffixes (timestamps /
//       random ids). 4-digit years like matam-1995 stay safe.
//     - short vowel-starved latin slugs (3-7 chars, ≤1 vowel) — keyboard
//       mash (hdydu/hvh/bssdn…). Real restaurant slugs are names and
//       transliterations, which carry ≥2 vowels in any 3-7 char latin form
//       (qahwa, matam, shwerma…). False positives are possible in theory
//       (an abbreviated vowel-less brand) but cost only the sitemap listing —
//       the page itself stays live, linked and indexable.
//  2) A 90-day activity gate — the principled rule: a restaurant with no menu
//     row update AND no order for 90 days is de facto abandoned (1-a: "208
//     مطعم في DB، أغلبها مهمل"). It stays publicly reachable (its page, QR
//     links, direct URLs all keep working) but stops consuming crawl budget.
//     This is also what catches vowel-rich gibberish (e.g. fafaef) that no
//     name pattern can prove junk.
const JUNK_SLUG_PATTERNS: RegExp[] = [
        /(^|-)(test|admin-test|demo|debug|bug|dev|cafe-t|restaurant-\d|178\d{10,}|^s?asas|^qq+|^-+|^sjj|^ede|^nigga|^sex)/i,
        /(^|-)(free|new|tmp|temp|fake|sample|check|try|x)-rest/i,
        /-\d{5,}$/,
        /^(?!(?:[a-z]*[aeiou]){2})[a-z]{3,7}$/,
];

// round92-A5: freshness window for the activity gate.
const ACTIVITY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

// round97-X3: content gate — a restaurant needs ≥3 menu items OR the
// showOnLanding directory flag (a human quality signal, same flag the public
// landing uses) to consume crawl budget. The junk-name patterns still missed
// thin mash rows (ahmed, al-waha-cafeewewe — 1-2 items each).
const MIN_MENU_ITEMS = 3;

// round97-X3: the canonical flagship demo (25 items) is whitelisted past the
// junk-name patterns ONLY — it matches the `-demo` rule, which exists for
// throwaway demo-* rows, not this showcase. The content gate above (25 ≥ 3)
// and the 90-day activity gate below still apply to it like every other row.
const CANONICAL_DEMO_SLUG = 'al-waha-cafe-demo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
        // round89-C3 (dx-2 ب-2): item counts per restaurant. The old shape
        // (`categories: { select: { _count: { select: { items: true } } } }`)
        // compiled into a FULL-TABLE aggregate LEFT JOIN of MenuItem plus every
        // category row materialized — just to SUM the per-category counts.
        // One grouped join returns the same per-restaurant totals directly.
        // (MenuItem belongs to a category, not the restaurant — counts must
        // route through MenuCategory.)
        const [restaurants, itemCounts, recentOrders] = await Promise.all([
                prisma.restaurant.findMany({
                        where: { isActive: true },
                        // round97-X3: showOnLanding feeds the content gate (the
                        // landing-directory flag vouches for thin-but-real menus).
                        select: { id: true, slug: true, updatedAt: true, showOnLanding: true },
                }),
                prisma.$queryRaw<{ restaurantId: number; items: bigint }[]>`
                        SELECT c."restaurantId" AS "restaurantId", COUNT(mi."id") AS "items"
                        FROM "MenuCategory" c
                        JOIN "MenuItem" mi ON mi."categoryId" = c."id"
                        GROUP BY c."restaurantId"
                `,
                // round92-A5: last order per restaurant inside the activity
                // window — grouped + filtered in SQL (same grouped-join shape
                // as the item counts; no per-restaurant round-trips). Any
                // order status counts: an order attempt is business activity.
                prisma.order.groupBy({
                        by: ['restaurantId'],
                        _max: { createdAt: true },
                        where: { createdAt: { gte: new Date(Date.now() - ACTIVITY_WINDOW_MS) } },
                }),
        ]);
        const itemsByRestaurant = new Map<number, number>(
                itemCounts.map((r) => [r.restaurantId, Number(r.items)])
        );
        const lastOrderByRestaurant = new Map<number, Date>(
                recentOrders.map((r) => [r.restaurantId, r._max.createdAt ?? new Date(0)])
        );
        const cutoff = Date.now() - ACTIVITY_WINDOW_MS;
        const isAlive = (r: { id: number; updatedAt: Date }): boolean =>
                r.updatedAt.getTime() >= cutoff ||
                (lastOrderByRestaurant.get(r.id)?.getTime() ?? 0) >= cutoff;

        const menuPages: MetadataRoute.Sitemap = restaurants
                .filter((r) => {
                        // round97-X3 (a): content gate — ≥3 items OR showOnLanding.
                        const itemCount = itemsByRestaurant.get(r.id) ?? 0;
                        if (itemCount < MIN_MENU_ITEMS && !r.showOnLanding) return false;
                        // round97-X3 (b): flagship demo bypasses the junk-name
                        // patterns (see CANONICAL_DEMO_SLUG) — not the gates.
                        if (r.slug === CANONICAL_DEMO_SLUG) return isAlive(r);
                        // round92-A5: junk-name patterns + (c) the 90-day activity gate.
                        return !JUNK_SLUG_PATTERNS.some((re) => re.test(r.slug)) && isAlive(r);
                })
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
