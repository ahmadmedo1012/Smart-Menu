/**
 * Centralized brand constants that cannot live as CSS custom properties
 * because they are consumed by platforms that only accept literal values
 * (HTML <meta name="theme-color"> content attribute, JSON manifests).
 *
 * Keep in sync with `public/manifest.json` and `public/offline.html`.
 * Source of truth for the PWA chrome tint — r95: SmartBot flame #bc4700
 * (was unified brand amber #d97706).
 */
export const BRAND_THEME_COLOR = "#bc4700" as const;
