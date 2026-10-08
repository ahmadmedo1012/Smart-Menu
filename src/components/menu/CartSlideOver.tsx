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
        const prevRef = useRef(totalItems);
        const [bounce, setBounce] = useState(false);
        const [open, setOpen] = useState(false);

        useEffect(() => {
                if (totalItems > prevRef.current && prevRef.current > 0) {
                        setBounce(true);
                        const t = setTimeout(() => setBounce(false), 500);
                        prevRef.current = totalItems;
                        return () => clearTimeout(t);
                }
                prevRef.current = totalItems;
        }, [totalItems]);

        if (totalItems === 0) return null;

        return (
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
                                                'shadow-[var(--shadow-card-premium)] ring-1 ring-white/10',
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
                                                                'bg-orange-foreground text-saffron text-3xs font-bold',
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
                                                        className="size-11 flex items-center justify-center rounded-sm hover:bg-white/10 transition-colors -ms-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {formatPrice(item.price)}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                        <div className="flex items-center rounded-md overflow-hidden border border-white/10 bg-background/30">
                                                                                <button
                                                                                                                                                                        type="button"
                                                                                                                                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                                                                                                                                        aria-label="إنقاص الكمية"
                                                                                                                                                                        /* r97-X1: ring-inset — الأب overflow-hidden يقصّ أي حلقة خارجية،
                                                                                                                                                                           فالحلقة الداخلية هي المؤشر المرئي الوحيد الممكن */
                                                                                                                                                                        className="size-11 flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 disabled:opacity-40 disabled:pointer-events-none"
                                                                                                                                                                >
                                                                                                                                                                        <MotionMinus className="size-4" />
                                                                                                                                                        </button>
                                                                                <span className="min-w-[2ch] text-center text-xs font-semibold tabular-nums px-1">
                                                                                        {toArabicNumber(item.quantity)}
                                                                                </span>
                                                                                <button
                                                                                        type="button"
                                                                                        disabled={item.quantity >= MAX_ITEM_QUANTITY} onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                                                        aria-label="زيادة الكمية"
                                                                                        className="size-11 flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 disabled:opacity-40 disabled:pointer-events-none"
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
                                                                                onClick={() => removeItem(item.id)}
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
                                        <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">الإجمالي</span>
                                                <span className="font-bold tabular-nums text-base">
                                                        {formatPrice(subtotal)}
                                                </span>
                                        </div>
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
        );
}
