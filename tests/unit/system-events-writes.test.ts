/**
 * g90-F5 (T3) — تغطية وحدة لكتابات src/app/api/admin/system-events/route.ts
 * (كانت 29.5% أسطر — POST/PUT/DELETE ببوابة VIEW_ANALYTICS من r86-A8).
 *
 * النمط القياسي (admin-routes.test.ts): vi.hoisted + vi.mock للـprisma و
 * @/lib/session فيعمل سلّم requirePermission الحقيقي.
 *
 * ملاحظات سلوك مقروءة من المصدر:
 *   - POST بغلاف zod: كل الحقول اختيارية بdefaults (info//{}) — الجسم
 *     الفارغ {} صالح ويُنشئ حدثًا افتراضيًا؛ الـ422 المغلّف يظهر عند قيم
 *     enum خاطئة أو نصوص فوق السقوف.
 *   - الجسم الغائب كليًا لا يصل إلى zod أصلًا: request.json() يرمي
 *     SyntaxError → handleError → 400 «خطأ في صيغة JSON» (موثق كفارق
 *     عن توقع «422 للجسم الغائب»).
 *   - PUT يبني data بالإضافة الشرطية «"field" in data» — نثبت أن الحقول
 *     غير المرسلة لا تُكتب.
 *   - DELETE يقرأ id من query لا من الجسم، ومعرف غير رقمي → 400.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockCount = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        systemEvent: {
                findUnique: mockFindUnique,
                findMany: mockFindMany,
                create: mockCreate,
                update: mockUpdate,
                delete: mockDelete,
                count: mockCount,
        },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

const eventsRoute = await import('@/app/api/admin/system-events/route');

// ── Personas ────────────────────────────────────────────────────────────

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
const SUB_ADMIN_VA = persona({ id: 4, role: 'sub_admin', permissions: ['VIEW_ANALYTICS'] });
const SUB_ADMIN_ES = persona({ id: 5, role: 'sub_admin', permissions: ['EDIT_SETTINGS'] });
const SUPER_ADMIN = persona({ id: 1, role: 'super_admin' });
const ADMIN = persona({ id: 2, role: 'admin' });

const setSession = (user: Persona | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST,
        );
};

function jsonRequest(method: string, body?: unknown): NextRequest {
        return new NextRequest('http://localhost/api/admin/system-events', {
                method,
                headers: { 'Content-Type': 'application/json' },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
}

const EVENT_ROW = {
        id: 11,
        eventType: 'info',
        title: 'عنوان',
        message: 'نص',
        severity: 'info',
        metadata: {},
        read: false,
        createdAt: new Date('2026-09-01T10:00:00Z'),
};

beforeEach(() => {
        vi.clearAllMocks();
        setSession(SUPER_ADMIN);
        mockCreate.mockResolvedValue(EVENT_ROW);
        mockUpdate.mockResolvedValue(EVENT_ROW);
        mockFindUnique.mockResolvedValue(EVENT_ROW);
        mockDelete.mockResolvedValue(EVENT_ROW);
});

// ── POST ────────────────────────────────────────────────────────────────

describe('POST /api/admin/system-events', () => {
        it('sub_admin بلا VIEW_ANALYTICS → 403 قبل أي create (بوابة r86-A8)', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await eventsRoute.POST(jsonRequest('POST', { title: 'x' }));
                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockCreate).not.toHaveBeenCalled();
        });

        it('الضيف → 401، والمستخدم العادي → 403', async () => {
                setSession(null);
                expect((await eventsRoute.POST(jsonRequest('POST', {}))).status).toBe(401);
                setSession(persona({ id: 55, role: 'USER' }));
                expect((await eventsRoute.POST(jsonRequest('POST', {}))).status).toBe(403);
                expect(mockCreate).not.toHaveBeenCalled();
        });

        it('جسم غير صالح (severity خارج enum) → 422 مغلّف بتفاصيل zod', async () => {
                setSession(SUB_ADMIN_VA);
                const res = await eventsRoute.POST(jsonRequest('POST', { severity: 'bogus' }));
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details).toHaveLength(1);
                expect(json.details[0]).toContain('severity');
                expect(mockCreate).not.toHaveBeenCalled();
        });

        it('فارق موثق: الجسم الغائب كليًا → 400 «خطأ في صيغة JSON» (يرمي قبل zod)', async () => {
                setSession(SUB_ADMIN_VA);
                const res = await eventsRoute.POST(jsonRequest('POST'));
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('JSON');
                expect(mockCreate).not.toHaveBeenCalled();
        });

        it('جسم فارغ {} صالح — defaults تنشئ حدث info فارغًا → 201', async () => {
                setSession(SUB_ADMIN_VA);
                const res = await eventsRoute.POST(jsonRequest('POST', {}));
                expect(res.status).toBe(201);
                expect(mockCreate).toHaveBeenCalledWith({
                        data: {
                                eventType: 'info',
                                title: '',
                                message: '',
                                severity: 'info',
                                metadata: {},
                                read: false,
                        },
                });
        });

        it('جسم كامل → 201 بإنشاء ممرر كما هو مع read:false قسرًا', async () => {
                setSession(SUB_ADMIN_VA);
                const res = await eventsRoute.POST(
                        jsonRequest('POST', {
                                eventType: 'order',
                                title: 'عنوان',
                                message: 'رسالة',
                                severity: 'warning',
                                metadata: { userId: 7 },
                        }),
                );
                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(mockCreate).toHaveBeenCalledWith({
                        data: {
                                eventType: 'order',
                                title: 'عنوان',
                                message: 'رسالة',
                                severity: 'warning',
                                metadata: { userId: 7 },
                                read: false,
                        },
                });
        });
});

// ── PUT ─────────────────────────────────────────────────────────────────

describe('PUT /api/admin/system-events', () => {
        it('sub_admin بلا صلاحية → 403 (البوابة نفسها على الكتابات)', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await eventsRoute.PUT(jsonRequest('PUT', { id: 11, read: true }));
                expect(res.status).toBe(403);
                expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('معرف غير موجود → 404 «SystemEvent غير موجود» بلا update', async () => {
                mockFindUnique.mockResolvedValue(null);
                const res = await eventsRoute.PUT(jsonRequest('PUT', { id: 999, read: true }));
                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('SystemEvent غير موجود');
                expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('id غير صالح في الجسم → 422 مغلّف', async () => {
                const res = await eventsRoute.PUT(jsonRequest('PUT', { id: 0 }));
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.details[0]).toContain('id');
        });

        it('تحديث جزئي → يُكتب ما أُرسل فقط (الإضافة الشرطية «"field" in data»)', async () => {
                setSession(ADMIN);
                const res = await eventsRoute.PUT(jsonRequest('PUT', { id: 11, read: true }));
                expect(res.status).toBe(200);
                expect(mockUpdate).toHaveBeenCalledWith({
                        where: { id: 11 },
                        data: { read: true },
                });
        });

        it('تحديث كامل → كل الحقول المرسلة تُكتب كما هي', async () => {
                const res = await eventsRoute.PUT(
                        jsonRequest('PUT', { id: 11, title: 'جديد', severity: 'critical', message: 'م' }),
                );
                expect(res.status).toBe(200);
                expect(mockUpdate).toHaveBeenCalledWith({
                        where: { id: 11 },
                        data: { title: 'جديد', severity: 'critical', message: 'م' },
                });
        });
});

// ── DELETE ──────────────────────────────────────────────────────────────

describe('DELETE /api/admin/system-events', () => {
        const deleteRequest = (query = '') =>
                new NextRequest(`http://localhost/api/admin/system-events${query}`, { method: 'DELETE' });

        it('sub_admin بلا صلاحية → 403', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await eventsRoute.DELETE(deleteRequest('?id=11'));
                expect(res.status).toBe(403);
                expect(mockDelete).not.toHaveBeenCalled();
        });

        it('بلا معامل id → 400 بلا أي استعلام', async () => {
                const res = await eventsRoute.DELETE(deleteRequest());
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('id query param is required');
                expect(mockFindUnique).not.toHaveBeenCalled();
        });

        it('معرف غير موجود → 404 بلا delete', async () => {
                mockFindUnique.mockResolvedValue(null);
                const res = await eventsRoute.DELETE(deleteRequest('?id=999'));
                expect(res.status).toBe(404);
                expect(mockDelete).not.toHaveBeenCalled();
        });

        it('حذف ناجح → {deleted:true} بعد تحقق الوجود', async () => {
                setSession(SUB_ADMIN_VA);
                const res = await eventsRoute.DELETE(deleteRequest('?id=11'));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toEqual({ deleted: true });
                expect(mockDelete).toHaveBeenCalledWith({ where: { id: 11 } });
        });

        it('معرف غير رقمي (NaN) → 400 (المسار يرفضه صراحةً لا يتجاهله)', async () => {
                const res = await eventsRoute.DELETE(deleteRequest('?id=abc'));
                expect(res.status).toBe(400);
                expect(mockDelete).not.toHaveBeenCalled();
        });
});
