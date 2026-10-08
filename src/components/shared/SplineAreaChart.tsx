'use client';

import { useId, useMemo, useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { catmullRomPath, closeAreaPath, linearScale, tickIndices } from '@/lib/chart-geometry';
import { useChartTokens } from '@/components/shared/chart-tokens';

export interface SplineSeries {
	id: string;
	label: string;
	color?: string;
	values: number[];
	hidden?: boolean;
}

interface SplineAreaChartProps {
	labels: string[];
	series: SplineSeries[];
	height?: number;
	className?: string;
	ariaLabel?: string;
	valueSuffix?: string;
	smoothness?: number;
}

interface TooltipState {
	index: number;
	x: number;
}

export function SplineAreaChart({
	labels,
	series,
	height = 220,
	className,
	ariaLabel = 'رسم خطي للمنحنى',
	valueSuffix = '',
	smoothness = 1,
}: SplineAreaChartProps) {
	const uid = useId().replace(/:/g, '');
	const tokens = useChartTokens();
	const reduceMotion = useReducedMotion();
	const [tooltip, setTooltip] = useState<TooltipState | null>(null);
	const [hidden, setHidden] = useState<Record<string, boolean>>({});

	const visible = useMemo(
		() => series.filter((s) => !s.hidden && !hidden[s.id]),
		[series, hidden]
	);
	const width = 640;
	const padding = { top: 16, right: 12, bottom: 28, left: 12 };
	const chartW = width - padding.left - padding.right;
	const chartH = height - padding.top - padding.bottom;

	const maxVal = Math.max(1, ...visible.flatMap((s) => s.values), 1);
	const xAt = (i: number) =>
		padding.left + (labels.length <= 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW);

	const plotted = useMemo(() => {
		const y = linearScale([0, maxVal], [padding.top + chartH, padding.top]);
		const x = (i: number) =>
			padding.left + (labels.length <= 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW);
		return visible.map((s, si) => {
			const pts = labels.map((_, i) => ({ x: x(i), y: y(s.values[i] ?? 0) }));
			const line = catmullRomPath(pts, smoothness);
			return {
				...s,
				color: s.color ?? (si === 0 ? tokens.flame : tokens.saffron),
				pts,
				line,
				area: closeAreaPath(line, pts, padding.top + chartH),
				gradientId: `spline-${uid}-${s.id}`,
			};
		});
	}, [
		visible,
		labels,
		maxVal,
		smoothness,
		tokens.flame,
		tokens.saffron,
		uid,
		chartH,
		chartW,
		padding.top,
		padding.left,
	]);

	const ticks = tickIndices(labels.length, 8);

	if (labels.length === 0) return null;

	return (
		<div className={cn('relative w-full', className)}>
			{series.length > 1 ? (
				<div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="سلاسل الرسم">
					{series.map((s, si) => {
						const color = s.color ?? (si === 0 ? tokens.flame : tokens.saffron);
						const isOn = !hidden[s.id];
						return (
							<button
								key={s.id}
								type="button"
								onClick={() => setHidden((h) => ({ ...h, [s.id]: !h[s.id] }))}
								aria-pressed={isOn}
								className={cn(
									'inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors',
									isOn
										? 'border-border/60 bg-background'
										: 'border-border/30 bg-muted/40 text-muted-foreground'
								)}
							>
								<span
									className="size-2.5 rounded-full"
									style={{ background: isOn ? color : 'var(--muted-foreground)' }}
									aria-hidden="true"
								/>
								{s.label}
							</button>
						);
					})}
				</div>
			) : null}

			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="h-full w-full"
				preserveAspectRatio="xMidYMid meet"
				role="img"
				aria-label={ariaLabel}
			>
				<defs>
					{plotted.map((s) => (
						<linearGradient key={s.gradientId} id={s.gradientId} x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
							<stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
						</linearGradient>
					))}
				</defs>

				{[0, 0.25, 0.5, 0.75, 1].map((pct) => {
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

				{plotted.map((s) => (
					<g key={s.id}>
						<m.path
							d={s.area}
							fill={`url(#${s.gradientId})`}
							initial={{ opacity: reduceMotion ? 1 : 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: reduceMotion ? 0 : 0.6 }}
						/>
						<m.path
							d={s.line}
							fill="none"
							stroke={s.color}
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
							initial={{ pathLength: reduceMotion ? 1 : 0 }}
							animate={{ pathLength: 1 }}
							transition={{ duration: reduceMotion ? 0 : 0.9, ease: 'easeInOut' }}
						/>
					</g>
				))}

				{labels.map((label, i) => (
					<g key={i}>
						<rect
							x={xAt(i) - 14}
							y={padding.top}
							width={28}
							height={chartH}
							fill="transparent"
							tabIndex={0}
							role="listitem"
							aria-label={`${label}: ${plotted
								.map((s) => `${s.label} ${toArabicNumber(s.values[i] ?? 0)}${valueSuffix}`)
								.join('، ')}`}
							onMouseEnter={() => setTooltip({ index: i, x: xAt(i) })}
							onFocus={() => setTooltip({ index: i, x: xAt(i) })}
							onMouseLeave={() => setTooltip(null)}
							onBlur={() => setTooltip(null)}
							className="cursor-pointer outline-none"
						/>
						{tooltip?.index === i
							? plotted.map((s) => (
									<circle
										key={s.id}
										cx={s.pts[i]?.x}
										cy={s.pts[i]?.y}
										r={4}
										fill={s.color}
										stroke="var(--background)"
										strokeWidth={2}
									/>
								))
							: null}
					</g>
				))}

				{ticks.map((i) => (
					<text
						key={i}
						x={xAt(i)}
						y={height - 6}
						textAnchor="middle"
						className="fill-[var(--chart-text)] text-3xs"
					>
						{labels[i]}
					</text>
				))}
			</svg>

			{tooltip ? (
				<div
					className="pointer-events-none absolute z-10 -translate-x-1/2"
					style={{
						left: `${(tooltip.x / width) * 100}%`,
						top: 8,
					}}
				>
					<div className="whitespace-nowrap rounded-md border border-border/40 bg-card/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-xl">
						<p className="font-medium text-foreground">{labels[tooltip.index]}</p>
						{plotted.map((s) => (
							<p key={s.id} className="tabular-nums" style={{ color: s.color }}>
								{s.label}: {toArabicNumber(s.values[tooltip.index] ?? 0)}
								{valueSuffix}
							</p>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}
