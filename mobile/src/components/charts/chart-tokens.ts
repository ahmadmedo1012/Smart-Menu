/**
 * P42-5d (GAP-MENU-1) — the mobile chart token roster, the static twin of
 * the web draw-time tokens (src/components/shared/chart-tokens.ts).
 *
 * The web reads --chart-1..8 + --c-flame + --c-saffron-ink from CSS at draw
 * time so charts follow the light/dark toggle. The mobile app is LIGHT-first
 * with no theme toggle yet (colors.ts header — the night twin is documented
 * opt-in data), so the roster is the LIGHT values resolved through the
 * mobile token SSOT — zero raw hexes, every value rides colors.ts (the
 * parity harness's prop-hex law).
 *
 * Mapping (web light roster → mobile tokens):
 *   --chart-1 #C2452D → colors.terracotta        (flame == chart-1 too)
 *   --chart-2 #6FA06A → pastelFamilies.mint.ink  (== colors.mint)
 *   --chart-3 #6B8CA3 → pastelFamilies.sky.ink   (== colors.sky)
 *   --chart-4 #C96873 → pastelFamilies.rose.ink  (== colors.rose)
 *   --chart-5 #8A76C9 → pastelFamilies.lavender.ink
 *   --c-saffron-ink #7A5210 → pastelFamilies.yellow.deep (series-2 amber,
 *   the AA-safe ink the two-series charts' second line rides)
 *
 * chart-6..8 (#8F6212/#3F8B7E/#96547A) have no mobile token equivalents and
 * NO consumer: the doughnut's server-side share cap is 5 slices
 * (categoryShares maxSlices=5 — 4 named + «أخرى»), so the 5-color roster
 * below always covers it. Inventing three unused tokens would be fake
 * parity — when a sixth consumer lands, the tokens land with it.
 */
import { colors, pastelFamilies } from "@/theme/colors";

/** Series-1 stroke — web --chart-1 / --c-flame (terracotta chain). */
export const CHART_FLAME = colors.terracotta;

/** Series-2 amber ink — web --c-saffron-ink light (AA on the plate). */
export const CHART_SAFFRON = pastelFamilies.yellow.deep;

/** The series roster (web --chart-1..5 light values, via mobile tokens). */
export const CHART_SERIES = [
  colors.terracotta,
  pastelFamilies.mint.ink,
  pastelFamilies.sky.ink,
  pastelFamilies.rose.ink,
  pastelFamilies.lavender.ink,
] as const;

/** Axis/tick label ink — the web --chart-text role (muted foreground). */
export const CHART_TEXT = colors.muted;
