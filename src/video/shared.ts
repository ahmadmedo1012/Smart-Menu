import { spring, interpolate } from "remotion"
import type { SpringConfig } from "remotion"

export const FPS = 30
export const DURATION = 540 // 18s

// Default placeholder videos (swap with AI renders)
export const VIDEO_URLS = {
  scene1: "https://remotion-assets.s3.eu-west-1.amazonaws.com/example-videos/restaurant.mp4",
  scene2: "https://remotion-assets.s3.eu-west-1.amazonaws.com/example-videos/particles.mp4",
  scene3: "https://remotion-assets.s3.eu-west-1.amazonaws.com/example-videos/ambient.mp4",
}

// Audio assets
export const AUDIO_URLS = {
  whoosh: "https://remotion.media/whoosh.wav",
  ding: "https://remotion.media/ding.wav",
  notification: "https://remotion.media/ding.wav", // placeholder — replace with Telegram ping
}

// Orange brand palette
export const O = "#f97316"
export const TXT = "#ffffff"
export const TXT_MUTED = "rgba(255,255,255,0.45)"
export const GLOW = `${O}44`
export const GRAD_BTN = `linear-gradient(145deg, ${O}, #fb923c)`

// Spring config presets
export const SPRING_CONFIGS = {
  title: { damping: 14, mass: 0.6, stiffness: 120 } as SpringConfig,
  tagline: { damping: 12, mass: 0.4, stiffness: 100 } as SpringConfig,
  badge: { damping: 10, mass: 0.3, stiffness: 80 } as SpringConfig,
  cta: { damping: 12, mass: 0.5, stiffness: 100 } as SpringConfig,
  card: { damping: 14, mass: 0.7, stiffness: 110 } as SpringConfig,
}

// Reusable spring entry effect: returns { opacity, scale, translateY }
export function springEntry(
  frame: number,
  entranceFrame: number,
  config: SpringConfig = SPRING_CONFIGS.title,
) {
  const p = spring({
    frame: frame - entranceFrame,
    fps: FPS,
    config,
  })
  return {
    opacity: p,
    scale: interpolate(p, [0, 1], [0.85, 1]),
    translateY: interpolate(p, [0, 1], [30, 0]),
  }
}

export function fadeIn(frame: number, entranceFrame: number, duration = 15) {
  return interpolate(frame, [entranceFrame, entranceFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
}

export function fadeOut(frame: number, exitFrame: number, duration = 15) {
  return 1 - interpolate(frame, [exitFrame - duration, exitFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
}
