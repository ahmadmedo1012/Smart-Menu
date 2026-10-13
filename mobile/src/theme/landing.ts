/**
 * Phase 6 (P6-2-c): the «المائدة» landing layer — the mobile twin of the
 * web r142 Phase-5 landing world (src/app/landing.css §0, --sm-* token
 * block): warm cream paper, deep espresso ink, the ember (terracotta)
 * roster, dotted price leaders. The doubly-retired Orbit-Ink values
 * (ink #252A3E / lime #DFEDB2 / violet #7A6BF2) are gone — the landing now
 * paints the SAME culinary identity as the product world (one warm world,
 * the Phase-5 landing.css discipline «everything scoped under .landing»).
 * Export names follow the web --sm-* vocabulary (paper/ink/ember) — the
 * Orbit-Ink names (lime/violet/cream) retired with the values.
 *
 * Scope rule (mirrors the web's `.landing` R4 scoping): these tokens are
 * consumed ONLY by the landing-family screens/components
 * (screens/public/LandingScreen + components/landing/*). The product world
 * (Menu/Owner/Admin/Login/Pricing/…) keeps riding colors.ts.
 *
 * Mobile adaptations (audit r129-A8 §4 rulings, still in force):
 *   · clamp()/vw sizing  → landingH1Size below (the web clamp
 *     floor 2.6rem = 42px is the phone size; ≥768 rides 6.6vw capped at
 *     the 5.4rem mid-clamp).
 *   · --sm-h1-lh 1.14    → 1.18 on phones (the Arabic-leading rule the
 *     landing kept for tall-glyph Arabic display faces — Baloo 2 carries
 *     generous ascenders).
 *   · motion durations   → NO duplicates: reuse theme/motion rungs.
 *   · easings            → theme/easings.ts (the canonical cubic-béziers).
 *   · grain 0.05         → the --sm-grain-op paper tooth (token only; the
 *     veil itself is a documented follow-up like before).
 *
 * Pinned by tests/design/parity.mjs (the المائدة landing section).
 */

/** The المائدة token block — landing.css --sm-* values verbatim. */
export const landing = {
  /** --sm-paper — cream paper, the page's ground. */
  paper: "#F7F1E3",
  /** --sm-paper-2 — deeper paper step (bands, wells — the trust band ground). */
  paper2: "#EFE5D0",
  /** --sm-card — raised card surface. */
  card: "#FFFDF7",
  /** --sm-ink — deep espresso primary text · 14.1:1 on paper. */
  ink: "#2B2014",
  /** --sm-ink-dim — secondary text · 6.5:1 on paper. */
  inkDim: "#67523B",
  /** --sm-ember — terracotta accent, LARGE text (≥24px) + decor only · 4.46:1. */
  ember: "#C2452D",
  /** --sm-ember-ink — normal-size terracotta text · 5.62:1. */
  emberInk: "#A93A26",
  /** --sm-ember-deep — filled surfaces (paper-on-it 7.63:1). */
  emberDeep: "#8A2B1D",
  /** --sm-ember-bright — terracotta text on the espresso finale ground · 6.56:1. */
  emberBright: "#E89070",
  /** --sm-ember-soft — warm tint wash rgb(194 69 45 / 0.12). */
  emberSoft: "rgba(194,69,45,0.12)",
  /** --sm-line — hairline rgb(43 32 20 / 0.16). */
  line: "rgba(43,32,20,0.16)",
  /** --sm-line-soft — quieter hairline 0.08 (card borders). */
  lineSoft: "rgba(43,32,20,0.08)",
  /** --sm-line-strong — the dotted price leaders · rgb(43 32 20 / 0.30). */
  lineStrong: "rgba(43,32,20,0.30)",
  /** --sm-grain-op — paper tooth (the paper grain veil opacity). */
  grainOpacity: 0.05,
  /** --sm-dur-marquee — the one slow pass, 42s linear. */
  marqueeDurationMs: 42000,
  /** --press-scale — landing press recipe (product controls ride the same
   *  0.97 register; cards press 0.99 — --state-card-pressed-scale). */
  pressScale: 0.97,
  /** Hero h1 line-height — phone Arabic-leading rule (GAP-5 twin). */
  h1LineHeight: 1.18,
} as const;

export type LandingToken = keyof typeof landing;

/**
 * Hero h1 size per device width — the mobile form of
 * clamp(2.6rem, 6.6vw, 5.4rem): phones ride the clamp FLOOR (2.6rem = 42px),
 * ≥768 rides 6.6vw capped at the 5.4rem mid-clamp (86px). RN has no
 * clamp(); call sites pass useWindowDimensions().width.
 */
export function landingH1Size(width: number): number {
  if (width < 768) return 42;
  return Math.min(86, Math.round(width * 0.066));
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
