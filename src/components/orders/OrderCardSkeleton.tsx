'use client';

/**
 * Skeleton mirroring the order card shape (icon square, order number +
 * badge row, customer line, meta line, total block) shown during first load.
 */
import { Skeleton } from '@/components/ui/skeleton';

export function OrderCardSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="space-y-3" aria-hidden="true">
			{Array.from({ length: count }, (_, i) => (
				<div
					key={i}
					className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-3"
				>
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-3">
							<Skeleton className="size-11 rounded-xl" />
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-5 w-14 rounded-full" />
								</div>
								<Skeleton className="h-3 w-28" />
								<Skeleton className="h-3 w-36" />
							</div>
						</div>
						<div className="space-y-2 text-end">
							<Skeleton className="ms-auto h-5 w-16" />
							<Skeleton className="ms-auto h-3 w-8" />
						</div>
					</div>
					<Skeleton className="h-9 w-full rounded-xl" />
				</div>
			))}
		</div>
	);
}
