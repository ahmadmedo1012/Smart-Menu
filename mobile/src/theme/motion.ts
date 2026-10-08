/**
 * r127-F8: the Madarek motion ladder — ONE source for every duration the
 * app animates with. Until now the rungs lived as scattered literals in the
 * four motion primitives (PressableScale 80/160, useEnterFade 160 + stagger
 * 60, AppBottomSheet 380, Button duplicated 80/160 as raw numbers,
 * FloatingWhatsApp 240) — correct values, but nothing kept them in sync.
 *
 * Values are 1:1 with the canonical web tokens (src/app/globals.css
 * §motion, itself the Madarek tokens.css port):
 *
 *   --t-micro  80ms   press-in, taps
 *   --t-fast   160ms  press-out, enter fades
 *   --t-base   240ms  standard transitions, FAB entrance
 *   --t-slow   380ms  sheets/modals enter+exit
 *   --t-slower 520ms  page-level reveals
 *   --t-cinema 720ms  hero/cinematic sequences
 *   --motion-stagger-step 60ms · --motion-stagger-cap 6
 *
 * Naming note: rung NAMES follow the canonical ladder exactly (cinema is
 * 720ms on the web too) — a local alias that shifted CINEMA to 520 would
 * collide with the web token of the same name. RN Easing objects stay where
 * they are used (PressableScale/AppBottomSheet own their Easing.out(cubic)
 * refs); this module centralizes DURATIONS only.
 *
 * Pinned by tests/design/parity.mjs (mobile parity harness, r127-F8).
 */

/** The canonical duration ladder (ms) + stagger grammar. */
export const motion = {
  /** --t-micro (80ms). */
  MICRO: 80,
  /** --t-fast (160ms). */
  FAST: 160,
  /** --t-base (240ms). */
  BASE: 240,
  /** --t-slow (380ms). */
  SLOW: 380,
  /** --t-slower (520ms). */
  SLOWER: 520,
  /** --t-cinema (720ms). */
  CINEMA: 720,
  /** --motion-stagger-step (60ms). */
  STAGGER_STEP: 60,
  /** --motion-stagger-cap (6). */
  STAGGER_CAP: 6,
} as const;

export type MotionToken = keyof typeof motion;
