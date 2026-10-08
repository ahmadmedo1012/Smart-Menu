'use client';

import type { CartItem } from '@/store/cart';

interface CartUndoBannerProps {
        item: CartItem;
        onUndo: () => void;
}

/** Undo banner after removing a line — verbatim extraction from the cart page (round89-G1). */
export function CartUndoBanner({ item, onUndo }: CartUndoBannerProps) {
        return (
                // r119-S5-P2: live region — a line deletion was never announced
                // to screen readers (the banner appeared silently).
                <div
                        role="status"
                        aria-live="polite"
                        className="flex items-center justify-between gap-3 rounded-md border border-orange/20 bg-orange-muted/40 px-3 py-2 text-xs animate-fade-in mb-4"
                >
                        <span className="font-arabic text-muted-foreground">
                                تم حذف: {item.name}
                        </span>
                        <button
                                type="button"
                                onClick={() => onUndo()}
                                className="font-arabic font-bold text-accent-foreground hover:underline shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                                تراجع
                        </button>
                </div>
        );
}
