import type { Transition, Variants } from 'motion/react';

/**
 * Shared motion presets (round85-C7: trimmed to the exports actually consumed
 * — ~16 dead variants removed; fadeUp's transition kept as a local since it
 * references easeOutQuart which is no longer exported).
 */
export const springGentle: Transition = { type: 'spring', stiffness: 120, damping: 14, mass: 0.8 };
export const springDefault: Transition = { type: 'spring', stiffness: 200, damping: 20, mass: 0.8 };
export const springSnappy: Transition = { type: 'spring', stiffness: 300, damping: 24, mass: 0.7 };

const easeOutQuart: Transition = { duration: 0.5, ease: [0.165, 0.84, 0.44, 1] };

export const fadeUp: Variants = {
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: easeOutQuart },
};
export const fadeUpSpring: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: springGentle },
};
