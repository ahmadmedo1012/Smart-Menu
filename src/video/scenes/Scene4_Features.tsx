import { interpolate, AbsoluteFill, Easing, spring, useCurrentFrame } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const TXT_MUTED = "rgba(255,255,255,0.45)"
const SURF = "oklch(0.14 0.005 0)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const FEATURES = [
  { icon: "📱", title: "منيو رقمي", desc: "تصفح المنيو بلمسة واحدة" },
  { icon: "💳", title: "دفع إلكتروني", desc: "آمن، سريع، بدون لمس" },
  { icon: "📊", title: "تقارير ذكية", desc: "تحليل مبيعاتك لحظة بلحظة" },
  { icon: "🔔", title: "إشعارات فورية", desc: "كل طلب يصلوك فوراً" },
  { icon: "⭐", title: "تقييمات", desc: "آراء العملاء بالوقت الحقيقي" },
  { icon: "🎯", title: "عروض مخصصة", desc: "خصومات ذكية حسب كل زبون" },
]

export const Scene4_Features: React.FC = () => {
  const f = useCurrentFrame()

  const titleOp = interpolate(f, [0, 16], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(f, [0, 16], [-12, 0], { extrapolateRight: "clamp", easing: EZ })
  const fadeOut = interpolate(f, [130, 150], [0, 1], { extrapolateLeft: "clamp" })

  return (
    <AbsoluteFill style={{ background: "#080808", fontFamily }}>
      {/* Glow */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${O}11, transparent 70%)`,
        top: "25%", left: "50%", translate: "-50% 0",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 80, left: 0, right: 0, textAlign: "center",
        opacity: titleOp * (1 - fadeOut),
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: O, letterSpacing: "0.25em", marginBottom: 4 }}>
          PLATFORM
        </div>
        <div style={{
          fontSize: 34, fontWeight: 700, color: TXT,
          transform: `translateY(${titleY}px)`,
        }}>
          مميزات المنصة
        </div>
        <div style={{ width: 36, height: 3, borderRadius: 2, background: O, margin: "8px auto 0" }} />
      </div>

      {/* Feature grid — 2 columns */}
      <div style={{
        position: "absolute", top: 280, left: 30, right: 30,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
        opacity: 1 - fadeOut,
      }}>
        {FEATURES.map((feat, i) => {
          const delay = 10 + i * 4
          const lf = Math.max(0, f - delay)
          const cardOp = interpolate(lf, [0, 14], [0, 1], { extrapolateRight: "clamp", easing: EZ })
          const cardS = spring({ frame: lf * 2, fps: 30, config: { damping: 13, stiffness: 100 } })
          const cardY = (1 - cardS) * 15

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px", borderRadius: 14,
              background: SURF, border: "1px solid rgba(255,255,255,0.04)",
              opacity: cardOp, scale: String(cardS), transform: `translateY(${cardY}px)`,
            }}>
              <div style={{ fontSize: 22, width: 36, textAlign: "center" }}>{feat.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TXT }}>{feat.title}</div>
                <div style={{ fontSize: 10, color: TXT_MUTED, marginTop: 1 }}>{feat.desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom chips */}
      <div style={{
        position: "absolute", bottom: 60, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 8,
        opacity: interpolate(f, [40, 55], [0, 1], { extrapolateRight: "clamp" }) * (1 - fadeOut),
      }}>
        {["سهل", "سريع", "آمن", "حديث"].map((t, i) => (
          <div key={i} style={{
            padding: "5px 14px", borderRadius: 20,
            background: SURF, border: "1px solid rgba(255,255,255,0.06)",
            fontSize: 11, fontWeight: 500, color: TXT_MUTED,
          }}>{t}</div>
        ))}
      </div>

      <Audio src="https://remotion.media/ding.wav" volume={0.12} />
    </AbsoluteFill>
  )
}
