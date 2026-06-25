import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";

export const PhoneFrame: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const scale = interpolate(frame, [0, 30], [0.85, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const titleOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const subtitleOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          opacity: opacity,
          filter: "blur(80px)",
        }}
      />

      {/* Phone frame */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          opacity,
        }}
      >
        <div
          style={{
            width: 180,
            height: 320,
            borderRadius: 28,
            border: `2px solid ${GOLD}`,
            background:
              "linear-gradient(180deg, rgba(212,168,83,0.12) 0%, rgba(0,0,0,0.9) 100%)",
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 0 40px rgba(212,168,83,0.15)`,
          }}
        >
          {/* Screen content */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Status bar */}
            <div
              style={{
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: GOLD, opacity: 0.3 }} />
              <div
                style={{
                  fontFamily: arabicFont,
                  fontSize: 10,
                  color: "#fff",
                  opacity: 0.4,
                }}
              >
                Smart Menu
              </div>
            </div>

            {/* Restaurant header */}
            <div
              style={{
                padding: "8px 14px 4px",
                opacity: titleOpacity,
              }}
            >
              <div
                style={{
                  fontFamily: arabicFont,
                  fontSize: 14,
                  fontWeight: 700,
                  color: GOLD,
                  textAlign: "right",
                }}
              >
                مطعم الذهبي
              </div>
              <div
                style={{
                  fontFamily: arabicFont,
                  fontSize: 8,
                  color: "rgba(255,255,255,0.3)",
                  textAlign: "right",
                  marginTop: 2,
                }}
              >
                المأكولات العربية
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                margin: "6px 14px",
                height: 1,
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                opacity: subtitleOpacity,
              }}
            />
          </div>

          {/* Screen shine */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* "المطعم الذهبي" label below phone */}
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          left: "50%",
          transform: `translateX(-50%) scale(${opacity})`,
          fontFamily: arabicFont,
          fontSize: 20,
          fontWeight: 400,
          color: GOLD,
          letterSpacing: "0.05em",
          opacity: subtitleOpacity,
        }}
      >
        المطعم الذهبي
      </div>
    </AbsoluteFill>
  );
};
