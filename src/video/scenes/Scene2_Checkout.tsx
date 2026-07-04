import { AbsoluteFill, useCurrentFrame, OffthreadVideo, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { VIDEO_URLS, O } from "../shared"
import { Scene2A_PlanSelect } from "./Scene2A_PlanSelect"
import { Scene2B_Payment } from "./Scene2B_Payment"
import { Scene2C_Validation } from "./Scene2C_Validation"
import { Scene2D_Telegram } from "./Scene2D_Telegram"

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] })

// Frame offsets for each sub-scene within the 300f Scene 2 budget
const SUBSCENES = [
  { start: 0, end: 75, Component: Scene2A_PlanSelect },       // 120-195
  { start: 75, end: 150, Component: Scene2B_Payment },        // 195-270
  { start: 150, end: 210, Component: Scene2C_Validation },    // 270-330
  { start: 210, end: 300, Component: Scene2D_Telegram },      // 330-420
] as const

export const Scene2_Checkout: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <OffthreadVideo src={VIDEO_URLS.scene2} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: videoOp,
      }} muted />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.4) 100%)",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: `linear-gradient(0deg, ${O}11, transparent)`,
      }} />

      {SUBSCENES.map(({ start, end, Component }) => (
        <div key={start} style={{
          position: "absolute", inset: 0,
          opacity: f >= start && f < end ? 1 : 0,
        }}>
          <Component frameOffset={start} />
        </div>
      ))}
    </AbsoluteFill>
  )
}
