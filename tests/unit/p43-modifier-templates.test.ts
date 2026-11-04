/**
 * P43 SM-1b — عقود /api/modifier-templates (قوالب الإضافات القابلة
 * لإعادة الاستخدام — لقطة snapshot لا مرجع).
 *
 * بلا شبكة وبلا قاعدة حقيقية — prisma مُنكَّر بالكامل، وmodifierGroupSchema
 * الحقيقي يعمل (لا يُنكَّر: سقوفه ≤6 مجموعات جزء من العقد).
 * الحالات:
 *   * POST: اللقطة تُخزَّن بلا معرفات عابرة (ids المجموعات/الخيارات تُسقط —
 *     الإدراج نسخة لا ربط) + AuditLog + سقف 6 مجموعات + ملكية المستأجر
 *   * GET: مقيد بمطعم المالك (403 لمطعم لا يملكه)
 *   * PUT/DELETE [id]: ملكية القالب عبر مطعمه + الحذف لا يمس الأصناف
 *     (لا روابط أصلًا — المجموعات المُدرجة نسخ)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockTplFindMany = vi.hoisted(() => vi.fn());
const mockTplCreate = vi.hoisted(() => vi.fn());
const mockTplFindUnique = vi.hoisted(() => vi.fn());
const mockTplUpdate = vi.hoisted(() => vi.fn());
const mockTplDelete = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockRequireAuth = vi.hoisted(() => vi.fn());
const mockRequirePermission = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        modifierTemplate: {
                findMany: mockTplFindMany,
                create: mockTplCreate,
                findUnique: mockTplFindUnique,
                update: mockTplUpdate,
                delete: mockTplDelete,
        },
        restaurant: { findUnique: mockRestaurantFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: mockRequireAuth,
        requirePermission: mockRequirePermission,
}));

const templatesRoute = await import('@/app/api/modifier-templates/route');
const templateIdRoute = await import('@/app/api/modifier-templates/[id]/route');

// ── أدوات مساعدة ───────────────────────────────────────────────────────

const VALID_GROUP = {
        nameAr: 'الحجم',
        name: 'Size',
        minSelect: 0,
        maxSelect: 1,
        required: false,
        sortOrder: 0,
        options: [
                { nameAr: 'صغير', name: 'S', priceDelta: 0, isAvailable: true, sortOrder: 0 },
                { nameAr: 'كبير', name: 'L', priceDelta: 2.5, isAvailable: true, sortOrder: 1 },
        ],
};

function makeRequest(url: string, method: string, body?: unknown): NextRequest {
        return new NextRequest(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body),
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true, remaining: 59, reset: 0 });
        mockRequireAuth.mockResolvedValue({ authorized: true, role: 'owner', userId: 1, restaurantId: 5, permissions: [] });
        mockUserRestaurantFindUnique.mockResolvedValue({ userId: 1, restaurantId: 5 });
        mockRestaurantFindUnique.mockResolvedValue({ id: 5, slug: 'al-waha' });
        mockTplCreate.mockResolvedValue({
                id: 7,
                nameAr: 'قالب الحجم',
                name: '',
                groupsJson: '[]',
                createdAt: new Date().toISOString(),
        });
});

describe('GET /api/modifier-templates — القراءة', () => {
        it('معرف مطعم غير صالح → 400', async () => {
                const res = await templatesRoute.GET(makeRequest('http://localhost/api/modifier-templates?restaurantId=abc', 'GET'));
                expect(res.status).toBe(400);
        });

        it('مطعم لا يملكه المالك → 403 (سلّم UserRestaurant)', async () => {
                mockUserRestaurantFindUnique.mockResolvedValue(null);
                const res = await templatesRoute.GET(
                        makeRequest('http://localhost/api/modifier-templates?restaurantId=9', 'GET')
                );
                expect(res.status).toBe(403);
                expect(mockTplFindMany).not.toHaveBeenCalled();
        });

        it('مطعم المالك الأساسي → القائمة مقيدة بمطعمه فقط', async () => {
                mockTplFindMany.mockResolvedValue([]);
                const res = await templatesRoute.GET(
                        makeRequest('http://localhost/api/modifier-templates?restaurantId=5', 'GET')
                );
                expect(res.status).toBe(200);
                expect(mockTplFindMany).toHaveBeenCalledWith({
                        where: { restaurantId: 5 },
                        orderBy: { createdAt: 'desc' },
                        select: { id: true, nameAr: true, name: true, groupsJson: true, createdAt: true },
                });
        });

        it('غير مصرح → 401', async () => {
                mockRequireAuth.mockResolvedValue({ authorized: false });
                const res = await templatesRoute.GET(
                        makeRequest('http://localhost/api/modifier-templates?restaurantId=5', 'GET')
                );
                expect(res.status).toBe(401);
        });
});

describe('POST /api/modifier-templates — حفظ القالب (لقطة)', () => {
        const body = (groups: unknown, nameAr = 'قالب الحجم') => ({
                restaurantId: 5,
                nameAr,
                groups,
        });

        it('اللقطة تُخزَّن مع المعرفات العابرة مسقوطة (الإدراج نسخة لا ربط)', async () => {
                const withStaleIds = [
                        {
                                ...VALID_GROUP,
                                id: 77, // معرف مجموعة من صنف آخر — يُسقط
                                options: VALID_GROUP.options.map((o, i) => ({ ...o, id: 500 + i })),
                        },
                ];
                const res = await templatesRoute.POST(makeRequest('http://localhost/api/modifier-templates', 'POST', body(withStaleIds)));
                expect(res.status).toBe(201);

                const createArg = mockTplCreate.mock.calls[0][0];
                const snapshot = JSON.parse(createArg.data.groupsJson);
                expect(snapshot).toHaveLength(1);
                expect(snapshot[0]).not.toHaveProperty('id');
                expect(snapshot[0].options[0]).not.toHaveProperty('id');
                expect(snapshot[0].options[0]).toMatchObject({ nameAr: 'صغير', priceDelta: 0 });
                // بلا روابط حية — groupsJson هو الوحيد المخزَّن
                expect(createArg.data.restaurantId).toBe(5);
                expect(mockLogAudit).toHaveBeenCalledTimes(1);
        });

        it('أكثر من 6 مجموعات → 422 (سقف modifierGroupSchema نفسه)', async () => {
                const seven = Array.from({ length: 7 }, () => ({ ...VALID_GROUP }));
                const res = await templatesRoute.POST(makeRequest('http://localhost/api/modifier-templates', 'POST', body(seven)));
                expect(res.status).toBe(422);
                expect(mockTplCreate).not.toHaveBeenCalled();
        });

        it('بلا مجموعات → 422 (القالب يحتاج مجموعة واحدة على الأقل)', async () => {
                const res = await templatesRoute.POST(makeRequest('http://localhost/api/modifier-templates', 'POST', body([])));
                expect(res.status).toBe(422);
        });

        it('اسم فارغ أو أطول من 60 → 422', async () => {
                const res1 = await templatesRoute.POST(
                        makeRequest('http://localhost/api/modifier-templates', 'POST', body([VALID_GROUP], '  '))
                );
                expect(res1.status).toBe(422);
                const res2 = await templatesRoute.POST(
                        makeRequest('http://localhost/api/modifier-templates', 'POST', body([VALID_GROUP], 'x'.repeat(61)))
                );
                expect(res2.status).toBe(422);
        });

        it('مجموعة تالف البنية (maxSelect سالب) → 422 بمخطط المعدِّلات الحقيقي', async () => {
                const bad = [{ ...VALID_GROUP, maxSelect: -1 }];
                const res = await templatesRoute.POST(makeRequest('http://localhost/api/modifier-templates', 'POST', body(bad)));
                expect(res.status).toBe(422);
        });

        it('مطعم لا يملكه المالك → 403 وصفر كتابات', async () => {
                mockUserRestaurantFindUnique.mockResolvedValue(null);
                const res = await templatesRoute.POST(
                        makeRequest('http://localhost/api/modifier-templates', 'POST', { ...body([VALID_GROUP]), restaurantId: 9 })
                );
                expect(res.status).toBe(403);
                expect(mockTplCreate).not.toHaveBeenCalled();
        });
});

describe('PUT/DELETE /api/modifier-templates/[id] — إدارة قالب واحد', () => {
        it('PUT: إعادة تسمية قالب مملوك + AuditLog', async () => {
                mockTplFindUnique.mockResolvedValue({ id: 7, nameAr: 'قديم', restaurantId: 5 });
                mockTplUpdate.mockResolvedValue({ id: 7, nameAr: 'جديد', name: '', groupsJson: '[]', createdAt: '2026-01-01' });
                const res = await templateIdRoute.PUT(
                        makeRequest('http://localhost/api/modifier-templates/7', 'PUT', { nameAr: 'جديد' }),
                        { params: Promise.resolve({ id: '7' }) },
                );
                expect(res.status).toBe(200);
                expect(mockTplUpdate).toHaveBeenCalledWith({
                        where: { id: 7 },
                        data: { nameAr: 'جديد' },
                        select: { id: true, nameAr: true, name: true, groupsJson: true, createdAt: true },
                });
                expect(mockLogAudit).toHaveBeenCalledTimes(1);
        });

        it('PUT: قالب لمطعم لا يملكه المالك → 403', async () => {
                mockTplFindUnique.mockResolvedValue({ id: 7, nameAr: 'قديم', restaurantId: 9 });
                mockUserRestaurantFindUnique.mockResolvedValue(null);
                const res = await templateIdRoute.PUT(
                        makeRequest('http://localhost/api/modifier-templates/7', 'PUT', { nameAr: 'جديد' }),
                        { params: Promise.resolve({ id: '7' }) },
                );
                expect(res.status).toBe(403);
                expect(mockTplUpdate).not.toHaveBeenCalled();
        });

        it('DELETE: الحذف لا يمس أي صنف (لا روابط) + AuditLog', async () => {
                mockTplFindUnique.mockResolvedValue({ id: 7, nameAr: 'قالب', restaurantId: 5 });
                const res = await templateIdRoute.DELETE(
                    makeRequest('http://localhost/api/modifier-templates/7', 'DELETE'),
                    { params: Promise.resolve({ id: '7' }) },
                );
                expect(res.status).toBe(200);
                expect(mockTplDelete).toHaveBeenCalledWith({ where: { id: 7 } });
                // الحذف النظيف: لا كتابة على أي menuItem إطلاقًا (الإدراج كان نسخة)
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({ action: 'delete', targetType: 'modifierTemplate', targetId: 7 }),
                );
        });

        it('معرف غير رقمي → 400', async () => {
                const res = await templateIdRoute.DELETE(
                    makeRequest('http://localhost/api/modifier-templates/abc', 'DELETE'),
                    { params: Promise.resolve({ id: 'abc' }) },
                );
                expect(res.status).toBe(400);
        });

        it('قالب غير موجود → 404', async () => {
                mockTplFindUnique.mockResolvedValue(null);
                const res = await templateIdRoute.DELETE(
                    makeRequest('http://localhost/api/modifier-templates/999', 'DELETE'),
                    { params: Promise.resolve({ id: '999' }) },
                );
                expect(res.status).toBe(404);
        });
});
