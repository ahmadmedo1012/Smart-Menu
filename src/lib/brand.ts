/**
 * Centralized brand constants that cannot live as CSS custom properties
 * because they are consumed by platforms that only accept literal values
 * (HTML <meta name="theme-color"> content attribute, JSON manifests).
 *
 * Keep in sync with `public/manifest.json` and `public/offline.html`.
 *
 * PHASE 5 (r152) — Warm Culinary Editorial: the browser/PWA chrome tint
 * follows the user's theme at runtime via <ThemeColorSync />: light → the
 * cream ground #FBF7F0 (default), dark → the warm night kitchen ground
 * #1D1410. Keep in sync with public/manifest.json + public/offline.html.
 */
export const BRAND_THEME_COLOR = "#1D1410" as const;
export const BRAND_THEME_COLOR_LIGHT = "#FBF7F0" as const;
