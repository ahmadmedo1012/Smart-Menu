import { spring, interpolate } from "remotion"
import type { SpringConfig } from "remotion"

export const FPS = 30

// Default video URLs (empty = gradient fallback, set MP4 for AI renders)
export const VIDEO_URLS = {
  scene1: "",
  scene2: "",
  scene3: "",
  scene4: "",
  scene5: "",
}

export const BG_GRADIENT = {
  scene1: "linear-gradient(145deg, #0c0c14, #1a1a2e, #0f0f1a)",
  // Brighter gradients for Scene 2+3 — content must be legible
  scene2: "linear-gradient(145deg, #0d1220, #1a2340, #121a2e)",
  scene3: "linear-gradient(145deg, #12100e, #1f1810, #141010)",
  scene4: "linear-gradient(145deg, #0c0c14, #1a1a2e, #0f0f1a)",
  scene5: "linear-gradient(145deg, #12100e, #1f1810, #141010)",
}

export const AUDIO_URLS = {
  whoosh: "https://remotion.media/whoosh.wav",
  ding: "https://remotion.media/ding.wav",
  notification: "https://remotion.media/ding.wav",
}

// Premium palette
export const TEAL = "#00FFCC"
export const GOLD = "#FFD700"
export const O = "#f97316"
export const TXT = "#ffffff"
export const TXT_MUTED = "rgba(255,255,255,0.5)"
export const GLOW = `${TEAL}44`
export const DARK_OVERLAY = "rgba(0,0,0,0.55)"

// Unified premium spring config — mass 0.5, damping 10, stiffness 100
export const SPRING_CONFIG = { mass: 0.5, damping: 10, stiffness: 100 } as SpringConfig

export function springEntry(frame: number, entranceFrame: number, scaleFrom = 0.85, yFrom = 30) {
  const p = spring({ frame: frame - entranceFrame, fps: FPS, config: SPRING_CONFIG })
  return {
    opacity: p,
    scale: interpolate(p, [0, 1], [scaleFrom, 1]),
    translateY: interpolate(p, [0, 1], [yFrom, 0]),
  }
}

export function fadeIn(frame: number, entrance: number, dur = 15) {
  return interpolate(frame, [entrance, entrance + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
}

export function fadeOut(frame: number, exit: number, dur = 15) {
  return 1 - interpolate(frame, [exit - dur, exit], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
}

export function springScale(frame: number, entrance: number, _duration = 120) {
  const p = spring({ frame: frame - entrance, fps: FPS, config: { mass: 1, damping: 15, stiffness: 60 } as SpringConfig })
  return interpolate(p, [0, 1], [1, 1.04])
}
