import type { Transition } from 'motion/react';

/**
 * Shared motion presets — spring transitions only.
 *
 * round85-C7 trimmed ~16 dead variants; r121-O-2 finished the job: fadeUp and
 * fadeUpSpring (zero importers) were deleted. r132 (A3 §2): springGentle +
 * springSnappy joined them — SectionHeader (their only consumer) was a fully
 * dead component deleted this round; every live surface tunes per-component
 * local variants. Only truly shared springs belong here.
 */
export const springDefault: Transition = { type: 'spring', stiffness: 200, damping: 20, mass: 0.8 };
