/**
 * round85-D4 — unit coverage for previously untested business-critical logic:
 * loyalty tier math + subscription guard (plan caps / lazy expiry).
 */
import { describe, it, expect, vi } from 'vitest';

// ── loyalty-tiers ───────────────────────────────────────────────────────
import { computeTier, getNextTierInfo } from '@/lib/loyalty-tiers';

describe('loyalty-tiers', () => {
        describe('computeTier boundaries', () => {
                it.each([
                        [0, 'bronze'],
                        [49, 'bronze'],
                        [50, 'silver'],
                        [149, 'silver'],
                        [150, 'gold'],
                        [399, 'gold'],
                        [400, 'platinum'],
                        [4000, 'platinum'],
                ])('%p points → %s', (points, tier) => {
                        expect(computeTier(points)).toBe(tier);
                });

                it('negative points fall back to bronze', () => {
                        expect(computeTier(-5)).toBe('bronze');
                });
        });

        describe('getNextTierInfo', () => {
                it('bronze → silver, 50 points to next', () => {
                        expect(getNextTierInfo('bronze')).toEqual({ nextTier: 'silver', pointsToNext: 50 });
                });
                it('silver → gold, 150 points to next', () => {
                        expect(getNextTierInfo('silver')).toEqual({ nextTier: 'gold', pointsToNext: 150 });
                });
                it('gold → platinum, 400 points to next', () => {
                        expect(getNextTierInfo('gold')).toEqual({ nextTier: 'platinum', pointsToNext: 400 });
                });
                it('platinum has no next tier', () => {
                        expect(getNextTierInfo('platinum')).toEqual({ nextTier: null, pointsToNext: 0 });
                });
                it('unknown tier → null next, 0 points', () => {
                        expect(getNextTierInfo('diamond')).toEqual({ nextTier: null, pointsToNext: 0 });
                });
                it('empty/undefined tier → safe default', () => {
                        expect(getNextTierInfo('')).toEqual({ nextTier: null, pointsToNext: 0 });
                });
        });
});

// ── subscription-guard (isSubscriptionActive is pure) ───────────────────
import { isSubscriptionActive } from '@/lib/subscription-guard';

describe('subscription-guard — isSubscriptionActive', () => {
        it('null/undefined user → inactive (fail closed)', () => {
                expect(isSubscriptionActive(null)).toBe(false);
                expect(isSubscriptionActive(undefined)).toBe(false);
        });

        it('EXPIRED status → inactive', () => {
                expect(isSubscriptionActive({ subscriptionStatus: 'EXPIRED' })).toBe(false);
        });

        it('PAID/active status without planEnd → active (unknown doesn\u2019t block)', () => {
                expect(isSubscriptionActive({ subscriptionStatus: 'PAID', planEnd: null })).toBe(true);
                expect(isSubscriptionActive({ subscriptionStatus: 'PENDING' })).toBe(true);
        });

        it('planEnd in the future (Date) → active', () => {
                expect(isSubscriptionActive({ planEnd: new Date(Date.now() + 86_400_000) })).toBe(true);
        });

        it('planEnd in the past (Date) → inactive (lazy expiry)', () => {
                expect(isSubscriptionActive({ planEnd: new Date(Date.now() - 86_400_000) })).toBe(false);
        });

        it('planEnd in the past (ISO string) → inactive', () => {
                expect(isSubscriptionActive({ planEnd: new Date(Date.now() - 86_400_000).toISOString() })).toBe(false);
        });

        it('invalid planEnd string (NaN date) → active (unknown doesn\u2019t block)', () => {
                expect(isSubscriptionActive({ planEnd: 'not-a-date' })).toBe(true);
        });

        it('EXPIRED beats future planEnd', () => {
                expect(
                        isSubscriptionActive({
                                subscriptionStatus: 'EXPIRED',
                                planEnd: new Date(Date.now() + 86_400_000),
                        })
                ).toBe(false);
        });
});

// ── subscription-guard (DB-backed functions, mocked prisma) ─────────────
vi.mock('@/lib/db', () => ({
        prisma: {
                user: {
                        findUnique: vi.fn(),
                },
        },
}));

import { getUserSubscriptionState, isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import { prisma } from '@/lib/db';

const mockFindUnique = vi.mocked(prisma.user.findUnique);

describe('subscription-guard — getUserSubscriptionState', () => {
        it('unknown user → null state (fail closed downstream)', async () => {
                mockFindUnique.mockResolvedValue(null as never);
                expect(await getUserSubscriptionState(1)).toEqual({ subscriptionStatus: null, planEnd: null });
        });

        it('no restaurants → status only, no planEnd', async () => {
                mockFindUnique.mockResolvedValue({
                        subscriptionStatus: 'PAID',
                        restaurants: [],
                } as never);
                expect(await getUserSubscriptionState(2)).toEqual({ subscriptionStatus: 'PAID', planEnd: null });
        });

        it('multi-menu: earliest planEnd wins', async () => {
                const early = new Date('2026-01-01');
                const late = new Date('2030-01-01');
                mockFindUnique.mockResolvedValue({
                        subscriptionStatus: 'PAID',
                        restaurants: [
                                { restaurant: { planEnd: late } },
                                { restaurant: { planEnd: early } },
                        ],
                } as never);
                const state = await getUserSubscriptionState(3);
                expect(state.planEnd instanceof Date).toBe(true);
                expect((state.planEnd as Date).getTime()).toBe(early.getTime());
        });

        it('invalid/NaN planEnd rows are ignored', async () => {
                mockFindUnique.mockResolvedValue({
                        subscriptionStatus: 'PAID',
                        restaurants: [{ restaurant: { planEnd: null } }],
                } as never);
                const state = await getUserSubscriptionState(4);
                expect(state.planEnd).toBeNull();
        });
});

describe('subscription-guard — isOwnerSubscriptionActive', () => {
        it('staff roles bypass the guard', async () => {
                for (const role of ['super_admin', 'admin', 'sub_admin']) {
                        expect(await isOwnerSubscriptionActive({ userId: 1, role })).toBe(true);
                }
        });

        it('null auth → inactive', async () => {
                expect(await isOwnerSubscriptionActive(null)).toBe(false);
        });

        it('owner with active subscription → active', async () => {
                mockFindUnique.mockResolvedValue({
                        subscriptionStatus: 'PAID',
                        restaurants: [{ restaurant: { planEnd: new Date(Date.now() + 86_400_000) } }],
                } as never);
                expect(await isOwnerSubscriptionActive({ userId: 9, role: 'owner' })).toBe(true);
        });

        it('owner with expired plan → inactive', async () => {
                mockFindUnique.mockResolvedValue({
                        subscriptionStatus: 'PAID',
                        restaurants: [{ restaurant: { planEnd: new Date(Date.now() - 86_400_000) } }],
                } as never);
                expect(await isOwnerSubscriptionActive({ userId: 9, role: 'owner' })).toBe(false);
        });
});
