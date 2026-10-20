/**
 * round90-F1 — T3 regression lock: the referral usage cap is ATOMIC.
 *
 * The investigator's finding (g90-D4 بند 1 T3): MAX_REFERRAL_USES=10 was
 * enforced by count-then-flip (referral-conversion.ts) and count-then-create
 * (loyalty/referral route). Under READ COMMITTED, N concurrent conversions
 * of DIFFERENT pending rows for the same code at convertedCount=9 all count
 * 9 → all flip → 11 conversions (cap bypass). The conditional flip itself
 * (updateMany WHERE status='pending' + count===0 → race-lost) only protects
 * the SAME row.
 *
 * Fix (repo-blessed FOR UPDATE serialization — the T1 pattern):
 *   - referral-conversion.ts: `SELECT id FROM "LoyaltyCard" WHERE id = ... FOR UPDATE`
 *     inside the SAME transaction, BEFORE the cap count (code ↔ card is 1:1
 *     via referralCode @unique → locks serialize every conversion of a code).
 *   - loyalty/referral POST: the advisory cap check + create now run inside
 *     ONE transaction led by the same card-row lock.
 *
 * Locked here:
 *   1. lib: the lock precedes the count (call order), the flip stays the
 *      idempotency gate, and the RACE LOSER GRANTS NOTHING.
 *   2. route: count + create share one transaction led by the lock; the
 *      capped path returns 400 without creating.
 *
 * Mock pattern: referral-conversion.test.ts / loyalty-referral.test.ts
 * (tx-mock prisma) — no real DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks (shared by both halves) ───────────────────────────────

const mockTransaction = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        referral: { findFirst: vi.fn(), updateMany: vi.fn(), count: vi.fn(), create: vi.fn() },
        loyaltyCard: { update: vi.fn() },
        rewardTransaction: { create: vi.fn() },
        systemEvent: { create: vi.fn().mockResolvedValue({}) },
        // round90-F1 (T3): the conversion tx locks the referrer card row first
        $queryRaw: mockQueryRaw,
}));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                // round94-3a (تقرير B HIGH-1): بوابة نطاق المستأجر — المتصل
                // هنا مالك شرعي لمطعم البطاقة (restaurantId=7 مطابقة رئيسية)
                // كي تبقى اختبارات ذرية السقف على السلوك المالي دون بوابة.
                role: 'owner',
                restaurantId: 7,
                userId: 7,
                permissions: [] as string[],
        },
}));

const mockCardFindUnique = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        loyaltyCard: { findUnique: mockCardFindUnique },
        referral: { updateMany: vi.fn() },
        systemEvent: { create: vi.fn().mockResolvedValue({}) },
        $transaction: mockTransaction,
        $queryRaw: mockQueryRaw,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({ requireAuth: () => Promise.resolve(authHolder.value) }));

// ── Fixtures ────────────────────────────────────────────────────────────

const ORDER = { id: 42, orderNo: 'ORD-42', restaurantId: 7, customerPhone: '0922222222', total: 120 };

const REFERRAL = {
        id: 55,
        referralCode: 'WAHAXYZ',
        referrerId: 11,
        referrerRewardPct: 10,
        restaurantId: 7,
        referrer: { id: 11, customerPhone: '0911111111', points: 40 },
};

const CARD = {
        id: 11,
        referralCode: 'WAHAXYZ',
        customerPhone: '0922222222',
        restaurantId: 7,
        /* W7-B (G-4): مطعم البطاقة على الاحترافية — بوابة «برنامج الإحالات»
           تفتح للمالك الشرعي فتبقى اختبارات ذرّية السقف على السلوك المالي. */
        restaurant: { plan: { name: 'Pro', nameAr: 'الاحترافية', sortOrder: 4 } },
};

beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction.mockImplementation(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));
        // lib defaults: pending referral found, flip wins, cap under limit
        txMock.referral.findFirst.mockImplementation(async (args: { where: Record<string, unknown> }) =>
                args.where.orderId !== undefined ? null : { ...REFERRAL }
        );
        txMock.referral.updateMany.mockResolvedValue({ count: 1 });
        txMock.referral.count.mockResolvedValue(3);
        txMock.referral.create.mockResolvedValue({ id: 55, referralCode: 'WAHAXYZ', referrerId: 11, status: 'pending' });
        txMock.loyaltyCard.update.mockResolvedValue({ id: 11, points: 52 });
        txMock.rewardTransaction.create.mockResolvedValue({ id: 900 });
        // route defaults: card found, limiter open
        mockRateCheck.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
        mockCardFindUnique.mockResolvedValue({ ...CARD });
});

// ── lib: convertReferralForCompletedOrder — atomic cap ──────────────────

describe('referral-conversion — atomic code cap (T3)', () => {
        it('the referrer card row is locked FOR UPDATE BEFORE the cap count (conversions of one code are serialized)', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');

                await convertReferralForCompletedOrder(ORDER);

                const sql = String(mockQueryRaw.mock.calls[0][0]);
                expect(sql).toContain('FOR UPDATE');
                expect(sql).toContain('"LoyaltyCard"');
                expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
                        txMock.referral.count.mock.invocationCallOrder[0]
                );
                // still ONE transaction: flip + reward + earn-row + event atomic
                expect(mockTransaction).toHaveBeenCalledTimes(1);
        });

        it('the lock passes the referrer CARD id (code ↔ card 1:1 — the right serialization key)', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');

                await convertReferralForCompletedOrder(ORDER);

                expect(mockQueryRaw.mock.calls[0][1]).toBe(11); // REFERRAL.referrerId
        });

        it('RACE LOSER GRANTS NOTHING: flip count 0 → no points, no earn row, no event', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');
                txMock.referral.updateMany.mockResolvedValue({ count: 0 });

                const result = await convertReferralForCompletedOrder(ORDER);

                expect(result).toEqual({ converted: false, reason: 'race-lost' });
                expect(txMock.loyaltyCard.update).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
                expect(txMock.systemEvent.create).not.toHaveBeenCalled();
        });

        it('cap reached (10 converted) → stays pending, no flip, no grant — now re-counted AFTER the lock', async () => {
                const { convertReferralForCompletedOrder, MAX_REFERRAL_USES } = await import('@/lib/referral-conversion');
                txMock.referral.count.mockResolvedValue(MAX_REFERRAL_USES);

                const result = await convertReferralForCompletedOrder(ORDER);

                expect(result).toEqual({ converted: false, reason: 'code-cap' });
                expect(txMock.referral.updateMany).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
        });
});

// ── route: POST /api/loyalty/referral — atomic advisory cap ─────────────

describe('POST /api/loyalty/referral — atomic claim cap (T3)', () => {
        async function callPost(body: unknown) {
                const { POST } = await import('@/app/api/loyalty/referral/route');
                return POST(
                        new NextRequest('http://localhost/api/loyalty/referral', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-real-ip': '1.2.3.4' },
                                body: JSON.stringify(body),
                        })
                );
        }

        it('lock + count + create share ONE transaction — the card row is locked FIRST', async () => {
                const res = await callPost({ referralCode: 'WAHAXYZ', referredPhone: '0933333333' });

                expect(res.status).toBe(201);
                expect(mockTransaction).toHaveBeenCalledTimes(1);
                const sql = String(mockQueryRaw.mock.calls[0][0]);
                expect(sql).toContain('FOR UPDATE');
                expect(sql).toContain('"LoyaltyCard"');
                expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
                        txMock.referral.count.mock.invocationCallOrder[0]
                );
                expect(txMock.referral.count.mock.invocationCallOrder[0]).toBeLessThan(
                        txMock.referral.create.mock.invocationCallOrder[0]
                );
        });

        it('capped code → 400 «لقد وصل كود الإحالة إلى الحد الأقصى من الاستخدامات», nothing created', async () => {
                txMock.referral.count.mockResolvedValue(10);

                const res = await callPost({ referralCode: 'WAHAXYZ', referredPhone: '0933333333' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لقد وصل كود الإحالة إلى الحد الأقصى من الاستخدامات');
                expect(txMock.referral.create).not.toHaveBeenCalled();
        });

        it('under the cap → 201 pending referral bound to the card (behavior preserved)', async () => {
                const res = await callPost({ referralCode: 'WAHAXYZ', referredPhone: '0933333333' });

                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.data.id).toBe(55);
                expect(txMock.referral.create).toHaveBeenCalledWith({
                        data: {
                                referralCode: 'WAHAXYZ',
                                referrerId: 11,
                                referredPhone: '0933333333',
                                referredName: '',
                                status: 'pending',
                                restaurantId: 7,
                        },
                });
        });
});
