import { AbsoluteFill, useCurrentFrame, Audio, Sequence, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { VideoBg } from "../VideoBg"
import { VIDEO_URLS, BG_GRADIENT, AUDIO_URLS, springEntry, fadeIn, O, TEAL, TXT, TXT_MUTED, DARK_OVERLAY } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] })

export const Scene2_Checkout: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1])
  const titleS = springEntry(f, 5, 0.9, 40)
  const lineOp = fadeIn(f, 18)
  const cardS = springEntry(f, 20, 0.9, 50)
  const slugOp = fadeIn(f, 42)
  const alertOp = fadeIn(f, 55)
  const statusS = springEntry(f, 70, 0.9, 30)
  const btnS = springEntry(f, 80, 0.85, 25)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene2} gradient={BG_GRADIENT.scene2} opacity={videoOp} />
      <div style={{ position: "absolute", inset: 0, background: DARK_OVERLAY }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 36px",
      }}>
        {/* Title */}
        <div dir="rtl" style={{
          fontSize: 52, fontWeight: 800, color: TXT,
          textAlign: "center", lineHeight: 1.25,
          textShadow: "0 10px 30px rgba(0,0,0,0.8)",
          opacity: titleS.opacity,
          transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`,
          marginBottom: 16,
        }}>
          احجز رابط مطعمك الخاص فوراً
        </div>
        <div style={{ width: 50, height: 3, borderRadius: 2, background: TEAL, marginBottom: 28, opacity: lineOp }} />

        {/* Checkout UI card — larger, lighter */}
        <div style={{
          width: "92%", maxWidth: 480, borderRadius: 28,
          padding: "32px 28px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          opacity: cardS.opacity,
          transform: `scale(${cardS.scale}) translateY(${cardS.translateY}px)`,
        }}>
          {/* Input label */}
          <div dir="rtl" style={{ fontSize: 15, color: TXT_MUTED, marginBottom: 8, fontWeight: 600 }}>
            اسم المطعم
          </div>

          {/* Input field */}
          <div style={{
            padding: "18px 20px", borderRadius: 16,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ flex: 1, fontSize: 22, fontWeight: 700, color: TXT, letterSpacing: "-0.01em" }}>
              grilled_food_hub
            </div>
            {/* Verified checkmark — large, bright */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `${TEAL}20`, border: `2.5px solid ${TEAL}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 20px ${TEAL}44`,
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={3.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          {/* Slug availability — bigger */}
          <div dir="rtl" style={{
            fontSize: 14, color: TEAL, marginTop: 8, fontWeight: 600,
            opacity: slugOp,
          }}>
            ✓ smartmenu.com/grilled_food_hub — متاح
          </div>

          {/* Alert banner — bigger text, orange border, full width */}
          <div dir="rtl" style={{
            marginTop: 18, padding: "14px 18px", borderRadius: 14,
            background: `${O}18`, border: `1px solid ${O}44`,
            fontSize: 14, color: TXT, lineHeight: 1.5, fontWeight: 600,
            opacity: alertOp,
          }}>
            فحص تلقائي وحجز فوري للروابط لضمان عدم التكرار
          </div>
        </div>

        {/* Status + CTA — bigger */}
        <div style={{
          textAlign: "center", marginTop: 36,
          opacity: statusS.opacity, transform: `translateY(${statusS.translateY}px)`,
        }}>
          <div dir="rtl" style={{ fontSize: 20, fontWeight: 700, color: TEAL, textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
            ✓ تم التحقق — الرابط متاح للحجز الفوري
          </div>
          <div style={{
            display: "inline-block", marginTop: 16,
            padding: "14px 44px", borderRadius: 50,
            background: `linear-gradient(145deg, ${O}, #fb923c)`,
            fontSize: 18, fontWeight: 800, color: "#fff",
            opacity: btnS.opacity, transform: `scale(${btnS.scale})`,
            boxShadow: `0 0 40px ${O}55`,
          }}>
            احجز الآن
          </div>
        </div>
      </div>

      <Sequence from={20}>
        <Audio src={AUDIO_URLS.ding} volume={0.1} />
      </Sequence>
    </AbsoluteFill>
  )
}
