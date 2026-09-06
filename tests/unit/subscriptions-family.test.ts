/**
 * Round89-D1 (w1-d1) — subscriptions family unit coverage (was 0% lcov):
 *   - POST /api/subscriptions        (payment creation, 188 lines)
 *   - POST /api/subscriptions/validate (public username/slug availability)
 *   - GET  /api/subscriptions/status   (payment status polling)
 *
 * Mocked prisma + limiter + telegram senders — same hoisted pattern as
 * subscriptions-upgrade.test.ts. Behaviors read from the route sources:
 *   - the mobile-wallet 99 LYD cap with its dedicated message, bank bypass
 *   - pre-flight uniqueness: tempUsername (409, self allowed), temp slugs
 *     (existing restaurant 409 / pending payment 409)
 *   - pending-payment guard + server-side price validation
 *   - validate: the {valid:false, errors} 200-shape vs the 400 _form shape
 *   - status: tenant filter (findFirst on id+userId), id validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true,
                role: 'USER',
                restaurantId: null,
                userId: 7,
                permissions: [] as string[],
        },
}));

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockPlanFindUnique = vi.hoisted(() => vi.fn());
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
        1: { id: 1, name: 'basic', nameAr: 'أساسية', isActive: true, price: 49 },
        2: { id: 2, name: 'plus', nameAr: 'متقدمة', isActive: false, price: 79 },
        3: { id: 3, name: 'pro', nameAr: 'احترافية', isActive: true, price: 129 },
};

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 7, permissions: [] };

        mockRateCheck.mockResolvedValue({ success: true, remaining: 4, reset: 0 });
        mockUserFindUnique.mockResolvedValue(null); // tempUsername free
        mockRestaurantFindUnique.mockResolvedValue(null); // every slug free
        mockPlanFindUnique.mockImplementation(
                async (args: { where: { id: number; isActive?: boolean } }) => {
                        const plan = PLANS[args.where.id];
                        if (!plan) return null;
                        if (args.where.isActive !== undefined && args.where.isActive !== plan.isActive) return null;
                        return { ...plan };
                }
        );
        // findFirst serves the slug-pending probe (metadata filter) and the
        // user-pending probe — both free by default
        mockPaymentFindFirst.mockImplementation(async (args: { where: Record<string, unknown> }) =>
                args.where.metadata ? null : null
        );
        mockPaymentCreate.mockResolvedValue({
                id: 501,
                metadata: { tempUsername: 'newuser', tempRestaurants: [] },
        });
        mockPaymentUpdate.mockResolvedValue({ id: 501 });
        mockBroadcastTargets.mockResolvedValue([]);
        mockAdminIds.mockResolvedValue([123]);
        mockBotToken.mockResolvedValue('mock-token');
        mockSendKeyboard.mockResolvedValue({ message_id: 77 });
});

// ── POST /api/subscriptions ─────────────────────────────────────────────

async function callSubscriptionsPost(body: unknown, ip = '1.2.3.4') {
        const { POST } = await import('@/app/api/subscriptions/route');
        const req = new NextRequest('http://localhost/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
                body: JSON.stringify(body),
        });
        return POST(req);
}

function subscribeBody(overrides: Record<string, unknown> = {}) {
        return {
                phone: '0912345678',
                amount: 49,
                provider: 'libyana',
                planId: 1,
                tempUsername: 'newuser',
                ...overrides,
        };
}

describe('POST /api/subscriptions — happy path & money guards', () => {
        it('creates a pending payment with the SERVER price and metadata, then notifies approvers', async () => {
                const res = await callSubscriptionsPost(
                        subscribeBody({
                                tempRestaurants: [{ name: 'مقهى الواحة', slug: 'waha' }],
                        })
                );

                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.data).toEqual({ id: 501 });

                expect(mockPaymentCreate).toHaveBeenCalledTimes(1);
                const createArg = mockPaymentCreate.mock.calls[0][0];
                expect(createArg.data.amount).toBe(49); // DB plan price
                expect(createArg.data.planId).toBe(1);
                expect(createArg.data.planName).toBe('أساسية');
                expect(createArg.data.status).toBe('pending');
                expect(createArg.data.provider).toBe('libyana');
                expect(createArg.data.phone).toBe('0912345678');
                expect(createArg.data.userId).toBe(7);
                expect(createArg.data.metadata).toEqual({
                        tempUsername: 'newuser',
                        tempRestaurants: [{ name: 'مقهى الواحة', slug: 'waha' }],
                        telegramMessages: [],
                });

                // approver keyboard (activation wording, sub_app/sub_rej callbacks)
                expect(mockSendKeyboard).toHaveBeenCalledTimes(1);
                const [token, chatId, msg, keyboard] = mockSendKeyboard.mock.calls[0];
                expect(token).toBe('mock-token');
                expect(chatId).toBe('123');
                expect(msg).toContain('طلب اشتراك جديد');
                expect(msg).toContain('#501');
                expect(keyboard).toEqual([
                        [{ text: '🟢 موافقة على التفعيل', callbackData: 'sub_app:501' }],
                        [{ text: '🔴 رفض الطلب', callbackData: 'sub_rej:501' }],
                ]);
        });

        it('unauthenticated → 401 before any DB work', async () => {
                authHolder.value = { authorized: false, role: 'USER', restaurantId: null, userId: 7, permissions: [] };

                const res = await callSubscriptionsPost(subscribeBody());

                expect(res.status).toBe(401);
                expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        it('rate-limited IP → 429 with the bucket key sub:<ip>', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callSubscriptionsPost(subscribeBody());

                expect(res.status).toBe(429);
                expect(mockRateCheck).toHaveBeenCalledWith('sub:1.2.3.4');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('wallet amount above the 99 LYD cap → 400 with the bank-transfer message', async () => {
                const res = await callSubscriptionsPost(subscribeBody({ amount: 129 })); // libyana

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe(
                        'المبالغ فوق 99 د.ل تتطلب تحويل بنكي — اختر طريقة الدفع "تحويل بنكي"'
                );
                expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        it('bank transfer above 99 LYD → allowed; sender fields + telegramMessages in metadata', async () => {
                const res = await callSubscriptionsPost(
                        subscribeBody({
                                planId: 3,
                                amount: 129,
                                provider: 'bank',
                                senderAccountName: 'أحمد المهدي',
                                senderAccountNumber: '00203004005',
                        })
                );

                expect(res.status).toBe(201);
                const createArg = mockPaymentCreate.mock.calls[0][0];
                expect(createArg.data.amount).toBe(129);
                expect(createArg.data.metadata).toEqual({
                        tempUsername: 'newuser',
                        tempRestaurants: [],
                        senderAccountName: 'أحمد المهدي',
                        senderAccountNumber: '00203004005',
                        receiptImageUrl: null,
                        telegramMessages: [],
                });
        });

        it('tempUsername already taken by ANOTHER user → 409', async () => {
                mockUserFindUnique.mockResolvedValue({ id: 999 });

                const res = await callSubscriptionsPost(subscribeBody());

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('اسم المستخدم مستخدم بالفعل');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('tempUsername matching the CURRENT user is allowed (already registered)', async () => {
                mockUserFindUnique.mockResolvedValue({ id: 7 });

                const res = await callSubscriptionsPost(subscribeBody());

                expect(res.status).toBe(201);
        });

        it('slug already owned by an existing restaurant → 409 with the slug in the message', async () => {
                mockRestaurantFindUnique.mockResolvedValue({ id: 30, slug: 'waha' });

                const res = await callSubscriptionsPost(
                        subscribeBody({ tempRestaurants: [{ name: 'مقهى', slug: 'waha' }] })
                );

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('الرابط waha محجوز مسبقاً');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('slug held by a PENDING payment → 409 pending message (metadata array_contains probe)', async () => {
                mockPaymentFindFirst.mockImplementation(
                        async (args: { where: Record<string, unknown> }) =>
                                args.where.metadata ? { id: 300, status: 'pending' } : null
                );

                const res = await callSubscriptionsPost(
                        subscribeBody({ tempRestaurants: [{ name: 'مقهى', slug: 'waha' }] })
                );

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('الرابط waha محجوز بطلب دفع معلق');
                expect(mockPaymentFindFirst).toHaveBeenCalledWith({
                        where: {
                                status: 'pending',
                                metadata: {
                                        path: ['tempRestaurants'],
                                        array_contains: [{ slug: 'waha' }],
                                },
                        },
                });
        });

        it('user already has a pending payment → 400', async () => {
                mockPaymentFindFirst.mockImplementation(
                        async (args: { where: Record<string, unknown> }) =>
                                args.where.metadata ? null : { id: 400, status: 'pending' }
                );

                const res = await callSubscriptionsPost(subscribeBody());

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('لديك طلب دفع معلق بالفعل');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('plan inactive → 400 الباقة غير صالحة', async () => {
                const res = await callSubscriptionsPost(subscribeBody({ planId: 2, amount: 79 }));

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('الباقة غير صالحة');
        });

        it('amount ≠ plan price → 400 (server-side price validation)', async () => {
                const res = await callSubscriptionsPost(subscribeBody({ amount: 48 }));

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('المبلغ لا يطابق سعر الباقة');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });

        it('Arabic-Indic digit phone is REJECTED by the regex before normalizeDigits can run (documented quirk)', async () => {
                // '٠٩١٢٣٤٥٦٧٨' → normalizeDigits would map it to 0912345678, but
                // the /^09\d{8}$/ check runs FIRST (\d never matches ٠-٩) — the
                // transform is unreachable for the input it was built for.
                const res = await callSubscriptionsPost(subscribeBody({ phone: '٠٩١٢٣٤٥٦٧٨' }));

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 09');
                expect(mockPaymentCreate).not.toHaveBeenCalled();
        });
});

// ── POST /api/subscriptions/validate ────────────────────────────────────

async function callValidatePost(body: unknown, ip = '1.2.3.4') {
        const { POST } = await import('@/app/api/subscriptions/validate/route');
        const req = new NextRequest('http://localhost/api/subscriptions/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
                body: JSON.stringify(body),
        });
        return POST(req);
}

describe('POST /api/subscriptions/validate — public availability check', () => {
        it('everything free → 200 {valid: true} (public — no auth cookie needed)', async () => {
                const res = await callValidatePost({ username: 'newuser', slug: 'waha' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ valid: true });
        });

        it('rate-limited IP → 429 with the bucket key validate:<ip>', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callValidatePost({ username: 'newuser' });

                expect(res.status).toBe(429);
                expect(mockRateCheck).toHaveBeenCalledWith('validate:1.2.3.4');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        it('username AND slug both taken → 200 with both field errors together', async () => {
                mockUserFindUnique.mockResolvedValue({ id: 999 });
                mockRestaurantFindUnique.mockResolvedValue({ id: 30, slug: 'waha' });

                const res = await callValidatePost({ username: 'taken', slug: 'waha' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.valid).toBe(false);
                expect(json.data.errors).toEqual({
                        username: 'اسم المستخدم مستخدم بالفعل',
                        slug: 'الرابط waha محجوز مسبقاً',
                });
        });

        it('slug held by a pending payment → 200 with the pending message', async () => {
                mockPaymentFindFirst.mockResolvedValue({ id: 300, status: 'pending' });

                const res = await callValidatePost({ slug: 'waha' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.valid).toBe(false);
                expect(json.data.errors.slug).toBe('الرابط waha محجوز بطلب دفع معلق');
        });

        it('slugs array: stops at the FIRST offending slug (break semantics)', async () => {
                mockRestaurantFindUnique.mockImplementation(
                        async (args: { where: { slug: string } }) =>
                                args.where.slug === 'second' ? { id: 30, slug: 'second' } : null
                );

                const res = await callValidatePost({ slugs: ['first', 'second', 'third'] });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.valid).toBe(false);
                expect(json.data.errors.slug).toBe('الرابط second محجوز مسبقاً');
                // first checked, second failed → third never queried
                expect(mockRestaurantFindUnique).toHaveBeenCalledTimes(2);
        });

        it('schema failure → 400 {valid:false, errors:{_form}} (not the error envelope)', async () => {
                const res = await callValidatePost({ slug: 'Bad_Slug' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.valid).toBe(false);
                expect(json.errors._form).toBe('الرابط يجب أن يحتوي على أحرف إنكليزية وأرقام فقط');
        });
});

// ── GET /api/subscriptions/status ───────────────────────────────────────

async function callStatusGet(query: string) {
        const { GET } = await import('@/app/api/subscriptions/status/route');
        const req = new NextRequest(`http://localhost/api/subscriptions/status${query}`, {
                method: 'GET',
        });
        return GET(req);
}

describe('GET /api/subscriptions/status — tenant-scoped polling', () => {
        it('unauthenticated → 401', async () => {
                authHolder.value = { authorized: false, role: 'USER', restaurantId: null, userId: 7, permissions: [] };

                const res = await callStatusGet('?id=501');

                expect(res.status).toBe(401);
                expect(mockPaymentFindFirst).not.toHaveBeenCalled();
        });

        it('missing id → 400 id is required', async () => {
                const res = await callStatusGet('');

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('id is required');
        });

        it('non-integer / non-positive id → 400', async () => {
                const res1 = await callStatusGet('?id=abc');
                const res2 = await callStatusGet('?id=-5');

                expect(res1.status).toBe(400);
                expect(res2.status).toBe(400);
        });

        it('found → 200 {id, status}; lookup is scoped to userId (tenant isolation)', async () => {
                mockPaymentFindFirst.mockResolvedValue({ id: 501, status: 'approved' });

                const res = await callStatusGet('?id=501');

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toEqual({ id: 501, status: 'approved' });
                expect(mockPaymentFindFirst).toHaveBeenCalledWith({
                        where: { id: 501, userId: 7 },
                        select: { id: true, status: true },
                });
        });

        it('payment of ANOTHER user (or unknown) → 404 not found', async () => {
                mockPaymentFindFirst.mockResolvedValue(null);

                const res = await callStatusGet('?id=501');

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('not found');
        });
});
