"use client"

/* P27-C (CSS twin — the SmartBot v12-E5.1 law): the toggle was m.button
   whileHover/whileTap + AnimatePresence(mode="wait") moon/sun swap — with
   the two icon twins landed (P27-C1), this was the landing header's last
   motion gate keeping the ~45KB motion engine chunk on every public page.
   Pure CSS now (.ai-theme rules in globals.css):

   · hover: scale 1.08 + tilt ±15° (dark −15 / light +15, was whileHover
     spring 350/22 ≈ cubic-bezier(.34,1.56,.64,1)); :active = the 0.92
     press (was whileTap)
   · the swap: two-phase render — the old icon mounts with .is-out
     (400ms), then the new one mounts with .is-in (400ms) — exactly
     mode="wait" sequencing (exit completes, then enter), driven by two
     state flags + one timer
   · initial={false} preserved: the first icon after mount renders with
     no animation (the display-null guard)
   · prefers-reduced-motion: instant swap (timer → 0ms) + CSS
     animation/transition kills — the old useReducedMotion instant path
   · rapid double-flip mid-swap: jump-cut to the target icon (AnimatePresence
     re-targets; the twin settles instantly — the sub-400ms edge) */

import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const SWAP_MS = 400 // exit phase; the enter phase follows on mount

type IconName = "moon" | "sun"

function ThemeIcon({ name, anim }: { name: IconName; anim: "idle" | "in" | "out" }) {
        return (
                <svg
                        viewBox="0 0 24 24"
                        className={cn(
                                "ai-theme-icon",
                                name === "moon" ? "ai-theme-icon-moon" : "ai-theme-icon-sun",
                                anim !== "idle" && `is-${anim}`
                        )}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                >
                        {name === "moon" ? (
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        ) : (
                                <>
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                                </>
                        )}
                </svg>
        )
}

export function ThemeToggle({ className }: { className?: string }) {
        const { setTheme, resolvedTheme } = useTheme()
        const [mounted, setMounted] = useState(false)
        const [reduced, setReduced] = useState(false)
        // display: the icon on screen; exiting: the mode="wait" exit phase
        const [display, setDisplay] = useState<IconName | null>(null)
        const [exiting, setExiting] = useState<IconName | null>(null)
        // swapped: false until the first swap completes — the first mount
        // renders idle (initial={false}); every swap-mounted icon enters
        const [swapped, setSwapped] = useState(false)
        const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

        useEffect(() => setMounted(true), [])

        useEffect(() => {
                // useReducedMotion twin: the instant path (t = { duration: 0 })
                const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
                setReduced(mq.matches)
                const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
                mq.addEventListener("change", onChange)
                return () => mq.removeEventListener("change", onChange)
        }, [])

        const isDark = resolvedTheme === "dark"
        const target: IconName = isDark ? "moon" : "sun"

        useEffect(() => {
                if (!mounted) return
                if (display === null) {
                        // first mount: initial={false} — no animation, just show
                        setDisplay(target)
                        return
                }
                // start the mode="wait" exit phase (the exit-clock effect below
                // owns the timer; keeping this effect timer-free means its
                // self-triggered re-run settles as a no-op instead of killing
                // the clock — the stall the first cut shipped)
                if (display !== target && exiting === null) setExiting(display)
        }, [target, mounted, display, exiting])

        /* the exit clock: after the exit phase completes (SWAP_MS, or 0ms
           under reduced motion — the old useReducedMotion instant path),
           mount the target icon with its enter animation. Re-runs when the
           target flips mid-exit (rapid double-flip): the cleanup clears and
           the clock re-targets — the jump-cut semantics AnimatePresence's
           interrupt has. */
        useEffect(() => {
                if (!mounted || exiting === null) return
                swapTimer.current = setTimeout(
                        () => {
                                setDisplay(target)
                                setExiting(null)
                                setSwapped(true)
                        },
                        reduced ? 0 : SWAP_MS
                )
                return () => {
                        if (swapTimer.current) clearTimeout(swapTimer.current)
                }
        }, [exiting, target, mounted, reduced])

        if (!mounted) {
                return <div className={cn("size-11", className)} aria-hidden="true" />
        }

        return (
                <button
                        type="button"
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        aria-label={isDark ? "الوضع النهاري" : "الوضع الليلي"}
                        data-current={isDark ? "dark" : "light"}
                        className={cn(
                                "ai-theme-btn",
                                "relative size-11 rounded-full",
                                "bg-card/80 border border-border/60 backdrop-blur-sm shadow-sm",
                                "hover:bg-orange-muted hover:border-orange/40 hover:shadow-md",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                                "cursor-pointer",
                                "flex items-center justify-center",
                                "overflow-hidden",
                                className
                        )}
                >
                        <span className="relative block size-4">
                                {exiting !== null ? (
                                        <ThemeIcon key={`${exiting}-out`} name={exiting} anim="out" />
                                ) : display === null ? null : (
                                        <ThemeIcon
                                                key={display}
                                                name={display}
                                                anim={swapped && !reduced ? "in" : "idle"}
                                        />
                                )}
                        </span>
                </button>
        )
}
