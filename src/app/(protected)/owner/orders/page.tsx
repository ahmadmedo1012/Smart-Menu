'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { BackButton } from '@/components/shared/BackButton';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { premiumToast } from '@/lib/premium-toast';
import { csrfJson } from '@/lib/csrf-client';
import { getErrorMessage } from '@/lib/get-error-message';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { toArabicNumber, formatDate } from '@/lib/format';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
import { getOrderStatusMeta, getPickupTypeMeta } from '@/lib/order-status';
import { LivePollIndicator } from '@/components/orders/LivePollIndicator';
import { OrderCardSkeleton } from '@/components/orders/OrderCardSkeleton';
import { NewOrdersBar } from '@/components/orders/NewOrdersBar';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { OrdersTable, type Order } from './OrdersTable';
import { OrdersFilters } from './OrdersFilters';
import { useOrdersPolling } from './use-orders-polling';

const PAGE_SIZE = 20;

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
                                const json = await res.json().catch(() => null);
                                // round87-C3: surface the server's Arabic error (was: empty throw -> generic toast)
                                if (!res.ok || !json?.success) throw new Error(json?.error ?? `فشل الطلب (${res.status})`);
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
                        } catch (e) {
                                setError(getErrorMessage(e, 'فشل تحميل الطلبات'));
                                premiumToast('error', getErrorMessage(e, 'فشل تحميل الطلبات'));
                        } finally {
                                if (pageNum === 1) setLoading(false);
                                else setLoadingMore(false);
                        }
                },
                [dateFrom, dateTo, activeId, setLoadingMore]
        );

        const loadMore = () => fetchOrders(filter, page + 1, true);

        const { resetProbe } = useOrdersPolling({ filter, activeId, fetchOrders });

        useEffect(() => {
                resetProbe();
                fetchOrders(filter, 1, false);
        }, [filter, fetchOrders, resetProbe]);

        // Auto-refresh — client polling replaces SSE (Vercel kills streams at 300s).
        // Honest UX: the indicator reflects the real cadence and pauses when the tab
        // is hidden to save network + battery.
        // round86-C3: shared visibility-aware poll loop (was a copy-pasted skeleton)
        useEffect(() => {
                setIsLive(true);
                return () => setIsLive(false);
        }, []);

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
                        await csrfJson(`/api/orders/${orderId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus }),
                        });
                        premiumToast(
                                'save',
                                `تم تغيير الحالة إلى ${getOrderStatusMeta(newStatus).label}`
                        );
                } catch (e) {
                        // Rollback to the exact previous state
                        setStatusEverywhere(prevStatus);
                        premiumToast('error', getErrorMessage(e, 'فشل تحديث الحالة — أُعيدت الحالة السابقة'));
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

        const newOrderIds = useMemo(
                () => orders.filter((o) => o.status === 'new').map((o) => o.id),
                [orders]
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

        // Extracted-section callbacks (round89-G2) — same state-write + refetch
        // order the old inline arrows used.
        const handleDateFromChange = (v: string) => {
                setDateFrom(v);
                fetchOrders(filter, 1, false, v, dateTo);
        };
        const handleDateToChange = (v: string) => {
                setDateTo(v);
                fetchOrders(filter, 1, false, dateFrom, v);
        };
        const clearDates = () => {
                setDateFrom('');
                setDateTo('');
                fetchOrders(filter, 1, false, '', '');
        };
        const handleAdvance = (order: Order) => {
                const meta = getOrderStatusMeta(order.status);
                if (meta.next) updateStatus(order.id, meta.next);
        };
        const handleCancel = (order: Order) => updateStatus(order.id, 'cancelled');
        const handleOpen = (order: Order) => router.push(`/owner/orders/${order.id}`);

        if (loading)
                return (
                        <div className="space-y-4 animate-fade-in">
                                <LoadingAnnouncer loading={true} message="جارٍ تحميل الطلبات..." />
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
                        <div
                                className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in"
                                role="alert"
                        >
                                <LoadingAnnouncer loading={false} message="" completedMessage="فشل تحميل الطلبات" />
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
                                        <h1 className="text-2xl font-bold tracking-normal">الطلبات</h1>
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
                                                className="h-9 px-4 rounded-full border border-border/30 bg-card/50 text-sm font-medium hover:bg-accent transition-[background-color] disabled:opacity-40 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
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

                        <OrdersFilters
                                search={search}
                                onSearchChange={setSearch}
                                dateFrom={dateFrom}
                                dateTo={dateTo}
                                onDateFromChange={handleDateFromChange}
                                onDateToChange={handleDateToChange}
                                onClearDates={clearDates}
                                filter={filter}
                                onFilterChange={setFilter}
                                tabs={filtersWithCounts}
                        />

                        <OrdersTable
                                orders={filtered}
                                pendingStatus={pendingStatus}
                                loadingMore={loadingMore}
                                hasMore={hasMore}
                                hasActiveFilters={hasActiveFilters}
                                onAdvance={handleAdvance}
                                onCancel={handleCancel}
                                onOpen={handleOpen}
                                onLoadMore={loadMore}
                                onClearFilters={clearAllFilters}
                        />

                        <NewOrdersBar
                                newOrderIds={newOrderIds}
                                pendingStatus={pendingStatus}
                                onOrdersRefresh={() => fetchOrders(filter, 1, false)}
                                updateStatus={updateStatus}
                        />
                </div>
        );
}
