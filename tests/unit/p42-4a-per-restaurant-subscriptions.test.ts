/**
 * P42-4a — تثبيت دلالات «الاشتراك لكل مطعم» (r93) بعد إصلاح التناقضات
 * الثلاثة المسجلة في سجل البرنامج (register):
 *
 *   1. حجب الدفعات المعلقة صار لكل مطعم:
 *      - POST /api/subscriptions: يحجب فقط دفعة «اشتراك جديد» معلقة (دلو ''
 *        من فهرس SubscriptionPayment_pending_user_restaurant_unique) — دفعة
 *        ترقية على مطعم آخر لم تعد تحجب شراء المنيوهات.
 *      - POST /api/subscriptions/upgrade: فحص «لا دفعة معلقة للمستخدم» الشامل
 *        أُزيل؛ بقي فحص الترقية المعلقة محصورًا بالمطعم المطلوب.
 *      (تثبيتا المسارين الكاملان في subscriptions-family / subscriptions-upgrade /
 *       pending-payment-unique — هنا عقد المصدر + عقد المجس المشترك.)
 *
 *   2. المنيو الجديد يبدأ عند سقوف الخطة المجانية دائمًا (مالك بخطة مرتفوعة
 *      لا يورّث سقوفها للمنيو الجديد) — مغطى في owner-restaurants-gate
 *      (P42-4a tests) وr93-coverage-owner-restaurants؛ هنا يُثبَّت عقد المصدر.
 *
 *   3. M-3 (تفتيش r93-1c — المُؤجل صراحة خارج هجرة zz_round93): فرع موافقة
 *      الترقية (resolveSubscriptionPayment) يقفل صف المطعم FOR UPDATE داخل
 *      المعاملة ثم يعيد التحقق من الرتبة قبل كتابة السقوف — موافقة متقادمة
 *      لا تنزّل خطة مدفوعة، وموافقتان متزامنتان على مطعم واحد لا تحصّلان
 *      الرسوم مرتين (الخاسر يُرفض والدفع يبقى pending بيد المشرف).
 *
 * النمط: tx-mock (subscription-decisions.test.ts) + قراءة المصدر
 * (w6-b6-expiry-guard-family.test.ts) — بلا قاعدة حقيقية.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
        pendingPaymentRestaurantScope,
        findPendingNewSubscriptionPayment,
} from '@/lib/pending-payment-scope';

// ── M-3: tx-mock لفرع موافقة الترقية (نمط subscription-decisions.test.ts) ──

const txMock = {
        subscriptionPayment: { update: vi.fn(), updateMany: vi.fn() },
        subscriptionPlan: { findUnique: vi.fn() },
        restaurant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        userRestaurant: { create: vi.fn(), count: vi.fn() },
        menuCategory: { createMany: vi.fn() },
        user: { update: vi.fn(), updateMany: vi.fn() },
        systemEvent: { create: vi.fn() },
        $queryRaw: vi.fn(),
};

vi.mock('@/lib/db', () => ({
        prisma: {
                subscriptionPayment: { findUnique: vi.fn() },
                $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
        },
}));
vi.mock('@/lib/telegram', () => ({
        sendTelegramNotification: vi.fn().mockResolvedValue(undefined),
        notifyEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/logger', () => ({ error: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/config', () => ({ getDecryptedBotToken: vi.fn().mockResolvedValue(null) }));

import { prisma } from '@/lib/db';
import { resolveSubscriptionPayment } from '@/lib/subscription-decisions';

// ── عقد المصدر: فحص المستخدم-الشامل لم يعد له وجود ──────────────────────

const src = (p: string) =>
        readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), 'utf8');

describe('P42-4a — عقد المصدر: الحجب الشامل للمستخدم أُزيل من المسارين', () => {
        it('POST /api/subscriptions يحجب عبر المجس المشترك (دلو الاشتراك الجديد) لا findFirst الشامل', () => {
                const s = src('src/app/api/subscriptions/route.ts');
                expect(s).toContain('findPendingNewSubscriptionPayment(auth.userId, prisma)');
                // the pre-r93 user-wide probe shape must not come back
                expect(s).not.toMatch(/findFirst\(\{\s*where: \{ userId: auth\.userId, status: 'pending' \}/);
        });

        it('POST /api/subscriptions/upgrade لا يحمل أي فحص «لا دفعة معلقة للمستخدم»', () => {
                const s = src('src/app/api/subscriptions/upgrade/route.ts');
                expect(s).not.toMatch(/findFirst\(\{\s*where: \{ userId: auth\.userId, status: 'pending' \}/);
                // the surviving probe is the per-restaurant one
                expect(s).toContain("metadata: { path: ['upgradeRestaurantId'], equals: upgradeRestaurantId }");
        });

        it('POST /api/owner/restaurants يزرع سقوف الخطة المجانية دائمًا (لا وراثة user.plan)', () => {
                const s = src('src/app/api/owner/restaurants/route.ts');
                expect(s).toContain('planId: null,');
                expect(s).not.toContain('planId: user.planId ?? null,');
                expect(s).not.toContain('maxItems: user.plan?.maxItems ?? freeCaps.maxItems');
        });
});

// ── المجس المشترك: نطاق الدفعة المعلقة ─────────────────────────────────

describe('P42-4a — pendingPaymentRestaurantScope: مرآة تعبير COALESCE في الفهرس', () => {
        it('غياب المفتاح أو metadata كله null → دلو الاشتراك الجديد (null)', () => {
                expect(pendingPaymentRestaurantScope(null)).toBeNull();
                expect(pendingPaymentRestaurantScope(undefined)).toBeNull();
                expect(pendingPaymentRestaurantScope({ tempRestaurants: [] })).toBeNull();
                expect(pendingPaymentRestaurantScope({})).toBeNull();
        });

        it('JSON-null الصريح أيضًا في الدلو الفارغ (COALESCE يرى NULL من ->>)', () => {
                // PostgreSQL: '{"a": null}'::jsonb->>'a' IS NULL → COALESCE('')
                expect(pendingPaymentRestaurantScope({ upgradeRestaurantId: null })).toBeNull();
        });

        it('معرّف ترقية (رقم أو سلسلة) → نطاق ذلك المطعم', () => {
                expect(pendingPaymentRestaurantScope({ upgradeRestaurantId: 9 })).toBe(9);
                expect(pendingPaymentRestaurantScope({ upgradeRestaurantId: '9' })).toBe(9);
                expect(pendingPaymentRestaurantScope({ upgradeRestaurantId: 0 })).toBe(0);
        });
});

describe('P42-4a — findPendingNewSubscriptionPayment: أول دفعة اشتراك-جديد معلقة فقط', () => {
        const makeDb = (rows: Array<{ id: number; metadata: unknown }>) => ({
                subscriptionPayment: {
                        findMany: vi.fn(async () => rows),
                },
        });

        it('دفعة ترقية وحيدة معلقة → null (لا تحجب شراء المنيوهات)', async () => {
                const db = makeDb([{ id: 401, metadata: { upgradeRestaurantId: 9 } }]);
                await expect(findPendingNewSubscriptionPayment(7, db)).resolves.toBeNull();
                expect(db.subscriptionPayment.findMany).toHaveBeenCalledWith({
                        where: { userId: 7, status: 'pending' },
                        select: { id: true, metadata: true },
                });
        });

        it('دفعة اشتراك-جديد معلقة بين دفعات ترقية → هي التي تُعاد', async () => {
                const db = makeDb([
                        { id: 401, metadata: { upgradeRestaurantId: 9 } },
                        { id: 402, metadata: { tempRestaurants: [{ name: 'مقهى', slug: 'waha' }] } },
                        { id: 403, metadata: null },
                ]);
                // يُعاد الصف كاملًا (الـroute يفحص الوجود فقط) — التطابق على المعرف
                await expect(findPendingNewSubscriptionPayment(7, db)).resolves.toMatchObject({ id: 402 });
        });

        it('لا دفعات معلقة إطلاقًا → null', async () => {
                await expect(findPendingNewSubscriptionPayment(7, makeDb([]))).resolves.toBeNull();
        });
});

// ── M-3: فرع موافقة الترقية — القفل وإعادة التحقق ─────────────────────

/** سلّم الخطط: 1 أساسية مدفوعة (sort 1) · 3 احترافية (sort 3) · 4 تجريبية مجانية (sort 0) · 5 شركات (sort 5). */
const PLANS: Record<number, Record<string, unknown>> = {
        1: { id: 1, nameAr: 'أساسية', price: 49, sortOrder: 1, maxItems: 50, maxOrders: 500, periodDays: 30 },
        3: { id: 3, nameAr: 'احترافية', price: 149, sortOrder: 3, maxItems: 9999, maxOrders: 99999, periodDays: 30 },
        4: { id: 4, nameAr: 'تجريبية', price: 0, sortOrder: 0, maxItems: 10, maxOrders: 100, periodDays: 30 },
        5: { id: 5, nameAr: 'شركات', price: 299, sortOrder: 5, maxItems: 99999, maxOrders: 999999, periodDays: 30 },
};

const PAYMENT = {
        id: 50,
        userId: 42,
        phone: '0912345678',
        amount: 149,
        provider: 'bank',
        planId: 3,
        planName: 'احترافية',
        status: 'pending' as const,
        metadata: { upgradeRestaurantId: 88, currentPlanId: null },
        createdAt: new Date(),
        user: { id: 42, telegramChatId: null },
};

function mockPayment(overrides: Record<string, unknown> = {}) {
        (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...PAYMENT,
                ...overrides,
        });
}

/** حالة المطعم 88 كما تُقرأ تحت القفل (خطة حالية قابلة للتحكم). */
function mockRestaurantUnderLock(planId: number | null) {
        txMock.restaurant.findUnique.mockResolvedValue({ id: 88, planId });
}

beforeEach(() => {
        vi.clearAllMocks();
        (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
        );
        mockPayment();
        mockRestaurantUnderLock(null); // free restaurant → tier check skipped
        txMock.subscriptionPlan.findUnique.mockImplementation(
                async (args: { where: { id: number } }) =>
                        PLANS[args.where.id] ? { ...PLANS[args.where.id] } : null
        );
        txMock.$queryRaw.mockResolvedValue([]);
        txMock.subscriptionPayment.update.mockResolvedValue({});
        txMock.restaurant.update.mockResolvedValue({ id: 88, name: 'مطعم الرائد', slug: 'raed' });
        txMock.user.update.mockResolvedValue({ id: 42 });
        txMock.systemEvent.create.mockResolvedValue({});
});

describe('P42-4a (M-3) — القفل داخل معاملة الموافقة', () => {
        it('قفل صف المطعم FOR UPDATE يسبق إعادة القراءة وكتابة السقوف (نمط فرع المستخدم الجديد)', async () => {
                await resolveSubscriptionPayment(50, 'verified');

                const sql = String(txMock.$queryRaw.mock.calls[0][0]);
                expect(sql).toContain('SELECT id FROM "Restaurant"');
                expect(sql).toContain('FOR UPDATE');
                // the locked id is the upgrade target
                expect(txMock.$queryRaw.mock.calls[0][1]).toBe(88);
                // lock → re-read → cap write, strictly ordered
                expect(txMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
                        txMock.restaurant.findUnique.mock.invocationCallOrder[0]
                );
                expect(txMock.restaurant.findUnique.mock.invocationCallOrder[0]).toBeLessThan(
                        txMock.restaurant.update.mock.invocationCallOrder[0]
                );
                // the re-read is scoped to id + planId only
                expect(txMock.restaurant.findUnique).toHaveBeenCalledWith({
                        where: { id: 88 },
                        select: { id: true, planId: true },
                });
        });

        it('المطعم اختفى بين الطلب والموافقة → 404 «المطعم غير موجود»، لا كتابة سقوف ولا أحداث', async () => {
                txMock.restaurant.findUnique.mockResolvedValue(null);

                const result = await resolveSubscriptionPayment(50, 'verified');

                expect(result).toEqual({ ok: false, reason: 'المطعم غير موجود', status: 404 });
                expect(txMock.restaurant.update).not.toHaveBeenCalled();
                expect(txMock.user.update).not.toHaveBeenCalled();
                expect(txMock.systemEvent.create).not.toHaveBeenCalled();
        });
});

describe('P42-4a (M-3) — إعادة التحقق من الرتبة تحت القفل', () => {
        it('مطعم على خطة مدفوعة أدنى → الترقية تمر (re-check passes)', async () => {
                mockRestaurantUnderLock(1); // أساسية (sort 1) → احترافية (sort 3) أعلى

                const result = await resolveSubscriptionPayment(50, 'verified');

                expect(result).toEqual({ ok: true, action: 'verified', paymentId: 50 });
                expect(txMock.restaurant.update).toHaveBeenCalledTimes(1);
                const updateArg = txMock.restaurant.update.mock.calls[0][0];
                expect(updateArg.data.planId).toBe(3);
                expect(updateArg.data.maxItems).toBe(9999);
                expect(updateArg.data.maxOrders).toBe(99999);
        });

        it('موافقة متقادمة: المطعم صار على خطة أعلى من باقة الدفع → 409، لا كتابة، الدفع بيد المشرف', async () => {
                // المالك طلب «احترافية» (sort 3) بينما المطعم صار على «شركات» (sort 5)
                // — نزول مأجور: العميل دفع والخطة كانت ستُخفَّض
                mockRestaurantUnderLock(5);

                const result = await resolveSubscriptionPayment(50, 'verified');

                expect(result.ok).toBe(false);
                if (!result.ok) {
                        expect(result.status).toBe(409);
                        expect(result.reason).toContain('لم تعد أعلى من باقة المطعم الحالية');
                }
                expect(txMock.restaurant.update).not.toHaveBeenCalled();
                expect(txMock.user.update).not.toHaveBeenCalled();
                expect(txMock.systemEvent.create).not.toHaveBeenCalled();
        });

        it('موافقتان لنفس المطعم (مالكَان مشاركان — سيناريو M-3): الخاسر على نفس الرتبة → 409 (لا رسوم مرتين)', async () => {
                // الفائز طبّق «احترافية» (sort 3)؛ دفعة الخاسر على «احترافية» نفسها —
                // المساواة ليست ترقية (نفس شرط وقت الطلب: newPlan.sortOrder <= current → رفض)
                mockRestaurantUnderLock(3);

                const result = await resolveSubscriptionPayment(50, 'verified');

                expect(result.ok).toBe(false);
                if (!result.ok) expect(result.status).toBe(409);
                expect(txMock.restaurant.update).not.toHaveBeenCalled();
        });

        it('الخطة الحالية مجانية (price 0) → مقارنة الرتبة تتخطى (مرآة شرط وقت الطلب)', async () => {
                mockRestaurantUnderLock(4); // تجريبية — price 0

                const result = await resolveSubscriptionPayment(50, 'verified');

                expect(result).toEqual({ ok: true, action: 'verified', paymentId: 50 });
                // current-plan probe (4, skipped comparison) then the caps lookup (3) —
                // the new-plan tier probe never runs for a free current plan
                const planCalls = txMock.subscriptionPlan.findUnique.mock.calls.map((c) => c[0]?.where?.id);
                expect(planCalls).toEqual([4, 3]);
        });

        it('خطة الدفع اختفت من الجدول تحت القفل وخطة حالية مدفوعة → 409 لا كتابة (مرآة «ليست أعلى»)', async () => {
                mockRestaurantUnderLock(1);
                // دفعة على خطة حُذف صفها (999) — مسار الطلب يرفضها بـ«الباقة غير موجودة»،
                // وفحص الرتبة تحت القفل يرفضها قبل أن يفجر FK على planId معدوم
                mockPayment({ planId: 999 });

                const result = await resolveSubscriptionPayment(50, 'verified');

                // خطة جديدة غير موجودة → ليست «أعلى» → رفض 409 — لا تطبيق بسقوف
                // undefined فوق خطة مدفوعة قائمة
                expect(result.ok).toBe(false);
                if (!result.ok) expect(result.status).toBe(409);
                expect(txMock.restaurant.update).not.toHaveBeenCalled();
        });
});
