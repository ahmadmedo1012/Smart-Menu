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
 * Normalizes Arabic text for search/filter matching:
 * - strips tashkeel (diacritics) and tatweel
 * - folds alef variants (أإآ→ا), alef maqsura (ى→ي), ta marbuta (ة→ه)
 * - lowercases Latin
 */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase();
}

/**
 * Format a date with Arabic month names and Western digits only.
 */
const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/**
 * Format a date with Arabic month names and Western digits only.
 * round97-X3: optional `timeSeparator` lets callers keep their historical
 * output shape (receipt.ts renders "… 2025 | 14:30") while sharing this one
 * implementation — the default (" ") is byte-identical to the previous
 * inline version.
 */
function formatDate(date: Date, opts?: { timeSeparator?: string }): string {
  const d = date.getDate();
  const m = ARABIC_MONTHS[date.getMonth()];  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${toArabicNumber(d)} ${m} ${toArabicNumber(y)}${opts?.timeSeparator ?? ' '}${h}:${min}`;
}

/**
 * round87-C8: unified short Arabic date (day + month, e.g. "5 سبتمبر").
 * Same style rules as formatDate: Western digits via toArabicNumber and the
 * local ARABIC_MONTHS names — replaces 3 competing toLocaleDateString('ar-LY')
 * variants (full numeric / short-month) in public + owner surfaces.
 */
function formatDateShort(date: Date): string {
  return `${toArabicNumber(date.getDate())} ${ARABIC_MONTHS[date.getMonth()]}`;
}

/**
 * Single canonical price formatter (round-77 code-quality agent).
 * Unifies 3 competing patterns (toFixed(1) site displays vs toFixed(2)
 * receipt vs plain price) — always Western digit + space + "د.ل".
 */
export function formatPrice(n: number | string | null | undefined, opts?: { decimals?: number; suffix?: string }): string {
  const num = Number(n ?? 0) || 0;
  const suffix = opts?.suffix ?? ' د.ل';
  // r120 (U1-P2-2 + U5-F-13): التقليم الذكي هو الافتراضي — لا ".0" عارية أبدًا
  // (12 → "12" لا "12.0")، والكسور الحقيقية تبقى (12.75 → "12.75" بدل تدويرها
  // إلى "12.8")، بحد أقصى منزلتان. أما decimals الصريح فيبقى حاكمًا — المستندات
  // (الفواتير/نص المشاركة) تثبّت دقتها باختبارات، ومواقع العرض صارت تتخلى عنه.
  if (opts?.decimals != null) {
    return `${toArabicNumber(num.toFixed(opts.decimals))}${suffix}`;
  }
  const fixed = num.toFixed(2);
  const trimmed = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  return `${toArabicNumber(trimmed)}${suffix}`;
}

export { toArabicNumber, formatDate, formatDateShort };
