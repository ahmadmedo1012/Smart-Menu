/**
 * Centralized brand constants that cannot live as CSS custom properties
 * because they are consumed by platforms that only accept literal values
 * (HTML <meta name="theme-color"> content attribute, JSON manifests).
 *
 * Keep in sync with `public/manifest.json` and `public/offline.html`.
 *
 * MADAREK PARITY — the browser/PWA chrome tint follows the user's theme at
 * runtime via <ThemeColorSync /> (r131-F4, Smart-Link pattern): dark → the
 * family night ground #070B16 (was madarek's chrome ink #191918 — A10 SM-2
 * alignment: every sibling app tints the night ground), light → #FBFAF9
 * (cream). The old flame #bc4700 tint is retired with the flame palette.
 */
export const BRAND_THEME_COLOR = "#070B16" as const;
export const BRAND_THEME_COLOR_LIGHT = "#FBFAF9" as const;
