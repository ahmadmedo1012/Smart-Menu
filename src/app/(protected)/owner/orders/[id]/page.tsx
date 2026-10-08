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

        const updateStatus = async (status: string) => {
                if (updating) return;
                setUpdating(true);
                try {
                        const updated = await updateOrderStatus(id, status);
                        setOrder(updated);
                        premiumToast('success', `تم تغيير الحالة إلى ${getOrderStatusMeta(status).label}`);
                } catch (e) {
                        // round89-E6: csrfJson throws the server's Arabic message — surface it
                        premiumToast('error', getErrorMessage(e, 'فشل تحديث الحالة'));
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
                return (
                        <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
                                <div className="h-8 w-32 rounded-xl bg-muted/40 animate-pulse" />
                                <div className="flex items-center gap-3">
                                        <div className="size-9 rounded-xl bg-muted/50 animate-pulse" />
                                        <div className="space-y-2">
                                                <div className="h-5 w-40 rounded bg-muted/50 animate-pulse" />
                                                <div className="h-3 w-24 rounded bg-muted/30 animate-pulse" />
                                        </div>
                                </div>
                                <div className="h-40 rounded-md bg-card/50 border border-border/20 p-6 space-y-3 animate-pulse">
                                        <div className="h-3 w-24 rounded bg-muted/50" />
                                        <div className="flex justify-between">
                                                {[1, 2, 3, 4].map((i) => (
                                                        <div key={i} className="size-10 rounded-xl bg-muted/40 animate-pulse" />
                                                ))}
                                        </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                        <div className="h-44 rounded-md bg-card/50 border border-border/20 p-5 space-y-3 animate-pulse">
                                                <div className="h-3 w-24 rounded bg-muted/50" />
                                                <div className="h-3 w-32 rounded bg-muted/40" />
                                                <div className="h-3 w-28 rounded bg-muted/40" />
                                        </div>
                                        <div className="h-44 rounded-md bg-card/50 border border-border/20 p-5 space-y-3 animate-pulse">
                                                <div className="h-3 w-24 rounded bg-muted/50" />
                                                <div className="h-3 w-32 rounded bg-muted/40" />
                                                <div className="h-3 w-28 rounded bg-muted/40" />
                                        </div>
                                </div>
                        </div>
                );

        if (error)
                return (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
                                <AlertCircle className="size-12 text-destructive/60" />
                                <p className="text-lg font-semibold">خطأ في التحميل</p>
                                <p className="text-sm text-muted-foreground">{error}</p>
                                <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => router.push('/owner/orders')}>
                                                العودة للطلبات
                                        </Button>
                                        <Button variant="outline" onClick={() => window.location.reload()}>
                                                إعادة المحاولة
                                        </Button>
                                </div>
                        </div>
                );

        if (!order)
                return (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
                                <AlertCircle className="size-12 text-destructive/60" />
                                <p className="text-lg font-semibold">الطلب غير موجود</p>
                                <Button variant="outline" onClick={() => router.push('/owner/orders')}>
                                        العودة للطلبات
                                </Button>
                        </div>
                );

        const config = getOrderStatusMeta(order.status);
        const currentIdx = STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);

        return (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                        {/* Back + title */}
                        <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                        <button
                                                onClick={() => router.push('/owner/orders')}
                                                className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                aria-label="العودة إلى الطلبات"
                                        >
                                                {/* r121-J-2: سهم العودة في RTL يشير يميناً (نفس قاعدة print/admin) */}
                                                <MotionChevronRight className="size-4" />
                                        </button>
                                        <div>
                                                <h1 className="text-xl font-bold">طلب <bdi dir="ltr">#{order.orderNo}</bdi></h1>
                                                <p className="text-xs text-muted-foreground">{formatDate(new Date(order.createdAt))}</p>
                                        </div>
                                </div>
                                <Badge className={cn('text-sm px-4 py-1.5 rounded-full', config.badgeClassName)}>
                                        {config.label}
                                </Badge>
                        </div>

                        {/* Status Timeline */}
                        <div className="rounded-md bg-card/50 border border-border/30 p-6">
                                <h2 className="text-sm font-semibold text-muted-foreground mb-4">حالة الطلب</h2>
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
                                                                <Button
                                                                        variant="orange"
                                                                        onClick={() => updateStatus(STATUS_FLOW[currentIdx + 1])}
                                                                        className="flex-1 rounded-md h-11"
                                                                >
                                                                        ← {getOrderStatusMeta(STATUS_FLOW[currentIdx + 1]).label}
                                                                </Button>
                                                        )}
                                                        <Button
                                                                variant="outline"
                                                                onClick={() => {
                                                                        if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) updateStatus('cancelled');
                                                                }}
                                                                className="rounded-xl h-11 border-destructive/30 text-destructive hover:bg-destructive/10"
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
                                <div className="rounded-md bg-card/50 border border-border/30 p-5">
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
                                <div className="rounded-md bg-card/50 border border-border/30 p-5">
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
                                                        <span className="tabular-nums text-primary">
                                                                {formatPrice(order.total)}
                                                        </span>
                                                </div>
                                        </div>
                                </div>
                        </div>

                        {/* Items */}
                        <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
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

                        {/* Quick actions */}
                        <div className="grid grid-cols-2 gap-3">
                                <a
                                        href={`tel:${order.customerPhone}`}
                                        className="flex items-center justify-center gap-2 py-3.5 rounded-md border border-border/30 hover:bg-accent transition-[background-color] font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                        <Phone className="size-4" />
                                        اتصال
                                </a>
                                <button
                                        type="button"
                                        onClick={copyAsWhatsApp}
                                        className="flex items-center justify-center gap-2 py-3.5 rounded-md border border-success/25 text-success hover:bg-success/15 transition-[background-color] font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                        <AnimatedMessageCircle className="size-4" />
                                        نسخ نص الطلب
                                </button>
                        </div>
                </div>
        );
}
