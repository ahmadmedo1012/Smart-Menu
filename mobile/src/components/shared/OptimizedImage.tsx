import { View, type StyleProp, type ViewStyle } from "react-native";
import { Image as ExpoImage, type ImageProps } from "expo-image";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/api/client";

/**
 * P38 (C2 audit P0-3 — relative image URIs): demo/legacy rows store images
 * as root-relative paths ("/demo/xxx.webp" — the round-96 demo migration)
 * while production uploads are absolute URLs. A raw relative URI is not a
 * valid RN image source → the native app rendered NO images for exactly
 * the demo restaurants the landing page promotes. Resolve `/…` against
 * the API origin (the same origin the web <img> resolves against
 * implicitly on menu.smart-link.ly).
 */
function resolveImageUri(uri: string): string {
  if (uri.startsWith("/")) return `${API_BASE_URL}${uri}`;
  return uri;
}

/**
 * Phase 6 (P6-2-c): the warm food-imagery scrim — the RN twin of the web
 * Phase-5 `.warm-scrim*` grades (globals.css §signature): every
 * text-on-image photo bottoms into an ESPRESSO veil, never a cold black.
 * The ink is the espresso family (#1A110C — rgb(26 17 12)) so the wash
 * stays in-world in both themes; photos are photos.
 *
 * RN has no CSS gradient and expo-linear-gradient is not a dependency —
 * the gradient is approximated by FOUR stacked translucent bands with
 * interpolated alphas (0.55/0.16/… → four steps of the same curve,
 * documented deviation: the band edges are 1-2% opacity apart and
 * invisible on photography). Adding the gradient module stays a
 * documented follow-up; the OPTION + ink contract are what parity pins.
 */
type ScrimGrade = "base" | "strong" | "faint";

/** The web gradient stops per grade (bottom → 55% → transparent). */
const SCRIM_STOPS: Record<ScrimGrade, number[]> = {
  // .warm-scrim: 0.55 · 0.16 · 0
  base: [0.55, 0.38, 0.22, 0.1],
  // .warm-scrim-strong: 0.78 · 0.34 · 0
  strong: [0.78, 0.55, 0.33, 0.16],
  // .warm-scrim-faint: 0.18 · 0
  faint: [0.18, 0.12, 0.07, 0.03],
};

const SCRIM_INK = "#1A110C";

function WarmScrimOverlay({ grade }: { grade: ScrimGrade }) {
  const stops = SCRIM_STOPS[grade];
  return (
    // aria-hidden by construction: the scrim is decoration under the
    // overlaid TEXT node, which carries the semantics.
    <View accessibilityElementsHidden pointerEvents="none" style={{ position: "absolute", start: 0, end: 0, bottom: 0, height: "76%" }}>
      {stops.map((alpha, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            start: 0,
            end: 0,
            bottom: `${i * 19}%`,
            height: "19%",
            backgroundColor: SCRIM_INK,
            opacity: alpha,
          }}
        />
      ))}
    </View>
  );
}

export interface OptimizedImageProps extends Omit<ImageProps, "source"> {
  uri: string | null | undefined;
  blurhash?: string;
  className?: string;
  /**
   * The warm espresso scrim grade (web .warm-scrim twin) — renders the
   * image with an overlaid bottom veil for text-on-image heroes.
   * Omit for plain imagery (thumbs, logos — no veil).
   */
  scrim?: ScrimGrade;
}

export function OptimizedImage({ uri, blurhash, className, scrim, style, ...props }: OptimizedImageProps) {
  const src = uri ? resolveImageUri(uri) : null;
  if (scrim) {
    return (
      <View style={[{ overflow: "hidden" }, style as StyleProp<ViewStyle>]}>
        <ExpoImage
          source={src ? { uri: src } : undefined}
          placeholder={blurhash ? { blurhash } : undefined}
          transition={240}
          contentFit="cover"
          cachePolicy="memory-disk"
          className={cn("bg-muted w-full h-full", className)}
          style={{ width: "100%", height: "100%" }}
          {...props}
        />
        <WarmScrimOverlay grade={scrim} />
      </View>
    );
  }
  if (!src) return <ExpoImage className={cn("bg-muted", className)} style={style} {...props} />;
  return (
    <ExpoImage
      source={{ uri: src }}
      placeholder={blurhash ? { blurhash } : undefined}
      // r126-M4 (A6 P3-9): 300ms was off-ladder (between the 240 base and
      // 380 slow rungs) — snapped to the base rung, 240ms.
      transition={240}
      contentFit="cover"
      cachePolicy="memory-disk"
      className={cn("bg-muted", className)}
      style={style}
      {...props}
    />
  );
}
