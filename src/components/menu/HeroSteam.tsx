'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * P16-4b (Banzai → Smart Menu) — the ONE ambient idle element on the menu
 * hero: a gentle steam shimmer rising over the hero's dish area (the logo
 * plate — Banzai's chimney-smoke loop, translated to a kitchen register).
 *
 * Pause contract (all three, per the mission):
 *   1. prefers-reduced-motion  → CSS layers: `motion-reduce:hidden` on this
 *      container + the `.animate-hero-steam` off-switch line inside the
 *      globals.css reduced-motion block (same belt-and-suspenders as
 *      OrbField r121-G-6).
 *   2. document hidden          → visibilitychange listener flips the
 *      animation-play-state to paused (no GPU work for a tab nobody sees).
 *   3. 30s idle                 → the same play-state pause; any pointer /
 *      key / wheel / touch / scroll activity wakes it and restarts the
 *      30s clock.
 *
 * Also pauses when the hero scrolls out of view (IntersectionObserver — the
 * OrbField pattern; offscreen raster work stops during menu browsing).
 * `running` starts `true` so pre-JS/SSR first paint matches the old always-on
 * ambient contract; the island then applies the gates.
 */
export function HeroSteam() {
        const ref = useRef<HTMLDivElement>(null);
        const [inView, setInView] = useState(true);
        const [active, setActive] = useState(true);

        useEffect(() => {
                /* idle/visibility gate — wake() (re)starts the 30s clock; the
                   setState calls are no-op bailouts when the value is already
                   the same, so pointermove spam never re-renders. */
                let idleTimer: ReturnType<typeof setTimeout> | null = null;
                const wake = () => {
                        setActive(true);
                        if (idleTimer) clearTimeout(idleTimer);
                        idleTimer = setTimeout(() => setActive(false), 30_000);
                };
                const onVisibility = () => {
                        if (document.hidden) setActive(false);
                        else wake();
                };
                const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
                document.addEventListener('visibilitychange', onVisibility);
                for (const ev of events) document.addEventListener(ev, wake, { passive: true });
                wake(); // mount starts the idle clock
                return () => {
                        document.removeEventListener('visibilitychange', onVisibility);
                        for (const ev of events) document.removeEventListener(ev, wake);
                        if (idleTimer) clearTimeout(idleTimer);
                };
        }, []);

        useEffect(() => {
                const el = ref.current;
                if (!el || typeof IntersectionObserver === 'undefined') return;
                const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
                observer.observe(el);
                return () => observer.disconnect();
        }, []);

        const running = active && inView;

        return (
                <div
                        ref={ref}
                        aria-hidden
                        className="pointer-events-none absolute inset-0 overflow-visible motion-reduce:hidden"
                >
                        {/* Three warm wisps over the plate — staggered on the same
                            drift-duration ladder token so reduced-motion token
                            zeroing also kills them globally. */}
                        <div
                                className="absolute bottom-1/3 start-[38%] h-14 w-1.5 rounded-full bg-gradient-to-t from-orange/30 via-orange/10 to-transparent blur-[3px] animate-hero-steam"
                                style={running ? undefined : { animationPlayState: 'paused' }}
                        />
                        <div
                                className="absolute bottom-1/3 start-1/2 h-16 w-2 rounded-full bg-gradient-to-t from-orange/35 via-orange/12 to-transparent blur-[4px] animate-hero-steam-delayed"
                                style={running ? undefined : { animationPlayState: 'paused' }}
                        />
                        <div
                                className="absolute bottom-1/3 start-[62%] h-12 w-1.5 rounded-full bg-gradient-to-t from-orange/25 via-orange/10 to-transparent blur-[3px] animate-hero-steam-late"
                                style={running ? undefined : { animationPlayState: 'paused' }}
                        />
                </div>
        );
}
