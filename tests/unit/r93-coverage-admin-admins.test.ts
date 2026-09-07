/**
 * r93-W3 — جزيرة تغطية 1: POST /api/admin/admins (كان 35% أسطر — المسار
 * الأساسي لدعوة sub_admin لم يكن له اختبار وحدة واحد؛ كل تغطية الجولة
 * السابقة كانت للمسار الفرعي [id] وإصدار GET هنا، تقرير 1-e §3).
 *
 * المعالج يُشغَّل حقيقيًا (منكَّرات الحدود فقط: prisma عبر vi.hoisted،
 * requirePermission كحامل مرآة لسلّم src/lib/auth.ts — السلّم نفسه مثبّت
 * في rbac-matrix.test.ts — وlogAudit وhashPassword منكَّر لتفادي تكلفة
 * pbkdf2 600k). ما تحميه هذه الاختبارات:
 *   - بوابة الدور المزدوجة: MANAGE_USERS وحدها لا تكفي — admin التقي الثقة
 *     يسقط في «لا تملك الصلاحية» من السلّم، وsub_admin مفوَّض بالإذن نفسه
 *     يسقط في «غير مصرح» من فحص الدور الخاص بالمسار (حارس الترقية r90:
 *     التفويض لا يعني تفويض إدارة المديرين نفسها — نفس عقد [id])
 *   - عقد الإنشاء: role=sub_admin دائمًا + permissions كما وردت + select
 *     بلا password أبدًا (لا كلمة مرور في أي استجابة) + تجزئة كلمة المرور
 *     قبل الوصول للقاعدة
 *   - 409 اسم مستخدم مكرر قبل أي إنشاء · 422 صيغة (إذن غير معرف في enum
 *     الحقيقي، كلمة مرور قصيرة) · 400 جسم غير JSON
 *   - التدقيق: صف إنشاء لكل دعوة ناجحة (action=create, targetType=User)
 *     مع actorId من الجلسة (وبصيغة undefined عند غيابه)
 *   - GET: فشل findMany → 500 عربي عام بلا تسريب (الفرع الوحيد الباقي)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AuditAction } from '@/generated/prisma/enums';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserCreate = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn(async () => {}));

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique, create: mockUserCreate, findMany: mockUserFindMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/hash', () => ({ hashPassword: mockHashPassword }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

// Session persona holder — requirePermission resolves it; the mock mirrors
// the real ladder (src/lib/auth.ts): super_admin pass / admin full-trust
// except MANAGE_USERS / sub_admin needs the exact permission / else 403.
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
const SUB_ADMIN_MU = persona({ userId: 4, role: 'sub_admin', permissions: ['MANAGE_USERS'] });

// ── Route invocation helpers ────────────────────────────────────────────

const INVITE = {
        username: 'helper99',
        password: 'StrongPass123',
        name: 'مساعد مركز',
        permissions: ['VIEW_ANALYTICS', 'APPROVE_ORDERS'],
};

function jsonRequest(body?: unknown): NextRequest {
        return new NextRequest('http://localhost/api/admin/admins', {
                method: 'POST',
                ...(body !== undefined ? { body: JSON.stringify(body) } : { body: 'not-json' }),
        });
}

async function callPost(body?: unknown) {
        const { POST } = await import('@/app/api/admin/admins/route');
        return POST(jsonRequest(body));
}

async function callGet() {
        const { GET } = await import('@/app/api/admin/admins/route');
        return GET();
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = persona(SUPER_ADMIN);
        // default: username is free, create succeeds, hash is instant
        mockUserFindUnique.mockResolvedValue(null);
        mockHashPassword.mockImplementation((pw: string) => `hashed:${pw}`);
        mockUserCreate.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
                id: 77,
                username: args.data.username,
                name: args.data.name,
                role: 'sub_admin',
                permissions: args.data.permissions,
                createdAt: new Date('2026-09-07T10:00:00Z'),
        }));
        mockUserFindMany.mockResolvedValue([]);
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

// ── POST — بوابة الدور المزدوجة ─────────────────────────────────────────

describe('r93-W3 — POST /api/admin/admins (دعوة sub_admin)', () => {
        it('guest → 401 عربي، لا قراءة اسم مستخدم إطلاقًا', async () => {
                // يحمي: الدعوات تتطلب جلسة قبل أي استعلام
                authHolder.value = persona(GUEST);
                const res = await callPost(INVITE);
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('admin (ثقة كاملة) → 403 «لا تملك الصلاحية» — MANAGE_USERS حكر super_admin', async () => {
                // يحمي: منع الأدمن من صوغ المشرفين = منع ترقية الصلاحيات
                authHolder.value = persona(ADMIN);
                const res = await callPost(INVITE);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لا تملك الصلاحية');
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('sub_admin مفوَّض بـ MANAGE_USERS نفسها → 403 «غير مصرح» (فحص دور المسار — حارس الترقية r90)', async () => {
                // يحمي: الإذن المفوَّض لا يعني تفويض إنشاء مديرين — نفس عقد [id]
                authHolder.value = persona(SUB_ADMIN_MU);
                const res = await callPost(INVITE);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_USERS');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
        });
});

// ── POST — عقد الإنشاء والتدقيق ─────────────────────────────────────────

describe('r93-W3 — POST /api/admin/admins: الإنشاء السليم', () => {
        it('super_admin → 200: role=sub_admin + الصلاحيات كما وردت + select بلا password أبدًا', async () => {
                // يحمي: الدعوة تنشئ مشرفًا فعلًا ولا تسرب كلمة المرور في أي رد
                const res = await callPost(INVITE);
                expect(res.status).toBe(200);
                expect(mockUserCreate).toHaveBeenCalledTimes(1);
                const createArg = mockUserCreate.mock.calls[0][0];
                expect(createArg.data).toEqual({
                        username: 'helper99',
                        password: 'hashed:StrongPass123',
                        name: 'مساعد مركز',
                        role: 'sub_admin',
                        permissions: ['VIEW_ANALYTICS', 'APPROVE_ORDERS'],
                });
                expect(createArg.select).toEqual({
                        id: true, username: true, name: true, role: true, permissions: true, createdAt: true,
                });
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toMatchObject({ username: 'helper99', role: 'sub_admin' });
                expect(JSON.stringify(json)).not.toContain('password');
        });

        it('كلمة المرور تُجزَّأ قبل الوصول للقاعدة (لا نص صريح في create)', async () => {
                // يحمي: الترتيب hash → create (لا يخزَّن نص صريح أبدًا)
                await callPost(INVITE);
                expect(mockHashPassword).toHaveBeenCalledWith('StrongPass123');
                expect(mockUserCreate.mock.calls[0][0].data.password).toBe('hashed:StrongPass123');
        });

        it('اسم المستخدم موجود مسبقًا → 409 عربي قبل أي إنشاء ولا تدقيق', async () => {
                // يحمي: لا دعوة مكررة باسم مشغول
                mockUserFindUnique.mockResolvedValue({ id: 5, username: 'helper99' });
                const res = await callPost(INVITE);
                expect(res.status).toBe(409);
                expect((await res.json()).error).toBe('اسم المستخدم موجود مسبقاً');
                expect(mockUserCreate).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('صف تدقيق لكل دعوة: action=create · targetType=User · permissions كما منحت', async () => {
                // يحمي: إسناد المسؤولية — من أنشأ هذا المشرف وبأي أذونات
                await callPost(INVITE);
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: AuditAction.create,
                                actorId: 2,
                                targetType: 'User',
                                targetId: 77,
                                metadata: { role: 'sub_admin', permissions: ['VIEW_ANALYTICS', 'APPROVE_ORDERS'] },
                        })
                );
        });

        it('جلسة بلا userId → actorId يصل undefined (فرع ?? في التدقيق)', async () => {
                // يحمي: غياب المعرف في الجلسة لا يفشل الدعوة ولا يخترع فاعلًا
                authHolder.value = persona({ userId: null, role: 'super_admin' });
                const res = await callPost(INVITE);
                expect(res.status).toBe(200);
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({ targetId: 77, actorId: undefined })
                );
        });

        it('غياب permissions → الافتراض [] (مشرف بلا أذونات — نفس دلالة [id])', async () => {
                // يحمي: عقد zod الافتراضي — دعوة بلا مصفوفة = بلا أذونات
                const res = await callPost({ username: 'helper99', password: 'StrongPass123', name: 'مساعد' });
                expect(res.status).toBe(200);
                expect(mockUserCreate.mock.calls[0][0].data.permissions).toEqual([]);
        });
});

// ── POST — فروع الرفض ───────────────────────────────────────────────────

describe('r93-W3 — POST /api/admin/admins: فروع الرفض', () => {
        it('صلاحية غير معرّفة (enum الحقيقي) → 422 بعربي + تفاصيل، لا إنشاء', async () => {
                // يحمي: لا نص حر يهبط في عمود الصلاحيات — enum Prisma هو المصدر
                const res = await callPost({ ...INVITE, permissions: ['BANANA'] });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('بيانات غير صالحة');
                expect(Array.isArray(json.details)).toBe(true);
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('كلمة مرور قصيرة (أقل من 8) → 422، لا تجزئة ولا إنشاء', async () => {
                // يحمي: حد الطول الأدنى لسياسة المنصة قبل أي عمل مكلف
                const res = await callPost({ ...INVITE, password: 'short' });
                expect(res.status).toBe(422);
                expect(mockHashPassword).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('جسم غير JSON → 400 مغلّف عربي (ليس 500)', async () => {
                // يحمي: قمامة الطلب ترفض نظيفًا قبل القاعدة
                const res = await callPost(undefined); // body: 'not-json'
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('بيانات غير صالحة — خطأ في صيغة JSON');
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('فشل قاعدة بيانات في الإنشاء → 500 عربي عام بلا تسريب داخلي', async () => {
                // يحمي: فشل الإنشاء لا يكشف تفاصيل القاعدة
                mockUserCreate.mockRejectedValue(new Error('prisma user table internals'));
                const res = await callPost(INVITE);
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('prisma');
        });
});

// ── GET — الفرع المتبقي ────────────────────────────────────────────────

describe('r93-W3 — GET /api/admin/admins: فشل القائمة', () => {
        it('فشل findMany → 500 عربي عام، لا شيء داخلي يسرب', async () => {
                // يحمي: آخر فرع غير مغطى — مسار الخطأ في قائمة المديرين
                authHolder.value = persona(SUPER_ADMIN);
                mockUserFindMany.mockRejectedValue(new Error('pg aggregate internals'));
                const res = await callGet();
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('internals');
        });
});
