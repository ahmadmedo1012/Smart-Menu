/**
 * g90-F5 (T2) — تغطية وحدة لمسار src/app/api/whatsapp/generate/route.ts
 * (كان صفر تغطية في أي مكان — سلم الأدوار 38-56 ثم update whatsappSent:78).
 *
 * النمط القياسي (admin-routes.test.ts): vi.hoisted + vi.mock للـprisma و
 * @/lib/session فيعمل سلّم المصادقة الحقيقي requireAuth — خلايا RBAC
 * هي موضوع الاختبار لا غلافًا مزيّفًا.
 *
 * ملاحظة سلوك مقروءة من المصدر: المسار يفرّع يدويًا حسب الدور بعد جلب
 * الطلب — «admin» القديم (legacy) يُعامل مثل sub_admin هنا (كلاهما
 * يحتاج APPROVE_ORDERS صراحةً) خلافًا لسلّم requirePermission العام
 * حيث admin يمر بكل شيء عدا MANAGE_USERS.
 *
 * فارق موثّق عن توقعات التكليف (round90-F3، حدث أثناء الجولة): مالك على
 * مطعم آخر بلا رابط صار 403 (مصادَق لكن غير مصرّح — توحيد مع PUT orders/
 * [id] و فصل 401/403 في r89-E3) بينما التكليف ذكر 401 — نختبر السلوك
 * الفعلي القائم (غير المكسور) و نوثّق الفارق في التقرير.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockOrderUpdate = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
// round94-3a: المسار صار محدود المعدل — منكّر مفتوح دائماً هنا (خلايا 429
// في round94-whatsapp-generate-ratelimit.test.ts)
const mockRateCheck = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        order: { findUnique: mockOrderFindUnique, update: mockOrderUpdate },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

const generateRoute = await import('@/app/api/whatsapp/generate/route');

// ── Personas (تُمرَّر لسلّم requireAuth الحقيقي) ─────────────────────────

interface Persona {
        id: number;
        role: string;
        restaurantId: number | null;
        subscriptionStatus: string | null;
        permissions: string[];
}

const persona = (o: Partial<Persona>): Persona => ({
        id: 1,
        role: 'USER',
        restaurantId: null,
        subscriptionStatus: 'active',
        permissions: [],
        ...o,
});

const GUEST = { valid: false as const, userId: null };
const OWNER_A = persona({ id: 10, role: 'owner', restaurantId: 1 });
const OWNER_B = persona({ id: 20, role: 'owner', restaurantId: 5 });
const SUB_ADMIN_NO_PERM = persona({ id: 5, role: 'sub_admin', permissions: ['EDIT_SETTINGS'] });
const SUB_ADMIN_AO = persona({ id: 4, role: 'sub_admin', permissions: ['APPROVE_ORDERS'] });
const ADMIN_LEGACY_NO_PERM = persona({ id: 2, role: 'admin', permissions: [] });
const ADMIN_LEGACY_AO = persona({ id: 3, role: 'admin', permissions: ['APPROVE_ORDERS'] });
const USER_PLAIN = persona({ id: 55, role: 'USER' });
const SUPER_ADMIN = persona({ id: 1, role: 'super_admin' });

const setSession = (user: Persona | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST,
        );
};

// ── Fixtures ────────────────────────────────────────────────────────────

const ORDER = {
        id: 77,
        orderNo: 'ORD-77',
        customerName: 'عميل تجريبي',
        customerPhone: '0910000000',
        pickupType: 'delivery',
        total: 25,
        discount: 0,
        createdAt: new Date('2026-09-01T10:00:00Z'),
        restaurantId: 1,
        restaurant: { name: 'مقهى الواحة', whatsapp: '218910000000' },
        items: [
                {
                        id: 1,
                        quantity: 2,
                        price: 10,
                        notes: 'بدون سكر',
                        item: { id: 9, name: 'Latte', nameAr: 'لاتيه' },
                },
        ],
};

function postRequest(body: unknown): NextRequest {
        return new NextRequest('http://localhost/api/whatsapp/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: typeof body === 'string' ? body : JSON.stringify(body),
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        setSession(OWNER_A);
        mockRateCheck.mockResolvedValue({ success: true, remaining: 19, reset: 0 });
        mockOrderFindUnique.mockResolvedValue(ORDER);
        mockOrderUpdate.mockResolvedValue({ ...ORDER, whatsappSent: true });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
});

// ── مصفوفة الأدوار (role × own/other) ──────────────────────────────────

describe('POST /api/whatsapp/generate — سلم الأدوار عبر المستأجرين', () => {
        it.each([
                ['owner', 'مطعم مملوك له (نفس restaurantId)', 200, OWNER_A],
                ['owner', 'مطعم آخر بلا رابط userRestaurant', 403, OWNER_B],
                ['owner', 'مطعم آخر لكنه مرتبط عبر userRestaurant (متعدد المنيوهات)', 200, OWNER_B],
                ['sub_admin', 'بلا صلاحية APPROVE_ORDERS', 403, SUB_ADMIN_NO_PERM],
                ['sub_admin', 'مع صلاحية APPROVE_ORDERS', 200, SUB_ADMIN_AO],
                ['admin (legacy)', 'بلا صلاحية APPROVE_ORDERS', 403, ADMIN_LEGACY_NO_PERM],
                ['admin (legacy)', 'مع صلاحية APPROVE_ORDERS', 200, ADMIN_LEGACY_AO],
                ['USER', 'دور عادي', 403, USER_PLAIN],
                ['super_admin', 'أعلى دور — يمر (إصلاح r86-A11)', 200, SUPER_ADMIN],
        ])('%s على %s → %i', async (_role, _which, code: number, user: Persona) => {
                setSession(user);
                // مطعم الطلب رقم 1: OWNER_B (restaurantId=5) «مطعم آخر» —
                // الرابط يُحاكى أسفل هذا الاختبار عند الحاجة
                if (user === OWNER_B && code === 200) {
                        mockUserRestaurantFindUnique.mockResolvedValue({ userId: 20, restaurantId: 1 });
                }
                const res = await generateRoute.POST(postRequest({ orderId: 77 }));
                expect(res.status).toBe(code);
        });

        it('owner على مطعم آخر بلا رابط → 403 (مصادَق لكن غير مصرّح — توحيد round90-F3) بغلاف success:false ولا يُحدَّث whatsappSent', async () => {
                setSession(OWNER_B);
                const res = await generateRoute.POST(postRequest({ orderId: 77 }));
                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('غير مصرح');
                // تم فحص الرابط المركّب userId_restaurantId بالضبط
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 20, restaurantId: 1 } },
                });
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('الضيف → 401 قبل أي استعلام prisma (لا تسريب وجود الطلب)', async () => {
                setSession(null);
                const res = await generateRoute.POST(postRequest({ orderId: 77 }));
                expect(res.status).toBe(401);
                expect(mockOrderFindUnique).not.toHaveBeenCalled();
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('طلب غير موجود → 404 «الطلب غير موجود» (r119-S8 عربنة)', async () => {
                mockOrderFindUnique.mockResolvedValue(null);
                const res = await generateRoute.POST(postRequest({ orderId: 999 }));
                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('الطلب غير موجود');
        });

        it('body بلا orderId → 422 مغلّف بتفاصيل zod', async () => {
                const res = await generateRoute.POST(postRequest({}));
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details).toHaveLength(1);
                expect(mockOrderFindUnique).not.toHaveBeenCalled();
        });
});

// ── r121-C2: بند معدَّل بعد r120 — السعر المخزَّن هو الفعلي ─────────────

describe('POST /api/whatsapp/generate — r121-C2: سطر معدَّل يطبع السعر الفعلي مرة واحدة', () => {
        // r120 (4ba875a2) غيّر دلالة OrderItem.price إلى السعر الفعلي (الأساس +
        // فروق الإضافات)، وبقي هذا المسار يجمع deltaSum فوقه → السطر كان
        // base + 2×deltas بينما «المجموع» base + deltas (تعارض الإيصال نفسه
        // الذي أعلنت r120 إصلاحه). الصف r121-C2 يحذف الجمع؛ الصفوف القديمة
        // تعالجها هجرة zz_round121_orderitem_effective_price_backfill.
        const MOD_ORDER = {
                ...ORDER,
                total: 46, // (18 + 5) × 2
                items: [
                        {
                                id: 2,
                                quantity: 2,
                                price: 23, // effective unit price (base 18 + delta 5)
                                notes: '',
                                // r118-B1 snapshot format — parsed without any lookup
                                modifiersJson: JSON.stringify([
                                        { id: 91, nameAr: 'شوكولاتة إضافية', name: 'Extra chocolate', priceDelta: 5 },
                                ]),
                                item: { id: 9, name: 'Latte', nameAr: 'لاتيه' },
                        },
                ],
        };

        it('السطر يطبع 23 د.ل (لا 28) وسطر الإضافات معلوماتي والمجموع يطابق مجموع الأسطر', async () => {
                mockOrderFindUnique.mockResolvedValue(MOD_ORDER);
                const res = await generateRoute.POST(postRequest({ orderId: 77 }));
                expect(res.status).toBe(200);
                const json = await res.json();

                // the stored effective price renders exactly once
                expect(json.data.message).toContain('2x لاتيه - 23 د.ل');
                expect(json.data.message).not.toContain('28 د.ل');
                // deltas stay informational (name + delta), never arithmetic
                expect(json.data.message).toContain('شوكولاتة إضافية (+5 د.ل)');
                // money-truth invariant: lines × qty == stored total
                expect(json.data.message).toContain('المجموع: 46 د.ل');
                expect(23 * 2).toBe(46);
        });

        it('بند بلا إضافات بعد r120 يبقى مطابقاً للسلوك المثبّت (لا انحدار)', async () => {
                mockOrderFindUnique.mockResolvedValue({
                        ...ORDER,
                        items: [{ ...ORDER.items[0], modifiersJson: '[]' }],
                });
                const res = await generateRoute.POST(postRequest({ orderId: 77 }));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.message).toContain('2x لاتيه - 10 د.ل');
                expect(json.data.message).toContain('المجموع: 25 د.ل');
        });
});

// ── النجاح: الرسالة + وسم whatsappSent ─────────────────────────────────

describe('POST /api/whatsapp/generate — التوليد الناجح', () => {
        it('owner مطعمه → 200: update {whatsappSent:true} مرة واحدة بالضبط + رسالة إيصال عربية + رابط wa.me', async () => {
                setSession(OWNER_A);
                const res = await generateRoute.POST(postRequest({ orderId: 77 }));
                expect(res.status).toBe(200);

                expect(mockOrderUpdate).toHaveBeenCalledTimes(1);
                expect(mockOrderUpdate).toHaveBeenCalledWith({
                        where: { id: 77 },
                        data: { whatsappSent: true },
                });

                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.orderId).toBe(77);
                // جسم الإيصال: اسم المطعم، رقم الطلب، سطر الصنف مع الاسم العربي والملاحظات، المجموع
                expect(json.data.message).toContain('مقهى الواحة');
                expect(json.data.message).toContain('ORD-77');
                expect(json.data.message).toContain('2x لاتيه - 10 د.ل');
                expect(json.data.message).toContain('ملاحظات: بدون سكر');
                expect(json.data.message).toContain('المجموع: 25 د.ل');
                // الرابط يرمّز الرسالة كاملة
                expect(json.data.whatsappUrl).toBe(
                        `https://wa.me/218910000000?text=${encodeURIComponent(json.data.message)}`,
                );
        });

        it('مطعم بلا رقم واتساب → whatsappUrl فارغ لكن الإيصال يُولَّد ويُوسَم', async () => {
                mockOrderFindUnique.mockResolvedValue({
                        ...ORDER,
                        restaurant: { name: 'مقهى الواحة', whatsapp: null },
                });
                const res = await generateRoute.POST(postRequest({ orderId: 77 }));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.whatsappUrl).toBeNull();
                expect(mockOrderUpdate).toHaveBeenCalledTimes(1);
        });

        it('super_admin → 200 بدون أي فحص ملكية أو صلاحية (يمر مباشرة)', async () => {
                setSession(SUPER_ADMIN);
                const res = await generateRoute.POST(postRequest({ orderId: 77 }));
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });
});
