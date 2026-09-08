/**
 * Round89-D1 (w1-d1) — /api/loyalty/referral unit coverage (was 0% lcov,
 * 115 lines). The referral claim money path with mocked prisma + a
 * controllable limiter — no real DB.
 *
 * Behaviors read from the route source:
 * POST (authenticated claim — round94-3a: the caller fixture is now a
 * legitimate OWNER of the card's restaurant; USER/staff gate cells moved
 * to round94-referral-tenant-gate.test.ts after the tenant gate landed):
 *   - auth gate (401) + per-IP limiter bucket referral:<ip> (429)
 *   - referralSchema.parse (NOT safeParse) → ZodError → handleError → 422
 *     validation envelope
 *   - unknown code → 404
 *   - self-referral guard (round-77): normalized digit compare, and the
 *     00-prefix international form does NOT trip it
 *   - per-code conversion cap (10) → 400
 *   - claim creation: pending row bound to the CARD id + its restaurant
 * GET (public code lookup):
 *   - missing code param → 400 · public limiter bucket referral-get:<ip>
 *   - unknown code → 404
 *   - round85-A2: response discloses ONLY the restaurant — no referrer
 *     name/PII on the unauthenticated path
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true,
                role: 'USER',
                restaurantId: null as number | null,
                userId: 7,
                permissions: [] as string[],
        },
}));

const mockCardFindUnique = vi.hoisted(() => vi.fn());
const mockReferralCount = vi.hoisted(() => vi.fn());
const mockReferralCreate = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
// round94-3a: سلّم نطاق المستأجر يفحص رابط المالك عبر userRestaurant
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        loyaltyCard: { findUnique: mockCardFindUnique },
        referral: { count: mockReferralCount, create: mockReferralCreate },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        // round90-F1 (T3): the claim cap check + create now run inside ONE
        // $transaction with a FOR UPDATE lock on the referrer card row. The tx
        // mock hands the SAME spies to the transaction client so every existing
        // assertion on referral.count / referral.create keeps passing.
        $queryRaw: mockQueryRaw,
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({ requireAuth: () => Promise.resolve(authHolder.value) }));

// ── Fixtures ────────────────────────────────────────────────────────────

const CARD = {
        id: 11,
        referralCode: 'WAHAXYZ',
        customerPhone: '0922222222',
        restaurantId: 7,
};

const RESTAURANT = {
        id: 7,
        name: 'مقهى الواحة',
        slug: 'waha',
        logo: null,
        description: 'قهوة وليبي',
        themeColor: '#0f766e',
        whatsapp: '0911111111',
        currency: 'LYD',
};

async function callReferralPost(body: unknown, ip = '1.2.3.4') {
        const { POST } = await import('@/app/api/loyalty/referral/route');
        const req = new NextRequest('http://localhost/api/loyalty/referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
                body: JSON.stringify(body),
        });
        return POST(req);
}

async function callReferralGet(query: string, ip = '1.2.3.4') {
        const { GET } = await import('@/app/api/loyalty/referral/route');
        const req = new NextRequest(`http://localhost/api/loyalty/referral${query}`, {
                method: 'GET',
                headers: { 'x-real-ip': ip },
        });
        return GET(req);
}

const claimBody = { referralCode: 'WAHAXYZ' };

beforeEach(() => {
        vi.clearAllMocks();
        // round94-3a (تقرير B HIGH-1): المسار صار ببوابة نطاق — المتصل
        // الافتراضي مالك شرعي لمطعم البطاقة (مطابقة رئيسية restaurantId=7)
        // فلا يحتاج رابط userRestaurant. خلايا الرفض في ملف البوابة الجديد.
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 7, userId: 70, permissions: [] };
        mockRateCheck.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
        mockCardFindUnique.mockResolvedValue({ ...CARD });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockReferralCount.mockResolvedValue(3); // under the cap of 10
        mockReferralCreate.mockResolvedValue({
                id: 55,
                referralCode: 'WAHAXYZ',
                referrerId: 11,
                status: 'pending',
        });
        mockTransaction.mockImplementation(
                async (fn: (tx: unknown) => Promise<unknown>) =>
                        fn({
                                $queryRaw: mockQueryRaw,
                                referral: { count: mockReferralCount, create: mockReferralCreate },
                        })
        );
});

// ── POST — the claim money path ─────────────────────────────────────────

describe('POST /api/loyalty/referral — claim creation', () => {
        it('happy path: pending referral bound to the card id + its restaurant (201)', async () => {
                const res = await callReferralPost({
                        referralCode: 'WAHAXYZ',
                        referredPhone: '0933333333',
                        referredName: 'سالم',
                });

                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.id).toBe(55);

                expect(mockCardFindUnique).toHaveBeenCalledWith({ where: { referralCode: 'WAHAXYZ' } });
                expect(mockReferralCreate).toHaveBeenCalledWith({
                        data: {
                                referralCode: 'WAHAXYZ',
                                referrerId: 11, // the CARD id — money goes to the card
                                referredPhone: '0933333333',
                                referredName: 'سالم',
                                status: 'pending',
                                restaurantId: 7,
                        },
                });
        });

        it('optional referredPhone/referredName default to empty strings', async () => {
                const res = await callReferralPost(claimBody);

                expect(res.status).toBe(201);
                expect(mockReferralCreate).toHaveBeenCalledWith({
                        data: expect.objectContaining({ referredPhone: '', referredName: '' }),
                });
        });

        it('unknown referral code → 404, no claim created', async () => {
                mockCardFindUnique.mockResolvedValue(null);

                const res = await callReferralPost({ ...claimBody, referredPhone: '0933333333' });

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('كود إحالة غير صالح');
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('self-referral (same digits after normalization) → 400, no claim', async () => {
                const res = await callReferralPost({ ...claimBody, referredPhone: '092-222-2222' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('لا يمكنك استخدام كود الإحالة الخاص بك');
                expect(mockReferralCount).not.toHaveBeenCalled();
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('00-prefix international form of ANOTHER line does NOT trip the self-referral guard', async () => {
                const res = await callReferralPost({ ...claimBody, referredPhone: '00218933333333' });

                expect(res.status).toBe(201);
                // 00218933333333 → 218933333333 ≠ 0922222222 — legitimate claim
                expect(mockReferralCreate).toHaveBeenCalled();
        });

        it('code at the conversion cap (10 converted) → 400, no claim', async () => {
                mockReferralCount.mockResolvedValue(10);

                const res = await callReferralPost({ ...claimBody, referredPhone: '0933333333' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('لقد وصل كود الإحالة إلى الحد الأقصى من الاستخدامات');
                // the cap counts CONVERTED referrals for this exact code
                expect(mockReferralCount).toHaveBeenCalledWith({
                        where: { referralCode: 'WAHAXYZ', status: 'converted' },
                });
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('schema violation (empty code) → 422 validation envelope (parse throws → handleError)', async () => {
                const res = await callReferralPost({ referralCode: '' });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(Array.isArray(json.details)).toBe(true);
                expect(mockCardFindUnique).not.toHaveBeenCalled();
        });

        it('schema violation (referredName over 50 chars, round87-A4 bound) → 422', async () => {
                const res = await callReferralPost({ ...claimBody, referredName: 'x'.repeat(51) });

                expect(res.status).toBe(422);
        });

        it('unauthenticated → 401', async () => {
                authHolder.value = { authorized: false, role: 'USER', restaurantId: null, userId: 7, permissions: [] };

                const res = await callReferralPost(claimBody);

                expect(res.status).toBe(401);
                expect(mockRateCheck).not.toHaveBeenCalled();
        });

        it('rate-limited IP → 429 with the bucket key referral:<ip>, zero DB reads', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callReferralPost(claimBody);

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.error).toBe('طلبات كثيرة — حاول لاحقاً');
                expect(mockRateCheck).toHaveBeenCalledWith('referral:1.2.3.4');
                expect(mockCardFindUnique).not.toHaveBeenCalled();
        });
});

// ── GET — the public code lookup ────────────────────────────────────────

describe('GET /api/loyalty/referral — public code lookup (PII guard)', () => {
        it('happy path: returns ONLY {referralCode, restaurant} — no referrer name/PII', async () => {
                mockCardFindUnique.mockResolvedValue({ ...CARD, restaurant: { ...RESTAURANT } });

                const res = await callReferralGet('?code=WAHAXYZ');

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.referralCode).toBe('WAHAXYZ');
                expect(json.data.restaurant).toEqual(RESTAURANT);
                // round85-A2: the unauthenticated response must not disclose
                // the card holder's identity
                expect(json.data).not.toHaveProperty('referrerName');
                expect(json.data).not.toHaveProperty('customerName');
                expect(json.data).not.toHaveProperty('customerPhone');
                expect(JSON.stringify(json.data)).not.toContain('0922222222');
        });

        it('restaurant include selects exactly the public fields', async () => {
                mockCardFindUnique.mockResolvedValue({ ...CARD, restaurant: { ...RESTAURANT } });

                await callReferralGet('?code=WAHAXYZ');

                expect(mockCardFindUnique).toHaveBeenCalledWith({
                        where: { referralCode: 'WAHAXYZ' },
                        include: {
                                restaurant: {
                                        select: {
                                                id: true,
                                                name: true,
                                                slug: true,
                                                logo: true,
                                                description: true,
                                                themeColor: true,
                                                whatsapp: true,
                                                currency: true,
                                        },
                                },
                        },
                });
        });

        it('unknown code → 404', async () => {
                mockCardFindUnique.mockResolvedValue(null);

                const res = await callReferralGet('?code=NOPE');

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('كود الإحالة غير موجود');
        });

        it('missing code param → 400 before the limiter', async () => {
                const res = await callReferralGet('');

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('معامل الاستعلام code مطلوب');
                expect(mockRateCheck).not.toHaveBeenCalled();
        });

        it('rate-limited IP → 429 with the public bucket key referral-get:<ip>', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callReferralGet('?code=WAHAXYZ');

                expect(res.status).toBe(429);
                expect(mockRateCheck).toHaveBeenCalledWith('referral-get:1.2.3.4');
                expect(mockCardFindUnique).not.toHaveBeenCalled();
        });
});
