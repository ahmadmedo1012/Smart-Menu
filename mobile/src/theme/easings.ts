/**
 * r129-F5: the canonical Madarek easing scale as a JS module — the
 * cubic-bézier() strings 1:1 with madarek/frontend/src/styles/tokens.css
 * §1.7 (--ease/--ease-out/--ease-in/--ease-soft + the four spring tiers)
 * via the web bridge (src/app/globals.css §motion easings). The NativeWind
 * `transitionTimingFunction` map in tailwind.config.js mirrors the first
 * three (pinned since r127); this module is the full inline-style SSOT.
 *
 * RN has no CSS timing functions: consumers map a token to a Reanimated
 * easing config where an animation runs —
 *   import { Easing } from "react-native-reanimated";
 *   import { bezierPoints, easings } from "@/theme/easings";
 *   Easing.bezier(...bezierPoints(easings.out))   // == --ease-out
 * Existing primitives (PressableScale/useEnterFade keep their
 * Easing.out(Easing.cubic) refs — unchanged this round, additive only).
 *
 * Pinned by tests/design/parity.mjs (r128 section).
 */

/** The canonical béziers as CSS cubic-bezier() strings (pin-friendly). */
export const easings = {
  /** --ease — standard state ease. */
  DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** --ease-out — exponential settle. */
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** --ease-in — accelerate. */
  in: "cubic-bezier(0.7, 0, 0.84, 0)",
  /** --ease-soft — gentle emphasis. */
  soft: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** --ease-spring-soft — overshoot 1.18 (settle). */
  springSoft: "cubic-bezier(0.34, 1.18, 0.64, 1)",
  /** --ease-spring — overshoot 1.36 (pop). */
  spring: "cubic-bezier(0.34, 1.36, 0.64, 1)",
  /** --ease-bounce — overshoot 1.56. */
  bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** --ease-spring-snappy — the snappy tier. */
  springSnappy: "cubic-bezier(0.5, 1.6, 0.4, 1)",
} as const;

export type EasingToken = keyof typeof easings;

/**
 * Parse a canonical cubic-bezier() string into its four control points —
 * the bridge to `Easing.bezier(...points)` at animation call sites.
 * Returns the identity line (linear) for anything unparseable, never
 * throws (an animation token must not be able to crash a screen).
 */
export function bezierPoints(css: string): readonly [number, number, number, number] {
  const m = /cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/.exec(css);
  if (!m) return [0, 0, 1, 1];
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
}
