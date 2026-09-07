/**
 * round92-C7 (agent 3-c) — CRUD/RBAC unit coverage for
 * /api/admin/admins/[id] (was 0% lcov, lines 9-102).
 *
 * The sub_admin management surface: PUT (permissions), DELETE (remove),
 * POST (revoke sessions). All three run for real with mocked prisma and a
 * requirePermission holder mirroring src/lib/auth.ts (super_admin pass /
 * admin blocked on MANAGE_USERS / sub_admin needs the exact permission —
 * the ladder itself is pinned by rbac-matrix.test.ts). What these tests
 * protect:
 *   - only super_admin manages admins: even a sub_admin GRANTED
 *     MANAGE_USERS is refused by the route's own role check (the r90
 *     escalation guard — delegated permission must not equal delegation of
 *     user management itself)
 *   - super_admin targets are untouchable for edit AND delete
 *     («لا يمكن تعديل/حذف مدير عام») — no self-demolition of the platform
 *   - permissions are validated against the REAL Prisma Permission enum —
 *     arbitrary strings are a 422, and an empty list (strip all) is a
 *     legitimate write
 *   - audit trail rows for every mutation (update_permissions /
 *     revoke_sessions / delete)
 * Behavior pinned as-is (reported, not fixed): POST (session revocation)
 * does NOT check the target exists — an unknown id returns 200 with
 * revokedSessions: 0 (harmless, but a different contract than PUT/DELETE).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AuditAction } from '@/generated/prisma/enums';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserDelete = vi.hoisted(() => vi.fn());
const mockSessionDeleteMany = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn(async () => {}));

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique, update: mockUserUpdate, delete: mockUserDelete },
        session: { deleteMany: mockSessionDeleteMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

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
                userId: 2 as number | null,
                role: 'super_admin' as string,
                restaurantId: null as number | null,
                subscriptionStatus: null as string | null,
                permissions: [] as string[],
        },
}));

const mockRequirePermission = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
        requirePermission: mockRequirePermission,
        requireAuth: async () => authHolder.value,
}));

// ── Personas ─────────────────────────────────────────────────────────────

const persona = (o: Partial<AuthShape>): AuthShape => ({
        authorized: true,
        userId: 2,
        role: 'super_admin',
        restaurantId: null,
        subscriptionStatus: null,
        permissions: [],
        ...o,
});

const GUEST = persona({ authorized: false, userId: null });
const SUPER_ADMIN = persona({ userId: 2, role: 'super_admin' });
const ADMIN = persona({ userId: 1, role: 'admin' });
const SUB_ADMIN_ZERO = persona({ userId: 3, role: 'sub_admin', permissions: [] });
const SUB_ADMIN_MU = persona({ userId: 4, role: 'sub_admin', permissions: ['MANAGE_USERS'] });

// ── Route invocation helpers ────────────────────────────────────────────

const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
        return new NextRequest(url, {
                method,
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
}

async function callPut(id: number | string, body: unknown) {
        const { PUT } = await import('@/app/api/admin/admins/[id]/route');
        return PUT(jsonRequest(`http://localhost/api/admin/admins/${id}`, 'PUT', body), idParams(id));
}

async function callDelete(id: number | string) {
        const { DELETE } = await import('@/app/api/admin/admins/[id]/route');
        return DELETE(jsonRequest(`http://localhost/api/admin/admins/${id}`, 'DELETE'), idParams(id));
}

async function callPost(id: number | string) {
        const { POST } = await import('@/app/api/admin/admins/[id]/route');
        return POST(jsonRequest(`http://localhost/api/admin/admins/${id}`, 'POST'), idParams(id));
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = persona(SUPER_ADMIN);
        // Default target: an ordinary sub_admin row
        mockUserFindUnique.mockResolvedValue({ role: 'sub_admin' });
        mockUserUpdate.mockImplementation(async (args: { data: { permissions: string[] } }) => ({
                id: 7,
                username: 'helper',
                name: 'مساعد',
                role: 'sub_admin',
                permissions: args.data.permissions,
        }));
        mockUserDelete.mockResolvedValue({ id: 7 });
        mockSessionDeleteMany.mockResolvedValue({ count: 2 });
        // Mirror of src/lib/auth.ts requirePermission ladder
        mockRequirePermission.mockImplementation(async (permission: string) => {
                const v = authHolder.value;
                if (!v.authorized) return { authorized: false as const, error: 'غير مصرح', status: 401 };
                if (v.role === 'super_admin') return { ...v, authorized: true as const };
                if (v.role === 'admin') {
                        if (permission === 'MANAGE_USERS') {
                                return { authorized: false as const, error: 'لا تملك الصلاحية', status: 403 };
                        }
                        return { ...v, authorized: true as const };
                }
                if (v.role === 'sub_admin' && v.permissions.includes(permission)) {
                        return { ...v, authorized: true as const };
                }
                return { authorized: false as const, error: 'لا تملك الصلاحية', status: 403 };
        });
});

// ── PUT /api/admin/admins/[id] — permission writes ──────────────────────

describe('round92-C7 — PUT /api/admin/admins/[id] (permissions)', () => {
        it('guest → 401 Arabic envelope, target row never read', async () => {
                // يحمي: إدارة المديرين تتطلب جلسة قبل أي قراءة
                authHolder.value = persona(GUEST);
                const res = await callPut(7, { permissions: ['VIEW_ANALYTICS'] });
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        it('sub_admin with zero permissions → 403 «لا تملك الصلاحية» (MANAGE_USERS gate)', async () => {
                // يحمي: عضوية الدور لا تكفي لإدارة المستخدمين
                authHolder.value = persona(SUB_ADMIN_ZERO);
                const res = await callPut(7, { permissions: [] });
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لا تملك الصلاحية');
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('legacy admin → 403 (MANAGE_USERS is super_admin-only, even for full-trust admin)', async () => {
                // يحمي: منع الأدمن من إنشاء/تعديل صلاحيات = منع ترقية الصلاحيات
                authHolder.value = persona(ADMIN);
                const res = await callPut(7, { permissions: [] });
                expect(res.status).toBe(403);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin GRANTED MANAGE_USERS → still 403 (route super_admin-only check — r90 escalation guard)', async () => {
                // يحمي: الإذن المفوَّض لا يعني تفويض إدارة المديرين نفسها
                authHolder.value = persona(SUB_ADMIN_MU);
                const res = await callPut(7, { permissions: [] });
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('super_admin → 200 and the permission set lands on user.update with the exact select', async () => {
                // يحمي: الكتابة الفعلية للصلاحيات بشكلها المتوقع
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callPut(7, { permissions: ['VIEW_ANALYTICS', 'APPROVE_ORDERS'] });
                expect(res.status).toBe(200);
                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: 7 },
                        data: { permissions: ['VIEW_ANALYTICS', 'APPROVE_ORDERS'] },
                        select: { id: true, username: true, name: true, role: true, permissions: true },
                });
                const json = await res.json();
                expect(json.data.permissions).toEqual(['VIEW_ANALYTICS', 'APPROVE_ORDERS']);
        });

        it('EMPTY permission list is a legitimate write (strip all permissions, not a 400)', async () => {
                // يحمي: سحب كل الصلاحيات إجراء إداري سليم — القائمة الفارغة صيغة صالحة
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callPut(7, { permissions: [] });
                expect(res.status).toBe(200);
                expect(mockUserUpdate.mock.calls[0][0].data.permissions).toEqual([]);
        });

        it('permissions key omitted → zod default [] (same strip-all semantics)', async () => {
                // يحمي: العقد الافتراضي — غياب المفتاح = قائمة فارغة
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callPut(7, {});
                expect(res.status).toBe(200);
                expect(mockUserUpdate.mock.calls[0][0].data.permissions).toEqual([]);
        });

        it('invalid permission string → 422 with Arabic envelope + details (enum-validated, no free text lands in DB)', async () => {
                // يحمي: صيغة صلاحيات غير صالحة ترفض قبل الكتابة
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callPut(7, { permissions: ['BANANA'] });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('بيانات غير صالحة');
                expect(Array.isArray(json.details)).toBe(true);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('non-array permissions shape → 422', async () => {
                // يحمي: شكل غير صالح (نص بدل مصفوفة) يرفض
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callPut(7, { permissions: 'VIEW_ANALYTICS' });
                expect(res.status).toBe(422);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('non-numeric id → 400 «معرف غير صالح»', async () => {
                // يحمي: معرف غير صالح لا يصل للقاعدة
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callPut('abc', { permissions: [] });
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('معرف غير صالح');
        });

        it('unknown target → 404 «المستخدم غير موجود», update never runs', async () => {
                // يحمي: لا كتابة على مستخدم غير موجود
                authHolder.value = persona(SUPER_ADMIN);
                mockUserFindUnique.mockResolvedValue(null);
                const res = await callPut(999, { permissions: [] });
                expect(res.status).toBe(404);
                expect((await res.json()).error).toBe('المستخدم غير موجود');
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('target is super_admin → 403 «لا يمكن تعديل مدير عام» (r90 protection)', async () => {
                // يحمي: لا أحد (ولا حتى super_admin آخر) يعدل صلاحيات مدير عام
                authHolder.value = persona(SUPER_ADMIN);
                mockUserFindUnique.mockResolvedValue({ role: 'super_admin' });
                const res = await callPut(8, { permissions: [] });
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لا يمكن تعديل مدير عام');
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('audit row: action=update, targetType=User, metadata.action=update_permissions with the granted set', async () => {
                // يحمي: كل تعديل صلاحيات موثق للتدقيق (إسناد المسؤولية)
                authHolder.value = persona(SUPER_ADMIN);
                await callPut(7, { permissions: ['VIEW_ANALYTICS'] });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: AuditAction.update,
                                actorId: 2,
                                targetType: 'User',
                                targetId: 7,
                                metadata: { action: 'update_permissions', permissions: ['VIEW_ANALYTICS'] },
                        })
                );
        });
});

// ── DELETE /api/admin/admins/[id] ───────────────────────────────────────

describe('round92-C7 — DELETE /api/admin/admins/[id]', () => {
        it('sub_admin (even WITH MANAGE_USERS) → 403, delete never runs', async () => {
                // يحمي: حذف المديرين حكر على super_admin
                authHolder.value = persona(SUB_ADMIN_MU);
                const res = await callDelete(7);
                expect(res.status).toBe(403);
                expect(mockUserDelete).not.toHaveBeenCalled();
        });

        it('super_admin deletes a sub_admin → user.delete + audit delete + { deleted: true }', async () => {
                // يحمي: عقد الحذف السليم مع التدقيق
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callDelete(7);
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: { deleted: true } });
                expect(mockUserDelete).toHaveBeenCalledWith({ where: { id: 7 } });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: AuditAction.delete,
                                actorId: 2,
                                targetType: 'User',
                                targetId: 7,
                        })
                );
        });

        it('target is super_admin → 403 «لا يمكن حذف مدير عام» (self-demolition guard)', async () => {
                // يحمي: لا حذف لمدير عام
                authHolder.value = persona(SUPER_ADMIN);
                mockUserFindUnique.mockResolvedValue({ role: 'super_admin' });
                const res = await callDelete(8);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لا يمكن حذف مدير عام');
                expect(mockUserDelete).not.toHaveBeenCalled();
        });

        it('non-numeric id → 400 «معرف غير صالح» (delete refuses garbage ids before any lookup)', async () => {
                // يحمي: معرف غير صالح لا يشغّل أي حذف
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callDelete('abc');
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('معرف غير صالح');
                expect(mockUserDelete).not.toHaveBeenCalled();
        });

        it('unexpected DB failure on delete → 500 generic Arabic message, nothing internal leaked', async () => {
                // يحمي: فشل الحذف لا يكشف تفاصيل القاعدة
                authHolder.value = persona(SUPER_ADMIN);
                mockUserDelete.mockRejectedValue(new Error('fk cascade internals'));
                const res = await callDelete(7);
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('fk cascade');
        });

        it('unknown target → 404 «المستخدم غير موجود»', async () => {
                // يحمي: حذف المستهدف الغائب 404 نظيف
                authHolder.value = persona(SUPER_ADMIN);
                mockUserFindUnique.mockResolvedValue(null);
                const res = await callDelete(999);
                expect(res.status).toBe(404);
                expect(mockUserDelete).not.toHaveBeenCalled();
        });

        it('non-numeric id → 400 «معرف غير صالح»', async () => {
                // يحمي: معرف غير صالح قبل الحذف
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callDelete('x1');
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('معرف غير صالح');
        });
});

// ── POST /api/admin/admins/[id] — session revocation ────────────────────

describe('round92-C7 — POST /api/admin/admins/[id] (revoke sessions)', () => {
        it('super_admin → sessions deleted for THAT user only + audit with deletedCount', async () => {
                // يحمي: سحب الجلسات مقيّد بالمستهدف + موثق بالعدد
                authHolder.value = persona(SUPER_ADMIN);
                const res = await callPost(7);
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: { revokedSessions: 2 } });
                expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: AuditAction.update,
                                targetType: 'User',
                                targetId: 7,
                                metadata: { action: 'revoke_sessions', deletedCount: 2 },
                        })
                );
        });

        it('pinned contract: unknown target is NOT 404 here → 200 { revokedSessions: 0 } (deleteMany is idempotent)', async () => {
                // يثبّت السلوك الفعلي (تقرير 3-c): POST لا يفحص وجود المستهدف — 0 جلسات محذوفة
                authHolder.value = persona(SUPER_ADMIN);
                mockSessionDeleteMany.mockResolvedValue({ count: 0 });
                const res = await callPost(999);
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: { revokedSessions: 0 } });
        });

        it('sub_admin WITH MANAGE_USERS → 403 (same super-only surface as PUT/DELETE)', async () => {
                // يحمي: سحب جلسات موظف آخر صلاحية إدارية عليا
                authHolder.value = persona(SUB_ADMIN_MU);
                const res = await callPost(7);
                expect(res.status).toBe(403);
                expect(mockSessionDeleteMany).not.toHaveBeenCalled();
        });

        it('unexpected DB failure on session revocation → 500 generic Arabic message, nothing leaked', async () => {
                // يحمي: فشل سحب الجلسات لا يسرب
                authHolder.value = persona(SUPER_ADMIN);
                mockSessionDeleteMany.mockRejectedValue(new Error('session table internals'));
                const res = await callPost(7);
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('session table');
        });

        it('guest → 401 before anything', async () => {
                // يحمي: لا سحب جلسات بلا جلسة
                authHolder.value = persona(GUEST);
                const res = await callPost(7);
                expect(res.status).toBe(401);
                expect(mockSessionDeleteMany).not.toHaveBeenCalled();
        });
});
