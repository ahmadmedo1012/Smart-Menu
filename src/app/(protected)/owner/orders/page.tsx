'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { BackButton } from '@/components/shared/BackButton';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { premiumToast } from '@/lib/premium-toast';
import { csrfFetch } from '@/lib/csrf-client';
import {
	ClipboardList,
	SearchX,
	Download,
	Loader2,
	AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toArabicNumber, formatDate } from '@/lib/format';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
import {
	getOrderStatusMeta,
	getPickupTypeMeta,
	formatRelativeTimeAr,
} from '@/lib/order-status';
import { LivePollIndicator } from '@/components/orders/LivePollIndicator';
import { OrderCardSkeleton } from '@/components/orders/OrderCardSkeleton';

interface Order {
	id: number;
	orderNo: string;
	customerName: string;
	customerPhone?: string;
	status: string;
	total: number;
	pickupType: string;
	createdAt: string;
	items: { quantity: number }[];
}

const PAGE_SIZE = 20;
/** Honest cadence shown in the live indicator — keep both in sync. */
const POLL_INTERVAL_MS = 15_000;

/** Status chips shown as horizontally scrollable filters with counts. */
const STATUS_FILTERS = [
	{ value: '', label: 'الكل' },
	{ value: 'new', label: 'جديد' },
	{ value: 'preparing', label: 'قيد التحضير' },
	{ value: 'ready', label: 'جاهز' },
	{ value: 'completed', label: 'مكتمل' },
];

export default function OwnerOrdersPage() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [totalOrders, setTotalOrders] = useState(0);
	const [loading, setLoading] = useState(true);
	const constLoadingMore = useState(false);
	void constLoadingMore;
	const [loadingMore, setLoadingMore] = constLoadingMore;
	const [filter, setFilter] = useState('');
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [exporting, setExporting] = useState(false);
	// True while the tab is visible AND the poll interval is running.
	const [isLive, setIsLive] = useState(true);
	// Optimistic status transitions: orderId → target status while in flight.
	const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
	const router = useRouter();
	const ordersRef = useRef<Order[]>([]);
	// Multi-menu: active restaurant scopes all order queries
	const { activeId } = useActiveRestaurant();

	const fetchOrders = useCallback(
		async (
			status: string,
			pageNum = 1,
			append = false,
			dateF?: string,
			dateT?: string
		) => {
			try {
				if (pageNum === 1) setLoading(true);
				else setLoadingMore(true);
				setError(null);
				const params = new URLSearchParams();
				if (status) params.set('status', status);
				params.set('page', String(pageNum));
				params.set('pageSize', String(PAGE_SIZE));
				// Multi-menu: always scope to the active restaurant
				if (activeId) params.set('restaurantId', String(activeId));
				const from = dateF ?? dateFrom;
				const to = dateT ?? dateTo;
				if (from) params.set('dateFrom', from);
				if (to) params.set('dateTo', to);
				const url = `/api/orders?${params.toString()}`;
				const res = await fetch(url);
				if (res.status === 401) {
					window.location.href = '/login';
					return;
				}
				if (!res.ok) throw new Error();
				const json = await res.json();
				const newOrders: Order[] = Array.isArray(json.data) ? json.data : [];
				if (json?.meta?.total !== undefined) setTotalOrders(json.meta.total);
				if (append) {
					setOrders((prev) => {
						const merged = [...prev, ...newOrders];
						ordersRef.current = merged;
						return merged;
					});
				} else {
					setOrders(newOrders);
					ordersRef.current = newOrders;
				}
				setHasMore(newOrders.length === PAGE_SIZE);
				setPage(pageNum);
			} catch {
				setError('فشل تحميل الطلبات');
				premiumToast('error', 'فشل تحميل الطلبات');
			} finally {
				if (pageNum === 1) setLoading(false);
				else setLoadingMore(false);
			}
		},
		[dateFrom, dateTo, activeId]
	);

	const loadMore = () => fetchOrders(filter, page + 1, true);

	useEffect(() => {
		fetchOrders(filter, 1, false);
	}, [filter, fetchOrders]);

	// Auto-refresh — client polling replaces SSE (Vercel kills streams at 300s).
	// Honest UX: the indicator reflects the real cadence and pauses when the tab
	// is hidden (document.visibilitychange) to save network + battery.
	useEffect(() => {
		let intervalId: ReturnType<typeof setInterval> | undefined;

		const poll = async () => {
			try {
				const params = new URLSearchParams();
				if (filter) params.set('status', filter);
				params.set('page', '1');
				params.set('pageSize', String(PAGE_SIZE));
				if (activeId) params.set('restaurantId', String(activeId));
				const res = await fetch(`/api/orders?${params.toString()}`);
				if (res.status === 401) {
					window.location.href = '/login';
					return;
				}
				if (!res.ok) return;
				const json = await res.json();
				const fresh: Order[] = Array.isArray(json.data) ? json.data : [];
				const currentIds = JSON.stringify(
					ordersRef.current?.map((o: { id: number }) => o.id) ?? []
				);
				const freshIds = JSON.stringify(fresh.map((o: { id: number }) => o.id));
				if (currentIds !== freshIds && currentIds !== '[]') {
					fetchOrders(filter, 1, false);
					premiumToast('success', '📦 تحديث الطلبات', undefined, {
						duration: 3000,
					});
				}
			} catch {
				/* transient — next tick retries */
			}
		};

		const startPolling = () => {
			setIsLive(true);
			// Guard: visibilitychange can fire while an interval is running —
			// never stack a second interval on top of the first.
			if (intervalId) return;
			intervalId = setInterval(poll, POLL_INTERVAL_MS);
		};
		const stopPolling = () => {
			setIsLive(false);
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = undefined;
			}
		};
		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') stopPolling();
			else startPolling();
		};

		startPolling();
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			stopPolling();
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, [filter, fetchOrders, activeId]);

	const updateStatus = useCallback(async (orderId: number, newStatus: string) => {
		const prevStatus = ordersRef.current.find((o) => o.id === orderId)?.status;
		if (!prevStatus) return;
		const setStatusEverywhere = (status: string) => {
			setOrders((prev) =>
				prev.map((o) => (o.id === orderId ? { ...o, status } : o))
			);
			ordersRef.current = ordersRef.current.map((o) =>
				o.id === orderId ? { ...o, status } : o
			);
		};
		// Optimistic: flip the card immediately, roll back on failure.
		setPendingStatus((prev) => ({ ...prev, [orderId]: newStatus }));
		setStatusEverywhere(newStatus);
		try {
			const res = await csrfFetch(`/api/orders/${orderId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});
			if (!res.ok) throw new Error();
			premiumToast(
				'save',
				`تم تغيير الحالة إلى ${getOrderStatusMeta(newStatus).label}`
			);
		} catch {
			// Rollback to the exact previous state
			setStatusEverywhere(prevStatus);
			premiumToast('error', 'فشل تحديث الحالة — أُعيدت الحالة السابقة');
		} finally {
			setPendingStatus((prev) => {
				if (!(orderId in prev)) return prev;
				const next = { ...prev };
				delete next[orderId];
				return next;
			});
		}
	}, []);

	const filtered = useMemo(
		() =>
			orders.filter(
				(o) => !search || o.orderNo.includes(search) || o.customerName.includes(search)
			),
		[orders, search]
	);

	const filtersWithCounts = useMemo(
		() =>
			STATUS_FILTERS.map((tab) => ({
				...tab,
				count:
					tab.value === ''
						? totalOrders || orders.length
						: orders.filter((o) => o.status === tab.value).length,
			})),
		[orders, totalOrders]
	);

	const hasActiveFilters = Boolean(search || filter || dateFrom || dateTo);

	const clearAllFilters = () => {
		setSearch('');
		const hadDateFilter = Boolean(dateFrom || dateTo);
		const hadStatusFilter = Boolean(filter);
		setDateFrom('');
		setDateTo('');
		setFilter('');
		// Changing filter triggers the refetch effect; if only dates were active
		// (filter already ''), refetch explicitly.
		if (!hadStatusFilter && hadDateFilter) fetchOrders('', 1, false, '', '');
	};

	const exportCsv = async () => {
		if (exporting || filtered.length === 0) return;
		setExporting(true);
		// Yield a frame so the loading spinner actually paints before the
		// synchronous blob work blocks the main thread.
		await new Promise((r) => requestAnimationFrame(() => r(null)));
		try {
			const esc = (v: string | number) => {
				const s = String(v ?? '');
				// formula-injection guard: neutralize = + - @ leading chars
				const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
				return `"${safe.replace(/"/g, '""')}"`;
			};
			const headers = 'رقم الطلب,العميل,الهاتف,الحالة,النوع,المجموع,التاريخ';
			const rows = filtered
				.map((o) => {
					const statusLabel = getOrderStatusMeta(o.status).label;
					const typeLabel = getPickupTypeMeta(o.pickupType).label;
					return `${esc(o.orderNo)},${esc(o.customerName)},${esc(o.customerPhone || '')},${esc(statusLabel)},${esc(typeLabel)},${esc(o.total)},${esc(formatDate(new Date(o.createdAt)))}`;
				})
				.join('\n');
			const csv = `${headers}\n${rows}`;
			const stamp = new Date().toISOString().slice(0, 10);
			const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.download = `orders-${stamp}.csv`;
			link.click();
			URL.revokeObjectURL(link.href);
			premiumToast('save', 'تم تصدير الطلبات المعروضة');
		} catch {
			premiumToast('error', 'فشل التصدير');
		} finally {
			setExporting(false);
		}
	};

	if (loading)
		return (
			<div className="space-y-4 animate-fade-in">
				{/* Back button skeleton */}
				<div className="h-8 w-24 rounded-md bg-muted/40 animate-pulse" />
				{/* Title skeleton */}
				<div className="h-8 w-32 rounded-lg bg-muted/50 animate-pulse" />
				{/* Search skeleton */}
				<div className="h-11 rounded-md bg-muted/40 animate-pulse" />
				{/* Chips skeleton */}
				<div className="flex gap-2">
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className="h-9 w-20 rounded-md bg-muted/40 animate-pulse" />
					))}
				</div>
				<OrderCardSkeleton />
			</div>
		);

	if (error && orders.length === 0)
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
				<div className="size-20 rounded-md bg-destructive/10 flex items-center justify-center">
					<AlertCircle className="size-10 text-destructive/60" />
				</div>
				<p className="text-lg font-medium">حدث خطأ</p>
				<p className="text-sm text-muted-foreground">{error}</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => fetchOrders(filter, 1, false)}
					className="gap-1.5"
				>
					إعادة المحاولة
				</Button>
			</div>
		);

	return (
		<div className="space-y-6 animate-fade-in overflow-x-clip">
			<BackButton href="/owner" />

			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold tracking-normal">الطلبات</h2>
					<p className="text-sm text-muted-foreground">
						{toArabicNumber(filtered.length)} طلب
					</p>
				</div>
				<div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
					<LivePollIndicator intervalSeconds={15} isActive={isLive} />
					<button
						type="button"
						onClick={exportCsv}
						disabled={filtered.length === 0 || exporting}
						className="h-9 px-4 rounded-full border border-border/30 bg-card/50 text-sm font-medium hover:bg-accent transition-all disabled:opacity-40 flex items-center gap-2"
					>
						{exporting ? (
							<Loader2 className="size-4 animate-spin motion-reduce:hidden" />
						) : (
							<Download className="size-4" aria-hidden="true" />
						)}
						{exporting ? 'جاري التصدير...' : 'تصدير CSV'}
					</button>
				</div>
			</div>

			{/* Search + Date filter */}
			<div className="flex gap-2 items-start flex-wrap">
				<SearchInput
					value={search}
					onChange={setSearch}
					placeholder="ابحث برقم الطلب أو اسم العميل..."
				/>
				<input
					type="date"
					value={dateFrom}
					onChange={(e) => {
						const v = e.target.value;
						setDateFrom(v);
						fetchOrders(filter, 1, false, v, dateTo);
					}}
					className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
					title="من تاريخ"
					aria-label="من تاريخ"
				/>
				<input
					type="date"
					value={dateTo}
					onChange={(e) => {
						const v = e.target.value;
						setDateTo(v);
						fetchOrders(filter, 1, false, dateFrom, v);
					}}
					className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
					title="إلى تاريخ"
					aria-label="إلى تاريخ"
				/>
				{(dateFrom || dateTo) && (
					<button
						type="button"
						onClick={() => {
							setDateFrom('');
							setDateTo('');
							fetchOrders(filter, 1, false, '', '');
						}}
						className="h-11 px-4 rounded-md border border-border/30 text-sm hover:bg-accent transition-all"
					>
						إلغاء
					</button>
				)}
			</div>

			{/* Status filter chips with counts */}
			<div
				className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x"
				role="group"
				aria-label="تصفية حسب الحالة"
			>
				{filtersWithCounts.map((tab) => (
					<button
						key={tab.value}
						type="button"
						onClick={() => setFilter(tab.value)}
						aria-pressed={filter === tab.value}
						className={cn(
							'snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2',
							filter === tab.value
								? 'bg-gradient-to-r from-orange to-orange/80 text-white shadow-lg shadow-orange/25'
								: 'bg-card/50 border border-border/30 hover:border-orange/30'
						)}
					>
						{tab.label}
						<span
							className={cn(
								'inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold',
								filter === tab.value
									? 'bg-white/20 text-white'
									: 'bg-muted text-muted-foreground'
							)}
						>
							{toArabicNumber(tab.count)}
						</span>
					</button>
				))}
			</div>

			{/* Orders */}
			{loadingMore && (
				<div className="flex items-center justify-center py-4">
					<div className="size-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
				</div>
			)}

			{filtered.length === 0 ? (
				hasActiveFilters ? (
					<EmptyState
						icon={SearchX}
						title="لا طلبات مطابقة للفلتر"
						description="جرب تعديل البحث أو مسح الفلاتر لعرض كل الطلبات."
						action={
							<Button size="sm" onClick={clearAllFilters}>
								مسح الفلاتر
							</Button>
						}
					/>
				) : (
					<EmptyState
						icon={ClipboardList}
						title="لا طلبات اليوم بعد"
						description="عندما يطلب الزبائن عبر المنيو، ستظهر طلباتهم هنا فوراً."
					/>
				)
			) : (
				<div className="space-y-3">
					{filtered.map((order) => (
						<OrderCard
							key={order.id}
							order={order}
							pendingStatus={pendingStatus[order.id]}
							onAdvance={() => {
								const meta = getOrderStatusMeta(order.status);
								if (meta.next) updateStatus(order.id, meta.next);
							}}
							onCancel={() => updateStatus(order.id, 'cancelled')}
							onOpen={() => router.push(`/owner/orders/${order.id}`)}
						/>
					))}
				</div>
			)}

			{hasMore && filtered.length > 0 && !loadingMore && (
				<div className="flex justify-center pt-2">
					<Button variant="outline" onClick={loadMore}>
						تحميل المزيد ↓
					</Button>
				</div>
			)}
		</div>
	);
}

interface OrderCardProps {
	order: Order;
	/** Target status while the transition PUT is in flight (optimistic). */
	pendingStatus?: string;
	onAdvance: () => void;
	onCancel: () => void;
	onOpen: () => void;
}

function OrderCard({
	order,
	pendingStatus,
	onAdvance,
	onCancel,
	onOpen,
}: OrderCardProps) {
	const config = getOrderStatusMeta(order.status);
	const StatusIcon = config.icon;
	const isBusy = pendingStatus !== undefined;
	// While the PUT is in flight show the TARGET status (what the user asked for).
	const targetStatus = pendingStatus ?? config.next;
	const targetMeta =
		targetStatus !== null && targetStatus !== undefined
			? getOrderStatusMeta(targetStatus)
			: null;
	const PickupIcon = getPickupTypeMeta(order.pickupType).icon;
	const createdIso = Number.isNaN(new Date(order.createdAt).getTime())
		? undefined
		: new Date(order.createdAt).toISOString();

	return (
		<div
			role="link"
			tabIndex={0}
			className={cn(
				'rounded-2xl border border-border/30 bg-card/50 p-5 hover:border-orange/30 hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-ring',
				isBusy && 'opacity-80'
			)}
			onClick={onOpen}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onOpen();
				}
			}}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3 min-w-0">
					<div
						className={cn(
							'size-11 rounded-xl flex items-center justify-center shrink-0',
							config.toneClassName
						)}
					>
						<StatusIcon className="size-5" aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<p className="font-bold">{order.orderNo}</p>
							<Badge className={cn('text-xs', config.badgeClassName)}>
								{config.label}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground truncate">
							{order.customerName}
						</p>
						<div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/60">
							<span className="flex items-center gap-1">
								<PickupIcon className="size-3.5" aria-hidden="true" />
								{getPickupTypeMeta(order.pickupType).label}
							</span>
							<span aria-hidden="true">•</span>
							<span>{toArabicNumber(order.items?.length ?? 0)} أصناف</span>
						</div>
					</div>
				</div>

				<div className="text-end shrink-0">
					<p className="font-bold text-lg tabular-nums">
						{toArabicNumber(order.total.toFixed(1))}
					</p>
					<p className="text-xs text-muted-foreground">د.ل</p>
				</div>
			</div>

			<div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/20">
				<time
					dateTime={createdIso}
					className="text-xs text-muted-foreground/70 tabular-nums"
				>
					{formatRelativeTimeAr(order.createdAt)}
				</time>

				{targetMeta && (
					<div className="flex gap-2">
						{order.status === 'new' && (
							<button
								type="button"
								disabled={isBusy}
								onClick={(e) => {
									e.stopPropagation();
									if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟'))
										onCancel();
								}}
								className="px-4 py-2 rounded-xl text-sm font-medium border border-red-200/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-all"
							>
								إلغاء
							</button>
						)}
						<button
							type="button"
							disabled={isBusy}
							aria-busy={isBusy}
							onClick={(e) => {
								e.stopPropagation();
								onAdvance();
							}}
							className={cn(
								'min-w-28 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all border disabled:opacity-60',
								targetStatus === 'preparing'
									? 'border-info/30 text-sky-800 dark:text-sky-300 hover:bg-info/10'
									: 'border-success/25 text-emerald-800 dark:text-emerald-300 hover:bg-success/10'
							)}
						>
							{isBusy && (
								<Loader2 className="size-3.5 animate-spin motion-reduce:hidden" />
							)}
							← {targetMeta.label}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
