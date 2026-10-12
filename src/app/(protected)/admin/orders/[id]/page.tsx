'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { premiumToast } from '@/lib/premium-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DetailPageSkeleton } from '@/components/shared/DashboardSkeletons';
import {AlertCircle, Phone, User, FileText, Store} from 'lucide-react';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import AnimatedShoppingCart from '@/components/ui/shopping-cart-icon';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { MotionCheck } from '@/components/ui/motion-icons';
import AnimatedMapPin from '@/components/ui/map-pin-icon';
import AnimatedCopy from '@/components/ui/copy-icon';
import { cn } from '@/lib/utils';
import { toArabicNumber, formatDate, formatPrice } from '@/lib/format';
// r121-A-3/I-1 + O-1: status + pickup metadata now come from the lib SSOT
// (lib/order-status.ts) — this page previously rode the bespoke saffron/teal
// STATUS_CONFIG from useOrderDetail (same status, third palette).
import { getOrderStatusMeta, getPickupTypeMeta } from '@/lib/order-status';
import {
        useOrderDetail,
        updateOrderStatus,
        copyOrderShareText,
        STATUS_FLOW,
} from '@/components/orders/useOrderDetail';
import Link from 'next/link';



export default function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
        const { id } = use(params);
        const router = useRouter();
        // round85-C3: shared logic spine — also upgrades this page from silent
        // fetch errors to the owner-grade error state below
        const { order, setOrder, loading, error } = useOrderDetail(id);
        const [updating, setUpdating] = useState(false);
        const [copied, setCopied] = useState(false);
        // r131-F4b (F5 completion, A1 P1-8): window.confirm → the shared
        // Arabic ConfirmDialog (the owner detail page pattern).
        const [confirmCancel, setConfirmCancel] = useState(false);

        const updateStatus = async (status: string) => {
                if (updating) return;
                setUpdating(true);
                try {
                        const updated = await updateOrderStatus(id, status);
                        setOrder(updated);
                        premiumToast('success', 'تم تغيير الحالة', getOrderStatusMeta(status).label);
                } catch (e) {
                        // round89-E6: csrfJson throws the server's Arabic message — surface it
                        premiumToast('error', getErrorMessage(e, 'تعذّر تحديث الحالة'));
                } finally {
                        setUpdating(false);
                }
        };

        const copyAsWhatsApp = () => {
                if (!order) return;
                copyOrderShareText(order, true).then(() => {
                        setCopied(true);
                        premiumToast('success', 'تم نسخ نص الطلب');
                        setTimeout(() => setCopied(false), 2000);
                });
        };

        if (loading)
                // r131-F4b (F5 completion, A11 SM-2): shape-matched detail skeleton
                // — was hand-rolled animate-breath blocks.
                return <DetailPageSkeleton label="جارٍ تحميل تفاصيل الطلب…" />;

        if (!order)
                return (
                        <ErrorState
                                icon={AlertCircle}
                                title="الطلب غير موجود"
                                description={error ?? 'قد يكون الطلب حُذف أو أن الرابط غير صحيح.'}
                                onRetry={() => router.push('/admin/orders')}
                                retryLabel="العودة للطلبات"
                        />
                );

        const config = getOrderStatusMeta(order.status);
        const isCancelled = order.status === 'cancelled';
        const currentIdx = isCancelled
                ? -1
                : STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);

        return (
                <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                        {/* Back + canonical page header + 11px chip (r131-F4b, F5
                                completion — mirrors the owner detail page) */}
                        <div className="flex items-center gap-3" role="group" aria-label="التنقل">
                                <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => router.push('/admin/orders')}
                                        aria-label="العودة إلى الطلبات"
                                >
                                        <MotionArrowRight className="size-4" />
                                </Button>
                                <Badge className={cn('text-2xs font-semibold tabular-nums', config.badgeClassName)}>
                                        {config.label}
                                </Badge>
                        </div>
                        <PageHeader
                                title={<>طلب <bdi dir="ltr">#{order.orderNo}</bdi></>}
                                subtitle={formatDate(new Date(order.createdAt))}
                        />

                        {/* Restaurant info */}
                        {order.restaurant && (
                                <div className="rounded-md bg-gradient-to-l from-orange-muted/50 to-transparent dark:from-orange-muted border border-orange/20 dark:border-orange/15 p-4 flex items-center gap-3">
                                        <Store className="size-5 text-primary" />
                                        <span className="font-medium">{order.restaurant.name}</span>
                                        <Link
                                                href={`/menu/${order.restaurant.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-accent-foreground hover:text-foreground transition-colors ms-auto"
                                        >
                                                عرض المنيو ←
                                        </Link>
                                </div>
                        )}

                        {/* Status Timeline */}
                        <div className="rounded-xl bg-card/50 border border-border/30 p-6">
                                <h2 className="text-sm font-semibold text-muted-foreground mb-4">حالة الطلب</h2>
                                <div className="flex items-center">
                                        {STATUS_FLOW.map((s, idx) => {
                                                const StepIcon = getOrderStatusMeta(s).icon;
                                                const isActive = idx <= currentIdx;
                                                const isCurrent = idx === currentIdx;
                                                return (
                                                        <div key={s} className="flex-1 flex flex-col items-center">
                                                                <button
                                                                        type="button"
                                                                        onClick={() => isActive && updateStatus(s)}
                                                                        disabled={!isActive || order.status === 'cancelled'}
                                                                        className={cn(
                                                                                'size-11 rounded-xl flex items-center justify-center transition-[background-color,color,border-color,box-shadow,transform,translate,scale,rotate] duration-base border-2',
                                                                                isCurrent
                                                                                        ? 'bg-gradient-to-r from-orange to-orange/80 text-orange-foreground border-orange shadow-lg shadow-orange/25 scale-110'
                                                                                        : isActive
                                                                                                ? 'bg-success/15 text-success-ink border-success/30'
                                                                                                : 'bg-muted/30 text-muted-foreground/30 border-border/20'
                                                                        )}
                                                                >
                                                                        <StepIcon className="size-5" />
                                                                </button>
                                                                <span
                                                                        className={cn(
                                                                                'text-xs mt-2 font-medium',
                                                                                isCurrent
                                                                                        ? 'text-foreground'
                                                                                        : isActive
                                                                                                ? 'text-success-ink'
                                                                                                /* r127-F4: /40 → /60 — وسم حالة الخط الزمني نص مقروء */
                                                                                                : 'text-muted-foreground/60'
                                                                        )}
                                                                >
                                                                        {getOrderStatusMeta(s).label}
                                                                </span>
                                                                {idx < STATUS_FLOW.length - 1 && (
                                                                        <div
                                                                                className={cn(
                                                                                        'h-0.5 w-full -mt-6 me-10',
                                                                                        isActive && idx < currentIdx
                                                                                                ? 'bg-success/50 dark:bg-success/70'
                                                                                                : isActive
                                                                                                        ? 'bg-orange/60 dark:bg-orange'
                                                                                                        : 'bg-border/20'
                                                                                )}
                                                                        />
                                                                )}
                                                        </div>
                                                );
                                        })}
                                </div>
                                <div className="flex gap-2 mt-4">
                                        {order.status !== 'cancelled' && order.status !== 'completed' && (
                                                <>
                                                        {currentIdx < STATUS_FLOW.length - 1 && (
                                                                <Button
                                                                        variant="orange"
                                                                        onClick={() => updateStatus(STATUS_FLOW[currentIdx + 1])}
                                                                        className="flex-1"
                                                                >
                                                                        ← {getOrderStatusMeta(STATUS_FLOW[currentIdx + 1]).label}
                                                                </Button>
                                                        )}
                                                        <Button
                                                                variant="outline"
                                                                onClick={() => setConfirmCancel(true)}
                                                                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                                        >
                                                                إلغاء الطلب
                                                        </Button>
                                                </>
                                        )}
                                </div>
                        </div>

                        {/* Order info grid */}
                        <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl bg-card/50 border border-border/30 p-5">
                                        <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                                                <User className="size-4" /> معلومات العميل
                                        </h2>
                                        <div className="space-y-3">
                                                <div>
                                                        <p className="text-xs text-muted-foreground">الاسم</p>
                                                        <p className="font-medium">{order.customerName}</p>
                                                </div>
                                                <div>
                                                        <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                                                        <a
                                                                href={`tel:${order.customerPhone}`}
                                                                className="font-medium text-accent-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                                                dir="ltr"
                                                        >
                                                                <Phone className="size-3" />
                                                                {order.customerPhone}
                                                        </a>
                                                </div>
                                                <div>
                                                        <p className="text-xs text-muted-foreground">نوع الاستلام</p>
                                                        <p className="font-medium flex items-center gap-1">
                                                                <AnimatedMapPin className="size-3.5 text-muted-foreground" />
                                                                {getPickupTypeMeta(order.pickupType).label}
                                                        </p>
                                                </div>
                                                {order.notes && (
                                                        <div>
                                                                <p className="text-xs text-muted-foreground">ملاحظات</p>
                                                                <p className="text-sm bg-muted/30 rounded-xl p-3 mt-1">{order.notes}</p>
                                                        </div>
                                                )}
                                        </div>
                                </div>

                                <div className="rounded-xl bg-card/50 border border-border/30 p-5">
                                        <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                                                <AnimatedShoppingCart className="size-4" /> ملخص الطلب
                                        </h2>
                                        <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">المجموع الفرعي</span>
                                                        {/* r121-H-1: smart formatPrice default — was decimals:1 («12.0») */}
                                                        <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
                                                </div>
                                                <hr className="border-border/30" />
                                                <div className="flex justify-between font-bold text-lg">
                                                        <span>الإجمالي</span>
                                                        {/* r148 (CROSS R2): text-primary → accent-foreground —
                                                            18px bold تحت عتبة النص الكبير؛ الداكن نفس الذهب
                                                            حرفيًا والفاتح نحاس عميق 10.29:1. */}
                                                        <span className="tabular-nums text-accent-foreground">
                                                                {formatPrice(order.total)}
                                                        </span>
                                                </div>
                                        </div>
                                </div>
                        </div>

                        {/* Items */}
                        <div className="rounded-xl bg-card/50 border border-border/30 overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-border/10">
                                        <h2 className="font-semibold flex items-center gap-2">
                                                <FileText className="size-4 text-muted-foreground" />
                                                الأصناف ({toArabicNumber(order.items.length)})
                                        </h2>
                                        <Button variant="outline" size="sm" onClick={copyAsWhatsApp} className="gap-1">
                                                {copied ? <MotionCheck className="size-3.5 text-success-ink" /> : <AnimatedCopy className="size-3.5" />}
                                                نسخ للواتساب
                                        </Button>
                                </div>
                                <div className="divide-y divide-border/10">
                                        {order.items.map((oi) => (
                                                <div
                                                        key={oi.id}
                                                        className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors"
                                                >
                                                        <div className="flex items-center gap-3">
                                                                <span className="size-7 rounded-lg bg-orange/10 text-accent-foreground text-xs font-bold flex items-center justify-center">
                                                                        {toArabicNumber(oi.quantity)}
                                                                </span>
                                                                <span className="font-medium">{oi.item.nameAr || oi.item.name}</span>
                                                        </div>
                                                        <span className="font-semibold tabular-nums">
                                                                {/* r121-H-1: smart formatPrice default — was decimals:1 */}
                                                                {formatPrice(oi.price * oi.quantity)}
                                                        </span>
                                                </div>
                                        ))}
                                </div>
                        </div>

                        {/* Quick actions — r131-F4b (F5 completion): the py-3.5
                                hand-rolls join the Button family (canonical 40px/h-11,
                                r-md 10px, 600 weight — no page overrides). */}
                        <div className="grid grid-cols-2 gap-3">
                                <Button
                                        variant="outline"
                                        onClick={() => {
                                                window.location.href = `tel:${order.customerPhone}`;
                                        }}
                                >
                                        <Phone className="size-4" aria-hidden="true" />
                                        اتصال بالعميل
                                </Button>
                                <Button variant="outline" onClick={copyAsWhatsApp} className="text-success-ink border-success/25 hover:bg-success/15 hover:text-success-ink">
                                        <AnimatedMessageCircle className="size-4" />
                                        نسخ للواتساب
                                </Button>
                        </div>

                        {/* Destructive confirm (r131-F4b: replaces window.confirm) */}
                        <ConfirmDialog
                                open={confirmCancel}
                                onOpenChange={setConfirmCancel}
                                title="إلغاء الطلب"
                                description="هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
                                confirmLabel="إلغاء الطلب"
                                onConfirm={() => {
                                        setConfirmCancel(false);
                                        updateStatus('cancelled');
                                }}
                        />
                </div>
        );
}
