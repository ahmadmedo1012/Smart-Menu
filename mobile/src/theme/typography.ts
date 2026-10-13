/**
 * Typography resolvers — the iOS bold-rendering fix (r126-M1) + the Phase-6
 * display chain (P6-2-c).
 *
 * r126-M1 (A6 P1-2): the brand body face ships as FOUR separately-registered
 * families (one TTF per weight — how @expo-google-fonts packages it):
 *
 *   "IBM Plex Sans Arabic"          → 400Regular
 *   "IBM Plex Sans Arabic-Medium"   → 500Medium
 *   "IBM Plex Sans Arabic-SemiBold" → 600SemiBold
 *   "IBM Plex Sans Arabic-Bold"     → 700Bold
 *
 * Screens set `fontFamily: "IBM Plex Sans Arabic"` + numeric `fontWeight`
 * (97 sites). On iOS a single-file aliased family cannot synthesize a bold
 * face, so every 600/700 silently fell back to Regular — the whole weight
 * hierarchy collapsed to 400. (Android fakes bold via Typeface.create;
 * iOS does not.)
 *
 * The fix keeps every call site untouched: the shared <Text> wrapper
 * (src/components/ui/Text.tsx) intercepts the resolved style, translates a
 * numeric fontWeight (+ the base family) into the correct per-weight family,
 * and appends it — inline styles AND NativeWind `font-semibold`/`font-bold`
 * classes both land in the same `style` prop, so both paths are fixed at once.
 *
 * Phase 6 (P6-2-c): the DISPLAY face joins the same machinery — Baloo
 * Bhaijaan 2 (warm rounded culinary display, Arabic+Latin) registers as
 * FIVE per-weight families (400-800) and gets its own resolver twin
 * (resolveBalooFamily + DISPLAY constants). Headings flip their
 * fontFamily to "Baloo Bhaijaan 2"; the body keeps Plex. Parity note: the
 * web twin self-hosts the variable face; mobile rides per-weight TTFs.
 */
import type { TextStyle } from "react-native";

/** The body family App.tsx registers the 400Regular file under. */
export const PLEX_FAMILY = "IBM Plex Sans Arabic";

const PLEX_MEDIUM = "IBM Plex Sans Arabic-Medium";
export const PLEX_SEMIBOLD = "IBM Plex Sans Arabic-SemiBold";
export const PLEX_BOLD = "IBM Plex Sans Arabic-Bold";

/** Every registered body family, for tooling/tests. */
export const PLEX_FAMILIES = [
  PLEX_FAMILY,
  PLEX_MEDIUM,
  PLEX_SEMIBOLD,
  PLEX_BOLD,
] as const;

/** The display family App.tsx registers the 400Regular file under (Phase 6). */
export const BALOO_FAMILY = "Baloo Bhaijaan 2";

const BALOO_MEDIUM = "Baloo Bhaijaan 2-Medium";
const BALOO_SEMIBOLD = "Baloo Bhaijaan 2-SemiBold";
const BALOO_BOLD = "Baloo Bhaijaan 2-Bold";
const BALOO_EXTRA_BOLD = "Baloo Bhaijaan 2-ExtraBold";

/** Every registered display family, for tooling/tests. */
export const BALOO_FAMILIES = [
  BALOO_FAMILY,
  BALOO_MEDIUM,
  BALOO_SEMIBOLD,
  BALOO_BOLD,
  BALOO_EXTRA_BOLD,
] as const;

type FontWeightToken = Exclude<TextStyle["fontWeight"], undefined>;

/** fontWeight (RN accepts "normal" | "bold" | "100"…"900") → Plex family. */
const WEIGHT_TO_FAMILY: Record<string, string> = {
  normal: PLEX_FAMILY,
  "100": PLEX_FAMILY,
  "200": PLEX_FAMILY,
  "300": PLEX_FAMILY,
  "400": PLEX_FAMILY,
  "500": PLEX_MEDIUM,
  "600": PLEX_SEMIBOLD,
  "700": PLEX_BOLD,
  "800": PLEX_BOLD, // no true 800 ships — rubric: black resolves to 700
  "900": PLEX_BOLD,
  bold: PLEX_BOLD,
};

/** fontWeight → Baloo display family (the face HAS a true 800). */
const BALOO_WEIGHT_TO_FAMILY: Record<string, string> = {
  normal: BALOO_FAMILY,
  "100": BALOO_FAMILY,
  "200": BALOO_FAMILY,
  "300": BALOO_FAMILY,
  "400": BALOO_FAMILY,
  "500": BALOO_MEDIUM,
  "600": BALOO_SEMIBOLD,
  "700": BALOO_BOLD,
  "800": BALOO_EXTRA_BOLD,
  "900": BALOO_EXTRA_BOLD,
  bold: BALOO_BOLD,
};

/**
 * Translate (fontFamily, fontWeight) into the Plex family that actually
 * carries that weight.
 *
 * - fontFamily already points at a specific weight family → unchanged.
 * - fontFamily is the base Plex family (or missing) + a numeric weight →
 *   the matching per-weight family.
 * - A non-Plex fontFamily is never touched (caller owns it).
 */
export function resolvePlexFamily(
  fontFamily?: string,
  fontWeight?: FontWeightToken,
): string | undefined {
  if (fontFamily && fontFamily !== PLEX_FAMILY) return undefined;
  if (fontWeight === undefined || fontWeight === null) return fontFamily;
  return WEIGHT_TO_FAMILY[fontWeight] ?? PLEX_FAMILY;
}

/**
 * The Baloo twin of resolvePlexFamily — (fontFamily, fontWeight) → the
 * Baloo family that carries that weight (Baloo ships a TRUE 800, unlike
 * Plex). A non-Baloo fontFamily is never touched.
 */
export function resolveBalooFamily(
  fontFamily?: string,
  fontWeight?: FontWeightToken,
): string | undefined {
  if (fontFamily && fontFamily !== BALOO_FAMILY) return undefined;
  if (fontWeight === undefined || fontWeight === null) return fontFamily;
  return BALOO_WEIGHT_TO_FAMILY[fontWeight] ?? BALOO_FAMILY;
}

/**
 * The shared <Text> resolver entry point (Phase 6): resolves EITHER face's
 * per-weight family. Baloo (display) takes precedence when the style
 * points at it; otherwise the Plex body resolver runs. Callers that never
 * set a family keep the legacy Plex behavior byte-identical.
 */
export function resolveFontFamily(
  fontFamily?: string,
  fontWeight?: FontWeightToken,
): string | undefined {
  const baloo = resolveBalooFamily(fontFamily, fontWeight);
  if (baloo !== undefined) return baloo;
  return resolvePlexFamily(fontFamily, fontWeight);
}

/**
 * r130 W2-4: the metric numeral rule as an RN style value — the twin of
 * `--type-metric-feature-settings: 'tnum' 1, 'lnum' 1`. Prices, counts,
 * order numbers and KPI values ride tabular lining figures so digits
 * column-align and never reflow width mid-count. Apply via
 * `fontVariant: METRIC_FONT_VARIANT` on metric <Text> styles (the landing
 * trust band already rides IBM Plex Mono, which is tabular by design —
 * this covers the product surfaces).
 */
export const METRIC_FONT_VARIANT: NonNullable<TextStyle["fontVariant"]> = [
  "tabular-nums",
  "lining-nums",
];
