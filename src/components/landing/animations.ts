import type { Variants, Transition } from "framer-motion";

export const CINEMATIC_EASE: Transition["ease"] = [0.16, 1, 0.2, 1];

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" as const },
  transition: { duration: 1, delay, ease: CINEMATIC_EASE },
});

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: CINEMATIC_EASE },
  },
};
