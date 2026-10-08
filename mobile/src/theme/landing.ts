/**
 * r129-F5: the «Orbit Ink» landing layer — the r128 web grammar
 * (src/app/landing.css §1, itself the Madarek landing port) as typed RN
 * constants.
 *
 * Scope rule (mirrors the web's `.landing` R4 scoping): these tokens are
 * consumed ONLY by the landing-family screens/components
 * (screens/public/LandingScreen + components/landing/*). The product world
 * (Menu/Owner/Admin/Login/Pricing/…) keeps riding colors.ts night/sand/gold
 * — the landing intentionally paints Orbit-Ink in BOTH web themes and the
 * one mobile world, and nothing else.
 *
 * Mobile adaptations (audit r129-A8 §4 rulings):
 *   · clamp()/vw sizing  → SKIP; useWindowDimensions breakpoints
 *     (landingH1Size below — the web clamp floor 2.75rem=44px is the phone
 *     size, mid-clamp 56px the tablet size).
 *   · --ln-h1-lh 1.04    → 1.18 on phones (web's own ≤768 Arabic-leading
 *     rule, landing.css GAP-5) — h1LineHeight below.
 *   · motion durations   → NO duplicates: reuse theme/motion rungs
 *     (--ln-t-fast/base/slow/cinema are aliases of the same ladder).
 *   · easings            → theme/easings.ts (the canonical cubic-béziers).
 *   · grain 0.075        → the r129 fleet ruling (canonical landing.css:58
 *     P3-22 local lift; SmartBot r129-F3 pinned the same value). The veil
 *     itself (200px noise tile) lands in P3 — the token ships now.
 *
 * Pinned by tests/design/parity.mjs (mobile parity harness, r128 section).
 */

/** The Orbit-Ink token block — landing.css:26-53 verbatim values. */
export const landing = {
  /** --ln-ink — primary flat ground. */
  ink: "#252A3E",
  /** --ln-ink-2 — darker step, scene separation (trust band ground). */
  ink2: "#1C2032",
  /** --ln-cream — primary text on ink, 12.75:1 AAA. */
  cream: "#F5F3E7",
  /** --ln-cream-dim — secondary text, 8.26:1 AAA. */
  creamDim: "#C9C6B4",
  /** --ln-lime — accent 1 (pistachio). The hero's ONE accent word. */
  lime: "#DFEDB2",
  /** --ln-lime-deep — hover/active lime, 8.82:1. */
  limeDeep: "#B9D778",
  /** --ln-violet — accent 2, large-text/accent only. */
  violet: "#7A6BF2",
  /** --ln-violet-deep — decorative depth fills only. */
  violetDeep: "#4E2FB8",
  /** --ln-line — hairline rgba(245,243,231,0.14). */
  line: "rgba(245,243,231,0.14)",
  /** --ln-line-soft — quieter hairline 0.07 (card borders). */
  lineSoft: "rgba(245,243,231,0.07)",
  /** Station/role card fill — cream at 3% (landing.css station recipe). */
  card: "rgba(245,243,231,0.03)",
  /** --ln-grain-op — film-grain veil opacity (r129 fleet ruling 0.075). */
  grainOpacity: 0.075,
  /** --ln-dur-marquee — the one slow pass, 42s linear. */
  marqueeDurationMs: 42000,
  /** --press-scale — landing press recipe (product press is 0.98). */
  pressScale: 0.97,
  /** Hero h1 line-height — the web ≤768 Arabic-leading rule (GAP-5). */
  h1LineHeight: 1.18,
} as const;

export type LandingToken = keyof typeof landing;

/**
 * Hero h1 size per device width — the mobile form of
 * clamp(2.75rem, 8.2vw, 6.75rem): phones ride the clamp FLOOR (44px),
 * tablets the mid-clamp (56px). RN has no clamp(); call sites pass
 * useWindowDimensions().width.
 */
export function landingH1Size(width: number): number {
  return width >= 768 ? 56 : 44;
}

/* ── the mono machine voice (--ln-mono, landing.css:64/103-111) ──────────
   Latin runs + numerals render IBM Plex Mono; Arabic runs continue in the
   brand sans (RN fontFamily fallback chain does the per-glyph split).
   The two faces register in App.tsx (Font.loadAsync) + app.json expo-font. */
export const LANDING_MONO_FAMILY = "IBM Plex Mono";
export const LANDING_MONO_FALLBACK = "IBM Plex Sans Arabic";
/** .ln-mono font-size (12px). */
export const LANDING_MONO_SIZE = 12;
/** .ln-mono letter-spacing (0.08em — the mono voice tracks wide). */
export const LANDING_MONO_TRACKING = 0.08;
