import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Sequence } from "remotion";

const FONT = "system-ui, sans-serif";

export const HeroIntro = () => {
  const frame = useCurrentFrame();

  // ─── Scene 1: Title + Subtitle + Rotating Ring (0-60f) ───

  // Title: scale up + fade in
  const titleScale = interpolate(frame, [0, 30], [0.3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });
  const titleOpacity = interpolate(frame, [0, 20, 50, 60], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Subtitle: slide up
  const subOpacity = interpolate(frame, [20, 35, 50, 60], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [20, 35], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Decorative rotating ring (visible throughout Scene 1)
  const s1RingOpacity = interpolate(frame, [0, 20, 50, 60], [0, 0.4, 0.4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s1RingRotate = interpolate(frame, [0, 60], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ─── Scene 2: Food Icons + Tagline (60-120f) ───

  const s2Opacity = interpolate(frame, [60, 70, 110, 120], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const s2TextOpacity = interpolate(frame, [75, 90, 110, 120], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const s2TextY = interpolate(frame, [75, 90], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const iconSpring = (offset: number) =>
    interpolate(frame, [offset, offset + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });

  // ─── Scene 3: Phone Mockup + CTA (120-180f) ───

  const s3Opacity = interpolate(frame, [120, 130, 175, 180], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Phone mockup: scale up from bottom
  const phoneScale = interpolate(frame, [125, 145], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });
  const phoneY = interpolate(frame, [125, 145], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Pulse glow on "اطلب عبر واتساب"
  const glowPulse = interpolate(frame, [145, 155, 165], [0.6, 1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.6, 1),
  });

  const ctaButtonOpacity = interpolate(frame, [150, 165], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaButtonY = interpolate(frame, [150, 165], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Scene 3 rotating ring
  const s3RingRotate = interpolate(frame, [120, 180], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a09", fontFamily: FONT }}>
      {/* Dark premium gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(217,119,6,0.12) 0%, transparent 70%), radial-gradient(ellipse at 50% 100%, rgba(251,191,36,0.05) 0%, transparent 50%)",
        }}
      />

      {/* Subtle grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />

      {/* ───── Scene 1: Title ───── */}
      <Sequence from={0} durationInFrames={60} layout="none">
        <AbsoluteFill
          style={{
            opacity: titleOpacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Decorative rotating ring */}
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: "50%",
              border: "1.5px solid rgba(217,119,6,0.25)",
              position: "absolute",
              rotate: `${s1RingRotate}deg`,
              opacity: s1RingOpacity,
            }}
          />
          <div
            style={{
              width: 380,
              height: 380,
              borderRadius: "50%",
              border: "1px solid rgba(217,119,6,0.1)",
              position: "absolute",
              rotate: `${-s1RingRotate}deg`,
              opacity: s1RingOpacity * 0.7,
            }}
          />

          {/* Logo icon */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              scale: String(titleScale),
              boxShadow: "0 0 80px rgba(217,119,6,0.25)",
            }}
          >
            <span style={{ fontSize: 52 }}>🍽️</span>
          </div>

          {/* Main title */}
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              margin: 0,
              background: "linear-gradient(135deg, #fbbf24, #d97706, #f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.15,
              textAlign: "center",
              scale: String(titleScale),
              direction: "rtl",
            }}
          >
            الربط الذكي
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 24,
              color: "#a1a1aa",
              margin: "10px 0 0",
              opacity: subOpacity,
              translate: `0 ${subY}px`,
              letterSpacing: "0.2em",
              fontWeight: 500,
            }}
          >
            Smart Menu
          </p>
        </AbsoluteFill>
      </Sequence>

      {/* ───── Scene 2: Icons + Tagline ───── */}
      <Sequence from={60} durationInFrames={60} layout="none">
        <AbsoluteFill
          style={{
            opacity: s2Opacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h2
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#f5f5f4",
              margin: 0,
              textAlign: "center",
              direction: "rtl",
              lineHeight: 1.5,
              opacity: s2TextOpacity,
              translate: `0 ${s2TextY}px`,
            }}
          >
            منيو رقمي لمطعمك
          </h2>

          {/* Food emoji icons — staggered bounce */}
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 40,
            }}
          >
            {["🍕", "☕", "🍽️"].map((emoji, i) => (
              <span
                key={i}
                style={{
                  fontSize: 56,
                  scale: String(iconSpring(65 + i * 10)),
                  display: "inline-block",
                }}
              >
                {emoji}
              </span>
            ))}
          </div>

          {/* Decorative dots */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 40,
              opacity: s2TextOpacity,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "rgba(217,119,6,0.5)",
                }}
              />
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ───── Scene 3: Phone Mockup + CTA ───── */}
      <Sequence from={120} durationInFrames={60} layout="none">
        <AbsoluteFill
          style={{
            opacity: s3Opacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer rotating decorative ring */}
          <div
            style={{
              width: 340,
              height: 340,
              borderRadius: "50%",
              border: "1.5px solid rgba(217,119,6,0.15)",
              position: "absolute",
              rotate: `${s3RingRotate}deg`,
            }}
          />
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: "50%",
              border: "1px solid rgba(217,119,6,0.08)",
              position: "absolute",
              rotate: `${-s3RingRotate}deg`,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Phone mockup frame */}
            <div
              style={{
                width: 200,
                height: 400,
                borderRadius: 40,
                border: "2.5px solid rgba(251,191,36,0.4)",
                background:
                  "linear-gradient(180deg, rgba(217,119,6,0.06) 0%, rgba(217,119,6,0.02) 100%)",
                position: "relative",
                scale: String(phoneScale),
                translate: `0 ${phoneY}px`,
                boxShadow:
                  "0 0 30px rgba(217,119,6,0.1), inset 0 0 60px rgba(217,119,6,0.03)",
              }}
            >
              {/* Dynamic Island */}
              <div
                style={{
                  width: 70,
                  height: 18,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.4)",
                  position: "absolute",
                  top: 12,
                  left: "50%",
                  translate: "-50% 0",
                }}
              />

              {/* Screen content preview — mini menu */}
              <div
                style={{
                  position: "absolute",
                  top: 44,
                  left: 12,
                  right: 12,
                  bottom: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ height: 6, width: "60%", borderRadius: 3, background: "rgba(251,191,36,0.25)", marginBottom: 4 }} />
                <div style={{ height: 5, width: "100%", borderRadius: 3, background: "rgba(251,191,36,0.12)" }} />
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ height: 5, width: 22, borderRadius: 3, background: "rgba(251,191,36,0.15)" }} />
                  ))}
                </div>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 5, width: "70%", borderRadius: 3, background: "rgba(255,255,255,0.12)", marginBottom: 2 }} />
                      <div style={{ height: 3, width: "50%", borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(217,119,6,0.15)" }} />
                  </div>
                ))}
                <div style={{ height: 8, width: "70%", borderRadius: 4, background: "linear-gradient(135deg, #f59e0b, #d97706)", margin: "auto auto 0", opacity: 0.5 }} />
              </div>
            </div>

            {/* "اطلب عبر واتساب" text with glow */}
            <p
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#fbbf24",
                margin: "24px 0 0",
                textAlign: "center",
                direction: "rtl",
                textShadow: `0 0 ${20 * glowPulse}px rgba(251,191,36,${0.3 * glowPulse})`,
              }}
            >
              اطلب عبر واتساب
            </p>

            {/* CTA button */}
            <div
              style={{
                opacity: ctaButtonOpacity,
                translate: `0 ${ctaButtonY}px`,
                marginTop: 20,
                padding: "14px 44px",
                borderRadius: 50,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "white",
                fontSize: 18,
                fontWeight: 600,
                direction: "rtl",
                boxShadow: "0 4px 24px rgba(217,119,6,0.35)",
              }}
            >
              ابدأ الآن
            </div>
          </div>

          {/* Bottom watermark */}
          <p
            style={{
              position: "absolute",
              bottom: 32,
              fontSize: 13,
              color: "rgba(255,255,255,0.15)",
              letterSpacing: "0.15em",
              fontWeight: 400,
            }}
          >
            الربط الذكي
          </p>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
