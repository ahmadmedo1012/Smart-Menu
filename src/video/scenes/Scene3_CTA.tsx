import { AbsoluteFill, useCurrentFrame, Audio, Sequence, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { VideoBg } from "../VideoBg"
import { VIDEO_URLS, BG_GRADIENT, AUDIO_URLS, springEntry, fadeIn, GOLD, TEAL, TXT, TXT_MUTED } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

const BOT_BLUE = "#2AABEE"
// Very soft vignette preserves brightness
const VIGNETTE = "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.35) 100%)"

export const Scene3_CTA: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1])
  const headlineS = springEntry(f, 5, 0.9, 40)
  const lineOp = fadeIn(f, 18)
  const subS = springEntry(f, 22, 0.9, 30)
  const telPanel = springEntry(f, 35, 0.9, 40)
  const dashPanel = springEntry(f, 62, 0.9, 40)
  const badgeS = springEntry(f, 80, 0.85, 25)
  const pulse = 1 + 0.035 * Math.sin(f * 0.05)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene3} gradient={BG_GRADIENT.scene3} opacity={videoOp} />
      <div style={{ position: "absolute", inset: 0, background: VIGNETTE }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 32px",
      }}>
        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div dir="rtl" style={{
            fontSize: 44, fontWeight: 800, color: GOLD,
            textShadow: "0 8px 25px rgba(0,0,0,0.7)",
            opacity: headlineS.opacity,
            transform: `scale(${headlineS.scale * pulse}) translateY(${headlineS.translateY}px)`,
            lineHeight: 1.25,
          }}>
            التحكم الكامل والقبول الفوري عبر تليجرام
          </div>
          <div style={{ width: 50, height: 3, borderRadius: 2, background: GOLD, margin: "10px auto", opacity: lineOp, boxShadow: `0 0 15px ${GOLD}55` }} />
          <div dir="rtl" style={{
            fontSize: 18, color: TXT_MUTED, lineHeight: 1.4,
            opacity: subS.opacity, transform: `translateY(${subS.translateY}px)`,
          }}>
            لا حاجة للوحات التحكم المعقدة.. وافق بضغطة زر واحدة
          </div>
        </div>

        {/* Cards — bright bg */}
        <div style={{ width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Telegram card */}
          <div style={{
            borderRadius: 22, padding: 16,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 30px rgba(0,0,0,0.25)",
            opacity: telPanel.opacity,
            transform: `scale(${telPanel.scale}) translateY(${telPanel.translateY}px)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: BOT_BLUE,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: "#fff",
                boxShadow: `0 0 15px ${BOT_BLUE}55`,
              }}>S</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TXT }}>SmartMenuBot</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>نشط الآن</div>
              </div>
            </div>

            <div style={{
              padding: "10px 14px", borderRadius: 12, borderTopLeftRadius: 4,
              background: "rgba(255,255,255,0.12)",
              fontSize: 13, color: TXT, lineHeight: 1.4, fontWeight: 600,
              marginBottom: 8,
              opacity: fadeIn(f, 45),
            }}>
              {`طلب تفعيل الاشتراك لـ “grilled_food_hub”`}
            </div>

            <div style={{ display: "flex", gap: 6, opacity: fadeIn(f, 55) }}>
              <div style={{
                flex: 1, padding: "8px 0", borderRadius: 12,
                background: `${TEAL}30`, border: `1.5px solid ${TEAL}`,
                textAlign: "center", fontSize: 12, fontWeight: 700, color: TEAL,
                textShadow: "0 1px 6px rgba(0,0,0,0.3)",
              }}>
                🟢 موافقة على التفعيل
              </div>
              <div style={{
                flex: 1, padding: "8px 0", borderRadius: 12,
                background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.2)",
                textAlign: "center", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)",
              }}>
                🔴 رفض الطلب
              </div>
            </div>
          </div>

          {/* Dashboard card */}
          <div style={{
            borderRadius: 22, padding: 16,
            background: "rgba(255,255,255,0.12)",
            border: `1.5px solid rgba(255,255,255,0.2)`,
            boxShadow: "0 4px 30px rgba(0,0,0,0.25)",
            opacity: dashPanel.opacity,
            transform: `scale(${dashPanel.scale}) translateY(${dashPanel.translateY}px)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", background: TEAL,
                boxShadow: `0 0 8px ${TEAL}`,
              }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>بريـــم • نشط</div>
            </div>

            {/* Features row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, opacity: fadeIn(f, 72) }}>
              {["QR", "تقارير", "دعم 24/7"].map((t, i) => (
                <div key={i} style={{
                  padding: "3px 8px", borderRadius: 6,
                  background: `${TEAL}20`, border: `1px solid ${TEAL}44`,
                  fontSize: 9, fontWeight: 700, color: TEAL,
                }}>
                  {t}
                </div>
              ))}
            </div>

            {/* Activated badge */}
            <div style={{
              padding: "10px 14px", borderRadius: 12,
              background: `${GOLD}20`, border: `1.5px solid ${GOLD}55`,
              textAlign: "center",
              opacity: badgeS.opacity, transform: `scale(${badgeS.scale})`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: GOLD, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
                ✦ تم التفعيل — مطعمك جاهز رقمياً
              </span>
            </div>
          </div>
        </div>
      </div>

      <Sequence from={30}>
        <Audio src={AUDIO_URLS.notification} volume={0.12} />
      </Sequence>
    </AbsoluteFill>
  )
}
