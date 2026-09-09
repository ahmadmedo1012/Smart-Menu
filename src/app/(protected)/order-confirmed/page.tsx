'use client';

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {CheckCircle} from 'lucide-react';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { MotionArrowLeft } from '@/components/ui/motion-icons';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useCart } from '@/store/cart';
import { ShareAfterOrder } from '@/components/loyalty/ShareAfterOrder';
import { buildWhatsAppShareUrl } from '@/lib/whatsapp';

const Confetti = dynamic(
        () => import('@/components/shared/Confetti').then((m) => ({ default: m.Confetti })),
        { ssr: false }
);

function OrderContent() {
        const searchParams = useSearchParams();
        const orderNo = searchParams.get('orderNo') ?? '';
        const waNumber = searchParams.get('wa') ?? '';
        const type = searchParams.get('type') ?? 'order';
        // r95-F1: سياق المطعم يصل عبر الرابط (السلة تُفرّغ قبل فتح حوار الإحالة)
        const ridParam = Number(searchParams.get('rid'));
        const referralRestaurantId = Number.isFinite(ridParam) && ridParam > 0 ? ridParam : undefined;
        const referralRestaurantSlug = searchParams.get('slug') || undefined;
        const displayOrderNo = orderNo && orderNo !== 'undefined' && orderNo !== 'null' ? orderNo : null;
        const clearCart = useCart((s) => s.clearCart);
        const [cleared, setCleared] = useState(false);
        const [showShare, setShowShare] = useState(false);
        const [showConfetti, setShowConfetti] = useState(false);
        const isSubscription = type === 'subscription';

        useEffect(() => {
                if (!cleared && !isSubscription) {
                        clearCart();
                        setCleared(true);
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 5000);
                }
                if (isSubscription) setCleared(true);
        }, [clearCart, cleared, isSubscription]);

        useEffect(() => {
                if (cleared && orderNo && !isSubscription) {
                        const timer = setTimeout(() => setShowShare(true), 1200);
                        return () => clearTimeout(timer);
                }
        }, [cleared, orderNo, isSubscription]);

        const handleWhatsApp = () => {
                // round97-X3: shared wa.me builder (encodes internally; waNumber is
                // passed verbatim — identical URLs to the inline templates).
                const text = `طلب رقم: ${displayOrderNo ?? '---'}\n\nشكراً لطلبك! سنقوم بتجهيز طلبك في أقرب وقت.`;
                window.open(buildWhatsAppShareUrl(text, waNumber || undefined), '_blank');
        };

        if (isSubscription) {
                return (
                        <>
                                <Header />
                                <main className="min-h-screen bg-background flex flex-col">
                                        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center animate-fade-in">
                                                <div className="size-20 rounded-full bg-orange-muted flex items-center justify-center animate-scale-in">
                                                        <CheckCircle className="size-10 text-orange" />
                                                </div>
                                                <div className="space-y-2">
                                                        <h1 className="text-2xl font-bold">تم إرسال طلب الاشتراك!</h1>
                                                        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                                                                شكراً لاشتراكك في <strong>الربط الذكي</strong>.
                                                                <br />
                                                                <br />
                                                                تم استلام طلب الدفع الخاص بك. ستقوم الإدارة بالتحقق من الدفع وتفعيل حسابك خلال 24
                                                                ساعة. سيتم إشعارك عند اكتمال التفعيل.
                                                        </p>
                                                </div>
                                                <div className="flex flex-col gap-3 w-full max-w-xs">
                                                        <Link href="/login">
                                                                <Button className="w-full">تسجيل الدخول</Button>
                                                        </Link>
                                                        <Link href="/">
                                                                <Button variant="outline" className="w-full">
                                                                        <MotionArrowLeft className="ms-2 size-4" />
                                                                        العودة للرئيسية
                                                                </Button>
                                                        </Link>
                                                </div>
                                        </div>
                                </main>
                        </>
                );
        }

        return (
                <>
                        <Header />
                        <Suspense fallback={null}>
                                <Confetti active={showConfetti} />
                        </Suspense>
                        <main className="min-h-screen bg-background flex flex-col">
                                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center animate-fade-in">
                                        <div className="size-20 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
                                                <CheckCircle className="size-10 text-success" />
                                        </div>

                                        <div className="space-y-2">
                                                <h1 className="text-2xl font-bold">تم تأكيد الطلب!</h1>
                                                <p className="text-muted-foreground">رقم الطلب</p>
                                                <p className="text-3xl font-bold text-orange tabular-nums">
                                                        <bdi dir="ltr">{displayOrderNo ?? '---'}</bdi>
                                                </p>
                                        </div>

                                        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                                                سيتم تجهيز طلبك وإرسال إشعار عند الاستلام.
                                        </p>

                                        <div className="flex flex-col gap-3 w-full max-w-xs">
                                                <Button className="w-full" onClick={handleWhatsApp}>
                                                        <AnimatedMessageCircle className="ms-2 size-4" />
                                                        إرسال عبر واتساب
                                                </Button>
                                                <Link href="/menu">
                                                        <Button variant="outline" className="w-full">
                                                                <MotionArrowLeft className="ms-2 size-4" />
                                                                العودة إلى القائمة
                                                        </Button>
                                                </Link>
                                        </div>
                                </div>

                                <ShareAfterOrder
                                        orderNo={displayOrderNo ?? '---'}
                                        open={showShare}
                                        onOpenChange={setShowShare}
                                        restaurantId={referralRestaurantId}
                                        restaurantSlug={referralRestaurantSlug}
                                />
                        </main>
                </>
        );
}

export default function OrderConfirmedPage() {
        return (
                <Suspense
                        fallback={
                                <div className="flex items-center justify-center min-h-screen bg-background">
                                        <div className="size-8 rounded-full border-2 border-border border-t-orange animate-spin" />
                                </div>
                        }
                >
                        <OrderContent />
                </Suspense>
        );
}
