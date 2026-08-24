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
	/** Light amber glow — --c-saffron. */
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
		saffron: style.getPropertyValue("--c-saffron").trim() || FALLBACK.saffron,
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
