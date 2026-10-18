/**
 * round90-F3 — items API contract fixes (mirror of the round90 diagnosis):
 *
 *   1. PUT image cap unified with POST: 200k chars, identical Arabic message
 *      (items/[id]/route.ts used to allow 7,000,000 — re-opening the dx-2 #9
 *      DB bloat on the most-used edit path; POST was capped in round89-E4).
 *   2. status is enum-backed (z.enum from Prisma ItemStatus) in POST and PUT —
 *      an invalid value gets the clean 422 validationError envelope instead of
 *      Prisma validation noise degraded to a generic 400 by handleError.
 *   3. maxItems cap is serialized: a FOR UPDATE row lock on the SAME
 *      Restaurant row that owns maxItems is taken INSIDE the transaction
 *      BEFORE the count — count-then-create alone does not serialize under
 *      READ COMMITTED (TOCTOU T-family, docs/round90/diagnosis/investigation.md).
 *
 * Mock pattern: tx-mock prisma, same as plan-limit.test.ts / blob-ordering.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemUpdate = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockMenuItemCreate = vi.hoisted(() => vi.fn());
const mockMenuItemAggregate = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRevalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockMediaUrlError = vi.hoisted(() => vi.fn(() => null));
const mockDeleteBlob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const txMock = vi.hoisted(() => ({
        $queryRaw: mockQueryRaw,
        menuItem: { count: mockMenuItemCount, create: mockMenuItemCreate, aggregate: mockMenuItemAggregate },
        // round91-F-B (D2-#4): maxItems is re-read under the FOR UPDATE lock —
        // resolving nothing keeps the pre-tx values as the fallback.
        restaurant: { findUnique: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
        menuCategory: { findUnique: mockCategoryFindUnique },
        menuItem: { findUnique: mockMenuItemFindUnique, update: mockMenuItemUpdate },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidate }));
vi.mock('@/lib/blob', () => ({ mediaUrlError: mockMediaUrlError, deleteBlob: mockDeleteBlob }));
// r138 (W5-C3): items POST/PUT now carry the owner subscription-expiry guard
// (عائلة /api/owner/* c661e707) — stubbed like the rest of the family's tests
// (نمط r118-B2/plan-limit.test.ts)، مع مُمسِك قابل للتغيير لخلايا المنتهي.
const subGuardHolder = vi.hoisted(() => ({ active: true }));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => subGuardHolder.active),
}));
// round91-F-B (F9): items/[id] PUT now carries a 20/min session-scoped
// limiter (module scope) — stubbed like every other limited route.
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 19, reset: 0 })),
                destroy: () => {},
        }),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => ({
                authorized: true,
                role: 'owner',
                restaurantId: 7,
                userId: 1,
                permissions: [],
        })),
        requirePermission: vi.fn(async () => ({ authorized: true, role: 'owner', userId: 1 })),
}));

// ── Fixtures / helpers ──────────────────────────────────────────────────

const CATEGORY = {
        restaurant: { id: 7, name: 'al-waha', maxItems: 10, plan: { nameAr: 'أساسية' } },
};

const EXISTING_ITEM = {
        id: 901,
        name: 'كابتشينو',
        price: 8,
        discountedPrice: null,
        image: '',
        isFeatured: false,
        category: { restaurantId: 7 },
};

beforeEach(() => {
        vi.clearAllMocks();
        subGuardHolder.active = true;
        // round91-F-B: reset the in-tx re-read mock's persistent implementation
        // (clearAllMocks keeps implementations — a test that pins an
        // authoritative maxItems must not leak it into the next test).
        (txMock.restaurant.findUnique as ReturnType<typeof vi.fn>).mockReset();
        mockTransaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
        );
        mockCategoryFindUnique.mockResolvedValue({ ...CATEGORY });
        mockMenuItemFindUnique.mockResolvedValue({ ...EXISTING_ITEM });
        mockMenuItemUpdate.mockResolvedValue({ ...EXISTING_ITEM, status: 'unavailable' });
        mockMenuItemCount.mockResolvedValue(0);
        mockMenuItemCreate.mockResolvedValue({ id: 901 });
        // W6-B6 (G-2): aggregate max re-read default — no max → append at 0
        mockMenuItemAggregate.mockResolvedValue({ _max: { sortOrder: null } });
        mockQueryRaw.mockResolvedValue([]);
});

async function putItem(id: number, body: unknown) {
        const { PUT } = await import('@/app/api/items/[id]/route');
        return PUT(
                new NextRequest(`http://localhost/api/items/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                }),
                { params: Promise.resolve({ id: String(id) }) }
        );
}

async function postItem(body: unknown) {
        const { POST } = await import('@/app/api/items/route');
        return POST(
                new NextRequest('http://localhost/api/items', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                })
        );
}

// ── 1. PUT image cap — mirror of the round89-E4 POST cap ────────────────

describe('PUT /api/items/[id] — image cap unified with POST (round90-F3)', () => {
        it('250k-char image → 422 at the schema gate, zero DB work', async () => {
                const res = await putItem(901, { image: 'a'.repeat(250_000) });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details[0]).toContain('الصورة كبيرة جداً');
                // rejected by zod before any query/transaction
                expect(mockMenuItemFindUnique).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('~20k-char image (an honest compressed payload) → accepted, stored verbatim', async () => {
                const res = await putItem(901, { image: 'a'.repeat(20_000) });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate).toHaveBeenCalledTimes(1);
                expect(mockMenuItemUpdate.mock.calls[0][0].data.image).toHaveLength(20_000);
        });

        it('image at exactly 200k chars stays at the boundary (accepted)', async () => {
                const res = await putItem(901, { image: 'a'.repeat(200_000) });

                expect(res.status).toBe(200);
        });
});

// ── 2. status enum — 422 validationError envelope, both verbs ───────────

describe('status enum (round90-F3)', () => {
        it('PUT status=garbage → 422 envelope, no DB write', async () => {
                const res = await putItem(901, { status: 'garbage' });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details[0]).toContain('حالة الصنف غير صالحة');
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('PUT status=unavailable (a real ItemStatus) → 200, persisted', async () => {
                const res = await putItem(901, { status: 'unavailable' });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate.mock.calls[0][0].data.status).toBe('unavailable');
        });

        it('POST status=garbage → 422 envelope before any category/DB read', async () => {
                const res = await postItem({ name: 'شاي', price: 3, categoryId: 3, status: 'garbage' });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details[0]).toContain('حالة الصنف غير صالحة');
                expect(mockCategoryFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('POST status=unavailable → passes the enum gate and reaches create', async () => {
                const res = await postItem({ name: 'شاي', price: 3, categoryId: 3, status: 'unavailable' });

                expect(res.status).toBe(201);
                expect(mockMenuItemCreate.mock.calls[0][0].data.status).toBe('unavailable');
        });
});

// ── 3. maxItems atomicity — FOR UPDATE serializes the count-then-create ─

describe('POST /api/items — maxItems serialization lock (round90-F3)', () => {
        it('takes a FOR UPDATE lock on the Restaurant row INSIDE the tx, before the count', async () => {
                await postItem({ name: 'شاي', price: 3, categoryId: 3 });

                expect(mockQueryRaw).toHaveBeenCalledTimes(1);
                const [strings, lockedId] = mockQueryRaw.mock.calls[0] as [
                        TemplateStringsArray,
                        number,
                ];
                const sql = strings.join('');
                expect(sql).toContain('FOR UPDATE');
                expect(sql).toContain('"Restaurant"');
                expect(lockedId).toBe(7); // the same row that owns maxItems
                // the lock is acquired BEFORE the cap count (serialization order)
                expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
                        mockMenuItemCount.mock.invocationCallOrder[0]
                );
                expect(mockTransaction).toHaveBeenCalledTimes(1);
        });

        it('count at the cap → 403 unified plan message, create skipped (lock still taken)', async () => {
                mockMenuItemCount.mockResolvedValue(10); // === maxItems

                const res = await postItem({ name: 'شاي', price: 3, categoryId: 3 });

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للأصناف (10) في خطة «أساسية». قم بترقية خطتك لإضافة المزيد.'
                );
                expect(mockMenuItemCreate).not.toHaveBeenCalled();
                // the loser of a concurrent pair re-counts AFTER the lock, i.e.
                // after the winner's commit — the cap can no longer be bypassed
                expect(mockQueryRaw).toHaveBeenCalledTimes(1);
        });
});

// ── 4. round91-F-B (D2-#4): authoritative maxItems under the lock ──────

describe('POST /api/items — maxItems re-read under FOR UPDATE (round91-F-B)', () => {
        it('the LOCKED maxItems wins over the stale pre-tx read (concurrent downgrade window)', async () => {
                // pre-tx category read says 10 (stale); under the lock the plan was downgraded to 5
                (txMock.restaurant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ maxItems: 5 });
                mockMenuItemCount.mockResolvedValue(5); // === the NEW cap

                const res = await postItem({ name: 'شاي', price: 3, categoryId: 3 });

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للأصناف (5) في خطة «أساسية». قم بترقية خطتك لإضافة المزيد.'
                );
                expect(mockMenuItemCreate).not.toHaveBeenCalled();
                // re-read happens under the lock, before the count
                expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
                        (txMock.restaurant.findUnique as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
                );
                expect((txMock.restaurant.findUnique as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]).toBeLessThan(
                        mockMenuItemCount.mock.invocationCallOrder[0]
                );
        });
});

// ── 5. r138 (W5-C3 — حكم تدقيق W5-A3 P3): سقف سعر الصنف ──────────────

describe('POST/PUT price bounds — Decimal(10,2) ceiling, free=0 legal (r138)', () => {
        it('POST price=0 → 201 (الصنف المجاني قانوني — حكم 6e702c24 الموثّق)', async () => {
                const res = await postItem({ name: 'خبز مجاني', price: 0, categoryId: 3 });

                expect(res.status).toBe(201);
                expect(mockMenuItemCreate.mock.calls[0][0].data.price).toBe(0);
        });

        it('POST price فوق سقف العمود → 422 عربية عائلية (لا 500 ضجيج Prisma)', async () => {
                const res = await postItem({ name: 'شاي', price: 100_000_000, categoryId: 3 });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details[0]).toContain('السعر كبير جداً');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('PUT price=0 → 200 (كان positive() يرفض تحرير الصنف المجاني الذي أنشأه POST)', async () => {
                const res = await putItem(901, { price: 0 });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate.mock.calls[0][0].data.price).toBe(0);
        });

        it('PUT price فوق السقف → 422 العربية قبل أي قراءة/كتابة', async () => {
                const res = await putItem(901, { price: 999_999_999 });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.details[0]).toContain('السعر كبير جداً');
                expect(mockMenuItemFindUnique).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('PUT discountedPrice=0 → 200 (مجاني 100% — عقد r118-A3-P2-3 موسوع لPUT)', async () => {
                const res = await putItem(901, { discountedPrice: 0 });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate.mock.calls[0][0].data.discountedPrice).toBe(0);
        });
});

// ── 7. W6-B6 (G-2 — تدقيق W6-A3): الترتيب — عقد sortOrder على POST/PUT

describe('items POST/PUT sortOrder — the real ordering contract (W6-B6)', () => {
        it('PUT { sortOrder } يُكتب كما هو (العقد الذي تعتمد عليه أزرار النقل)', async () => {
                const res = await putItem(901, { sortOrder: 2 });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate.mock.calls[0][0].data.sortOrder).toBe(2);
        });

        it('POST بلا sortOrder يُلحق بآخر القسم: max للقسم + 1 (تحت القفل)', async () => {
                mockMenuItemAggregate.mockResolvedValue({ _max: { sortOrder: 3 } });

                const res = await postItem({ name: 'شاي', price: 3, categoryId: 3 });

                expect(res.status).toBe(201);
                expect(mockMenuItemAggregate.mock.calls[0][0]).toEqual({
                        where: { categoryId: 3 },
                        _max: { sortOrder: true },
                });
                expect(mockMenuItemCreate.mock.calls[0][0].data.sortOrder).toBe(4);
                // الحساب داخل المعاملة (نفس ترتيب سلسلة السقف — بعد القفل)
                expect(mockTransaction).toHaveBeenCalledTimes(1);
                expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
                        mockMenuItemAggregate.mock.invocationCallOrder[0]
                );
        });

        it('POST قسم فارغ (لا max) → sortOrder = 0', async () => {
                mockMenuItemAggregate.mockResolvedValue({ _max: { sortOrder: null } });

                const res = await postItem({ name: 'شاي', price: 3, categoryId: 3 });

                expect(res.status).toBe(201);
                expect(mockMenuItemCreate.mock.calls[0][0].data.sortOrder).toBe(0);
        });

        it('POST بـ sortOrder صريح يمر كما هو (لا يُلمس)', async () => {
                mockMenuItemAggregate.mockResolvedValue({ _max: { sortOrder: 9 } });

                const res = await postItem({ name: 'شاي', price: 3, categoryId: 3, sortOrder: 0 });

                expect(res.status).toBe(201);
                expect(mockMenuItemCreate.mock.calls[0][0].data.sortOrder).toBe(0);
        });
});

// ── 6. r138 (W5-C3 — حكم تدقيق W5-A3 P3): حارس الاشتراك المنتهي ───────

describe('items POST/PUT — حارس الاشتراك المنتهي (r138 — عائلة /api/owner/*)', () => {
        it('مالك منتهي POST → 403 «اشتراكك منتهي. جدّد اشتراكك للمتابعة.» وصفر كتابات', async () => {
                subGuardHolder.active = false;

                const res = await postItem({ name: 'شاي', price: 3, categoryId: 3 });

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('اشتراكك منتهي. جدّد اشتراكك للمتابعة.');
                expect(mockCategoryFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockMenuItemCreate).not.toHaveBeenCalled();
        });

        it('مالك منتهي PUT → 403 قبل جلب الصف أو تحديثه', async () => {
                subGuardHolder.active = false;

                const res = await putItem(901, { price: 4 });

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('اشتراكك منتهي. جدّد اشتراكك للمتابعة.');
                expect(mockMenuItemFindUnique).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('المالك النشط يمرّ (السلوك القائم لا يتغير)', async () => {
                const res = await putItem(901, { price: 4 });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate).toHaveBeenCalledTimes(1);
        });
});
