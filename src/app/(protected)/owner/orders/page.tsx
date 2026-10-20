'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { premiumToast } from '@/lib/premium-toast';
import { csrfJson } from '@/lib/csrf-client';
import { getErrorMessage } from '@/lib/get-error-message';
import { Download, Lock } from 'lucide-react';
import { toArabicNumber } from '@/lib/format';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
import { getOrderStatusMeta } from '@/lib/order-status';
import { LivePollIndicator } from '@/components/orders/LivePollIndicator';
import { NewOrdersBar } from '@/components/orders/NewOrdersBar';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { OrdersPageSkeleton } from '@/components/shared/DashboardSkeletons';
import { OrdersTable, type Order } from './OrdersTable';
import { OrdersFilters } from './OrdersFilters';
import { useOrdersPolling } from './use-orders-polling';
/* W7-B (G-4): القفل الصادق لميزة الخطة + سقف التصدير من المصدر الواحد. */
import { PlanFeatureLock } from '@/components/shared/PlanFeatureLock';
import { exportCappedToastPhrase } from '@/lib/csv-export';

const PAGE_SIZE = 20;

/* W7-B (G-4 — «تصدير CSV» الاحترافية فأعلى): التجميع في المتصفح (صفحات
   GET /api/orders المتتالية) انتقل إلى مسار خادم مبوّب
   /api/orders/export — نفس المرشّحات + «بحث المالك نفسه» (بارامتر
   search خادمي) + سقف 5000 الصادق نفسه (W6-B6) يُعلَن عبر ترويسة
   X-Export-Truncated. الأعداد هنا من المصدر الواحد lib/csv-export. */

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
        /* W7-B (G-4): حقّ التصدير من قراءة الخادم (api/owner/entitlements —
           مرة واحدة لكل تحميل، خارج مسارات الاقتراع). null = لم تصل
           الحقيقة بعد → الزر يعمل كعادته والخادم يرفض 403 عند الحاجة
           (التعزيز خادمي؛ العلم تفضيل عرض فقط، لا بوابة واجهة). */
        const [csvExportAllowed, setCsvExportAllowed] = useState<boolean | null>(null);
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

        /* W7-B (G-4): حقّ «تصدير CSV» من قراءة الخادم المخصصة — استعلام
           واحد لكل تحميل صفحة (خارج مسارات الاقطاع). فشل القراءة يترك
           العلم null (تفاؤلي: الزر يعمل والخادم يرفض 403 عند الحاجة
           بنسخة العائلة) — التعزيز خادمي، العلم عرض تفضيلي فقط. */
        useEffect(() => {
                if (!activeId) return;
                let cancelled = false;
                fetch(`/api/owner/entitlements?restaurantId=${activeId}`)
                        .then((r) => (r.ok ? r.json() : null))
                        .then((j) => {
                                if (cancelled || !j?.success) return;
                                setCsvExportAllowed(Boolean(j.data?.features?.csvExport));
                        })
                        .catch(() => {
                                /* سقوط آمن — الخادم يبقى الحقيقة عند النقر */
                        });
                return () => {
                        cancelled = true;
                };
        }, [activeId]);

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
                // blob work blocks the main thread.
                await new Promise((r) => requestAnimationFrame(() => r(null)));
                try {
                        /* W7-B (G-4 — «تصدير CSV» الاحترافية فأعلى): مسار الخادم
                           المبوّب نفسه يبني الملف — طلب واحد بدل 50 طلب قائمة
                           متتالية (لا حرق لميزانية محدّد القائمة 60/دقيقة).
                           المرشّحات كما هي (الحالة/التواريخ/المطعم النشط) و
                           «بحث المالك نفسه» صار بارامترًا خادميًا — المصدَّر =
                           المرشَّح على الشاشة (عقد W6-B6). السقف الصادق 5000
                           وحارس حقن المعادلات وأوقات طرابلس (قاعدة R8)
                           يعيشون في المصدر الواحد lib/csv-export. */
                        const params = new URLSearchParams();
                        if (filter) params.set('status', filter);
                        if (dateFrom) params.set('dateFrom', dateFrom);
                        if (dateTo) params.set('dateTo', dateTo);
                        // Multi-menu: always scope to the active restaurant
                        if (activeId) params.set('restaurantId', String(activeId));
                        if (search.trim()) params.set('search', search.trim());
                        const res = await fetch(`/api/orders/export?${params.toString()}`);
                        const json = await res.json().catch(() => null);
                        // round87-C3: اعرض عربية الخادم (بوابة الخطة = نسخة عائلة 403)
                        if (!res.ok || json?.success === false) {
                                throw new Error(json?.error ?? `تعذّر الطلب (${res.status})`);
                        }
                        const truncated = res.headers.get('X-Export-Truncated') === '1';
                        const rows = Number(res.headers.get('X-Export-Rows') ?? '0');
                        const blob = await res.blob();
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
                        link.click();
                        URL.revokeObjectURL(link.href);
                        premiumToast(
                                'save',
                                truncated
                                        ? exportCappedToastPhrase(rows)
                                        : `تم تصدير ${toArabicNumber(rows)} طلب`
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
                                                {csvExportAllowed === false ? (
                                                        /* W7-B (G-4): القفل الصادق — تعطيل + تفسير + رابط
                                                           ترقية (لا زر ميت ولا وظيفة تتظاهر). الحقيقة من
                                                           قراءة الخادم؛ التعزيز 403 في /api/orders/export. */
                                                        <div className="flex items-center gap-2">
                                                                <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        disabled
                                                                        aria-describedby="csv-export-locked"
                                                                        className="gap-1.5"
                                                                >
                                                                        <Lock className="size-4" aria-hidden="true" />{' '}
                                                                        تصدير CSV
                                                                </Button>
                                                        </div>
                                                ) : (
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
                                                )}
                                        </>
                                }
                        />

                        {/* W7-B: تفسير القفل بجانب الرأس — التعطيل وحده ليس تفسيرًا */}
                        {csvExportAllowed === false && (
                                <div id="csv-export-locked" className="-mt-6">
                                        <PlanFeatureLock feature="csvExport" compact />
                                </div>
                        )}

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
