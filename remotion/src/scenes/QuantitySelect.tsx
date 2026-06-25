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

  // Header fade
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Minus button
  const minusOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const minusScale = interpolate(frame, [15, 30], [0.5, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Counter animation: 1 -> 2 at frame 25
  const count = frame < 25 ? 1 : 2;
  const countScale = interpolate(
    frame,
    [20, 25, 30],
    [1, 1.4, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );

  // Plus button
  const plusOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const plusScale = interpolate(frame, [20, 35], [0.5, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Item name
  const itemOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Total price
  const totalOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const totalPrice = count * 42;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: arabicFont,
          fontSize: 18,
          fontWeight: 700,
          color: GOLD,
          opacity: headerOpacity,
        }}
      >
        اختر الكمية
      </div>

      {/* Item name */}
      <div
        style={{
          position: "absolute",
          top: "24%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: arabicFont,
          fontSize: 14,
          fontWeight: 400,
          color: "rgba(255,255,255,0.6)",
          opacity: itemOpacity,
        }}
      >
        كباب بندورة
      </div>

      {/* Quantity selector */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Minus button */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: `2px solid ${GOLD}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: minusOpacity,
            scale: `${minusScale}`,
            background: "rgba(212,168,83,0.1)",
          }}
        >
          <div style={{ color: GOLD, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
            -
          </div>
        </div>

        {/* Counter */}
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 48,
            fontWeight: 700,
            color: "#fff",
            scale: `${countScale}`,
          }}
        >
          {count}
        </div>

        {/* Plus button */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: `2px solid ${GOLD}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: plusOpacity,
            scale: `${plusScale}`,
            background: "rgba(212,168,83,0.1)",
          }}
        >
          <div style={{ color: GOLD, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
            +
          </div>
        </div>
      </div>

      {/* Total price */}
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: totalOpacity,
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          المجموع
        </div>
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: GOLD,
            marginTop: 4,
          }}
        >
          {totalPrice} SAR
        </div>
      </div>
    </AbsoluteFill>
  );
};
