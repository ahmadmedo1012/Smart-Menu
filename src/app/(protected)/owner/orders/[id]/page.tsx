'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { premiumToast } from '@/lib/premium-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import {AlertCircle, Phone, User, FileText} from 'lucide-react';
import { MotionChevronRight } from '@/components/ui/motion-icons';
import AnimatedShoppingCart from '@/components/ui/shopping-cart-icon';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { MotionCheck } from '@/components/ui/motion-icons';
import AnimatedMapPin from '@/components/ui/map-pin-icon';
import AnimatedCopy from '@/components/ui/copy-icon';
import { cn } from '@/lib/utils';
import { formatPrice, toArabicNumber, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DetailPageSkeleton } from '@/components/shared/DashboardSkeletons';
// r121-A-3/I-1 + O-1: status + pickup metadata now come from the lib SSOT
// (lib/order-status.ts) — this page previously rode the bespoke saffron/teal
// STATUS_CONFIG from useOrderDetail while the owner LIST already spoke the
// lib tokens (same status, two palettes inside the owner surface itself).
import { getOrderStatusMeta, getPickupTypeMeta } from '@/lib/order-status';
import {
        useOrderDetail,
        updateOrderStatus,
        copyOrderShareText,
        STATUS_FLOW,
} from '@/components/orders/useOrderDetail';



export default function OwnerOrderDetail({ params }: { params: Promise<{ id: string }> }) {
        const { id } = use(params);
        const router = useRouter();
        // round85-C3: shared logic spine (fetch/status/copy) — was duplicated in admin
        const { order, setOrder, loading, error } = useOrderDetail(id);
        const [copied, setCopied] = useState(false);
        const [updating, setUpdating] = useState(false);
        // r131-F5 (A1 P1-8): window.confirm → the shared Arabic ConfirmDialog.
        const [confirmCancel, setConfirmCancel] = useState(false);

        const updateStatus = async (status: string) => {
                if (updating) return;
                setUpdating(true);
                try {
                        const updated = await updateOrderStatus(id, status);
                        setOrder(updated);
                        premiumToast('success', `تم تغيير الحالة إلى ${getOrderStatusMeta(status).label}`);
                } catch (e) {
                        // round89-E6: csrfJson throws the server's Arabic message — surface it
                        premiumToast('error', getErrorMessage(e, 'تعذّر تحديث الحالة'));
                } finally {
                        setUpdating(false);
                }
        };

        const copyAsWhatsApp = () => {
                if (!order) return;
                copyOrderShareText(order, false).then(() => {
                        setCopied(true);
                        premiumToast('copy', 'تم نسخ نص الطلب');
                        setTimeout(() => setCopied(false), 2000);
                });
        };

        if (loading)
                // r131-F5 (A11 SM-2): shape-matched detail skeleton (header + status
                // card + info grid + items) — was hand-rolled animate-pulse blocks.
                return <DetailPageSkeleton label="جارٍ تحميل تفاصيل الطلب…" />;

        if (error)
                return (
                        <ErrorState
                                title="تعذّر تحميل الطلب"
                                error={error}
                                onRetry={() => window.location.reload()}
                                actions={
                                        <Button variant="outline" size="sm" onClick={() => router.push('/owner/orders')}>
                                                العودة للطلبات
                                        </Button>
                                }
                        />
                );

        if (!order)
                return (
                        <ErrorState
                                icon={AlertCircle}
                                title="الطلب غير موجود"
                                description="قد يكون الطلب حُذف أو أن الرابط غير صحيح."
                                onRetry={() => router.push('/owner/orders')}
                                retryLabel="العودة للطلبات"
                        />
                );

        const config = getOrderStatusMeta(order.status);
        const currentIdx = STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);

        return (
                <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                        {/* Back + canonical page header (r131-F5, A1 P0-8: 22px fixed
                                title joins the clamp rung; badge joins the 11px/600 chip size) */}
                        <div
                                className="flex items-center gap-3"
                                role="group"
                                aria-label="التنقل"
                        >
                                <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => router.push('/owner/orders')}
                                        aria-label="العودة إلى الطلبات"
                                >
                                        {/* r121-J-2: سهم العودة في RTL يشير يميناً (نفس قاعدة print/admin) */}
                                        <MotionChevronRight className="size-4" />
                                </Button>
                                <Badge className={cn('text-2xs font-semibold tabular-nums', config.badgeClassName)}>
                                        <config.icon className="size-3" aria-hidden="true" />
                                        {config.label}
                                </Badge>
                        </div>
                        <PageHeader
                                title={<>طلب <bdi dir="ltr">#{order.orderNo}</bdi></>}
                                subtitle={formatDate(new Date(order.createdAt))}
                        />

                        {/* Status Timeline */}
                        <div className="rounded-xl bg-card/50 border border-border/30 p-6">
                                <h2 className="text-base font-bold text-foreground mb-4">حالة الطلب</h2>
                                <div className="flex items-center">
                                        {STATUS_FLOW.map((s, idx) => {
                                                const StatusIcon = getOrderStatusMeta(s).icon;
                                                const isActive = idx <= currentIdx;
                                                const isCurrent = idx === currentIdx;
                                                return (
                                                        <div key={s} className="flex-1 flex flex-col items-center">
                                                                <button
                                                                        type="button"
                                                                        onClick={() => isActive && updateStatus(s)}
                                                                        disabled={!isActive || order.status === 'cancelled'}
                                                                        className={cn(
                                                                                'size-10 rounded-xl flex items-center justify-center transition-[background-color,border-color,transform,translate,scale,rotate] duration-base border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                                isCurrent
                                                                                        ? 'bg-gradient-to-r from-orange to-orange/80 text-orange-foreground border-orange shadow-lg shadow-orange/25 scale-110'
                                                                                        : isActive
                                                                                                ? 'bg-success/15 text-success border-success/30'
                                                                                                : 'bg-muted/30 text-muted-foreground/30 border-border/20'
                                                                        )}
                                                                >
                                                                        {isActive && idx < currentIdx ? (
                                                                                <MotionCheck className="size-5" />
                                                                        ) : (
                                                                                <StatusIcon className="size-5" />
                                                                        )}
                                                                </button>
                                                                <span
                                                                        className={cn(
                                                                                'text-xs mt-2 font-medium',
                                                                                isCurrent
                                                                                        ? 'text-foreground'
                                                                                        : isActive
                                                                                                ? 'text-success'
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
                                                                /* r131-F5 (A1 P0-4): canonical Button (default 40px/
                                                                        r-md/600) — the ad-hoc h-11 rounded-md override is gone. */
                                                                <Button
                                                                        variant="orange"
                                                                        onClick={() => updateStatus(STATUS_FLOW[currentIdx + 1])}
                                                                        className="flex-1"
                                                                        disabled={updating}
                                                                >
                                                                        ← {getOrderStatusMeta(STATUS_FLOW[currentIdx + 1]).label}
                                                                </Button>
                                                        )}
                                                        <Button
                                                                variant="outline"
                                                                onClick={() => setConfirmCancel(true)}
                                                                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                                إلغاء الطلب
                                                        </Button>
                                                </>
                                        )}
                                </div>
                        </div>

                        {/* Order info grid */}
                        <div className="grid gap-4 md:grid-cols-2">
                                {/* Customer info */}
                                <div className="rounded-xl bg-card/50 border border-border/30 p-5">
                                        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                                                <User className="size-4 text-accent-foreground" /> معلومات العميل
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
                                                                className="font-medium text-primary hover:text-accent-foreground transition-colors flex items-center gap-1"
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

                                {/* Order summary */}
                                <div className="rounded-xl bg-card/50 border border-border/30 p-5">
                                        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                                                <AnimatedShoppingCart className="size-4 text-accent-foreground" /> ملخص الطلب
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
                                                        <span className="tabular-nums text-primary">
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
                                                {copied ? <MotionCheck className="size-3.5 text-success" /> : <AnimatedCopy className="size-3.5" />}
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
                                                                <span className="size-7 rounded-lg bg-orange-muted text-accent-foreground/80 dark:text-accent-foreground text-xs font-bold flex items-center justify-center">
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

                        {/* Quick actions — r131-F5 (A1 P0-4): canonical Button
                                size lg (48px) replaces the py-3.5 hand-rolls */}
                        <div className="grid grid-cols-2 gap-3">
                                <Button
                                        variant="outline"
                                        size="lg"
                                        render={<a href={`tel:${order.customerPhone}`} />}
                                >
                                        <Phone className="size-4" />
                                        اتصال
                                </Button>
                                <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={copyAsWhatsApp}
                                        className="text-success border-success/25 hover:bg-success/10 hover:text-success"
                                >
                                        <AnimatedMessageCircle className="size-4" />
                                        نسخ نص الطلب
                                </Button>
                        </div>

                        {/* Destructive confirm (r131-F5: replaces window.confirm) */}
                        <ConfirmDialog
                                open={confirmCancel}
                                onOpenChange={setConfirmCancel}
                                title="إلغاء الطلب"
                                description={`سيتم إلغاء الطلب «${order.orderNo}» نهائياً ولن يظهر في قائمة الطلبات النشطة.`}
                                confirmLabel="إلغاء الطلب"
                                onConfirm={() => updateStatus('cancelled')}
                                destructive
                        />
                </div>
        );
}
