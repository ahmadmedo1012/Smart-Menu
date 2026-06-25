import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Img,
  staticFile,
} from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";

export const SceneProductShowcase: React.FC = () => {
  const frame = useCurrentFrame();

  // Phone entrance
  const phoneScale = interpolate(frame, [0, 30], [0.7, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const phoneOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const phoneY = interpolate(frame, [0, 30], [60, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Features fade in sequentially
  const feature1Opacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const feature2Opacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const feature3Opacity = interpolate(frame, [65, 85], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Pulse glow
  const pulse = interpolate(frame, [0, 60, 120], [0.3, 0.7, 0.3], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.sin,
  });

  const features = [
    { text: "قائمة طعام رقمية", en: "Digital Menu" },
    { text: "طلب سريع", en: "Quick Order" },
    { text: "دفع إلكتروني", en: "E-Payment" },
  ];

  const featureOpacities = [feature1Opacity, feature2Opacity, feature3Opacity];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          opacity: pulse * 0.3,
          filter: "blur(80px)",
        }}
      />

      {/* Phone mockup */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "30%",
          transform: `translate(-50%, -50%) scale(${phoneScale})`,
          opacity: phoneOpacity,
          translate: `0 ${phoneY}px`,
        }}
      >
        {/* Phone frame */}
        <div
          style={{
            width: 140,
            height: 280,
            borderRadius: 24,
            border: `2px solid ${GOLD}`,
            background:
              "linear-gradient(180deg, rgba(212,168,83,0.15) 0%, rgba(0,0,0,0.8) 100%)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 60px rgba(212,168,83,0.2)",
          }}
        >
          {/* Screen content dots */}
          <div
            style={{
              position: "absolute",
              top: 30,
              left: 12,
              right: 12,
              bottom: 30,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {[0.7, 0.5, 0.6, 0.4].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 6,
                  width: `${w * 100}%`,
                  background: `rgba(212,168,83,${0.3 + i * 0.1})`,
                  borderRadius: 3,
                }}
              />
            ))}
            {/* Menu items */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: "rgba(212,168,83,0.2)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2 }} />
                <div style={{ width: 16, height: 4, background: GOLD, borderRadius: 2, opacity: 0.6 }} />
              </div>
            ))}
          </div>
          {/* Screen shine */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)",
            }}
          />
        </div>
      </div>

      {/* Feature list - right side */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: "8%",
          transform: "translateY(-50%)",
          textAlign: "right",
        }}
      >
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              opacity: featureOpacities[i],
              marginBottom: 28,
            }}
          >
            {/* Gold bullet */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: GOLD,
                marginLeft: "auto",
                marginBottom: 8,
              }}
            />
            <div
              style={{
                fontFamily: arabicFont,
                fontSize: 36,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.3,
              }}
            >
              {f.text}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 300,
                color: GOLD,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {f.en}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
