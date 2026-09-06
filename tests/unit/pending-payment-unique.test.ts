/**
 * round90-F1 — T2 regression lock: ONE pending payment request per user,
 * enforced by the DATABASE (partial unique index) — not by check-then-create.
 *
 * The investigator's finding (g90-D4 بند 1 T2 — أقرب موضع للمال): both
 * subscriptions POST and subscriptions/upgrade POST did findFirst(pending)
 * then create. Two concurrent requests both pass the probe before any write
 * → TWO pending rows → the user can pay twice for one upgrade.
 *
 * Fix (two layers):
 *   - migration zz_round90_pending_payment_unique: partial unique index
 *     SubscriptionPayment_pending_user_unique ON (userId) WHERE status='pending'
 *     (live-verified: duplicate pending insert → 23505, NULL-userId and
 *     non-pending rows unaffected).
 *   - both routes: the initial 400 probe stays (fast path, UX), and a P2002
 *     from the create (the race loser) now returns 409 «لديك طلب دفع معلق
 *     بالفعل» instead of a second pending row.
 *
 * Mock pattern: subscriptions-family.test.ts / subscriptions-upgrade.test.ts
 * (hoisted prisma + limiter + telegram senders) — no real DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'USER',
                restaurantId: null as number | null,
                userId: 7,
                permissions: [] as string[],
        },
}));

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockPlanFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockPaymentFindFirst = vi.hoisted(() => vi.fn());
const mockPaymentCreate = vi.hoisted(() => vi.fn());
const mockPaymentUpdate = vi.hoisted(() => vi.fn());
const mockBroadcastTargets = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockAdminIds = vi.hoisted(() => vi.fn());
const mockBotToken = vi.hoisted(() => vi.fn());
const mockSendKeyboard = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
        subscriptionPlan: { findUnique: mockPlanFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        subscriptionPayment: {
                findFirst: mockPaymentFindFirst,
                create: mockPaymentCreate,
                update: mockPaymentUpdate,
        },
        telegramBroadcastTarget: { findMany: mockBroadcastTargets },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({ requireAuth: () => Promise.resolve(authHolder.value) }));
vi.mock('@/lib/telegram-admin', () => ({ getAdminTelegramIds: mockAdminIds }));
vi.mock('@/lib/config', () => ({ getDecryptedBotToken: mockBotToken }));
vi.mock('@/lib/telegram-api', () => ({ sendMessageWithKeyboard: mockSendKeyboard }));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const PLANS: Record<number, Record<string, unknown>> = {
        1: { id: 1, name: 'basic', nameAr: 'أساسية', isActive: true, price: 49, sortOrder: 1 },
        3: { id: 3, name: 'pro', nameAr: 'احترافية', isActive: true, price: 149, sortOrder: 3 },
};

const SUBSCRIBE_BODY = {
        phone: '0912345678',
        amount: 49,
        provider: 'libyana',
        planId: 1,
        tempUsername: 'newuser',
};

const UPGRADE_BODY = {
        planId: 3,
        phone: '0912345678',
        provider: 'bank',
        amount: 149,
        upgradeRestaurantId: 9,
        senderAccountName: 'سالم محمد',
        senderAccountNumber: '1234567890',
};

/** The race loser's error: the DB partial unique index rejects the insert. */
function p2002() {
        return Object.assign(
                new Error('Unique constraint failed on the constraint: `SubscriptionPayment_pending_user_unique`'),
                { code: 'P2002', meta: { target: 'SubscriptionPayment_pending_user_unique' } }
        );
}

async function callSubscriptionsPost(body: unknown) {
        const { POST } = await import('@/app/api/subscriptions/route');
        return POST(
                new NextRequest('http://localhost/api/subscriptions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-real-ip': '1.2.3.4' },
                        body: JSON.stringify(body),
                })
        );
}

async function callUpgradePost(body: unknown) {
        const { POST } = await import('@/app/api/subscriptions/upgrade/route');
        return POST(
                new NextRequest('http://localhost/api/subscriptions/upgrade', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-real-ip': '1.2.3.4' },
                        body: JSON.stringify(body),
                })
        );
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 7, permissions: [] };
        mockRateCheck.mockResolvedValue({ success: true, remaining: 4, reset: 0 });
        mockUserFindUnique.mockResolvedValue(null); // tempUsername free
        mockRestaurantFindUnique.mockResolvedValue(null); // slugs free
        mockPlanFindUnique.mockImplementation(async (args: { where: { id: number } }) => ({
                ...(PLANS[args.where.id] ?? null),
        }));
        // both pending probes free by default (the race starts from a clean slate)
        mockPaymentFindFirst.mockResolvedValue(null);
        mockPaymentCreate.mockResolvedValue({ id: 501, metadata: {} });
        mockPaymentUpdate.mockResolvedValue({ id: 501 });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockBroadcastTargets.mockResolvedValue([]);
        mockAdminIds.mockResolvedValue([123]);
        mockBotToken.mockResolvedValue('mock-token');
        mockSendKeyboard.mockResolvedValue({ message_id: 77 });
});

// ── POST /api/subscriptions — the DB-index race loser ───────────────────

describe('POST /api/subscriptions — T2 unique pending payment', () => {
        it('create throws P2002 (concurrent duplicate) → 409 «لديك طلب دفع معلق بالفعل», no telegram broadcast', async () => {
                mockPaymentCreate.mockRejectedValue(p2002());

                const res = await callSubscriptionsPost(SUBSCRIBE_BODY);

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لديك طلب دفع معلق بالفعل');
                // the loser's payment was never created → no approver keyboard
                // is broadcast for a row that does not exist
                expect(mockSendKeyboard).not.toHaveBeenCalled();
                expect(mockPaymentUpdate).not.toHaveBeenCalled();
        });

        it('non-P2002 create failure still propagates (500 via handleError) — no swallow', async () => {
                mockPaymentCreate.mockRejectedValue(new Error('db exploded'));

                const res = await callSubscriptionsPost(SUBSCRIBE_BODY);

                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
        });

        it('the initial probe stays 400 (fast path UX preserved)', async () => {
                mockPaymentFindFirst.mockResolvedValue({ id: 402, status: 'pending' });

                const res = await callSubscriptionsPost(SUBSCRIBE_BODY);

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('لديك طلب دفع معلق بالفعل');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });
});

// ── POST /api/subscriptions/upgrade — same race, same contract ──────────

describe('POST /api/subscriptions/upgrade — T2 unique pending payment', () => {
        beforeEach(() => {
                // owner of restaurant 9 (passes the ownership IDOR check)
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 9, userId: 7, permissions: [] };
                mockRestaurantFindUnique.mockResolvedValue({ id: 9, planId: null });
        });

        it('create throws P2002 (concurrent duplicate) → 409 «لديك طلب دفع معلق بالفعل»', async () => {
                mockPaymentCreate.mockRejectedValue(p2002());

                const res = await callUpgradePost(UPGRADE_BODY);

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لديك طلب دفع معلق بالفعل');
                expect(mockSendKeyboard).not.toHaveBeenCalled();
        });

        it('non-P2002 create failure still propagates (500 via handleError)', async () => {
                mockPaymentCreate.mockRejectedValue(new Error('db exploded'));

                const res = await callUpgradePost(UPGRADE_BODY);

                expect(res.status).toBe(500);
        });

        it('the user-pending probe stays 400 (fast path UX preserved)', async () => {
                mockPaymentFindFirst.mockImplementation(
                        async (args: { where: Record<string, unknown> }) =>
                                args.where.metadata ? null : { id: 402, status: 'pending' }
                );

                const res = await callUpgradePost(UPGRADE_BODY);

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('لديك طلب دفع معلق بالفعل');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });
});
