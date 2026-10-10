/**
 * r93-N7 (F6/MED-3 من تفتيش 1-b الأمني) — حد معدل على GET /api/restaurants/[id].
 *
 * الخلل: GET عام غير مصادق (صفحات المنيو/السلة العامة تقرأ تفاصيل المطعم
 * عبره) بلا حد معدل ولا كاش — استعلامات DB مجهولة غير محدودة (متاحية/DoS:
 * كل نقطة عامة أخرى في المنصة محمية بcreateDbRateLimiter).
 *
 * الإصلاح: 60/دقيقة/IP (نفس سقف عائلة GET العامة — loyaltyIpLimiter
 * وordersListDbLimiter)، المفتاح على IP وحده بلا معرف المطعم (مقاومة
 * key-dilution الموثقة r90-F4: تدوير restaurantId لا يفتح دلوًا جديدًا).
 * الفحص أول شيء في المعالج — قبل المصادقة وقبل أي استعلام DB.
 *
 * النمط: restaurants-create.test.ts (rlState قابل للتحكم يلتقط أيضًا إعداد
 * المحدّد المارّ إلى createDbRateLimiter) + stats-permission (prisma/auth).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── محدّد قابل للتحكم يلتقط الإعداد والمفاتيح ───────────────────────────

const rlState = vi.hoisted(() => ({
        cfgs: [] as { windowMs: number; max: number }[],
        checks: [] as string[],
        counts: new Map<string, number>(),
        limit: Infinity,
}));

vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: (cfg: { windowMs: number; max: number }) => {
                rlState.cfgs.push(cfg);
                return {
                        check: async (key: string) => {
                                // دلاء مستقلة لكل مفتاح (كالسلوك الحقيقي)
                                const n = (rlState.counts.get(key) ?? 0) + 1;
                                rlState.counts.set(key, n);
                                rlState.checks.push(key);
                                return {
                                        success: n <= rlState.limit,
                                        remaining: 0,
                                        reset: 0,
                                };
                        },
                        destroy: () => {},
                };
        },
}));

// ── prisma + auth ───────────────────────────────────────────────────────

const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        restaurant: { findUnique: mockRestaurantFindUnique },
        menuItem: { findMany: mockMenuItemFindMany },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// ضيف دائمًا → الفرع العام (الإسقاط العام بلا PII) — مسار الاستخدام الحقيقي
// للصفحات غير المصادقة
vi.mock('@/lib/auth', () => ({
        requireAuth: async () => ({ authorized: false }),
        requirePermission: async () => ({ authorized: false, error: 'لا تملك الصلاحية', status: 403 }),
}));

const route = await import('@/app/api/restaurants/[id]/route');

// ── أدوات النداء ────────────────────────────────────────────────────────

const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

function getRequest(ip?: string): NextRequest {
        return new NextRequest('http://localhost/api/restaurants/2', {
                method: 'GET',
                ...(ip ? { headers: { 'x-real-ip': ip } } : {}),
        });
}

const PUB_ROW = {
        id: 2,
        name: 'Pizza Roma',
        slug: 'pizza-roma',
        description: '',
        logo: '',
        whatsapp: '',
        pickupTypes: 'inside',
        currency: 'LYD',
        themeColor: 'amber',
        isActive: true,
        /* r137: وصفا التوصيل يرافقان الإسقاط العام (صفحة السلة تقرؤهما من هذا
           المسار) — Decimal يُكرَّه number عبر السلك، والمطفي = null. */
        deliveryFee: null,
        minOrder: null,
};

beforeEach(() => {
        vi.clearAllMocks();
        // cfgs لا يُصفّر: التسجيل يجري مرة واحدة على مستوى الوحدة عند الاستيراد
        rlState.checks = [];
        rlState.counts = new Map();
        rlState.limit = Infinity;
        mockRestaurantFindUnique.mockResolvedValue(PUB_ROW);
});

// ── الإعداد ─────────────────────────────────────────────────────────────

describe('r93-N7 — إعداد المحدّد (60/دقيقة/IP بنمط عائلة GET العامة)', () => {
        it('createDbRateLimiter يُستدعى مرة واحدة على مستوى الوحدة بـ { windowMs: 60_000, max: 60 }', () => {
                expect(rlState.cfgs).toHaveLength(1);
                expect(rlState.cfgs[0]).toEqual({ windowMs: 60_000, max: 60 });
        });

        it('المفتاح على IP وحده — بلا معرف المطعم (مقاومة key-dilution r90-F4)', async () => {
                await route.GET(getRequest('1.2.3.4'), idParams(2));
                expect(rlState.checks[0]).toBe('restaurant-get:1.2.3.4');
                // بلا ترويسة موثوقة → unknown (نموذج round91-D1 الموحّد)
                await route.GET(getRequest(), idParams(9));
                expect(rlState.checks[1]).toBe('restaurant-get:unknown');
        });
});

// ── السلوك ─────────────────────────────────────────────────────────────

describe('r93-N7 — 429 عند تجاوز 60/دقيقة قبل أي عمل', () => {
        it('الطلب 61 → 429 بالرسالة العربية وبلا أي استعلام DB (الحد قبل requireAuth والقراءة)', async () => {
                rlState.limit = 60;
                for (let i = 0; i < 60; i++) {
                        const res = await route.GET(getRequest('1.2.3.4'), idParams(2));
                        expect(res.status).toBe(200);
                }
                expect(mockRestaurantFindUnique).toHaveBeenCalledTimes(60);

                const blocked = await route.GET(getRequest('1.2.3.4'), idParams(2));
                expect(blocked.status).toBe(429);
                const json = await blocked.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('طلبات كثيرة جدًا، حاول بعد 60 ثانية');
                // لا استعلام جديد — الحد يسبق كل شيء
                expect(mockRestaurantFindUnique).toHaveBeenCalledTimes(60);
        });

        it('IP مختلف لا يتأثر بدلو زميله (عزل الدلاء لكل IP)', async () => {
                rlState.limit = 60;
                for (let i = 0; i < 60; i++) {
                        await route.GET(getRequest('1.2.3.4'), idParams(2));
                }
                const other = await route.GET(getRequest('5.6.7.8'), idParams(2));
                expect(other.status).toBe(200);
                expect(rlState.checks[rlState.checks.length - 1]).toBe('restaurant-get:5.6.7.8');
        });

        it('تحت الحد: المسار العام يعمل كما كان (200 + الإسقاط العام بلا PII)', async () => {
                const res = await route.GET(getRequest('1.2.3.4'), idParams(2));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual(PUB_ROW);
                expect(json.data).not.toHaveProperty('phone');
                expect(json.data).not.toHaveProperty('email');
        });
});
