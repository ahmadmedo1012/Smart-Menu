/**
 * r129-F5: the canonical Madarek spacing ladder as a JS module.
 * Values are 1:1 with madarek/frontend/src/styles/tokens.css:19-22
 * (--sp-1…--sp-16, 4px base ×1/×2/×3/×4 steps) via the web bridge
 * (src/app/globals.css §spacing + the landing-local composition deps,
 * landing.css:71-78). The NativeWind `spacing` map in tailwind.config.js
 * stays the className mirror (xs…4xl subset); this module is the
 * inline-style SSOT the landing rhythm consumes (chapter padding 24,
 * station card padding 20, journey gap 28 — the ≤768 density pass).
 *
 * Pinned (full-ladder aggregate) by tests/design/parity.mjs (r128 section).
 */

/** --sp-1…--sp-16 (px). */
export const spacing = {
  /** --sp-1 */
  sp1: 4,
  /** --sp-2 */
  sp2: 8,
  /** --sp-3 */
  sp3: 12,
  /** --sp-4 */
  sp4: 16,
  /** --sp-5 — mobile station-card padding (≤768 density pass). */
  sp5: 20,
  /** --sp-6 */
  sp6: 24,
  /** --sp-7 */
  sp7: 32,
  /** --sp-8 */
  sp8: 40,
  /** --sp-9 — page gutter (desktop). */
  sp9: 48,
  /** --sp-10 */
  sp10: 56,
  /** --sp-11 */
  sp11: 72,
  /** --sp-12 — section gap. */
  sp12: 96,
  /** --sp-13 */
  sp13: 128,
  /** --sp-14 */
  sp14: 160,
  /** --sp-15 */
  sp15: 192,
  /** --sp-16 */
  sp16: 240,
} as const;

export type SpacingToken = keyof typeof spacing;

/** The landing page gutter (mobile): --page-gutter-mobile = --sp-5. */
export const PAGE_GUTTER = spacing.sp5;
