import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion"
import { Scene1_Intro } from "./scenes/Scene1_Intro"
import { Scene2_Checkout } from "./scenes/Scene2_Checkout"
import { Scene3_CTA } from "./scenes/Scene3_CTA"

// 900f @30fps = 30s
// Scene 1: 0–210f (7s), Scene 2: 210–540f (11s), Scene 3: 540–900f (12s)
const SCENES = [
  { start: 0, end: 210, Component: Scene1_Intro },
  { start: 210, end: 540, Component: Scene2_Checkout },
  { start: 540, end: 900, Component: Scene3_CTA },
] as const

export const PromoVideo: React.FC = () => {
  const f = useCurrentFrame()

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map(({ start, end, Component }) => (
        <div
          key={start}
          style={{
            position: "absolute",
            inset: 0,
            opacity: f >= start && f < end ? 1 : 0,
            pointerEvents: "none",
          }}
        >
          <Component />
        </div>
      ))}

      <CrossfadeOverlay />
    </AbsoluteFill>
  )
}

function CrossfadeOverlay() {
  const f = useCurrentFrame()
  const fade1 = sceneCrossfade(f, 205)
  const fade2 = sceneCrossfade(f, 535)

  return (
    <>
      <div style={{
        position: "absolute", inset: 0, background: "#000",
        opacity: fade1 * 0.5, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0, background: "#000",
        opacity: fade2 * 0.5, pointerEvents: "none",
      }} />
    </>
  )
}

function sceneCrossfade(frame: number, startFrame: number) {
  return interpolate(frame, [startFrame, startFrame + 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
}
