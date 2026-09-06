'use client';

import type { CartItem } from '@/store/cart';

/** Cart money math — extracted verbatim from the cart page (round89-G1).
 * The page has no separate discount line yet, so the final total IS the
 * subtotal (same number the order API receives in both fields today). */
export function useCartTotals(items: CartItem[]): {
        subtotal: number;
        discount: number;
        total: number;
} {
        const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
        const discount = 0;
        return { subtotal, discount, total: subtotal };
}
