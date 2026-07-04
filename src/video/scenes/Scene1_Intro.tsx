import { AbsoluteFill, useCurrentFrame, Audio, Sequence, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { VideoBg } from "../VideoBg"
import { VIDEO_URLS, BG_GRADIENT, AUDIO_URLS, springEntry, fadeIn, TEAL, TXT, DARK_OVERLAY } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

export const Scene1_Intro: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 15], [0, 1])
  const s1 = springEntry(f, 8, 0.85, 40)
  const s2 = springEntry(f, 30, 0.9, 30)
  const lineOp = fadeIn(f, 50)
  const lineW = interpolate(f, [50, 70], [0, 60], { extrapolateRight: "clamp" })
  const scaleAnim = 1 + 0.03 * Math.sin(f * 0.015)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene1} gradient={BG_GRADIENT.scene1} opacity={videoOp} />
      <div style={{ position: "absolute", inset: 0, background: DARK_OVERLAY }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 40px",
      }}>
        {/* Main title */}
        <div dir="rtl" style={{
          fontSize: 76, fontWeight: 800, color: TXT,
          lineHeight: 1.15, textAlign: "center",
          textShadow: "0 10px 30px rgba(0,0,0,0.8)",
          opacity: s1.opacity,
          transform: `scale(${s1.scale * scaleAnim}) translateY(${s1.translateY}px)`,
        }}>
          أهلاً بك في الجيل الجديد لإدارة المطاعم
        </div>

        {/* Accent line */}
        <div style={{
          width: `${lineW}px`, height: 3, borderRadius: 2, background: TEAL,
          margin: "18px auto", opacity: lineOp,
          boxShadow: `0 0 15px ${TEAL}55`,
        }} />

        {/* Subtitle teal */}
        <div dir="rtl" style={{
          fontSize: 28, fontWeight: 700, color: TEAL,
          textAlign: "center", lineHeight: 1.3,
          opacity: s2.opacity,
          transform: `translateY(${s2.translateY}px)`,
          textShadow: "0 4px 20px rgba(0,0,0,0.6)",
        }}>
          أنشئ حسابك وابدأ فوراً في ثوانٍ معدودة
        </div>
      </div>

      <Sequence from={20}>
        <Audio src={AUDIO_URLS.whoosh} volume={0.2} />
      </Sequence>
    </AbsoluteFill>
  )
}
