"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getCurrencyConfig } from "./currency";

export interface RestaurantData {
  id: number;
  name: string;
  slug: string;
  currency: string;
  themeColor: string;
  logo: string;
  whatsapp: string;
}

interface RestaurantContextValue {
  restaurant: RestaurantData | null;
  loading: boolean;
  setRestaurantId: (id: number) => void;
  refresh: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextValue>({
  restaurant: null,
  loading: true,
  setRestaurantId: () => {},
  refresh: async () => {},
});

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestaurant = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/settings?restaurantId=${id}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const body = await res.json();
      setRestaurant(body.data?.restaurant ?? null);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const setRestaurantId = useCallback(
    (id: number) => {
      localStorage.setItem("selectedRestaurantId", String(id));
      fetchRestaurant(id);
    },
    [fetchRestaurant]
  );

  const refresh = useCallback(async () => {
    const id = Number(localStorage.getItem("selectedRestaurantId")) || 1;
    await fetchRestaurant(id);
  }, [fetchRestaurant]);

  useEffect(() => {
    const id = Number(localStorage.getItem("selectedRestaurantId")) || 1;
    fetchRestaurant(id);
  }, [fetchRestaurant]);

  return (
    <RestaurantContext.Provider
      value={{ restaurant, loading, setRestaurantId, refresh }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}

export function useCurrency() {
  const { restaurant } = useRestaurant();
  return getCurrencyConfig(restaurant?.currency);
}

export function useFormatPrice() {
  const { restaurant } = useRestaurant();
  return (amount: number) => {
    const cfg = getCurrencyConfig(restaurant?.currency);
    return `${amount.toFixed(2)} ${cfg.symbol}`;
  };
}
