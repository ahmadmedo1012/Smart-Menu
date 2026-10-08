/**
 * r126 (P4-F1 M7, audit G1): single source of truth for the deployment origin.
 *
 * The app lives at https://menu.smart-link.ly — but the env-var fallback was
 * SPLIT across surfaces: layouts/sitemap/robots fell back to the apex domain
 * (https://smart-link.ly) while the restaurant OG/JSON-LD URLs fell back to
 * http://localhost:3000. If NEXT_PUBLIC_DOMAIN ever goes missing in a deploy,
 * canonicals/OG/sitemap pointed at the wrong host. Every SEO surface now
 * consumes SITE_ORIGIN from here (pinned by tests/unit/seo-origin.test.ts).
 */

export const SITE_ORIGIN =
	process.env.NEXT_PUBLIC_DOMAIN || 'https://menu.smart-link.ly';
