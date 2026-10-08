'use client';

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {CheckCircle} from 'lucide-react';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { MotionArrowRight } from '@/components/ui/motion-icons';
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
        const [copiedOrderNo, setCopiedOrderNo] = useState(false);
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

        // r120 (U5-F-14): نسخ رقم الطلب بضغطة — كان العميل يضطر لتصوير الشاشة
        // أو نسخه يدويًا من النص.
        const handleCopyOrderNo = async () => {
                try {
                        await navigator.clipboard.writeText(displayOrderNo ?? '');
                        setCopiedOrderNo(true);
                        setTimeout(() => setCopiedOrderNo(false), 2000);
                } catch {
                        /* clipboard unavailable (insecure context) — silently skip */
                }
        };

        const handleWhatsApp = () => {
                // r109-F10: prefer the FULL itemized receipt stashed by the checkout
                // (keyed by orderNo) over the bare thank-you note — the restaurant
                // needs the items/totals/address, not just the order number.
                let receipt: string | null = null;
                try {
                        const stashed = sessionStorage.getItem('smartmenu_last_receipt');
                        if (stashed) {
                                const parsed = JSON.parse(stashed) as { orderNo?: string; receipt?: string };
                                if (parsed.orderNo && parsed.orderNo === displayOrderNo && parsed.receipt) {
                                        receipt = parsed.receipt;
                                }
                        }
                } catch {
                        /* private mode / corrupted stash — fall back to the note */
                }
                const text =
                        receipt ??
                        `طلب رقم: ${displayOrderNo ?? '---'}\n\nشكراً لطلبك! سنقوم بتجهيز طلبك في أقرب وقت.`;
                // round97-X3: shared wa.me builder (encodes internally; waNumber is
                // normalized E.164 since r109-F2 — local 0-prefix numbers convert).
                window.open(buildWhatsAppShareUrl(text, waNumber || undefined), '_blank');
        };

        if (isSubscription) {
                return (
                        <>
                                <Header />
                                {/* r121-K-1: this was a SECOND main landmark nested inside
                                        the (protected) group main (two per page); r121-K-3: the skip
                                        link targets this content root — past the Header nav. */}
                                <div
                                        id="main-content"
                                        tabIndex={-1}
                                        className="min-h-screen bg-background flex flex-col focus:outline-none"
                                >
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
                                                                {/* r121-P-4: كان الوعد زمنيًا محددًا بالساعات — لا توجد آلية
                                                                    تُلزم الإدارة به. الوعد الصادق: سريعاً خلال أوقات
                                                                    الدوام (الإشعار يصل الآن عبر لوحة التحكم بعد فرع
                                                                    الموافقة في UserBannerNotifier). */}
                                                                تم استلام طلب الدفع الخاص بك. ستقوم الإدارة بالتحقق من
                                                                الدفع وتفعيل حسابك سريعاً خلال أوقات الدوام. سيتم إشعارك
                                                                عند اكتمال التفعيل.
                                                        </p>
                                                </div>
                                                <div className="flex flex-col gap-3 w-full max-w-xs">
                                                        <Link href="/login">
                                                                <Button className="w-full">تسجيل الدخول</Button>
                                                        </Link>
                                                        <Link href="/">
                                                                <Button variant="outline" className="w-full">
                                                                        {/* r121-J-2: سهم العودة في RTL يشير يميناً */}
                                                                        <MotionArrowRight className="ms-2 size-4" />
                                                                        العودة للرئيسية
                                                                </Button>
                                                        </Link>
                                                </div>
                                        </div>
                                </div>
                        </>
                );
        }

        return (
                <>
                        <Header />
                        <Suspense fallback={null}>
                                <Confetti active={showConfetti} />
                        </Suspense>
                        <div id="main-content" tabIndex={-1} className="min-h-screen bg-background flex flex-col focus:outline-none">
                                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center animate-fade-in">
                                        <div className="size-20 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
                                                <CheckCircle className="size-10 text-success" />
                                        </div>

                                        <div className="space-y-2">
                                                <h1 className="text-2xl font-bold">تم تأكيد الطلب!</h1>
                                                <p className="text-muted-foreground">رقم الطلب</p>
                                                <p className="text-3xl font-bold text-accent-foreground tabular-nums">
                                                        <bdi dir="ltr">{displayOrderNo ?? '---'}</bdi>
                                                </p>
                                                <button
                                                        type="button"
                                                        onClick={handleCopyOrderNo}
                                                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                                                >
                                                        {copiedOrderNo ? 'تم النسخ ✓' : 'نسخ رقم الطلب'}
                                                </button>
                                        </div>

                                        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                                                {/* r120 (U5-F-14): النص القديم وعد بإشعار لا يصل للزوار —
                                                    الوعود الصادقة تبني الثقة. */}
                                                أرسل الطلب عبر واتساب ليبدأ المطعم بالتجهيز، واحتفظ برقم الطلب عند الاستلام.
                                        </p>

                                        <div className="flex flex-col gap-3 w-full max-w-xs">
                                                <Button className="w-full" onClick={handleWhatsApp}>
                                                        <AnimatedMessageCircle className="ms-2 size-4" />
                                                        إرسال عبر واتساب
                                                </Button>
                                                {/* r120 (U5-F-7): العودة إلى منيو المطعم الذي طُلب منه
                                                    (slug يصل عبر الرابط) — ليس إلى أول مطعم في قاعدة البيانات. */}
                                                {/* r121-J-2: سهم العودة في RTL يشير يميناً */}
                                                <Link href={referralRestaurantSlug ? `/menu/${referralRestaurantSlug}` : '/menu'}>
                                                        <Button variant="outline" className="w-full">
                                                                <MotionArrowRight className="ms-2 size-4" />
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
                        </div>
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
