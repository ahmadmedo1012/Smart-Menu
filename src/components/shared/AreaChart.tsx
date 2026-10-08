'use client';

import { useState } from 'react';
import { m } from 'motion/react';
import { cn } from '@/lib/utils';
import { useChartTokens } from '@/components/shared/chart-tokens';

interface DataPoint {
        label: string;
        value: number;
}

interface AreaChartProps {
        data: DataPoint[];
        height?: number;
        /** Stroke color override. Defaults to the theme-aware --chart-1 token
         * (r130 W2-3, P0-4 — was the hardcoded night gold #E9B44C). */
        color?: string;
        gradientId?: string;
        className?: string;
        showAxis?: boolean;
        /** r121-K-5: data-bearing accessible name for screen readers. Without
         * it every instance announced the generic «مخطط مساحي, image» and the
         * trend data was invisible to SR users (mirrors the owner charts'
         * SplineAreaChart/ColumnChart ariaLabel contract). */
        ariaLabel?: string;
}

interface TooltipState {
        x: number;
        y: number;
        label: string;
        value: number;
}

export function AreaChart({
        data,
        height = 200,
        color,
        gradientId = 'area-gradient',
        className,
        showAxis = true,
        ariaLabel,
}: AreaChartProps) {
        const [tooltip, setTooltip] = useState<TooltipState | null>(null);
        // r130 (W2-3, P0-4): stroke + gradient stops ride the draw-time chart
        // tokens — --chart-1 (copper-ink chain) for the stroke, --accent-hover
        // (copper-deep/hover chain) for the top stop — so the chart follows
        // the theme (was: hardcoded night golds #E9B44C/#F5D48A).
        const tokens = useChartTokens();
        const stroke = color ?? tokens.chart1;

        if (data.length === 0) return null;

        const width = 600;
        const padding = { top: 20, right: 10, bottom: showAxis ? 30 : 10, left: 10 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const maxVal = Math.max(...data.map((d) => d.value), 1);
        const minVal = Math.min(...data.map((d) => d.value), 0);
        const range = maxVal - minVal || 1;

        const points = data.map((d, i) => ({
                x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
                y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
                ...d,
        }));

        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

        return (
                <div className={cn('w-full relative', className)}>
                        <svg
                                viewBox={`0 0 ${width} ${height}`}
                                className="w-full h-full"
                                preserveAspectRatio="xMidYMid meet"
                                role="img"
                                aria-label={ariaLabel ?? 'مخطط مساحي'}
                        >
                                <defs>
                                        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor={tokens.accentHover} stopOpacity={0.35} />
                                                <stop offset="100%" stopColor={stroke} stopOpacity={0.05} />
                                        </linearGradient>
                                </defs>

                                {/* Grid lines — recessive */}
                                {showAxis &&
                                        [0, 0.25, 0.5, 0.75, 1].map((pct) => {
                                                const y = padding.top + chartH * (1 - pct);
                                                return (
                                                        <line
                                                                key={pct}
                                                                x1={padding.left}
                                                                y1={y}
                                                                x2={width - padding.right}
                                                                y2={y}
                                                                stroke="currentColor"
                                                                strokeOpacity={0.06}
                                                                strokeDasharray="4 4"
                                                        />
                                                );
                                        })}

                                {/* Area fill */}
                                <m.path
                                        d={areaPath}
                                        fill={`url(#${gradientId})`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                />

                                {/* Line — thin 2px */}
                                <m.path
                                        d={linePath}
                                        fill="none"
                                        stroke={stroke}
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1, ease: 'easeInOut' }}
                                />

                                {/* Hit targets + Dots */}
                                {points.map((p, i) => (
                                        <g key={i}>
                                                {/* Invisible wide hit target */}
                                                <rect
                                                        x={p.x - 16}
                                                        y={padding.top}
                                                        width={32}
                                                        height={chartH}
                                                        fill="transparent"
                                                        className="cursor-pointer"
                                                        onMouseEnter={() =>
                                                                setTooltip({ x: p.x, y: p.y - 12, label: p.label, value: p.value })
                                                        }
                                                        onMouseLeave={() => setTooltip(null)}
                                                />
                                                {/* Dot */}
                                                <m.circle
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r={3}
                                                        fill={stroke}
                                                        stroke="var(--background)"
                                                        strokeWidth={2}
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: 0.8 + i * 0.03, duration: 0.3 }}
                                                />
                                        </g>
                                ))}

                                {/* Labels */}
                                {showAxis &&
                                        data.map((d, i) =>
                                                i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1 ? (
                                                        <text
                                                                key={i}
                                                                x={points[i].x}
                                                                y={height - 5}
                                                                textAnchor="middle"
                                                                className="fill-muted-foreground/60 text-3xs"
                                                        >
                                                                {d.label}
                                                        </text>
                                                ) : null
                                        )}
                        </svg>

                        {/* Tooltip */}
                        {tooltip && (
                                <div
                                        className="absolute pointer-events-none z-10 -translate-x-1/2"
                                        style={{ left: tooltip.x, top: tooltip.y }}
                                >
                                        <div className="rounded-md border border-border/40 bg-card/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-xl whitespace-nowrap">
                                                <p className="font-medium text-foreground">{tooltip.label}</p>
                                                <p className="text-muted-foreground tabular-nums" style={{ color: stroke }}>
                                                        {tooltip.value}
                                                </p>
                                        </div>
                                </div>
                        )}
                </div>
        );
}
