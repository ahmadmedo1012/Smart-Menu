import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { FPS, O, TXT, TXT_MUTED, GLOW } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "700"] })

const PLANS = [
  { name: "Basic", price: "49", period: "شهرياً", popular: false },
  { name: "Pro", price: "99", period: "شهرياً", popular: true },
  { name: "Enterprise", price: "199", period: "شهرياً", popular: false },
]

interface Props { frameOffset: number }

export const Scene2A_PlanSelect: React.FC<Props> = ({ frameOffset }) => {
  const f = useCurrentFrame() - frameOffset
  const op = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })
  const fade = interpolate(f, [65, 75], [0, 1], { extrapolateLeft: "clamp" })

  return (
    <AbsoluteFill style={{ fontFamily, opacity: op * (1 - fade) }}>
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center" }}>
        <div dir="rtl" style={{
          fontSize: 28, fontWeight: 700, color: TXT, marginBottom: 6,
        }}>
          اختر خطتك
        </div>
        <div style={{ width: 30, height: 2, borderRadius: 1, background: O, margin: "0 auto 20px" }} />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 170 }}>
        {PLANS.map((plan, i) => {
          const p = spring({
            frame: f - (10 + i * 5),
            fps: FPS,
            config: { damping: 14, mass: 0.7, stiffness: 110 },
          })
          const isPopular = plan.popular
          return (
            <div key={i} style={{
              width: 100, borderRadius: 16,
              padding: "14px 8px",
              background: isPopular ? `linear-gradient(145deg, ${O}33, #fb923c22)` : "rgba(255,255,255,0.04)",
              border: isPopular ? `1.5px solid ${O}` : "1px solid rgba(255,255,255,0.08)",
              transform: `scale(${p}) translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
              opacity: p,
              textAlign: "center",
              boxShadow: isPopular ? `0 0 20px ${GLOW}` : undefined,
            }}>
              {isPopular && <div style={{
                fontSize: 8, fontWeight: 700, color: O,
                letterSpacing: "0.1em", marginBottom: 4,
              }}>✓ الأفضل</div>}
              <div style={{ fontSize: 13, fontWeight: 700, color: TXT }}>{plan.name}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: O, marginTop: 4 }}>
                ${plan.price}
              </div>
              <div style={{ fontSize: 9, color: TXT_MUTED }}>{plan.period}</div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
