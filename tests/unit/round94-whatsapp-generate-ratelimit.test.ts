/**
 * round94-3a (W1-a أمن — تقرير B LOW-1 §2): حد المعدل على
 * POST /api/whatsapp/generate + إغلاق عدّاد 404/403.
 *
 * الخلل الأول: المسار كله كان بلا limiter — استدعاء متكرر (مصادَق) يضرب
 * DB ويوسم whatsappSent=true أثرًا جانبيًا مجانيًا في كل ضغطة.
 * الخلل الثاني: findUnique كان يسبق فروع الترخيص — أي مستخدم مصادَق
 * (حتى USER) يميّز الطلبات الموجودة عن غير الموجودة (404 مقابل 403).
 *
 * الإصلاح المُختبر:
 *   - 20/دقيقة لكل مستخدم مصادَق، مفتاح `wa-gen:${userId}` (نمط
 *     items/[id] PUT — r91-F-B)، بعد بوابة 401 (المجهول لا يحرق الميزانية)
 *   - الضغط فوق الحد → 429 برسالة عربية قبل أي قراءة DB
 *   - USER → 403 قبل findUnique (لا تمييز وجود الطلب)
 *
 * النمط: r93-items-get-ratelimit.test.ts (منكّر قابل للتحكم على
 * createDbRateLimiter بعدّاد حقيقي) — لا DB حقيقية.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true,
                role: 'owner',
                restaurantId: 1 as number | null,
                userId: 10 as number | null,
                permissions: [] as string[],
        },
}));

const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockOrderUpdate = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
        order: { findUnique: mockOrderFindUnique, update: mockOrderUpdate },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

// منكّر بميزانية لكل مفتاح (كما يفعل createDbRateLimiter الحقيقي — صف
// RateLimitEntry لكل key): أول 20 نداء لكل مفتاح ناجحة، ثم 429
const { checkMock, resetBudget } = vi.hoisted(() => {
        const budgetByKey = new Map<string, number>();
        const checkMock = vi.fn(async (key: string) => {
                const used = (budgetByKey.get(key) ?? 0) + 1;
                budgetByKey.set(key, used);
                const ok = used <= 20;
                return { success: ok, remaining: Math.max(0, 20 - used), reset: 0 };
        });
        return { checkMock, resetBudget: () => budgetByKey.clear() };
});

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn(async () => authHolder.value) }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: checkMock, destroy: () => {} }),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const ORDER = {
        id: 77,
        orderNo: 'ORD-77',
        customerName: 'عميل',
        customerPhone: '0910000000',
        pickupType: 'inside',
        total: 25,
        discount: 0,
        createdAt: new Date('2026-09-01T10:00:00Z'),
        restaurantId: 1,
        restaurant: { name: 'مقهى الواحة', whatsapp: '218910000000' },
        items: [],
};

beforeEach(() => {
        vi.clearAllMocks();
        resetBudget();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 10, permissions: [] };
        mockOrderFindUnique.mockResolvedValue(ORDER);
        mockOrderUpdate.mockResolvedValue({ ...ORDER, whatsappSent: true });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
});

async function generate() {
        const { POST } = await import('@/app/api/whatsapp/generate/route');
        return POST(
                new NextRequest('http://localhost/api/whatsapp/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: 77 }),
                })
        );
}

// ── الحد ────────────────────────────────────────────────────────────────

describe('round94 LOW-1 — POST /api/whatsapp/generate: حد المعدل 20/دقيقة/مستخدم', () => {
        it('تحت الحد → 200 يعمل كما قبل (رحلة الإيصال الشرعية لا تنكسر)', async () => {
                const res = await generate();

                expect(res.status).toBe(200);
                expect(checkMock).toHaveBeenCalledWith('wa-gen:10');
        });

        it('الضغط: الطلب 21 في نفس النافذة → 429 برسالة عربية ولا يصل أي استعلام/وسم DB', async () => {
                for (let i = 0; i < 20; i++) {
                        const ok = await generate();
                        expect(ok.status).toBe(200);
                }

                const blocked = await generate();

                expect(blocked.status).toBe(429);
                const json = await blocked.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('محاولات كثيرة جداً. حاول لاحقاً.');
                // الوسم الجانبي whatsappSent لم يُكرر للطلب المحدود
                expect(mockOrderUpdate).toHaveBeenCalledTimes(20);
        });

        it('المفتاح لكل مستخدم (wa-gen:${userId}) — مستخدم آخر لا يتأثر بحجب الأول', async () => {
                // استهلك ميزانية المستخدم 10 كاملة
                for (let i = 0; i < 20; i++) await generate();
                const blocked = await generate();
                expect(blocked.status).toBe(429);

                // مستخدم آخر (المالك نفسه برقم مختلف) — مفتاح مختلف
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 99, permissions: [] };
                const other = await generate();

                expect(other.status).toBe(200);
                expect(checkMock).toHaveBeenCalledWith('wa-gen:99');
        });

        it('المجهول → 401 قبل الحد (لا يحرق ميزانية أحد)', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await generate();

                expect(res.status).toBe(401);
                expect(checkMock).not.toHaveBeenCalled();
                expect(mockOrderFindUnique).not.toHaveBeenCalled();
        });
});

// ── عدّاد 404/403 ───────────────────────────────────────────────────────

describe('round94 LOW-1 — POST /api/whatsapp/generate: بوابات لا تحتاج صف الطلب تسبق الجلب', () => {
        it('USER → 403 قبل أي قراءة للطلب (لا تمييز موجود/غير موجود عبر 404 مقابل 403)', async () => {
                authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 55, permissions: [] };

                const res = await generate();

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('غير مصرح');
                expect(mockOrderFindUnique).not.toHaveBeenCalled();
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin بلا APPROVE_ORDERS → 403 قبل قراءة الطلب', async () => {
                authHolder.value = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 7, permissions: [] };

                const res = await generate();

                expect(res.status).toBe(403);
                expect(mockOrderFindUnique).not.toHaveBeenCalled();
        });
});
