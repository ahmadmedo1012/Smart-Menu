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
 * - folds Eastern Arabic digits (٠-٩→0-9) — r133-A12 S12: an Arabic-keyboard
 *   customer typing «٠٩١٢…» got zero hits on digit-bearing names because the
 *   ASCII digits in the data never matched (SO arabic.ts:56 is the twin)
 * - lowercases Latin
 */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
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
 * r133-A12 M2: formatDate reads the LOCAL clock (getHours) — correct for its
 * client-side consumers (the visitor's device is in Libya), but wrong on the
 * server: on Vercel (TZ=UTC) it printed the order timestamp 2-3h BEHIND Libya
 * in the restaurant's WhatsApp forward. This variant pins the SAME
 * «d month yyyy HH:MM» shape to Africa/Tripoli regardless of server TZ
 * (ruling R8: ISO stays in the backend, display times are Tripoli).
 */
function formatDateTripoli(date: Date, opts?: { timeSeparator?: string }): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Tripoli',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const h = String(part('hour')).padStart(2, '0');
  const min = String(part('minute')).padStart(2, '0');
  return `${part('day')} ${ARABIC_MONTHS[part('month') - 1]} ${part('year')}${opts?.timeSeparator ?? ' '}${h}:${min}`;
}

/**
 * ar-LY dot grouping on integer strings ≥ 1,000 ("12500000" → "12.500.000") —
 * r133 (R14/A12 R6): hand-rolled, not Intl, so the output is byte-identical on
 * server and client regardless of ICU build (hydration-safe family policy; the
 * SO money.ts:41 twin — SB formatNumber and madarek formatNum are the
 * references). Money whole-parts only — decimal separator stays an ASCII dot.
 */
function groupDots(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
  // r133 (R14/A12 S2): the whole part groups ar-LY dots ≥ 1,000 — revenue KPIs
  // rendered «12500 د.ل» ungrouped while SB/madarek show «12.500».
  if (opts?.decimals != null) {
    const [w, f] = num.toFixed(opts.decimals).split('.');
    return `${toArabicNumber(f !== undefined ? `${groupDots(w)}.${f}` : groupDots(w))}${suffix}`;
  }
  const fixed = num.toFixed(2);
  const trimmed = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  const [w2, f2] = trimmed.split('.');
  return `${toArabicNumber(f2 !== undefined ? `${groupDots(w2)}.${f2}` : groupDots(w2))}${suffix}`;
}

export { toArabicNumber, formatDate, formatDateShort, formatDateTripoli };
