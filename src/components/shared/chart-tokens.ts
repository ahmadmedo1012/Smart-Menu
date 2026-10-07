"use client";

import { useEffect, useState } from "react";

/**
 * Brand chart tokens read from CSS custom properties at draw-time, so charts
 * follow theme switches (light/dark) instead of hardcoding values.
 *
 * Static fallbacks match the :root (Madarek night) token values so SSR /
 * first paint never flashes an unstyled stroke. Re-reads whenever the
 * <html> class attribute changes (the project's .light theme toggle).
 *
 * MADAREK PARITY — --c-flame resolves to the gold accent #E9B44C on night
 * (copper #B57438 in light); --c-saffron-ink is the AA-safe gold series
 * (#ECC97D night / #6B4C0B light).
 */
export interface ChartTokens {
        /** Brand heat — --c-flame (== --orange family). */
        flame: string;
        /** Series-2 amber — --c-saffron-ink (Madarek gold-ink: 12.37:1 night /
         *  7.56:1 light on their grounds — AA on both plot cards). */
        saffron: string;
}

const FALLBACK: ChartTokens = {
        flame: "#E9B44C",
        saffron: "#ECC97D",
};

function readTokens(): ChartTokens {
        if (typeof window === "undefined") return FALLBACK;
        const style = getComputedStyle(document.documentElement);
        return {
                flame: style.getPropertyValue("--c-flame").trim() || FALLBACK.flame,
                // Madarek gold-ink — AA-safe series-2 in both themes.
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
