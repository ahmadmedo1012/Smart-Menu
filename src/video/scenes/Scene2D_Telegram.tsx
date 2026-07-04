import { AbsoluteFill, useCurrentFrame, Audio, Sequence, interpolate } from "remotion"
import type { SpringConfig } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { springEntry, SPRING_CONFIGS, O, TXT, TXT_MUTED, AUDIO_URLS } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "700"] })

interface Props { frameOffset: number }

const BOT_BLUE = "#2AABEE"

export const Scene2D_Telegram: React.FC<Props> = ({ frameOffset }) => {
  const f = useCurrentFrame() - frameOffset
  const op = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" })
  const fade = interpolate(f, [85, 90], [0, 1], { extrapolateLeft: "clamp" })

  return (
    <AbsoluteFill style={{ fontFamily, opacity: op * (1 - fade) }}>
      {/* Telegram header */}
      <div style={{
        position: "absolute", top: 100, left: 50, right: 50,
        background: "rgba(255,255,255,0.06)", borderRadius: 16,
        padding: 12, border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: BOT_BLUE,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
          }}>S</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>SmartMenuBot</div>
            <div style={{ fontSize: 9, color: TXT_MUTED }}>بوت • نشط الآن</div>
          </div>
        </div>
      </div>

      {/* Chat bubbles */}
      <div style={{ position: "absolute", top: 170, left: 50, right: 50 }}>
        {/* Bot: confirmation request */}
        <ChatBubble
          frame={f}
          entrance={5}
          text="طلب تأكيد الاشتراك في خطة Pro"
          isBot
        />
        {/* Bot: price */}
        <ChatBubble
          frame={f}
          entrance={30}
          text="المبلغ: $99/شهرياً"
          isBot
        />
        {/* Bot: approve/reject buttons */}
        <div style={{
          display: "flex", gap: 8, marginTop: 10,
          opacity: springEntry(f, 50, SPRING_CONFIGS.card).opacity,
          transform: `translateY(${interpolate(springEntry(f, 50, SPRING_CONFIGS.card).scale, [0.85, 1], [20, 0])}px)`,
        }}>
          <div style={{
            flex: 1, padding: "10px 0", borderRadius: 12,
            background: `${O}22`, border: `1px solid ${O}55`,
            textAlign: "center", fontSize: 13, fontWeight: 700, color: O,
          }}>✓ تأكيد</div>
          <div style={{
            flex: 1, padding: "10px 0", borderRadius: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center", fontSize: 13, fontWeight: 600, color: TXT_MUTED,
          }}>✕ رفض</div>
        </div>
        {/* Bot: confirmation */}
        <ChatBubble
          frame={f}
          entrance={65}
          text="✓ تم التفعيل! مطعمك جاهز الآن."
          isBot
          highlight
        />
      </div>

      <Sequence from={25}>
        <Audio src={AUDIO_URLS.notification} volume={0.15} />
      </Sequence>
    </AbsoluteFill>
  )
}

function ChatBubble({
  frame, entrance, text, isBot, highlight,
}: {
  frame: number; entrance: number; text: string; isBot: boolean; highlight?: boolean
}) {
  const s = springEntry(frame, entrance, { damping: 14, mass: 0.6, stiffness: 110 } as SpringConfig)
  if (s.opacity <= 0) return null
  return (
    <div dir="rtl" style={{
      padding: "10px 16px", borderRadius: 16,
      borderTopLeftRadius: isBot ? 4 : 16,
      borderTopRightRadius: isBot ? 16 : 4,
      marginBottom: 6, maxWidth: "80%",
      background: highlight ? `${O}22` : isBot ? "rgba(255,255,255,0.06)" : BOT_BLUE,
      border: highlight ? `1px solid ${O}44` : "1px solid rgba(255,255,255,0.06)",
      opacity: s.opacity,
      transform: `translateY(${s.translateY}px)`,
      alignSelf: isBot ? "flex-start" : "flex-end",
    }}>
      <div style={{
        fontSize: 12, fontWeight: highlight ? 600 : 400,
        color: highlight ? O : isBot ? TXT : "#fff",
      }}>
        {text}
      </div>
    </div>
  )
}
