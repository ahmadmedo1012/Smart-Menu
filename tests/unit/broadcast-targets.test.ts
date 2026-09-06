/**
 * g90-F5b (T4) — تغطية وحدة لأهداف البثّ التيليجرامي:
 *   - src/app/api/telegram/broadcast-targets/route.ts (GET/POST — كانت 0% lcov)
 *   - src/app/api/telegram/broadcast-targets/[id]/route.ts (PATCH/DELETE)
 *   - السلوك الحاسم في src/lib/telegram-broadcast.ts:41: هدف isActive:false
 *     لا يدخل قائمة مستلمي fanout — الفلترة تتم في استعلام prisma
 *     (where: { isActive: true }) والطبقة البرمجية تثق بها.
 *
 * النمط القياسي (admin-routes.test.ts): vi.hoisted + vi.mock للـprisma و
 * @/lib/session فيعمل سلّم المصادقة الحقيقي requirePermission('EDIT_SETTINGS')
 * — خلايا RBAC هي موضوع الاختبار لا غلافًا مزيّفًا. الشبكة (fetch) مُنكّرة.
 *
 * فوارق موثّقة عن توقعات التكليف (السلوك الفعلي هو المرجع):
 *   1) لا يوجد PUT على الإطلاق — التحديث عبر PATCH في [id]/route.ts
 *      (نمط تحديث جزئي بحقول zod اختيارية).
 *   2) POST الناجح يرجع 200 لا 201 — success() الافتراضي 200 (المسار
 *      لا يمرر حالة 201 كـcreate-owner).
 *   3) «body غائب/فاسد» → 400 «خطأ في صيغة JSON» لا 422: request.json()
 *      يرمي قبل zod (نفس الفارق الموثّق في system-events-writes.test.ts)؛
 *      الـ422 المغلّف يظهر عند JSON صالح يخالف المخطط (chatId غائب...).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockTargetsFindMany = vi.hoisted(() => vi.fn());
const mockTargetsCreate = vi.hoisted(() => vi.fn());
const mockTargetsUpdate = vi.hoisted(() => vi.fn());
const mockTargetsDelete = vi.hoisted(() => vi.fn());
const mockConfigFindFirst = vi.hoisted(() => vi.fn());
const mockUsersFindMany = vi.hoisted(() => vi.fn());
const mockBotToken = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());
const mockLogWarn = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        telegramBroadcastTarget: {
                findMany: mockTargetsFindMany,
                create: mockTargetsCreate,
                update: mockTargetsUpdate,
                delete: mockTargetsDelete,
        },
        telegramConfig: { findFirst: mockConfigFindFirst },
        user: { findMany: mockUsersFindMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

vi.mock('@/lib/config', () => ({ getDecryptedBotToken: mockBotToken }));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: mockLogWarn,
        info: vi.fn(),
        debug: vi.fn(),
}));

const targetsRoute = await import('@/app/api/telegram/broadcast-targets/route');
const targetIdRoute = await import('@/app/api/telegram/broadcast-targets/[id]/route');
const { broadcastToAll } = await import('@/lib/telegram-broadcast');

// ── Personas (تُمرَّر لسلّم requirePermission الحقيقي) ──────────────────

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
const SUPER_ADMIN = persona({ id: 1, role: 'super_admin' });
const ADMIN_LEGACY = persona({ id: 2, role: 'admin' });
const SUB_ADMIN_ES = persona({ id: 4, role: 'sub_admin', permissions: ['EDIT_SETTINGS'] });
const SUB_ADMIN_OTHER = persona({ id: 5, role: 'sub_admin', permissions: ['VIEW_ANALYTICS'] });
const USER_PLAIN = persona({ id: 55, role: 'USER' });

const setSession = (user: Persona | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST,
        );
};

// ── أدوات مساعدة ───────────────────────────────────────────────────────

function jsonRequest(method: string, body?: unknown): NextRequest {
        return new NextRequest('http://localhost/api/telegram/broadcast-targets', {
                method,
                headers: { 'Content-Type': 'application/json' },
                ...(body === undefined
                        ? {}
                        : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
        });
}

const idRequest = (method: string, id: string, body?: unknown) =>
        new NextRequest(`http://localhost/api/telegram/broadcast-targets/${id}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                ...(body === undefined
                        ? {}
                        : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
        });

const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

const okResponse = () => ({ ok: true, json: async () => ({}), text: async () => '' });

function sentBodies(): Record<string, unknown>[] {
        return (fetchMock.mock.calls as unknown as [string, RequestInit][]).map(([, init]) =>
                JSON.parse(String(init.body)),
        );
}

const TARGET = { id: 7, label: 'قناة العمليات', chatId: '-100123', isActive: true };

beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockResolvedValue(okResponse());
        mockConfigFindFirst.mockResolvedValue({ id: 1, isActive: true });
        mockBotToken.mockResolvedValue('111:ABC');
        mockUsersFindMany.mockResolvedValue([]);
        mockTargetsFindMany.mockResolvedValue([]);
        mockTargetsCreate.mockResolvedValue(TARGET);
        mockTargetsUpdate.mockResolvedValue(TARGET);
        mockTargetsDelete.mockResolvedValue(TARGET);
        setSession(SUPER_ADMIN);
});

afterEach(() => {
        vi.unstubAllGlobals();
});

// ── البوابة: 401 / 403 ─────────────────────────────────────────────────

describe('بوابة EDIT_SETTINGS — الضيف والأدوار بلا صلاحية', () => {
        it('الضيف → 401 «غير مصرح» قبل أي استعلام prisma (GET وPOST وPATCH وDELETE)', async () => {
                setSession(null);
                expect((await targetsRoute.GET()).status).toBe(401);
                expect((await targetsRoute.POST(jsonRequest('POST', { chatId: 'x' }))).status).toBe(401);
                expect(
                        (await targetIdRoute.PATCH(idRequest('PATCH', '7', { label: 'x' }), idParams('7'))).status,
                ).toBe(401);
                expect((await targetIdRoute.DELETE(idRequest('DELETE', '7'), idParams('7'))).status).toBe(401);
                expect(mockTargetsFindMany).not.toHaveBeenCalled();
                expect(mockTargetsCreate).not.toHaveBeenCalled();
                expect(mockTargetsUpdate).not.toHaveBeenCalled();
                expect(mockTargetsDelete).not.toHaveBeenCalled();
        });

        it.each([
                ['USER عادي', USER_PLAIN],
                ['sub_admin بصلاحية أخرى', SUB_ADMIN_OTHER],
        ])('%s → 403 «لا تملك الصلاحية» بلا أي كتابة', async (_label, user: Persona) => {
                setSession(user);
                const res = await targetsRoute.POST(jsonRequest('POST', { chatId: 'x' }));
                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockTargetsCreate).not.toHaveBeenCalled();
                expect(mockTargetsDelete).not.toHaveBeenCalled();
        });

        it.each([
                ['sub_admin يحمل EDIT_SETTINGS', SUB_ADMIN_ES],
                ['admin (legacy) — يمر بكل صلاحية عدا MANAGE_USERS', ADMIN_LEGACY],
        ])('%s → يعبر البوابة (لا 401/403) على GET', async (_label, user: Persona) => {
                setSession(user);
                const res = await targetsRoute.GET();
                expect(res.status).toBe(200);
                expect(mockTargetsFindMany).toHaveBeenCalled();
        });
});

// ── GET ─────────────────────────────────────────────────────────────────

describe('GET /api/telegram/broadcast-targets', () => {
        it('قائمة محدودة (take: 500) بترتيب الأحدث أولًا وتُعاد كما هي', async () => {
                const rows = [TARGET, { id: 8, label: 'ب', chatId: '9', isActive: true }];
                mockTargetsFindMany.mockResolvedValue(rows);
                const res = await targetsRoute.GET();
                expect(res.status).toBe(200);
                expect(mockTargetsFindMany).toHaveBeenCalledWith({
                        orderBy: { createdAt: 'desc' },
                        take: 500,
                });
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual(rows);
        });
});

// ── POST ────────────────────────────────────────────────────────────────

describe('POST /api/telegram/broadcast-targets', () => {
        it('جسم صالح → 200 (موثّق: لا 201) وcreate بـ{label, chatId} كما حُلّلا', async () => {
                const res = await targetsRoute.POST(
                        jsonRequest('POST', { label: 'قناة العمليات', chatId: '-100123' }),
                );
                expect(res.status).toBe(200);
                expect(mockTargetsCreate).toHaveBeenCalledWith({
                        data: { label: 'قناة العمليات', chatId: '-100123' },
                });
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual(TARGET);
        });

        it('label اختياري بdefault نصي فارغ — chatId وحده يكفي', async () => {
                const res = await targetsRoute.POST(jsonRequest('POST', { chatId: '-100999' }));
                expect(res.status).toBe(200);
                expect(mockTargetsCreate).toHaveBeenCalledWith({
                        data: { label: '', chatId: '-100999' },
                });
        });

        it('chatId غائب أو نص فارغ → 422 مغلّف بتفاصيل zod ولا create', async () => {
                const res = await targetsRoute.POST(jsonRequest('POST', { label: 'x' }));
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details[0]).toContain('chatId');
                expect(mockTargetsCreate).not.toHaveBeenCalled();
        });

        it('فارق موثّق: الجسم الغائب كليًا → 400 «خطأ في صيغة JSON» (يرمي قبل zod)', async () => {
                const res = await targetsRoute.POST(jsonRequest('POST'));
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('JSON');
                expect(mockTargetsCreate).not.toHaveBeenCalled();
        });

        it('JSON فاسد («ليس json») → 400 بنفس المسار', async () => {
                const res = await targetsRoute.POST(jsonRequest('POST', 'ليس json'));
                expect(res.status).toBe(400);
                expect(mockTargetsCreate).not.toHaveBeenCalled();
        });
});

// ── PATCH/DELETE [id] ───────────────────────────────────────────────────

describe('PATCH /api/telegram/broadcast-targets/[id]', () => {
        it('تحديث جزئي (label وحده) → 200 وupdate يكتب ما أُرسل فقط', async () => {
                const res = await targetIdRoute.PATCH(
                        idRequest('PATCH', '7', { label: 'اسم جديد' }),
                        idParams('7'),
                );
                expect(res.status).toBe(200);
                expect(mockTargetsUpdate).toHaveBeenCalledWith({
                        where: { id: 7 },
                        data: { label: 'اسم جديد' },
                });
        });

        it('تعطيل الهدف isActive:false → يُكتب كما هو (مدخل اختبار الفلترة أدناه)', async () => {
                mockTargetsUpdate.mockResolvedValue({ ...TARGET, isActive: false });
                const res = await targetIdRoute.PATCH(
                        idRequest('PATCH', '7', { isActive: false }),
                        idParams('7'),
                );
                expect(res.status).toBe(200);
                expect(mockTargetsUpdate).toHaveBeenCalledWith({
                        where: { id: 7 },
                        data: { isActive: false },
                });
        });

        it('معرف غير رقمي → 400 «معرف غير صالح» قبل أي update', async () => {
                const res = await targetIdRoute.PATCH(
                        idRequest('PATCH', 'abc', { label: 'x' }),
                        idParams('abc'),
                );
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('معرف غير صالح');
                expect(mockTargetsUpdate).not.toHaveBeenCalled();
        });

        it('chatId نص فارغ → 422 مغلّف (min(1) داخل المخطط)', async () => {
                const res = await targetIdRoute.PATCH(
                        idRequest('PATCH', '7', { chatId: '' }),
                        idParams('7'),
                );
                expect(res.status).toBe(422);
                expect(mockTargetsUpdate).not.toHaveBeenCalled();
        });

        it('جسم غائب → 400 «خطأ في صيغة JSON» (فارق موثّق عن 422)', async () => {
                const res = await targetIdRoute.PATCH(idRequest('PATCH', '7'), idParams('7'));
                expect(res.status).toBe(400);
                expect(mockTargetsUpdate).not.toHaveBeenCalled();
        });
});

describe('DELETE /api/telegram/broadcast-targets/[id]', () => {
        it('حذف ناجح → 200 {deleted:true} وdelete بالمعرف الرقمي', async () => {
                const res = await targetIdRoute.DELETE(idRequest('DELETE', '7'), idParams('7'));
                expect(res.status).toBe(200);
                expect(mockTargetsDelete).toHaveBeenCalledWith({ where: { id: 7 } });
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ deleted: true });
        });

        it('معرف غير رقمي → 400 «معرف غير صالح» بلا delete', async () => {
                const res = await targetIdRoute.DELETE(idRequest('DELETE', 'abc'), idParams('abc'));
                expect(res.status).toBe(400);
                expect(mockTargetsDelete).not.toHaveBeenCalled();
        });

        it('sub_admin بلا EDIT_SETTINGS → 403 بلا delete', async () => {
                setSession(SUB_ADMIN_OTHER);
                const res = await targetIdRoute.DELETE(idRequest('DELETE', '7'), idParams('7'));
                expect(res.status).toBe(403);
                expect(mockTargetsDelete).not.toHaveBeenCalled();
        });
});

// ── السلوك الحاسم: فلترة isActive في fanout ────────────────────────────

describe('gatherTargets (عبر broadcastToAll) — الهدف غير النشط خارج المستلمين', () => {
        // محاكاة صادقة للجدول: mock يطبّق شرط where كما يفعل PostgreSQL —
        // الفلترة الحقيقية في الكود تتم داخل الاستعلام (telegram-broadcast.ts:41)،
        // فنُثبت شرط الاستعلام ثم أن ما يعيده هو بالضبط مجموعة المستلمين.
        const rows = [
                { chatId: '100', isActive: true },
                { chatId: '200', isActive: false },
        ];
        const whereAware = (arg: { where?: { isActive?: boolean } }) =>
                rows.filter((r) => (arg?.where?.isActive === undefined ? true : r.isActive));

        it('الاستعلام يفرض where isActive:true وselect chatId فقط', async () => {
                mockTargetsFindMany.mockImplementation(whereAware);
                const result = await broadcastToAll('تنبيه', { adminOnly: true });
                expect(mockTargetsFindMany).toHaveBeenCalledWith({
                        where: { isActive: true },
                        select: { chatId: true },
                });
                expect(result.sent).toBe(1);
        });

        it('هدف isActive:false لا يُرسل إليه — المستلمون = ما يعيده الاستعلام المفلتر', async () => {
                mockTargetsFindMany.mockImplementation(whereAware);
                const result = await broadcastToAll('تنبيه', { adminOnly: true });
                expect(result).toEqual({ sent: 1, failed: [] });
                const chatIds = sentBodies().map((b) => b.chat_id);
                expect(chatIds).toEqual([100]);
                expect(chatIds).not.toContain(200);
        });

        it('بعد تعطيل الهدف عبر PATCH (id:7 → isActive:false) لم يعد يستقبل البث', async () => {
                // الجولة الكاملة على مستوى الوحدة: (1) التعطيل عبر المسار ثم
                // (2) البث — والجدول المحاكى يحترم where فيستبعد الهدف المعطّل.
                const state = new Map<number, { chatId: string; isActive: boolean }>([
                        [7, { chatId: '100', isActive: true }],
                ]);
                mockTargetsUpdate.mockImplementation(async ({ data }: { data: { isActive?: boolean } }) => {
                        if (data.isActive === false) state.set(7, { chatId: '100', isActive: false });
                        return { id: 7, ...state.get(7)! };
                });
                mockTargetsFindMany.mockImplementation(
                        (arg: { where?: { isActive?: boolean } }) =>
                                arg?.where?.isActive === true
                                        ? Array.from(state.values()).filter((r) => r.isActive)
                                        : Array.from(state.values()),
                );

                const patch = await targetIdRoute.PATCH(
                        idRequest('PATCH', '7', { isActive: false }),
                        idParams('7'),
                );
                expect(patch.status).toBe(200);

                const result = await broadcastToAll('تنبيه بعد التعطيل', { adminOnly: true });
                expect(result.sent).toBe(0);
                expect(fetchMock).not.toHaveBeenCalled();
        });

        it('المستخدمون المرتبطون يدخلون فقط في البث غير الإداري (adminOnly يستعلم الأهداف وحدها)', async () => {
                mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }]);
                mockUsersFindMany.mockResolvedValue([{ telegramChatId: '300' }]);

                const admin = await broadcastToAll('إداري', { adminOnly: true });
                expect(mockUsersFindMany).not.toHaveBeenCalled();
                expect(admin.sent).toBe(1);

                mockUsersFindMany.mockClear();
                const general = await broadcastToAll('عام');
                expect(mockUsersFindMany).toHaveBeenCalled();
                expect(general.sent).toBe(2);
        });
});
