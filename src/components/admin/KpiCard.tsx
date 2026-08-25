'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { MiniSparkline } from '@/components/shared/MiniSparkline';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
	label: string;
	value: number;
	icon: LucideIcon;
	iconBg?: string;
	iconColor?: string;
	suffix?: string;
	trend?: number;
	sparklineData?: number[];
	/** When set the whole card becomes a real stretched link (OwnerKpiGrid pattern). */
	href?: string;
}

export const KpiCard = memo(function KpiCard({
	label,
	value,
	icon: Icon,
	iconBg,
	iconColor,
	suffix = '',
	trend,
	sparklineData,
	href,
}: KpiCardProps) {
	const body = (
		<>
			{/* Ambient glow on hover */}
			<div className="absolute -inset-2 bg-gradient-radial from-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

			<div className="relative flex items-start justify-between">
				<div className="space-y-1.5">
					<p className="text-xs font-medium text-muted-foreground">{label}</p>
					<p className="text-3xl font-bold tracking-normal">
						{toArabicNumber(value)}
						{suffix}
					</p>
					<div className="flex items-center gap-2">
						{sparklineData && sparklineData.length > 1 && <MiniSparkline data={sparklineData} />}
						{trend !== undefined && (
							<span
								className={cn(
									'text-xs font-medium flex items-center gap-0.5',
									trend >= 0 ? 'text-success' : 'text-destructive'
								)}
							>
								{trend >= 0 ? '↑' : '↓'} {toArabicNumber(Math.abs(trend))}%
							</span>
						)}
					</div>
				</div>
				<div className={cn('rounded-xl p-3 shrink-0', iconBg || 'bg-orange-muted')}>
					<Icon className={cn('size-5', iconColor || 'text-orange')} />
				</div>
			</div>
		</>
	);

	// a11y (4.1.2): clickable KPIs are real stretched links — a native anchor gives
	// role=link + Enter activation + focus for free (same pattern as OwnerKpiGrid).
	if (href) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ type: 'spring', stiffness: 300, damping: 25 }}
				className="group relative overflow-hidden rounded-md bg-card/60 backdrop-blur-sm border border-border/30 shadow-sm transition-[border-color,box-shadow,transform,translate,scale,rotate] duration-300 hover:border-orange/30 hover:shadow-lg hover:-translate-y-0.5"
			>
				<Link
					href={href}
					className="absolute inset-0 z-10 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
				>
					<span className="sr-only">{label}</span>
				</Link>
				<div className="p-5">{body}</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ type: 'spring', stiffness: 300, damping: 25 }}
			className="group relative overflow-hidden rounded-md bg-card/60 backdrop-blur-sm border border-border/30 p-5 shadow-sm transition-[border-color,box-shadow] duration-300"
		>
			{body}
		</motion.div>
	);
});
