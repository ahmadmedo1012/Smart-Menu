import { AbsoluteFill, useCurrentFrame, OffthreadVideo, Audio, Sequence, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { VIDEO_URLS, AUDIO_URLS, springEntry, fadeIn, SPRING_CONFIGS, O, TXT, TXT_MUTED, GLOW } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "700", "800"] })

export const Scene1_Intro: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })
  const overlayOp = interpolate(f, [0, 20], [0.6, 0.3], { extrapolateRight: "clamp" })
  const titleS = springEntry(f, 10, SPRING_CONFIGS.title)
  const taglineS = springEntry(f, 25, SPRING_CONFIGS.tagline)
  const lineW = interpolate(f, [45, 60], [0, 40], { extrapolateRight: "clamp", easing: (t) => t * (2 - t) })

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <OffthreadVideo src={VIDEO_URLS.scene1} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: videoOp,
      }} muted />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)",
        opacity: overlayOp,
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: `linear-gradient(0deg, ${O}22, transparent)`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {/* Logo icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: `linear-gradient(145deg, ${O}, #fb923c)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18,
          opacity: titleS.opacity,
          transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`,
          boxShadow: `0 0 50px ${GLOW}`,
        }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
            <path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" /><circle cx="12" cy="12" r="8" /><path d="M8 12l2 2 4-4" />
          </svg>
        </div>

        {/* Smart Menu title */}
        <div style={{
          fontSize: 56, fontWeight: 700, color: TXT,
          letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 4,
          opacity: titleS.opacity,
          transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`,
        }}>
          Smart Menu
        </div>

        {/* Arabic tagline */}
        <div dir="rtl" style={{
          fontSize: 16, fontWeight: 400, color: TXT_MUTED,
          marginTop: 6, opacity: taglineS.opacity,
          transform: `translateY(${taglineS.translateY}px)`,
        }}>
          مدعوم بالذكاء الاصطناعي
        </div>

        {/* Accent line */}
        <div style={{
          width: `${lineW}px`, height: 3, borderRadius: 2, background: O,
          marginTop: 10, boxShadow: `0 0 10px ${GLOW}`,
        }} />

        {/* Tech badges */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, opacity: fadeIn(f, 60) }}>
          {["QR Menu", "AI", "Telegram"].map((t, i) => (
            <div key={i} style={{
              padding: "4px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 11, fontWeight: 600, color: TXT_MUTED,
              opacity: fadeIn(f, 60 + i * 5),
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      <Sequence from={18}>
        <Audio src={AUDIO_URLS.whoosh} volume={0.25} />
      </Sequence>
    </AbsoluteFill>
  )
}
