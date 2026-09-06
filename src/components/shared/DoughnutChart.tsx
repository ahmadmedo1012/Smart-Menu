'use client';

import { useMemo, useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { donutSlicePath, SERIES_PALETTE } from '@/lib/chart-geometry';

export interface DoughnutSlice {
	id: string | number;
	label: string;
	value: number;
	color?: string;
}

interface DoughnutChartProps {
	data: DoughnutSlice[];
	className?: string;
	ariaLabel?: string;
	centerLabel?: string;
}

export function DoughnutChart({
	data,
	className,
	ariaLabel = 'رسم دائري',
	centerLabel,
}: DoughnutChartProps) {
	const reduceMotion = useReducedMotion();
	const [hidden, setHidden] = useState<Record<string, boolean>>({});
	const [active, setActive] = useState<string | null>(null);

	const sized = useMemo(
		() =>
			data.map((d, i) => ({
				...d,
				key: String(d.id),
				color: d.color ?? SERIES_PALETTE[i % SERIES_PALETTE.length],
			})),
		[data]
	);

	const visible = sized.filter((d) => !hidden[d.key] && d.value > 0);
	const total = visible.reduce((s, d) => s + d.value, 0);

	const size = 220;
	const cx = size / 2;
	const cy = size / 2;
	const outer = 86;
	const inner = 54;

	const slices = visible.reduce<
		{ key: string; label: string; value: number; color: string; start: number; end: number; pct: number }[]
	>((acc, d) => {
		const sweep = total > 0 ? (d.value / total) * Math.PI * 2 : 0;
		const start = acc.length === 0 ? -Math.PI / 2 : acc[acc.length - 1].end;
		acc.push({
			...d,
			start,
			end: start + sweep,
			pct: total > 0 ? Math.round((d.value / total) * 1000) / 10 : 0,
		});
		return acc;
	}, []);

	return (
		<div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-start', className)}>
			<svg
				viewBox={`0 0 ${size} ${size}`}
				className="size-[200px] shrink-0 sm:size-[220px]"
				role="img"
				aria-label={ariaLabel}
			>
				{slices.length === 0 ? (
					<circle cx={cx} cy={cy} r={outer} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={outer - inner} />
				) : (
					slices.map((s) => {
						const isActive = active === s.key;
						const path = donutSlicePath(
							cx,
							cy,
							isActive ? outer + 4 : outer,
							inner,
							s.start,
							s.end
						);
						return (
							<m.path
								key={s.key}
								d={path}
								fill={s.color}
								tabIndex={0}
								role="listitem"
								aria-label={`${s.label}: ${toArabicNumber(s.value)} (${toArabicNumber(s.pct)}٪)`}
								className="cursor-pointer outline-none focus-visible:stroke-foreground focus-visible:stroke-2"
								initial={{ opacity: reduceMotion ? 1 : 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: reduceMotion ? 0 : 0.35 }}
								onMouseEnter={() => setActive(s.key)}
								onMouseLeave={() => setActive(null)}
								onFocus={() => setActive(s.key)}
								onBlur={() => setActive(null)}
							/>
						);
					})
				)}
				<text
					x={cx}
					y={cy - 6}
					textAnchor="middle"
					className="fill-foreground text-[18px] font-bold"
				>
					{toArabicNumber(total)}
				</text>
				<text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
					{centerLabel ?? 'الإجمالي'}
				</text>
			</svg>

			<ul className="w-full min-w-0 space-y-1.5">
				{sized.map((d) => {
					const isOn = !hidden[d.key];
					const pct = total > 0 && isOn ? Math.round((d.value / total) * 1000) / 10 : 0;
					return (
						<li key={d.key}>
							<button
								type="button"
								onClick={() => setHidden((h) => ({ ...h, [d.key]: !h[d.key] }))}
								aria-pressed={isOn}
								className={cn(
									'flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-start text-xs',
									isOn
										? 'border-border/50 bg-background'
										: 'border-border/20 bg-muted/30 text-muted-foreground'
								)}
							>
								<span className="flex min-w-0 items-center gap-2">
									<span
										className="size-2.5 shrink-0 rounded-full"
										style={{ background: isOn ? d.color : 'var(--muted-foreground)' }}
										aria-hidden="true"
									/>
									<span className="truncate font-medium">{d.label}</span>
								</span>
								<span className="shrink-0 tabular-nums text-muted-foreground">
									{toArabicNumber(d.value)} · {toArabicNumber(pct)}٪
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
