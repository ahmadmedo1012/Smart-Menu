'use client';

import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * r131-F5 (A1 P1-12): the ONE canonical error family for owner/admin pages —
 * Madarek `.state` anatomy (components.css:1311-1373):
 *
 *   · 56px (size-14) pastel well — error tone = danger-soft ground +
 *     danger ink — with a small status dot, NO glow blobs (r130 de-glow law)
 *   · title 18px display bold
 *   · description 13px muted, max 42ch
 *   · retry = primary sm button with RefreshCw
 *
 * Replaces the five hand-rolled error branches this round found (orders
 * list, order detail, menu manager, reviews, admin/users, admin dashboard)
 * and converges DefaultError onto the same family.
 */
export function ErrorState({
	title = 'حدث خطأ',
	description,
	error,
	onRetry,
	retryLabel = 'إعادة المحاولة',
	icon: Icon = AlertTriangle,
	actions,
	className,
}: {
	title?: string;
	/** Short secondary line (13px muted, max 42ch). */
	description?: React.ReactNode;
	/** Optional raw error message rendered under the description. */
	error?: string | null;
	/** Retry callback — renders the canonical retry CTA when provided. */
	onRetry?: () => void;
	retryLabel?: string;
	/** Optional icon override (defaults to the alert triangle). */
	icon?: LucideIcon;
	/** Extra actions (back links etc.) rendered next to retry. */
	actions?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			role="alert"
			className={cn(
				'flex flex-col items-center justify-center gap-4 px-4 py-16 text-center animate-fade-in',
				className
			)}
		>
			<div className="relative flex size-14 shrink-0 items-center justify-center rounded-xl bg-[var(--danger-soft)]">
				<Icon className="size-6 text-[var(--danger-ink)]" aria-hidden="true" />
				{/* status dot — hairline/dot language, never a glow */}
				<span
					className="absolute -top-0.5 -end-0.5 size-2.5 rounded-full bg-[var(--danger-ink)] ring-2 ring-background"
					aria-hidden="true"
				/>
			</div>
			<div className="space-y-1.5">
				<h2 className="text-lg font-bold leading-snug text-foreground">{title}</h2>
				{description ? (
					<p className="mx-auto max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
						{description}
					</p>
				) : null}
				{error ? (
					<p className="mx-auto max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
						{error}
					</p>
				) : null}
			</div>
			{(onRetry || actions) && (
				<div className="flex flex-wrap items-center justify-center gap-2">
					{onRetry && (
						<Button variant="orange" size="sm" onClick={onRetry}>
							<RefreshCw className="size-3.5" aria-hidden="true" />
							{retryLabel}
						</Button>
					)}
					{actions}
				</div>
			)}
		</div>
	);
}
