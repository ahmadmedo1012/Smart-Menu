'use client';

import { useEffect, useRef } from 'react';

/**
 * round86-C3 — the visibility-aware polling loop, unified.
 *
 * The exact same startPolling/stopPolling/visibilitychange skeleton (with the
 * "never stack a second interval" guard) was copy-pasted across 8 components
 * (~200 LOC) with slightly divergent spellings. This hook is the single
 * spelling now:
 *   - starts immediately (first tick runs right away)
 *   - pauses while the tab is hidden (timers are throttled anyway)
 *   - never stacks a second interval on visibility flips
 *
 * @param fn   the poll body — receives a stable function ref, so deps stay
 *             minimal; put dynamic values in `deps`
 * @param ms   poll interval in milliseconds
 * @param deps extra values that should restart the loop when they change
 *             (filters, active restaurant, …)
 */
export function usePollWhenVisible(fn: () => void | Promise<void>, ms: number, deps: unknown[] = []): void {
        const fnRef = useRef(fn);
        useEffect(() => {
                fnRef.current = fn;
        }, [fn]);

        useEffect(() => {
                let intervalId: ReturnType<typeof setInterval> | undefined;

                const tick = () => {
                        void fnRef.current();
                };

                const startPolling = () => {
                        // Guard: visibilitychange can fire while an interval is already
                        // running — never stack a second interval on top of the first.
                        if (intervalId) return;
                        tick();
                        intervalId = setInterval(tick, ms);
                };
                const stopPolling = () => {
                        if (intervalId) {
                                clearInterval(intervalId);
                                intervalId = undefined;
                        }
                };
                const onVisibilityChange = () => {
                        if (document.visibilityState === 'hidden') stopPolling();
                        else startPolling();
                };

                startPolling();
                document.addEventListener('visibilitychange', onVisibilityChange);
                return () => {
                        stopPolling();
                        document.removeEventListener('visibilitychange', onVisibilityChange);
                };
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [ms, ...deps]);
}
