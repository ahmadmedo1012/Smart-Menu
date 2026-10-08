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
 *
 * r130 (W2-3, P0-4): the full `--chart-1..8` series roster is read at
 * draw-time (the tokens were defined in both themes with ZERO consumers —
 * charts hardcoded the night palette, so light mode rendered night-tuned
 * slices). `chart1` is the series-1 stroke (copper-ink chain) and
 * `accentHover` feeds the area-gradient top stop (copper-deep/hover chain:
 * #F5D48A night / #9A5F25 light). The 6th series rides --chart-6
 * (#F2C766 night / #A67A22 light) — the ad-hoc oklch() is retired.
 */
export interface ChartTokens {
        /** Brand heat — --c-flame (== --orange family). */
        flame: string;
        /** Series-2 amber — --c-saffron-ink (Madarek gold-ink: 12.37:1 night /
         *  7.56:1 light on their grounds — AA on both plot cards). */
        saffron: string;
        /** Series-1 stroke — --chart-1 (copper-ink chain: #E9B44C night /
         *  #B57438 light). */
        chart1: string;
        /** Area-gradient top stop — --accent-hover (#F5D48A night /
         *  #9A5F25 light). */
        accentHover: string;
        /** The full --chart-1..8 series roster at draw-time (theme-aware). */
        series: string[];
}

const FALLBACK: ChartTokens = {
        flame: "#E9B44C",
        saffron: "#ECC97D",
        chart1: "#E9B44C",
        accentHover: "#F5D48A",
        // :root (night) --chart-1..8 values — SSR/first-paint only; the
        // MutationObserver re-reads per active theme.
        series: [
                "#E9B44C", // --chart-1 copper-ink
                "#7FD39A", // --chart-2 mint-ink
                "#8FBBF2", // --chart-3 sky-ink
                "#F0938F", // --chart-4 rose-ink
                "#B7A0F4", // --chart-5 lavender-ink
                "#F2C766", // --chart-6 AA-safe gold
                "#5FAFAF", // --chart-7 teal
                "#C57DA9", // --chart-8 mauve
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
