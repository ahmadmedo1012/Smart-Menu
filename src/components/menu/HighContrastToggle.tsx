'use client';

import { Contrast } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useHighContrast } from '@/hooks/useHighContrast';

/**
 * round88-E2 — High-contrast + large-text toggle for guests.
 *
 * Mirrors ThemeToggle's orb styling (size-11 glass button) so the menu bar's
 * two accessibility controls read as one family. a11y decisions:
 * - `aria-pressed` (mode toggle pattern) — the two labels describe the ACTION,
 *   so a screen-reader user hears what pressing will do, plus the current state.
 * - No mount-time render of state-dependent markup (same `mounted` guard as
 *   ThemeToggle) — no hydration mismatch, no phantom state.
 * - whileHover/whileTap respect prefers-reduced-motion (hook + root MotionConfig).
 */
export function HighContrastToggle({ className }: { className?: string }) {
        const { highContrast, toggle, mounted } = useHighContrast();
        const prefersReducedMotion = useReducedMotion();

        if (!mounted) {
                return <div className={cn('size-11', className)} aria-hidden="true" />;
        }

        return (
                <m.button
                        type="button"
                        onClick={toggle}
                        aria-pressed={highContrast}
                        aria-label={
                                highContrast
                                        ? 'إيقاف وضع التباين العالي والخط الكبير'
                                        : 'تشغيل وضع التباين العالي والخط الكبير'
                        }
                        title={highContrast ? 'إيقاف التباين العالي' : 'تباين عالٍ وخط أكبر'}
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        className={cn(
                                'relative size-11 rounded-full',
                                'bg-card/80 border border-border/60 backdrop-blur-sm shadow-sm',
                                'hover:bg-orange-muted hover:border-orange/40 hover:shadow-md',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50',
                                'cursor-pointer',
                                'flex items-center justify-center',
                                'transition-[background-color,border-color,box-shadow]',
                                highContrast && 'border-orange/50 bg-orange-muted',
                                className
                        )}
                >
                        <Contrast className="size-4 text-foreground" aria-hidden="true" />
                </m.button>
        );
}
