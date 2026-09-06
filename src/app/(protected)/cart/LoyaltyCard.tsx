'use client';

import AnimatedSparkles from '@/components/ui/sparkles-icon';

/** Loyalty earn-points banner — verbatim extraction from the cart page (round89-G1). */
export function LoyaltyCard() {
        return (
                <div className="rounded-lg bg-gradient-to-br from-orange-muted/50 to-orange-muted/20 dark:from-orange-muted/10 border border-orange/20 p-3.5 mt-4">
                        <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-lg bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-sm shrink-0">
                                        <AnimatedSparkles className="size-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold">اكسب نقاط ولاء مع هذا الطلب!</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                كل طلب يمنحك نقاطاً يمكن استبدالها بمكافآت
                                        </p>
                                </div>
                        </div>
                </div>
        );
}
