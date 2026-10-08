'use client';

import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';

/** Order progress stepper — verbatim extraction from the cart page (round89-G1). */
export function OrderStepper() {
        // Stepper — order progress (Peak-End: reduces checkout anxiety)
        return (
                <div className="flex items-center gap-1.5 mb-6 animate-slide-up delay-75" aria-label="خطوات الطلب">
                        {[
                                { n: 1, label: 'الأصناف' },
                                { n: 2, label: 'التأكيد' },
                                { n: 3, label: 'واتساب' },
                        ].map((step, i) => (
                                <div key={step.n} className="flex items-center gap-1.5 flex-1">
                                        <div className={cn(
                                                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-[color,background-color,border-color] duration-base',
                                                i === 0
                                                        ? 'bg-orange/15 text-accent-foreground border border-orange/30'
                                                        : 'bg-muted/40 text-muted-foreground/60 border border-border/30'
                                        )}>
                                                <span className={cn(
                                                        'size-4 rounded-full flex items-center justify-center text-[9px]',
                                                        i === 0 ? 'bg-orange text-orange-foreground' : 'bg-muted text-muted-foreground/60'
                                                )}>{toArabicNumber(step.n)}</span>
                                                {step.label}
                                        </div>
                                        {i < 2 && <div className="h-px flex-1 bg-border/40" />}
                                </div>
                        ))}
                </div>
        );
}
