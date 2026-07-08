import { AbsoluteFill, useCurrentFrame, spring, staticFile } from "remotion"
import { Audio } from "@remotion/media"
import { loadFont } from "@remotion/google-fonts/Cairo"
import { springEntry, fadeIn, GOLD, TEAL, TXT, VIDEO_URLS, BG_GRADIENT } from "../shared"
import { VideoBg } from "../VideoBg"

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"] })

export const Scene5_CTA: React.FC = () => {
  const f = useCurrentFrame()
  const s1 = springEntry(f, 5, 0.85, 50)
  const lineS = springEntry(f, 28, 1, 20)
  const s2 = springEntry(f, 35, 0.95, 30)
  const pulse = 1 + 0.035 * Math.sin(f * 0.05)

  const particles = Array.from({ length: 10 }).map((_, i) => ({
    r: 2 + i % 3,
    sx: 50 + 35 * Math.sin(i * 1.3),
    sy: 50 + 35 * Math.cos(i * 1.3),
    o: 0.15 + 0.2 * Math.sin(f * 0.01 + i * 1.7),
    size: 3 + i % 5,
  }))

  return (
    <AbsoluteFill style={{ background: "#3a3020", fontFamily }}>
      <VideoBg src={VIDEO_URLS.scene5} gradient={BG_GRADIENT.scene1} sceneIndex={4} />
      <Audio src={staticFile("/video/v5.mp3")} />

      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.08) 0%, transparent 50%)" }} />

      {/* Orbiting particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.sx + 15 * Math.sin(f * 0.008 + i * 2)}%`,
          top: `${p.sy + 15 * Math.cos(f * 0.008 + i * 2)}%`,
          width: p.size, height: p.size,
          borderRadius: "50%",
          background: i % 3 === 0 ? GOLD : i % 3 === 1 ? "rgba(255,255,255,0.4)" : TEAL,
          opacity: p.o,
          filter: `blur(${i % 2}px)`,
        }} />
      ))}

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
        <div dir="rtl" style={{ fontSize: 72, fontWeight: 900, color: TXT, textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.02em", textShadow: "0 10px 40px rgba(0,0,0,0.8)", opacity: s1.opacity, transform: `scale(${s1.scale * pulse}) translateY(${s1.translateY}px)` }}>
          ابدأ الآن
        </div>
        <div style={{ width: 50, height: 3, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: "14px auto", opacity: lineS.opacity, transform: `scaleX(${lineS.scale})` }} />
        <div dir="rtl" style={{ fontSize: 26, fontWeight: 700, color: GOLD, textAlign: "center", opacity: s2.opacity, transform: `translateY(${s2.translateY}px)`, textShadow: "0 4px 25px rgba(255,215,0,0.3)" }}>
          smart-menu.ly
        </div>
        <div dir="rtl" style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 14, opacity: fadeIn(f, 50) }}>
          منيو رقمي لمطعمك — الربط الذكي
        </div>

        <div style={{
          marginTop: 30, padding: "14px 48px", borderRadius: 50,
          background: `linear-gradient(135deg, ${GOLD}, #ffaa00)`,
          fontSize: 18, fontWeight: 800, color: "#000",
          opacity: fadeIn(f, 55),
          transform: `scale(${spring({ frame: f - 55, fps: 30, config: { mass: 0.5, damping: 10, stiffness: 100 } })})`,
          boxShadow: `0 0 50px ${GOLD}44, 0 4px 15px rgba(0,0,0,0.3)`,
        }}>
          ابدأ الآن
        </div>
      </div>
    </AbsoluteFill>
  )
}
