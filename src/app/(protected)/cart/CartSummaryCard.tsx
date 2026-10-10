'use client';

import { toArabicNumber, formatPrice } from '@/lib/format';
import type { CartItem } from '@/store/cart';

interface CartSummaryCardProps {
        items: CartItem[];
        /** المجموع الفرعي (أسعار الأصناف وحدها — الرسوم تُضاف سطرًا منفصلًا). */
        total: number;
        /* r137: رسوم التوصيل المستحقة لهذا الطلب (0 = لا سطر — سياسة
           الغياب الصادق للقيمة الصفرية/المطفأة). */
        deliveryFee?: number;
}

/** Order summary card — verbatim extraction from the cart page (round89-G1). */
export function CartSummaryCard({ items, total, deliveryFee = 0 }: CartSummaryCardProps) {
        return (
                <div className="rounded-md bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20 p-5 mb-8 animate-slide-up stagger-4">
                        <h3 className="text-sm font-bold mb-4 text-muted-foreground">ملخص الطلب</h3>
                        <div className="space-y-2 mb-4">
                                {items.map((item) => (
                                        <div
                                                key={item.id}
                                                className="flex justify-between text-sm group hover:bg-orange-muted/50 -mx-2 px-2 py-1 rounded-sm transition-colors"
                                        >
                                                <span className="text-muted-foreground truncate me-2">
                                                        {item.name}
                                                        <span className="text-muted-foreground/60 ms-1">
                                                                ×{toArabicNumber(item.quantity)}
                                                        </span>
                                                </span>
                                                <span className="font-medium tabular-nums shrink-0">
                                                        {/* r121 (H-1): decimals:1 كان يجبر «.0» على الأسعار الصحيحة
                                                           ويقرّب 7.25 إلى «7.3» — الافتراضي الذكي (r120) هو
                                                           عيار العرض الموحد لبقية رحلة الطلب. */}
                                                        {formatPrice(item.price * item.quantity)}
                                                </span>
                                        </div>
                                ))}
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-orange/30 to-transparent my-3" />
                        {/* r137: سطر الرسوم — منفصل عن المجموع الفرعي (فصل صادق:
                           الرسوم تُضاف بعد المجموع، لا تُذاب فيه) ويعرض فقط بقيمة > 0. */}
                        {deliveryFee > 0 && (
                                <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">رسوم التوصيل</span>
                                        <span className="font-medium tabular-nums">{formatPrice(deliveryFee)}</span>
                                </div>
                        )}
                        <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">المجموع الإجمالي</span>
                                <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-primary tabular-nums">
                                                {/* round97-X3: shared formatPrice (suffix '' — the د.ل
                                                    span below stays separate for the baseline layout). */}
                                                {/* r121 (H-1): إسقاط decimals:1 — نفس عيار العرض الذكي. */}
                                                {/* r137: الرسوم مضافة بعد المجموع الفرعي */}
                                                {formatPrice(total + deliveryFee, { suffix: '' })}
                                        </span>
                                        <span className="text-sm text-muted-foreground">د.ل</span>
                                </div>
                        </div>
                </div>
        );
}
