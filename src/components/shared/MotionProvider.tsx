'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

export function MotionProvider({ children }: { children: ReactNode }) {
	// ponytail: no key={pathname} — a keyed motion.div remounts the entire app tree on
	// every route change (whole-tree unmount + re-render). Per-page transitions still
	// animate via each page's own motion wrapper; this provider only carries the config.
	return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
