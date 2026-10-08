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

export const ENTER_FADE_MS = 160; // --t-fast
export const STAGGER_STEP_MS = 60; // --motion-stagger-step

export function useEnterFade(delayMs = 0) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return undefined;
  return FadeIn.duration(ENTER_FADE_MS).delay(delayMs);
}
