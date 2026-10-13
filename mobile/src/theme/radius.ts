/**
 * Phase 6 (P6-2-c): the «plate-round» ladder — the inline-style SSOT twin
 * of the NativeWind mirror in tailwind.config.js (borderRadius), which the
 * parity suite pins. Phase-5 culinary contract (web globals.css
 * --radius-xs…--radius-3xl): 10/12/14/16/20/24/28 with 16 = the
 * plate-card rung (the web Card twin). Replaces the retired 6/8/10/12/16/
 * 20/28 Madarek ladder — every rung rounds UP into the warm plate family
 * (the 16 card emphasis is unchanged: xl stays 16).
 *
 * Pinned by tests/design/parity.mjs (the plate-ladder section).
 */

/** --radius-xs…--radius-3xl + --r-full (10/12/14/16/20/24/28/9999). */
export const radius = {
  /** --radius-xs */
  xs: 10,
  /** --radius-sm */
  sm: 12,
  /** --radius-md — the small-control/chip rung. */
  md: 14,
  /** --radius-lg — THE PLATE (card) rung: 16 emphasis in the culinary contract. */
  lg: 16,
  /** --radius-xl */
  xl: 20,
  /** --radius-2xl — landing station/role/chip cards ride this rung. */
  "2xl": 24,
  /** --radius-3xl */
  "3xl": 28,
  /** --r-full — the pill family (buttons, tags, dots). */
  pill: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
