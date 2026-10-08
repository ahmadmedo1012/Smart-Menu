/**
 * r129-F5: the Orbit-Ink pill button family — the RN twin of the web
 * .ln-btn-gold/.ln-btn-ghost (landing.css §4, Madarek buttons verbatim):
 *
 *   gold  = flat lime fill + ink text, the ONE lime-filled surface;
 *   ghost = transparent, 1px cream hairline (rgb(245 243 231 / 0.34)),
 *           cream text — hover tint never a lime fill (roster discipline);
 *   heights 46 (md) / 48 (xl — also the <640px WCAG 2.5.5 touch floor);
 *   press = scale 0.97 on the micro rung (--press-scale, the landing
 *           register; product controls ride the SAME 0.97 since r130 W2-4,
 *           product cards press 0.99 — --state-card-pressed-scale).
 *
 * RN adaptations: one drop shadow instead of the 3-layer web stack (the
 * outer 1px ring layer has no RN equivalent — flat surfaces are the kit
 * §7 look anyway); hover states don't exist on touch (pressed carries the
 * feedback via PressableScale); ghost's 0.01em letter-spacing is sub-pixel
 * at 15px and omitted.
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
/** .ln-btn-ghost border — rgb(245 243 231 / 0.34), web literal. */
const GHOST_BORDER = "rgba(245,243,231,0.34)";

export interface LandingPillProps {
  /** "gold" = lime fill (the conversion pill); "ghost" = hairline outline. */
  variant?: "gold" | "ghost";
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
  variant = "gold",
  size = "md",
  label,
  onPress,
  icon,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: LandingPillProps) {
  const gold = variant === "gold";
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
    // gold: flat lime + ink. ghost: transparent + hairline (never lime).
    backgroundColor: gold ? landing.lime : "transparent",
    borderWidth: gold ? 0 : 1,
    borderColor: gold ? "transparent" : GHOST_BORDER,
    // one subtle drop layer (web's 3-layer stack + ring has no RN form)
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: gold ? 6 : 2,
    shadowOpacity: gold ? 0.12 : 0.08,
    elevation: gold ? 2 : 1,
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
          color: gold ? landing.ink : landing.cream,
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
