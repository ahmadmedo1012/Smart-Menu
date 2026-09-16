/**
 * r110-F11 — pins the cross-restaurant cart-switch guard decision.
 *
 * The STORE reset (r103-N3) is already pinned in r103-fixes.test.ts: addItem
 * silently clears an A-cart when a B-item arrives. r110 adds the missing
 * CONSENT layer: MenuPageClient intercepts every add/open-order path with
 * willReplaceOtherRestaurantCart() and only proceeds through the
 * CartSwitchDialog confirmation when it returns true. This file pins the
 * decision function's truth table — it must mirror store/cart.ts addItem's
 * reset condition exactly:
 *
 *   items > 0 && restaurantId !== 0 && restaurantId !== target
 *
 * A drift between the two conditions would either nag users with a confirm
 * dialog on same-restaurant adds (harmless but annoying) or — far worse —
 * silently clear a cart again (the F11 defect).
 */
import { describe, it, expect } from 'vitest';
import { willReplaceOtherRestaurantCart } from '@/components/menu/CartSwitchDialog';

const cart = (items: unknown[], restaurantId: number) => ({ items, restaurantId });

describe('r110-F11 willReplaceOtherRestaurantCart — guard truth table', () => {
        it('empty cart → false (nothing to lose; add proceeds with no dialog)', () => {
                expect(willReplaceOtherRestaurantCart(cart([], 0), 7)).toBe(false);
        });

        it('empty cart WITH stale restaurantId → false (items are the asset, not the id)', () => {
                expect(willReplaceOtherRestaurantCart(cart([], 312), 104)).toBe(false);
        });

        it('same restaurant → false (normal add — must NEVER show the dialog)', () => {
                expect(willReplaceOtherRestaurantCart(cart([{}], 104), 104)).toBe(false);
        });

        it('other restaurant with items → true (the destructive F11 case — dialog required)', () => {
                expect(willReplaceOtherRestaurantCart(cart([{}, {}], 312), 104)).toBe(true);
        });

        it('restaurantId 0 with items → false (legacy cart with no id; store adopts the first add)', () => {
                // matches store behavior: !s.restaurantId && items.length === 0 adopts;
                // items>0 with id 0 cannot happen via the store (addItem always adopts),
                // but the guard must not fire on it — the store merge path handles it.
                expect(willReplaceOtherRestaurantCart(cart([{}], 0), 7)).toBe(false);
        });
});
