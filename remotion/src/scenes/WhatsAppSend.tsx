import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansArabic";

const { fontFamily: arabicFont } = loadNoto("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});

const GOLD = "oklch(0.72 0.14 75)";
const WHATSAPP_GREEN = "#25D366";

export const WhatsAppSend: React.FC = () => {
  const frame = useCurrentFrame();

  // Button entrance
  const btnOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const btnScale = interpolate(frame, [0, 20], [0.7, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Green pulse after entrance
  const pulse = interpolate(frame, [25, 35, 45, 55], [1, 1.05, 1, 1.05], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.sin,
  });

  // Checkmark entrance
  const checkTime = 50;
  const checkOpacity = interpolate(frame, [checkTime, checkTime + 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const checkScale = interpolate(frame, [checkTime, checkTime + 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Success text
  const successOpacity = interpolate(frame, [checkTime + 20, checkTime + 35], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Confetti dots
  const confettiOpacity = interpolate(frame, [checkTime, checkTime + 10], [0, 0.6], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const confetti = [
    { x: -40, y: -30, angle: 0, color: GOLD },
    { x: 40, y: -20, angle: 120, color: WHATSAPP_GREEN },
    { x: -30, y: 20, angle: 240, color: GOLD },
    { x: 35, y: 25, angle: 60, color: "#fff" },
    { x: -50, y: 0, angle: 180, color: WHATSAPP_GREEN },
    { x: 50, y: -35, angle: 300, color: GOLD },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Summary header */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: btnOpacity,
        }}
      >
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 14,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          طلبك
        </div>
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            marginTop: 4,
          }}
        >
          كباب بندورة x2
        </div>
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 12,
            color: GOLD,
            marginTop: 2,
          }}
        >
          84 SAR
        </div>
      </div>

      {/* WhatsApp button */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${btnScale})`,
          opacity: btnOpacity,
          scale: `${pulse}`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 12,
            padding: "14px 28px",
            borderRadius: 50,
            background: WHATSAPP_GREEN,
            boxShadow: `0 0 30px rgba(37,211,102,0.3)`,
          }}
        >
          {/* WhatsApp icon (SVG) */}
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              fill="white"
            />
          </svg>
          <div
            style={{
              fontFamily: arabicFont,
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            أرسل الطلب عبر واتساب
          </div>
        </div>
      </div>

      {/* Confetti dots */}
      {confetti.map((c, i) => {
        const dotScale = interpolate(
          frame,
          [checkTime + i * 3, checkTime + i * 3 + 20],
          [0, 1],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: c.color,
              transform: `translate(${c.x}px, ${c.y}px)`,
              opacity: confettiOpacity * dotScale,
            }}
          />
        );
      })}

      {/* Checkmark */}
      <div
        style={{
          position: "absolute",
          bottom: "16%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          opacity: checkOpacity,
          scale: `${checkScale}`,
        }}
      >
        {/* Green checkmark circle */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: WHATSAPP_GREEN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          style={{
            fontFamily: arabicFont,
            fontSize: 14,
            fontWeight: 700,
            color: WHATSAPP_GREEN,
            opacity: successOpacity,
          }}
        >
          تم إرسال الطلب بنجاح
        </div>
      </div>
    </AbsoluteFill>
  );
};
