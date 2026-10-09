import { useEffect, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";

/**
 * r132-F2b (A4 S1, r131 fleet ruling "skeleton 1200 linear + RM kill"): the
 * family shape-skeleton primitive — the mobile twin of the web .skeleton
 * (globals.css §skeleton: muted→border gradient sweep, 1200ms LINEAR loop)
 * and SO's skeleton family. Loading states fake the LOADED LAYOUT's shapes
 * instead of a centered spinner, so the first paint communicates page
 * structure (the money-path list skeleton is MenuScreen's).
 *
 * The sweep: the web gradient's lighter stop (var(--border) over
 * var(--muted)) becomes a hairline-tinted band translating across the
 * surface2 base — RN has no background-position animation and
 * expo-linear-gradient is not a dependency, so the band IS the gradient's
 * border-colored middle, looped 1200ms linear (ease-in-out would pulse the
 * sweep velocity at every iteration boundary — exactly what the fleet
 * ruling retires).
 *
 * Reduced motion (the RM half of the ruling; the web zeroes
 * --motion-duration-skeleton): the loop driver resolves to 0 — the band
 * parks off-box and the placeholder is a static surface2 shape, no
 * movement. The shared-value driver follows the PressableScale/Button
 * reanimated idiom (the app's established motion pattern).
 */
export function Skeleton({
  width,
  height,
  borderRadius = radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  // Measured box width drives the sweep translateX (a % width or a flexed
  // parent cannot feed the worklet a number); state so the worklet rebuilds
  // on layout without a mutation-in-handler.
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    progress.value = reducedMotion
      ? 0 // RM kill — see the header
      : withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [reducedMotion, progress]);

  const sweep = useAnimatedStyle(() => {
    "worklet";
    const w = boxWidth;
    if (w === 0) return { transform: [{ translateX: -1000 }] };
    const band = w * 0.35;
    return { transform: [{ translateX: -band + progress.value * (w + band) }] };
  });

  return (
    <View
      onLayout={(e) => { setBoxWidth(e.nativeEvent.layout.width); }}
      style={[{ width, height, borderRadius, backgroundColor: colors.surface2, overflow: "hidden" }, style]}
    >
      <Animated.View
        style={[{ position: "absolute", top: 0, bottom: 0, start: 0, width: "35%", backgroundColor: colors.hairline }, sweep]}
      />
    </View>
  );
}
