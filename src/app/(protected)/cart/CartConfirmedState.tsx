'use client';

import { Loader2 } from 'lucide-react';
import { MotionCheck } from '@/components/ui/motion-icons';

/** Post-send confirmation view — verbatim extraction from the cart page (round89-G1). */
export function CartConfirmedState() {
        return (
                <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center animate-scale-in">
                        {/* r131 (A2 P3-7 — حكم 56px): بئر الحالة 56px r-xl (كان 96px دائري). */}
                        <div className="size-14 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-6 animate-scale-in">
                                <MotionCheck className="size-7 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">تم تأكيد الطلب!</h2>
                        <p className="text-muted-foreground flex items-center gap-2">
                                جارٍ تحويلك إلى صفحة التأكيد...
                                <Loader2 className="size-4 animate-spin" />
                        </p>
                </div>
        );
}
