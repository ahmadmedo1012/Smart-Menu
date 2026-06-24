import { AbsoluteFill, useCurrentFrame, interpolate, Easing, series } from "remotion";
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

/* ===== Stats Counter Number ===== */
function AnimatedNumber({ value, delay }: { value: number; delay: number }) {
  const f = useCurrentFrame();
  const progress = interpolate(f, [0, delay, delay + 20], [0, 0, value], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return <>{Math.round(progress)}</>;
}

/* ===== Scene 1: Trust Header ===== */
function Scene1() {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 15, 50, 65], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const scale = interpolate(f, [0, 20], [0.6, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{
        width: 100, height: 100, borderRadius: 28,
        background: "linear-gradient(135deg, #f59e0b, #d97706)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 24, scale: String(scale),
        boxShadow: "0 0 60px rgba(217,119,6,0.3)",
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <h1 style={{
        fontFamily: headingFont, fontSize: 64, fontWeight: 700,
        color: "#f5f5f4", margin: 0, textAlign: "center",
        lineHeight: 1.2,
      }}>
        يثق بنا أكثر من
      </h1>
      <h1 style={{
        fontFamily: headingFont, fontSize: 72, fontWeight: 700,
        background: "linear-gradient(135deg, #fbbf24, #d97706)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        margin: "4px 0 0", textAlign: "center",
      }}>
        ٥٠ مطعماً
      </h1>
    </AbsoluteFill>
  );
}

/* ===== Scene 2: Stats Grid ===== */
function Scene2() {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 15, 55, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const stats = [
    { value: 10000, suffix: "+", label: "طلب شهرياً", color: "#fbbf24" },
    { value: 30000, suffix: "+", label: "زبون نشط", color: "#f59e0b" },
    { value: 4, stars: 5, label: "تقييم المستخدمين", color: "#f59e0b" },
    { value: 99, suffix: "%", label: "رضا العملاء", color: "#fbbf24" },
  ];

  const glowPulse = interpolate(f, [0, 15, 30, 45, 60], [0.6, 1, 0.6, 1, 0.6], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <h2 style={{
        fontFamily: headingFont, fontSize: 44, fontWeight: 700,
        color: "#f5f5f4", margin: "0 0 40px", textAlign: "center",
        lineHeight: 1.3,
      }}>
        أرقام تتحدث عنا
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {stats.map((s, i) => {
          const itemDelay = 10 + i * 8;
          const itemOpacity = interpolate(f, [itemDelay, itemDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const itemY = interpolate(f, [itemDelay, itemDelay + 12], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });

          return (
            <div key={i} style={{
              opacity: itemOpacity, translate: `0 ${itemY}px`,
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "20px 32px",
              background: "rgba(217,119,6,0.06)",
              border: "1px solid rgba(217,119,6,0.12)",
              borderRadius: 20,
              minWidth: 160,
            }}>
              <span style={{
                fontFamily: headingFont, fontSize: 42, fontWeight: 700,
                color: s.color,
                textShadow: `0 0 ${20 * glowPulse}px rgba(217,119,6,${0.3 * glowPulse})`,
              }}>
                {s.stars ? (
                  <>
                    <AnimatedNumber value={s.stars} delay={itemDelay} />
                    <span style={{ fontSize: 32 }}>★</span>
                  </>
                ) : (
                  <><AnimatedNumber value={s.value} delay={itemDelay} />{s.suffix}</>
                )}
              </span>
              <span style={{ fontFamily: bodyFont, fontSize: 16, color: "#a1a1aa", marginTop: 6 }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ===== Scene 3: CTA ===== */
function Scene3() {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 15, 50, 65], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const scale = interpolate(f, [5, 20], [0.8, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });
  const starsOpacity = interpolate(f, [0, 10, 55, 65], [1, 0, 0, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(f, [25, 38], [0.85, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  return (
    <AbsoluteFill style={{ opacity, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      {/* Floating stars */}
      <div style={{ opacity: starsOpacity, position: "absolute" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            position: "absolute",
            left: [-120, -100, 100, 120][i],
            top: [-80, 60, -60, 80][i],
            fontSize: [20, 16, 24, 14][i],
            color: "rgba(251,191,36,0.3)",
          }}>
            ★
          </div>
        ))}
      </div>

      <div style={{ scale: String(scale), display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h2 style={{
          fontFamily: headingFont, fontSize: 48, fontWeight: 700,
          color: "#f5f5f4", margin: 0, textAlign: "center",
          lineHeight: 1.3,
        }}>
          انضم إليهم الآن
        </h2>
        <p style={{
          fontFamily: bodyFont, fontSize: 20, color: "#a1a1aa",
          margin: "12px 0 28px", textAlign: "center",
        }}>
          ابدأ برفع منيو مطعمك رقمياً اليوم
        </p>
        <div style={{
          scale: String(ctaScale),
          padding: "16px 56px", borderRadius: 50,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "white", fontFamily: bodyFont, fontSize: 20,
          fontWeight: 700,
          boxShadow: "0 4px 32px rgba(217,119,6,0.4)",
        }}>
          ابدأ مجاناً
        </div>
        <p style={{
          fontFamily: bodyFont, fontSize: 13, color: "rgba(255,255,255,0.2)",
          marginTop: 16,
        }}>
          بدون بطاقة ائتمان · إلغاء في أي وقت
        </p>
      </div>
    </AbsoluteFill>
  );
}

/* ===== Main Composition ===== */
export const TrustVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a09" }}>
      {/* Background ambient glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(217,119,6,0.1) 0%, transparent 65%), radial-gradient(ellipse at 30% 80%, rgba(251,191,36,0.04) 0%, transparent 40%), radial-gradient(ellipse at 70% 20%, rgba(217,119,6,0.04) 0%, transparent 40%)",
      }} />

      {/* Grain */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px",
      }} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={65}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={75}>
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
