/**
 * r126 (P4-F1 M9, audit F1): dashboard loading skeletons.
 *
 * DESIGN.md §Components promises "Skeleton for loading" — but every dashboard
 * route shipped the full-page DefaultLoading spinner (big CLS jump, blank
 * 60vh viewport). These skeletons mirror the shapes of the four most-visited
 * dashboards (owner home, owner/admin orders, owner menu) reusing the
 * existing skeleton patterns (MenuSkeleton's rhythm, the deleted OwnerKpiGridSkeleton's
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
export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
        return (
                <div className="grid grid-cols-2 gap-5 min-[1101px]:grid-cols-4" aria-hidden="true">
                        {Array.from({ length: count }, (_, i) => (
                                <div
                                        key={i}
                                        className="min-h-[132px] rounded-xl border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur-sm animate-rise-in"
                                        style={{ animationDelay: `${i * 60}ms` }}
                                >
                                        <div className="flex items-start justify-between">
                                                <div className="flex-1 space-y-2.5">
                                                        <Skeleton className="h-3 w-20" />
                                                        <Skeleton className="h-9 w-24" />
                                                        <Skeleton className="h-2.5 w-16" />
                                                </div>
                                                <Skeleton className="size-11 rounded-lg" />
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
export function ListCardSkeleton({ rows = 4 }: { rows?: number }) {
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
                <SkeletonPage label="جارٍ تحميل لوحة التحكم…">
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
                <SkeletonPage label="جارٍ تحميل الطلبات…">
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
                <SkeletonPage label="جارٍ تحميل القائمة…">
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

/**
 * r131-F5 (A11 SM-2): the remaining owner/admin routes join the shape-skeleton
 * family — every loading.tsx that still rendered the DefaultLoading 60vh
 * spinner now paints a page-shaped fallback (LIST / TABLE / DETAIL / SETTINGS /
 * QR variants below), all on the .skeleton shimmer (1200ms linear, RM-killed).
 */

/** Generic list page: header + search/chips + row cards (users, admins, reviews, restaurants…). */
export function ListPageSkeleton({
        rows = 5,
        rowHeight = 'h-20',
        label = 'جارٍ تحميل القائمة…',
}: {
        rows?: number;
        rowHeight?: string;
        label?: string;
}) {
        return (
                <SkeletonPage label={label}>
                        <HeaderSkeleton />
                        <FiltersSkeleton />
                        <div className="space-y-3" aria-hidden="true">
                                {Array.from({ length: rows }, (_, i) => (
                                        <Skeleton
                                                key={i}
                                                className={`w-full rounded-xl ${rowHeight} animate-rise-in`}
                                                style={{ animationDelay: `${i * 60}ms` }}
                                        />
                                ))}
                        </div>
                </SkeletonPage>
        );
}

/** Table page: header + filters + surface table with 11px header row + zebra-ish rows. */
export function TablePageSkeleton({
        rows = 6,
        label = 'جارٍ تحميل البيانات…',
}: {
        rows?: number;
        label?: string;
}) {
        return (
                <SkeletonPage label={label}>
                        <HeaderSkeleton />
                        <FiltersSkeleton />
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-card" aria-hidden="true">
                                <div className="flex gap-4 border-b border-border/60 bg-muted/60 px-4 py-3">
                                        {[0, 1, 2, 3].map((i) => (
                                                <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-24' : 'w-16'}`} />
                                        ))}
                                </div>
                                {Array.from({ length: rows }, (_, i) => (
                                        <div key={i} className="flex items-center gap-4 border-b border-border/30 px-4 py-3.5 last:border-0">
                                                <Skeleton className="size-9 rounded-lg" />
                                                <Skeleton className="h-4 flex-1 max-w-48" />
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-5 w-16 rounded-full" />
                                                <Skeleton className="h-6 w-12 rounded-md" />
                                        </div>
                                ))}
                        </div>
                </SkeletonPage>
        );
}

/** Detail page (order detail): header + status card + info card grid + items card. */
export function DetailPageSkeleton({ label = 'جارٍ تحميل التفاصيل…' }: { label?: string }) {
        return (
                <SkeletonPage label={label}>
                        <HeaderSkeleton />
                        <div className="rounded-xl border border-border/60 bg-card p-6" aria-hidden="true">
                                <Skeleton className="mb-6 h-4 w-24" />
                                <div className="flex items-center justify-between">
                                        {[0, 1, 2, 3].map((i) => (
                                                <div key={i} className="flex flex-col items-center gap-2">
                                                        <Skeleton className="size-10 rounded-xl" />
                                                        <Skeleton className="h-3 w-16" />
                                                </div>
                                        ))}
                                </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
                                {[0, 1].map((i) => (
                                        <div key={i} className="space-y-3 rounded-xl border border-border/60 bg-card p-5">
                                                <Skeleton className="h-4 w-28" />
                                                <Skeleton className="h-3.5 w-36" />
                                                <Skeleton className="h-3.5 w-28" />
                                                <Skeleton className="h-3.5 w-32" />
                                        </div>
                                ))}
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card p-5" aria-hidden="true">
                                <Skeleton className="mb-4 h-4 w-24" />
                                {[0, 1, 2].map((i) => (
                                        <div key={i} className="flex items-center justify-between py-2.5">
                                                <div className="flex items-center gap-3">
                                                        <Skeleton className="size-7 rounded-lg" />
                                                        <Skeleton className="h-4 w-32" />
                                                </div>
                                                <Skeleton className="h-4 w-16" />
                                        </div>
                                ))}
                        </div>
                </SkeletonPage>
        );
}

/** Settings-style page: header + narrow stacked cards (settings, telegram, subscriptions). */
export function SettingsPageSkeleton({
        cards = 3,
        label = 'جارٍ تحميل الإعدادات…',
}: {
        cards?: number;
        label?: string;
}) {
        return (
                <SkeletonPage label={label}>
                        <HeaderSkeleton />
                        <div className="space-y-5" aria-hidden="true">
                                {Array.from({ length: cards }, (_, i) => (
                                        <Skeleton
                                                key={i}
                                                className={`w-full rounded-xl ${i === 0 ? 'h-36' : 'h-56'} animate-rise-in`}
                                                style={{ animationDelay: `${i * 60}ms` }}
                                        />
                                ))}
                        </div>
                </SkeletonPage>
        );
}

/** QR page: header + centered QR card (restaurant strip + square code + controls). */
export function QrPageSkeleton() {
        return (
                <SkeletonPage label="جارٍ تحميل رمز QR…">
                        <HeaderSkeleton />
                        <div
                                className="mx-auto max-w-xl overflow-hidden rounded-xl border border-border/60 bg-card"
                                aria-hidden="true"
                        >
                                <div className="flex items-center gap-3 border-b border-border/20 p-5">
                                        <Skeleton className="size-10 rounded-xl" />
                                        <div className="space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-24" />
                                        </div>
                                </div>
                                <div className="flex justify-center p-8">
                                        <Skeleton className="size-56 rounded-xl" />
                                </div>
                                <div className="space-y-4 p-5">
                                        <div className="flex gap-2">
                                                {[0, 1, 2, 3].map((i) => (
                                                        <Skeleton key={i} className="h-11 flex-1 rounded-md" />
                                                ))}
                                        </div>
                                        <Skeleton className="h-11 w-full rounded-md" />
                                </div>
                        </div>
                </SkeletonPage>
        );
}
