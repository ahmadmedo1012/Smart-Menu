"use client"

import { useState, useEffect, useRef, type RefObject } from "react"

interface ScrollProgressOptions {
	threshold?: number
	rootMargin?: string
}

/**
 * useScrollProgress — tracks how far a section has been scrolled through
 * 
 * Mimics scroll-craft's --sc-p variable (0 to 1) for each section
 * 
 * @param ref - The container/section element to track
 * @param options - Configuration for the intersection observer
 * 
 * @returns { p, raw, isActive } - progress (0-1), raw progress, active state
 * 
 * Usage:
 * ```tsx
 * const { p, isActive } = useScrollProgress(sectionRef);
 * ```
 */
export function useScrollProgress<T extends HTMLElement>(
	ref: RefObject<T | null>,
	options: ScrollProgressOptions = {}
) {
	const { threshold = 0.1, rootMargin = "0px" } = options
	const [progress, setProgress] = useState(0)
	const [isActive, setIsActive] = useState(false)
	const [rawProgress, setRawProgress] = useState(0)

	useEffect(() => {
		const element = ref.current
		if (!element) return

		const handleScroll = () => {
			const rect = element.getBoundingClientRect()
			const viewportHeight = window.innerHeight
			const elementHeight = rect.height

			// Calculate how much of the element has been scrolled through
			// When element top reaches bottom of viewport: p = 0
			// When element bottom reaches top of viewport: p = 1
			const scrolled = viewportHeight - rect.top
			const total = viewportHeight + elementHeight
			const raw = Math.max(0, Math.min(1, scrolled / total))

			// Apply scroll-craft's dwell remap (settles mid-act)
			// This creates a slower movement at edges and faster in the middle
			const remapped = dwell(raw, 0.35)

			setRawProgress(raw)
			setProgress(remapped)

			// Check if section is in view
			const inView = rect.top < viewportHeight && rect.bottom > 0
			setIsActive(inView)
		}

		// Initial calculation
		handleScroll()

		window.addEventListener("scroll", handleScroll, { passive: true })
		window.addEventListener("resize", handleScroll, { passive: true })

		return () => {
			window.removeEventListener("scroll", handleScroll)
			window.removeEventListener("resize", handleScroll)
		}
	}, [ref, threshold, rootMargin])

	return { p: progress, raw: rawProgress, isActive }
}

/**
 * dwell — Monotone dwell remap from scroll-craft
 * Settles the camera mid-act (where the copy peaks) and
 * moves quicker at the edges
 */
function dwell(x: number, L: number): number {
	if (!L || L <= 0) return x
	const clamped = Math.max(0, Math.min(1, L))
	const c = x - 0.5
	return (1 - clamped) * x + clamped * (4 * c * c * c + 0.5)
}

/**
 * useInViewScroll — Lightweight IntersectionObserver-based scroll reveal
 * 
 * Fires once on entry (content that re-hides on scroll-up is a defect)
 */
export function useInViewScroll<T extends HTMLElement>(
	ref: RefObject<T | null>,
	options: IntersectionObserverInit = {}
) {
	const { threshold = 0.15, rootMargin = "-10% 0px -10% 0px" } = options
	const [inView, setInView] = useState(false)
	const observerRef = useRef<IntersectionObserver | null>(null)

	useEffect(() => {
		const element = ref.current
		if (!element) return

		// Check for reduced motion preference
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		if (prefersReducedMotion) {
			setInView(true)
			return
		}

		observerRef.current = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true)
					observerRef.current?.disconnect()
				}
			},
			{ threshold, rootMargin }
		)

		observerRef.current.observe(element)

		return () => {
			observerRef.current?.disconnect()
		}
	}, [ref, threshold, rootMargin])

	return inView
}

/**
 * useParallax — Parallax scroll effect
 * 
 * Creates depth from differential movement
 * 
 * @param rate - Movement rate (-2 to 2), negative = moves up faster (recedes)
 * 
 * Usage:
 * ```tsx
 * const { style, progress } = useParallax(ref, { rate: 0.5 })
 * ```
 */
export function useParallax<T extends HTMLElement>(
	ref: RefObject<T | null>,
	options: { rate?: number; maxTravel?: number } = {}
) {
	const { rate = 0.5, maxTravel = 80 } = options
	const [transform, setTransform] = useState(0)
	const [progress, setProgress] = useState(0)

	useEffect(() => {
		const element = ref.current
		if (!element) return

		// Check for reduced motion preference
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		if (prefersReducedMotion) return

		const handleScroll = () => {
			const rect = element.getBoundingClientRect()
			const viewportHeight = window.innerHeight

			// Calculate progress through the viewport (-0.5 to 0.5 centered)
			const centerY = rect.top + rect.height / 2
			const viewportCenter = viewportHeight / 2
			const p = (viewportCenter - centerY) / viewportHeight
			const clamped = Math.max(-0.5, Math.min(0.5, p))

			// Calculate transform based on rate
			// rate * 100 gives total pixel travel
			const travel = rate * 100 * clamped
			const clampedTravel = Math.max(-maxTravel, Math.min(maxTravel, travel))

			setProgress(clamped)
			setTransform(clampedTravel)
		}

		handleScroll()
		window.addEventListener("scroll", handleScroll, { passive: true })
		window.addEventListener("resize", handleScroll, { passive: true })

		return () => {
			window.removeEventListener("scroll", handleScroll)
			window.removeEventListener("resize", handleScroll)
		}
	}, [ref, rate, maxTravel])

	return { transform, progress }
}
