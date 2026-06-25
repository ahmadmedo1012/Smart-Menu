import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";

export const QuantitySelect: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Item name
  const itemOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Minus button
  const minusOpacity = interpolate(frame, [12, 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const minusScale = interpolate(frame, [12, 25], [0.3, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Counter: 1 → 2 at frame 28
  const count = frame < 28 ? 1 : 2;
  const countBounce = interpolate(
    frame,
    [23, 28, 33],
    [1, 1.5, 1],
    {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    },
  );

  // Plus button
  const plusOpacity = interpolate(frame, [18, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const plusScale = interpolate(frame, [18, 30], [0.3, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Total price fade
  const totalOpacity = interpolate(frame, [30, 42], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Quantity line shimmer
  const shimmer = interpolate(frame, [0, 50], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const total = count * 30;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: 20,
          right: 20,
          textAlign: "center",
          opacity: headerOpacity,
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 20,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          اختر الكمية
        </div>
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginTop: 2,
          }}
        >
          كباب بندورة
        </div>
      </div>

      {/* Quantity selector */}
      <div
        style={{
          position: "absolute",
          top: "46%",
          left: 20,
          right: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        {/* Minus */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: `2px solid ${GOLD}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: minusOpacity,
            scale: `${minusScale}`,
            background: "rgba(212,168,83,0.06)",
            cursor: "pointer",
          }}
        >
          <div style={{ color: GOLD, fontSize: 26, fontWeight: 300, lineHeight: 1, marginTop: -2 }}>
            −
          </div>
        </div>

        {/* Count */}
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 52,
            fontWeight: 700,
            color: "#fff",
            scale: `${countBounce}`,
            minWidth: 60,
            textAlign: "center",
            direction: "ltr",
          }}
        >
          {count}
        </div>

        {/* Plus */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: `2px solid ${GOLD}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: plusOpacity,
            scale: `${plusScale}`,
            background: `radial-gradient(circle, ${GOLD}22, rgba(212,168,83,0.06))`,
            cursor: "pointer",
          }}
        >
          <div style={{ color: GOLD, fontSize: 26, fontWeight: 300, lineHeight: 1 }}>
            +
          </div>
        </div>
      </div>

      {/* Total price */}
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          left: 20,
          right: 20,
          textAlign: "center",
          opacity: totalOpacity,
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginBottom: 6,
          }}
        >
          المجموع
        </div>
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 36,
            fontWeight: 700,
            color: GOLD,
            direction: "ltr",
          }}
        >
          {total} د.ل
        </div>
      </div>

      {/* Gold accent line — bottom */}
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          left: "30%",
          right: "30%",
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}33, transparent)`,
          opacity: shimmer,
        }}
      />
    </AbsoluteFill>
  );
};
