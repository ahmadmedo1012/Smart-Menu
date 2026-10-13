/**
 * r129-F5 → Phase 6 (P6-2-c): the landing pill family — the RN twin of the
 * web .ln-btn-ember/.ln-btn-ghost (landing.css §4, المائدة buttons):
 *
 *   ember = flat ember-DEEP fill + paper text (7.63:1 — the ONE
 *           ember-filled surface on the page);
 *   ghost = transparent, 1px espresso hairline (rgb(43 32 20 / 0.34)),
 *           ink text — hover tint never an ember fill (ember roster
 *           discipline);
 *   heights 46 (md) / 48 (xl — also the <640px WCAG 2.5.5 touch floor);
 *   press = scale 0.97 on the micro rung (--press-scale, the landing
 *           register; product controls ride the SAME 0.97 since r130 W2-4,
 *           product cards press 0.99 — --state-card-pressed-scale).
 *
 * RN adaptations: one drop shadow instead of the 3-layer web stack (the
 * outer 1px ring layer has no RN equivalent); hover states don't exist on
 * touch (pressed carries the feedback via PressableScale); ghost's
 * letter-spacing is sub-pixel at 15px and omitted.
 */
import React from "react";
import { View, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/motion/PressableScale";
import { Text } from "@/components/ui/Text";
import { landing } from "@/theme/landing";
import { radius } from "@/theme/radius";

/** .ln-btn-gold / .ln-btn-ghost min-block-size (46px desktop pills). */
export const LANDING_PILL_HEIGHT = 46;
/** .xl variant + the <640px WCAG touch floor (48px). */
export const LANDING_PILL_HEIGHT_XL = 48;
/** .ln-btn-ghost border — rgb(43 32 20 / 0.34), the espresso hairline. */
const GHOST_BORDER = "rgba(43,32,20,0.34)";

export interface LandingPillProps {
  /** "ember" = ember-deep fill (the conversion pill); "ghost" = hairline outline. */
  variant?: "ember" | "ghost";
  /** md = 46px inline pill; xl = 48px (hero CTAs — the touch floor). */
  size?: "md" | "xl";
  label: string;
  onPress?: () => void;
  /** Optional trailing glyph (arrow / retry spinner) — cream-dim 16px. */
  icon?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

export function LandingPill({
  variant = "ember",
  size = "md",
  label,
  onPress,
  icon,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: LandingPillProps) {
  const ember = variant === "ember";
  const xl = size === "xl";
  const base: ViewStyle = {
    minHeight: xl ? LANDING_PILL_HEIGHT_XL : LANDING_PILL_HEIGHT,
    borderRadius: radius.pill,
    paddingHorizontal: xl ? 34 : 26,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    // ember: flat ember-deep + paper (7.63:1). ghost: transparent + hairline
    // (never ember).
    backgroundColor: ember ? landing.emberDeep : "transparent",
    borderWidth: ember ? 0 : 1,
    borderColor: ember ? "transparent" : GHOST_BORDER,
    // one subtle drop layer (web's 3-layer stack + ring has no RN form) —
    // espresso dust, the warm shadow family (rgb(43 32 20 / …)).
    shadowColor: landing.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: ember ? 6 : 2,
    shadowOpacity: ember ? 0.12 : 0.08,
    elevation: ember ? 2 : 1,
    opacity: disabled ? 0.5 : 1,
    ...(fullWidth ? { alignSelf: "stretch" } : null),
  };

  return (
    <PressableScale
      // the landing press register — 0.97, micro rung in / fast out
      // (PressableScale default durations already ride the ladder).
      scaleTo={landing.pressScale}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={base}
    >
      <Text
        style={{
          fontFamily: "IBM Plex Sans Arabic",
          fontSize: xl ? 16 : 15,
          fontWeight: "600",
          color: ember ? landing.paper : landing.ink,
          textAlign: "center",
        }}
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>
      {icon != null ? <View style={{ opacity: 0.85 }}>{icon}</View> : null}
    </PressableScale>
  );
}
