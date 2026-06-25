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

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const glow = interpolate(frame, [0, 25], [0, 0.6], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const contentSlide = interpolate(frame, [5, 30], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const titleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const itemsOpacity = interpolate(frame, [30, 55], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Gold ambient glow */}
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
          opacity: glow,
          filter: "blur(100px)",
        }}
      />

      {/* Status bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 1, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ width: 8, height: 8, borderRadius: 1, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ width: 8, height: 8, borderRadius: 1, background: "rgba(255,255,255,0.18)" }} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M1 9l4-4 4 4" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 5v14" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="7" width="4" height="14" rx="1" fill="rgba(255,255,255,0.25)"/>
            <rect x="8" y="4" width="4" height="17" rx="1" fill="rgba(255,255,255,0.18)"/>
            <rect x="14" y="1" width="4" height="20" rx="1" fill="rgba(255,255,255,0.1)"/>
          </svg>
        </div>
      </div>

      {/* Restaurant header */}
      <div
        style={{
          position: "absolute",
          top: "16%",
          left: 20,
          right: 20,
          opacity: titleOpacity,
          translate: `0 ${contentSlide}px`,
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 28,
            fontWeight: 700,
            color: "#fff",
            textAlign: "right",
            letterSpacing: "0.02em",
          }}
        >
          مطعم الذهبي
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <div
            style={{
              fontFamily: arabicFont,
              fontSize: 12,
              color: "rgba(34,197,94,0.7)",
              letterSpacing: "0.03em",
            }}
          >
            مفتوح الآن
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          position: "absolute",
          top: "28%",
          left: 20,
          right: 20,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          opacity: titleOpacity * 0.4,
        }}
      />

      {/* Category pills */}
      <div
        style={{
          position: "absolute",
          top: "32%",
          left: 20,
          right: 20,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          opacity: itemsOpacity,
        }}
      >
        {["مشاوي", "مقبلات", "مشروبات", "حلويات"].map((cat, i) => {
          const catOpacity = interpolate(frame, [30 + i * 3, 40 + i * 3], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
          });
          const isActive = i === 0;
          return (
            <div
              key={i}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                background: isActive ? GOLD : "rgba(255,255,255,0.06)",
                fontFamily: arabicFont,
                fontSize: 12,
                fontWeight: 700,
                color: isActive ? "#000" : "rgba(255,255,255,0.5)",
                opacity: catOpacity,
              }}
            >
              {cat}
            </div>
          );
        })}
      </div>

      {/* Menu items preview */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {[
          { name: "شاورما دجاج", price: "25", desc: "خبز صاج • ثوم • مخلل" },
          { name: "كباب بندورة", price: "30", desc: "لحم مفروم • بندورة • بصل" },
          { name: "فتوش", price: "15", desc: "خس • بندورة • نعناع • خبز" },
          { name: "عصير ليمون", price: "12", desc: "ليمون طازج • نعناع" },
        ].map((item, i) => {
          const itemOpacity = interpolate(frame, [35 + i * 4, 50 + i * 4], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const itemY = interpolate(frame, [35 + i * 4, 50 + i * 4], [15, 0], {
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
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                opacity: itemOpacity,
                translate: `0 ${itemY}px`,
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
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: arabicFont,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontFamily: arabicFont,
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    marginTop: 2,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom brand mark */}
      <div
        style={{
          position: "absolute",
          bottom: "6%",
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity * 0.3,
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 10,
            color: GOLD,
            letterSpacing: "0.15em",
          }}
        >
          الربط الذكي
        </div>
      </div>
    </AbsoluteFill>
  );
};
