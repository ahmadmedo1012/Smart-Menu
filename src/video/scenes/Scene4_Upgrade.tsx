import { AbsoluteFill, useCurrentFrame, interpolate, Sequence, staticFile, Img, spring } from "remotion"
import { Audio } from "@remotion/media"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { springEntry, fadeIn, TEAL, GOLD, TXT, VIDEO_URLS, BG_GRADIENT } from "../shared"
import { VideoBg } from "../VideoBg"
import { PhoneFrame } from "../PhoneFrame"
import { HighlightOverlay } from "../HighlightOverlay"
const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

const FEATURES = [
  { icon: "✦", text: "برنامج ولاء للزبائن", delay: 45 },
  { icon: "◆", text: "تحليلات متقدمة", delay: 70 },
  { icon: "★", text: "طلبات غير محدودة", delay: 95 },
  { icon: "◈", text: "أولوية الدعم الفني", delay: 120 },
]

export const Scene4_Upgrade: React.FC = () => {
  const f = useCurrentFrame()
  const titleS = springEntry(f, 5, 0.9, 30)
  const lineOp = fadeIn(f, 18)
  const cardS = springEntry(f, 22, 0.92, 50)
  const btnS = springEntry(f, 150, 0.9, 25)

  const pts = Array.from({ length: 6 }).map((_, i) => ({
    x: 15 + (i * 13) % 70, y: 10 + (i * 17) % 75,
    o: 0.15 + 0.25 * Math.sin(f * 0.008 + i * 2.1),
    s: 6 + i * 3,
  }))

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene4} gradient={BG_GRADIENT.scene3} sceneIndex={3} />
      <Audio src={staticFile("/video/v4.mp3")} />

      {pts.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: "50%", background: i % 2 ? GOLD : TEAL, opacity: p.o, filter: `blur(${i % 2 ? 4 : 2}px)`, transform: `translateY(${12 * Math.sin(f * 0.006 + i * 2)}px)` }} />
      ))}

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 36px" }}>
        <div dir="rtl" style={{ fontSize: 38, fontWeight: 800, color: TXT, textAlign: "center", textShadow: "0 6px 25px rgba(0,0,0,0.7)", opacity: titleS.opacity, transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`, marginBottom: 8 }}>
          <span style={{ color: GOLD }}>رقّ</span> خطتك
        </div>
        <div style={{ width: 40, height: 2, background: `linear-gradient(90deg, ${TEAL}, ${GOLD})`, marginBottom: 16, opacity: lineOp }} />

        {/* Screenshot card with settings page */}
        <div style={{ marginBottom: 10, opacity: cardS.opacity, transform: `scale(${spring({ frame: f - 25, fps: 30, config: { mass: 0.5, damping: 12, stiffness: 70 } })})` }}>
          <PhoneFrame width={200} height={360}>
            <Img src={staticFile("/video/screenshot_settings.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <HighlightOverlay x={50} y={75} w={30} h={10} entranceFrame={40} color={GOLD} pulseSpeed={0.06} />
          </PhoneFrame>
        </div>

        <div style={{ width: "100%", maxWidth: 420, borderRadius: 28, padding: "14px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,215,0,0.2)", opacity: cardS.opacity, transform: `scale(${cardS.scale}) translateY(${cardS.translateY}px)` }}>
          {/* Plan comparison visual */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div dir="rtl">
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>مجاني</div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 1 }}>50 صنف</div>
            </div>
            <div style={{ position: "relative", width: 36, height: 36 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${GOLD}`, transform: `scale(${1 + 0.05 * Math.sin(f * 0.04)})`, display: "flex", alignItems: "center", justifyContent: "center", background: `${GOLD}15` }}>
                <span style={{ color: GOLD, fontSize: 16, fontWeight: 800 }}>→</span>
              </div>
            </div>
            <div dir="rtl">
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 700 }}>مدفوعة</div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 1, textShadow: `0 0 20px ${GOLD}33` }}>غير محدود</div>
            </div>
          </div>

          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent)", marginBottom: 10 }} />

          {FEATURES.map((feat, i) => {
            const featOp = fadeIn(f, feat.delay)
            const featX = interpolate(f, [feat.delay, feat.delay + 8], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, opacity: featOp, transform: `translateX(${featX}px)` }}>
                <span style={{ color: GOLD, fontSize: 14 }}>{feat.icon}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{feat.text}</span>
              </div>
            )
          })}

          <div style={{ marginTop: 10, padding: "10px 0", borderRadius: 50, background: `linear-gradient(135deg, ${GOLD}, #ffaa00)`, textAlign: "center", fontSize: 15, fontWeight: 800, color: "#000", opacity: btnS.opacity, transform: `scale(${btnS.scale})`, boxShadow: `0 0 35px ${GOLD}44, 0 4px 15px rgba(0,0,0,0.3)` }}>
            ترقية الباقة
          </div>
        </div>
      </div>

      {FEATURES.map((feat) => (
        <Sequence key={feat.text} from={feat.delay} durationInFrames={6}>
          <Audio src={staticFile("/video/sfx_tap.mp3")} volume={0.2} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
