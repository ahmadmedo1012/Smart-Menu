/**
 * r129-F5: the canonical Madarek radius ladder as a JS module — the
 * inline-style SSOT twin of the NativeWind mirror in tailwind.config.js
 * (borderRadius), which the parity suite has pinned since r127. Until now
 * inline styles spelled raw numbers (radius 12/16 literals) with no
 * tokenized source; this module is that source (values 1:1 with
 * madarek/frontend/src/styles/tokens.css §1.4 --r-xs…--r-full via the web
 * bridge src/app/globals.css).
 *
 * Pinned by tests/design/parity.mjs (r128 section).
 */

/** --r-xs…--r-3xl + --r-full (6/8/10/12/16/20/28/9999). */
export const radius = {
  /** --r-xs */
  xs: 6,
  /** --r-sm */
  sm: 8,
  /** --r-md */
  md: 10,
  /** --r-lg */
  lg: 12,
  /** --r-xl */
  xl: 16,
  /** --r-2xl — landing station/role/chip cards ride this rung. */
  "2xl": 20,
  /** --r-3xl */
  "3xl": 28,
  /** --r-full — the pill family (buttons, tags, dots). */
  pill: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
