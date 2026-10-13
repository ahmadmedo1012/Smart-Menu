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
import { motion } from "@/theme/motion";
import { bezierPoints, easings } from "@/theme/easings";

// r126-M9: dead variants dropped (flame/ghost/destructive/secondary had zero
// call sites — flame even rode the deleted bg-flame alias); `orange` renamed
// to `primary` (values were always the Madarek gold, the name was a leftover
// from the retired flame palette).
// Phase 6 (P6-2-c): the `whatsapp` variant joins — the checkout/confirm
// WhatsApp CTAs ride the BRAND green (reserved for WhatsApp exactly like
// the web sticky-cta twin; the terracotta primary stays the generic CTA).
const buttonVariants = cva(
  "flex items-center justify-center gap-2 rounded-md disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-500",
        outline: "border border-border bg-transparent",
        whatsapp: "bg-whatsapp",
      },
      size: {
        // r126-M6: fixed heights clipped labels at system fontScale ≥1.3 —
        // minHeight lets the button grow with the (capped) label font.
        // r133-F3 (A4 N4): the dead `sm` variant (min-h-9 = 36px, 8px under
        // the 44px touch floor every other control enforces) is deleted —
        // zero call sites since r126-M9's dead-variant sweep missed it.
        default: "min-h-11 px-5 py-3", lg: "min-h-14 px-8 py-3",
        icon: "min-h-11 min-w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

const buttonTextVariants = cva("font-semibold text-center font-sans", {
  variants: {
    variant: {
      // Culinary contract: white ink on terracotta (5.02:1); espresso ink on
      // outline; the WhatsApp TEXT ink (deep forest, web --whatsapp-ink) on
      // the brand green — never white-on-green.
      primary: "text-on-accent",
      outline: "text-foreground",
      whatsapp: "text-whatsapp-ink",
    },
    size: { default: "text-base", lg: "text-lg", icon: "text-base" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  title?: string;
  loading?: boolean;
}

/**
 * r126-M4 (A6 P1-5), r130 W2-4: canonical press feedback on the app's
 * most-used touchable — scale 0.97 (--press-scale, tokens.css:163; was the
 * off-canonical 0.98) + a small opacity dip, 80ms in / 160ms out (the
 * Madarek micro/fast rungs) on --ease-out. The animated Pressable keeps its
 * className styling via the same cssInterop bridge the app <Text> uses;
 * the reanimated style rides the merged style prop. Reduced motion →
 * opacity-only.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });

/** --ease-out (tokens.css:129) via the theme/easings SSOT — r130 W2-4. */
const EASE_OUT = Easing.bezier(...bezierPoints(easings.out));

export function Button({ variant, size, title, loading, children, className, disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const reduced = useSharedValue(false);
  useEffect(() => { reduced.value = reducedMotion; }, [reducedMotion, reduced]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    if (reduced.value) return { opacity: 1 - pressed.value * 0.25 };
    // 0.97 press register: 1 + (-0.03) = --press-scale (r130 W2-4).
    return { transform: [{ scale: 1 + pressed.value * -0.03 }], opacity: 1 - pressed.value * 0.1 };
  });

  return (
    <AnimatedPressable
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isDisabled}
      onPressIn={() => {
        if (isDisabled) return;
        // r127-F8: durations ride theme/motion (were raw 80/160 literals).
        pressed.value = withTiming(1, { duration: motion.MICRO, easing: EASE_OUT });
      }}
      onPressOut={() => { pressed.value = withTiming(0, { duration: motion.FAST, easing: EASE_OUT }); }}
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
          <ActivityIndicator size="small" color={variant === "outline" ? colors.terracotta : variant === "whatsapp" ? colors.whatsappInk : colors.onAccent} />
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
