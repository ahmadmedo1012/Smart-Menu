import { AbsoluteFill, useCurrentFrame, Audio, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { VideoBg } from "../VideoBg"
import { VIDEO_URLS, BG_GRADIENT, AUDIO_URLS, springEntry, fadeIn, fadeOut, SPRING_CONFIGS, O, TXT, TXT_MUTED, GLOW, GRAD_BTN } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "700", "800"] })

interface Props { frameOffset?: number }

export const Scene3_CTA: React.FC<Props> = ({ frameOffset = 0 }) => {
  const f = useCurrentFrame() - frameOffset
  const videoOp = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })
  const fade = fadeOut(f, 120)
  const badgeS = springEntry(f, 5, SPRING_CONFIGS.badge)
  const titleS = springEntry(f, 20, SPRING_CONFIGS.title)
  const ctaS = springEntry(f, 35, SPRING_CONFIGS.cta)
  const msgOp = fadeIn(f, 50)
  const chipS = fadeIn(f, 55)
  const btnPulse = 1 + 0.04 * Math.sin(f * 0.07)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily, opacity: fade }}>
      <VideoBg src={VIDEO_URLS.scene3} gradient={BG_GRADIENT.scene3} opacity={videoOp} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.3) 100%)",
      }} />
      <div style={{
        position: "absolute", bottom: "30%", left: "50%",
        transform: "translateX(-50%)",
        width: 400, height: 400, borderRadius: "50%",
        background: `radial-gradient(circle, ${O}22, transparent 70%)`,
        filter: "blur(60px)",
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        paddingBottom: 140,
      }}>
        {/* Badge */}
        <div style={{
          padding: "5px 18px", borderRadius: 20,
          background: `${O}22`, border: `1px solid ${O}44`,
          fontSize: 11, fontWeight: 600, color: O,
          letterSpacing: "0.15em", marginBottom: 12,
          opacity: badgeS.opacity,
          transform: `scale(${badgeS.scale}) translateY(${badgeS.translateY}px)`,
        }}>
          انطلق الآن
        </div>

        {/* Headline */}
        <div dir="rtl" style={{
          fontSize: 36, fontWeight: 700, color: TXT,
          lineHeight: 1.15, textAlign: "center",
          opacity: titleS.opacity,
          transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`,
        }}>
          مطعمك جاهز للانطلاق <span style={{ color: O }}>الرقمي</span>
        </div>

        {/* Accent line */}
        <div style={{
          width: 40, height: 3, borderRadius: 2, background: O,
          margin: "12px auto", boxShadow: `0 0 10px ${GLOW}`,
          opacity: fadeIn(f, 42),
        }} />

        {/* CTA Button */}
        <div style={{
          padding: "13px 44px", borderRadius: 50,
          background: GRAD_BTN,
          transform: `scale(${ctaS.scale * btnPulse})`,
          opacity: ctaS.opacity,
          boxShadow: `0 0 30px ${GLOW}`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
            ابدأ مجاناً
          </span>
        </div>

        {/* Subtext */}
        <div dir="rtl" style={{
          fontSize: 12, color: TXT_MUTED, marginTop: 8,
          opacity: msgOp,
        }}>
          مجاناً • بدون بطاقة • دعم فني متكامل
        </div>

        {/* Chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, opacity: chipS }}>
          {["QR سريع", "تقارير", "دعم 24/7"].map((t, i) => (
            <div key={i} style={{
              padding: "4px 12px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 10, fontWeight: 500, color: TXT_MUTED,
              opacity: fadeIn(f, 55 + i * 3),
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      <Audio src={AUDIO_URLS.ding} volume={0.12} />
    </AbsoluteFill>
  )
}
