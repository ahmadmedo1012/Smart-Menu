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

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();

  // Gold bar animation
  const barScaleX = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const barOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Text fade up
  const textOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const textY = interpolate(frame, [15, 35], [30, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Subtext
  const subOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // CTA line reveal
  const ctaOpacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Rotating decorative ring
  const ringAngle = interpolate(frame, [0, 60], [0, 360], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.linear,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* Decorative rotating ring */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          border: `1px solid ${GOLD}`,
          transform: `translate(-50%, -50%) rotate(${ringAngle}deg)`,
          opacity: 0.15,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          border: `1px solid ${GOLD}`,
          transform: `translate(-50%, -50%) rotate(${-ringAngle * 0.7}deg)`,
          opacity: 0.08,
        }}
      />

      {/* Top gold bar */}
      <div
        style={{
          position: "absolute",
          top: "28%",
          left: "50%",
          width: 120,
          height: 2,
          background: GOLD,
          transform: `translateX(-50%) scaleX(${barScaleX})`,
          opacity: barOpacity,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          opacity: textOpacity,
          translate: `0 ${textY}px`,
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 72,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.3,
            letterSpacing: "0.02em",
          }}
        >
          Smart Menu
        </div>

        <div
          style={{
            fontFamily: englishFont,
            fontSize: 22,
            fontWeight: 300,
            color: GOLD,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginTop: 16,
            opacity: subOpacity,
          }}
        >
          Restaurant Management Reimagined
        </div>
      </div>

      {/* Bottom gold bar */}
      <div
        style={{
          position: "absolute",
          bottom: "28%",
          left: "50%",
          width: 80,
          height: 2,
          background: GOLD,
          transform: `translateX(-50%) scaleX(${barScaleX})`,
          opacity: barOpacity,
        }}
      />

      {/* Bottom tagline */}
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: ctaOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: englishFont,
            fontSize: 16,
            fontWeight: 300,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Experience the difference
        </div>
      </div>
    </AbsoluteFill>
  );
};
