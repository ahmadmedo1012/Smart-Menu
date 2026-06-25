import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/NotoSansArabic";
import { loadFont as loadHeadingFont } from "@remotion/google-fonts/ReadexPro";

const { fontFamily: bodyFont } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});
const { fontFamily: headingFont } = loadHeadingFont("normal", {
  weights: ["600", "700"],
  subsets: ["arabic"],
});

// ── Constants ────────────────────────────────────────────
const BG = "#0c0a09";
const MUTED = "#a1a1aa";
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const BTN_GRADIENT = "linear-gradient(135deg, #3b82f6, #1d4ed8)";
const SIDE = 80;
const TOP_BOT = 100;

// ── Shared Decorators ────────────────────────────────────

function Grain() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px",
      }}
    />
  );
}

function BlueGlow() {
  return (
    <div
      style={{
        position: "absolute",
        width: "70%",
        height: "50%",
        left: "15%",
        top: "25%",
        borderRadius: "50%",
        background:
          "radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 65%)",
      }}
    />
  );
}

function Watermark({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <p
      style={{
        position: "absolute",
        bottom: TOP_BOT,
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

// ── Scene 1: Brand Reveal (0–60) ───────────────────────
function Scene1() {
  const f = useCurrentFrame();

  const opacity = interpolate(f, [0, 12, 48, 60], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const scale = spring({
    frame: f,
    fps: 30,
    config: { damping: 12, stiffness: 120 },
  });

  const contentScale = interpolate(f, [48, 60], [1, 1.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const ringRotate = interpolate(f, [0, 60], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ringRotate2 = interpolate(f, [0, 60], [0, -360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ringOpacity = interpolate(f, [0, 15, 48, 60], [0, 0.35, 0.35, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subOpacity = interpolate(f, [15, 25, 48, 60], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        scale: String(contentScale),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        direction: "rtl",
      }}
    >
      {/* Decorative rotating rings */}
      <div
        style={{
          width: 250,
          height: 250,
          borderRadius: "50%",
          border: "1.5px solid rgba(59,130,246,0.2)",
          position: "absolute",
          rotate: `${ringRotate}deg`,
          opacity: ringOpacity,
        }}
      />
      <div
        style={{
          width: 270,
          height: 270,
          borderRadius: "50%",
          border: "1px solid rgba(59,130,246,0.08)",
          position: "absolute",
          rotate: `${ringRotate2}deg`,
          opacity: ringOpacity * 0.7,
        }}
      />

      {/* Brand content */}
      <div
        style={{
          scale: String(scale),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            fontFamily: headingFont,
            fontSize: 80,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.1,
            textAlign: "center",
            color: "white",
          }}
        >
          الربط الذكي
        </h1>
        <p
          style={{
            fontFamily: bodyFont,
            fontSize: 22,
            color: MUTED,
            margin: "10px 0 0",
            opacity: subOpacity,
            letterSpacing: "0.15em",
            fontWeight: 400,
            textAlign: "center",
          }}
        >
          Smart Menu
        </p>
      </div>

      <Watermark />
    </AbsoluteFill>
  );
}

// ── Scene 2: Phone Product Showcase (0–84) ─────────────
function Scene2() {
  const f = useCurrentFrame();

  const opacity = interpolate(f, [0, 10, 72, 84], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const sceneScale = interpolate(f, [0, 84], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const phoneScale = spring({
    frame: f,
    fps: 30,
    config: { damping: 14, stiffness: 100 },
    delay: 5,
  });

  const phoneY = interpolate(f, [5, 22], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const glow = interpolate(f, [20, 35, 50], [0.6, 1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const tilt = interpolate(f, [0, 30], [0, -4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const leftLabelOpacity = interpolate(f, [15, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const rightLabelOpacity = interpolate(f, [20, 33], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const leftLabelY = interpolate(f, [15, 28], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const rightLabelY = interpolate(f, [20, 33], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        scale: String(sceneScale),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        direction: "rtl",
      }}
    >
      {/* Pulsing glow behind phone */}
      <div
        style={{
          position: "absolute",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 60%)",
          opacity: glow,
        }}
      />

      {/* Side label: منيو رقمي */}
      <div
        style={{
          position: "absolute",
          right: "calc(50% + 170px)",
          opacity: leftLabelOpacity,
          translate: `0 ${leftLabelY}px`,
          fontFamily: headingFont,
          fontSize: 20,
          color: "#60a5fa",
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        <div>منيو</div>
        <div>رقمي</div>
      </div>

      {/* Side label: طلب عبر واتساب */}
      <div
        style={{
          position: "absolute",
          left: "calc(50% + 170px)",
          opacity: rightLabelOpacity,
          translate: `0 ${rightLabelY}px`,
          fontFamily: headingFont,
          fontSize: 20,
          color: "#60a5fa",
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        <div>طلب عبر</div>
        <div>واتساب</div>
      </div>

      {/* Phone — transform string for perspective + rotateY 3D */}
      <div
        style={{
          transform: `perspective(800px) rotateY(${tilt}deg)`,
          translate: `0 ${phoneY}px`,
        }}
      >
        {/* Phone frame — 280×560 as spec */}
        <div
          style={{
            width: 280,
            height: 560,
            borderRadius: 46,
            background:
              "linear-gradient(180deg, rgba(82,82,91,0.5) 0%, rgba(63,63,70,0.7) 50%, rgba(39,39,42,0.9) 100%)",
            padding: 3,
            boxShadow: `0 0 ${50 * glow}px rgba(59,130,246,${0.2 * glow}), 0 20px 60px -12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)`,
            position: "relative",
            scale: String(phoneScale),
          }}
        >
          {/* Metallic shine on bezel */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 46,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.08) 100%)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          {/* Screen */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 42,
              background: "#0c0a09",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Glass reflection */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 35%, transparent 60%, rgba(255,255,255,0.02) 100%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 42,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />

            {/* Dynamic Island */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                translate: "-50% 0",
                width: 80,
                height: 22,
                borderRadius: 11,
                background: "rgba(0,0,0,0.8)",
                zIndex: 3,
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  translate: "0 -50%",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "rgba(59,130,246,0.6)",
                }}
              />
            </div>

            {/* Menu content */}
            <div
              style={{
                padding: "34px 14px 0",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Restaurant header */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: BTN_GRADIENT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "white",
                    fontWeight: 700,
                  }}
                >
                  م
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "white" }}>
                    مطعم مذاق الشام
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: "rgba(96,165,250,0.7)",
                      marginTop: 1,
                    }}
                  >
                    مفتوح الآن
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div
                style={{
                  height: 28,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                  ابحث عن طبق...
                </span>
              </div>

              {/* Category pills */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {["المقبلات", "المشاوي", "المشروبات"].map((cat, i) => {
                  const d = 20 + i * 5;
                  const o = interpolate(f, [d, d + 8], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const x = interpolate(f, [d, d + 8], [10, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: EASE,
                  });
                  return (
                    <div
                      key={i}
                      style={{
                        opacity: o,
                        translate: `0 ${x}px`,
                        padding: "4px 10px",
                        borderRadius: 12,
                        background:
                          i === 0
                            ? BTN_GRADIENT
                            : "rgba(255,255,255,0.06)",
                        fontSize: 8,
                        color:
                          i === 0 ? "white" : "rgba(255,255,255,0.5)",
                        fontWeight: i === 0 ? 700 : 500,
                      }}
                    >
                      {cat}
                    </div>
                  );
                })}
              </div>

              {/* Menu items — staggered spring entrance */}
              {[
                { name: "شاورما دجاج", price: "٢٥", stars: "★★★★☆" },
                { name: "كباب بندورة", price: "٣٠", stars: "★★★★★" },
                { name: "فتوش", price: "١٥", stars: "★★★★☆" },
                { name: "عصير ليمون", price: "١٢", stars: "★★★☆☆" },
              ].map((item, i) => {
                const d = 35 + i * 7;
                const o = interpolate(f, [d, d + 12], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const y = interpolate(f, [d, d + 12], [14, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: EASE,
                });
                const s = interpolate(f, [d, d + 10], [0.92, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <div
                    key={i}
                    style={{
                      opacity: o,
                      scale: String(s),
                      translate: `0 ${y}px`,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 7,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: "white",
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: 8,
                            color: "rgba(96,165,250,0.8)",
                          }}
                        >
                          {item.price} د.ل
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 7,
                          color: "rgba(255,255,255,0.35)",
                          marginTop: 1,
                        }}
                      >
                        {item.stars}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background:
                          "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.15))",
                      }}
                    />
                  </div>
                );
              })}

              {/* Order button */}
              <div
                style={{
                  position: "absolute",
                  bottom: 14,
                  left: "50%",
                  translate: "-50% 0",
                  height: 32,
                  width: 140,
                  borderRadius: 16,
                  background: BTN_GRADIENT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 ${15 * (1 + Math.sin(f * 0.1) * 0.5)}px rgba(59,130,246,0.4)`,
                  opacity: interpolate(f, [55, 65], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                <span
                  style={{ color: "white", fontSize: 10, fontWeight: 700 }}
                >
                  ابدأ الطلب
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Watermark />
    </AbsoluteFill>
  );
}

// ── Scene 3: Closing CTA (0–48) ────────────────────────
function Scene3() {
  const f = useCurrentFrame();

  const opacity = interpolate(f, [0, 12, 48, 50], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const contentScale = interpolate(f, [0, 50], [1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const ctaOpacity = interpolate(f, [15, 26, 36, 50], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaY = interpolate(f, [15, 26], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const ctaScale = spring({
    frame: f,
    fps: 30,
    config: { damping: 12, stiffness: 110 },
    delay: 15,
  });

  const pillOpacity = interpolate(f, [8, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const pillY = interpolate(f, [8, 18], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const ringRotate = interpolate(f, [0, 50], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        scale: String(contentScale),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        direction: "rtl",
      }}
    >
      {/* Subtle rotating accent ring */}
      <div
        style={{
          width: 340,
          height: 340,
          borderRadius: "50%",
          border: "1.5px solid rgba(59,130,246,0.1)",
          position: "absolute",
          rotate: `${ringRotate}deg`,
        }}
      />
      <div
        style={{
          width: 360,
          height: 360,
          borderRadius: "50%",
          border: "1px solid rgba(59,130,246,0.05)",
          position: "absolute",
          rotate: `${-ringRotate * 0.7}deg`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: `0 ${SIDE}px`,
        }}
      >
        {/* Closing headline */}
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: 84,
            fontWeight: 700,
            color: "#f5f5f4",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.15,
          }}
        >
          حوّل مطعمك
        </h2>
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: 84,
            fontWeight: 700,
            margin: "6px 0 0",
            textAlign: "center",
            background:
              "linear-gradient(135deg, #60a5fa, #3b82f6, #1d4ed8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.15,
          }}
        >
          إلى منيو رقمي
        </h2>

        {/* Feature pills */}
        <div
          style={{
            opacity: pillOpacity,
            translate: `0 ${pillY}px`,
            display: "flex",
            gap: 10,
            marginTop: 30,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { icon: "QR", text: "منيو QR" },
            { icon: "WA", text: "طلب واتساب" },
            { icon: "★", text: "ولاء وإحالات" },
          ].map((feat, i) => (
            <div
              key={i}
              style={{
                padding: "8px 18px",
                borderRadius: 24,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: BTN_GRADIENT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "white",
                  fontWeight: 700,
                }}
              >
                {feat.icon}
              </span>
              <span
                style={{
                  fontFamily: bodyFont,
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 500,
                }}
              >
                {feat.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div
          style={{
            opacity: ctaOpacity,
            translate: `0 ${ctaY}px`,
            scale: String(ctaScale),
            marginTop: 34,
            padding: "16px 58px",
            borderRadius: 50,
            background: BTN_GRADIENT,
            color: "white",
            fontFamily: bodyFont,
            fontSize: 22,
            fontWeight: 700,
            boxShadow: "0 0 40px rgba(59,130,246,0.35)",
          }}
        >
          ابدأ مجاناً
        </div>

        <p
          style={{
            opacity: ctaOpacity * 0.4,
            marginTop: 12,
            fontFamily: bodyFont,
            fontSize: 13,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          بدون بطاقة ائتمان
        </p>
      </div>

      <Watermark />
    </AbsoluteFill>
  );
}

// ── Main Composition ─────────────────────────────────
export const HeroIntro = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* Shared background layers */}
      <BlueGlow />
      <Grain />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={60}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={84}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={48}>
          <Scene3 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
