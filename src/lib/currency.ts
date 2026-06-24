import { toArabicNumber } from "./format";

const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  LYD: { symbol: "د.ل", code: "LYD" },
  SAR: { symbol: "ر.س", code: "SAR" },
  AED: { symbol: "د.إ", code: "AED" },
  EGP: { symbol: "ج.م", code: "EGP" },
  USD: { symbol: "$", code: "USD" },
};

const DEFAULT_CURRENCY = "LYD";

export function getCurrencyConfig(currency?: string | null) {
  return CURRENCY_MAP[currency ?? ""] ?? CURRENCY_MAP[DEFAULT_CURRENCY];
}

export function formatPrice(amount: number, currency?: string | null): string {
  const cfg = getCurrencyConfig(currency);
  return `${toArabicNumber(amount.toFixed(1))} ${cfg.symbol}`;
}

export function formatPriceShort(amount: number, currency?: string | null): string {
  const cfg = getCurrencyConfig(currency);
  return `${toArabicNumber(Math.round(amount))} ${cfg.symbol}`;
}
