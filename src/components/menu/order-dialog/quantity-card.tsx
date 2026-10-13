'use client';

/**
 * 17-DEBT-SM (r147): بطاقة السعر والكمية داخل نافذة الطلب — السعر الحيّ
 * شامل الخيارات + درجتا الإنقاص/الزيادة (سقف MAX_ITEM_QUANTITY).
 * فُصلت عن OrderDialog.tsx كما هي حرفيًا؛ الكمية مملوكة للأب وتُمرَّر كما هي.
 */
import type { Dispatch, SetStateAction } from 'react';
import { MotionMinus, MotionPlus } from '@/components/ui/motion-icons';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { MAX_ITEM_QUANTITY } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { glassPillCard } from './constants';

export function QuantityCard({
        unitPrice,
        modDelta,
        quantity,
        setQuantity,
}: {
        unitPrice: number;
        modDelta: number;
        quantity: number;
        setQuantity: Dispatch<SetStateAction<number>>;
}) {
        return (
                <div className={cn(glassPillCard, 'flex items-center justify-between p-4')}>
                        <div>
                                <span className="text-xs text-muted-foreground">السعر</span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                        {/* w3-f1: unit price INCLUDING selected modifiers (live) */}
                                        {/* r95: حبر السعر — أسعار الأصناف بعائلة accent-foreground (#df5a00)
                                           5.42:1 — كان text-primary (#bc4700) 3.9:1 بلا AA على الزجاج الداكن. */}
                                        <span className="font-bold text-xl text-accent-foreground tabular-nums">
                                                {formatPrice(unitPrice, { suffix: '' })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">د.ل</span>
                                </div>
                                {modDelta !== 0 && (
                                        <p className="text-3xs text-muted-foreground mt-0.5">
                                                شامل الخيارات {modDelta > 0 ? '+' : ''}
                                                {/* r121 (H-1): عيار العرض الذكي بدل decimals:1. */}
                                                {formatPrice(modDelta, { suffix: '' })} د.ل
                                        </p>
                                )}
                        </div>
                        {/* Phase 5 (r152): قائد النقاط — السعر على طراز المنيو المطبوع
                            * (dotted leader يفصل السعر عن وحدة الكمية). */}
                        <i className="menu-leader-rule flex-1 hidden sm:block" aria-hidden="true" />
                        <div className="flex items-center gap-3">
                                <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="size-11 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm flex items-center justify-center hover:bg-orange/10 hover:border-orange/30 disabled:opacity-30 transition-[background-color,border-color,transform,translate,scale,rotate,box-shadow]"
                                        aria-label="إنقاص الكمية"
                                >
                                        <MotionMinus className="size-4" />
                                </button>
                                <span className="font-bold text-xl min-w-[2.5ch] text-center tabular-nums">
                                        {toArabicNumber(quantity)}
                                </span>
                                <button
                                        type="button"
                                        onClick={() => setQuantity(Math.min(MAX_ITEM_QUANTITY, quantity + 1))}
                                        disabled={quantity >= MAX_ITEM_QUANTITY}
                                        className="size-11 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm flex items-center justify-center hover:bg-orange/10 hover:border-orange/30 disabled:opacity-30 transition-[background-color,border-color,transform,translate,scale,rotate,box-shadow]"
                                        aria-label="زيادة الكمية"
                                >
                                        <MotionPlus className="size-4" />
                                </button>
                        </div>
                </div>
        );
}
