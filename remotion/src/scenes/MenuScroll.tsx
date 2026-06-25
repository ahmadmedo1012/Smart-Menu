import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";

const CATEGORIES = [
  { ar: "جميع الأصناف", en: "All Items" },
  { ar: "مشاوي", en: "Grill", active: true },
  { ar: "مقبلات", en: "Appetizers" },
  { ar: "مشروبات", en: "Drinks" },
];

const menuItems = [
  { ar: "شاورما دجاج", en: "Chicken Shawarma", price: "25", desc: "خبز صاج • ثوم • مخلل" },
  { ar: "كباب بندورة", en: "Tomato Kebab", price: "30", desc: "لحم مفروم • بندورة • بصل" },
  { ar: "فتوش", en: "Fattoush", price: "15", desc: "خس • بندورة • نعناع • خبز" },
  { ar: "عصير ليمون", en: "Lemon Juice", price: "12", desc: "ليمون طازج • نعناع" },
];

export const MenuScroll: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Category tabs slide in
  const tabsY = interpolate(frame, [5, 18], [15, 0], {
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
          left: 20,
          right: 20,
          textAlign: "right",
          opacity: headerOpacity,
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          قائمة الطعام
        </div>
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            marginTop: 2,
          }}
        >
          اختر من أصنافنا الطازجة
        </div>
      </div>

      {/* Category tabs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: 20,
          right: 20,
          display: "flex",
          gap: 6,
          overflow: "hidden",
          translate: `0 ${tabsY}px`,
          opacity: headerOpacity,
        }}
      >
        {CATEGORIES.map((cat, i) => {
          const tabOpacity = interpolate(frame, [5 + i * 2, 15 + i * 2], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                background: cat.active ? GOLD : "rgba(255,255,255,0.04)",
                border: cat.active ? "none" : "1px solid rgba(255,255,255,0.08)",
                fontFamily: arabicFont,
                fontSize: 11,
                fontWeight: 700,
                color: cat.active ? "#000" : "rgba(255,255,255,0.4)",
                whiteSpace: "nowrap",
                opacity: tabOpacity,
              }}
            >
              {cat.ar}
            </div>
          );
        })}
      </div>

      {/* Menu items */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {menuItems.map((item, i) => {
          const stagger = i * 7;
          const itemOpacity = interpolate(frame, [stagger, stagger + 14], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const itemX = interpolate(frame, [stagger, stagger + 14], [30, 0], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                opacity: itemOpacity,
                translate: `${itemX}px 0`,
              }}
            >
              {/* Thumbnail placeholder — gold gem */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}11)`,
                  border: `1px solid ${GOLD}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: "right", minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "system-ui, sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      color: GOLD,
                      direction: "ltr",
                    }}
                  >
                    {item.price} د.ل
                  </div>
                  <div
                    style={{
                      fontFamily: arabicFont,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    {item.ar}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: arabicFont,
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    marginTop: 2,
                    textAlign: "right",
                  }}
                >
                  {item.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
