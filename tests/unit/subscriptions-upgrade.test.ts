/**
 * Round89-D1 (w1-d1) — POST /api/subscriptions/upgrade unit coverage
 * (was 0% lcov — the single heaviest untested money path, 225 lines).
 *
 * The upgrade money path with mocked prisma + a controllable rate limiter +
 * mocked telegram approver senders — no real DB, no network. Same hoisted
 * mock pattern as orders-create.test.ts / stats-permission.test.ts.
 *
 * Covered behaviors (all read from the route source, nothing invented):
 *   - auth gate (401) and per-IP limiter (429) before any DB work
 *   - mobile-wallet 99 LYD cap: wallet > 99 rejected BEFORE the plan lookup,
 *     bank transfers bypass the cap
 *   - server-side price validation (amount must equal the DB plan price) and
 *     plan active/exists guard
 *   - tier-direction guard: only strictly higher sortOrder upgrades (free
 *     current plans skip the tier check entirely)
 *   - IDOR ownership: owner of the restaurant OR admin/super_admin OR an
 *     explicit UserRestaurant link
 *   - double-pending guards: pending upgrade for the restaurant (metadata
 *     path probe) + pending payment for the user
 *   - approver telegram notification: approve/reject keyboard per admin chat,
 *     per-chat failure NEVER fails the request (partial results persisted),
 *     env fallback (TELEGRAM_CHAT_ID/TELEGRAM_GROUP_IDS) when no DB targets
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true,
                role: 'owner',
                restaurantId: 9,
                userId: 7,
                permissions: [] as string[],
        } as {
                authorized: boolean;
                role: string;
                restaurantId: number | null;
                userId: number;
                permissions: string[];
        },
}));

const mockPlanFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
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
        subscriptionPlan: { findUnique: mockPlanFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
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

/** Plan registry — the route looks plans up 1–3 times (main, current, new). */
const PLANS: Record<number, Record<string, unknown>> = {
        1: { id: 1, name: 'basic', nameAr: 'أساسية', isActive: true, price: 49, sortOrder: 1 },
        2: { id: 2, name: 'plus', nameAr: 'متقدمة', isActive: false, price: 79, sortOrder: 2 },
        3: { id: 3, name: 'pro', nameAr: 'احترافية', isActive: true, price: 149, sortOrder: 3 },
        4: { id: 4, name: 'trial', nameAr: 'تجريبية', isActive: true, price: 0, sortOrder: 0 },
};

/** Restaurants 8 and 9 exist; per-test mutation of planId via setRestaurant(). */
const restaurants: Record<number, { id: number; planId: number | null }> = {
        8: { id: 8, planId: null },
        9: { id: 9, planId: null },
};

function setRestaurant(id: number, planId: number | null) {
        restaurants[id] = { id, planId };
}

async function callPost(body: unknown, ip = '1.2.3.4') {
        const { POST } = await import('@/app/api/subscriptions/upgrade/route');
        const req = new NextRequest('http://localhost/api/subscriptions/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
                body: JSON.stringify(body),
        });
        return POST(req);
}

function upgradeBody(overrides: Record<string, unknown> = {}) {
        return {
                planId: 1,
                provider: 'libyana',
                amount: 49,
                upgradeRestaurantId: 9,
                phone: '0912345678',
                ...overrides,
        };
}

beforeEach(() => {
        vi.clearAllMocks();
        // delete (not `= undefined`) — assigning undefined stringifies to
        // "undefined" in Node and would leak a truthy chat id into the route
        delete (process.env as { TELEGRAM_CHAT_ID?: string; TELEGRAM_GROUP_IDS?: string })
                .TELEGRAM_CHAT_ID;
        delete (process.env as { TELEGRAM_CHAT_ID?: string; TELEGRAM_GROUP_IDS?: string })
                .TELEGRAM_GROUP_IDS;
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 9, userId: 7, permissions: [] };
        restaurants[8] = { id: 8, planId: null };
        restaurants[9] = { id: 9, planId: null };

        mockRateCheck.mockResolvedValue({ success: true, remaining: 4, reset: 0 });
        mockPlanFindUnique.mockImplementation(
                async (args: { where: { id: number; isActive?: boolean } }) => {
                        const plan = PLANS[args.where.id];
                        if (!plan) return null;
                        if (args.where.isActive !== undefined && args.where.isActive !== plan.isActive) return null;
                        return { ...plan };
                }
        );
        mockRestaurantFindUnique.mockImplementation(
                async (args: { where: { id: number } }) => restaurants[args.where.id] ?? null
        );
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        // no pending upgrade (metadata-path probe) and no pending user payment
        mockPaymentFindFirst.mockImplementation(async (args: { where: Record<string, unknown> }) =>
                args.where.metadata ? null : null
        );
        mockPaymentCreate.mockResolvedValue({
                id: 501,
                metadata: { upgradeRestaurantId: 9, currentPlanId: null },
        });
        mockPaymentUpdate.mockResolvedValue({ id: 501 });
        mockBroadcastTargets.mockResolvedValue([]);
        mockAdminIds.mockResolvedValue([123]);
        mockBotToken.mockResolvedValue('mock-token');
        mockSendKeyboard.mockResolvedValue({ message_id: 77 });
});

// ── The happy money path ────────────────────────────────────────────────

describe('POST /api/subscriptions/upgrade — happy path', () => {
        it('creates a pending payment with the SERVER plan price and notifies approvers with the approve/reject keyboard', async () => {
                const res = await callPost(upgradeBody());

                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ id: 501 });

                expect(mockPaymentCreate).toHaveBeenCalledTimes(1);
                const createArg = mockPaymentCreate.mock.calls[0][0];
                // the stored amount is the DB plan price — not the client number
                expect(createArg.data.amount).toBe(49);
                expect(createArg.data.status).toBe('pending');
                expect(createArg.data.provider).toBe('libyana');
                expect(createArg.data.planId).toBe(1);
                expect(createArg.data.planName).toBe('أساسية');
                expect(createArg.data.userId).toBe(7);
                expect(createArg.data.phone).toBe('0912345678');
                expect(createArg.data.metadata).toEqual({
                        upgradeRestaurantId: 9,
                        currentPlanId: null,
                });

                // one interactive keyboard per admin chat id
                expect(mockSendKeyboard).toHaveBeenCalledTimes(1);
                const [token, chatId, msg, keyboard, opts] = mockSendKeyboard.mock.calls[0];
                expect(token).toBe('mock-token');
                expect(chatId).toBe('123');
                expect(msg).toContain('#501');
                expect(msg).toContain('أساسية');
                expect(msg).toContain('49');
                expect(keyboard).toEqual([
                        [{ text: '🟢 موافقة على الترقية', callbackData: 'sub_app:501' }],
                        [{ text: '🔴 رفض الطلب', callbackData: 'sub_rej:501' }],
                ]);
                expect(opts).toEqual({ parseMode: 'Markdown' });

                // successful sends persisted so the webhook cleanup can edit them
                expect(mockPaymentUpdate).toHaveBeenCalledWith({
                        where: { id: 501 },
                        data: {
                                metadata: expect.objectContaining({
                                        telegramMessages: [{ chatId: 123, messageId: 77 }],
                                }),
                        },
                });
        });

        it('bank transfer above 99 LYD bypasses the wallet cap — sender details land in metadata', async () => {
                const res = await callPost(
                        upgradeBody({
                                planId: 3,
                                amount: 149,
                                provider: 'bank',
                                senderAccountName: 'أحمد المهدي',
                                senderAccountNumber: '00203004005',
                        })
                );

                expect(res.status).toBe(201);
                const createArg = mockPaymentCreate.mock.calls[0][0];
                expect(createArg.data.amount).toBe(149);
                expect(createArg.data.metadata).toEqual({
                        upgradeRestaurantId: 9,
                        currentPlanId: null,
                        senderAccountName: 'أحمد المهدي',
                        senderAccountNumber: '00203004005',
                        receiptImageUrl: null,
                });
        });

        it('upgrade to a strictly higher tier is allowed (sortOrder compared, not price)', async () => {
                setRestaurant(9, 1); // currently on basic (sortOrder 1, price 49 > 0)

                const res = await callPost(
                        upgradeBody({
                                planId: 3,
                                amount: 149,
                                provider: 'bank',
                                senderAccountName: 'أحمد',
                                senderAccountNumber: '123',
                        })
                );

                expect(res.status).toBe(201);
                expect(mockPaymentCreate).toHaveBeenCalledTimes(1);
        });

        it('current plan is FREE (price 0) → the tier check is skipped entirely (single plan lookup)', async () => {
                setRestaurant(9, 4); // trial — price 0

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(201);
                // main plan + current-plan lookups only — the NEW-plan tier
                // comparison lookup never runs for a free current plan
                expect(mockPlanFindUnique).toHaveBeenCalledTimes(2);
        });
});

// ── Guards: auth, rate limit, wallet cap, price, plan, restaurant ───────

describe('POST /api/subscriptions/upgrade — guards', () => {
        it('unauthenticated → 401 before any DB work', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: 9, userId: 7, permissions: [] };

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(401);
                const json = await res.json();
                expect(json.error).toBe('غير مصرح');
                expect(mockPlanFindUnique).not.toHaveBeenCalled();
        });

        it('rate-limited IP → 429 with the bucket key upgrade:<ip>, zero DB reads', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.error).toContain('محاولات كثيرة');
                expect(mockRateCheck).toHaveBeenCalledWith('upgrade:1.2.3.4');
                expect(mockPlanFindUnique).not.toHaveBeenCalled();
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('wallet amount above the 99 LYD cap → 400 BEFORE the plan lookup', async () => {
                const res = await callPost(upgradeBody({ planId: 3, amount: 149 })); // libyana

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('المبلغ لا يطابق سعر الباقة');
                // the cap check precedes every DB call
                expect(mockPlanFindUnique).not.toHaveBeenCalled();
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('amount ≠ DB plan price → 400 (client amount is never trusted)', async () => {
                const res = await callPost(upgradeBody({ amount: 48 }));

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('المبلغ لا يطابق سعر الباقة');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('plan exists but is inactive → 400', async () => {
                const res = await callPost(upgradeBody({ planId: 2, amount: 79 }));

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('الباقة غير موجودة أو غير نشطة');
        });

        it('unknown plan id → 400 (same message)', async () => {
                const res = await callPost(upgradeBody({ planId: 99, amount: 49 }));

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('الباقة غير موجودة أو غير نشطة');
        });

        it('unknown restaurant → 404 before any write', async () => {
                const res = await callPost(upgradeBody({ upgradeRestaurantId: 777 }));

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('المطعم غير موجود');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('same-or-lower tier (new sortOrder ≤ current) → 400', async () => {
                setRestaurant(9, 3); // on pro (sortOrder 3)

                const res = await callPost(upgradeBody()); // asks for basic (sortOrder 1)

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('الباقة المحددة ليست أعلى من باقتك الحالية');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('bank provider without senderAccountName → 400 schema refine message', async () => {
                const res = await callPost(
                        upgradeBody({ provider: 'bank', senderAccountNumber: '123' })
                );

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('اسم صاحب الحساب ورقم الحساب إجباريان للتحويل البنكي');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });
});

// ── Ownership (IDOR) ────────────────────────────────────────────────────

describe('POST /api/subscriptions/upgrade — ownership (IDOR)', () => {
        it('owner of ANOTHER restaurant without a UserRestaurant link → 403, no write', async () => {
                const res = await callPost(upgradeBody({ upgradeRestaurantId: 8 }));

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('لا تملك صلاحية ترقية هذا المطعم');
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 7, restaurantId: 8 } },
                });
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('owner with a UserRestaurant link to that restaurant → allowed (multi-menu)', async () => {
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 7, restaurantId: 8, isPrimary: false });

                const res = await callPost(upgradeBody({ upgradeRestaurantId: 8 }));

                expect(res.status).toBe(201);
        });

        it('admin (any restaurantId) bypasses the ownership check without a link lookup', async () => {
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 7, permissions: [] };

                const res = await callPost(upgradeBody({ upgradeRestaurantId: 8 }));

                expect(res.status).toBe(201);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });
});

// ── Double-pending guards ───────────────────────────────────────────────

describe('POST /api/subscriptions/upgrade — pending guards', () => {
        it('pending upgrade for the restaurant (metadata path probe) → 400', async () => {
                mockPaymentFindFirst.mockImplementation(
                        async (args: { where: Record<string, unknown> }) =>
                                args.where.metadata ? { id: 401, status: 'pending' } : null
                );

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('لديك طلب ترقية معلق بالفعل لهذا المطعم');
                // the probe filters on the metadata.upgradeRestaurantId JSON path
                expect(mockPaymentFindFirst).toHaveBeenCalledWith({
                        where: {
                                status: 'pending',
                                metadata: { path: ['upgradeRestaurantId'], equals: 9 },
                        },
                });
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('pending payment for the USER → 400', async () => {
                mockPaymentFindFirst.mockImplementation(
                        async (args: { where: Record<string, unknown> }) =>
                                args.where.metadata ? null : { id: 402, status: 'pending' }
                );

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('لديك طلب دفع معلق بالفعل');
                expect(mockPaymentFindFirst).toHaveBeenCalledWith({
                        where: { userId: 7, status: 'pending' },
                });
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });
});

// ── Approver telegram notification resilience ──────────────────────────

describe('POST /api/subscriptions/upgrade — telegram approver notification', () => {
        it('per-chat send failure is tolerated: request still 201, only successful sends persisted', async () => {
                mockAdminIds.mockResolvedValue([123, 456]);
                mockSendKeyboard.mockImplementation(async (_token: string, chatId: string) => {
                        if (chatId === '456') throw new Error('telegram 429');
                        return { message_id: 77 };
                });

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(201);
                expect(mockSendKeyboard).toHaveBeenCalledTimes(2);
                expect(mockLogError).toHaveBeenCalledWith('[upgrade] send failed', {
                        chatId: '456',
                        error: 'telegram 429',
                });
                // only the successful chat is persisted
                expect(mockPaymentUpdate).toHaveBeenCalledWith({
                        where: { id: 501 },
                        data: {
                                metadata: expect.objectContaining({
                                        telegramMessages: [{ chatId: 123, messageId: 77 }],
                                }),
                        },
                });
        });

        it('every send failing → still 201 (payment persisted), no metadata update', async () => {
                mockSendKeyboard.mockRejectedValue(new Error('network down'));

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(mockPaymentUpdate).not.toHaveBeenCalled();
        });

        it('no bot token configured → no sends at all, request still 201', async () => {
                mockBotToken.mockResolvedValue(null);

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(201);
                expect(mockSendKeyboard).not.toHaveBeenCalled();
                expect(mockPaymentUpdate).not.toHaveBeenCalled();
        });

        it('metadata update failing is swallowed (only logged) — the payment stays created', async () => {
                mockPaymentUpdate.mockRejectedValue(new Error('db gone'));

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(201);
                expect(mockLogError).toHaveBeenCalledWith(
                        '[upgrade] failed to store telegramMessages',
                        { error: 'db gone' }
                );
        });

        it('no DB targets → env fallback TELEGRAM_CHAT_ID + TELEGRAM_GROUP_IDS (parsed, trimmed, empties dropped)', async () => {
                mockAdminIds.mockResolvedValue([]);
                process.env.TELEGRAM_CHAT_ID = '555';
                process.env.TELEGRAM_GROUP_IDS = ' 11 , ,22 ';

                const res = await callPost(upgradeBody());

                expect(res.status).toBe(201);
                const sentTo = mockSendKeyboard.mock.calls.map((c) => c[1]).sort();
                expect(sentTo).toEqual(['11', '22', '555']);
        });
});
