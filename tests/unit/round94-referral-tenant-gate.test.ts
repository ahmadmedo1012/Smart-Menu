/**
 * round94-3a (W1-a أمن — تقرير B HIGH-1 §1): بوابة نطاق المستأجر على
 * POST /api/loyalty/referral.
 *
 * الخلل: البوابة كانت requireAuth وحدها — أي حساب USER مجاني (ينشئه
 * auth/register بلا أي كلفة) كان ينشئ صفوف إحالة pending بكود صالح
 * وبأرقام هواتف عملاء مطعم الضحية؛ التحويل التلقائي عند إكمال طلباتهم
 * (referral-conversion.ts) يمنح بطاقة المهاجم 10% نقاطًا — 50 د.ل =
 * وجبة مجانية كاملة (5 نقاط). المسار يتيم في الواجهة (لا مستهلك fetch)،
 * والمسار الشرعي المجهول /api/referrals/claim يربط الهاتف ببصمة الجلسة.
 *
 * الإصلاح المُختبر (سلّم loyalty/redeem نفسه):
 *   - USER وأي دور غير معروف → 403 مطلقًا (حشو رقم غريب لا يمر إطلاقًا)
 *   - مالك مطعم آخر بلا رابط userRestaurant → 403 (مع فحص الرابط)
 *   - مالك مرتبط (متعدد المنيوهات) أو مالك المطعم نفسه → 201
 *   - admin/sub_admin بلا APPROVE_ORDERS → 403 · معها → 201 · super_admin → 201
 *
 * النمط: loyalty-referral.test.ts (mocks hoisted + limiter قابل للتحكم +
 * tx-mock يسلم نفس الجواسيس) — لا DB حقيقية.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'USER' as string,
                restaurantId: null as number | null,
                userId: 7 as number,
                permissions: [] as string[],
        },
}));

const mockCardFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockReferralCount = vi.hoisted(() => vi.fn());
const mockReferralCreate = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        loyaltyCard: { findUnique: mockCardFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        referral: { count: mockReferralCount, create: mockReferralCreate },
        $queryRaw: mockQueryRaw,
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({ requireAuth: () => Promise.resolve(authHolder.value) }));

// ── Fixtures ────────────────────────────────────────────────────────────

/** بطاقة ولاء مطعم 7 — هدف حشو الأرقام. */
const CARD = {
        id: 11,
        referralCode: 'WAHAXYZ',
        customerPhone: '0922222222',
        restaurantId: 7,
};

/** رقم هاتف ضحية تخميني (عميل حقيقي لمطعم 7 عند الدفع). */
const VICTIM_PHONE = '0933333333';

const OWNER_OK = { authorized: true, role: 'owner', restaurantId: 7, userId: 70, permissions: [] };
const OWNER_OTHER = { authorized: true, role: 'owner', restaurantId: 99, userId: 90, permissions: [] };

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 7, permissions: [] };
        mockRateCheck.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
        mockCardFindUnique.mockResolvedValue({ ...CARD });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockReferralCount.mockResolvedValue(0); // بعيد عن السقف
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

async function callPost(body: unknown, ip = '1.2.3.4') {
        const { POST } = await import('@/app/api/loyalty/referral/route');
        return POST(
                new NextRequest('http://localhost/api/loyalty/referral', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
                        body: JSON.stringify(body),
                })
        );
}

const stuffBody = { referralCode: 'WAHAXYZ', referredPhone: VICTIM_PHONE, referredName: 'ضحية' };

// ── السالب: احتيال الحشو يُغلق ─────────────────────────────────────────

describe('round94 HIGH-1 — POST /api/loyalty/referral: بوابة النطاق (الحالات السالبة)', () => {
        it('USER مجاني + كود صالح + هاتف ضحية → 403 ولا يُنشأ أي صف pending (الحشو ميت عند البوابة)', async () => {
                const res = await callPost(stuffBody);

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('غير مصرح');
                // لا صف إحالة، ولا معاملة، ولا عدّ — الخدمة المالية لم تُلمس
                expect(mockReferralCreate).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockReferralCount).not.toHaveBeenCalled();
        });

        it('مالك مطعم آخر (99) بلا رابط userRestaurant → 403 مع فحص الرابط بالمفتاح المركّب الصحيح', async () => {
                authHolder.value = { ...OWNER_OTHER };

                const res = await callPost(stuffBody);

                expect(res.status).toBe(403);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 90, restaurantId: 7 } },
                });
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('admin/sub_admin بلا APPROVE_ORDERS → 403 (لا حشو عبر حساب طاقم بلا صلاحية)', async () => {
                authHolder.value = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 5, permissions: [] };

                const res = await callPost(stuffBody);

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('دور غير معروف (string حر) → 403 برفض افتراضي — لا يمر أبدًا', async () => {
                authHolder.value = { authorized: true, role: 'waiter', restaurantId: 7, userId: 8, permissions: [] };

                const res = await callPost(stuffBody);

                expect(res.status).toBe(403);
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });
});

// ── الإيجابي: المالك الشرعي يبقى يعمل ──────────────────────────────────

describe('round94 HIGH-1 — POST /api/loyalty/referral: المالك الشرعي (الحالات الإيجابية)', () => {
        it('مالك مطعم البطاقة (مطابقة رئيسية restaurantId=7) → 201 بدون فحص رابط', async () => {
                authHolder.value = { ...OWNER_OK };

                const res = await callPost(stuffBody);

                expect(res.status).toBe(201);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                expect(mockReferralCreate).toHaveBeenCalledWith({
                        data: expect.objectContaining({
                                referralCode: 'WAHAXYZ',
                                referrerId: 11,
                                referredPhone: VICTIM_PHONE,
                                status: 'pending',
                                restaurantId: 7,
                        }),
                });
        });

        it('مالك مرتبط بمطعم البطاقة عبر userRestaurant (متعدد المنيوهات) → 201', async () => {
                authHolder.value = { ...OWNER_OTHER };
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 90, restaurantId: 7 });

                const res = await callPost(stuffBody);

                expect(res.status).toBe(201);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 90, restaurantId: 7 } },
                });
        });

        it('sub_admin مع APPROVE_ORDERS → 201 (الطاقم المصرّح له)', async () => {
                authHolder.value = {
                        authorized: true,
                        role: 'sub_admin',
                        restaurantId: null,
                        userId: 5,
                        permissions: ['APPROVE_ORDERS'],
                };

                const res = await callPost(stuffBody);

                expect(res.status).toBe(201);
        });

        it('super_admin → 201 (أعلى الدرجات كما في redeem)', async () => {
                authHolder.value = { authorized: true, role: 'super_admin', restaurantId: null, userId: 1, permissions: [] };

                const res = await callPost(stuffBody);

                expect(res.status).toBe(201);
        });
});
