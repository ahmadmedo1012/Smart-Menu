"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"
import { useScroll, useTransform, motion, type MotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

/* ── ContainerScroll ───────────────────────────────────────────
 * Scroll-driven 3D card reveal. Title rises, card un-rotates.
 * Adapted from aceternity/container-scroll-animation for RTL + project tokens.
 * ponytail: single-axis rotation + scale, add z/parallax layers if marketing needs it
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
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    globalThis.addEventListener("resize", check)
    return () => globalThis.removeEventListener("resize", check)
  }, [])

  const rotate = useTransform(scrollYProgress, [0, 1], [15, 0])
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    isMobile ? [0.72, 0.92] : [1.08, 1],
  )
  const translateY = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[55rem] md:h-[75rem] flex items-start justify-center pt-12 md:pt-20",
        className,
      )}
    >
      <div
        className="w-full max-w-[1220px] mx-auto px-4 sm:px-6 relative"
        style={{ perspective: "1000px" }}
      >
        <Header translateY={translateY}>{titleComponent}</Header>
        <Card rotate={rotate} scale={scale}>
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
      className="text-center mb-6 md:mb-10"
    >
      {children}
    </motion.div>
  )
}

function Card({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>
  scale: MotionValue<number>
  children: ReactNode
}) {
  return (
    <motion.div
      style={{ rotateX: rotate, scale }}
      className={cn(
        "relative w-full overflow-hidden",
        "rounded-[20px] md:rounded-[32px]",
        "ring-1 ring-border/50",
        "shadow-[0_8px_48px_-16px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_48px_-16px_rgba(0,0,0,0.6)]",
        "bg-card",
      )}
    >
      {children}
      {/* Floor glow */}
      <div className="absolute -bottom-4 left-[15%] right-[15%] h-10 blur-3xl bg-orange/10 dark:bg-orange/15 rounded-full pointer-events-none" />
    </motion.div>
  )
}
