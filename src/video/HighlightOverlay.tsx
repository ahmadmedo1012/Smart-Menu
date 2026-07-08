import { useCurrentFrame, spring } from "remotion"
import { TEAL } from "./shared"

interface Props {
  x: number   // left % (0-100)
  y: number   // top % (0-100)
  w: number   // width % (0-100)
  h: number   // height % (0-100)
  color?: string
  entranceFrame?: number
  pulseSpeed?: number
}

export const HighlightOverlay: React.FC<Props> = ({
  x, y, w, h,
  color = TEAL,
  entranceFrame = 0,
  pulseSpeed = 0.05,
}) => {
  const f = useCurrentFrame()
  const p = spring({ frame: f - entranceFrame, fps: 30, config: { mass: 0.6, damping: 14, stiffness: 70 } })
  const active = f >= entranceFrame - 5

  if (!active) return null

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`, top: `${y}%`,
        width: `${w}%`, height: `${h}%`,
        borderRadius: 8,
        boxShadow: `inset 0 0 20px ${color}66, 0 0 15px ${color}44`,
        border: `1.5px solid ${color}88`,
        opacity: p,
        transform: `scale(${1 + 0.025 * Math.sin(f * pulseSpeed)})`,
        pointerEvents: "none",
        transition: "opacity 0.3s",
      }}
    />
  )
}
