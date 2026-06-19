const CURRENCY_MAP: Record<string, { symbol: string; code: string; locale: string }> = {
  LYD: { symbol: "د.ل", code: "LYD", locale: "ar-LY" },
  SAR: { symbol: "ر.س", code: "SAR", locale: "ar-SA" },
  AED: { symbol: "د.إ", code: "AED", locale: "ar-AE" },
  EGP: { symbol: "ج.م", code: "EGP", locale: "ar-EG" },
  USD: { symbol: "$", code: "USD", locale: "en-US" },
};

const DEFAULT_CURRENCY = "LYD";

export function getCurrencyConfig(currency?: string | null) {
  return CURRENCY_MAP[currency ?? ""] ?? CURRENCY_MAP[DEFAULT_CURRENCY];
}

export function formatPrice(amount: number, currency?: string | null): string {
  const cfg = getCurrencyConfig(currency);
  return `${amount.toFixed(2)} ${cfg.symbol}`;
}

export function formatPriceShort(amount: number, currency?: string | null): string {
  const cfg = getCurrencyConfig(currency);
  return `${Math.round(amount)} ${cfg.symbol}`;
}
