/**
 * W7-B — G-4 من تدقيق W6-A3 (المؤجل عمدًا في W6-B6): عائلة بوابات حقوق
 * ميزات الخطة (plan FEATURE entitlements) — حتى W6-B6 لم تُفرض سوى سقوف
 * العدد (maxMenus/maxItems/maxOrders عبر PlanLimitError).
 *
 * القرارات الموثقة (كل قرار بدليل المصدر — انظر ENGINEERING_STATE «W7-B»):
 *   - «إحصائيات متقدمة»  → بريميوم+   (/api/stats/advanced: 403 قبل أي
 *     استعلام تجميعي؛ التبويب الأساسي «نظرة عامة» مفتوح للجميع)
 *   - «تصدير CSV»         → الاحترافية+ (مسار خادم مخصص /api/orders/export:
 *     403 قبل أي استعلام طلبات — التصدير كان تجميعًا حرًا في المتصفح)
 *   - «برنامج الإحالات»    → الاحترافية+ (loyalty/referral POST بعد سلّم
 *     المستأجر قبل أي كتابة؛ referrals/claim قبل أي إنشاء صف pending)
 *   - برنامج الولاء الأساسي يبقى عالميًا عمدًا (وجه الزبون الذي يقود
 *     الطلبات) — /api/loyalty يصدّر علم referralProgram فقط والواجهة
 *     تخفي بطاقة الإحالة دون الرتبة (غياب صادق لا قفل في وجه الزبون).
 *
 * هذا الملف يثبّت العقد بنمط عائلة W6-B6 (w6-b6-expiry-guard-family):
 *   - المالك دون الرتبة → 403 بنسخة العائلة حرفيًا قبل أي عمل قاعدة
 *     بيانات للميزة (صفر استعلامات/كتابات)؛
 *   - عيّنتان موجبتان لكل بوابة (فوق الرتبة يمرّ — السلوك القائم لا
 *     يتغير لمن يملك الحق)؛
 *   - عائلة الأدمن تتجاوز (نفس إصرار isOwnerSubscriptionActive)؛
 *   - عقد المصدر: نسخة الرفض حرفية واحدة في plan-entitlements-core،
 *     أسطر الخطط المتقاعدة زالت من البذرة، وهجرة البيانات name-keyed
 *     احتوائية idempotent (نمط r92).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// ── Hoisted mocks (المشترك بين كل المواقع) ──────────────────────────────

/** خطة المطعم تحت الاختبار — تتحكم بها كل حالة (null = مجاني/بلا صف خطة). */
const planHolder = vi.hoisted(() => ({ value: null as { name: string; nameAr: string; sortOrder: number } | null }));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 7 as number | null,
                userId: 70 as number | null,
                permissions: [] as string[],
        },
}));

const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockLoyaltyCardFindUnique = vi.hoisted(() => vi.fn());
const mockLoyaltyCardCreate = vi.hoisted(() => vi.fn());
const mockReferralFindFirst = vi.hoisted(() => vi.fn());
const mockReferralCount = vi.hoisted(() => vi.fn());
const mockReferralCreate = vi.hoisted(() => vi.fn());
const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockTransaction = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn(async () => ({ success: true, remaining: 9, reset: 0 })));
const cookieJar = vi.hoisted(() => ({ value: {} as Record<string, string | undefined> }));

const restaurantRowWithPlan = () =>
        planHolder.value ? { id: 7, slug: 'waha', plan: { ...planHolder.value } } : { id: 7, slug: 'waha', plan: null };

const cardRowWithPlan = () => ({
        id: 11,
        referralCode: 'WAHAXYZ',
        customerPhone: '0922222222',
        customerName: 'سالم',
        points: 5,
        totalOrders: 2,
        totalSpent: 80,
        tier: 'bronze',
        restaurantId: 7,
        restaurant: { id: 7, plan: planHolder.value ? { ...planHolder.value } : null },
});

const txMock = vi.hoisted(() => ({
        referral: { count: mockReferralCount, create: mockReferralCreate },
        loyaltyCard: { update: vi.fn() },
        rewardTransaction: { create: vi.fn() },
        systemEvent: { create: vi.fn().mockResolvedValue({}) },
        $queryRaw: mockQueryRaw,
}));

const mockPrisma = vi.hoisted(() => ({
        restaurant: { findUnique: mockRestaurantFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        loyaltyCard: { findUnique: mockLoyaltyCardFindUnique, create: mockLoyaltyCardCreate },
        referral: { findFirst: mockReferralFindFirst, count: mockReferralCount, create: mockReferralCreate },
        order: { findMany: mockOrderFindMany, count: mockOrderCount },
        orderItem: { groupBy: mockOrderItemGroupBy },
        menuItem: { findMany: mockMenuItemFindMany },
        systemEvent: { create: vi.fn().mockResolvedValue({}) },
        $queryRaw: mockQueryRaw,
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve(authHolder.value),
}));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('next/headers', () => ({
        cookies: async () => ({ get: (name: string) => ({ value: cookieJar.value[name] }) }),
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));

// ── ثوابت العائلة ───────────────────────────────────────────────────────

const COPY_PREMIUM = 'هذه الميزة متوفرة في خطة «بريميوم» فأعلى. قم بالترقية للمتابعة.';
const COPY_PRO = 'هذه الميزة متوفرة في خطة «الاحترافية» فأعلى. قم بالترقية للمتابعة.';

const FREE = null;
const BASIC = { name: 'Basic', nameAr: 'الأساسية', sortOrder: 2 };
const PREMIUM = { name: 'Premium', nameAr: 'بريميوم', sortOrder: 3 };
const PRO = { name: 'Pro', nameAr: 'الاحترافية', sortOrder: 4 };

beforeEach(() => {
        vi.clearAllMocks();
        planHolder.value = PRO;
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 7, userId: 70, permissions: [] };
        cookieJar.value = {};
        mockRateCheck.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
        // موجبات المسار الإيجابي: استعلامات التجميع لها قيم افتراضية سليمة
        // (vi.fn() بلا تنفيذ يعيد undefined فينفجر التجميع في 500 كاذب).
        mockQueryRaw.mockResolvedValue([]);
        mockOrderItemGroupBy.mockResolvedValue([]);
        mockOrderCount.mockResolvedValue(0);
        mockRestaurantFindUnique.mockImplementation(async () => restaurantRowWithPlan());
        mockLoyaltyCardFindUnique.mockImplementation(async () => cardRowWithPlan());
        mockUserRestaurantFindUnique.mockResolvedValue({ userId: 70, restaurantId: 7, isPrimary: false });
        mockReferralFindFirst.mockResolvedValue(null);
        mockReferralCount.mockResolvedValue(0);
        mockReferralCreate.mockResolvedValue({ id: 55, status: 'pending' });
        mockTransaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
        );
});

// ── 1. النواة النقية: الخريطة والقرار والنسخة ───────────────────────────

describe('W7-B — نواة plan-entitlements-core: رتب الميزات والنسخة الحرفية', () => {
        it('الخريطة: advancedStats بريميوم+ (رتبة 3) وcsvExport/referralProgram الاحترافية+ (رتبة 4)', async () => {
                const core = await import('@/lib/plan-entitlements-core');
                expect(core.PLAN_FEATURES.advancedStats.minSortOrder).toBe(3);
                expect(core.PLAN_FEATURES.advancedStats.minPlanNameAr).toBe('بريميوم');
                expect(core.PLAN_FEATURES.csvExport.minSortOrder).toBe(4);
                expect(core.PLAN_FEATURES.csvExport.minPlanNameAr).toBe('الاحترافية');
                expect(core.PLAN_FEATURES.referralProgram.minSortOrder).toBe(4);
                expect(core.PLAN_FEATURES.referralProgram.minPlanNameAr).toBe('الاحترافية');
        });

        it('planAllowsFeature: لا خطة (مجاني/مجهول) → لا ميزة؛ الأساسية → لا شيء؛ بريميوم → المتقدمة فقط؛ الاحترافية+ → الكل', async () => {
                const { planAllowsFeature } = await import('@/lib/plan-entitlements-core');
                // fail-closed: صف خطة غائب (planId فارغ = مجاني) لا يفتح ميزة
                expect(planAllowsFeature(FREE, 'advancedStats')).toBe(false);
                expect(planAllowsFeature({ name: null, nameAr: null, sortOrder: null }, 'csvExport')).toBe(false);
                expect(planAllowsFeature(BASIC, 'advancedStats')).toBe(false);
                expect(planAllowsFeature(BASIC, 'csvExport')).toBe(false);
                expect(planAllowsFeature(BASIC, 'referralProgram')).toBe(false);
                expect(planAllowsFeature(PREMIUM, 'advancedStats')).toBe(true);
                expect(planAllowsFeature(PREMIUM, 'csvExport')).toBe(false);
                expect(planAllowsFeature(PREMIUM, 'referralProgram')).toBe(false);
                expect(planAllowsFeature(PRO, 'advancedStats')).toBe(true);
                expect(planAllowsFeature(PRO, 'csvExport')).toBe(true);
                expect(planAllowsFeature(PRO, 'referralProgram')).toBe(true);
        });

        it('نسخة الرفض: حرفية العائلة لكل رتبة (توحيد المصدر)', async () => {
                const { planFeatureDeniedCopy } = await import('@/lib/plan-entitlements-core');
                expect(planFeatureDeniedCopy('advancedStats')).toBe(COPY_PREMIUM);
                expect(planFeatureDeniedCopy('csvExport')).toBe(COPY_PRO);
                expect(planFeatureDeniedCopy('referralProgram')).toBe(COPY_PRO);
        });

        it('entitlementsForPlan: الخريطة الكاملة لعرض الواجهة', async () => {
                const { entitlementsForPlan } = await import('@/lib/plan-entitlements-core');
                expect(entitlementsForPlan(FREE)).toEqual({
                        advancedStats: false,
                        csvExport: false,
                        referralProgram: false,
                });
                expect(entitlementsForPlan(PRO)).toEqual({
                        advancedStats: true,
                        csvExport: true,
                        referralProgram: true,
                });
        });
});

// ── 2. بوابة «إحصائيات متقدمة»: /api/stats/advanced ────────────────────

async function callAdvanced() {
        const { GET } = await import('@/app/api/stats/advanced/route');
        return GET(new NextRequest('http://localhost/api/stats/advanced?restaurantId=7', { method: 'GET' }));
}

describe('W7-B — /api/stats/advanced: بريميوم+ قبل أي عمل تجميعي', () => {
        it('المالك على المجاني → 403 نسخة العائلة + صفر استعلامات تجميعية', async () => {
                planHolder.value = FREE;
                const res = await callAdvanced();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(COPY_PREMIUM);
                expect(mockQueryRaw).not.toHaveBeenCalled();
                expect(mockOrderItemGroupBy).not.toHaveBeenCalled();
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('المالك على الأساسية (رتبة 2) → 403 كذلك (البوابة رتبة لا وجود)', async () => {
                planHolder.value = BASIC;
                const res = await callAdvanced();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(COPY_PREMIUM);
        });

        it('المالك على بريميوم → 200 والسلوك القائم لا يتغير (موجب)', async () => {
                planHolder.value = PREMIUM;
                const res = await callAdvanced();
                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.success).toBe(true);
                expect(body.data).toHaveProperty('revenue7d');
                expect(body.data).toHaveProperty('hourlyDistribution');
        });

        it('عائلة الأدمن تتجاوز حتى بلا صف خطة (دلالة isOwnerSubscriptionActive)', async () => {
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };
                const res = await callAdvanced();
                expect(res.status).toBe(200);
                // الأدمن لا يقرأ صف الخطة أصلًا — التجاوز قبل الجلب
                expect(mockRestaurantFindUnique).not.toHaveBeenCalled();
        });
});

// ── 3. بوابة «تصدير CSV»: /api/orders/export ───────────────────────────

async function callExport(params = '') {
        const { GET } = await import('@/app/api/orders/export/route');
        return GET(new NextRequest(`http://localhost/api/orders/export?restaurantId=7${params}`, { method: 'GET' }));
}

const CSV_ROW = (n: number) => ({
        orderNo: `ORD-${n}`,
        customerName: `سالم ${n}`,
        customerPhone: '0922222222',
        status: 'completed',
        pickupType: 'delivery',
        total: 42,
        createdAt: new Date('2026-10-19T12:00:00Z'),
});

describe('W7-B — /api/orders/export: الاحترافية+ قبل أي استعلام طلبات', () => {
        it('المالك على بريميوم (دون الاحترافية) → 403 نسخة العائلة + صفر استعلام طلبات', async () => {
                planHolder.value = PREMIUM;
                const res = await callExport();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(COPY_PRO);
                expect(mockOrderFindMany).not.toHaveBeenCalled();
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('المالك على المجاني → 403 (القفل ليس وجوديًا فقط — رتبة)', async () => {
                planHolder.value = FREE;
                const res = await callExport();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(COPY_PRO);
        });

        it('المالك على الاحترافية → 200 ملف CSV (موجب: BOM + الأعمدة السبعة + عدد الصفوف)', async () => {
                planHolder.value = PRO;
                mockOrderFindMany.mockResolvedValue([CSV_ROW(1), CSV_ROW(2)]);
                mockOrderCount.mockResolvedValue(2);
                const res = await callExport();
                expect(res.status).toBe(200);
                expect(res.headers.get('Content-Type')).toContain('text/csv');
                expect(res.headers.get('X-Export-Rows')).toBe('2');
                expect(res.headers.get('X-Export-Truncated')).toBeNull();
                // BOM (نفس عقد W6-B6): البايتات الخام EF BB BF تنجو إلى الملف
                // المُنزَّل — لكن Response.text() نفسه يجرد الـBOM (TextDecoder
                // الافتراضي ignoreBOM=false يقشرها) فالفحص يجب أن يكون على
                // arrayBuffer لا على text، وإلا يكذب الاختبار على العقد الحقيقي.
                const raw = new Uint8Array(await res.arrayBuffer());
                expect([raw[0], raw[1], raw[2]]).toEqual([0xef, 0xbb, 0xbf]);
                const text = new TextDecoder('utf-8').decode(raw);
                expect(text).toContain('رقم الطلب,العميل,الهاتف,الحالة,النوع,المجموع,التاريخ');
                expect(text).toContain('"ORD-1"');
                expect(text).toContain('توصيل');
        });

        it('تجاوز السقف الصادق: count أكبر من المصدَّر → ترويسة X-Export-Truncated (عقد W6-B6 حي)', async () => {
                planHolder.value = PRO;
                mockOrderFindMany.mockImplementation(async (args: { take?: number }) =>
                        Array.from({ length: Math.min(args.take ?? 500, 500) }, (_, i) => CSV_ROW(i))
                );
                mockOrderCount.mockResolvedValue(5001);
                const res = await callExport();
                expect(res.status).toBe(200);
                expect(res.headers.get('X-Export-Truncated')).toBe('1');
                expect(res.headers.get('X-Export-Rows')).toBe('5000');
        });

        it('حارس حقن المعادلات يبقى (نفس عقد W6-B6): =ORDER يُسبَق بعلامة اقتباس', async () => {
                planHolder.value = PRO;
                mockOrderFindMany.mockResolvedValue([{ ...CSV_ROW(1), customerName: '=SUM(A1)' }]);
                mockOrderCount.mockResolvedValue(1);
                const res = await callExport();
                const text = await res.text();
                expect(text).toContain('"\'=SUM(A1)"');
        });

        it('بحث المالك نفسه يُطبَّق خادميًا (orderNo/customerName يحتويان)', async () => {
                planHolder.value = PRO;
                mockOrderFindMany.mockResolvedValue([]);
                mockOrderCount.mockResolvedValue(0);
                const res = await callExport('&search=%D9%88%D8%A7%D8%AD%D8%A9');
                // لا طلبات مطابقة → 404 بنسخة W6-B6 نفسها (لا ملف فارغ كاذب)
                expect(res.status).toBe(404);
                expect(mockOrderFindMany).toHaveBeenCalledWith(
                        expect.objectContaining({
                                where: expect.objectContaining({
                                        OR: expect.any(Array),
                                }),
                        })
                );
        });

        it('sub_admin بلا APPROVE_ORDERS → 403 (سلّم قائمة الطلبات نفسه)', async () => {
                authHolder.value = {
                        authorized: true,
                        role: 'sub_admin',
                        restaurantId: null,
                        userId: 5,
                        permissions: [],
                };
                const res = await callExport();
                expect(res.status).toBe(403);
                expect(mockRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('عائلة الأدمن تتجاوز بوابة الخطة (مشغّلو المنصة)', async () => {
                authHolder.value = { authorized: true, role: 'super_admin', restaurantId: null, userId: 1, permissions: [] };
                mockOrderFindMany.mockResolvedValue([CSV_ROW(1)]);
                mockOrderCount.mockResolvedValue(1);
                const res = await callExport();
                expect(res.status).toBe(200);
        });
});

// ── 4. بوابة «برنامج الإحالات»: /api/loyalty/referral POST ─────────────

async function callReferralPost() {
        const { POST } = await import('@/app/api/loyalty/referral/route');
        return POST(
                new NextRequest('http://localhost/api/loyalty/referral', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ referralCode: 'WAHAXYZ', referredPhone: '0933333333' }),
                })
        );
}

describe('W7-B — /api/loyalty/referral POST: الاحترافية+ قبل أي كتابة', () => {
        it('المالك الشرعي على بريميوم → 403 نسخة العائلة + صفر إنشاء إحالة', async () => {
                planHolder.value = PREMIUM;
                const res = await callReferralPost();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(COPY_PRO);
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('المالك الشرعي على المجاني → 403 كذلك', async () => {
                planHolder.value = FREE;
                const res = await callReferralPost();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(COPY_PRO);
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('المالك على الاحترافية → 201 (موجب: المسار الشرعي يعمل كما كان)', async () => {
                planHolder.value = PRO;
                const res = await callReferralPost();
                expect(res.status).toBe(201);
                const body = await res.json();
                expect(body.success).toBe(true);
        });

        it('بوابة المستأجر أسبق من بوابة الخطة: مالك غريب (بلا رابط) على مطعم الاحترافية → «غير مصرح»', async () => {
                planHolder.value = PRO;
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 99, userId: 90, permissions: [] };
                mockUserRestaurantFindUnique.mockResolvedValue(null);
                const res = await callReferralPost();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
        });

        it('super_admin على مطعم دون الرتبة يتجاوز (مشغّلو المنصة)', async () => {
                planHolder.value = FREE;
                authHolder.value = { authorized: true, role: 'super_admin', restaurantId: null, userId: 1, permissions: [] };
                const res = await callReferralPost();
                expect(res.status).toBe(201);
        });
});

// ── 5. بوابة المطالبة المجهولة: /api/referrals/claim ──────────────────

async function callClaim() {
        const { POST } = await import('@/app/api/referrals/claim/route');
        return POST(
                new NextRequest('http://localhost/api/referrals/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-real-ip': '1.2.3.4' },
                        body: JSON.stringify({ code: 'WAHAXYZ' }),
                })
        );
}

describe('W7-B — /api/referrals/claim: مطعم دون الاحترافية → 403 قبل أي إنشاء pending', () => {
        it('بطاقة مطعم مجاني → 403 نسخة العائلة + صفر إنشاء (لا حشو صفوف لا تُحوّل)', async () => {
                planHolder.value = FREE;
                const res = await callClaim();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(COPY_PRO);
                expect(mockReferralCreate).not.toHaveBeenCalled();
                expect(mockReferralFindFirst).not.toHaveBeenCalled();
        });

        it('بطاقة مطعم الاحترافية → 200 registered (موجب: رحلة الرابط الحي كما كانت)', async () => {
                planHolder.value = PRO;
                const res = await callClaim();
                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.success).toBe(true);
                expect(body.data.registered).toBe(true);
        });
});

// ── 6. علم الزبون: /api/loyalty POST/GET يصدّر referralProgram ─────────

describe('W7-B — /api/loyalty: علم referralProgram من صف الخطة (الولاء عالمي، الإحالة رتبة)', () => {
        it('POST: مطعم مجاني → بطاقة تعمل (عالمي) + referralProgram=false', async () => {
                planHolder.value = FREE;
                const { POST } = await import('@/app/api/loyalty/route');
                const res = await POST(
                        new NextRequest('http://localhost/api/loyalty', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-real-ip': '1.2.3.4' },
                                body: JSON.stringify({ customerPhone: '0922222222', restaurantId: 7 }),
                        })
                );
                expect(res.status).toBe(200); // بطاقة الولاء تُنشأ — الميزة عالمية
                const body = await res.json();
                expect(body.data.card).toBeTruthy();
                expect(body.data.referralProgram).toBe(false);
        });

        it('POST: مطعم الاحترافية → referralProgram=true', async () => {
                planHolder.value = PRO;
                const { POST } = await import('@/app/api/loyalty/route');
                const res = await POST(
                        new NextRequest('http://localhost/api/loyalty', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-real-ip': '1.2.3.4' },
                                body: JSON.stringify({ customerPhone: '0922222222', restaurantId: 7 }),
                        })
                );
                expect(res.status).toBe(200);
                expect((await res.json()).data.referralProgram).toBe(true);
        });

        it('GET: نفس العلم (قراءة البطاقة وعرضها متطابقان)', async () => {
                planHolder.value = BASIC;
                const { GET } = await import('@/app/api/loyalty/route');
                const res = await GET(
                        new NextRequest('http://localhost/api/loyalty?phone=0922222222&restaurantId=7', {
                                headers: { 'x-real-ip': '1.2.3.4' },
                        })
                );
                expect(res.status).toBe(200);
                expect((await res.json()).data.referralProgram).toBe(false);
        });
});

// ── 7. قراءة الحقيقة الخادمية: /api/owner/entitlements ────────────────

describe('W7-B — /api/owner/entitlements: الحقيقة التي تستهلكها أسطح القفل', () => {
        it('المالك على المجاني → الكل false + صف الخطة null', async () => {
                planHolder.value = FREE;
                const { GET } = await import('@/app/api/owner/entitlements/route');
                const res = await GET(
                        new NextRequest('http://localhost/api/owner/entitlements?restaurantId=7', { method: 'GET' })
                );
                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.data.plan).toBeNull();
                expect(body.data.features).toEqual({
                        advancedStats: false,
                        csvExport: false,
                        referralProgram: false,
                });
        });

        it('المالك على بريميوم → المتقدمة فقط', async () => {
                planHolder.value = PREMIUM;
                const { GET } = await import('@/app/api/owner/entitlements/route');
                const res = await GET(
                        new NextRequest('http://localhost/api/owner/entitlements?restaurantId=7', { method: 'GET' })
                );
                const body = await res.json();
                expect(body.data.features.advancedStats).toBe(true);
                expect(body.data.features.csvExport).toBe(false);
                expect(body.data.features.referralProgram).toBe(false);
        });

        it('USER → 403 (سلّم نطاق الإحصاءات نفسه)', async () => {
                authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 2, permissions: [] };
                const { GET } = await import('@/app/api/owner/entitlements/route');
                const res = await GET(
                        new NextRequest('http://localhost/api/owner/entitlements?restaurantId=7', { method: 'GET' })
                );
                expect(res.status).toBe(403);
        });
});

// ── 8. عقد المصدر: الأسطر المتقاعدة والنسخة الحرفية والهجرة ────────────

describe('W7-B — عقد المصدر: النص يتبع ما يُنفَّذ (قانون r92)', () => {
        it('نسخة الرفض حرفية واحدة في المصدر الواحد (core) — لا انحراف', () => {
                const core = src('src/lib/plan-entitlements-core.ts');
                expect(core).toContain('هذه الميزة متوفرة في خطة «${minPlanNameAr}» فأعلى. قم بالترقية للمتابعة.');
                // لا نسخة يدوية مكررة في أي مسار — كل المواقع تستورد المصدر
                const routes = [
                        'src/app/api/stats/advanced/route.ts',
                        'src/app/api/orders/export/route.ts',
                        'src/app/api/loyalty/referral/route.ts',
                        'src/app/api/referrals/claim/route.ts',
                ];
                for (const r of routes) {
                        expect(src(r), r).not.toContain('هذه الميزة متوفرة');
                }
        });

        it('البوّابات تستخدم المصدر الواحد (استيراد أو مساعد) في كل موقع', () => {
                expect(src('src/app/api/stats/advanced/route.ts')).toContain("requirePlanFeature");
                expect(src('src/app/api/orders/export/route.ts')).toContain("requirePlanFeature");
                expect(src('src/app/api/loyalty/referral/route.ts')).toContain('planFeatureDeniedCopy');
                expect(src('src/app/api/referrals/claim/route.ts')).toContain('planFeatureDeniedCopy');
        });

        it('البذرة: بريميوم بلا «برنامج ولاء متكامل»/«QR كود مخصص»، الشركات بلا «تخصيص كامل»، والصادقات باقية', async () => {
                const { DEFAULT_PLANS } = await import('@/lib/default-plans');
                const premium = DEFAULT_PLANS.find((p) => p.name === 'Premium');
                const enterprise = DEFAULT_PLANS.find((p) => p.name === 'Enterprise');
                const pro = DEFAULT_PLANS.find((p) => p.name === 'Pro');
                // المتقاعدون (غير المتمايزين/غير المشحونين)
                expect(premium?.features).not.toContain('برنامج ولاء متكامل');
                expect(premium?.features).not.toContain('QR كود مخصص');
                expect(enterprise?.features).not.toContain('تخصيص كامل');
                // الصادقون (الآن مُنفَّذون ببوابات W7-B)
                expect(premium?.features).toContain('إحصائيات متقدمة');
                expect(pro?.features).toContain('برنامج إحالات');
                expect(pro?.features).toContain('تصدير CSV');
        });

        it('هجرة البيانات: name-keyed + حارس احتواء + idempotent (نمط r92)', () => {
                const sql = src('prisma/migrations/zz_w7b_plan_feature_texts/migration.sql');
                const updates = sql.match(/UPDATE "SubscriptionPlan"/g) ?? [];
                expect(updates).toHaveLength(10);
                // لا مفاتيح رقمية أبدًا (معرّفات الإنتاج ≠ المحلي)
                expect(sql).not.toMatch(/WHERE id\s*=/);
                // كل حذف بحارس احتواء @> (إزالة عنصر غائب = no-op)
                const removals = sql.match(/"features" - '[^']+'/g) ?? [];
                expect(removals.length).toBeGreaterThan(0);
                for (const stmt of sql.split(/;\s*\n/)) {
                        if (stmt.includes('UPDATE "SubscriptionPlan"')) {
                                expect(stmt).toContain("name = '");
                                expect(stmt).toMatch(/"sortOrder" = \d/);
                        }
                }
                // الاستبدال النصي بحارس LIKE (idempotent) والإضافة بحارس NOT @>
                expect(sql).toContain("replace(\"features\"::text, 'ولاء متقدم', 'برنامج إحالات')");
                expect(sql).toMatch(/LIKE '%ولاء متقدم%'/);
                expect(sql).toContain("NOT (\"features\" @> '[\"تصدير CSV\"]'::jsonb)");
        });

        it('الواجهة: الزبون يخفي بطاقة الإحالة بالعلم الخادم (غياب صادق) والمالك يقفل مع رابط ترقية', () => {
                const widget = src('src/components/loyalty/LoyaltyWidget.tsx');
                expect(widget).toContain('referralProgram !== false');
                const lock = src('src/components/shared/PlanFeatureLock.tsx');
                expect(lock).toContain('href="/subscribe"');
                // وجه الزبون لا يحمل رابط ترقية أبدًا (المخطط لا يملك خطة)
                expect(widget).not.toContain('/subscribe');
        });
});
