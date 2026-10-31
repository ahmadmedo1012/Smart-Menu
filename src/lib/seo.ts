/**
 * r126 (P4-F1 M7, audit G1): single source of truth for the deployment origin.
 *
 * The app lives at https://menu.smart-link.ly — but the env-var fallback was
 * SPLIT across surfaces: layouts/sitemap/robots fell back to the apex domain
 * (https://smart-link.ly) while the restaurant OG/JSON-LD URLs fell back to
 * http://localhost:3000. If NEXT_PUBLIC_DOMAIN ever goes missing in a deploy,
 * canonicals/OG/sitemap pointed at the wrong host. Every SEO surface now
 * consumes SITE_ORIGIN from here (pinned by tests/unit/seo-origin.test.ts).
 *
 * r133 (A3 S5): the print-QR page read a DIFFERENT variable
 * (NEXT_PUBLIC_APP_URL) for the same concept, and owner/restaurants hardcoded
 * the prod host — one name, one seam now. NEXT_PUBLIC_APP_URL wins (the
 * r133 fleet name); NEXT_PUBLIC_DOMAIN stays as the r126 alias so existing
 * Vercel deployments keep working.
 */

export const SITE_ORIGIN =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_DOMAIN ||
        'https://menu.smart-link.ly';

/* ── P40-5c (P3-13): per-restaurant metadata composition ────────────────────
 *
 * The menu page's generateMetadata used a bare `${restaurant.description ||
 * 'اطلع على قائمة …'}` line (the live al-waha description renders 54 chars of
 * pure menu-copy with no ordering signal) and a logo→og-default og:image chain
 * (the flagship demo has neither → the generic brand card everywhere). These
 * two pure helpers are the shared composition layer — unit-testable without a
 * DB, consumed by menu/[slug] generateMetadata.
 *
 * Honesty rules (r82/r121-L-3): only fields the owner actually filled are
 * composed in — the city segment drops entirely when empty; no invented
 * cuisine/claims. The demo «تجريبي» label stays title-only (the P29-D2
 * decision); the description stays demo-neutral. */

export interface RestaurantMetaInput {
        name: string;
        description?: string | null;
        city?: string | null;
}

/** Per-restaurant meta description: menu + owner copy (when present) + the
 *  WhatsApp ordering signal + city (when present). Arabic-first. */
export function restaurantMetaDescription(restaurant: RestaurantMetaInput): string {
        const city = restaurant.city?.trim();
        const where = city ? ` في ${city}` : '';
        const ownerLine = restaurant.description?.trim();
        if (ownerLine) {
                return `منيو ${restaurant.name} — ${ownerLine}. اطلب عبر واتساب${where}`;
        }
        return `منيو ${restaurant.name} — تصفح الأصناف والأسعار واطلب عبر واتساب${where}`;
}

export interface RestaurantOgImageInput {
        name: string;
        /** Square owner logo (rendered in glass orbs) — optional. */
        logo?: string | null;
        /** Owner gallery (food/ambience photos) — landscape-first; optional. */
        gallery?: readonly string[];
        /** Root-relative branded card used when the restaurant has no imagery
         *  of its own (e.g. '/og-default.png' or a curated demo card). */
        fallback?: string;
}

export interface RestaurantOgImage {
        /** Absolute http(s) or root-relative (metadataBase resolves it). */
        url: string;
        alt: string;
        /** Present only when the dimensions are KNOWN (square logo 512,
         *  branded cards 1200×630). Owner gallery photos have unknown
         *  dimensions — omitted rather than guessed (a wrong og:image
         *  width/height misleads scrapers more than none). */
        width?: number;
        height?: number;
        /** Square logo → small card; landscape imagery/cards → wide card. */
        twitterCard: 'summary' | 'summary_large_image';
}

/** og:image priority: gallery cover (the Smart-Order coverUrl-first pattern —
 *  landscape food imagery previews best) → square logo → branded card. */
export function restaurantOgImage(input: RestaurantOgImageInput): RestaurantOgImage {
        const { name, logo, gallery, fallback = '/og-default.png' } = input;
        const cover = gallery?.length ? gallery[0] : null;
        if (cover) {
                return {
                        url: cover,
                        alt: `صورة من أجواء ${name}`,
                        twitterCard: 'summary_large_image',
                };
        }
        if (logo) {
                return {
                        url: logo,
                        alt: `شعار ${name}`,
                        width: 512,
                        height: 512,
                        twitterCard: 'summary',
                };
        }
        return {
                url: fallback,
                alt: `بطاقة معاينة لقائمة ${name} — الربط الذكي`,
                width: 1200,
                height: 630,
                twitterCard: 'summary_large_image',
        };
}
