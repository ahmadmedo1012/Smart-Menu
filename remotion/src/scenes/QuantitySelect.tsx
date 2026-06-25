import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"], subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";

export const QuantitySelect: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Minus button — slow entrance
  const minusOpacity = interpolate(frame, [18, 38], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const minusScale = interpolate(frame, [18, 38], [0.3, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Counter: 1 → 2 at frame 42
  const count = frame < 42 ? 1 : 2;
  const countBounce = interpolate(frame, [35, 42, 49], [1, 1.5, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Plus button
  const plusOpacity = interpolate(frame, [28, 46], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const plusScale = interpolate(frame, [28, 46], [0.3, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Total price
  const totalOpacity = interpolate(frame, [46, 65], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const shimmer = interpolate(frame, [0, 85], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  const total = count * 30;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Header */}
      <div style={{ position: "absolute", top: "12%", left: 20, right: 20, textAlign: "center", opacity: headerOpacity }}>
        <div style={{ fontFamily: arabicFont, fontSize: 20, fontWeight: 700, color: "#fff" }}>اختر الكمية</div>
        <div style={{ fontFamily: arabicFont, fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>كباب بندورة</div>
      </div>

      {/* Quantity row */}
      <div style={{ position: "absolute", top: "46%", left: 20, right: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{
          width: 50, height: 50, borderRadius: "50%", border: `2px solid ${GOLD}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: minusOpacity, scale: `${minusScale}`,
          background: "rgba(212,168,83,0.06)",
        }}>
          <div style={{ color: GOLD, fontSize: 26, fontWeight: 300, lineHeight: 1, marginTop: -2 }}>−</div>
        </div>
        <div style={{
          fontFamily: "system-ui, sans-serif", fontSize: 52, fontWeight: 700, color: "#fff",
          scale: `${countBounce}`, minWidth: 60, textAlign: "center", direction: "ltr",
        }}>
          {count}
        </div>
        <div style={{
          width: 50, height: 50, borderRadius: "50%", border: `2px solid ${GOLD}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: plusOpacity, scale: `${plusScale}`,
          background: `radial-gradient(circle, ${GOLD}22, rgba(212,168,83,0.06))`,
        }}>
          <div style={{ color: GOLD, fontSize: 26, fontWeight: 300, lineHeight: 1 }}>+</div>
        </div>
      </div>

      {/* Total */}
      <div style={{ position: "absolute", bottom: "20%", left: 20, right: 20, textAlign: "center", opacity: totalOpacity }}>
        <div style={{ fontFamily: arabicFont, fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>المجموع</div>
        <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 36, fontWeight: 700, color: GOLD, direction: "ltr" }}>
          {total} د.ل
        </div>
      </div>

      {/* Gold accent */}
      <div style={{
        position: "absolute", bottom: "12%", left: "30%", right: "30%", height: 1,
        background: `linear-gradient(90deg, transparent, ${GOLD}33, transparent)`,
        opacity: shimmer,
      }} />
    </AbsoluteFill>
  );
};
