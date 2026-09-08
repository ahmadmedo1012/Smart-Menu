'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardList, SearchX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import {
        getOrderStatusMeta,
        getPickupTypeMeta,
        formatRelativeTimeAr,
} from '@/lib/order-status';

export interface Order {
        id: number;
        orderNo: string;
        customerName: string;
        customerPhone?: string;
        status: string;
        total: number;
        pickupType: string;
        createdAt: string;
        _count: { items: number };
}

interface OrdersTableProps {
        /** Filtered orders to render. */
        orders: Order[];
        pendingStatus: Record<number, string>;
        loadingMore: boolean;
        hasMore: boolean;
        hasActiveFilters: boolean;
        onAdvance: (order: Order) => void;
        onCancel: (order: Order) => void;
        onOpen: (order: Order) => void;
        onLoadMore: () => void;
        onClearFilters: () => void;
}

/** Orders list (empty states, cards, load-more) — verbatim extraction from
 * the owner orders page (round89-G2); OrderCard moved with it unchanged. */
export function OrdersTable({
        orders,
        pendingStatus,
        loadingMore,
        hasMore,
        hasActiveFilters,
        onAdvance,
        onCancel,
        onOpen,
        onLoadMore,
        onClearFilters,
}: OrdersTableProps) {
        return (
                <>
                {/* Orders */}
                {loadingMore && (
                        <div className="flex items-center justify-center py-4">
                                <div className="size-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                        </div>
                )}

                {orders.length === 0 ? (
                        hasActiveFilters ? (
                                <EmptyState
                                        icon={SearchX}
                                        title="لا طلبات مطابقة للفلتر"
                                        description="جرب تعديل البحث أو مسح الفلاتر لعرض كل الطلبات."
                                        action={
                                                <Button size="sm" onClick={onClearFilters}>
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
                                {orders.map((order) => (
                                        <OrderCard
                                                key={order.id}
                                                order={order}
                                                pendingStatus={pendingStatus[order.id]}
                                                onAdvance={() => onAdvance(order)}
                                                onCancel={() => onCancel(order)}
                                                onOpen={() => onOpen(order)}
                                        />
                                ))}
                        </div>
                )}

                {hasMore && orders.length > 0 && !loadingMore && (
                        <div className="flex justify-center pt-2">
                                <Button variant="outline" onClick={onLoadMore}>
                                        تحميل المزيد ↓
                                </Button>
                        </div>
                )}
                </>
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
                                'rounded-2xl border border-border/30 bg-card/50 p-5 hover:border-orange/30 hover:shadow-md transition-[border-color,box-shadow] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                                                        {/* round94 (D §5): bdi بنمط صفحة التفاصيل — عزل اتجاه رقم الطلب اللاتيني داخل RTL */}
                                                        <p className="font-bold"><bdi dir="ltr">{order.orderNo}</bdi></p>
                                                        <Badge className={cn('text-xs', config.badgeClassName)}>
                                                                <StatusIcon className="size-3" aria-hidden="true" />
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
                                                        <span>{toArabicNumber(order._count?.items ?? 0)} أصناف</span>
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
                                        className="text-xs text-muted-foreground tabular-nums"
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
                                                                className="px-4 py-2 rounded-xl text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60"
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
                                                                'min-w-28 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-[background-color] border disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                targetStatus === 'preparing'
                                                                        ? 'border-info/30 text-info hover:bg-info/10'
                                                                        : 'border-success/25 text-success hover:bg-success/10'
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
