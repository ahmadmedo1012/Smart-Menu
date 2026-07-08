import { AbsoluteFill, useCurrentFrame, Img, spring, staticFile, Sequence } from "remotion"
import { Audio } from "@remotion/media"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { springEntry, fadeIn, TEAL, TXT, VIDEO_URLS, BG_GRADIENT } from "../shared"
import { PhoneFrame } from "../PhoneFrame"
import { HighlightOverlay } from "../HighlightOverlay"
import { VideoBg } from "../VideoBg"
const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

const FEATURES = [
  { text: "أصناف وأقسام غير محدودة", delay: 55 },
  { text: "منيو رقمي احترافي", delay: 75 },
  { text: "مشاركة QR ورابط", delay: 95 },
  { text: "طلبات واتساب فورية", delay: 115 },
]

export const Scene3_Subscribe: React.FC = () => {
  const f = useCurrentFrame()
  const titleS = springEntry(f, 5, 0.9, 30)
  const cardS = springEntry(f, 20, 0.92, 50)
  const phoneS = spring({ frame: f - 40, fps: 30, config: { mass: 0.5, damping: 12, stiffness: 70 } })
  const btnS = springEntry(f, 135, 0.9, 25)

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene3} gradient={BG_GRADIENT.scene2} sceneIndex={2} />
      <Audio src={staticFile("/video/v3.mp3")} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 16px 0" }}>
        {/* Header */}
        <div dir="rtl" style={{ fontSize: 30, fontWeight: 800, color: TXT, textAlign: "center", textShadow: "0 6px 25px rgba(0,0,0,0.7)", opacity: titleS.opacity, transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)` }}>
          الباقة <span style={{ color: TEAL }}>الأساسية</span>
        </div>

        {/* Phone frame with screenshot */}
        <div style={{ margin: "6px 0", opacity: cardS.opacity, transform: `scale(${phoneS})` }}>
          <PhoneFrame width={200} height={360}>
            <Img src={staticFile("/video/screenshot_subscribe.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <HighlightOverlay x={25} y={40} w={50} h={15} entranceFrame={45} color={TEAL} />
          </PhoneFrame>
        </div>

        {/* Pricing badge */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, opacity: fadeIn(f, 80) }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: TEAL, textShadow: `0 0 30px ${TEAL}44` }}>19</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: TXT }}>د.ل</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>/ شهرياً</span>
        </div>

        {/* Rating / Social proof */}
        <div style={{ display: "flex", gap: 3, opacity: fadeIn(f, 95) }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width={14} height={14} viewBox="0 0 24 24" fill={i < 4 ? "#FFD700" : "rgba(255,255,255,0.2)"}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginRight: 4 }}>4.8 (1,200+)</span>
        </div>

        {/* Feature chips (staggered) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, width: "100%", maxWidth: 320 }}>
          {FEATURES.map((feat, i) => {
            const chip = spring({ frame: f - feat.delay, fps: 30, config: { mass: 0.4, damping: 12, stiffness: 80 } })
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderRadius: 20, background: `${TEAL}10`, border: `1px solid ${TEAL}20`, opacity: fadeIn(f, feat.delay), transform: `scale(${chip})` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{feat.text}</span>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 12, padding: "10px 40px", borderRadius: 50, background: `linear-gradient(135deg, ${TEAL}, #00cc99)`, textAlign: "center", fontSize: 16, fontWeight: 800, color: "#000", opacity: btnS.opacity, transform: `scale(${btnS.scale})`, boxShadow: `0 0 30px ${TEAL}33, 0 4px 15px rgba(0,0,0,0.3)` }}>
          ابدأ الاشتراك
        </div>
        <div dir="rtl" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4, opacity: fadeIn(f, 145) }}>
          أول 7 أيام مجاناً · بدون بطاقة ائتمان
        </div>
      </div>

      {/* Staggered UI taps for each feature */}
      {FEATURES.map((feat) => (
        <Sequence key={feat.text} from={feat.delay} durationInFrames={6}>
          <Audio src={staticFile("/video/sfx_tap.mp3")} volume={0.25} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
