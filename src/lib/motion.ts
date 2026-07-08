import type { Transition, Variants } from "framer-motion"

/* ── Physics-based spring presets ── */
export const springGentle: Transition = { type: "spring", stiffness: 120, damping: 14, mass: 0.8 }
export const springDefault: Transition = { type: "spring", stiffness: 200, damping: 20, mass: 0.8 }
export const springSnappy: Transition = { type: "spring", stiffness: 300, damping: 24, mass: 0.7 }

/* ── Carousel slide variants (dir = 1 forward, -1 back) ── */
export function slideVariants(dir: 1 | -1): Variants {
  return {
    hidden: { opacity: 0, x: dir * 80, rotateZ: dir * 2 },
    visible: { opacity: 1, x: 0, rotateZ: 0, transition: springDefault },
    exit: { opacity: 0, x: dir * -80, rotateZ: dir * -2, transition: springDefault },
  }
}

/* ── Page transition ── */
export const pageTransition: Transition = {
  type: "spring", stiffness: 200, damping: 22, mass: 0.8,
}

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: pageTransition },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12, ease: "easeOut" } },
}
