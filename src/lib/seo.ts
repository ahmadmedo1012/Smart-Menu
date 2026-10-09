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
