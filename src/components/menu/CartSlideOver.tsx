'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { MotionMinus } from '@/components/ui/motion-icons';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import { MotionPlus } from '@/components/ui/motion-icons';
import AnimatedTrash from '@/components/ui/trash-icon';
import AnimatedCart from '@/components/ui/shopping-cart-icon';
import { m } from 'motion/react';
import { useCart } from '@/store/cart';
import { formatPrice, toArabicNumber } from '@/lib/format';
/* r137: رسوم التوصيل في الورقة الجانبية — تُجلب عند اختيار التوصيل فقط
   (نفس المصدر العام GET /api/restaurants/[id] الذي تقرؤه صفحة السلة —
   لا نسخة في متجر السلة كي لا تتقادم). */
import { deliveryFeeFor, type DeliveryMeta } from '@/lib/delivery-meta';
import { getArabicPlural } from '@/lib/arabic-plural';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { cn } from '@/lib/utils';
import { MAX_ITEM_QUANTITY } from '@/lib/constants';

// round92-A9 (live audit A9): the cart trigger's aria-label read
// «السلة - 1 أصناف» — a singular count followed by a plural noun: broken
// Arabic for screen readers. Both the trigger aria-label and the sheet
// header count now go through the project's arabic-plural rules
// (0 فارغة / 1 صنف واحد / 2 صنفان / 3-10 «N أصناف» / 11+ «N صنفًا»).
export function cartCountPhrase(count: number): string {
        const noun = getArabicPlural(count, 'صنف', {
                zero: 'فارغة',
                one: 'صنف واحد',
                two: 'صنفان',
                few: 'أصناف',
                many: 'صنفًا',
        });
        // 0/1/2 read naturally without a numeral («صنف واحد»/«صنفان» carry the
        // count grammatically); 3+ pair the numeral with the counted noun.
        return count < 3 ? noun : `${toArabicNumber(count)} ${noun}`;
}

export function CartSlideOver() {
        const items = useCart((s) => s.items);
        const totalItems = useCart((s) => s.totalItems());
        const subtotal = useCart((s) => s.subtotal());
        const updateQuantity = useCart((s) => s.updateQuantity);
        const removeItem = useCart((s) => s.removeItem);
        /* r135-C: مسار التراجع — undoRemove/lastRemoved معروضان من المتجر
           (r118-A5-F1 / r133-A3-S1: الحذف وإنقاص آخر وحدة يسجلان lastRemoved).
           المتجر للقراءة فقط هنا — لا تعديل عليه. */
        const undoRemove = useCart((s) => s.undoRemove);
        const lastRemoved = useCart((s) => s.lastRemoved);
        const cartRestaurantId = useCart((s) => s.restaurantId);
        /* r137: نوع الطلب الحالي (يكتبه OrderDialog في المتجر) — يحدد استحقاق
           رسوم التوصيل في ورقة السلة. */
        const pickupType = useCart((s) => s.pickupType);
        const [deliveryMeta, setDeliveryMeta] = useState<DeliveryMeta>({ fee: null, minOrder: null });
        const feeFetchedFor = useRef<number | null>(null);
        /* r139 (J17): حالة جلب الرسوم — «pending» أثناء الطيران و«unknown» عند
           الفشل تعرضان سطرًا صادقًا «+ رسوم توصيل (تُحدَّد عند الإتمام)» بدل
           إجمالي أنقص بصمت (صفحة السلة تعرض الرسوم بينما الورقة كانت تعرض
           المجموع وحده أثناء الفشل/قبل اكتمال الجلب). المال محفوظ — الخادم
           يعيد التسعير عند الدفع على أي حال. */
        const [feeStatus, setFeeStatus] = useState<'idle' | 'pending' | 'known' | 'unknown'>('idle');
        useEffect(() => {
                if (pickupType !== 'delivery' || !cartRestaurantId) return;
                /* جلب واحد لكل مطعم (تغيّر السلة لمطعم آخر يعيد الجلب) — الإجمالي
                   الحقيقي يعيد الخادم تسعيره عند الدفع على أي حال. */
                if (feeFetchedFor.current === cartRestaurantId) return;
                feeFetchedFor.current = cartRestaurantId;
                /* r139 (J17): مطعم جديد = وصف جديد مجهول — لا تُورَّث رسوم المطعم
                   السابق أثناء الجلب (كانت تظهر رسوم مطعم أ على سلة مطعم ب). */
                setDeliveryMeta({ fee: null, minOrder: null });
                setFeeStatus('pending');
                fetch(`/api/restaurants/${cartRestaurantId}`)
                        .then((r) => r.json())
                        .then((d) => {
                                setDeliveryMeta({
                                        fee: typeof d.data?.deliveryFee === 'number' ? d.data.deliveryFee : null,
                                        minOrder: typeof d.data?.minOrder === 'number' ? d.data.minOrder : null,
                                });
                                setFeeStatus('known');
                        })
                        .catch(() => {
                                /* فشل الجلب = لا سطر رسوم معلوم — السطر الصادق يظهر
                                   (feeStatus=unknown)؛ الخادم يفرض الحقيقة عند الدفع */
                                feeFetchedFor.current = null;
                                setFeeStatus('unknown');
                        });
        }, [pickupType, cartRestaurantId]);
        const slideOverFee = deliveryFeeFor(pickupType, deliveryMeta);
        const prevRef = useRef(totalItems);
        const [bounce, setBounce] = useState(false);
        const [open, setOpen] = useState(false);
        /* r135-C: رسالة منطقة البثّ (role=status) + عَلَم «حداثة» الحذف — التراجع
           يُعرض فقط لحذف حدث في هذه الجلسة (lastRemoved يُستمر في localStorage،
           وبلا العَلَم ستظهر شريحة تراجع شبح من جلسة سابقة — نفس مشكلة r118-A5-F1). */
        const [liveMsg, setLiveMsg] = useState('');
        const [undoArmed, setUndoArmed] = useState(false);

        useEffect(() => {
                if (totalItems > prevRef.current && prevRef.current > 0) {
                        setBounce(true);
                        const t = setTimeout(() => setBounce(false), 500);
                        prevRef.current = totalItems;
                        return () => clearTimeout(t);
                }
                prevRef.current = totalItems;
        }, [totalItems]);

        /* r135-C (a11y 4.1.3): منطقة بثّ SR للتعديلات داخل الورقة المفتوحة —
           مسار الإضافة من الشبكة له نخبه (sonner) لكن أزرار +/−/الحذف داخل
           الورقة كانت صامتة تمامًا لقارئ الشاشة. تُعلن «{الصنف}: {العدد}»
           و«أُزيل {الصنف} من السلة» بأدب (polite). المقارنة على لقطة الكميات
           السابقة، ويُحدّث المرجع دائمًا كي لا تُعلن تغييرات حدثت والورقة
           مغلقة عند فتحها لاحقًا. */
        const prevQtyRef = useRef<Map<string, { name: string; qty: number }>>(new Map());
        useEffect(() => {
                const prev = prevQtyRef.current;
                if (open) {
                        const current = new Map(items.map((i) => [i.id, i]));
                        const msgs: string[] = [];
                        for (const [id, p] of prev) {
                                const c = current.get(id);
                                if (!c) msgs.push(`أُزيل ${p.name} من السلة`);
                                else if (c.quantity !== p.qty) msgs.push(`${c.name}: ${toArabicNumber(c.quantity)}`);
                        }
                        if (msgs.length > 0) setLiveMsg(msgs.join('، '));
                }
                prevQtyRef.current = new Map(items.map((i) => [i.id, { name: i.name, qty: i.quantity }]));
        }, [items, open]);

        /* r135-C: إخفاء الشريحة تلقائيًا حين يُلغى lastRemoved من المتجر
           (تراجع آخر / إفراغ السلة عند الدفع). */
        useEffect(() => {
                if (lastRemoved === null) setUndoArmed(false);
        }, [lastRemoved]);

        /* r135-C: حارس تبديل المطاعم — التراجع صالح فقط لسلة المطعم نفسه
           (نفس شرط undoRemove في المتجر: undefined = صنف قديم بلا مطعم). */
        const undoValid =
                undoArmed &&
                lastRemoved !== null &&
                (lastRemoved.restaurantId === undefined ||
                        cartRestaurantId === 0 ||
                        lastRemoved.restaurantId === cartRestaurantId);

        if (totalItems === 0) return null;

        return (
                <>
                        {/* r135-C: منطقة البثّ sr-only — عنصر دائم في الـDOM (شرط بثّ
                           التغييرات) يعلن تعديلات السلة داخل الورقة بلطف. */}
                        <span role="status" aria-live="polite" className="sr-only">
                                {liveMsg}
                        </span>
                        <Sheet open={open} onOpenChange={setOpen}>
                        {/* Floating trigger — glass orb */}
                        <m.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                /* r121 (J-1): كانت z-[63] فوق نطاق النوافذ المنبثقة (z-40/50)
                                   فتطفو الزر فوق الورقة المفتوحة نفسها وتحتها. z-33 تحت
                                   النوافذ وفوق بقية العناصر العائمة (z-30/31). */
                                className="fixed bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] end-4 sm:end-6 z-33"
                        >
                                <button
                                        type="button"
                                        onClick={() => setOpen(true)}
                                        aria-label={`السلة - ${cartCountPhrase(totalItems)}`}
                                        className={cn(
                                                'flex items-center justify-center size-14 rounded-full',
                                                'bg-orange/90 backdrop-blur-xl',
                                                /* r131 (A2 P1-1/P1-2): الظلّ الملوّن shadow-2xl/orange/30 أُزيل —
                                                   زوج الظلّ الحيادي الممتاز + رفع −2px بدل التكبير، وسجلّ الضغط
                                                   الموحّد 0.97@80ms بدل scale-95. */
                                                'shadow-[var(--shadow-card-premium)] ring-1 ring-border/20',
                                                'hover:shadow-[var(--shadow-card-premium-h)] hover:-translate-y-[2px]',
                                                'active:scale-[0.97] active:duration-[var(--t-micro,80ms)] transition-[box-shadow,transform] duration-[var(--t-base,240ms)] ease-[var(--ease,cubic-bezier(0.4,0,0.2,1))]',
                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                bounce && 'scale-110'
                                        )}
                                >
                                        <div className="relative">
                                                <AnimatedCart className="size-5 text-orange-foreground" />
                                                <span
                                                        className={cn(
                                                                'absolute -top-2.5 -end-2.5 min-w-[18px] h-[18px] rounded-full',
                                                                'bg-orange-foreground text-saffron text-2xs font-bold',
                                                                'flex items-center justify-center px-1',
                                                                'transition-transform duration-base',
                                                                bounce && 'scale-125'
                                                        )}
                                                >
                                                        {totalItems > 9 ? '9+' : toArabicNumber(totalItems)}
                                                </span>
                                        </div>
                                </button>
                        </m.div>

                        <SheetContent
                                side="right"
                                showCloseButton={false}
                                className={cn(
                                        'flex flex-col gap-0 p-0 w-[85vw] data-[side=left]:w-[85vw] data-[side=right]:w-[85vw] sm:max-w-sm sm:data-[side=right]:w-3/4',
                                        /* r97-X1: border-border/10 بدل border-white/5 — حدود الزجاج
                                           الأبيض كانت تختفي في الثيم الفاتح */
                                        /* r120 (U2-P2-2): backdrop-blur-2xl (40px) على كامل شبكة
                                           المنيو خلف الورقة كان يجمّد الإغلاق ~1.2 ثانية (249+334+650ms
                                           إطارات تحرير نقي). md كافية بصريًا — الخلفية 95% معتمة أصلًا. */
                                        'bg-background/95 backdrop-blur-md border-s border-border/10'
                                )}
                        >
                                {/* Glass-strong header */}
                                <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-border/10 px-4 py-3 bg-background/80 backdrop-blur-xl">
                                        <div className="flex items-center gap-2">
                                                <button
                                                        type="button"
                                                        onClick={() => setOpen(false)}
                                                        className="size-11 flex items-center justify-center rounded-sm hover:bg-muted/50 transition-colors -ms-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                        aria-label="إغلاق"
                                                >
                                                        {/* r121 (J-2): سهم إغلاق الورقة كان MotionArrowLeft —
                                                            في RTL سهم الإغلاق/العودة يشير يميناً (اتفاقية
                                                            print/page.tsx + BackButton). */}
                                                        <MotionArrowRight className="size-4" />
                                                </button>
                                                <SheetTitle className="text-base">سلة الطلبات</SheetTitle>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{cartCountPhrase(totalItems)}</span>
                                </SheetHeader>

                                {/* Glass-card items */}
                                {/* r135-C: overscroll-contain — يمنع تسلسل التمرير/السحب
                                    للتحديث داخل الورقة (scroll chaining) نحو الصفحة خلفها. */}
                                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
                                        {items.map((item) => (
                                                <div
                                                        key={item.id}
                                                        className={cn(
                                                                'flex gap-3 items-start p-2.5 rounded-lg',
                                                                'bg-background/50 backdrop-blur-lg border border-border/10'
                                                        )}
                                                >
                                                        {item.image && (
                                                                /* round88-A2: box is size-14 (56px) */
                                                                <OptimizedImage
                                                                        src={item.image}
                                                                        alt={item.name}
                                                                        aspectRatio="square"
                                                                        className="size-14 shrink-0 rounded-md"
                                                                        skeleton={false}
                                                                        sizes="56px"
                                                                />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{item.name}</p>
                                                                {/* w3-f1: chosen modifier summary for this line */}
                                                                {item.modifiersSummary && (
                                                                        <p className="text-2xs text-muted-foreground mt-0.5 line-clamp-1">
                                                                                {item.modifiersSummary}
                                                                        </p>
                                                                )}
                                                                {/* r135-C: ملاحظة الزبون على السطر — كانت تُحفظ في المتجر
                                                                    (updateNotes) وتظهر في /cart فقط؛ هنا أيضاً كي يرى
                                                                    السياق كاملًا قبل الدفع. */}
                                                                {item.notes && (
                                                                        <p className="text-2xs text-muted-foreground mt-0.5 line-clamp-1">
                                                                                ملاحظة: {item.notes}
                                                                        </p>
                                                                )}
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {formatPrice(item.price)}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                        <div className="flex items-center rounded-md overflow-hidden border border-border/20 bg-background/30">
                                                                                <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                                updateQuantity(item.id, item.quantity - 1);
                                                                                                /* r135-C: إنقاص آخر وحدة يحذف السطر — المتجر يسجل
                                                                                                   lastRemoved (r133-A3-S1)؛ سلّح شريحة التراجع
                                                                                                   لهذا المسار أيضاً. */
                                                                                                if (item.quantity - 1 <= 0) setUndoArmed(true);
                                                                                        }}
                                                                                        /* r135-C: الاسم داخل الملصق — «إنقاص الكمية» وحدها غامضة في
                                                                                           تنقل الأزرار بقارئ الشاشة (قائمة أزرار متطابقة الأسماء). */
                                                                                        aria-label={`إنقاص كمية ${item.name}`}
                                                                                        /* r97-X1: ring-inset — الأب overflow-hidden يقصّ أي حلقة خارجية،
                                                                                           فالحلقة الداخلية هي المؤشر المرئي الوحيد الممكن */
                                                                                        className="size-11 flex items-center justify-center hover:bg-foreground/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 disabled:opacity-40 disabled:pointer-events-none"
                                                                                >
                                                                                        <MotionMinus className="size-4" />
                                                                                </button>
                                                                                <span className="min-w-[2ch] text-center text-xs font-semibold tabular-nums px-1">
                                                                                        {toArabicNumber(item.quantity)}
                                                                                </span>
                                                                                <button
                                                                                        type="button"
                                                                                        disabled={item.quantity >= MAX_ITEM_QUANTITY} onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                                                        /* r135-C: الاسم داخل الملصق — نفس مسوّغ زر الإنقاص. */
                                                                                        aria-label={`زيادة كمية ${item.name}`}
                                                                                        className="size-11 flex items-center justify-center hover:bg-foreground/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 disabled:opacity-40 disabled:pointer-events-none"
                                                                                >
                                                                                        <MotionPlus className="size-4" />
                                                                                </button>
                                                                        </div>
                                                                        <span className="text-xs font-semibold tabular-nums ms-auto">
                                                                                {formatPrice(item.price * item.quantity)}
                                                                        </span>
                                                                        {/* a11y(F-D/round91): trash icon was muted-foreground/30 ≈1.6:1 —
                                                                            below WCAG 1.4.11 3:1 minimum for a sole remove affordance
                                                                            (axe can't see low-alpha icon colors). /70 + 44px target
                                                                            matches the stepper buttons. */}
                                                                        <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                        removeItem(item.id);
                                                                                        /* r135-C: تسليح شريحة التراجع — الحذف من داخل الورقة. */
                                                                                        setUndoArmed(true);
                                                                                }}
                                                                                aria-label={`حذف ${item.name}`}
                                                                                className="size-11 flex items-center justify-center rounded-sm text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                                        >
                                                                                <AnimatedTrash className="size-3.5" />
                                                                        </button>
                                                                </div>
                                                        </div>
                                                </div>
                                        ))}
                                </div>

                                {/* Glass-strong footer */}
                                <div className="border-t border-border/10 px-4 py-4 space-y-3 bg-background/80 backdrop-blur-xl">
                                        {/* r135-C: شريحة التراجع داخل التذييل — تعرض الحذف الأخير
                                            (undoRemove/lastRemoved من المتجر)، تخفى تلقائيًا عند إلغاء
                                            lastRemoved أو بعد التراجع، ولا تُعرض لسلة مطعم آخر
                                            (حارس undoValid أعلاه). الزر هدف لمس 44px. */}
                                        {undoValid && lastRemoved && (
                                            <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5">
                                                <p className="flex-1 min-w-0 text-xs text-accent-foreground truncate">
                                                    أُزيل {lastRemoved.name} —
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                            const name = lastRemoved.name;
                                                            const qty = lastRemoved.quantity;
                                                            undoRemove();
                                                            setUndoArmed(false);
                                                            /* r135-C: الإعادة تُبثّ لقارئ الشاشة — السطر المُعاد
                                                               إضافة جديدة لا تلتقطها مقارنة الكميات السابقة. */
                                                            setLiveMsg(`أُعيد ${name} إلى السلة: ${toArabicNumber(qty)}`);
                                                    }}
                                                    className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-orange px-4 text-xs font-semibold text-orange-foreground transition-[background-color] hover:bg-orange/95"
                                                >
                                                    تراجع
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">الإجمالي</span>
                                                <span className="font-bold tabular-nums text-base">
                                                        {/* r137: الرسوم (إن استحقت) مضافة بعد المجموع —
                                                           فصل صادق قبل صفحة الدفع */}
                                                        {formatPrice(subtotal + slideOverFee)}
                                                </span>
                                        </div>
                                        {/* r137: سطر الرسوم — يظهر فقط عند اختيار التوصيل وبقيمة > 0 */}
                                        {slideOverFee > 0 && (
                                                <p className="text-2xs text-muted-foreground text-end">
                                                        شامل رسوم توصيل {formatPrice(slideOverFee)}
                                                </p>
                                        )}
                                        {/* r139 (J17): الرسوم مجهولة (جلب جارٍ أو فاشل) عند التوصيل —
                                            سطر صادق بدل إجمالي أنقص بصمت: الرسوم إن وُجدت تُضاف
                                            عند الإتمام (الخادم يعيد التسعير). «known» مع رسوم
                                            صفرية/مطفأة = لا شيء يُعرض (سياسة الغياب الصادق). */}
                                        {pickupType === 'delivery' &&
                                                slideOverFee === 0 &&
                                                /* r140 (A140-SM #6): idle تنضم للسطر الصادق — تأثير الجلب يخرج
                                                   مبكرًا حين !cartRestaurantId (سلال localStorage قديمة الشكل)
                                                   فتبقى الحالة idle ولا يُعرض السطر رغم أن الطلب توصيل. */
                                                (feeStatus === 'pending' || feeStatus === 'unknown' || feeStatus === 'idle') && (
                                                        <p className="text-2xs text-muted-foreground text-end">
                                                                + رسوم توصيل (تُحدَّد عند إتمام الطلب)
                                                        </p>
                                                )}
                                        <Link
                                                href="/cart"
                                                onClick={() => setOpen(false)}
                                                className={cn(buttonVariants({ variant: 'flame' }), 'w-full text-sm')}
                                        >
                                                إتمام الطلب
                                        </Link>
                                </div>
                        </SheetContent>
                        </Sheet>
                </>
        );
}
