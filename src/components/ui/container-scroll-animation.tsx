"use client"

import { useRef, useState, useEffect, useMemo, type ReactNode } from "react"
import { useScroll, useTransform, motion, type MotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

/* ── ContainerScroll ───────────────────────────────────────────
 * Scroll-driven card reveal.
 *   Desktop: gentle 3D un-rotate (6→0°) + breathing scale (1.03→1)
 *   Mobile:  opacity fade (0.92→1) + translateY only — zero 3D
 * Container height sized to effect length, not arbitrary.
 * ponytail: single-axis rotation, add z-layers when marketing demands depth
 */

interface ContainerScrollProps {
  titleComponent?: ReactNode
  children: ReactNode
  className?: string
}

export function ContainerScroll({
  titleComponent,
  children,
  className,
}: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(prev => prev !== mobile ? mobile : prev)
    }
    check()
    globalThis.addEventListener("resize", check)
    return () => globalThis.removeEventListener("resize", check)
  }, [])

  /* ── Motion values ──
   * Ranges wrapped in useMemo so resize does not recreate MotionValues.
   */
  const scaleRange = useMemo(() => isMobile ? [0.97, 1] : [1.03, 1], [isMobile])
  const translateYRange = useMemo(() => isMobile ? [0, -30] : [0, -100], [isMobile])
  const opacityRange = useMemo(() => isMobile ? [0.9, 1, 1] : [1, 1, 1], [isMobile])

  const rotateX = useTransform(scrollYProgress, [0, 1], [6, 0])
  const scale = useTransform(scrollYProgress, [0, 1], scaleRange)
  const translateY = useTransform(scrollYProgress, [0, 1], translateYRange)
  const cardOpacity = useTransform(scrollYProgress, [0, 0.15, 1], opacityRange)

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-dvh md:h-[65rem] flex items-start justify-center pt-16",
        className,
      )}
    >
      <div
        className="w-full max-w-[1220px] mx-auto px-4 sm:px-6 relative"
        style={!isMobile ? { perspective: "800px" } : undefined}
      >
        <Header translateY={translateY}>{titleComponent}</Header>
        <Card
          key={isMobile ? "mobile" : "desktop"}
          rotateX={rotateX}
          scale={scale}
          opacity={cardOpacity}
          isMobile={isMobile}
        >
          {children}
        </Card>
      </div>
    </div>
  )
}

/* ── Internal sub-components ── */

function Header({
  translateY,
  children,
}: {
  translateY: MotionValue<number>
  children?: ReactNode
}) {
  if (!children) return null
  return (
    <motion.div
      style={{ translateY }}
      className="text-center mb-4 md:mb-10 px-2"
    >
      {children}
    </motion.div>
  )
}

function Card({
  rotateX,
  scale,
  opacity,
  isMobile,
  children,
}: {
  rotateX: MotionValue<number>
  scale: MotionValue<number>
  opacity: MotionValue<number>
  isMobile: boolean
  children: ReactNode
}) {
  return (
    <motion.div
      style={{
        /* rotateX only applied on desktop */
        ...(isMobile ? {} : { rotateX }),
        scale,
        opacity: isMobile ? opacity : 1,
        willChange: "transform",
      }}
      className={cn(
        "relative w-full overflow-hidden",
        "rounded-[18px] md:rounded-[28px]",
        "ring-1 ring-border/40",
        "bg-card",
      )}
    >
      {/* Static shadow overlay — separate layer, no repaint cost */}
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-[18px] md:rounded-[28px]"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.08)",
        }}
      />
      {children}
    </motion.div>
  )
}
