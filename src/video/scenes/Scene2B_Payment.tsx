import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { springEntry, SPRING_CONFIGS, O, TXT } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "700"] })

interface Props { frameOffset: number }

export const Scene2B_Payment: React.FC<Props> = ({ frameOffset }) => {
  const f = useCurrentFrame() - frameOffset
  const op = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })
  const fade = interpolate(f, [70, 75], [0, 1], { extrapolateLeft: "clamp" })
  const headerS = springEntry(f, 5, SPRING_CONFIGS.title)
  const cardS = springEntry(f, 15, SPRING_CONFIGS.card)
  const CheckS = interpolate(f, [55, 65], [0, 1], { extrapolateRight: "clamp" })

  return (
    <AbsoluteFill style={{ fontFamily, opacity: op * (1 - fade) }}>
      <div style={{
        position: "absolute", top: 130, left: 0, right: 0, textAlign: "center",
        opacity: headerS.opacity, transform: `translateY(${headerS.translateY}px)`,
      }}>
        <div dir="rtl" style={{ fontSize: 28, fontWeight: 700, color: TXT }}>معلومات الدفع</div>
      </div>

      {/* Payment card mockup */}
      <div style={{
        position: "absolute", top: 190, left: 60, right: 60,
        borderRadius: 20, padding: 24,
        background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.1)",
        opacity: cardS.opacity, transform: `scale(${cardS.scale}) translateY(${cardS.translateY}px)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: O, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
              <rect x="3" y="8" width="18" height="12" rx="2" /><path d="M8 4h8" /><path d="M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2" />
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TXT }}>•••• 4242</div>
        </div>

        {["اسحب لإتمام الدفع", "جاري التأكيد...", "✓ تم الدفع"].map((t, i) => {
          const itemOp = interpolate(f, [15 + i * 12, 25 + i * 12], [0, 1], { extrapolateRight: "clamp" })
          return (
            <div key={i} dir="rtl" style={{
              padding: "8px 14px", borderRadius: 10, marginBottom: 6,
              background: i === 2 ? `${O}22` : "rgba(255,255,255,0.04)",
              border: i === 2 ? `1px solid ${O}44` : "1px solid rgba(255,255,255,0.06)",
              opacity: itemOp, fontSize: 12, color: i === 2 ? O : TXT, fontWeight: 600,             }}>
              {t}
            </div>
          )
        })}

        {/* Spinner → checkmark */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", margin: "0 auto",
            border: `2px solid rgba(255,255,255,0.1)`,
            borderTopColor: O,
            transform: `rotate(${interpolate(f, [0, 70], [0, 360])}deg)`,
            opacity: interpolate(f, [55, 65], [1, 0]),
          }} />
          {CheckS > 0 && <div style={{
            fontSize: 28, marginTop: -34, opacity: CheckS,
          }}>✓</div>}
        </div>
      </div>
    </AbsoluteFill>
  )
}
