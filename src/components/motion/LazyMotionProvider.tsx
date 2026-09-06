'use client';

/**
 * LazyMotion providers — round88-A1 (LazyMotion migration).
 *
 * Two providers, two jobs:
 *
 * 1. `LazyMotionProvider` (root, synchronous `domAnimation`):
 *    Mounted once above both root trees via `MotionProvider` (which both
 *    `(public)` and `(protected)` root layouts render). Every `m.*` component
 *    gets the animation + gesture feature bundle synchronously, so enter/exit
 *    variants, `whileHover`/`whileTap`, `AnimatePresence` exits and all other
 *    existing animation behavior works exactly as it did with the full
 *    `motion` import — from the very first paint.
 *
 *    `strict` makes any future `motion.*` usage (the full-feature proxy that
 *    defeats tree-shaking) throw loudly in development instead of silently
 *    regressing the bundle budget.
 *
 * 2. `LayoutMotion` (local, synchronous `domMax`):
 *    Only 4 call sites in the app use `layoutId` shared-element glides
 *    (NavLink active indicator, Header "tubelight", CategoryTabs active pill,
 *    action-search-bar highlight). Those need the layout feature (`domMax`):
 *    without it `layoutId` props are silently ignored and the glides die.
 *    Each of those 4 spots wraps its `layoutId` element in `LayoutMotion`
 *    (sync domMax, identical behavior from the first interaction).
 *
 *    NOTE (measured, round88-A1 — 5 builds of evidence, see worklog 88-A1):
 *    an async `() => import(...)` split was tried and rejected — under
 *    Turbopack the projection engine is retained in the static chunk regardless
 *    (motion-dom's `export *` index chain defeats tree-shaking), so the async
 *    chunk only duplicated the engine (+13.4KB gz total). Sync domMax here is
 *    free relative to that floor and keeps behavior bit-identical. The real
 *    saving is blocked by the `motion/react` barrel, not by this provider —
 *    full numbers + follow-ups are documented in the 88-A1 worklog entry.
 */
import { LazyMotion, domAnimation, domMax } from 'motion/react';
import type { ReactNode } from 'react';

export function LazyMotionProvider({ children }: { children: ReactNode }) {
        return (
                <LazyMotion features={domAnimation} strict>
                        {children}
                </LazyMotion>
        );
}

export function LayoutMotion({ children }: { children: ReactNode }) {
        return (
                <LazyMotion features={domMax} strict>
                        {children}
                </LazyMotion>
        );
}
