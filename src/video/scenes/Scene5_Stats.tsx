import { interpolate, AbsoluteFill, Easing, spring, useCurrentFrame } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const TXT_MUTED = "rgba(255,255,255,0.5)"
const SURF = "oklch(0.14 0.005 0)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const STATS = [
  { value: "500+", label: "مطعم", color: O },
  { value: "50K+", label: "مستخدم", color: "#fb923c" },
  { value: "98%", label: "رضا العملاء", color: "#fbbf24" },
  { value: "4.9", label: "تقييم", color: O },
]

export const Scene5_Stats: React.FC = () => {
  const f = useCurrentFrame()

  const titleOp = interpolate(f, [0, 14], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(f, [0, 14], [-10, 0], { extrapolateRight: "clamp", easing: EZ })
  const fadeOut = interpolate(f, [100, 120], [0, 1], { extrapolateLeft: "clamp" })

  return (
    <AbsoluteFill style={{ background: "#080808", fontFamily }}>
      {/* Glow */}
      <div style={{
        position: "absolute", width: 450, height: 450, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${O}11, transparent 70%)`,
        top: "40%", left: "50%", translate: "-50% 0",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 80, left: 0, right: 0, textAlign: "center",
        opacity: titleOp * (1 - fadeOut),
      }}>
        <div style={{
          fontSize: 34, fontWeight: 700, color: TXT,
          transform: `translateY(${titleY}px)`,
        }}>
          أرقام تتحدث
        </div>
        <div style={{ width: 36, height: 3, borderRadius: 2, background: O, margin: "8px auto 0" }} />
      </div>

      {/* Stats grid */}
      <div style={{
        position: "absolute", top: 260, left: 30, right: 30,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        opacity: 1 - fadeOut,
      }}>
        {STATS.map((stat, i) => {
          const delay = 8 + i * 5
          const lf = Math.max(0, f - delay)
          const cardOp = interpolate(lf, [0, 14], [0, 1], { extrapolateRight: "clamp", easing: EZ })
          const cardS = spring({ frame: lf * 2, fps: 30, config: { damping: 12, stiffness: 100 } })
          const cardY = (1 - cardS) * 18

          return (
            <div key={i} style={{
              background: SURF, borderRadius: 16, padding: "20px 16px",
              textAlign: "center", border: "1px solid rgba(255,255,255,0.04)",
              opacity: cardOp, scale: String(cardS), transform: `translateY(${cardY}px)`,
            }}>
              <div style={{
                fontSize: 36, fontWeight: 800, color: stat.color,
                letterSpacing: "-0.03em", lineHeight: 1.1,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: TXT_MUTED, marginTop: 4 }}>{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Animated bar chart */}
      <div style={{
        position: "absolute", bottom: 50, left: 30, right: 30, height: 50,
        display: "flex", alignItems: "flex-end", gap: 4,
        opacity: interpolate(f, [20, 40], [0, 0.3], { extrapolateRight: "clamp" }) * (1 - fadeOut),
      }}>
        {[30, 55, 40, 70, 45, 85, 60, 75, 50, 90, 65, 80].map((h, i) => {
          const bh = interpolate(f, [25 + i * 3, 40 + i * 3], [0, h], { extrapolateRight: "clamp" })
          return (
            <div key={i} style={{
              flex: 1, height: `${bh}%`, borderRadius: "3px 3px 0 0",
              background: i % 2 === 0 ? O : "#fb923c88",
            }} />
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
