import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/NotoSansArabic";
import { loadFont as loadHeadingFont } from "@remotion/google-fonts/ReadexPro";

const { fontFamily: bodyFont } = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["arabic"],
});
const { fontFamily: headingFont } = loadHeadingFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["arabic"],
});

// Shared constants
const GRADIENT_BLUE = "linear-gradient(135deg, #60a5fa, #3b82f6, #1d4ed8)";
const GRADIENT_BTN = "linear-gradient(135deg, #3b82f6, #1d4ed8)";

// ===== Floating particles background =====
function Particles() {
  const f = useCurrentFrame();
  const dots = [
    { x: 15, y: 20, size: 4, delay: 0 },
    { x: 85, y: 15, size: 3, delay: 20 },
    { x: 20, y: 75, size: 3, delay: 40 },
    { x: 80, y: 80, size: 5, delay: 10 },
    { x: 50, y: 10, size: 3, delay: 30 },
  ];
  return (
    <>
      {dots.map((d, i) => {
        const drift = interpolate(f, [0, 60], [0, d.delay > 0 ? 15 : -10], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const opacity = interpolate(f, [0, 15, 55, 60], [0, 0.2, 0.2, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${d.x}%`,
              top: `${d.y + drift}%`,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background: "rgba(59,130,246,0.3)",
              opacity,
              filter: "blur(0.5px)",
            }}
          />
        );
      })}
    </>
  );
}

// ===== Watermark =====
function Watermark({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <p
      style={{
        position: "absolute",
        bottom: 28,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: bodyFont,
        fontSize: 12,
        color: `rgba(255,255,255,${opacity})`,
        letterSpacing: "0.15em",
        fontWeight: 400,
        margin: 0,
      }}
    >
      الربط الذكي — Smart Menu
    </p>
  );
}

// ===== Scene 1: Brand Reveal =====
function Scene1() {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 12, 50, 55], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const logoScale = spring({ frame: f, fps: 30, config: { damping: 12, stiffness: 120 } });
  const ringOpacity = interpolate(f, [0, 20, 50, 55], [0, 0.35, 0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringRotate = interpolate(f, [0, 55], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringRotate2 = interpolate(f, [0, 55], [0, -360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOpacity = interpolate(f, [15, 28, 48, 55], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const contentScale = interpolate(f, [46, 55], [1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });

  return (
    <AbsoluteFill style={{ opacity, scale: String(contentScale), display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <Particles />
      {/* Rotating rings */}
      <div style={{ width: 420, height: 420, borderRadius: "50%", border: "1.5px solid rgba(59,130,246,0.2)", position: "absolute", rotate: `${ringRotate}deg`, opacity: ringOpacity }} />
      <div style={{ width: 440, height: 440, borderRadius: "50%", border: "1px solid rgba(59,130,246,0.08)", position: "absolute", rotate: `${ringRotate2}deg`, opacity: ringOpacity * 0.7 }} />

      {/* Logo */}
      <div style={{ width: 110, height: 110, borderRadius: 28, background: GRADIENT_BLUE, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, scale: String(logoScale), boxShadow: "0 0 80px rgba(59,130,246,0.35)" }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>

      <h1 style={{ fontFamily: headingFont, fontSize: 76, fontWeight: 700, margin: 0, lineHeight: 1.1, textAlign: "center", background: GRADIENT_BLUE, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        الربط الذكي
      </h1>
      <p style={{ fontFamily: bodyFont, fontSize: 22, color: "#a1a1aa", margin: "10px 0 0", opacity: subOpacity, letterSpacing: "0.15em", fontWeight: 500, textAlign: "center" }}>
        Smart Menu
      </p>
      <div style={{ opacity: subOpacity * 0.5, width: 60, height: 2, borderRadius: 1, background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)", marginTop: 24 }} />
      <Watermark />
    </AbsoluteFill>
  );
}

// ===== Scene 2: Phone Product Demo =====
function Scene2() {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 10, 75, 85], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const phoneScale = spring({ frame: f, fps: 30, config: { damping: 14, stiffness: 100 }, delay: 5 });
  const phoneY = interpolate(f, [5, 22], [80, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const glow = interpolate(f, [20, 30, 40], [0.6, 1, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.6, 1) });
  // Subtle zoom in throughout scene
  const contentScale = interpolate(f, [0, 85], [1, 1.02], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });

  return (
    <AbsoluteFill style={{ opacity, scale: String(contentScale), display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <Particles />
      
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", translate: `0 ${phoneY}px` }}>
        {/* Phone frame — matches HeroVideo design */}
        <div style={{
          width: 230, height: 470, borderRadius: 42,
          background: "linear-gradient(180deg, #60a5fa 0%, #3b82f6 25%, #2563eb 55%, #1e3a8a 100%)",
          padding: 3,
          boxShadow: `0 0 ${50 * glow}px rgba(59,130,246,${0.2 * glow}), 0 20px 60px -12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)`,
          position: "relative",
        }}>
          {/* Bezel metallic shine */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 42, background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.08) 100%)", pointerEvents: "none", zIndex: 2 }} />

          {/* Camera bump */}
          <div style={{ position: "absolute", top: -1, right: -1, width: 48, height: 48, borderRadius: 48, background: "linear-gradient(135deg, #3b82f6, #1e3a8a)", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle, #60a5fa, #1e3a8a)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          {/* Screen */}
          <div style={{ width: "100%", height: "100%", borderRadius: 38, background: "#0c0a09", overflow: "hidden", position: "relative" }}>
            {/* Glass reflection */}
            <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 35%, transparent 60%, rgba(255,255,255,0.02) 100%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 38, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)", pointerEvents: "none", zIndex: 2 }} />

            {/* Dynamic Island */}
            <div style={{ position: "absolute", top: 8, left: "50%", translate: "-50% 0", width: 80, height: 22, borderRadius: 11, background: "rgba(0,0,0,0.8)", zIndex: 3, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ position: "absolute", right: 12, top: "50%", translate: "0 -50%", width: 6, height: 6, borderRadius: "50%", background: "rgba(59,130,246,0.6)" }} />
            </div>

            {/* Menu content */}
            <div style={{ padding: "32px 12px 0", position: "relative", zIndex: 1 }}>
              {/* Header */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: GRADIENT_BLUE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 700 }}>م</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "white" }}>مطعم مذاق الشام</div>
                  <div style={{ fontSize: 8, color: "rgba(96,165,250,0.7)", marginTop: 1 }}>مفتوح الآن</div>
                </div>
              </div>

              {/* Search bar */}
              <div style={{ height: 28, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", padding: "0 8px", marginBottom: 12 }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>ابحث عن طبق...</span>
              </div>

              {/* Menu items with staggered animation */}
              {[
                { name: "شاورما دجاج", price: "٢٥" },
                { name: "كباب بندورة", price: "٣٠" },
                { name: "فتوش", price: "١٥" },
                { name: "عصير ليمون", price: "١٢" },
              ].map((item, i) => {
                const itemDelay = 18 + i * 7;
                const itemOpacity = interpolate(f, [itemDelay, itemDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const itemX = interpolate(f, [itemDelay, itemDelay + 12], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
                const itemScale = interpolate(f, [itemDelay, itemDelay + 10], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={i} style={{ opacity: itemOpacity, translate: `0 ${itemX}px`, scale: String(itemScale), display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: "white" }}>{item.name}</span>
                        <span style={{ fontSize: 8, color: "rgba(96,165,250,0.8)" }}>{item.price} د.ل</span>
                      </div>
                      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>★★★★☆</div>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.15))" }} />
                  </div>
                );
              })}

              {/* Pulsing order button */}
              <div style={{
                position: "absolute", bottom: 16, left: "50%", translate: "-50% 0",
                height: 32, width: 130, borderRadius: 16, background: GRADIENT_BTN,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 ${15 * (1 + Math.sin(f * 0.1) * 0.5)}px rgba(59,130,246,0.4)`,
                opacity: interpolate(f, [48, 56], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}>
                <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>اطلب عبر واتساب</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: interpolate(f, [20, 30, 70, 85], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), marginTop: 14, fontFamily: headingFont, fontSize: 16, color: "#60a5fa", letterSpacing: "0.08em" }}>
          منيو رقمي • طلب سريع
        </div>
      </div>
      <Watermark />
    </AbsoluteFill>
  );
}

// ===== Scene 3: CTA & Closing =====
function Scene3() {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 12, 42, 50], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const scale = spring({ frame: f, fps: 30, config: { damping: 12, stiffness: 110 } });
  const ctaOpacity = interpolate(f, [15, 26, 36, 50], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaY = interpolate(f, [15, 26], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const ringRotate = interpolate(f, [0, 50], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Subtle zoom out for cinematic effect
  const contentScale = interpolate(f, [0, 50], [1.02, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });

  return (
    <AbsoluteFill style={{ opacity, scale: String(contentScale), display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <Particles />
      <div style={{ width: 340, height: 340, borderRadius: "50%", border: "1.5px solid rgba(59,130,246,0.15)", position: "absolute", rotate: `${ringRotate}deg` }} />
      <div style={{ width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(59,130,246,0.06)", position: "absolute", rotate: `${-ringRotate * 0.7}deg` }} />

      <div style={{ scale: String(scale), display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Icon */}
        <div style={{ width: 90, height: 90, borderRadius: 24, background: GRADIENT_BLUE, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 0 60px rgba(59,130,246,0.35)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
            <path d="M12 2v20" />
            <path d="M17 7l-5 5-5-5" />
          </svg>
        </div>

        <h2 style={{ fontFamily: headingFont, fontSize: 46, fontWeight: 700, color: "#f5f5f4", margin: 0, textAlign: "center", lineHeight: 1.2 }}>
          منيو مطعمك بلمسة
        </h2>
        <h2 style={{ fontFamily: headingFont, fontSize: 52, fontWeight: 700, margin: "2px 0 0", textAlign: "center", background: GRADIENT_BLUE, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          احترافية
        </h2>

        {/* Features strip */}
        <div style={{ display: "flex", gap: 24, marginTop: 20, opacity: ctaOpacity }}>
          {["QR منيو", "طلب واتساب", "ولاء"].map((feat, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(59,130,246,0.4)" }} />
              <span style={{ fontFamily: bodyFont, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{feat}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ opacity: ctaOpacity, translate: `0 ${ctaY}px`, marginTop: 22, padding: "14px 48px", borderRadius: 50, background: GRADIENT_BTN, color: "white", fontFamily: bodyFont, fontSize: 18, fontWeight: 700, boxShadow: "0 4px 32px rgba(59,130,246,0.4)" }}>
          ابدأ مجاناً
        </div>
        <p style={{ opacity: ctaOpacity * 0.4, marginTop: 12, fontFamily: bodyFont, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          بدون بطاقة ائتمان
        </p>
      </div>
      <Watermark />
    </AbsoluteFill>
  );
}

// ===== Main Composition =====
export const HeroIntro = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a09" }}>
      {/* Shared background gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse 70% 50% at 50% 35%, rgba(59,130,246,0.12) 0%, transparent 65%),
          radial-gradient(ellipse at 50% 100%, rgba(37,99,235,0.05) 0%, transparent 50%),
          radial-gradient(ellipse at 20% 80%, rgba(96,165,250,0.03) 0%, transparent 40%),
          radial-gradient(ellipse at 80% 80%, rgba(37,99,235,0.03) 0%, transparent 40%)
        `,
      }} />

      {/* Grain overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px",
      }} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={55}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={85}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={50}>
          <Scene3 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
