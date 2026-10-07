// r123 (e2e owner-journey rescue): plan-expiry helpers live here — a plain
// server-safe module — instead of OwnerShell.tsx. The r121 layout called
// getPlanDaysRemaining() from the server while it was exported from a
// 'use client' module, which is a React Server/Client boundary violation:
// every /owner render died with "Attempted to call getPlanDaysRemaining()
// from the server but getPlanDaysRemaining is on the client" and the owner
// dashboard surfaced حدث خطأ غير متوقع. OwnerShell re-exports these for
// its unit suite (vitest resolves modules directly, no RSC transform),
// while the SERVER layout imports from THIS module — the boundary
// violation is gone.

import { getArabicPlural } from '@/lib/arabic-plural';
import { toArabicNumber } from '@/lib/format';

const DAY_MS = 86_400_000;

/** Whole days (rounded up) until planEnd; <= 0 means already past. Null when
 * the owner has no plan end date (free/legacy rows — nothing to warn about).
 * (`|| 0` normalizes Math.ceil's -0 for the just-expired second.) */
export function getPlanDaysRemaining(planEnd: string | null, now: Date = new Date()): number | null {
        if (!planEnd) return null;
        const end = new Date(planEnd);
        if (Number.isNaN(end.getTime())) return null;
        return Math.ceil((end.getTime() - now.getTime()) / DAY_MS) || 0;
}

/** «يوم واحد / يومين / 5 أيام / 11 يومًا» — r93-W2a plural discipline. */
export function daysLeftPhrase(days: number): string {
        if (days === 1) return 'يوم واحد';
        if (days === 2) return 'يومين';
        return `${toArabicNumber(days)} ${getArabicPlural(days, 'يوم', {
                few: 'أيام',
                many: 'يومًا',
        })}`;
}
