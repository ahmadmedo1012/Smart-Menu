import { prisma } from "@/lib/db";

// round92-A1 (r91 F-C / D3 §4 + r92 live audit A1): production was surfacing
// internal QA fixture restaurants — slugs `settings-test-ts` (مطعم المرسى)
// and `ede` (برغر هاوس) — seeded rows that carry showOnLanding=true with NO
// other marker in the data (Restaurant has no isTest field/flag — the slug
// IS the marker). r91 patched the /api/public/featured path only; this RSC
// path (which feeds the homepage carousel directly) had no exclusion, so
// visitors saw the fixtures. Single source of truth, imported by the featured
// route too — deliberately a NARROW list (not a /test|demo/ regex: that would
// also hide the intended public demo slugs al-waha-cafe / al-waha-cafe-demo).
// Long-term fix is un-featuring those prod rows — then this list can be emptied.
//
// P29-D1: `al-waha-cafeewewe` joins the list — the r91-era comment had wrongly
// classified it as an "intended public demo", but the evidence says otherwise:
// it was created by the (now-archived) r96 local test script
// scripts/archive/r96-test-migration-prod-sim.mjs as a local-DB fixture, never
// a curated demo, and leaked into the production DB (name clones the demo
// cafe «مقهى الواحة» — duplicate-looking content under a keyboard-mash slug).
// Production keeps it un-featured already (landing + /api/public/featured
// exclude it); the remaining leak is the SITEMAP (content gate 6 items ≥ 3 +
// updatedAt inside the 90-day window), which now consumes this list too.
// The page itself stays reachable (family policy: exclusion = no featured
// surface + no crawl budget, never a broken link).
export const TEST_FIXTURE_SLUGS = ["settings-test-ts", "ede", "al-waha-cafeewewe"] as const;

/* P35 (the menu-page robots gate — the fixture doctrine's THIRD surface):
   the sitemap (P29-D1) and every featured surface (r92-A1) already exclude
   the fixture slugs, but the menu page itself stayed fully INDEXABLE —
   live proof: /menu/al-waha-cafeewewe served with NO robots meta and a
   title cloning the demo cafe («مقهى الواحة»), so any external link or
   direct crawl could land the fixture in the search index. The gate:
   noindex,follow — the route stays reachable (family policy: exclusion is
   crawl budget, never a broken link), the page leaves the index, its
   links stay followed. Genuine menus and the curated demos render NO
   robots meta at all (byte-identical output). Consumer:
   menu/[slug]/page.tsx generateMetadata. */
export const isTestFixtureMenu = (slug: string): boolean =>
        (TEST_FIXTURE_SLUGS as readonly string[]).includes(slug);

/* P29-D2 (honest demo labeling): the CURATED public demo menus — the live
   demo the landing opens everywhere (al-waha-cafe, HeroTable's «المنيو
   الحي») and the QA-journey demo (al-waha-cafe-demo, the header/footer
   «منيو تجريبي» links). Both are deliberate showcases (unlike the
   fixture list above), but a visitor landing on them must be able to tell
   they are demonstrations of the platform — the acceptance law «mockups
   and demos are accurately labeled». The landing copy already calls the
   waha cafe تجريبي in every caption; the MENU PAGES themselves carried
   no label (al-waha-cafe rendered as a plain real cafe «مقهى الواحة» —
   fake phone, demo items). Consumers: menu/[slug]/page.tsx (metadata
   title suffix + the MenuHero badge). */
export const PUBLIC_DEMO_SLUGS = ["al-waha-cafe", "al-waha-cafe-demo"] as const;

export const isPublicDemoMenu = (slug: string): boolean =>
        (PUBLIC_DEMO_SLUGS as readonly string[]).includes(slug);

export type FeaturedRestaurant = {
    id: number;
    name: string;
    slug: string;
    description: string;
    logo: string;
    city: string;
    phone: string;
    whatsapp: string;
    themeColor: string;
    orderCount: number;
};

// round89-C5 (dx-1 ج): the dead `fetchPublicStats` export + `PublicStats`
// type were removed — zero importers (the LIVE client-fetch copy lives in
// components/landing/landing-data.ts and is what the landing page uses).

export async function getFeaturedRestaurants(): Promise<FeaturedRestaurant[]> {
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const restaurants = await prisma.restaurant.findMany({
            // round92-A1: same fixture exclusion as the featured API route —
            // both public surfaces must filter from this one shared constant.
            where: { isActive: true, showOnLanding: true, slug: { notIn: [...TEST_FIXTURE_SLUGS] } },
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

        return restaurants
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
    } catch {
        return [];
    }
}
