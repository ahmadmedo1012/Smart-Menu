'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { premiumToast } from '@/lib/premium-toast';
import { csrfJson } from '@/lib/csrf-client';
import { getErrorMessage } from '@/lib/get-error-message';
import { Download } from 'lucide-react';
import { toArabicNumber, formatDate } from '@/lib/format';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
import { getOrderStatusMeta, getPickupTypeMeta } from '@/lib/order-status';
import { LivePollIndicator } from '@/components/orders/LivePollIndicator';
import { NewOrdersBar } from '@/components/orders/NewOrdersBar';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { OrdersPageSkeleton } from '@/components/shared/DashboardSkeletons';
import { OrdersTable, type Order } from './OrdersTable';
import { OrdersFilters } from './OrdersFilters';
import { useOrdersPolling } from './use-orders-polling';

const PAGE_SIZE = 20;

/* W6-B6 (تدقيق W6-A3 — إصلاح صغير 5): نطاق تصدير الطلبات. سقف الصفحة
   للاستعلام 100 (parsePagination)؛ 5000 صف = 50 طلبًا متتاليًا — حد
   صادق لذاكرة المتصفح وحجم الملف، وتحت محدّد قائمة الطلبات (60/دقيقة).
   التجاوز يُعلَن في التوست بصراحة لا يُقص بصمت. */
const EXPORT_PAGE_SIZE = 100;
const EXPORT_ROW_CAP = 5000;

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
        /* r133 (A3 N1): collapsed the r119 dead intermediate
           (const constLoadingMore + void + destructure) to one line. */
        const [loadingMore, setLoadingMore] = useState(false);
        const [filter, setFilter] = useState('');
        const [search, setSearch] = useState('');
        const [page, setPage] = useState(1);
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
                                        // r97: تحميل كامل عمدًا — انتهاء الجلسة يجب أن يمحو كل
                                        // حالة العميل (المتجر/السلة) لا مجرد تغيير المسار.
                                        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                                        window.location.href = '/login';
                                        return;
                                }
                                const json = await res.json().catch(() => null);
                                // round87-C3: surface the server's Arabic error (was: empty throw -> generic toast)
                                if (!res.ok || !json?.success) throw new Error(json?.error ?? `تعذّر الطلب (${res.status})`);
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
                                setPage(pageNum);
                        } catch (e) {
                                setError(getErrorMessage(e, 'تعذّر تحميل الطلبات'));
                                premiumToast('error', getErrorMessage(e, 'تعذّر تحميل الطلبات'));
                        } finally {
                                if (pageNum === 1) setLoading(false);
                                else setLoadingMore(false);
                        }
                },
                [dateFrom, dateTo, activeId]
        );

        // r131-F5 (A1 P1-1): numbered pagination replaces the append/load-more
        // pattern — page changes refetch that window server-side.
        const handlePageChange = useCallback(
                (p: number) => fetchOrders(filter, p, false),
                [filter, fetchOrders]
        );

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
                        premiumToast('error', getErrorMessage(e, 'تعذّر تحديث الحالة — أُعيدت الحالة السابقة'));
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
                if (exporting) return;
                setExporting(true);
                // Yield a frame so the loading spinner actually paints before the
                // synchronous blob work blocks the main thread.
                await new Promise((r) => requestAnimationFrame(() => r(null)));
                try {
                        /* W6-B6 (إصلاح صغير 5): التصدير كان يأخذ صفوف الصفحة المعروضة
                           فقط («تم تصدير الطلبات المعروضة»). الآن يجلب كل الصفحات بنفس
                           مرشّحات الخادم (الحالة/التواريخ/المطعم النشط) ثم يطبّق مربع
                           البحث نفسه الذي يرى المالك — المصدَّر = المرشَّح على الشاشة،
                           بلا سقف صفحة. مسار الخادم كما هو (لا endpoint جديد — نفس عقد
                           القائمة بترقيم). */
                        const params = new URLSearchParams();
                        if (filter) params.set('status', filter);
                        if (dateFrom) params.set('dateFrom', dateFrom);
                        if (dateTo) params.set('dateTo', dateTo);
                        // Multi-menu: always scope to the active restaurant
                        if (activeId) params.set('restaurantId', String(activeId));
                        params.set('pageSize', String(EXPORT_PAGE_SIZE));
                        const all: Order[] = [];
                        let total = Number.POSITIVE_INFINITY;
                        for (
                                let page = 1;
                                all.length < EXPORT_ROW_CAP && (page === 1 || all.length < total);
                                page++
                        ) {
                                params.set('page', String(page));
                                const res = await fetch(`/api/orders?${params.toString()}`);
                                const json = await res.json().catch(() => null);
                                // round87-C3: اعرض عربية الخادم (كانت رمية فارغة → توست عام)
                                if (!res.ok || !json?.success) {
                                        throw new Error(json?.error ?? `تعذّر الطلب (${res.status})`);
                                }
                                const rows: Order[] = Array.isArray(json.data) ? json.data : [];
                                total = json?.meta?.total ?? rows.length;
                                all.push(...rows);
                                if (rows.length < EXPORT_PAGE_SIZE || all.length >= total) break;
                        }
                        const capped = all.length < total;
                        const exportRows = all.filter(
                                (o) => !search || o.orderNo.includes(search) || o.customerName.includes(search)
                        );
                        if (exportRows.length === 0) {
                                premiumToast('error', 'لا توجد طلبات مطابقة للتصدير');
                                return;
                        }
                        const esc = (v: string | number) => {
                                const s = String(v ?? '');
                                // formula-injection guard: neutralize = + - @ leading chars
                                const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
                                return `"${safe.replace(/"/g, '""')}"`;
                        };
                        const headers = 'رقم الطلب,العميل,الهاتف,الحالة,النوع,المجموع,التاريخ';
                        const rows = exportRows
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
                        premiumToast(
                                'save',
                                capped
                                        ? `تم تصدير أول ${toArabicNumber(all.length)} طلب (سقف التصدير — نطاقك يتجاوزه)`
                                        : `تم تصدير ${toArabicNumber(exportRows.length)} طلب`
                        );
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر التصدير'));
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
                // r131-F5 (A1 P1-6): the shape-matched orders skeleton (header +
                // search/chips + order rows) — the old animate-pulse blocks were
                // a competing loading language.
                return <OrdersPageSkeleton />;

        if (error && orders.length === 0)
                // r131-F5 (A1 P1-12): canonical error family (surface + dot + retry).
                return (
                        <ErrorState
                                title="تعذّر تحميل الطلبات"
                                error={error}
                                onRetry={() => fetchOrders(filter, 1, false)}
                        />
                );

        return (
                /* r131-F5 (A1 P0-8/P1-7): canonical 1280px content column + 40px
                        section rhythm. */
                <div className="mx-auto max-w-[1280px] space-y-8 animate-fade-in overflow-x-clip">
                        <PageHeader
                                title="الطلبات"
                                subtitle={`${toArabicNumber(totalOrders)} طلب — تابع الطلبات الواردة وحرّك حالتها من الاستلام حتى التسليم`}
                                actions={
                                        <>
                                                <LivePollIndicator intervalSeconds={15} isActive={isLive} />
                                                <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={exportCsv}
                                                        disabled={totalOrders === 0 || exporting}
                                                        loading={exporting}
                                                >
                                                    {!exporting && <Download className="size-4" aria-hidden="true" />}
                                                        {exporting ? 'جارٍ التصدير…' : 'تصدير CSV'}
                                                </Button>
                                        </>
                                }
                        />

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
                                hasActiveFilters={hasActiveFilters}
                                page={page}
                                totalOrders={totalOrders}
                                pageSize={PAGE_SIZE}
                                onPageChange={handlePageChange}
                                onAdvance={handleAdvance}
                                onCancel={handleCancel}
                                onOpen={handleOpen}
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
