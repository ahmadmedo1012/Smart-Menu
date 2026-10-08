/**
 * r126 (P4-F1 M9, audit F1): dashboard loading skeletons.
 *
 * DESIGN.md §Components promises "Skeleton for loading" — but every dashboard
 * route shipped the full-page DefaultLoading spinner (big CLS jump, blank
 * 60vh viewport). These skeletons mirror the shapes of the four most-visited
 * dashboards (owner home, owner/admin orders, owner menu) reusing the
 * existing skeleton patterns (MenuSkeleton's rhythm, OwnerKpiGridSkeleton's
 * KPI cards, OrderCardSkeleton's order rows — same .skeleton shimmer class,
 * which rides --motion-duration-skeleton and goes static under RM).
 */
import { Skeleton } from '@/components/ui/skeleton';
import { OrderCardSkeleton } from '@/components/orders/OrderCardSkeleton';

/** Page-level wrapper: status semantics + staggered rise-in (MenuSkeleton pattern). */
function SkeletonPage({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div role="status" aria-live="polite" aria-busy="true" className="space-y-6 animate-fade-in">
			<span className="sr-only">{label}</span>
			{children}
		</div>
	);
}

/** KPI strip — 4 cards shaped like KpiCard (label / big value / subtitle / icon well). */
function KpiGridSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
			{Array.from({ length: count }, (_, i) => (
				<div
					key={i}
					className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm backdrop-blur-sm animate-rise-in"
					style={{ animationDelay: `${i * 60}ms` }}
				>
					<div className="flex items-start justify-between">
						<div className="flex-1 space-y-2.5">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-9 w-24" />
							<Skeleton className="h-2.5 w-16" />
						</div>
						<Skeleton className="size-11 rounded-md" />
					</div>
				</div>
			))}
		</div>
	);
}

/** Header row: back affordance + title + (optional) trailing action button. */
function HeaderSkeleton() {
	return (
		<div className="flex items-center justify-between gap-4" aria-hidden="true">
			<div className="flex items-center gap-3">
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-8 w-40 rounded-lg" />
			</div>
			<Skeleton className="h-11 w-32 rounded-lg" />
		</div>
	);
}

/** Search bar + filter chip row (orders/menu lists). */
function FiltersSkeleton() {
	return (
		<div className="space-y-3" aria-hidden="true">
			<Skeleton className="h-11 w-full rounded-md" />
			<div className="flex gap-2">
				{[0, 1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-9 w-20 rounded-full" />
				))}
			</div>
		</div>
	);
}

/** Wide list-card column (status breakdown / popular items shapes). */
function ListCardSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div className="rounded-xl border border-border/50 bg-card/60 p-5 space-y-3" aria-hidden="true">
			<Skeleton className="h-4 w-28" />
			{Array.from({ length: rows }, (_, i) => (
				<div key={i} className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 flex-1">
						<Skeleton className="size-8 rounded-lg" />
						<Skeleton className="h-3.5 flex-1 max-w-40" />
					</div>
					<Skeleton className="h-5 w-12 rounded-full" />
				</div>
			))}
		</div>
	);
}

/** Owner/admin dashboard home: KPI strip + 3-column breakdown + quick actions. */
export function DashboardSkeleton() {
	return (
		<SkeletonPage label="جارٍ تحميل لوحة التحكم...">
			<HeaderSkeleton />
			<KpiGridSkeleton />
			<div className="grid gap-6 lg:grid-cols-3">
				<ListCardSkeleton />
				<ListCardSkeleton />
				<div className="lg:col-span-1 space-y-3" aria-hidden="true">
					<OrderCardSkeleton count={2} />
				</div>
			</div>
			<div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm" aria-hidden="true">
				<Skeleton className="h-3 w-24 mb-3" />
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-20 rounded-xl" />
					))}
				</div>
			</div>
		</SkeletonPage>
	);
}

/** Orders list page: header + search/chips + order card stack. */
export function OrdersPageSkeleton() {
	return (
		<SkeletonPage label="جارٍ تحميل الطلبات...">
			<HeaderSkeleton />
			<FiltersSkeleton />
			<OrderCardSkeleton count={5} />
		</SkeletonPage>
	);
}

/** Owner menu manager: header + search + plan badge + category rows with item lines. */
export function MenuManagerSkeleton() {
	const categories = [0, 1, 2];
	return (
		<SkeletonPage label="جارٍ تحميل القائمة...">
			<HeaderSkeleton />
			<FiltersSkeleton />
			<div className="space-y-3">
				{categories.map((c) => (
					<div
						key={c}
						className="rounded-xl border border-border/30 bg-card/60 overflow-hidden animate-rise-in"
						style={{ animationDelay: `${c * 60}ms` }}
						aria-hidden="true"
					>
						<div className="flex items-center justify-between p-4">
							<div className="flex items-center gap-3">
								<Skeleton className="size-10 rounded-lg" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-2.5 w-20" />
								</div>
							</div>
							<div className="flex gap-1.5">
								<Skeleton className="size-9 rounded-md" />
								<Skeleton className="size-9 rounded-md" />
							</div>
						</div>
						<div className="border-t border-border/20 px-4 py-3 space-y-3">
							{[0, 1].map((i) => (
								<div key={i} className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<Skeleton className="size-11 rounded-xl" />
										<div className="space-y-2 flex-1">
											<Skeleton className="h-4 w-36" />
											<Skeleton className="h-2.5 w-24" />
										</div>
									</div>
									<Skeleton className="h-6 w-16 rounded-md" />
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</SkeletonPage>
	);
}
