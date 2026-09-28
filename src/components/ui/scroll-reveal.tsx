"use client"

import { useRef, type ReactNode, type CSSProperties, useState, useEffect } from "react"
import { m, useReducedMotion } from "motion/react"

interface ScrollRevealProps {
        children: ReactNode
        className?: string
        /** Stagger delay between children (ms) */
        delay?: number
        /** Animation duration */
        duration?: number
        /** Distance to translate from */
        y?: number
        /** Distance to translate from (x axis) */
        x?: number
        /** Threshold for intersection observer */
        threshold?: number
        /** Root margin for intersection observer */
        rootMargin?: string
        /** Fire only once on entry */
        once?: boolean
        /** Custom as element */
        as?: "div" | "section" | "article" | "span" | "ul" | "li"
        style?: CSSProperties
}

/**
 * ScrollReveal — Fire-once reveal animation
 * 
 * Adapted from scroll-craft's flow + in device
 * Content fades up (or slides in) when it enters the viewport
 * Once revealed, it stays revealed (no re-hiding on scroll up)
 * 
 * @example
 * ```tsx
 * <ScrollReveal y={24} delay={100}>
 *   <h2>This will fade up when scrolled into view</h2>
 * </ScrollReveal>
 * ```
 */
export function ScrollReveal({
        children,
        className,
        delay = 0,
        duration = 0.6,
        y = 20,
        x = 0,
        threshold = 0.15,
        rootMargin = "-10% 0px -10% 0px",
        once = true,
        as = "div",
        style,
}: ScrollRevealProps) {
        const ref = useRef<HTMLElement | null>(null)
        const [isInView, setIsInView] = useState(false)
        const prefersReducedMotion = useReducedMotion()

        useEffect(() => {
                const element = ref.current
                if (!element) return

                // Skip observer for reduced motion
                if (prefersReducedMotion) {
                        setIsInView(true)
                        return
                }

                const observer = new IntersectionObserver(
                        ([entry]) => {
                                if (entry.isIntersecting) {
                                        setIsInView(true)
                                        if (once) {
                                                observer.disconnect()
                                        }
                                } else if (!once) {
                                        setIsInView(false)
                                }
                        },
                        { threshold, rootMargin }
                )

                observer.observe(element)
                return () => observer.disconnect()
        }, [threshold, rootMargin, once, prefersReducedMotion])

        // round87-C9: dynamic tag — every motion DOM component shares the same prop
        // shape; narrow the union to the div flavor instead of `any` (the ref is
        // bridged to the HTMLElement ref below via a callback)
        const Component = m[as] as typeof m.div

        return (
                <Component
                        ref={(node) => { ref.current = node }}
                        className={className}
                        style={style}
                        initial={{ opacity: 0, y, x }}
                        animate={isInView ? { opacity: 1, y: 0, x: 0 } : undefined}
                        transition={{
                                duration: prefersReducedMotion ? 0.2 : duration,
                                delay: prefersReducedMotion ? 0 : delay / 1000,
                                ease: [0.23, 1, 0.32, 1],
                        }}
                >
                        {children}
                </Component>
        )
}

// r121-F-2: StaggeredReveal was deleted here (zero render sites — referenced
// only by SCROLLCRAFT.md's kit inventory, which was updated in the same edit).
// The per-child stagger pattern lives inline at its real consumers.
