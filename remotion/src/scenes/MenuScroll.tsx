import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";

const menuItems = [
  { ar: "شاورما دجاج", en: "Chicken Shawarma", price: "35 SAR" },
  { ar: "كباب بندورة", en: "Tomato Kebab", price: "42 SAR" },
  { ar: "فتوش", en: "Fattoush", price: "18 SAR" },
  { ar: "عصير ليمون", en: "Lemon Juice", price: "12 SAR" },
];

export const MenuScroll: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Scene label */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: arabicFont,
          fontSize: 18,
          fontWeight: 700,
          color: GOLD,
          letterSpacing: "0.1em",
          opacity: 0.8,
        }}
      >
        قائمة الطعام
      </div>
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Menu
      </div>

      {/* Menu items */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: "65%",
        }}
      >
        {menuItems.map((item, i) => {
          const stagger = i * 8;
          const itemOpacity = interpolate(frame, [stagger, stagger + 12], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const itemY = interpolate(frame, [stagger, stagger + 12], [30, 0], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "row-reverse",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid rgba(212,168,83,0.2)`,
                background: "rgba(255,255,255,0.03)",
                opacity: itemOpacity,
                translate: `0 ${itemY}px`,
              }}
            >
              {/* Price */}
              <div
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 12,
                  color: GOLD,
                  fontWeight: 700,
                }}
              >
                {item.price}
              </div>
              {/* Name */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: arabicFont,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1.3,
                  }}
                >
                  {item.ar}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.05em",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {item.en}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
