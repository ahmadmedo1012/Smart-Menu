/**
 * The app-wide <Text> — a drop-in replacement for the RN core Text that
 * fixes two systemic gaps without touching a single call site:
 *
 * 1. r126-M1 (A6 P1-2, bold rendering): every IBM Plex weight lives in its
 *    OWN registered family, so a numeric `fontWeight` on the 400-only base
 *    family never rendered bold on iOS. This wrapper resolves the final
 *    style (inline OR NativeWind-computed — see the cssInterop registration
 *    below) and swaps in the per-weight family. See src/theme/typography.ts.
 *
 * 2. r126-M6 (A6 P1-7, dynamic type): font scaling stays ON (RN default);
 *    dense controls (buttons, pills, chips) opt into `maxFontSizeMultiplier`
 *    at their call sites while fixed-height boxes are converted to
 *    minHeight elsewhere — so larger system fonts grow the UI instead of
 *    clipping mid-word.
 *
 * Import this instead of `Text` from "react-native" (the codemod already
 * did): every prop behaves identically.
 */
import {
  Text as RNText,
  StyleSheet,
  type TextProps,
  type TextStyle,
} from "react-native";
import { cssInterop } from "nativewind";

import { resolvePlexFamily } from "@/theme/typography";

export interface AppTextProps extends TextProps {
  /** React 19 passes refs as regular props — keep <Text ref> working. */
  ref?: React.Ref<RNText>;
}

export function Text({ style, ...props }: AppTextProps) {
  // Flatten arrays (NativeWind hands cssInterop styles down as an array
  // entry) so fontWeight/fontFamily from ANY style layer is visible.
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const resolved = resolvePlexFamily(flattened?.fontFamily, flattened?.fontWeight);
  return (
    <RNText
      style={resolved ? [style, { fontFamily: resolved }] : style}
      {...props}
    />
  );
}

// NativeWind bridge: `className` on this custom component is converted into
// the same `style` prop the resolver already reads — so Tailwind
// `font-semibold` / `font-bold` classes get real Plex SemiBold/Bold too
// (previously the same 400-only-family bug through the NativeWind path).
cssInterop(Text, { className: "style" });
