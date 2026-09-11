// Cart store — Zustand + AsyncStorage (ported from web src/store/cart.ts).

import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: string; itemId: number; name: string; price: number;
  quantity: number; notes: string; image?: string; restaurantId?: number;
  modifierOptionIds?: number[]; modifiersSummary?: string;
};

function modifierSignature(i: Pick<CartItem, "modifierOptionIds">): string {
  return (i.modifierOptionIds ?? []).join(",");
}

interface CartStore {
  items: CartItem[]; lastRemoved: CartItem | null;
  customerName: string; customerPhone: string; notes: string;
  pickupType: "inside" | "takeaway" | "delivery";
  restaurantId: number; restaurantWhatsapp: string; restaurantName: string;
  setRestaurantDetails: (id: number, w: string, n: string) => void;
  addItem: (i: Omit<CartItem, "id" | "quantity" | "notes">) => void;
  removeItem: (id: string) => void;
  undoRemove: () => void;
  updateQuantity: (id: string, q: number) => void;
  updateNotes: (id: string, n: string) => void;
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

const asyncStorageAdapter = () => ({
  getItem: async (n: string) => { try { return await AsyncStorage.getItem(n); } catch { return null; } },
  setItem: async (n: string, v: string) => { try { await AsyncStorage.setItem(n, v); } catch {} },
  removeItem: async (n: string) => { try { await AsyncStorage.removeItem(n); } catch {} },
}) as const;

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [], lastRemoved: null, customerName: "", customerPhone: "",
      notes: "", pickupType: "inside", restaurantId: 0, restaurantWhatsapp: "", restaurantName: "",
      setRestaurantDetails: (id, w, n) => set({ restaurantId: id, restaurantWhatsapp: w, restaurantName: n }),
      addItem: (item) => set((s) => {
        if (!s.restaurantId && s.items.length === 0) {
          const first = { ...item, id: genId(), quantity: 1, notes: "" } as CartItem;
          return { restaurantId: item.restaurantId ?? s.restaurantId, items: [first].filter((i) => i.itemId) };
        }
        if (s.items.length > 0 && s.restaurantId && item.restaurantId && s.restaurantId !== item.restaurantId) {
          return {
            restaurantId: item.restaurantId,
            items: [{ ...item, id: genId(), quantity: 1, notes: "" } as CartItem].filter((i) => i.itemId),
            customerName: "", customerPhone: "", notes: "",
          };
        }
        const existing = s.items.find((i) => i.itemId === item.itemId && modifierSignature(i) === modifierSignature(item));
        return existing
          ? { items: s.items.map((i) => i.itemId === item.itemId && modifierSignature(i) === modifierSignature(item) ? { ...i, quantity: i.quantity + 1 } : i) }
          : { items: [...s.items, { ...item, id: genId(), quantity: 1, notes: "" }] };
      }),
      removeItem: (id) => set((s) => {
        const removed = s.items.find((i) => i.id === id);
        return { items: s.items.filter((i) => i.id !== id), ...(removed ? { lastRemoved: removed } : {}) };
      }),
      undoRemove: () => set((s) => s.lastRemoved ? { items: [...s.items, s.lastRemoved], lastRemoved: null } : {}),
      updateQuantity: (id, q) => set((s) => ({
        items: q <= 0 ? s.items.filter((i) => i.id !== id) : s.items.map((i) => i.id === id ? { ...i, quantity: q } : i),
      })),
      updateNotes: (id, n) => set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, notes: n } : i) })),
      setCustomerName: (n) => set({ customerName: n }),
      setCustomerPhone: (p) => set({ customerPhone: p }),
      setOrderNotes: (n) => set({ notes: n }),
      setPickupType: (t) => set({ pickupType: t }),
      setRestaurantId: (id) => set({ restaurantId: id }),
      clearCart: () => set({
        items: [], customerName: "", customerPhone: "", notes: "",
        pickupType: "inside", restaurantId: 0, restaurantWhatsapp: "", restaurantName: "",
      }),
      totalItems: () => get().items.reduce((a, i) => a + i.quantity, 0),
      subtotal: () => get().items.reduce((a, i) => a + i.price * i.quantity, 0),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(asyncStorageAdapter),
      partialize: (s) => ({
        items: s.items, lastRemoved: s.lastRemoved,
        customerName: s.customerName, customerPhone: s.customerPhone, notes: s.notes,
        pickupType: s.pickupType, restaurantId: s.restaurantId,
        restaurantWhatsapp: s.restaurantWhatsapp, restaurantName: s.restaurantName,
      }),
    },
  ),
);
