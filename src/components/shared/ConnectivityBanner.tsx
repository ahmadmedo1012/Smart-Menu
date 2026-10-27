'use client';

import { useEffect, useRef, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * round88-E4 — online/offline connectivity indicator.
 *
 * Listens to the window `online`/`offline` events (plus an initial
 * `navigator.onLine` check — a page restored from the SW cache can already
 * be offline) and renders a full-width RTL banner:
 *
 * - offline     → warning banner, stays until the network returns
 * - reconnected → brief success flash (~2s) confirming recovery, then unmounts
 *
 * a11y: `role="status"` + `aria-live="polite"` — announced without
 * interrupting the current task. The fixed strip deliberately sits ABOVE the
 * sticky menu header (z-[90], the overlay band of the z-index registry):
 * while offline, connectivity IS the primary information.
 *
 * W7-G (P1, A2 audit): the banner no longer COVERS the header — while visible
 * it stamps `html[data-conn-banner]`, and the sticky headers shift down by
 * the banner band (globals.css ‎--conn-banner-h‎). Height is pinned ‎h-10‎ so
 * the offset is deterministic; the theme/hamburger controls stay fully
 * visible and tappable during an outage.
 *
 * P27-C (CSS twin — the SmartBot v12-E5.1 law): enter/exit were m.div under
 * AnimatePresence (y −100%↔0 + opacity, spring 380/34) — with the icon twins
 * (P27-C1) and the ThemeToggle twin this was the public layout's last motion
 * gate. Pure CSS now (.ai-banner rules in globals.css): the spring (ζ≈0.87,
 * negligible overshoot) ≈ expo-out 0.45s. The AnimatePresence semantics twin:
 * `shown` is the entering/staying banner; `exiting` is the exit animation —
 * on a key swap (offline→reconnected) both render simultaneously (default
 * AnimatePresence mode); on →null the banner exits then unmounts after the
 * exit duration. prefers-reduced-motion: the r126 belt + layer-3 off-switches
 * kill the animation (the old MotionConfig reducedMotion="user" plain swap).
 */
type ConnState = 'offline' | 'reconnected';

/* the exit phase duration — must match .ai-banner-out in globals.css */
const EXIT_MS = 450;

export function ConnectivityBanner() {
        const [state, setState] = useState<ConnState | null>(null);
        const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
        /* the AnimatePresence twin: shown = mounted/entering, exiting = the
           exit-animation element (key-swap overlap or the final exit) */
        const [shown, setShown] = useState<ConnState | null>(null);
        const [exiting, setExiting] = useState<ConnState | null>(null);

        /* the AnimatePresence state sync — mirrors {state !== null && <m.div
           key={state}>}: mount on appear, key-swap overlap, exit-then-unmount.
           Pure state mapping (no timers — the exit-clear effect below owns
           the clock), so the self-triggered re-run settles as a no-op. */
        useEffect(() => {
                if (state !== null) {
                        if (shown !== null && shown !== state) {
                                // key swap: the old banner exits under the entering new one
                                setExiting(shown);
                        }
                        if (shown !== state) setShown(state);
                } else if (shown !== null) {
                        // exit only: the banner leaves, then unmounts
                        setExiting(shown);
                        setShown(null);
                }
        }, [state, shown]);

        /* the exit clock: unmount the exiting banner after the exit
           animation completes (EXIT_MS = .ai-banner-out's duration). Runs
           only on exiting changes — a key swap mid-exit reschedules. */
        useEffect(() => {
                if (exiting === null) return;
                const t = setTimeout(() => setExiting(null), EXIT_MS);
                return () => clearTimeout(t);
        }, [exiting]);

        /* W7-G: الرؤوس اللاصقة تنزل بمقدار ارتفاع الشريط طوال ظهوره —
           شطب السمة عند الإخفاء/التفكيك يحرّر الإزاحة في كل المسارات. */
        useEffect(() => {
                const root = document.documentElement;
                if (state !== null) root.setAttribute('data-conn-banner', '');
                else root.removeAttribute('data-conn-banner');
                return () => root.removeAttribute('data-conn-banner');
        }, [state]);

        useEffect(() => {
                // A tab restored from the service-worker cache may start offline —
                // reflect that immediately instead of waiting for the first event.
                if (navigator.onLine === false) setState('offline');

                const goOffline = () => setState('offline');
                const goOnline = () => {
                        setState('reconnected');
                        if (flashTimer.current) clearTimeout(flashTimer.current);
                        flashTimer.current = setTimeout(() => setState(null), 2200);
                };

                window.addEventListener('offline', goOffline);
                window.addEventListener('online', goOnline);
                return () => {
                        window.removeEventListener('offline', goOffline);
                        window.removeEventListener('online', goOnline);
                        if (flashTimer.current) clearTimeout(flashTimer.current);
                };
        }, []);

        const bannerBody = (s: ConnState) => {
                const offline = s === 'offline';
                return (
                        <>
                                {offline ? (
                                        <>
                                                <WifiOff className="size-4 shrink-0" aria-hidden="true" />
                                                <span>انقطع الاتصال بالإنترنت</span>
                                                <span className="hidden sm:inline text-warning-foreground/80 font-normal">
                                                        ستعمل الصفحة بشكل كامل فور عودة الشبكة
                                                </span>
                                        </>
                                ) : (
                                        <>
                                                <Wifi className="size-4 shrink-0" aria-hidden="true" />
                                                <span>عاد الاتصال بالإنترنت</span>
                                        </>
                                )}
                        </>
                );
        };

        const bannerClass = (s: ConnState) =>
                cn(
                        'fixed inset-x-0 top-0 z-[90] flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium shadow-lg',
                        'print:hidden',
                        s === 'offline'
                                ? 'bg-warning text-warning-foreground'
                                : 'bg-success text-success-foreground'
                );

        return (
                <>
                        {shown !== null && (
                                <div key={`${shown}-in`} role="status" aria-live="polite" className={cn('ai-banner-in', bannerClass(shown))}>
                                        {bannerBody(shown)}
                                </div>
                        )}
                        {exiting !== null && (
                                <div key={`${exiting}-out`} role="status" aria-live="polite" className={cn('ai-banner-out', bannerClass(exiting))}>
                                        {bannerBody(exiting)}
                                </div>
                        )}
                </>
        );
}
