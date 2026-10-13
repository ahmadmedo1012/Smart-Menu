'use client';

import { useCallback, useEffect, useState } from 'react';
import { HIGH_CONTRAST_STORAGE_KEY } from '@/lib/high-contrast';

/**
 * round88-E2 — High-contrast / large-text accessibility mode.
 *
 * A single boolean preference stored in localStorage and expressed as a
 * `high-contrast` class on <html> (same pattern next-themes uses for
 * `.dark`): the pre-paint inline script in both root layouts reads
 * the key before first paint (no flash), and the matching token overrides
 * live in globals.css (`html.high-contrast` = light default /
 * `html.dark.high-contrast` = the dark opt-in).
 *
 * The SSR markup never carries the class — React hydration is protected by
 * the existing `suppressHydrationWarning` on <html> (exactly how next-themes'
 * class injection works).
 */
export function useHighContrast() {
        const [enabled, setEnabled] = useState(false);
        const [mounted, setMounted] = useState(false);

        // Read the DOM (source of truth set by the boot script) after mount —
        // never during SSR, so server/client markup stays identical.
        useEffect(() => {
                setMounted(true);
                setEnabled(document.documentElement.classList.contains('high-contrast'));
        }, []);

        const toggle = useCallback(() => {
                setEnabled((prev) => {
                        const next = !prev;
                        document.documentElement.classList.toggle('high-contrast', next);
                        try {
                                localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, next ? '1' : '0');
                        } catch {
                                // Private-mode/quota — the class still applies for this session.
                        }
                        return next;
                });
        }, []);

        return { highContrast: enabled, toggle, mounted };
}
