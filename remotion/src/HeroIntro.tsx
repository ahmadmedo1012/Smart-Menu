import { AbsoluteFill, useCurrentFrame, interpolate, Easing, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
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

/* ===== Scene 1: Brand Logo + Title ===== */
function Scene1() {
  const f = useCurrentFrame();

  const logoScale = interpolate(f, [0, 35], [0.3, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });
  const opacity = interpolate(f, [0, 20, 50, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const subOpacity = interpolate(f, [20, 35, 50, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const subY = interpolate(f, [20, 35], [25, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const ringRotate = interpolate(f, [0, 70], [0, 360], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(f, [0, 20, 50, 70], [0, 0.35, 0.35, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      {/* Rotating rings */}
      <div style={{ width: 380, height: 380, borderRadius: "50%", border: "1.5px solid rgba(217,119,6,0.22)", position: "absolute", rotate: `${ringRotate}deg`, opacity: ringOpacity }} />
      <div style={{ width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(217,119,6,0.08)", position: "absolute", rotate: `${-ringRotate}deg`, opacity: ringOpacity * 0.7 }} />

      {/* Logo circle */}
      <div style={{
        width: 110, height: 110, borderRadius: 28,
        background: "linear-gradient(135deg, #f59e0b, #d97706)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 24, scale: String(logoScale),
        boxShadow: "0 0 80px rgba(217,119,6,0.3)",
      }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>

      <h1 style={{
        fontFamily: headingFont, fontSize: 82, fontWeight: 700,
        margin: 0,
        background: "linear-gradient(135deg, #fbbf24, #d97706, #f59e0b)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        lineHeight: 1.15, textAlign: "center", scale: String(logoScale),
      }}>
        الربط الذكي
      </h1>

      <p style={{
        fontFamily: bodyFont, fontSize: 26, color: "#a1a1aa",
        margin: "8px 0 0", opacity: subOpacity, translate: `0 ${subY}px`,
        letterSpacing: "0.15em", fontWeight: 500,
      }}>
        Smart Menu
      </p>
    </AbsoluteFill>
  );
}

/* ===== Scene 2: Features ===== */
function Scene2() {
  const f = useCurrentFrame();

  const opacity = interpolate(f, [0, 12, 55, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const headingY = interpolate(f, [5, 20], [40, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const headingOpacity = interpolate(f, [5, 20, 50, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const iconScale = (start: number) =>
    interpolate(f, [start, start + 14], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });

  const features = [
    {
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
      label: "منيو رقمي",
    },
    {
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
      label: "طلب واتساب",
    },
    {
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
      label: "برنامج ولاء",
    },
  ];

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <h2 style={{
        fontFamily: headingFont, fontSize: 56, fontWeight: 700,
        color: "#f5f5f4", margin: 0, textAlign: "center",
        opacity: headingOpacity, translate: `0 ${headingY}px`,
        lineHeight: 1.4,
      }}>
        منيو رقمي لمطعمك
      </h2>

      <div style={{ display: "flex", gap: 36, marginTop: 48 }}>
        {features.map((feat, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 14,
            scale: String(iconScale(15 + i * 10)),
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 22,
              background: "linear-gradient(135deg, rgba(217,119,6,0.15), rgba(217,119,6,0.05))",
              border: "1px solid rgba(217,119,6,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#f59e0b",
            }}>
              {feat.icon}
            </div>
            <span style={{ fontFamily: bodyFont, fontSize: 16, color: "#a1a1aa", fontWeight: 500 }}>
              {feat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Connecting dots */}
      <div style={{ display: "flex", gap: 8, marginTop: 48, opacity: headingOpacity }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(217,119,6,0.4)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ===== Scene 3: Phone Mockup + CTA ===== */
function Scene3() {
  const f = useCurrentFrame();

  const opacity = interpolate(f, [0, 12, 60, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const phoneScale = interpolate(f, [5, 22], [0.4, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });
  const phoneY = interpolate(f, [5, 22], [80, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const glowPulse = interpolate(f, [20, 30, 40], [0.6, 1, 0.6], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.6, 1),
  });

  const ctaOpacity = interpolate(f, [25, 40], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ctaY = interpolate(f, [25, 40], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const ringRotate = interpolate(f, [0, 70], [0, 360], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      {/* Rotating rings */}
      <div style={{ width: 360, height: 360, borderRadius: "50%", border: "1.5px solid rgba(217,119,6,0.12)", position: "absolute", rotate: `${ringRotate}deg` }} />
      <div style={{ width: 380, height: 380, borderRadius: "50%", border: "1px solid rgba(217,119,6,0.06)", position: "absolute", rotate: `${-ringRotate}deg` }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Phone frame */}
        <div style={{
          width: 190, height: 390, borderRadius: 36,
          border: "2.5px solid rgba(251,191,36,0.35)",
          background: "linear-gradient(180deg, rgba(217,119,6,0.08) 0%, rgba(217,119,6,0.02) 100%)",
          scale: String(phoneScale), translate: `0 ${phoneY}px`,
          boxShadow: "0 0 40px rgba(217,119,6,0.1), inset 0 0 60px rgba(217,119,6,0.03)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Dynamic Island */}
          <div style={{ width: 65, height: 16, borderRadius: 10, background: "rgba(0,0,0,0.35)", position: "absolute", top: 10, left: "50%", translate: "-50% 0" }} />

          {/* Screen: mini menu preview */}
          <div style={{ position: "absolute", top: 38, left: 10, right: 10, bottom: 10, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ height: 5, width: "55%", borderRadius: 3, background: "rgba(251,191,36,0.25)", marginBottom: 3 }} />
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 5, width: "75%", borderRadius: 3, background: "rgba(255,255,255,0.1)", marginBottom: 2 }} />
                  <div style={{ height: 3, width: "45%", borderRadius: 2, background: "rgba(255,255,255,0.05)" }} />
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(217,119,6,0.12)" }} />
              </div>
            ))}
            <div style={{ height: 6, width: "65%", borderRadius: 3, background: "linear-gradient(135deg, #f59e0b, #d97706)", margin: "auto auto 0", opacity: 0.4 }} />
          </div>
        </div>

        {/* CTA text with pulse glow */}
        <p style={{
          fontFamily: headingFont, fontSize: 32, fontWeight: 700,
          color: "#fbbf24", margin: "22px 0 0", textAlign: "center",
          textShadow: `0 0 ${20 * glowPulse}px rgba(251,191,36,${0.3 * glowPulse})`,
        }}>
          اطلب عبر واتساب
        </p>

        {/* CTA button */}
        <div style={{
          opacity: ctaOpacity, translate: `0 ${ctaY}px`, marginTop: 18,
          padding: "12px 40px", borderRadius: 50,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "white", fontFamily: bodyFont, fontSize: 17,
          fontWeight: 600, boxShadow: "0 4px 24px rgba(217,119,6,0.35)",
        }}>
          ابدأ الآن
        </div>
      </div>

      {/* Watermark */}
      <p style={{
        position: "absolute", bottom: 32, fontFamily: bodyFont,
        fontSize: 13, color: "rgba(255,255,255,0.12)",
        letterSpacing: "0.12em", fontWeight: 400,
      }}>
        الربط الذكي
      </p>
    </AbsoluteFill>
  );
}

/* ===== Main Composition ===== */
export const HeroIntro = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a09" }}>
      {/* Background gradient — shared across scenes */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(217,119,6,0.12) 0%, transparent 70%), radial-gradient(ellipse at 50% 100%, rgba(251,191,36,0.05) 0%, transparent 50%)",
      }} />

      {/* Grain overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px",
      }} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={70}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <Scene3 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
