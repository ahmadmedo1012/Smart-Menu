'use client';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MAX_ITEM_QUANTITY } from '@/lib/constants';

// SSR-safe localStorage wrapper — returns null on server to prevent hydration mismatch
const ssrSafeStorage = () => ({
        getItem: (name: string) => {
                if (typeof window === 'undefined') return null;
                try {
                        return localStorage.getItem(name);
                } catch {
                        return null;
                }
        },
        setItem: (name: string, value: string) => {
                try {
                        localStorage.setItem(name, value);
                } catch {
                        /* noop */
                }
        },
        removeItem: (name: string) => {
                try {
                        localStorage.removeItem(name);
                } catch {
                        /* noop */
                }
        },
});

export type CartItem = {
        id: string;
        itemId: number;
        name: string;
        price: number;
        quantity: number;
        notes: string;
        image?: string;
        restaurantId?: number;
        /* w3-f1: configured modifiers on this line. A cart line is keyed by
         * (itemId + modifier signature): the same item with different choices
         * is a SEPARATE line (never merged); a plain item keeps both undefined
         * so old persisted carts and quick-adds behave exactly as before. */
        modifierOptionIds?: number[];
        /** Human summary («كبير (+2)») for cart/receipt display. */
        modifiersSummary?: string;
};

/** r103-N3: addItem input now carries the line's restaurant meta so a
 * cross-restaurant reset can leave a FULLY consistent store (id + whatsapp +
 * name) — previously the reset kept the OLD restaurant's whatsapp, so an
 * order for B was WhatsApped to A. */
export type AddItemInput = Omit<CartItem, 'id' | 'quantity' | 'notes'> & {
        restaurantName?: string;
        restaurantWhatsapp?: string;
};

/** Stable signature of a line's modifier configuration (for merging/lookup). */
function modifierSignature(i: Pick<CartItem, 'modifierOptionIds'>): string {
        return (i.modifierOptionIds ?? []).join(',');
}

interface CartStore {
        items: CartItem[];
        customerName: string;
        customerPhone: string;
        notes: string;
        pickupType: 'inside' | 'takeaway' | 'delivery';
        restaurantId: number;
        restaurantWhatsapp: string;
        restaurantName: string;
        setRestaurantDetails: (id: number, whatsapp: string, name: string) => void;
        addItem: (item: AddItemInput) => void;
        removeItem: (id: string) => void;
        undoRemove: () => void;
        lastRemoved: CartItem | null;
        updateQuantity: (id: string, qty: number) => void;
        updateNotes: (id: string, notes: string) => void;
        setCustomerName: (n: string) => void;
        setCustomerPhone: (p: string) => void;
        setOrderNotes: (n: string) => void;
        setPickupType: (t: 'inside' | 'takeaway' | 'delivery') => void;
        setRestaurantId: (id: number) => void;
        clearCart: () => void;
        totalItems: () => number;
        subtotal: () => number;
}

function genId() {
        return typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useCart = create<CartStore>()(
        persist(
                (set, get) => ({
                        items: [],
                        lastRemoved: null,
                
                        customerName: '',
                        customerPhone: '',
                        notes: '',
                        pickupType: 'inside',
                        restaurantId: 0,
                        restaurantWhatsapp: '',
                        restaurantName: '',

                        /* r103-N3: visiting /menu/B with a cart holding A-items used to
                         * silently flip restaurantId to B while the items stayed A —
                         * every later add merged B-items into the A cart and checkout
                         * dead-ended on the server's ownership filter (400). While the
                         * cart holds another restaurant's items, its OWN restaurant
                         * details stay authoritative; the switch happens in addItem
                         * (with a full consistent reset) the moment a B-item is added. */
                        setRestaurantDetails: (id, whatsapp, name) =>
                                set((s) => {
                                        if (s.items.length > 0 && s.restaurantId && s.restaurantId !== id) {
                                                return {} as Partial<CartStore>;
                                        }
                                        return { restaurantId: id, restaurantWhatsapp: whatsapp, restaurantName: name };
                                }),

                        addItem: (item) =>
                                set((s) => {
                                        // C3 fix: if store has no restaurant yet, adopt this one instead of treating as mismatch
                                        if (!s.restaurantId && s.items.length === 0) {
                                                const first = { ...item, id: genId(), quantity: 1, notes: '' } as CartItem;
                                                return {
                                                        restaurantId: item.restaurantId,
                                                        restaurantName: s.restaurantName,
                                                        restaurantWhatsapp: s.restaurantWhatsapp,
                                                        items: [first].filter((i) => i.itemId),
                                                };
                                        }
                                        // Prevent mixing items from different restaurants — clear cart and start fresh
                                        if (
                                                s.items.length > 0 &&
                                                s.restaurantId &&
                                                item.restaurantId &&
                                                s.restaurantId !== item.restaurantId
                                        ) {
                                                return {
                                                        restaurantId: item.restaurantId,
                                                        // r103-N3: the reset must carry the NEW restaurant's
                                                        // contact too — the order goes to B, so the WhatsApp
                                                        // handoff must open B's chat, not A's.
                                                        restaurantName: item.restaurantName ?? '',
                                                        restaurantWhatsapp: item.restaurantWhatsapp ?? '',
                                                        items: [{ ...item, id: genId(), quantity: 1, notes: '' } as CartItem].filter(
                                                                (i) => i.itemId
                                                        ),
                                                        customerName: '',
                                                        customerPhone: '',
                                                        notes: '',
                                                };
                                        }
                                        const existing = s.items.find(
                                                (i) => i.itemId === item.itemId && modifierSignature(i) === modifierSignature(item)
                                        );
                                        return existing
                                                ? {
                                                                items: s.items.map((i) =>
                                                                        i.itemId === item.itemId && modifierSignature(i) === modifierSignature(item)
                                                                                ? { ...i, quantity: Math.min(MAX_ITEM_QUANTITY, i.quantity + 1) }
                                                                                : i
                                                                ),
                                                        }
                                                : { items: [...s.items, { ...item, id: genId(), quantity: 1, notes: '' }] };
                                }),

                        removeItem: (id) =>
                                set((s) => {
                                        const removed = s.items.find((i) => i.id === id);
                                        return {
                                                items: s.items.filter((i) => i.id !== id),
                                                ...(removed ? { lastRemoved: removed } : {}),
                                        };
                                }),
                        undoRemove: () =>
                                set((s) => {
                                        if (!s.lastRemoved) return {};
                                        // r118-A5-F1: restaurant guard — restoring an item from
                                        // restaurant A into restaurant B's cart dead-ends checkout
                                        // with a misleading 400 (server re-pricing is scoped to the
                                        // order's restaurant). Drop the stale undo instead.
                                        if (
                                                s.lastRemoved.restaurantId !== undefined &&
                                                s.restaurantId !== 0 &&
                                                s.lastRemoved.restaurantId !== s.restaurantId
                                        ) {
                                                return { lastRemoved: null };
                                        }
                                        // restore with the same id so quantity updates keep working
                                        return {
                                                items: [...s.items, s.lastRemoved],
                                                lastRemoved: null,
                                        };
                                }),
                        updateQuantity: (id, qty) =>
                                set((s) => ({
                                        items:
                                                qty <= 0
                                                        ? s.items.filter((i) => i.id !== id)
                                                        // r106-F1: clamp — نافذة الطلب محدودة بـ99 لكن هذه الدالة كانت
                                                        // تقبل أي قيمة (زر السلة أو localStorage قديم).
                                                        : s.items.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_ITEM_QUANTITY, qty) } : i)),
                                })),
                        updateNotes: (id, notes) =>
                                set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, notes } : i)) })),

                        setCustomerName: (n) => set({ customerName: n }),
                        setCustomerPhone: (p) => set({ customerPhone: p }),
                        setOrderNotes: (n) => set({ notes: n }),
                        setPickupType: (t) => set({ pickupType: t }),
                        setRestaurantId: (id) => set({ restaurantId: id }),

                        clearCart: () =>
                                set({
                                        items: [],
                                        customerName: '',
                                        customerPhone: '',
                                        notes: '',
                                        pickupType: 'inside',
                                        restaurantId: 0,
                                        restaurantWhatsapp: '',
                                        restaurantName: '',
                                        // r118-A5-F1: the undo entry survived checkout — a ghost
                                        // «تم حذف» banner could reappear sessions later and
                                        // resurrect an item into an unrelated restaurant's cart.
                                        lastRemoved: null,
                                }),
                        totalItems: () => get().items.reduce((a, i) => a + i.quantity, 0),
                        subtotal: () => get().items.reduce((a, i) => a + i.price * i.quantity, 0),
                }),
                {
                        name: 'cart-storage',
                        // r118-A5-F10: no version/migrate existed — the FIRST shape change
                        // to the persisted cart would have loaded stale structures into
                        // new code. v1 = current shape verbatim; future changes bump and
                        // migrate from here.
                        version: 1,
                        migrate: (persisted) => persisted as unknown as CartStore,
                        storage: createJSONStorage(ssrSafeStorage),
                        skipHydration: true, // rehydrated by CartHydrator in root layout
                        partialize: (state) => ({
                                items: state.items,
                                lastRemoved: state.lastRemoved,
                                customerName: state.customerName,
                                customerPhone: state.customerPhone,
                                notes: state.notes,
                                pickupType: state.pickupType,
                                restaurantId: state.restaurantId,
                                restaurantWhatsapp: state.restaurantWhatsapp,
                                restaurantName: state.restaurantName,
                        }),
                }
        )
);

/**
 * r121 (H-3): /cart is SSR'd from the EMPTY initial store (skipHydration —
 * CartHydrator rehydrates post-paint), so the server HTML itself contained
 * «السلة فارغة» and a refresh mid-checkout flashed a false "cart deleted"
 * state for 0.4s (unthrottled) up to ~2.3s (6× CPU throttle; Q-visual r121
 * browser measurement). The cart page gates its empty-state branch on this
 * hook and holds its loading skeleton until the persisted cart has finished
 * rehydrating. /cart is noindex — zero SEO cost.
 *
 * - Initial value is read lazily: once hydrated, the store stays hydrated for
 *   the tab's lifetime, so remounts (route revisits) don't re-flash.
 * - Server and first client render both read false (rehydrate() only runs in
 *   CartHydrator's effect) → no hydration mismatch.
 */
export function useCartHydrated(): boolean {
        const [hydrated, setHydrated] = useState(() => useCart.persist.hasHydrated());
        useEffect(() => {
                // race cover: hydration may finish between the lazy read and the subscribe
                if (useCart.persist.hasHydrated()) {
                        setHydrated(true);
                        return;
                }
                return useCart.persist.onFinishHydration(() => setHydrated(true));
        }, []);
        return hydrated;
}
