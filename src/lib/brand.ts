/**
 * Centralized brand constants that cannot live as CSS custom properties
 * because they are consumed by platforms that only accept literal values
 * (HTML <meta name="theme-color"> content attribute, JSON manifests).
 *
 * Keep in sync with `public/manifest.json` and `public/offline.html`.
 * Source of truth for the PWA chrome tint (unified brand amber).
 */
export const BRAND_THEME_COLOR = "#d97706" as const;
