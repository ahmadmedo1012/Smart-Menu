import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion"
import { Scene1_Intro } from "./scenes/Scene1_Intro"
import { Scene2_Checkout } from "./scenes/Scene2_Checkout"
import { Scene3_CTA } from "./scenes/Scene3_CTA"

// 900f @30fps = 30s
// Faster pacing + proper cross-dissolve at scene boundaries (no black overlay)
const SCENES = [
  // Scene 1: 0-180f (6s), dissolve 180-190f
  // Scene 2: 190-520f (11s), dissolve 520-530f
  // Scene 3: 530-900f (12s)
  { start: 0, end: 190, Component: Scene1_Intro },
  { start: 190, end: 530, Component: Scene2_Checkout },
  { start: 530, end: 900, Component: Scene3_CTA },
] as const

export const PromoVideo: React.FC = () => {
  const f = useCurrentFrame()

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map(({ start, end, Component }, i) => {
        // Cross-dissolve: previous scene fades out = next scene fades in
        const inOp = sceneFadeIn(f, start)
        const outOp = sceneFadeOut(f, end)
        const opacity = (f >= start && f < end) ? (i === 0 ? outOp * inOp : outOp) : 0
        return (
          <div key={start} style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
            <Component />
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

function sceneFadeIn(frame: number, start: number) {
  return interpolate(frame, [start - 10, start], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
}

function sceneFadeOut(frame: number, end: number) {
  return interpolate(frame, [end - 10, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
}
