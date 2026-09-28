import type { Transition } from 'motion/react';

/**
 * Shared motion presets — spring transitions only.
 *
 * round85-C7 trimmed ~16 dead variants; r121-O-2 finished the job: fadeUp and
 * fadeUpSpring (zero importers — every component that fades up defines its own
 * local variant with surface-tuned offsets, e.g. SectionHeader's
 * fadeUpSpring/fadeUpSnappy) were deleted. Variants live per-component; only
 * truly shared springs belong here.
 */
export const springGentle: Transition = { type: 'spring', stiffness: 120, damping: 14, mass: 0.8 };
export const springDefault: Transition = { type: 'spring', stiffness: 200, damping: 20, mass: 0.8 };
export const springSnappy: Transition = { type: 'spring', stiffness: 300, damping: 24, mass: 0.7 };
