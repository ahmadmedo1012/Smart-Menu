import { AbsoluteFill, useCurrentFrame, Audio, Sequence, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { VideoBg } from "../VideoBg"
import { VIDEO_URLS, BG_GRADIENT, AUDIO_URLS, springEntry, fadeIn, O, GOLD, TEAL, TXT, TXT_MUTED, DARK_OVERLAY } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

const BOT_BLUE = "#2AABEE"

export const Scene3_CTA: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1])
  const headlineS = springEntry(f, 5, 0.9, 40)
  const lineOp = fadeIn(f, 20)
  const subS = springEntry(f, 22, 0.9, 30)

  // Telegram panel
  const telPanel = springEntry(f, 35, 0.9, 50)
  const msgOp = fadeIn(f, 50)
  const btnOp = fadeIn(f, 60)

  // Dashboard panel
  const dashPanel = springEntry(f, 65, 0.9, 50)
  const badgeS = springEntry(f, 85, 0.85, 30)
  const pulse = 1 + 0.04 * Math.sin(f * 0.05)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene3} gradient={BG_GRADIENT.scene3} opacity={videoOp} />
      <div style={{ position: "absolute", inset: 0, background: DARK_OVERLAY }} />

      <div style={{
        position: "absolute", top: 60, left: 30, right: 30,
        textAlign: "center",
      }}>
        <div dir="rtl" style={{
          fontSize: 46, fontWeight: 800, color: GOLD,
          textShadow: "0 10px 30px rgba(0,0,0,0.8)",
          opacity: headlineS.opacity,
          transform: `scale(${headlineS.scale * pulse}) translateY(${headlineS.translateY}px)`,
          lineHeight: 1.25,
        }}>
          التحكم الكامل والقبول الفوري عبر تليجرام
        </div>
        <div style={{ width: 50, height: 3, borderRadius: 2, background: GOLD, margin: "12px auto", opacity: lineOp }} />
        <div dir="rtl" style={{
          fontSize: 20, color: TXT_MUTED, lineHeight: 1.4,
          opacity: subS.opacity, transform: `translateY(${subS.translateY}px)`,
        }}>
          لا حاجة للوحات التحكم المعقدة.. وافق بضغطة زر واحدة
        </div>
      </div>

      {/* Cards area */}
      <div style={{
        position: "absolute", bottom: 100, left: 36, right: 36,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        {/* Telegram card */}
        <div style={{
          borderRadius: 24, padding: 20,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          opacity: telPanel.opacity,
          transform: `scale(${telPanel.scale}) translateY(${telPanel.translateY}px)`,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: BOT_BLUE,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff",
              boxShadow: `0 0 15px ${BOT_BLUE}55`,
            }}>S</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>SmartMenuBot</div>
              <div style={{ fontSize: 10, color: TXT_MUTED }}>بوت • نشط الآن</div>
            </div>
          </div>

          {/* Message bubble */}
          <div style={{
            padding: "12px 16px", borderRadius: 14, borderTopLeftRadius: 4,
            background: "rgba(255,255,255,0.08)",
            fontSize: 14, color: TXT, lineHeight: 1.4, fontWeight: 600,
            marginBottom: 10, opacity: msgOp,
          }}>
            طلب تفعيل الاشتراك لـ "grilled_food_hub"
          </div>

          {/* Inline buttons */}
          <div style={{
            display: "flex", gap: 8,
            opacity: btnOp,
          }}>
            <div style={{
              flex: 1, padding: "10px 0", borderRadius: 14,
              background: `${TEAL}22`, border: `1.5px solid ${TEAL}`,
              textAlign: "center", fontSize: 13, fontWeight: 700, color: TEAL,
            }}>
              🟢 موافقة على التفعيل
            </div>
            <div style={{
              flex: 1, padding: "10px 0", borderRadius: 14,
              background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.15)",
              textAlign: "center", fontSize: 13, fontWeight: 700, color: TXT_MUTED,
            }}>
              🔴 رفض الطلب
            </div>
          </div>
        </div>

        {/* Dashboard card */}
        <div style={{
          borderRadius: 24, padding: 20,
          background: `linear-gradient(145deg, ${O}18, #fb923c08)`,
          border: `1.5px solid ${O}44`,
          opacity: dashPanel.opacity,
          transform: `scale(${dashPanel.scale}) translateY(${dashPanel.translateY}px)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%", background: TEAL,
              boxShadow: `0 0 8px ${TEAL}`,
            }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: TXT_MUTED }}>بريـــم • نشط</div>
          </div>

          {/* Active features */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, opacity: fadeIn(f, 78) }}>
            {["QR", "تقارير", "دعم 24/7"].map((t, i) => (
              <div key={i} style={{
                padding: "4px 10px", borderRadius: 8,
                background: `${TEAL}12`, border: `1px solid ${TEAL}33`,
                fontSize: 10, fontWeight: 600, color: TEAL,
              }}>
                {t}
              </div>
            ))}
          </div>

          {/* Activated badge */}
          <div style={{
            padding: "12px 16px", borderRadius: 14,
            background: `${GOLD}15`, border: `1.5px solid ${GOLD}44`,
            textAlign: "center",
            opacity: badgeS.opacity,
            transform: `scale(${badgeS.scale})`,
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: GOLD }}>
              ✦ تم التفعيل — مطعمك جاهز رقمياً
            </span>
          </div>
        </div>
      </div>

      <Sequence from={30}>
        <Audio src={AUDIO_URLS.notification} volume={0.12} />
      </Sequence>
    </AbsoluteFill>
  )
}
