'use client';

import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
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
 * Motion: enter/exit run through m.* under the root MotionConfig
 * (`reducedMotion="user"`), so prefers-reduced-motion users get a plain
 * opacity swap with no transform.
 */
type ConnState = 'offline' | 'reconnected';

export function ConnectivityBanner() {
        const [state, setState] = useState<ConnState | null>(null);
        const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        const isOffline = state === 'offline';

        return (
                <AnimatePresence>
                        {state !== null && (
                                <m.div
                                        key={state}
                                        initial={{ y: '-100%', opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: '-100%', opacity: 0 }}
                                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                                        role="status"
                                        aria-live="polite"
                                        className={cn(
                                                'fixed inset-x-0 top-0 z-[90] flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium shadow-lg',
                                                'print:hidden',
                                                isOffline
                                                        ? 'bg-warning text-warning-foreground'
                                                        : 'bg-success text-success-foreground'
                                        )}
                                >
                                        {isOffline ? (
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
                                </m.div>
                        )}
                </AnimatePresence>
        );
}
