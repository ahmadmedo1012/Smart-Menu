import { OffthreadVideo } from "remotion"

interface Props {
  src: string
  gradient: string
  opacity?: number
}

export function VideoBg({ src, gradient, opacity = 1 }: Props) {
  if (src) {
    return (
      <OffthreadVideo
        src={src}
        style={{
          position: "absolute" as const,
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover" as const,
          opacity,
        }}
        muted
      />
    )
  }
  return (
    <div
      style={{
        position: "absolute" as const,
        inset: 0,
        background: gradient,
        opacity,
      }}
    />
  )
}
