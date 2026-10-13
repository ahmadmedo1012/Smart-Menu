"use client";

import { useEffect, useState } from "react";

/**
 * Brand chart tokens read from CSS custom properties at draw-time, so charts
 * follow theme switches (light/dark) instead of hardcoding values.
 *
 * Static fallbacks match the :root (Phase 5 warm LIGHT default) token
 * values so SSR / first paint never flashes an unstyled stroke. Re-reads
 * whenever the <html> class attribute changes (the .dark theme toggle).
 *
 * PHASE 5 — --c-flame resolves to the terracotta #C2452D in light
 * (luminous #E07856 in dark); --c-saffron-ink is the AA-safe amber series
 * (#7A5210 light / #E3B15E dark).
 *
 * r130 (W2-3, P0-4): the full `--chart-1..8` series roster is read at
 * draw-time. `chart1` is the series-1 stroke (terracotta chain) and
 * `accentHover` feeds the area-gradient top stop (accent-hover chain:
 * #A93A26 light / #E98F72 dark). The 6th series rides --chart-6
 * (#8F6212 light / #E8C568 dark).
 */
export interface ChartTokens {
        /** Brand heat — --c-flame (== --orange family). */
        flame: string;
        /** Series-2 amber — --c-saffron-ink (amber-ink: 6.46:1 light / 9.24:1
         *  night on their grounds — AA on both plot cards). */
        saffron: string;
        /** Series-1 stroke — --chart-1 (terracotta chain: #C2452D light /
         *  #E07856 dark). */
        chart1: string;
        /** Area-gradient top stop — --accent-hover (#A93A26 light /
         *  #E98F72 dark). */
        accentHover: string;
        /** The full --chart-1..8 series roster at draw-time (theme-aware). */
        series: string[];
}

const FALLBACK: ChartTokens = {
        // Phase 5 (r152): :root is now the LIGHT default — fallbacks match
        // the warm culinary chart roster; the MutationObserver re-reads per
        // active theme (.dark swaps in the night roster).
        flame: "#C2452D",
        saffron: "#7A5210",
        chart1: "#C2452D",
        accentHover: "#A93A26",
        series: [
                "#C2452D", // --chart-1 terracotta
                "#6FA06A", // --chart-2 sage
                "#6B8CA3", // --chart-3 warm steel
                "#C96873", // --chart-4 rose
                "#8A76C9", // --chart-5 lavender
                "#8F6212", // --chart-6 amber
                "#3F8B7E", // --chart-7 warm teal
                "#96547A", // --chart-8 warm plum
        ],
};

function readTokens(): ChartTokens {
        if (typeof window === "undefined") return FALLBACK;
        const style = getComputedStyle(document.documentElement);
        const read = (name: string, fb: string) => style.getPropertyValue(name).trim() || fb;
        return {
                flame: read("--c-flame", FALLBACK.flame),
                // Madarek gold-ink — AA-safe series-2 in both themes.
                saffron: read("--c-saffron-ink", FALLBACK.saffron),
                chart1: read("--chart-1", FALLBACK.chart1),
                accentHover: read("--accent-hover", FALLBACK.accentHover),
                series: FALLBACK.series.map((fb, i) => read(`--chart-${i + 1}`, fb)),
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
