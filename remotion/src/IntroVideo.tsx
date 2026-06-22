import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Sequence } from "remotion";

const FONT = "'Noto Sans Arabic', system-ui, sans-serif";

export const IntroVideo = () => {
  const frame = useCurrentFrame();

  // Scene 1: Logo fade in (0-45f)
  const s1Opacity = interpolate(frame, [0, 15, 35, 45], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const s1Scale = interpolate(frame, [0, 25], [0.6, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.elastic(1, 0.3),
  });
  const subtitleOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [20, 35], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Scene 2: Tagline slides up (45-90f)
  const s2Opacity = interpolate(frame, [45, 55, 80, 90], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const s2Y = interpolate(frame, [50, 70], [60, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const iconScale = (start: number) =>
    interpolate(frame, [start, start + 10], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.back(1.5),
    });

  // Scene 3: CTA pulse (90-150f)
  const s3Opacity = interpolate(frame, [90, 100, 140, 150], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const pulseScale = interpolate(frame, [100, 115, 130], [1, 1.08, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const ctaOpacity = interpolate(frame, [115, 125, 135, 145], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Rotating ring
  const ringRotate = interpolate(frame, [90, 150], [0, 360], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a09", fontFamily: FONT }}>
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(217,119,6,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Scene 1: Logo */}
      <Sequence from={0} durationInFrames={45} layout="none">
        <AbsoluteFill style={{ opacity: s1Opacity, scale: String(s1Scale), display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Logo circle */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 32,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              boxShadow: "0 0 60px rgba(217,119,6,0.3)",
            }}
          >
            <span style={{ fontSize: 60 }}>🍽️</span>
          </div>
          <h1
            style={{
              fontSize: 80,
              fontWeight: 800,
              margin: 0,
              background: "linear-gradient(135deg, #fbbf24, #d97706)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            الربط الذكي
          </h1>
          <p
            style={{
              fontSize: 28,
              color: "#a1a1aa",
              margin: 0,
              opacity: subtitleOpacity,
              translate: `0 ${subtitleY}px`,
              letterSpacing: "0.15em",
              direction: "rtl",
            }}
          >
            Smart Menu
          </p>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Tagline + icons */}
      <Sequence from={45} durationInFrames={45} layout="none">
        <AbsoluteFill style={{ opacity: s2Opacity, translate: `0 ${s2Y}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <h2
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#f5f5f4",
              margin: 0,
              textAlign: "center",
              direction: "rtl",
              lineHeight: 1.4,
            }}
          >
            منيو رقمي<br />لمطعمك
          </h2>
          <div
            style={{
              display: "flex",
              gap: 30,
              marginTop: 40,
            }}
          >
            {["🍕", "☕", "🍽️"].map((emoji, i) => (
              <span
                key={i}
                style={{
                  fontSize: 48,
                  scale: String(iconScale(55 + i * 8)),
                  display: "inline-block",
                }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: CTA */}
      <Sequence from={90} durationInFrames={60} layout="none">
        <AbsoluteFill style={{ opacity: s3Opacity, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Premium border ring */}
          <div
            style={{
              width: 300,
              height: 300,
              borderRadius: "50%",
              border: "2px solid rgba(217,119,6,0.2)",
              position: "absolute",
              rotate: `${ringRotate}deg`,
            }}
          />
          <div
            style={{
              width: 320,
              height: 320,
              borderRadius: "50%",
              border: "1px solid rgba(217,119,6,0.1)",
              position: "absolute",
              rotate: `${-ringRotate}deg`,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              scale: String(pulseScale),
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 24,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 0 40px rgba(217,119,6,0.3)",
              }}
            >
              <span style={{ fontSize: 40 }}>📱</span>
            </div>
            <p
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "#fbbf24",
                margin: 0,
                textAlign: "center",
                direction: "rtl",
              }}
            >
              اطلب الآن
            </p>
            <p
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: "#a1a1aa",
                margin: "8px 0 0",
                textAlign: "center",
                direction: "rtl",
              }}
            >
              عبر واتساب
            </p>

            {/* CTA button */}
            <div
              style={{
                opacity: ctaOpacity,
                marginTop: 30,
                padding: "14px 40px",
                borderRadius: 50,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "white",
                fontSize: 20,
                fontWeight: 600,
                boxShadow: "0 4px 20px rgba(217,119,6,0.3)",
                direction: "rtl",
              }}
            >
              ابدأ مجاناً
            </div>
          </div>

          {/* Bottom brand */}
          <p
            style={{
              position: "absolute",
              bottom: 40,
              fontSize: 14,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.1em",
            }}
          >
            الربط الذكي
          </p>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
