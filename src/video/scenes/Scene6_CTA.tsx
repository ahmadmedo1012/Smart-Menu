import { interpolate, AbsoluteFill, Easing, useCurrentFrame } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const TXT_MUTED = "rgba(255,255,255,0.45)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

export const Scene6_CTA: React.FC = () => {
  const f = useCurrentFrame()

  const op = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" })
  const scale = interpolate(f, [0, 22], [0.8, 1], { extrapolateRight: "clamp", easing: EZ })
  const subOp = interpolate(f, [22, 40], [0, 0.7], { extrapolateRight: "clamp" })
  const badgeOp = interpolate(f, [5, 18], [0, 1], { extrapolateRight: "clamp" })
  const fadeOut = interpolate(f, [100, 120], [0, 1], { extrapolateLeft: "clamp" })

  // Pulsing orb breathing
  const orbS = 1 + 0.25 * Math.sin(f * 0.04)
  const orbOp = 0.08 + 0.06 * Math.sin(f * 0.035)

  // Button pulsing
  const btnPulse = interpolate(f % 25, [0, 12, 25], [1, 1.04, 1])

  return (
    <AbsoluteFill style={{ background: "#050505", fontFamily }}>
      {/* Big ambient orb */}
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${O}22, transparent 70%)`,
        top: "50%", left: "50%", translate: "-50% -50%",
        scale: String(orbS), opacity: orbOp,
      }} />

      {/* Focus glow */}
      <div style={{
        position: "absolute", width: 350, height: 350, borderRadius: "50%",
        background: `radial-gradient(circle, ${O}15, transparent 60%)`,
        filter: "blur(50px)",
        top: "32%", left: "50%", translate: "-50% 0",
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
        opacity: op * (1 - fadeOut),
      }}>
        {/* Badge */}
        <div style={{
          padding: "5px 18px", borderRadius: 20,
          background: `${O}22`, border: `1px solid ${O}44`,
          fontSize: 12, fontWeight: 600, color: O,
          letterSpacing: "0.15em", opacity: badgeOp,
        }}>
          انطلق الآن
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
          <div style={{
            fontSize: 46, fontWeight: 800, color: TXT,
            lineHeight: 1.12, letterSpacing: "-0.03em",
          }}>
            جهّز مطعمك
          </div>
          <div style={{
            fontSize: 46, fontWeight: 800,
            lineHeight: 1.12, letterSpacing: "-0.03em",
            marginBottom: 2,
          }}>
            <span style={{ color: TXT }}>للانطلاق </span>
            <span style={{ color: O }}>الرقمي</span>
          </div>
          <div style={{
            width: 50, height: 3, borderRadius: 2, background: O,
            margin: "12px auto 0", boxShadow: `0 0 15px ${O}55`,
          }} />
        </div>

        {/* CTA Button */}
        <div style={{
          marginTop: 6, padding: "14px 44px", borderRadius: 50,
          background: `linear-gradient(145deg, ${O}, #fb923c)`,
          scale: String(btnPulse),
          boxShadow: `0 0 50px ${O}44, 0 4px 15px rgba(0,0,0,0.4)`,
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "white" }}>
            ابدأ مجاناً
          </span>
        </div>

        {/* Subtext */}
        <div style={{
          fontSize: 12, color: TXT_MUTED, opacity: subOp,
        }}>
          مجاناً • بدون بطاقة • دعم فني متكامل
        </div>

        {/* Bottom info chips */}
        <div style={{
          display: "flex", gap: 10, marginTop: 4,
          opacity: interpolate(f, [30, 48], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {["QR سريع", "تقارير", "دعم 24/7"].map((t, i) => (
            <div key={i} style={{
              padding: "4px 12px", borderRadius: 12,
              background: "oklch(0.14 0.005 0)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 10, color: TXT_MUTED,
            }}>{t}</div>
          ))}
        </div>
      </div>

      <Audio src="https://remotion.media/ding.wav" volume={0.18} />
    </AbsoluteFill>
  )
}
