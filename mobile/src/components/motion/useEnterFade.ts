/**
 * r126-M4 (A6 P1-5): screen-content fade-in on the Madarek fast rung.
 *
 * `const entering = useEnterFade(); ... <View entering={entering}>` —
 * content fades in over 160ms (--t-fast). Returns undefined under
 * reduced-motion (content simply appears — the recommended behavior for
 * decorative entrances).
 *
 * Optional delayMs supports the --motion-stagger-step ladder (60ms steps,
 * cap 6) for list entrances.
 */
import { FadeIn } from "react-native-reanimated";

import { useReducedMotion } from "./useReducedMotion";
import { motion } from "@/theme/motion";

// r127-F8: rungs centralized in theme/motion (same values — zero behavior change).
export const ENTER_FADE_MS = motion.FAST; // --t-fast
export const STAGGER_STEP_MS = motion.STAGGER_STEP; // --motion-stagger-step

export function useEnterFade(delayMs = 0) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return undefined;
  return FadeIn.duration(ENTER_FADE_MS).delay(delayMs);
}
