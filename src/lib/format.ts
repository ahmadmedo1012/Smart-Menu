/**
 * Formats numbers using Western/Arabic digits (0-9) as requested.
 * Not to be confused with Arabic-Indic numerals (٠-٩) which are NOT used.
 * - Integers: formatted without decimal places
 * - Floats: 1 decimal place
 * - Strings: returned as-is
 */
function toArabicNumber(n: number | string): string {
  if (typeof n === 'number') {
    return n % 1 === 0 ? n.toLocaleString('en-US') : n.toFixed(1);
  }
  return n;
}

function formatPrice(amount: number): string {
  return amount.toFixed(1) + ' د.ل';
}

export { toArabicNumber, formatPrice };
