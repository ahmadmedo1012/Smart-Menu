import { useEffect } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ActivityIndicator, Pressable, type PressableProps } from "react-native";
import { cssInterop } from "nativewind";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";

import { Text } from "@/components/ui/Text";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { colors } from "@/theme/colors";

// r126-M9: dead variants dropped (flame/ghost/destructive/secondary had zero
// call sites — flame even rode the deleted bg-flame alias); `orange` renamed
// to `primary` (values were always the Madarek gold, the name was a leftover
// from the retired flame palette).
const buttonVariants = cva(
  "flex items-center justify-center gap-2 rounded-md disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-500",
        outline: "border border-border bg-transparent",
      },
      size: {
        // r126-M6: fixed heights clipped labels at system fontScale ≥1.3 —
        // minHeight lets the button grow with the (capped) label font.
        sm: "min-h-9 px-3 py-2", default: "min-h-11 px-5 py-3", lg: "min-h-14 px-8 py-3",
        icon: "min-h-11 min-w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

const buttonTextVariants = cva("font-semibold text-center font-sans", {
  variants: {
    variant: {
      // Madarek: void ink #05070F rides the gold accent (dark --accent-fg) —
      // never white-on-accent.
      primary: "text-on-accent",
      outline: "text-foreground",
    },
    size: { sm: "text-sm", default: "text-base", lg: "text-lg", icon: "text-base" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  title?: string;
  loading?: boolean;
}

/**
 * r126-M4 (A6 P1-5): canonical press feedback on the app's most-used
 * touchable — scale 0.98 + a small opacity dip, 80ms in / 160ms out (the
 * Madarek micro/fast rungs). The animated Pressable keeps its className
 * styling via the same cssInterop bridge the app <Text> uses; the reanimated
 * style rides the merged style prop. Reduced motion → opacity-only.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });

export function Button({ variant, size, title, loading, children, className, disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const reduced = useSharedValue(false);
  useEffect(() => { reduced.value = reducedMotion; }, [reducedMotion, reduced]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    if (reduced.value) return { opacity: 1 - pressed.value * 0.25 };
    return { transform: [{ scale: 1 + pressed.value * -0.02 }], opacity: 1 - pressed.value * 0.1 };
  });

  return (
    <AnimatedPressable
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isDisabled}
      onPressIn={() => {
        if (isDisabled) return;
        pressed.value = withTiming(1, { duration: 80, easing: Easing.out(Easing.cubic) });
      }}
      onPressOut={() => { pressed.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) }); }}
      style={animatedStyle}
      // r126 (A6 P2-7): TalkBack/VoiceOver announced buttons as bare labels.
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        // r126 (A6 P2-5): a literal "…" carried no activity indication —
        // a real spinner rides the (still visible) label.
        <>
          <ActivityIndicator size="small" color={variant === "outline" ? colors.gold : colors.void} />
          <Text className={buttonTextVariants({ variant, size })} maxFontSizeMultiplier={1.4}>{title}</Text>
        </>
      ) : children ?? (
        <Text
          className={buttonTextVariants({ variant, size })}
          // r126-M6: dense control text — cap dynamic type so pill/button
          // labels grow with the user's font size without exploding layout.
          maxFontSizeMultiplier={1.4}
        >
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
}
