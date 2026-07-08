import React from "react"
import type { ReactNode } from "react"

interface Props {
  children: ReactNode
  width?: number
  height?: number
}

export const PhoneFrame: React.FC<Props> = ({ children, width = 340, height = 620 }) => (
  <div style={{
    position: "relative",
    width, height,
    borderRadius: 30,
    background: "#0a0a0a",
    padding: 6,
    boxShadow: "0 0 0 1.5px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5)",
  }}>
    {/* Minimal notch pill */}
    <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", width: 80, height: 14, background: "#0a0a0a", borderRadius: "0 0 10px 10px", zIndex: 2 }} />
    {/* Screen */}
    <div style={{ borderRadius: 24, overflow: "hidden", width: "100%", height: "100%", background: "#111122", position: "relative" }}>
      {children}
    </div>
  </div>
)
