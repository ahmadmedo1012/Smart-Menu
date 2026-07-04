import { AbsoluteFill, useCurrentFrame, Audio, Sequence, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { VideoBg } from "../VideoBg"
import { VIDEO_URLS, BG_GRADIENT, AUDIO_URLS, springEntry, fadeIn, O, GOLD, TEAL, TXT, TXT_MUTED } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

const BOT_BLUE = "#2AABEE"
const OVERLAY = "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.2) 100%)"

export const Scene3_CTA: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1])
  const headlineS = springEntry(f, 5, 0.9, 40)
  const lineOp = fadeIn(f, 18)
  const subS = springEntry(f, 22, 0.9, 30)
  const telPanel = springEntry(f, 35, 0.9, 40)
  const dashPanel = springEntry(f, 65, 0.9, 40)
  const badgeS = springEntry(f, 85, 0.85, 25)
  const pulse = 1 + 0.035 * Math.sin(f * 0.05)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene3} gradient={BG_GRADIENT.scene3} opacity={videoOp} />
      <div style={{ position: "absolute", inset: 0, background: OVERLAY }} />

      {/* All content centered */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "60px 32px 40px",
      }}>
        {/* Headline block */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div dir="rtl" style={{
            fontSize: 44, fontWeight: 800, color: GOLD,
            textShadow: "0 10px 30px rgba(0,0,0,0.8)",
            opacity: headlineS.opacity,
            transform: `scale(${headlineS.scale * pulse}) translateY(${headlineS.translateY}px)`,
            lineHeight: 1.25,
          }}>
            التحكم الكامل والقبول الفوري عبر تليجرام
          </div>
          <div style={{ width: 50, height: 3, borderRadius: 2, background: GOLD, margin: "10px auto", opacity: lineOp, boxShadow: `0 0 15px ${GOLD}55` }} />
          <div dir="rtl" style={{
            fontSize: 18, color: TXT_MUTED, lineHeight: 1.4, fontWeight: 400,
            opacity: subS.opacity, transform: `translateY(${subS.translateY}px)`,
          }}>
            لا حاجة للوحات التحكم المعقدة.. وافق بضغطة زر واحدة
          </div>
        </div>

        {/* Cards — compact, side by side when possible, stack on narrow */}
        <div style={{ width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Telegram card */}
          <div style={{
            borderRadius: 22, padding: 16,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            opacity: telPanel.opacity,
            transform: `scale(${telPanel.scale}) translateY(${telPanel.translateY}px)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: BOT_BLUE,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: "#fff",
                boxShadow: `0 0 15px ${BOT_BLUE}44`,
              }}>S</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TXT }}>SmartMenuBot</div>
                <div style={{ fontSize: 9, color: TXT_MUTED }}>نشط الآن</div>
              </div>
            </div>

            <div style={{
              padding: "10px 14px", borderRadius: 12, borderTopLeftRadius: 4,
              background: "rgba(255,255,255,0.08)",
              fontSize: 13, color: TXT, lineHeight: 1.4, fontWeight: 600,
              marginBottom: 8,
              opacity: fadeIn(f, 45),
            }}>
              طلب تفعيل الاشتراك لـ "grilled_food_hub"
            </div>

            <div style={{ display: "flex", gap: 6, opacity: fadeIn(f, 55) }}>
              <div style={{
                flex: 1, padding: "8px 0", borderRadius: 12,
                background: `${TEAL}25`, border: `1.5px solid ${TEAL}`,
                textAlign: "center", fontSize: 12, fontWeight: 700, color: TEAL,
              }}>
                🟢 موافقة على التفعيل
              </div>
              <div style={{
                flex: 1, padding: "8px 0", borderRadius: 12,
                background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.15)",
                textAlign: "center", fontSize: 12, fontWeight: 700, color: TXT_MUTED,
              }}>
                🔴 رفض الطلب
              </div>
            </div>
          </div>

          {/* Dashboard card */}
          <div style={{
            borderRadius: 22, padding: 16,
            background: `linear-gradient(145deg, ${O}15, #fb923c06)`,
            border: `1.5px solid ${O}44`,
            opacity: dashPanel.opacity,
            transform: `scale(${dashPanel.scale}) translateY(${dashPanel.translateY}px)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", background: TEAL,
                boxShadow: `0 0 8px ${TEAL}`,
              }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: TXT_MUTED }}>بريـــم • نشط</div>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 10, opacity: fadeIn(f, 75) }}>
              {["QR", "تقارير", "دعم 24/7"].map((t, i) => (
                <div key={i} style={{
                  padding: "3px 8px", borderRadius: 6,
                  background: `${TEAL}15`, border: `1px solid ${TEAL}33`,
                  fontSize: 9, fontWeight: 700, color: TEAL,
                }}>
                  {t}
                </div>
              ))}
            </div>

            <div style={{
              padding: "10px 14px", borderRadius: 12,
              background: `${GOLD}15`, border: `1.5px solid ${GOLD}44`,
              textAlign: "center",
              opacity: badgeS.opacity, transform: `scale(${badgeS.scale})`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: GOLD, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
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
