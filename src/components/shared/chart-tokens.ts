"use client";

import { useEffect, useState } from "react";

/**
 * Brand chart tokens read from CSS custom properties at draw-time, so charts
 * follow theme switches (light/dark) instead of hardcoding oklch values.
 *
 * Static fallbacks match the :root token values so SSR / first paint never
 * flashes an unstyled stroke. Re-reads whenever the <html> class attribute
 * changes (the project's .light theme toggle).
 */
export interface ChartTokens {
	/** Brand heat — --c-flame (== --orange family). */
	flame: string;
	/** Series-2 amber — --c-saffron-ink (round94 D/A6): dark = glow 9.94:1,
	 *  light = ink 6.14:1 — was --c-saffron which collapses to 2.05:1 <3:1
	 *  (WCAG 1.4.11 non-text) on light cards. */
	saffron: string;
}

const FALLBACK: ChartTokens = {
	flame: "oklch(0.55 0.19 45)",
	saffron: "oklch(0.78 0.14 70)",
};

function readTokens(): ChartTokens {
	if (typeof window === "undefined") return FALLBACK;
	const style = getComputedStyle(document.documentElement);
	return {
		flame: style.getPropertyValue("--c-flame").trim() || FALLBACK.flame,
		// round94 (D/A6): سلسلة-2 تقرأ الحبر المزدوج الإضاءة — في الداكن هو
		// قيمة التوهج نفسها (الرسوم الداكنة بلا تغيير) وفي الفاتح ink AA.
		saffron: style.getPropertyValue("--c-saffron-ink").trim() || FALLBACK.saffron,
	};
}

export function useChartTokens(): ChartTokens {
	const [tokens, setTokens] = useState<ChartTokens>(FALLBACK);

	useEffect(() => {
		setTokens(readTokens());
		const observer = new MutationObserver(() => setTokens(readTokens()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, []);

	return tokens;
}
