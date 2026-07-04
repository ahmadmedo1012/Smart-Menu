import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { springEntry, SPRING_CONFIGS, O, TXT } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "700"] })

interface Props { frameOffset: number }

export const Scene2C_Validation: React.FC<Props> = ({ frameOffset }) => {
  const f = useCurrentFrame() - frameOffset
  const op = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" })
  const fade = interpolate(f, [55, 60], [0, 1], { extrapolateLeft: "clamp" })
  const shieldS = springEntry(f, 5, SPRING_CONFIGS.cta)
  const textS = springEntry(f, 15, SPRING_CONFIGS.tagline)
  const pulse = 1 + 0.08 * Math.sin(f * 0.08)
  const status = f < 40 ? "جاري التحقق" : "✓ تم التحقق"
  const statusColor = f < 40 ? TXT : O
  const badgeS = springEntry(f, f < 40 ? 5 : 40, SPRING_CONFIGS.badge)

  return (
    <AbsoluteFill style={{ fontFamily, opacity: op * (1 - fade) }}>
      <div style={{ position: "absolute", top: 180, left: 0, right: 0, textAlign: "center" }}>
        {/* Shield icon */}
        <div style={{
          width: 70, height: 70, borderRadius: "50%", margin: "0 auto 16px",
          background: `${O}15`, border: `2px solid ${O}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${shieldS.scale * pulse})`,
          opacity: shieldS.opacity,
          boxShadow: `0 0 30px ${O}33`,
        }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={O} strokeWidth={2}>
            <path d="M12 2l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V6l9-4z" />
          </svg>
        </div>

        {/* Status text */}
        <div dir="rtl" style={{
          fontSize: 20, fontWeight: 700, color: statusColor,
          opacity: badgeS.opacity,
          transform: `translateY(${badgeS.translateY}px)`,
          transition: "color 0.3s",
        }}>
          {status}
        </div>

        {/* Subtext */}
        <div dir="rtl" style={{
          fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6,
          opacity: textS.opacity,
        }}>
          {f < 40 ? "يتم التحقق من بيانات الاشتراك" : "تم تفعيل الاشتراك بنجاح"}
        </div>

        {/* Progress bar */}
        <div style={{
          width: 120, height: 3, borderRadius: 2, margin: "14px auto 0",
          background: "rgba(255,255,255,0.08)", overflow: "hidden",
        }}>
          <div style={{
            width: `${f < 40 ? interpolate(f, [0, 40], [0, 90]) : 100}%`,
            height: "100%", borderRadius: 2, background: O,
            transition: "width 0.3s",
          }} />
        </div>
      </div>
    </AbsoluteFill>
  )
}
