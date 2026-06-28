import type { Transition, Variants } from "framer-motion"

/* ── Physics-based spring presets ── */
export const springGentle: Transition = { type: "spring", stiffness: 120, damping: 14, mass: 0.8 }
export const springDefault: Transition = { type: "spring", stiffness: 200, damping: 20, mass: 0.8 }
export const springSnappy: Transition = { type: "spring", stiffness: 300, damping: 24, mass: 0.7 }
export const springBrisk: Transition = { type: "spring", stiffness: 400, damping: 17, mass: 0.6 }
export const springMicro: Transition = { type: "spring", stiffness: 500, damping: 22, mass: 0.5 }

/* ── Cubic bezier for keyframes / scroll-linked (not spring-compatible) ── */
export const EASE_CUBIC: [number, number, number, number] = [0.16, 1, 0.2, 1]
export const EASE_HOW_IT_WORKS: [number, number, number, number] = [0.32, 0.72, 0, 1]

/* ── Stagger helpers ── */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export const fadeUpChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: springSnappy },
}

/* ── Carousel slide variants (dir = 1 forward, -1 back) ── */
export function slideVariants(dir: 1 | -1): Variants {
  return {
    hidden: { opacity: 0, x: dir * 80, rotateZ: dir * 2 },
    visible: { opacity: 1, x: 0, rotateZ: 0, transition: springDefault },
    exit: { opacity: 0, x: dir * -80, rotateZ: dir * -2, transition: springDefault },
  }
}

/* ── Hover / tap shorthand ── */
export const hoverScale = {
  whileHover: { scale: 1.02, transition: springSnappy },
  whileTap: { scale: 0.97, transition: springMicro },
}

/* ── Page transition ── */
export const pageTransition: Transition = {
  type: "spring", stiffness: 200, damping: 22, mass: 0.8,
}

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: pageTransition },
  exit: { opacity: 0, y: -4, transition: { ...pageTransition, duration: 0.15 } },
}
