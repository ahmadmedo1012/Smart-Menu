import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";
import { loadFont as loadReadex } from "@remotion/google-fonts/ReadexPro";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});
const { fontFamily: englishFont } = loadReadex("normal", {
  weights: ["300", "700"],
  subsets: ["latin"],
});

const GOLD = "oklch(0.72 0.14 75)";

export const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const subtitleOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const glowOpacity = interpolate(frame, [0, 20], [0, 0.5], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const sublineY = interpolate(frame, [30, 50], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* Glow behind title */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          opacity: glowOpacity,
          filter: "blur(60px)",
        }}
      />

        {/* Left accent line */}
        <div
        style={{
          position: "absolute",
          top: "38%",
          left: "50%",
          width: 2,
          height: 0,
          background: GOLD,
          transform: "translateX(-50%)",
          opacity: opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "calc(38% + 200px)",
          left: "50%",
          width: 2,
          height: 0,
          background: GOLD,
          transform: "translateX(-50%)",
          opacity: opacity,
        }}
      />

      {/* Main title - Arabic */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 96,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.2,
            letterSpacing: "0.02em",
          }}
        >
          الربط الذكي
        </div>

        {/* English subtitle */}
        <div
          style={{
            fontFamily: englishFont,
            fontSize: 28,
            fontWeight: 300,
            color: GOLD,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginTop: 20,
            opacity: subtitleOpacity,
            transform: `translateY(${sublineY}px)`,
          }}
        >
          Smart Menu
        </div>
      </div>

      {/* Gold accent line */}
      <div
        style={{
          position: "absolute",
          bottom: "22%",
          left: "50%",
          width: 80,
          height: 2,
          background: GOLD,
          transform: `translateX(-50%) scaleX(${opacity})`,
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};
