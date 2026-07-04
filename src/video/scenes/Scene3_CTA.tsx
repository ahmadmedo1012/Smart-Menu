import { AbsoluteFill, useCurrentFrame, Audio, Sequence, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { VideoBg } from "../VideoBg"
import { VIDEO_URLS, BG_GRADIENT, AUDIO_URLS, springEntry, fadeIn, O, GOLD, TEAL, TXT, TXT_MUTED, DARK_OVERLAY } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

const BOT_BLUE = "#2AABEE"

export const Scene3_CTA: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1])
  const headlineS = springEntry(f, 5, 0.85, 35)
  const subS = springEntry(f, 22, 0.9, 25)
  const lineOp = fadeIn(f, 18)
  const leftPanel = springEntry(f, 30, 0.9, 40)
  const rightPanel = springEntry(f, 38, 0.9, 40)
  const badgeS = springEntry(f, 55, 0.85, 20)
  const pulse = 1 + 0.05 * Math.sin(f * 0.06)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene3} gradient={BG_GRADIENT.scene3} opacity={videoOp} />
      <div style={{ position: "absolute", inset: 0, background: DARK_OVERLAY }} />

      {/* Header */}
      <div style={{
        position: "absolute", top: 80, left: 0, right: 0, textAlign: "center",
        padding: "0 40px",
      }}>
        <div dir="rtl" style={{
          fontSize: 40, fontWeight: 800, color: GOLD,
          textShadow: "0 8px 25px rgba(0,0,0,0.7)",
          opacity: headlineS.opacity,
          transform: `scale(${headlineS.scale * pulse}) translateY(${headlineS.translateY}px)`,
        }}>
          التحكم الكامل والقبول الفوري عبر تليجرام
        </div>
        <div style={{ width: 50, height: 3, borderRadius: 2, background: GOLD, margin: "14px auto", opacity: lineOp }} />
        <div dir="rtl" style={{
          fontSize: 18, fontWeight: 400, color: TXT_MUTED, lineHeight: 1.4,
          opacity: subS.opacity, transform: `translateY(${subS.translateY}px)`,
        }}>
          لا حاجة للوحات التحكم المعقدة.. وافق بضغطة زر واحدة
        </div>
      </div>

      {/* Split screen */}
      <div style={{
        position: "absolute", bottom: 120, left: 30, right: 30,
        display: "flex", gap: 14, height: 220,
      }}>
        {/* Left: Telegram notification mock */}
        <div style={{
          flex: 1, borderRadius: 20, padding: 14,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          opacity: leftPanel.opacity,
          transform: `scale(${leftPanel.scale}) translateY(${leftPanel.translateY}px)`,
        }}>
          {/* Telegram header */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: BOT_BLUE,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff",
            }}>S</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TXT }}>SmartMenuBot</div>
          </div>

          {/* Telegram message */}
          <div style={{
            padding: "8px 12px", borderRadius: 12, borderTopLeftRadius: 4,
            background: "rgba(255,255,255,0.06)",
            fontSize: 10, color: TXT, marginBottom: 6, lineHeight: 1.3,
          }}>
            طلب تفعيل الاشتراك لـ "grilled_food_hub"
          </div>

          {/* Action buttons */}
          <div style={{
            display: "flex", gap: 6, marginTop: 6,
            opacity: fadeIn(f, 40),
          }}>
            <div style={{
              flex: 1, padding: "6px 0", borderRadius: 10,
              background: `${TEAL}22`, border: `1px solid ${TEAL}55`,
              textAlign: "center", fontSize: 10, fontWeight: 700, color: TEAL,
            }}>🟢 موافقة على التفعيل</div>
            <div style={{
              flex: 1, padding: "6px 0", borderRadius: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              textAlign: "center", fontSize: 10, fontWeight: 600, color: TXT_MUTED,
            }}>🔴 رفض الطلب</div>
          </div>
        </div>

        {/* Right: Dashboard activation */}
        <div style={{
          flex: 1, borderRadius: 20, padding: 14,
          background: `linear-gradient(145deg, ${O}15, #fb923c08)`,
          border: `1px solid ${O}33`,
          opacity: rightPanel.opacity,
          transform: `scale(${rightPanel.scale}) translateY(${rightPanel.translateY}px)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: TEAL,
              boxShadow: `0 0 6px ${TEAL}`,
            }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: TXT_MUTED }}>بريـــم • نشط</div>
          </div>

          {/* Premium dashboard badge */}
          <div style={{
            padding: "10px 12px", borderRadius: 12,
            background: `${TEAL}10`, border: `1px solid ${TEAL}33`,
            opacity: fadeIn(f, 48),
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: TEAL, marginBottom: 2 }}>
              ✓ Premium Active
            </div>
            <div style={{ fontSize: 9, color: TXT_MUTED }}>
              جميع الميزات مفعلة • QR • تقارير • دعم 24/7
            </div>
          </div>

          {/* Badge */}
          <div style={{
            marginTop: 10, padding: "4px 12px", borderRadius: 10,
            background: `${GOLD}15`, border: `1px solid ${GOLD}33`,
            textAlign: "center",
            opacity: badgeS.opacity,
            transform: `scale(${badgeS.scale})`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: GOLD }}>
              ✦ تم التفعيل — مطعمك جاهز رقمياً
            </span>
          </div>
        </div>
      </div>

      <Sequence from={25}>
        <Audio src={AUDIO_URLS.notification} volume={0.12} />
      </Sequence>
    </AbsoluteFill>
  )
}
