import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";

export const ItemSelection: React.FC = () => {
  const frame = useCurrentFrame();

  // Highlight pulse
  const highlightPulse = interpolate(
    frame,
    [0, 15, 30, 45],
    [0.3, 1, 0.3, 1],
    {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
      easing: Easing.sin,
    },
  );

  // Detail card expansion
  const cardScale = interpolate(frame, [10, 30], [0.8, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const cardOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Detail text fade in
  const detailOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: arabicFont,
          fontSize: 16,
          fontWeight: 700,
          color: GOLD,
          opacity: 0.6,
        }}
      >
        اختر صنفك
      </div>

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "row",
          gap: 30,
          alignItems: "center",
        }}
      >
        {/* Collapsed items (placeholder) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            opacity: 0.3,
          }}
        >
          {["شاورما دجاج", "فتوش", "عصير ليمون"].map((name, i) => (
            <div
              key={i}
              style={{
                width: 100,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(212,168,83,0.15)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  fontFamily: arabicFont,
                  fontSize: 10,
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                {name}
              </div>
            </div>
          ))}
        </div>

        {/* Selected item - كباب بندورة */}
        <div
          style={{
            scale: `${cardScale}`,
            opacity: cardOpacity,
          }}
        >
          <div
            style={{
              width: 160,
              padding: "16px 20px",
              borderRadius: 16,
              border: `2px solid ${GOLD}`,
              background: `rgba(212,168,83,0.08)`,
              boxShadow: `0 0 30px rgba(212,168,83,${highlightPulse * 0.2})`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: arabicFont,
                fontSize: 20,
                fontWeight: 700,
                color: GOLD,
                lineHeight: 1.3,
              }}
            >
              كباب بندورة
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.1em",
                marginTop: 4,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Tomato Kebab
            </div>

            {/* Detail section */}
            <div
              style={{
                opacity: detailOpacity,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid rgba(212,168,83,0.2)`,
              }}
            >
              <div
                style={{
                  fontFamily: arabicFont,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.5,
                }}
              >
                لحم مفروم مع البندورة والبهارات
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: GOLD,
                }}
              >
                42 SAR
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
