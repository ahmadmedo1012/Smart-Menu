/**
 * round92-C7 (agent 3-c) — CRUD/RBAC unit coverage for
 * /api/owner/restaurants/[id] (was 0% lcov, lines 8-118).
 *
 * NOTE: the file exports PATCH + DELETE only — there is no GET/PUT handler
 * (dashboard reads go through /api/restaurants). Tests below pin the two
 * real handlers with mocked prisma/$transaction (orders-create tx pattern)
 * and a controllable requireAuth holder. What they protect:
 *   - ownership tenant scoping: a non-staff caller reaches the UPDATE/DELETE
 *     ONLY through a real UserRestaurant link; otherwise 403 (no 404 leak)
 *   - r90 privilege-escalation fix: sub_admin needs MANAGE_RESTAURANTS to
 *     touch arbitrary restaurants; without it they fall to the link check
 *   - mass-assignment guard: the zod schema whitelists exactly
 *     name/description/isActive (+isPrimary owner-only) — slug/plan/owner
 *     fields silently dropped, never reach prisma
 *   - isPrimary is owner-only (admin schema strips it — would crash in tx)
 *   - primary-menu delete refused (400), subscription expiry (403),
 *     P2025-mapped 404, and the generic no-leak 500
 * round92-wave3-2: legacy `admin` (empty/absent permissions column, e.g. an
 * old migration) now gets FULL trust here like the rest of the platform
 * (requirePermission pattern) — was 403 via the link check, flipped
 * deliberately. sub_admin still needs MANAGE_RESTAURANTS (r90 fix intact).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

// r93-N1: مسار الحذف صار يمحو تقييمات المطعم داخل المعاملة قبل restaurant.delete
// (قيد Restrict) — أضفنا review.deleteMany لِكيّ tx المزيّف.
const tx = vi.hoisted(() => ({
        userRestaurant: { updateMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
        user: { update: vi.fn() },
        restaurant: { update: vi.fn(), delete: vi.fn() },
        review: { deleteMany: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        // r118-A7-P3: the DELETE path now counts orders (has-orders guard) and
        // captures the row for the audit entry before the cascade.
        order: { count: vi.fn().mockResolvedValue(0) },
        restaurant: { findUnique: vi.fn().mockResolvedValue({ id: 313, name: 'مقهى الواحة', slug: 'al-waha-cafe' }) },
        // r121-D6: the DELETE path collects item images for the post-commit
        // blob cleanup (admin-path parity) — none by default.
        menuItem: { findMany: vi.fn().mockResolvedValue([]) },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));

// Mirrors src/lib/subscription-guard.isOwnerSubscriptionActive: staff roles
// bypass; everyone else (owner) is at the mercy of the holder flag.
const subHolder = vi.hoisted(() => ({ active: true }));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async (auth: { role: string }) =>
                ['super_admin', 'sub_admin', 'admin'].includes(auth.role) ? true : subHolder.active),
}));

interface AuthShape {
        authorized: boolean;
        userId: number | null;
        role: string;
        restaurantId: number | null;
        subscriptionStatus: string | null;
        permissions: string[];
}

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                userId: 10 as number | null,
                role: 'owner' as string,
                restaurantId: 1 as number | null,
                subscriptionStatus: 'active' as string | null,
                permissions: [] as string[],
        },
}));

vi.mock('@/lib/auth', () => ({
        requireAuth: async () => authHolder.value,
}));

// ── Personas ─────────────────────────────────────────────────────────────

const persona = (o: Partial<AuthShape>): AuthShape => ({
        authorized: true,
        userId: 10,
        role: 'owner',
        restaurantId: 1,
        subscriptionStatus: 'active',
        permissions: [],
        ...o,
});

const GUEST = persona({ authorized: false, userId: null });
const OWNER_A = persona({ userId: 10, role: 'owner', restaurantId: 1 });
const SUB_ADMIN_ZERO = persona({ userId: 3, role: 'sub_admin', restaurantId: null, permissions: [] });
const SUB_ADMIN_MR = persona({ userId: 4, role: 'sub_admin', restaurantId: null, permissions: ['MANAGE_RESTAURANTS'] });
const ADMIN = persona({ userId: 1, role: 'admin', restaurantId: null, permissions: [] });
const ADMIN_MR = persona({ userId: 1, role: 'admin', restaurantId: null, permissions: ['MANAGE_RESTAURANTS'] });
const SUPER_ADMIN = persona({ userId: 2, role: 'super_admin', restaurantId: null });

// ── Route invocation helpers ────────────────────────────────────────────

const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
        return new NextRequest(url, {
                method,
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
}

async function callPatch(id: number | string, body: unknown) {
        const { PATCH } = await import('@/app/api/owner/restaurants/[id]/route');
        return PATCH(jsonRequest(`http://localhost/api/owner/restaurants/${id}`, 'PATCH', body), idParams(id));
}

async function callDelete(id: number | string) {
        const { DELETE } = await import('@/app/api/owner/restaurants/[id]/route');
        return DELETE(jsonRequest(`http://localhost/api/owner/restaurants/${id}`, 'DELETE'), idParams(id));
}

const RESTAURANT_2 = { id: 2, name: 'Pizza Roma', description: 'بيتزا', isActive: true };

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = persona(OWNER_A);
        subHolder.active = true;
        // Default: NO UserRestaurant links → cross-tenant attempts 403
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockTransaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
        tx.userRestaurant.updateMany.mockResolvedValue({ count: 1 });
        tx.userRestaurant.update.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: true });
        tx.userRestaurant.delete.mockResolvedValue({ userId: 10, restaurantId: 2 });
        tx.user.update.mockResolvedValue({ id: 10, restaurantId: 2 });
        tx.restaurant.update.mockResolvedValue({ ...RESTAURANT_2, name: 'Updated' });
        tx.restaurant.delete.mockResolvedValue({ ...RESTAURANT_2 });
        tx.review.deleteMany.mockResolvedValue({ count: 0 });
});

// ── PATCH /api/owner/restaurants/[id] ───────────────────────────────────

describe('round92-C7 — PATCH /api/owner/restaurants/[id]', () => {
        it('guest → 401 Arabic envelope, no link lookup, no tx', async () => {
                // يحمي: المصادقة قبل أي وصول لموارد المالك
                authHolder.value = persona(GUEST);
                const res = await callPatch(2, { name: 'X' });
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('owner with expired subscription → 403 renewal message BEFORE any ownership lookup', async () => {
                // يحمي: إنفاذ كسول لانتهاء الاشتراك على مسارات المالك
                authHolder.value = persona(OWNER_A);
                subHolder.active = false;
                const res = await callPatch(2, { name: 'X' });
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('اشتراكك منتهي. جدّد اشتراكك للمتابعة.');
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('non-numeric id → 400 «معرف غير صالح» (no prisma call)', async () => {
                // يحمي: معرفات غير الصالحة ترفض قبل الوصول للقاعدة
                authHolder.value = persona(OWNER_A);
                const res = await callPatch('abc', { name: 'X' });
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('معرف غير صالح');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('owner PATCHING a foreign restaurant without a link → 403, tx never runs (tenant isolation)', async () => {
                // يحمي: لا تعديل مطعم لا يملكه المالك
                authHolder.value = persona(OWNER_A);
                const res = await callPatch(2, { name: 'X' });
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('owner WITH a link → 200 and restaurant.update lands on the linked restaurant', async () => {
                // يحمي: المسار المتعدد المنيوهات يعدل المطعم المرتبط فقط
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callPatch(2, { name: 'New Name' });
                expect(res.status).toBe(200);
                expect(tx.restaurant.update).toHaveBeenCalledWith({
                        where: { id: 2 },
                        data: { name: 'New Name' },
                });
                expect((await res.json()).data.name).toBe('Updated');
        });

        it('mass-assignment guard: slug/planId/ownerId in the body are DROPPED — only whitelisted fields reach prisma', async () => {
                // يحمي: العميل لا يستطيع ترقية خطته أو تغيير مالكه عبر PATCH
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callPatch(2, {
                        name: 'X',
                        description: 'd',
                        isActive: false,
                        slug: 'evil-slug',
                        planId: 99,
                        ownerId: 77,
                });
                expect(res.status).toBe(200);
                expect(tx.restaurant.update).toHaveBeenCalledWith({
                        where: { id: 2 },
                        data: { name: 'X', description: 'd', isActive: false },
                });
        });

        it('isPrimary=true runs the primary-switch sequence: clear others → set this → mirror User.restaurantId', async () => {
                // يحمي: تبديل المنيو الأساسي يبقي مالكًا واحدًا أساسيًا واحدًا (اتساق الجلسة)
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callPatch(2, { isPrimary: true });
                expect(res.status).toBe(200);
                expect(tx.userRestaurant.updateMany).toHaveBeenCalledWith({
                        where: { userId: 10 },
                        data: { isPrimary: false },
                });
                expect(tx.userRestaurant.update).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                        data: { isPrimary: true },
                });
                expect(tx.user.update).toHaveBeenCalledWith({
                        where: { id: 10 },
                        data: { restaurantId: 2 },
                });
        });

        it('zod rejects a non-boolean isPrimary / empty name → 422, tx never runs', async () => {
                // يحمي: التحقق من الصيغة قبل الكتابة
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callPatch(2, { isPrimary: 'yes' });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('بيانات غير صالحة');
                expect(Array.isArray(json.details)).toBe(true);
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('sub_admin WITHOUT MANAGE_RESTAURANTS → falls to the link check → 403 (r90 privilege-escalation fix)', async () => {
                // يحمي: عضوية sub_admin لا تمنح صلاحية حرة على كل مطعم
                authHolder.value = persona(SUB_ADMIN_ZERO);
                const res = await callPatch(2, { name: 'X' });
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(tx.restaurant.update).not.toHaveBeenCalled();
        });

        it('round92-wave3-2: legacy admin WITHOUT MANAGE_RESTAURANTS → 200 (full trust, unified with requirePermission) — no link lookup', async () => {
                // كان الأدمن بpermissions فارغة يُرفض هنا خلافًا لبقية المنصة (تقرير 3-c
                // رقم 2) — البوابة اتُّحدت: admin/super_admin ثقة كاملة.
                authHolder.value = persona(ADMIN);
                const res = await callPatch(2, { name: 'X' });
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                expect(tx.restaurant.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { name: 'X' } });
        });

        it('sub_admin WITH MANAGE_RESTAURANTS → 200 on any restaurant AND isPrimary is stripped (admin schema)', async () => {
                // يحمي: مخطط الأدمن يحرم كتابة isPrimary — كتابتها لأدمن كان ستكسر tx
                authHolder.value = persona(SUB_ADMIN_MR);
                const res = await callPatch(2, { name: 'X', isPrimary: true });
                expect(res.status).toBe(200);
                expect(tx.restaurant.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { name: 'X' } });
                expect(tx.userRestaurant.updateMany).not.toHaveBeenCalled();
                expect(tx.user.update).not.toHaveBeenCalled();
        });

        it('admin WITH MANAGE_RESTAURANTS / super_admin → 200, no link lookup needed', async () => {
                // يحمي: موظفو المنصة المصرحون يديرون أي مطعم بلا رابط
                authHolder.value = persona(ADMIN_MR);
                expect((await callPatch(2, { name: 'X' })).status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();

                authHolder.value = persona(SUPER_ADMIN);
                expect((await callPatch(2, { name: 'X' })).status).toBe(200);
                expect(tx.restaurant.update).toHaveBeenCalled();
        });

        it('restaurant vanished mid-flight (P2025 Record to update not found) → 404 «السجل غير موجود»', async () => {
                // يحمي: سباق الحذف يظهر 404 لا 500
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                tx.restaurant.update.mockRejectedValue(new Error('Record to update not found'));
                const res = await callPatch(2, { name: 'X' });
                expect(res.status).toBe(404);
                expect((await res.json()).error).toBe('السجل غير موجود');
        });
});

// ── DELETE /api/owner/restaurants/[id] ──────────────────────────────────

describe('round92-C7 — DELETE /api/owner/restaurants/[id]', () => {
        it('guest → 401, no link lookup, no tx', async () => {
                // يحمي: الحذف أعلى خطورة — المصادقة أولًا
                authHolder.value = persona(GUEST);
                const res = await callDelete(2);
                expect(res.status).toBe(401);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('owner with expired subscription → 403 renewal message', async () => {
                // يحمي: الحذف محجوب بانتهاء الاشتراك مثل التعديل
                authHolder.value = persona(OWNER_A);
                subHolder.active = false;
                const res = await callDelete(2);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('اشتراكك منتهي. جدّد اشتراكك للمتابعة.');
        });

        it('non-numeric id → 400 «معرف غير صالح» (DELETE refuses garbage ids before any lookup)', async () => {
                // يحمي: معرف غير صالح لا يشغّل أي مسار حذف
                authHolder.value = persona(OWNER_A);
                const res = await callDelete('abc');
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('معرف غير صالح');
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('owner deleting a FOREIGN restaurant without a link → 403, nothing deleted', async () => {
                // يحمي: عزل المستأجرين في الحذف
                authHolder.value = persona(OWNER_A);
                const res = await callDelete(2);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('owner deleting their PRIMARY menu → 400 with the reassignment hint, tx never runs', async () => {
                // يحمي: منع حذف المنيو الأساسي (كان يترك المالك بلا جلسة مطعم)
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: true });
                const res = await callDelete(2);
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('لا يمكن حذف المنيو الأساسي. عيّن منيو آخر كأساسي أولاً.');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('owner deleting a non-primary linked menu → link row deleted FIRST, then the restaurant, 200 { deleted: true }', async () => {
                // يحمي: ترتيب الحذف داخل المعاملة (الرابط قبل المطعم) والاستجابة المتوقعة
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callDelete(2);
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: { deleted: true } });
                expect(tx.userRestaurant.delete).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(tx.restaurant.delete).toHaveBeenCalledWith({ where: { id: 2 } });
                expect(
                        tx.userRestaurant.delete.mock.invocationCallOrder[0] <
                        tx.restaurant.delete.mock.invocationCallOrder[0]
                ).toBe(true);
        });

        it('sub_admin WITHOUT MANAGE_RESTAURANTS → 403 (cannot delete arbitrary restaurants)', async () => {
                // يحمي: نفس إصلاح r90 على فعل الحذف
                authHolder.value = persona(SUB_ADMIN_ZERO);
                const res = await callDelete(2);
                expect(res.status).toBe(403);
                expect(tx.restaurant.delete).not.toHaveBeenCalled();
        });

        it('super_admin deletes WITHOUT touching the owner link row (platform cleanup)', async () => {
                // يحمي: حذف المنصة لا يعتمد على رابط مالك (وcascade يتكفل بالبقية)
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callDelete(2);
                expect(res.status).toBe(200);
                expect(tx.restaurant.delete).toHaveBeenCalledWith({ where: { id: 2 } });
                expect(tx.userRestaurant.delete).not.toHaveBeenCalled();
        });

        it('round92-wave3-2 (DELETE): legacy admin WITHOUT permissions → 200 full-trust delete (no link row touched)', async () => {
                // نفس التوحيد على فعل الحذف — أدمن permissions فارغة يحذف كمدير منصة
                authHolder.value = persona(ADMIN);
                const res = await callDelete(2);
                expect(res.status).toBe(200);
                expect(tx.restaurant.delete).toHaveBeenCalledWith({ where: { id: 2 } });
                expect(tx.userRestaurant.delete).not.toHaveBeenCalled();
        });

        it('restaurant vanished mid-flight (P2025 Record to delete not found) → 404 «السجل غير موجود»', async () => {
                // يحمي: سباق الحذف المزدوج يظهر 404 نظيف
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                tx.restaurant.delete.mockRejectedValue(new Error('Record to delete not found'));
                const res = await callDelete(2);
                expect(res.status).toBe(404);
                expect((await res.json()).error).toBe('السجل غير موجود');
        });
});
