'use client';

import { toArabicNumber, formatPrice } from '@/lib/format';
import type { CartItem } from '@/store/cart';

interface CartSummaryCardProps {
        items: CartItem[];
        total: number;
}

/** Order summary card — verbatim extraction from the cart page (round89-G1). */
export function CartSummaryCard({ items, total }: CartSummaryCardProps) {
        return (
                <div className="rounded-md bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20 p-5 mb-8 animate-slide-up delay-400">
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
                                                        {formatPrice(item.price * item.quantity, { decimals: 1 })}
                                                </span>
                                        </div>
                                ))}
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-orange/30 to-transparent my-3" />
                        <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">المجموع الإجمالي</span>
                                <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-primary tabular-nums">
                                                {/* round97-X3: shared formatPrice (suffix '' — the د.ل
                                                    span below stays separate for the baseline layout). */}
                                                {formatPrice(total, { decimals: 1, suffix: '' })}
                                        </span>
                                        <span className="text-sm text-muted-foreground">د.ل</span>
                                </div>
                        </div>
                </div>
        );
}
