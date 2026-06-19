"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  itemId: number;
  name: string;
  price: number;
  quantity: number;
  notes: string;
  image?: string;
};

interface CartStore {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  notes: string;
  pickupType: "inside" | "takeaway" | "delivery";
  restaurantId: number;
  addItem: (item: Omit<CartItem, "id" | "quantity" | "notes">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  updateNotes: (id: string, notes: string) => void;
  setCustomerName: (n: string) => void;
  setCustomerPhone: (p: string) => void;
  setOrderNotes: (n: string) => void;
  setPickupType: (t: "inside" | "takeaway" | "delivery") => void;
  setRestaurantId: (id: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: "",
      customerPhone: "",
      notes: "",
      pickupType: "inside",
      restaurantId: 0,

      addItem: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.itemId === item.itemId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return {
            items: [
              ...s.items,
              { ...item, id: crypto.randomUUID(), quantity: 1, notes: "" },
            ],
          };
        }),

      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.id !== id)
              : s.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
        })),

      updateNotes: (id, notes) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, notes } : i)),
        })),

      setCustomerName: (n) => set({ customerName: n }),
      setCustomerPhone: (p) => set({ customerPhone: p }),
      setOrderNotes: (n) => set({ notes: n }),
      setPickupType: (t) => set({ pickupType: t }),
      setRestaurantId: (id) => set({ restaurantId: id }),

      clearCart: () =>
        set({
          items: [],
          customerName: "",
          customerPhone: "",
          notes: "",
          pickupType: "inside",
          restaurantId: 0,
        }),

      totalItems: () => get().items.reduce((a, i) => a + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((a, i) => a + i.price * i.quantity, 0),
    }),
    { name: "cart-storage" }
  )
);
