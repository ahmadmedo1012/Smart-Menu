import { interpolate, AbsoluteFill, Easing, spring, useCurrentFrame } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const TXT_MUTED = "rgba(255,255,255,0.4)"
const SURF = "oklch(0.12 0.005 0)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const CATEGORIES = [
  {
    emoji: "☕", name: "المشروبات",
    items: ["كابتشينو 12 د.ل", "لاتيه 14 د.ل", "إسبريسو 8 د.ل", "موكا 15 د.ل"]
  },
  {
    emoji: "🍔", name: "الوجبات",
    items: ["برجر دجاج 18 د.ل", "بطاطس 6 د.ل", "ساندويتش 14 د.ل", "ناجتس 12 د.ل"]
  },
  {
    emoji: "🍰", name: "الحلويات",
    items: ["كنافة 15 د.ل", "تشيز كيك 16 د.ل", "أم علي 12 د.ل", "بسبوسة 10 د.ل"]
  },
]

export const Scene3_PhoneDemo: React.FC = () => {
  const f = useCurrentFrame()

  const phoneOp = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" })
  const phoneY = interpolate(f, [0, 20], [25, 0], { extrapolateRight: "clamp", easing: EZ })
  const titleOp = interpolate(f, [5, 18], [0, 1], { extrapolateRight: "clamp" })
  const fadeOut = interpolate(f, [160, 180], [0, 1], { extrapolateLeft: "clamp" })

  const activeCatIdx = Math.min(Math.floor((f - 20) / 45), 2)
  const catProgress = Math.max(0, Math.min(((f - 20) % 45) / 45 * 1.2, 1))

  return (
    <AbsoluteFill style={{ background: "#080808", fontFamily }}>
      {/* Glow */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${O}11, transparent 70%)`,
        top: "40%", left: "50%", translate: "-50% 0",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 90, left: 0, right: 0, textAlign: "center",
        opacity: titleOp * (1 - fadeOut),
      }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: TXT }}>الطلب أسهل</div>
        <div style={{ fontSize: 13, color: TXT_MUTED, marginTop: 2 }}>بضغطة زر</div>
      </div>

      {/* Phone mockup */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", translate: "-50% -50%",
        transform: `translate(-50%, -50%) translateY(${phoneY}px)`,
        opacity: phoneOp * (1 - fadeOut),
      }}>
        {/* Phone body */}
        <div style={{
          width: 320, height: 650, borderRadius: 44,
          background: "#000", overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.08)",
          boxShadow: `0 25px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)`,
          position: "relative",
        }}>
          {/* Notch */}
          <div style={{
            position: "absolute", top: 0, left: "50%", translate: "-50% 0",
            width: 100, height: 24, background: "#000",
            borderRadius: "0 0 16px 16px", zIndex: 10,
          }} />

          <div style={{ padding: "34px 16px 16px", direction: "rtl" }}>
            {/* Status bar */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 10, color: TXT_MUTED }}>
              <span>9:41</span>
              <span>📶 🔋</span>
            </div>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
              paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6, background: O,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                  <path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: TXT }}>Smart Menu</span>
              <span style={{
                marginLeft: "auto", fontSize: 9, color: "#4ade80",
                padding: "2px 10px", borderRadius: 4,
                background: "rgba(74,222,128,0.1)",
              }}>مفتوح</span>
            </div>

            {/* Active category content */}
            {CATEGORIES.map((cat, ci) => {
              const isActive = ci === activeCatIdx
              const localCatFrame = Math.max(0, f - 20 - ci * 45)
              const catOp = isActive ? 1 : interpolate(localCatFrame, [-5, 10], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
              const catY = isActive ? 0 : interpolate(localCatFrame, [-5, 10], [-10, 0])
              const display = ci <= activeCatIdx ? "flex" : "none"
              return (
                <div key={ci} style={{
                  display, flexDirection: "column", gap: 8,
                  opacity: catOp, transform: `translateY(${catY}px)`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: TXT }}>
                    <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </div>
                  {cat.items.map((item, ii) => {
                    const itemDelay = 8 + ii * 5
                    const itemFrame = Math.max(0, localCatFrame - itemDelay)
                    const itemS = spring({ frame: itemFrame * 2, fps: 30, config: { damping: 13, stiffness: 100 } })
                    const [name, price] = item.split(" ")
                    return (
                      <div key={ii} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", borderRadius: 10,
                        background: SURF, border: "1px solid rgba(255,255,255,0.04)",
                        opacity: itemS, transform: `translateX(${(1 - itemS) * 12}px)`,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: TXT, direction: "rtl" }}>{name} {price}</span>
                      </div>
                    )
                  })}
                  {/* CTA */}
                  {ci === activeCatIdx && (() => {
                    const ctaF = Math.max(0, localCatFrame - 30)
                    const ctaOp = interpolate(ctaF, [0, 8], [0, 1], { extrapolateRight: "clamp" })
                    const ctaS = spring({ frame: ctaF * 2, fps: 30, config: { damping: 12, stiffness: 120 } })
                    return (
                      <div style={{
                        marginTop: 8, padding: "10px", borderRadius: 10,
                        background: O, textAlign: "center",
                        opacity: ctaOp, scale: String(ctaS),
                        boxShadow: `0 4px 20px ${O}44`,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>اطلب الآن ←</span>
                      </div>
                    )
                  })()}
                </div>
              )
            })}

            {/* Page dots */}
            <div style={{
              position: "absolute", bottom: 16, left: "50%", translate: "-50% 0",
              display: "flex", gap: 5,
            }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{
                  width: d === activeCatIdx ? 18 : 5, height: 4, borderRadius: 2,
                  background: d === activeCatIdx ? O : "rgba(255,255,255,0.15)",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side labels */}
      <div style={{
        position: "absolute", right: 25, top: "50%", translate: "0 -50%",
        display: "flex", flexDirection: "column", gap: 14,
        opacity: phoneOp * (1 - fadeOut),
      }}>
        {["مسح QR", "اختر طلبك", "ادفع بسهولة"].map((l, i) => {
          const d = Math.max(0, f - (25 + i * 12))
          const o = interpolate(d, [0, 10], [0, 1], { extrapolateRight: "clamp" })
          return (
            <div key={i} style={{ opacity: o, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: O }} />
              <span style={{ fontSize: 11, color: TXT }}>{l}</span>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
