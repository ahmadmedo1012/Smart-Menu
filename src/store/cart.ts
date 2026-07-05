"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// SSR-safe localStorage wrapper — returns null on server to prevent hydration mismatch
const ssrSafeStorage = () => ({
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try { localStorage.setItem(name, value); } catch { /* noop */ }
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name); } catch { /* noop */ }
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
};

interface CartStore {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  notes: string;
  pickupType: "inside" | "takeaway" | "delivery";
  restaurantId: number;
  restaurantWhatsapp: string;
  restaurantName: string;
  setRestaurantDetails: (id: number, whatsapp: string, name: string) => void;
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

function genId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
  restaurantWhatsapp: "",
  restaurantName: "",

  setRestaurantDetails: (id, whatsapp, name) =>
    set({ restaurantId: id, restaurantWhatsapp: whatsapp, restaurantName: name }),

  addItem: (item) =>
    set((s) => {
      // Prevent mixing items from different restaurants — clear cart and start fresh
      if (s.items.length > 0 && s.restaurantId && item.restaurantId && s.restaurantId !== item.restaurantId) {
        return {
          restaurantId: item.restaurantId,
          items: [{ ...item, id: genId(), quantity: 1, notes: "" } as CartItem].filter(i => i.itemId),
          customerName: "", customerPhone: "", notes: "",
        };
      }
      const existing = s.items.find((i) => i.itemId === item.itemId);
      return existing
        ? { items: s.items.map((i) => (i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i)) }
        : { items: [...s.items, { ...item, id: genId(), quantity: 1, notes: "" }] };
    }),

  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  updateQuantity: (id, qty) =>
    set((s) => ({
      items: qty <= 0 ? s.items.filter((i) => i.id !== id) : s.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
    })),
  updateNotes: (id, notes) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, notes } : i)) })),

  setCustomerName: (n) => set({ customerName: n }),
  setCustomerPhone: (p) => set({ customerPhone: p }),
  setOrderNotes: (n) => set({ notes: n }),
  setPickupType: (t) => set({ pickupType: t }),
  setRestaurantId: (id) => set({ restaurantId: id }),

  clearCart: () => set({ items: [], customerName: "", customerPhone: "", notes: "", pickupType: "inside", restaurantId: 0, restaurantWhatsapp: "", restaurantName: "" }),
  totalItems: () => get().items.reduce((a, i) => a + i.quantity, 0),
  subtotal: () => get().items.reduce((a, i) => a + i.price * i.quantity, 0),
}),
    {
      name: "cart-storage",
      storage: createJSONStorage(ssrSafeStorage),
      partialize: (state) => ({
        items: state.items,
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
