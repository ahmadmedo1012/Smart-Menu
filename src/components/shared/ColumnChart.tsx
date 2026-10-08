'use client';

import { useMemo, useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { tickIndices } from '@/lib/chart-geometry';
import { useChartTokens } from '@/components/shared/chart-tokens';

export interface ColumnSeries {
	id: string;
	label: string;
	color?: string;
	values: number[];
}

interface ColumnChartProps {
	labels: string[];
	series: ColumnSeries[];
	height?: number;
	className?: string;
	ariaLabel?: string;
	valueSuffix?: string;
}

interface TooltipState {
	index: number;
	x: number;
}

export function ColumnChart({
	labels,
	series,
	height = 220,
	className,
	ariaLabel = 'رسم أعمدة',
	valueSuffix = '',
}: ColumnChartProps) {
	const tokens = useChartTokens();
	const reduceMotion = useReducedMotion();
	const [tooltip, setTooltip] = useState<TooltipState | null>(null);
	const [hidden, setHidden] = useState<Record<string, boolean>>({});

	const width = 640;
	const padding = { top: 16, right: 8, bottom: 28, left: 8 };
	const chartW = width - padding.left - padding.right;
	const chartH = height - padding.top - padding.bottom;

	const visible = useMemo(() => series.filter((s) => !hidden[s.id]), [series, hidden]);
	const maxVal = Math.max(1, ...visible.flatMap((s) => s.values));
	const groupW = labels.length > 0 ? chartW / labels.length : chartW;
	const innerGap = groupW * 0.22;
	const barSlot = Math.max(4, groupW - innerGap);
	const barW = visible.length > 0 ? Math.max(4, (barSlot * 0.86) / visible.length) : barSlot;
	const ticks = tickIndices(labels.length, 10);

	const colored = useMemo(
		() =>
			series.map((s, i) => ({
				...s,
				color: s.color ?? (i === 0 ? tokens.flame : tokens.saffron),
			})),
		[series, tokens.flame, tokens.saffron]
	);

	if (labels.length === 0) return null;

	return (
		<div className={cn('relative w-full', className)}>
			{series.length > 1 ? (
				<div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="سلاسل الأعمدة">
					{colored.map((s) => {
						const isOn = !hidden[s.id];
						return (
							<button
								key={s.id}
								type="button"
								onClick={() => setHidden((h) => ({ ...h, [s.id]: !h[s.id] }))}
								aria-pressed={isOn}
								className={cn(
									'inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-medium',
									isOn
										? 'border-border/60 bg-background'
										: 'border-border/30 bg-muted/40 text-muted-foreground'
								)}
							>
								<span
									className="size-2.5 rounded-sm"
									style={{ background: isOn ? s.color : 'var(--muted-foreground)' }}
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
				{[0, 0.5, 1].map((pct) => {
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

				{labels.map((label, i) => {
					const gx = padding.left + i * groupW + innerGap / 2;
					const vis = colored.filter((s) => !hidden[s.id]);
					return (
						<g key={i}>
							<rect
								x={padding.left + i * groupW}
								y={padding.top}
								width={groupW}
								height={chartH}
								fill="transparent"
								tabIndex={0}
								aria-label={`${label}: ${vis
									.map((s) => `${s.label} ${toArabicNumber(s.values[i] ?? 0)}${valueSuffix}`)
									.join('، ')}`}
								onMouseEnter={() => setTooltip({ index: i, x: gx + barSlot / 2 })}
								onFocus={() => setTooltip({ index: i, x: gx + barSlot / 2 })}
								onMouseLeave={() => setTooltip(null)}
								onBlur={() => setTooltip(null)}
								className="cursor-pointer outline-none"
							/>
							{vis.map((s, si) => {
								const h = ((s.values[i] ?? 0) / maxVal) * chartH;
								const x = gx + si * barW + si * 2;
								const y = padding.top + chartH - h;
								return (
									<m.rect
										key={s.id}
										x={x}
										width={barW}
										rx={3}
										fill={s.color}
										initial={{ y: padding.top + chartH, height: reduceMotion ? h : 0 }}
										animate={{ y, height: h }}
										transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : i * 0.012 }}
									/>
								);
							})}
						</g>
					);
				})}

				{ticks.map((i) => (
					<text
						key={i}
						x={padding.left + i * groupW + groupW / 2}
						y={height - 6}
						textAnchor="middle"
						className="fill-muted-foreground/70 text-3xs"
					>
						{labels[i]}
					</text>
				))}
			</svg>

			{tooltip ? (
				<div
					className="pointer-events-none absolute z-10 -translate-x-1/2"
					style={{ left: `${(tooltip.x / width) * 100}%`, top: 4 }}
				>
					<div className="whitespace-nowrap rounded-md border border-border/40 bg-card/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-xl">
						<p className="font-medium">{labels[tooltip.index]}</p>
						{colored
							.filter((s) => !hidden[s.id])
							.map((s) => (
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
