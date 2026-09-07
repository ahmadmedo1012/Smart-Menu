'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {} from 'lucide-react';
import { MotionMinus } from '@/components/ui/motion-icons';
import { MotionArrowLeft } from '@/components/ui/motion-icons';
import { MotionPlus } from '@/components/ui/motion-icons';
import AnimatedTrash from '@/components/ui/trash-icon';
import AnimatedCart from '@/components/ui/shopping-cart-icon';
import { m } from 'motion/react';
import { useCart } from '@/store/cart';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { cn } from '@/lib/utils';

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
                                className="fixed bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] end-4 sm:end-6 z-[63]"
                        >
                                <button
                                        type="button"
                                        onClick={() => setOpen(true)}
                                        aria-label={`السلة - ${toArabicNumber(totalItems)} أصناف`}
                                        className={cn(
                                                'flex items-center justify-center size-14 rounded-full',
                                                'bg-orange/90 backdrop-blur-xl',
                                                'shadow-2xl shadow-orange/30 ring-1 ring-white/10',
                                                'hover:shadow-orange/40 hover:scale-105',
                                                'active:scale-95 transition-transform duration-300 ease-out',
                                                bounce && 'scale-110'
                                        )}
                                >
                                        <div className="relative">
                                                <AnimatedCart className="size-5 text-orange-foreground" />
                                                <span
                                                        className={cn(
                                                                'absolute -top-2.5 -end-2.5 min-w-[18px] h-[18px] rounded-full',
                                                                'bg-orange-foreground text-orange text-[10px] font-bold',
                                                                'flex items-center justify-center px-1',
                                                                'transition-transform duration-300',
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
                                        'bg-background/95 backdrop-blur-2xl border-s border-white/5'
                                )}
                        >
                                {/* Glass-strong header */}
                                <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-white/5 px-4 py-3 bg-background/80 backdrop-blur-xl">
                                        <div className="flex items-center gap-2">
                                                <button
                                                        type="button"
                                                        onClick={() => setOpen(false)}
                                                        className="size-11 flex items-center justify-center rounded-sm hover:bg-white/10 transition-colors -ms-2"
                                                        aria-label="إغلاق"
                                                >
                                                        <MotionArrowLeft className="size-4" />
                                                </button>
                                                <SheetTitle className="text-base">سلة الطلبات</SheetTitle>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{toArabicNumber(totalItems)} أصناف</span>
                                </SheetHeader>

                                {/* Glass-card items */}
                                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                                        {items.map((item) => (
                                                <div
                                                        key={item.id}
                                                        className={cn(
                                                                'flex gap-3 items-start p-2.5 rounded-lg',
                                                                'bg-background/50 backdrop-blur-lg border border-white/5'
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
                                                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                                                                {item.modifiersSummary}
                                                                        </p>
                                                                )}
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {formatPrice(item.price, { decimals: 1 })}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                        <div className="flex items-center rounded-md overflow-hidden border border-white/10 bg-background/30">
                                                                                <button
                                                                                                                                                                        type="button"
                                                                                                                                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                                                                                                                                        aria-label="إنقاص الكمية"
                                                                                                                                                                        className="size-11 flex items-center justify-center hover:bg-white/10 transition-colors"
                                                                                                                                                                >
                                                                                                                                                                        <MotionMinus className="size-4" />
                                                                                                                                                        </button>
                                                                                <span className="min-w-[2ch] text-center text-xs font-semibold tabular-nums px-1">
                                                                                        {toArabicNumber(item.quantity)}
                                                                                </span>
                                                                                <button
                                                                                        type="button"
                                                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                                                        aria-label="زيادة الكمية"
                                                                                        className="size-11 flex items-center justify-center hover:bg-white/10 transition-colors"
                                                                                >
                                                                                        <MotionPlus className="size-4" />
                                                                                </button>
                                                                        </div>
                                                                        <span className="text-xs font-semibold tabular-nums ms-auto">
                                                                                {formatPrice(item.price * item.quantity, { decimals: 1 })}
                                                                        </span>
                                                                        {/* a11y(F-D/round91): trash icon was muted-foreground/30 ≈1.6:1 —
                                                                            below WCAG 1.4.11 3:1 minimum for a sole remove affordance
                                                                            (axe can't see low-alpha icon colors). /70 + 44px target
                                                                            matches the stepper buttons. */}
                                                                        <button
                                                                                type="button"
                                                                                onClick={() => removeItem(item.id)}
                                                                                aria-label={`حذف ${item.name}`}
                                                                                className="size-11 flex items-center justify-center rounded-sm text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                                        >
                                                                                <AnimatedTrash className="size-3.5" />
                                                                        </button>
                                                                </div>
                                                        </div>
                                                </div>
                                        ))}
                                </div>

                                {/* Glass-strong footer */}
                                <div className="border-t border-white/5 px-4 py-4 space-y-3 bg-background/80 backdrop-blur-xl">
                                        <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">الإجمالي</span>
                                                <span className="font-bold tabular-nums text-base">
                                                        {formatPrice(subtotal, { decimals: 1 })}
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
