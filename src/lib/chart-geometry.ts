export interface ChartPoint {
        x: number;
        y: number;
}

export interface LabeledValue {
        label: string;
        value: number;
}

export function linearScale(
        domain: [number, number],
        range: [number, number]
): (v: number) => number {
        const [d0, d1] = domain;
        const [r0, r1] = range;
        const span = d1 - d0;
        if (span === 0) return () => (r0 + r1) / 2;
        return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

/**
 * Catmull-Rom to cubic Bezier — LiveCharts2 LineSmoothness analogue.
 * Tension 0 is a polyline; 1 is the standard centripetal conversion factor 1/6.
 */
export function catmullRomPath(points: ChartPoint[], smoothness = 1): string {
        if (points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
        if (points.length === 2 || smoothness <= 0) {
                return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        }

        const k = (1 / 6) * Math.min(1, Math.max(0, smoothness));
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i - 1] ?? points[i];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[i + 2] ?? p2;
                const cp1x = p1.x + (p2.x - p0.x) * k;
                const cp1y = p1.y + (p2.y - p0.y) * k;
                const cp2x = p2.x - (p3.x - p1.x) * k;
                const cp2y = p2.y - (p3.y - p1.y) * k;
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;
}

export function closeAreaPath(linePath: string, points: ChartPoint[], baselineY: number): string {
        if (points.length === 0 || !linePath) return '';
        const first = points[0];
        const last = points[points.length - 1];
        return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

export function polarToCartesian(
        cx: number,
        cy: number,
        radius: number,
        angleRad: number
): ChartPoint {
        return {
                x: cx + radius * Math.cos(angleRad),
                y: cy + radius * Math.sin(angleRad),
        };
}

/** Donut slice path. Angles in radians, 0 = 3 o'clock (SVG). */
export function donutSlicePath(
        cx: number,
        cy: number,
        outerR: number,
        innerR: number,
        startAngle: number,
        endAngle: number
): string {
        const sweep = endAngle - startAngle;
        if (Math.abs(sweep) < 1e-6) return '';
        if (Math.abs(sweep) >= Math.PI * 2 - 1e-4) {
                const mid = startAngle + Math.PI;
                return [
                        donutSlicePath(cx, cy, outerR, innerR, startAngle, mid),
                        donutSlicePath(cx, cy, outerR, innerR, mid, startAngle + Math.PI * 2 - 1e-4),
                ].join(' ');
        }
        const large = Math.abs(sweep) > Math.PI ? 1 : 0;
        const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
        const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
        const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
        const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
        return [
                `M ${outerStart.x} ${outerStart.y}`,
                `A ${outerR} ${outerR} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
                `L ${innerStart.x} ${innerStart.y}`,
                `A ${innerR} ${innerR} 0 ${large} 0 ${innerEnd.x} ${innerEnd.y}`,
                'Z',
        ].join(' ');
}

export function tickIndices(length: number, maxTicks: number): number[] {
        if (length <= 0) return [];
        if (length <= maxTicks) return Array.from({ length }, (_, i) => i);
        const step = Math.ceil(length / maxTicks);
        const out: number[] = [];
        for (let i = 0; i < length; i += step) out.push(i);
        if (out[out.length - 1] !== length - 1) out.push(length - 1);
        return out;
}

/* r130 (W2-3, P0-4): SERIES_PALETTE is RETIRED — it hardcoded the NIGHT
 * chart values (#E9B44C #7FD39A #8FBBF2 #F0938F #B7A0F4 + an ad-hoc
 * oklch 6th series), so light mode rendered night-tuned slices. Charts now
 * read the theme-aware `--chart-1..8` tokens at draw time via
 * useChartTokens().series (components/shared/chart-tokens.ts); this module
 * stays pure geometry — zero color literals. */
