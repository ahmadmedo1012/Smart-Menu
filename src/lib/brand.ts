/**
 * Centralized brand constants that cannot live as CSS custom properties
 * because they are consumed by platforms that only accept literal values
 * (HTML <meta name="theme-color"> content attribute, JSON manifests).
 *
 * Keep in sync with `public/manifest.json` and `public/offline.html`.
 *
 * MADAREK PARITY — the browser/PWA chrome tint follows Madarek's own
 * runtime theme-color sync exactly (madarek/frontend/index.html wave 2-a):
 * dark → #191918, light → #FBFAF9 (cream). The old flame #bc4700 tint
 * is retired with the flame palette.
 */
export const BRAND_THEME_COLOR = "#191918" as const;
export const BRAND_THEME_COLOR_LIGHT = "#FBFAF9" as const;
