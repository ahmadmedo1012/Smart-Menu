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
 * round87-C7 — options (all backward-compatible defaults):
 *   - enabled: false suspends the loop entirely (call sites no longer need an
 *     if-gate effect around the hook)
 *   - immediate: false skips the first tick (e.g. payment status: the request
 *     was just created — first check only after one interval)
 *   - inFlightGuard: true never overlaps a slow tick with the next one
 *
 * @param fn   the poll body — receives a stable function ref, so deps stay
 *             minimal; put dynamic values in `deps`
 * @param ms   poll interval in milliseconds
 * @param deps extra values that should restart the loop when they change
 *             (filters, active restaurant, …)
 */
export type PollWhenVisibleOptions = {
        enabled?: boolean;
        immediate?: boolean;
        inFlightGuard?: boolean;
};

export function usePollWhenVisible(
        fn: () => void | Promise<void>,
        ms: number,
        deps: unknown[] = [],
        options: PollWhenVisibleOptions = {}
): void {
        const { enabled = true, immediate = true, inFlightGuard = false } = options;
        const fnRef = useRef(fn);
        useEffect(() => {
                fnRef.current = fn;
        }, [fn]);

        useEffect(() => {
                if (!enabled) return;
                let intervalId: ReturnType<typeof setInterval> | undefined;
                let inFlight = false;

                const tick = async () => {
                        if (inFlightGuard) {
                                if (inFlight) return;
                                inFlight = true;
                        }
                        try {
                                await fnRef.current();
                        } finally {
                                inFlight = false;
                        }
                };

                const startPolling = () => {
                        // Guard: visibilitychange can fire while an interval is already
                        // running — never stack a second interval on top of the first.
                        if (intervalId) return;
                        if (immediate) tick();
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
        }, [ms, enabled, immediate, inFlightGuard, ...deps]);
}
