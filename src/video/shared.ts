import { spring, interpolate } from "remotion"
import type { SpringConfig } from "remotion"

export const FPS = 30
export const DURATION = 540 // 18s

// Default placeholder videos (swap with AI renders)
// Empty strings = gradient-only fallbacks.
// Replace with Higgsfield/Haiper MP4 URLs when ready.
export const VIDEO_URLS = {
  scene1: "",
  scene2: "",
  scene3: "",
}

export const BG_GRADIENT = {
  scene1: "linear-gradient(145deg, #0f0f1a, #1a1a2e, #16213e)",
  scene2: "linear-gradient(145deg, #0d0d0d, #1a0a0a, #0d1a0d)",
  scene3: "linear-gradient(145deg, #0a0a0a, #1a0f0a, #0f0a1a)",
}
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
