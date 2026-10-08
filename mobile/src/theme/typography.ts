/**
 * IBM Plex Sans Arabic typography resolver — the iOS bold-rendering fix.
 *
 * r126-M1 (A6 P1-2): the brand face ships as FOUR separately-registered
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
 * Parity note: Plex Sans Arabic has no true 800/900 — the Madarek rubric
 * resolves --fw-black to 700 at runtime; 800/900 map to Bold here too.
 */
import type { TextStyle } from "react-native";

/** The family App.tsx registers the 400Regular file under. */
export const PLEX_FAMILY = "IBM Plex Sans Arabic";

const PLEX_MEDIUM = "IBM Plex Sans Arabic-Medium";
export const PLEX_SEMIBOLD = "IBM Plex Sans Arabic-SemiBold";
export const PLEX_BOLD = "IBM Plex Sans Arabic-Bold";

/** Every registered family, for tooling/tests. */
export const PLEX_FAMILIES = [
  PLEX_FAMILY,
  PLEX_MEDIUM,
  PLEX_SEMIBOLD,
  PLEX_BOLD,
] as const;

type FontWeightToken = Exclude<TextStyle["fontWeight"], undefined>;

/** fontWeight (RN accepts "normal" | "bold" | "100"…"900") → family. */
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
