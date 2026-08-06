/**
 * Converts a number to a string using only Western/Arabic digits (0-9).
 * Never uses Arabic-Indic numerals (٠-٩). No thousand separators.
 * - Integers: "123456"
 * - Floats: "1234.5"
 * - Strings: returned as-is
 */
function toArabicNumber(n: number | string): string {
  if (typeof n === 'number') {
    return n.toString();
  }
  return n;
}

/**
 * Format a date with Arabic month names and Western digits only.
 */
const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatDate(date: Date): string {
  const d = date.getDate();
  const m = ARABIC_MONTHS[date.getMonth()];  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${toArabicNumber(d)} ${m} ${toArabicNumber(y)} ${h}:${min}`;
}

/**
 * Single canonical price formatter (round-77 code-quality agent).
 * Unifies 3 competing patterns (toFixed(1) site displays vs toFixed(2)
 * receipt vs plain price) — always Western digit + space + "د.ل".
 */
export function formatPrice(n: number | string | null | undefined, opts?: { decimals?: number; suffix?: string }): string {
  const num = Number(n ?? 0) || 0;
  const dec = opts?.decimals ?? (Number.isInteger(num) ? 0 : 1);
  const suffix = opts?.suffix ?? ' د.ل';
  return `${toArabicNumber(num.toFixed(dec))}${suffix}`;
}

export { toArabicNumber, formatDate };
