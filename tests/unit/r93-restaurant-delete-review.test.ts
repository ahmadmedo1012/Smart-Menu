/**
 * r93-N1 (F2/H-1 من تقرير التفتيش 1-c) — انحدار حذف المطعم الذي لديه تقييمات.
 *
 * الخلل: قيد Review_menuItemId_fkey=Restrict (schema.prisma:504) لا يُحذف
 * التقييمات أي cascade، ومسارا الحذف (owner + admin) كانا يستدعيان
 * restaurant.delete مباشرة → P2003 → 400 دائم متى وُجد تقييم واحد على أي
 * صنف للمطعم (لا يوجد حتى مسار API لحذف تقييم يدويًا — الحذف كان مكسورًا
 * كليًا). نفس المصير كان محتمًا لبنود الطلبات (OrderItem_itemId_fkey=Restrict)
 * لولا ترتيب مشغّلات RI الداخلي (قائمة FIFO) الذي يُبقيها على قيد الحياة —
 * سلوك هش وثّقه المفتش وطلب اختبارًا عمليًا يثبّته.
 *
 * الإصلاح: داخل معاملة الحذف نفسها تُمحى التقييمات صراحة قبل
 * restaurant.delete (قرار موثّق: التقييمات PII مرتبطة بأصناف المطعم المحذوفة
 * أصلًا — cascade التصنيفات/الأصناف ستُبيد الأصناف، فبقاء التقييمات يعني
 * قيودًا معلّقة أو 400 أبديًا؛ الحذف مع المطعم هو الخيار المتسق مع نمط
 * حذف المستخدم الذي يزيل PII المرتبطة داخل المعاملة).
 *
 * الدليل الحي على سلوك القاعدة نفسها (خارج الوحدة لأن CI لا يوفر قاعدة
 * للوحدة): قياس node+pg على قاعدة الجولة (localhost:5434) داخل BEGIN/ROLLBACK:
 *   قبل الإصلاح:  DELETE FROM "Restaurant" → 23001 Review_menuItemId_fkey
 *   بعد الإصلاح:  حذف التقييمات (count=1) ثم الحذف ينجح، ولا يتيمة بعده
 *   (items=0 · orders=0 · orderItems=0 · reviews=0 — cascade تتكفل بالبقية).
 *
 * النمط القياسي: r92-owner-restaurant-id.test.ts (owner) + blob-ordering
 * (admin) — vi.hoisted + vi.mock للـprisma/$transaction فيعمل السلّم الحقيقي.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── منكّرات مشتركة ──────────────────────────────────────────────────────

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: 0, failed: [] }));
vi.mock('@/lib/telegram', () => ({
        notifyEvent: mockNotifyEvent,
        sendTelegramNotification: vi.fn(),
}));

// حارس الاشتراك (owner): الأدوار الإدارية تمر دائمًا
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));

const mockRevalidateMenu = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidateMenu }));
const mockRevalidatePath = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

const mockDeleteBlob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/blob', () => ({
        deleteBlob: mockDeleteBlob,
        mediaUrlError: vi.fn(() => null),
}));

// محدد المعدل (N7 على GET) — منكَّر مركزيًا ككل عائلة المسارات المحدَّدة
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 59, reset: 0 })),
                destroy: () => {},
        }),
}));

// ── كائن tx مزيّف واحد يخدم كلا المسارين ────────────────────────────────

const txReviewDeleteMany = vi.hoisted(() => vi.fn());
const txRestaurantDelete = vi.hoisted(() => vi.fn());
const txUserRestaurantDelete = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

const tx = vi.hoisted(() => ({
        review: { deleteMany: txReviewDeleteMany },
        restaurant: { delete: txRestaurantDelete },
        userRestaurant: { delete: txUserRestaurantDelete },
}));

const mockTransaction = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        $transaction: mockTransaction,
        menuItem: { findMany: mockMenuItemFindMany },
        restaurant: { findUnique: mockRestaurantFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        // r118-A7-P3: مسار الحذف يعدّ الطلبات الآن (حارس «لديه طلبات») — الافتراضي 0.
        order: { count: vi.fn().mockResolvedValue(0) },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// السلّم الحقيقي (requireAuth) يعمل فوق session منكّرة — كنمط rbac-matrix
const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                userId: 10 as number | null,
                role: 'super_admin' as string,
                restaurantId: null as number | null,
                subscriptionStatus: 'active' as string | null,
                permissions: [] as string[],
        },
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: async () => authHolder.value,
        requirePermission: async () =>
                authHolder.value.authorized
                        ? { authorized: true, userId: authHolder.value.userId, role: authHolder.value.role, error: undefined, status: undefined }
                        : { authorized: false, error: 'غير مصرح', status: 401 },
}));

// ── أدوات النداء ────────────────────────────────────────────────────────

const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

function jsonRequest(url: string, method: string): NextRequest {
        return new NextRequest(url, { method });
}

async function callOwnerDelete(id: number | string) {
        const { DELETE } = await import('@/app/api/owner/restaurants/[id]/route');
        return DELETE(jsonRequest(`http://localhost/api/owner/restaurants/${id}`, 'DELETE'), idParams(id));
}

async function callAdminDelete(id: number | string) {
        const { DELETE } = await import('@/app/api/restaurants/[id]/route');
        return DELETE(jsonRequest(`http://localhost/api/restaurants/${id}`, 'DELETE'), idParams(id));
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = {
                authorized: true,
                userId: 10,
                role: 'super_admin',
                restaurantId: null,
                subscriptionStatus: 'active',
                permissions: [],
        };
        mockTransaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
        txReviewDeleteMany.mockResolvedValue({ count: 2 }); // مطعم لديه تقييمان
        txRestaurantDelete.mockResolvedValue({ id: 2, name: 'Pizza Roma' });
        txUserRestaurantDelete.mockResolvedValue({ userId: 10, restaurantId: 2 });
        mockMenuItemFindMany.mockResolvedValue([{ image: 'https://blob.example/1.jpg' }]);
        mockRestaurantFindUnique.mockImplementation(async () => ({
                id: 2,
                logo: 'https://blob.example/logo.jpg',
                gallery: [],
                slug: 'pizza-roma',
        }));
});

// ═══ مسار المالك: DELETE /api/owner/restaurants/[id] ═══════════════════

describe('r93-N1 — حذف المنيو غير الأساسي (مسار المالك) مع تقييمات', () => {
        it('الحذف ينجح: التقييمات تُمحى داخل المعاملة قبل restaurant.delete بشرط النطاق الصحيح', async () => {
                authHolder.value = { ...authHolder.value, role: 'owner', userId: 10, restaurantId: 1 };
                mockPrisma.userRestaurant.findUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });

                const res = await callOwnerDelete(2);
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: { deleted: true } });

                // نطاق الحذف: كل تقييم لصنف يتبع تصنيفًا يتبع هذا المطعم تحديدًا
                expect(txReviewDeleteMany).toHaveBeenCalledWith({
                        where: { menuItem: { category: { restaurantId: 2 } } },
                });
                expect(txRestaurantDelete).toHaveBeenCalledWith({ where: { id: 2 } });
                // الترتيب داخل المعاملة: التقييمات أولًا ثم المطعم (وإلا P2003)
                expect(
                        txReviewDeleteMany.mock.invocationCallOrder[0] <
                        txRestaurantDelete.mock.invocationCallOrder[0]
                ).toBe(true);
        });

        it('فشل محو التقييمات يُجهض المعاملة كلها (لا مطعم بلا تقييماته — ذرّية r92 محفوظة)', async () => {
                authHolder.value = { ...authHolder.value, role: 'owner', userId: 10, restaurantId: 1 };
                mockPrisma.userRestaurant.findUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                txReviewDeleteMany.mockRejectedValue(Object.assign(new Error('Foreign key constraint failed'), { code: 'P2003' }));

                const res = await callOwnerDelete(2);
                // مطعم لديه تقييم: كان 400 دائمًا قبل الإصلاح — يبقى 400 نظيفًا لو فشل
                // المحو نفسه (P2003→«بيانات مرتبطة» عبر handleError) لكن دون حذف المطعم
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات مرتبطة لا يمكن حذفها');
                expect(txRestaurantDelete).not.toHaveBeenCalled();
        });

        it('حذف أدمن (MANAGE_RESTAURANTS عبر super_admin) يمر بالمسار نفسه بلا حذف رابط', async () => {
                const res = await callOwnerDelete(2);
                expect(res.status).toBe(200);
                expect(txReviewDeleteMany).toHaveBeenCalled();
                expect(txRestaurantDelete).toHaveBeenCalled();
                expect(txUserRestaurantDelete).not.toHaveBeenCalled();
        });
});

// ═══ مسار الأدمن: DELETE /api/restaurants/[id] ═════════════════════════

describe('r93-N1 — حذف مطعم الأدمن مع تقييمات (صنف + طلب + تقييم)', () => {
        it('الحذف ينجح: التقييمات تُمحى داخل $transaction قبل restaurant.delete', async () => {
                const res = await callAdminDelete(2);
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: { deleted: true } });

                expect(mockTransaction).toHaveBeenCalledTimes(1);
                expect(txReviewDeleteMany).toHaveBeenCalledWith({
                        where: { menuItem: { category: { restaurantId: 2 } } },
                });
                expect(txRestaurantDelete).toHaveBeenCalledWith({ where: { id: 2 } });
                expect(
                        txReviewDeleteMany.mock.invocationCallOrder[0] <
                        txRestaurantDelete.mock.invocationCallOrder[0]
                ).toBe(true);
        });

        it('جمع الصور وقراءة صف المطعم يبقيان قبل المعاملة، ومحو البlobs بعدها (نمط round86-A3 محفوظ)', async () => {
                const res = await callAdminDelete(2);
                expect(res.status).toBe(200);
                expect(mockMenuItemFindMany).toHaveBeenCalledWith({
                        where: { category: { is: { restaurantId: 2 } } },
                        select: { image: true },
                });
                // الصور لا تُمس إلا بعد نجاح المعاملة
                expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.example/1.jpg', { restaurantId: 2 });
                expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.example/logo.jpg', { restaurantId: 2 });
                expect(
                        mockTransaction.mock.invocationCallOrder[0] <
                        mockDeleteBlob.mock.invocationCallOrder[0]
                ).toBe(true);
                // purge كاش المنيو المحذوف (round88-A2) ما زال يُستدعى بعد الحذف
                expect(mockRevalidatePath).toHaveBeenCalledWith('/menu/pizza-roma');
        });

        it('فشل المعاملة (P2003) → 400 «بيانات مرتبطة» و لا حذف blobs ولا purge — أثر جانبي نظيف', async () => {
                txRestaurantDelete.mockRejectedValue(
                        Object.assign(new Error('Foreign key constraint failed on the fields: (`menuItemId`)'), { code: 'P2003' })
                );
                const res = await callAdminDelete(2);
                // P2003 → handleError يعيده 400 «بيانات مرتبطة لا يمكن حذفها»
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('بيانات مرتبطة لا يمكن حذفها');
                expect(mockDeleteBlob).not.toHaveBeenCalled();
                expect(mockRevalidatePath).not.toHaveBeenCalled();
        });

        it('معرف غير رقمي → 400 قبل أي قراءة أو معاملة', async () => {
                const res = await callAdminDelete('abc');
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('معرف غير صالح');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('بوابة MANAGE_RESTAURANTS: ضيف → 401 بلا معاملة', async () => {
                authHolder.value = { ...authHolder.value, authorized: false, userId: null };
                const res = await callAdminDelete(2);
                expect(res.status).toBe(401);
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});
