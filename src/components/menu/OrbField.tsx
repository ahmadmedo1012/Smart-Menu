'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * r121-G-6 — viewport-gated ambient orbs (menu hero).
 *
 * The two blurred orbs (blur-[120px]/blur-[140px] on 288/384px elements)
 * animate infinitely, and their GPU raster stayed resident long after the
 * hero scrolled out of view — offscreen paint/composite work on every menu
 * scroll (G-6; the code's own comment in MenuHero admits blur layers are
 * expensive on mobile GPUs). This island pauses them via
 * `animation-play-state` the moment the hero leaves the viewport and resumes
 * on re-entry — the same IntersectionObserver pattern the codebase already
 * uses (ui/scroll-reveal.tsx, ui/clip-path-reveal.tsx).
 *
 * - `inView` starts `true`: the hero is the top of the page, so pre-JS the
 *   orbs must animate on first paint exactly as before (SSR emits no inline
 *   style in the running state — byte-identical pre-hydration HTML).
 * - reduced-motion is NOT handled here on purpose: the container keeps
 *   MenuHero's `motion-reduce:hidden` class + the global
 *   prefers-reduced-motion rules in globals.css (orbs fully disabled there).
 */
export function OrbField() {
	const ref = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(true);

	useEffect(() => {
		const el = ref.current;
		if (!el || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={ref}
			aria-hidden
			className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden"
		>
			<div
				className="absolute top-1/4 left-1/6 w-72 h-72 rounded-full bg-orange/6 blur-[120px] animate-orb-float"
				style={inView ? undefined : { animationPlayState: 'paused' }}
			/>
			<div
				className="absolute bottom-1/3 right-1/5 w-96 h-96 rounded-full bg-orange/4 blur-[140px] animate-orb-float-delayed"
				style={inView ? undefined : { animationPlayState: 'paused' }}
			/>
		</div>
	);
}
