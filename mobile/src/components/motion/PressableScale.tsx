/**
 * r126-M4 (A6 P1-5 + A6 P2-4), r130 W2-4: canonical press feedback.
 *
 * The app's 13 Pressables used three inconsistent opacity registers (0.7/
 * 0.8/0.9) with no scale and no duration. The Madarek ladder prescribes
 * --press-scale on the micro rung: scale 0.97 + a small opacity dip,
 * 80ms in / 160ms out, --ease-out. This wrapper is that rule as a component.
 *
 * Registers (tokens.css:163-175 "one press register" note):
 *   · controls (buttons/pills/CTAs) → default scaleTo 0.97 (--press-scale);
 *   · cards → pass scaleTo={0.99} (--state-card-pressed-scale, tokens.css:248);
 *   · only a bottom-nav thumb press may go stronger (0.93) — none here.
 *
 * Reduced motion (useReducedMotion): scale is dropped — press feedback
 * degrades to a plain opacity dip, which is not spatial movement.
 *
 * Also carries the app-wide a11y baseline: accessibilityRole="button" is
 * set unless the caller overrides it (cards/rows pass their own role).
 */
import React, { useEffect } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "./useReducedMotion";
import { motion } from "@/theme/motion";
import { bezierPoints, easings } from "@/theme/easings";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Madarek motion ladder rungs used here (centralized in theme/motion, r127-F8). */
export const PRESS_IN_MS = motion.MICRO; // --t-micro
export const PRESS_OUT_MS = motion.FAST; // --t-fast

/** --ease-out (tokens.css:129) — cubic-bezier(0.16, 1, 0.3, 1), via the
 * theme/easings SSOT (r130 W2-4; was Easing.out(Easing.cubic), the
 * (0.215, 0.61, 0.355, 1) easeOutCubic — a different, softer curve). */
const EASE_OUT = Easing.bezier(...bezierPoints(easings.out));

export interface PressableScaleProps extends PressableProps {
  /** Pressed scale factor. Controls (buttons/pills) default to the Madarek
   * --press-scale 0.97 (tokens.css:163); cards pass 0.99
   * (--state-card-pressed-scale, tokens.css:248). */
  scaleTo?: number;
  /** Press-in duration in ms (default 80, the ladder's micro rung). */
  pressDurationMs?: number;
  style?: StyleProp<ViewStyle>;
}

export function PressableScale({
  scaleTo = 0.97,
  pressDurationMs = PRESS_IN_MS,
  style,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityRole,
  ...props
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();

  // Shared values mirror the reduce-motion flag into the worklet so ONE
  // render path serves both modes (hooks must run unconditionally).
  const pressed = useSharedValue(0);
  const reduced = useSharedValue(false);
  useEffect(() => { reduced.value = reducedMotion; }, [reducedMotion, reduced]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    if (reduced.value) {
      // Reduced motion: no spatial scaling — a plain opacity dip only.
      return { opacity: 1 - pressed.value * 0.3 };
    }
    return {
      transform: [{ scale: 1 + pressed.value * (scaleTo - 1) }],
      opacity: 1 - pressed.value * 0.15,
    };
  });

  const pressIn: NonNullable<PressableProps["onPressIn"]> = (e) => {
    pressed.value = withTiming(1, { duration: pressDurationMs, easing: EASE_OUT });
    onPressIn?.(e);
  };
  const pressOut: NonNullable<PressableProps["onPressOut"]> = (e) => {
    pressed.value = withTiming(0, { duration: PRESS_OUT_MS, easing: EASE_OUT });
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? "button"}
      style={[style, animatedStyle]}
      {...props}
    />
  );
}
