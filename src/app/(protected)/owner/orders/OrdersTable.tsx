'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TablePagination } from '@/components/shared/TablePagination';
import {
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableHeader,
        TableRow,
} from '@/components/ui/table';
import { ClipboardList, SearchX, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toArabicNumber, formatPrice } from '@/lib/format';
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
        /** True while a page transition fetch is in flight (veils the list). */
        loadingMore: boolean;
        hasActiveFilters: boolean;
        /** Numbered pagination (r131-F5: replaces the "load more" button). */
        page: number;
        totalOrders: number;
        pageSize: number;
        onPageChange: (page: number) => void;
        onAdvance: (order: Order) => void;
        onCancel: (order: Order) => void;
        onOpen: (order: Order) => void;
        onClearFilters: () => void;
}

/* Canonical table anatomy (r131-F5, A1 P1-1/P1-2 — Madarek .table; Phase 6
 * r154 joins the culinary system): 11px/600 Baloo headers (font-heading —
 * the small-caps rhythm) on a surface-2 ground + hairline, 13px cells at
 * 12/16 padding, the terracotta warm wash on row hover (no zebra, no
 * elevation), the 3px accent leading-edge bar on row hover, actions
 * revealed on hover / focus-within (always visible on touch). Mobile keeps
 * the card feed — the tbl-stack equivalent. */
const TH =
        'h-11 bg-muted/60 px-4 text-start align-middle font-heading text-2xs font-semibold whitespace-nowrap text-muted-foreground border-b border-border';
const TD = 'px-4 py-3 align-middle text-sm';
const ROW =
        'group relative border-b border-border/40 transition-colors duration-fast hover:bg-orange/5';

/** Orders list (empty states, canonical md+ table / mobile card feed,
 * numbered pagination) — built on the round89-G2 extraction. */
export function OrdersTable({
        orders,
        pendingStatus,
        loadingMore,
        hasActiveFilters,
        page,
        totalOrders,
        pageSize,
        onPageChange,
        onAdvance,
        onCancel,
        onOpen,
        onClearFilters,
}: OrdersTableProps) {
        const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));

        // r131-F5 (A1 P1-8): destructive confirm rides the shared Arabic
        // ConfirmDialog — window.confirm is retired on this surface.
        const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

        const confirmCancel = () => {
                if (!cancelTarget) return;
                onCancel(cancelTarget);
                setCancelTarget(null);
        };

        return (
                <>
                        {/* Orders */}
                        {loadingMore && (
                                <div className="flex items-center justify-center py-4" role="status" aria-live="polite">
                                        <div className="size-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin motion-reduce:animate-none" />
                                        <span className="sr-only">جارٍ تحميل الصفحة…</span>
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
                                <div className={cn('space-y-3', loadingMore && 'opacity-60 pointer-events-none')}>
                                        {/* md+ — canonical data table */}
                                        <div className="hidden md:block overflow-x-auto rounded-lg border border-border/60 bg-card">
                                                <Table className="w-full">
                                                        <TableHeader>
                                                                <TableRow className="hover:bg-transparent border-border">
                                                                        <TableHead className={TH}>الطلب</TableHead>
                                                                        <TableHead className={TH}>الحالة</TableHead>
                                                                        <TableHead className={TH}>النوع</TableHead>
                                                                        <TableHead className={TH}>الأصناف</TableHead>
                                                                        <TableHead className={TH}>الإجمالي</TableHead>
                                                                        <TableHead className={TH}>الوقت</TableHead>
                                                                        {/* r133 (A11 S10): aria-label names the empty actions header directly. */}
                                                                        <TableHead className={cn(TH, 'text-end w-0')} aria-label="إجراءات" />
                                                                </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                                {orders.map((order) => {
                                                                        const config = getOrderStatusMeta(order.status);
                                                                        const StatusIcon = config.icon;
                                                                        const isBusy = pendingStatus[order.id] !== undefined;
                                                                        const targetStatus = pendingStatus[order.id] ?? config.next;
                                                                        const targetMeta =
                                                                                targetStatus !== null && targetStatus !== undefined
                                                                                        ? getOrderStatusMeta(targetStatus)
                                                                                        : null;
                                                                        const PickupIcon = getPickupTypeMeta(order.pickupType).icon;
                                                                        const createdIso = Number.isNaN(new Date(order.createdAt).getTime())
                                                                                ? undefined
                                                                                : new Date(order.createdAt).toISOString();
                                                                        return (
                                                                                <TableRow
                                                                                        key={order.id}
                                                                                        className={cn(ROW, isBusy && 'opacity-80')}
                                                                                        onClick={() => onOpen(order)}
                                                                                >
                                                                                        {/* first cell — tbl-strong + the 2px hover accent rail
                                                                                           (r131-F4b: aligned to the SO canonical — 2px × 16px,
                                                                                           vertically centered on the leading edge). */}
                                                                                        <TableCell
                                                                                                className={cn(
                                                                                                        TD,
                                                                                                        'relative font-semibold before:pointer-events-none before:absolute before:start-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:origin-center before:scale-y-0 before:rounded-e-sm before:bg-[var(--accent-solid)] before:transition-transform before:duration-slower before:ease-[var(--ease-spring-soft,cubic-bezier(0.16,1,0.3,1))] group-hover:before:scale-y-100 cursor-pointer'
                                                                                                )}
                                                                                        >
                                                                                                <span className="block">
                                                                                                        <bdi dir="ltr">{order.orderNo}</bdi>
                                                                                                </span>
                                                                                                <span className="block text-xs font-normal text-muted-foreground truncate max-w-40">
                                                                                                        {order.customerName || 'دون اسم'}
                                                                                                </span>
                                                                                        </TableCell>
                                                                                        <TableCell className={TD}>
                                                                                                <Badge className={cn('text-2xs font-semibold tabular-nums', config.badgeClassName)}>
                                                                                                        <StatusIcon className="size-3" aria-hidden="true" />
                                                                                                        {config.label}
                                                                                                </Badge>
                                                                                        </TableCell>
                                                                                        <TableCell className={cn(TD, 'text-muted-foreground')}>
                                                                                                <span className="inline-flex items-center gap-1.5">
                                                                                                        <PickupIcon className="size-3.5" aria-hidden="true" />
                                                                                                        {getPickupTypeMeta(order.pickupType).label}
                                                                                                </span>
                                                                                        </TableCell>
                                                                                        <TableCell className={cn(TD, 'text-muted-foreground tabular-nums')}>
                                                                                                {toArabicNumber(order._count?.items ?? 0)}
                                                                                        </TableCell>
                                                                                        <TableCell className={cn(TD, 'font-semibold tabular-nums')}>
                                                                                                {/* Phase 6 (r154): قائد النقاط —
                                                                                                   المجموع على طراز المنيو المطبوع
                                                                                                   (نفس بصمة بطاقة الصنف/سطر السلة). */}
                                                                                                <span className="menu-leader">
                                                                                                        <span>{formatPrice(order.total, { suffix: '' })}</span>
                                                                                                        <i className="menu-leader-rule" aria-hidden="true" />
                                                                                                        <span className="text-2xs font-normal text-muted-foreground">د.ل</span>
                                                                                                </span>
                                                                                        </TableCell>
                                                                                        <TableCell className={cn(TD, 'text-muted-foreground')}>
                                                                                                <time dateTime={createdIso} className="tabular-nums">
                                                                                                        {formatRelativeTimeAr(order.createdAt)}
                                                                                                </time>
                                                                                        </TableCell>
                                                                                        <TableCell className={cn(TD, 'text-end')}>
                                                                                                {/* actions — revealed on hover / focus-within, always on touch */}
                                                                                                <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                                                                                                        {targetMeta && (
                                                                                                                <Button
                                                                                                                        variant="outline"
                                                                                                                        size="sm"
                                                                                                                        disabled={isBusy}
                                                                                                                        aria-busy={isBusy || undefined}
                                                                                                                        onClick={(e) => {
                                                                                                                                e.stopPropagation();
                                                                                                                                onAdvance(order);
                                                                                                                        }}
                                                                                                                >
                                                                                                                        {isBusy ? (
                                                                                                                                <Loader2 className="size-3.5 animate-spin motion-reduce:hidden" aria-hidden="true" />
                                                                                                                        ) : (
                                                                                                                                <ArrowLeft className="size-3.5" aria-hidden="true" />
                                                                                                                        )}
                                                                                                                        {targetMeta.label}
                                                                                                                </Button>
                                                                                                        )}
                                                                                                        {order.status === 'new' && (
                                                                                                                <Button
                                                                                                                        variant="ghost"
                                                                                                                        size="sm"
                                                                                                                        disabled={isBusy}
                                                                                                                        onClick={(e) => {
                                                                                                                                e.stopPropagation();
                                                                                                                                setCancelTarget(order);
                                                                                                                        }}
                                                                                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                                                                >
                                                                                                                        إلغاء
                                                                                                                </Button>
                                                                                                        )}
                                                                                                </div>
                                                                                        </TableCell>
                                                                                </TableRow>
                                                                        );
                                                                })}
                                                        </TableBody>
                                                </Table>
                                                {/* numbered pagination footer (replaces "load more") */}
                                                <TablePagination
                                                        page={page}
                                                        totalPages={totalPages}
                                                        onPageChange={onPageChange}
                                                        meta={
                                                                totalOrders > 0
                                                                        ? `${toArabicNumber(totalOrders)} طلب — الصفحة ${toArabicNumber(page)} من ${toArabicNumber(totalPages)}`
                                                                        : undefined
                                                        }
                                                />
                                        </div>

                                        {/* <md — the card feed (tbl-stack equivalent) */}
                                        <div className="md:hidden space-y-3">
                                                {orders.map((order) => (
                                                        <OrderCard
                                                                key={order.id}
                                                                order={order}
                                                                pendingStatus={pendingStatus[order.id]}
                                                                onAdvance={() => onAdvance(order)}
                                                                onCancel={() => setCancelTarget(order)}
                                                                onOpen={() => onOpen(order)}
                                                        />
                                                ))}
                                                <TablePagination
                                                        page={page}
                                                        totalPages={totalPages}
                                                        onPageChange={onPageChange}
                                                        meta={
                                                                totalOrders > 0
                                                                        ? `${toArabicNumber(totalOrders)} طلب — الصفحة ${toArabicNumber(page)} من ${toArabicNumber(totalPages)}`
                                                                        : undefined
                                                        }
                                                />
                                        </div>
                                </div>
                        )}

                        {/* Destructive confirm (r131-F5: replaces window.confirm) */}
                        <ConfirmDialog
                                open={cancelTarget !== null}
                                onOpenChange={(o) => !o && setCancelTarget(null)}
                                title="إلغاء الطلب"
                                description={
                                        cancelTarget
                                                ? `سيتم إلغاء الطلب «${cancelTarget.orderNo}» نهائياً وإشعار العميل بأن الطلب لن يُحضّر.`
                                                : ''
                                }
                                confirmLabel="إلغاء الطلب"
                                onConfirm={confirmCancel}
                                destructive
                        />
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
                                'rounded-lg border border-border/30 bg-card/50 p-5 hover:border-orange/30 hover:shadow-md transition-[border-color,box-shadow] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                                                        'size-11 rounded-full flex items-center justify-center shrink-0',
                                                        config.toneClassName
                                                )}
                                        >
                                                <StatusIcon className="size-5" aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                        {/* round94 (D §5): bdi بنمط صفحة التفاصيل — عزل اتجاه رقم الطلب اللاتيني داخل RTL */}
                                                        <p className="font-bold"><bdi dir="ltr">{order.orderNo}</bdi></p>
                                                        <Badge className={cn('text-2xs font-semibold tabular-nums', config.badgeClassName)}>
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

                                {/* Phase 6 (r154): قائد النقاط — الإجمالي على
                                        * طراز المنيو المطبوع في بطاقة الجوال
                                        * (round97-X3 formatPrice suffix '' — the د.ل
                                        * joins the leader line; r121-H-1 smart default). */}
                                <div className="text-end shrink-0 min-w-24 menu-leader">
                                        <span className="text-2xs font-normal text-muted-foreground">د.ل</span>
                                        <i className="menu-leader-rule flex-none w-4" aria-hidden="true" />
                                        <span className="font-bold text-lg tabular-nums">
                                                {formatPrice(order.total, { suffix: '' })}
                                        </span>
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
                                                        <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={isBusy}
                                                                onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onCancel();
                                                                }}
                                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                                إلغاء
                                                        </Button>
                                                )}
                                                <Button
                                                        variant={targetStatus === 'preparing' ? 'outline' : 'orange'}
                                                        size="sm"
                                                        disabled={isBusy}
                                                        aria-busy={isBusy || undefined}
                                                        onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAdvance();
                                                        }}
                                                >
                                                        {isBusy && (
                                                                <Loader2 className="size-3.5 animate-spin motion-reduce:hidden" aria-hidden="true" />
                                                        )}
                                                        ← {targetMeta.label}
                                                </Button>
                                        </div>
                                )}
                        </div>
                </div>
        );
}
