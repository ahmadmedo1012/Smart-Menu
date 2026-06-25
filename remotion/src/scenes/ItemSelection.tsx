import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"], subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";

export const ItemSelection: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const cardScale = interpolate(frame, [8, 38], [0.85, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const cardOpacity = interpolate(frame, [8, 30], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const detailOpacity = interpolate(frame, [28, 52], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const detailY = interpolate(frame, [28, 52], [15, 0], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const glow = interpolate(frame, [0, 25, 50], [0.15, 0.4, 0.15], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.sin,
  });

  const collapseOpacity = interpolate(frame, [0, 25], [0.4, 0.15], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ position: "absolute", top: "8%", left: 20, right: 20, textAlign: "right", opacity: headerOpacity }}>
        <div style={{ fontFamily: arabicFont, fontSize: 20, fontWeight: 700, color: "#fff" }}>تفاصيل الصنف</div>
        <div style={{ fontFamily: arabicFont, fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>اختر الإضافات قبل الطلب</div>
      </div>

      {/* Collapsed side items */}
      <div style={{ position: "absolute", top: "22%", left: 20, display: "flex", flexDirection: "column", gap: 8, opacity: collapseOpacity }}>
        {["شاورما دجاج", "فتوش", "عصير ليمون"].map((name, i) => (
          <div key={i} style={{
            padding: "8px 14px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            fontFamily: arabicFont, fontSize: 10, color: "rgba(255,255,255,0.5)",
            whiteSpace: "nowrap",
          }}>
            {name}
          </div>
        ))}
      </div>

      {/* Hero card */}
      <div style={{ position: "absolute", top: "20%", right: 20, left: 80, scale: `${cardScale}`, opacity: cardOpacity }}>
        <div style={{
          padding: "18px 20px", borderRadius: 18,
          border: `2px solid ${GOLD}`,
          background: `linear-gradient(135deg, rgba(212,168,83,0.1) 0%, rgba(0,0,0,0.6) 100%)`,
          boxShadow: `0 0 60px rgba(212,168,83,${glow})`, textAlign: "center",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD}88)`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <div style={{ fontFamily: arabicFont, fontSize: 22, fontWeight: 700, color: "#fff" }}>كباب بندورة</div>
          <div style={{ fontFamily: arabicFont, fontSize: 11, color: GOLD, marginTop: 2, opacity: 0.7 }}>Tomato Kebab</div>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}44, transparent)`, margin: "12px 0" }} />
          <div style={{ opacity: detailOpacity, translate: `0 ${detailY}px` }}>
            <div style={{ fontFamily: arabicFont, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              لحم مفروم طازج مع البندورة والبهارات الشرقية
            </div>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 26, fontWeight: 700, color: GOLD, marginTop: 10 }}>
              30 د.ل
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 10 }}>
              {["ساخن", "حار", "عادي"].map((tag, i) => {
                const tagOpacity = interpolate(frame, [35 + i * 5, 50 + i * 5], [0, 1], {
                  extrapolateRight: "clamp", extrapolateLeft: "clamp",
                });
                return (
                  <div key={i} style={{
                    padding: "4px 12px", borderRadius: 12,
                    background: "rgba(212,168,83,0.08)", border: "1px solid rgba(212,168,83,0.15)",
                    fontFamily: arabicFont, fontSize: 10, color: GOLD, opacity: tagOpacity,
                  }}>
                    {tag}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
