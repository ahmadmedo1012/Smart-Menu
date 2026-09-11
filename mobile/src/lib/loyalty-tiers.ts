// دعم تطبيق الموبايل: في البيئة الأصلية (React Native) لا يتوفّر Node's
// `crypto.randomBytes` — نستورد react-native-get-random-values لتوفير
// `crypto.getRandomValues` (polyfill معيار الويب)، ثم نولّد 8 بايتات
// عشوائية ونحوّلها إلى hex كبديل 1:1 لـ randomBytes(8).toString('hex').
import 'react-native-get-random-values';

/** Shared loyalty tier threshold logic */

const TIER_THRESHOLDS: Record<string, { min: number; next: string | null }> = {
  bronze: { min: 0, next: "silver" },
  silver: { min: 50, next: "gold" },
  gold: { min: 150, next: "platinum" },
  platinum: { min: 400, next: null },
};

export function computeTier(points: number): string {
  if (points >= 400) return "platinum";
  if (points >= 150) return "gold";
  if (points >= 50) return "silver";
  return "bronze";
}

export function getNextTierInfo(currentTier: string) {
  const info = TIER_THRESHOLDS[currentTier];
  if (!info || !info.next) return { nextTier: null as string | null, pointsToNext: 0 };
  const nextMin = TIER_THRESHOLDS[info.next].min;
  return { nextTier: info.next, pointsToNext: nextMin };
}

/**
 * round86-C7: single referral-code generator. Two divergent copies existed
 * (orders/[id]: randomBytes(4) → 8 chars; loyalty: randomBytes(8) → 16 chars)
 * — same name, different entropy. The 8-byte spelling is canonical (matches
 * REFERRAL_CODE_RE's 6..16 window).
 *
 * Mobile port: uses the Web Crypto getRandomValues polyfill (8 bytes → 16
 * hex chars, uppercased). Output is byte-identical in shape to the Node
 * implementation.
 */
export function generateReferralCode(): string {
        const bytes = new Uint8Array(8);
        // متوفّر بعد استيراد react-native-get-random-values أعلاه.
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
