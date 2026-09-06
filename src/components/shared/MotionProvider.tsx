'use client';

import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { LazyMotionProvider } from '@/components/motion/LazyMotionProvider';

export function MotionProvider({ children }: { children: ReactNode }) {
        // ponytail: no key={pathname} — a keyed m.div remounts the entire app tree on
        // every route change (whole-tree unmount + re-render). Per-page transitions still
        // animate via each page's own motion wrapper; this provider only carries the config.
        // round88-A1: LazyMotionProvider (LazyMotion domAnimation strict) mounts here — the
        // single shared feature load for the whole app (both root trees render MotionProvider).
        return (
                <LazyMotionProvider>
                        <MotionConfig reducedMotion="user">{children}</MotionConfig>
                </LazyMotionProvider>
        );
}
