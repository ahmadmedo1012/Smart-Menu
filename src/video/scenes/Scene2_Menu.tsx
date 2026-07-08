import { AbsoluteFill, useCurrentFrame, Img, spring, staticFile, interpolate } from "remotion"
import { Audio } from "@remotion/media"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { springEntry, fadeIn, TEAL, TXT, VIDEO_URLS, BG_GRADIENT } from "../shared"
import { PhoneFrame } from "../PhoneFrame"
import { HighlightOverlay } from "../HighlightOverlay"
import { VideoBg } from "../VideoBg"
const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

const SHOTS = [
  { src: staticFile("/video/screenshot_dashboard.png"), label: "لوحة التحكم", sub: "إدارة كاملة", hlX: 40, hlY: 12, hlW: 20, hlH: 8 },
  { src: staticFile("/video/screenshot_menu_page.png"), label: "إدارة المنيو", sub: "أضف الأصناف", hlX: 50, hlY: 85, hlW: 25, hlH: 10 },
  { src: staticFile("/video/screenshot_live_menu.png"), label: "المنيو العام", sub: "عرض احترافي", hlX: 30, hlY: 30, hlW: 40, hlH: 12 },
]
const PER = 110

export const Scene2_Menu: React.FC = () => {
  const f = useCurrentFrame()
  const titleS = springEntry(f, 5, 0.9, 30)
  const lineOp = fadeIn(f, 15)

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene2} gradient={BG_GRADIENT.scene2} sceneIndex={1} />
      <Audio src={staticFile("/video/v2.mp3")} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 20px 0" }}>
        <div dir="rtl" style={{ fontSize: 32, fontWeight: 800, color: TXT, textAlign: "center", textShadow: "0 6px 25px rgba(0,0,0,0.7)", opacity: titleS.opacity, transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)` }}>
          <span style={{ color: TEAL }}>المنيو الرقمي</span> لمطعمك
        </div>
        <div style={{ width: 30, height: 2, background: TEAL, margin: "8px auto 10px", opacity: lineOp, boxShadow: `0 0 12px ${TEAL}55` }} />

        {/* Phone carousel */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", position: "relative" }}>
          {SHOTS.map((ss, i) => {
            const startAt = PER * i
            const op = interpolate(f, [startAt, startAt + 20, startAt + PER - 20, startAt + PER], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            if (f < startAt - 5 || f > startAt + PER + 5) return null
            const s = spring({ frame: f - startAt, fps: 30, config: { mass: 0.6, damping: 14, stiffness: 70 } })
            return (
              <div key={ss.label} style={{ position: "absolute", opacity: op, transform: `scale(${s})` }}>
                <PhoneFrame width={280} height={500}>
                  <Img src={ss.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <HighlightOverlay x={ss.hlX} y={ss.hlY} w={ss.hlW} h={ss.hlH} entranceFrame={startAt + 15} />
                </PhoneFrame>
                <div dir="rtl" style={{ textAlign: "center", marginTop: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: TXT, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>{ss.label}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{ss.sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Dots */}
        <div style={{ position: "absolute", bottom: 36, display: "flex", gap: 8 }}>
          {SHOTS.map((_, i) => {
            const active = f >= PER * i && f < PER * (i + 1)
            return <div key={i} style={{ width: active ? 26 : 7, height: 7, borderRadius: 4, background: active ? TEAL : "rgba(255,255,255,0.15)", boxShadow: active ? `0 0 10px ${TEAL}44` : "none" }} />
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
