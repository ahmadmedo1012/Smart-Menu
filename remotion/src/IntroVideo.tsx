import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/NotoSansArabic";
import { loadFont as loadHeadingFont } from "@remotion/google-fonts/ReadexPro";

const { fontFamily: bodyFont } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});
const { fontFamily: headingFont } = loadHeadingFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["arabic"],
});

/* ===== Scene 1: Logo + Brand ===== */
function Scene1() {
  const f = useCurrentFrame();

  const logoScale = interpolate(f, [0, 30], [0.3, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });
  const opacity = interpolate(f, [0, 15, 50, 65], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const subOpacity = interpolate(f, [18, 32, 50, 65], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const subY = interpolate(f, [18, 32], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const ringRotate = interpolate(f, [0, 65], [0, 360], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(f, [0, 15, 50, 65], [0, 0.35, 0.35, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      {/* Rotating rings */}
      <div style={{ width: 340, height: 340, borderRadius: "50%", border: "1.5px solid rgba(217,119,6,0.2)", position: "absolute", rotate: `${ringRotate}deg`, opacity: ringOpacity }} />
      <div style={{ width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(217,119,6,0.08)", position: "absolute", rotate: `${-ringRotate}deg`, opacity: ringOpacity * 0.7 }} />

      {/* Logo */}
      <div style={{
        width: 100, height: 100, borderRadius: 24,
        background: "linear-gradient(135deg, #f59e0b, #d97706)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, scale: String(logoScale),
        boxShadow: "0 0 60px rgba(217,119,6,0.3)",
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>

      <h1 style={{
        fontFamily: headingFont, fontSize: 72, fontWeight: 700,
        margin: 0,
        background: "linear-gradient(135deg, #fbbf24, #d97706)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        lineHeight: 1.1, textAlign: "center", scale: String(logoScale),
      }}>
        الربط الذكي
      </h1>

      <p style={{
        fontFamily: bodyFont, fontSize: 24, color: "#a1a1aa",
        margin: "6px 0 0", opacity: subOpacity, translate: `0 ${subY}px`,
        letterSpacing: "0.15em", fontWeight: 500,
      }}>
        Smart Menu
      </p>
    </AbsoluteFill>
  );
}

/* ===== Scene 2: Key features ===== */
function Scene2() {
  const f = useCurrentFrame();

  const opacity = interpolate(f, [0, 10, 55, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const headingY = interpolate(f, [5, 18], [30, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const headingOpacity = interpolate(f, [5, 18, 50, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const itemSlide = (start: number) =>
    interpolate(f, [start, start + 15], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });

  const items = [
    {
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
      label: "QR منيو",
    },
    {
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
      label: "طلب واتساب",
    },
    {
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
      label: "ولاء وإحالات",
    },
  ];

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <h2 style={{
        fontFamily: headingFont, fontSize: 48, fontWeight: 700,
        color: "#f5f5f4", margin: 0, textAlign: "center",
        opacity: headingOpacity, translate: `0 ${headingY}px`,
        lineHeight: 1.4,
      }}>
        حل متكامل لمطعمك
      </h2>

      <div style={{ display: "flex", gap: 28, marginTop: 40 }}>
        {items.map((item, i) => {
          const s = itemSlide(15 + i * 12);
          return (
            <div key={i} style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 12,
              scale: String(s),
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, rgba(217,119,6,0.15), rgba(217,119,6,0.05))",
                border: "1px solid rgba(217,119,6,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#f59e0b",
              }}>
                {item.icon}
              </div>
              <span style={{ fontFamily: bodyFont, fontSize: 14, color: "#a1a1aa", fontWeight: 500 }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 40, opacity: headingOpacity }}>
        {[0, 1].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(217,119,6,0.4)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ===== Scene 3: CTA + Phone ===== */
function Scene3() {
  const f = useCurrentFrame();

  const opacity = interpolate(f, [0, 10, 60, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const pulseScale = interpolate(f, [10, 24, 38], [1, 1.06, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const ctaOpacity = interpolate(f, [25, 38, 55, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ctaY = interpolate(f, [25, 38], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const ringRotate = interpolate(f, [0, 70], [0, 360], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      {/* Rings */}
      <div style={{ width: 300, height: 300, borderRadius: "50%", border: "2px solid rgba(217,119,6,0.18)", position: "absolute", rotate: `${ringRotate}deg` }} />
      <div style={{ width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(217,119,6,0.08)", position: "absolute", rotate: `${-ringRotate}deg` }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", scale: String(pulseScale) }}>
        {/* Icon */}
        <div style={{
          width: 90, height: 90, borderRadius: 22,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18, boxShadow: "0 0 40px rgba(217,119,6,0.3)",
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>

        <p style={{
          fontFamily: headingFont, fontSize: 38, fontWeight: 700,
          color: "#fbbf24", margin: 0, textAlign: "center",
        }}>
          اطلب الآن
        </p>
        <p style={{
          fontFamily: bodyFont, fontSize: 30, fontWeight: 600,
          color: "#a1a1aa", margin: "6px 0 0", textAlign: "center",
        }}>
          عبر واتساب
        </p>

        {/* CTA button */}
        <div style={{
          opacity: ctaOpacity, translate: `0 ${ctaY}px`,
          marginTop: 28, padding: "12px 36px", borderRadius: 50,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "white", fontFamily: bodyFont, fontSize: 18,
          fontWeight: 600, boxShadow: "0 4px 20px rgba(217,119,6,0.3)",
        }}>
          ابدأ مجاناً
        </div>
      </div>

      {/* Watermark */}
      <p style={{
        position: "absolute", bottom: 36, fontFamily: bodyFont,
        fontSize: 13, color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em",
      }}>
        الربط الذكي
      </p>
    </AbsoluteFill>
  );
}

/* ===== Main Compound ===== */
export const IntroVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a09" }}>
      {/* BG gradient — shared */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, rgba(217,119,6,0.15) 0%, transparent 70%)",
      }} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={65}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <Scene3 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
