import { AbsoluteFill, useCurrentFrame, Audio, Sequence, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { VideoBg } from "../VideoBg"
import { VIDEO_URLS, BG_GRADIENT, AUDIO_URLS, springEntry, fadeIn, O, TEAL, TXT, TXT_MUTED, DARK_OVERLAY } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"] })

export const Scene2_Checkout: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1])
  const titleS = springEntry(f, 5, 0.85, 30)
  const cardS = springEntry(f, 18, 0.9, 40)
  const lineOp = fadeIn(f, 15)
  const statusS = springEntry(f, 40, 0.9, 20)
  const btnS = springEntry(f, 55, 0.85, 25)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene2} gradient={BG_GRADIENT.scene2} opacity={videoOp} />
      <div style={{ position: "absolute", inset: 0, background: DARK_OVERLAY }} />

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 36px",
      }}>
        {/* Floating title */}
        <div dir="rtl" style={{
          fontSize: 38, fontWeight: 800, color: TXT,
          textAlign: "center", lineHeight: 1.2,
          textShadow: "0 8px 25px rgba(0,0,0,0.7)",
          opacity: titleS.opacity,
          transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`,
          marginBottom: 20,
        }}>
          احجز رابط مطعمك الخاص فوراً
        </div>
        <div style={{ width: 40, height: 2, borderRadius: 1, background: TEAL, marginBottom: 24, opacity: lineOp }} />

        {/* Checkout UI mockup card */}
        <div style={{
          width: "85%", maxWidth: 440, borderRadius: 24,
          padding: "28px 24px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
          opacity: cardS.opacity,
          transform: `scale(${cardS.scale}) translateY(${cardS.translateY}px)`,
        }}>
          {/* Restaurant name input */}
          <div dir="rtl" style={{ fontSize: 12, color: TXT_MUTED, marginBottom: 6, fontWeight: 600 }}>اسم المطعم</div>
          <div style={{
            padding: "14px 16px", borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ flex: 1, fontSize: 18, fontWeight: 700, color: TXT, letterSpacing: "-0.01em" }}>
              grilled_food_hub
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: `${TEAL}22`, border: `2px solid ${TEAL}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          {/* Slug preview */}
          <div dir="rtl" style={{
            fontSize: 11, color: TEAL, marginTop: 6,
            opacity: fadeIn(f, 25),
          }}>
            ✓ smartmenu.com/grilled_food_hub — متاح
          </div>

          {/* Side banner alert */}
          <div dir="rtl" style={{
            marginTop: 14, padding: "10px 14px", borderRadius: 12,
            background: `${O}15`, border: `1px solid ${O}33`,
            fontSize: 12, color: TXT_MUTED, lineHeight: 1.4,
            opacity: fadeIn(f, 35),
          }}>
            فحص تلقائي وحجز فوري للروابط لضمان عدم التكرار
          </div>
        </div>

        {/* Status + CTA */}
        <div style={{ textAlign: "center", marginTop: 32, opacity: statusS.opacity, transform: `translateY(${statusS.translateY}px)` }}>
          <div dir="rtl" style={{ fontSize: 16, fontWeight: 700, color: TEAL }}>
            ✓ تم التحقق — الرابط متاح للحجز الفوري
          </div>
          <div style={{
            display: "inline-block", marginTop: 12,
            padding: "12px 36px", borderRadius: 50,
            background: `linear-gradient(145deg, ${O}, #fb923c)`,
            fontSize: 15, fontWeight: 800, color: "#fff",
            opacity: btnS.opacity,
            transform: `scale(${btnS.scale})`,
            boxShadow: `0 0 30px ${O}44`,
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
