'use client';

/**
 * Honest live-polling indicator for the orders pages.
 * Shows "يتحدث تلقائياً كل X ثانية" with a breathing dot while polling is
 * active; flips to a paused state when the tab is hidden (polling stops).
 * Purely presentational — the parent owns the interval.
 */
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';

interface LivePollIndicatorProps {
	/** Polling cadence in seconds — rendered with Western digits. */
	intervalSeconds: number;
	/** False while document.hidden — polling stopped, indicator goes muted. */
	isActive: boolean;
	className?: string;
}

export function LivePollIndicator({
	intervalSeconds,
	isActive,
	className,
}: LivePollIndicatorProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
				isActive
					? 'border-success/25 bg-success/10 text-success'
					: 'border-border/30 bg-muted/40 text-muted-foreground',
				className
			)}
			role="status"
			aria-live="polite"
		>
			<span className="relative flex size-2" aria-hidden="true">
				{isActive && (
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
				)}
				<span
					className={cn(
						'relative inline-flex size-2 rounded-full bg-current',
						isActive && 'motion-safe:animate-pulse'
					)}
				/>
			</span>
			{isActive
				? `تحديث تلقائي كل ${toArabicNumber(intervalSeconds)} ثانية`
				: 'التحديث التلقائي متوقف'}
		</span>
	);
}
