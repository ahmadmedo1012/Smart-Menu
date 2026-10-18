import { randomBytes } from 'crypto';
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
 * W6-B6 (تدقيق W6-A3 — إصلاح صغير 3): عتبات المستويات من المصدر الواحد.
 * كانت الواجهة (LoyaltyWidget) تكرّر 50/150/400 محليًا مع TODO «اسحبها من
 * الخادم» — أي انحراف مستقبلي بين سُلّم العرض وحساب computeTier الفعلي
 * كان سيبقى غير مرئي. الآن /api/loyalty يصدّر الخريطة عبر هذه الدالة،
 * والواجهة تستهلكها مع سقوط آمن إلى القيم المحلية (استجابة قديمة).
 */
export function tierMinPoints(): Record<string, number> {
  return {
    bronze: TIER_THRESHOLDS.bronze.min,
    silver: TIER_THRESHOLDS.silver.min,
    gold: TIER_THRESHOLDS.gold.min,
    platinum: TIER_THRESHOLDS.platinum.min,
  };
}

/**
 * round86-C7: single referral-code generator. Two divergent copies existed
 * (orders/[id]: randomBytes(4) → 8 chars; loyalty: randomBytes(8) → 16 chars)
 * — same name, different entropy. The 8-byte spelling is canonical (matches
 * REFERRAL_CODE_RE's 6..16 window).
 */
export function generateReferralCode(): string {
        return randomBytes(8).toString('hex').toUpperCase();
}
