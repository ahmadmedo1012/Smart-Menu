/**
 * Round89-E — plan-cap + image-cap unit coverage for the wave-2 changes.
 *
 *   1. PlanLimitError (src/lib/plan-limit-error.ts): one class, one message
 *      template, kind/limit/planName properties (dx-1 ج-1 — was three
 *      byte-identical local classes with drifted copy).
 *   2. POST /api/items plan cap: the tx count check throws the unified
 *      PlanLimitError → 403 with the plan-aware Arabic message.
 *   3. POST /api/items image cap (round89-E4): 200k-char ceiling kills the
 *      old 7M-char inflation (dx-2 #9 with w1-a's compression research) —
 *      250k rejected at the schema gate, ~20k accepted.
 *   4. POST /api/owner/restaurants menus cap: same unified error.
 *
 * Mock pattern: tx-mock prisma + controllable limiter, same as
 * orders-create.test.ts / items-featured.test.ts (no real DB). One shared
 * prisma/tx mock serves both routes — each route touches only its own
 * models inside the transaction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks (shared prisma registry) ──────────────────────────────

const mockCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockMenuItemCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSlugFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantCount = vi.hoisted(() => vi.fn());
const mockRestaurantCreate = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRevalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockMediaUrlError = vi.hoisted(() => vi.fn(() => null));

const txMock = vi.hoisted(() => ({
        menuItem: { count: mockMenuItemCount, create: mockMenuItemCreate },
        userRestaurant: { count: mockUserRestaurantCount, create: vi.fn() },
        // round91-F-B (D2-#4): items POST re-reads maxItems under the FOR
        // UPDATE lock — resolving nothing keeps the pre-tx values as fallback.
        restaurant: { create: mockRestaurantCreate, findUnique: vi.fn() },
        menuCategory: { createMany: vi.fn() },
        // round90-F3: POST /api/items now takes a FOR UPDATE row lock on the
        // restaurant row inside the tx (maxItems serialization) — permissive
        // stub so this file's cap assertions keep exercising the same logic.
        $queryRaw: vi.fn().mockResolvedValue([]),
        // round90-F1: POST /api/owner/restaurants reads the free-plan caps
        // (maxItems/maxOrders) from subscriptionPlan.findFirst inside the tx.
        subscriptionPlan: { findFirst: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
        menuCategory: { findUnique: mockCategoryFindUnique },
        user: { findUnique: mockUserFindUnique },
        restaurant: { findUnique: mockSlugFindUnique },
        // r121-C3: POST /api/owner/restaurants now checks the pending-payment
        // slug reservation via the shared helper — no reservation by default.
        subscriptionPayment: { findFirst: vi.fn(async () => null) },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidate }));
vi.mock('@/lib/blob', () => ({ mediaUrlError: mockMediaUrlError, deleteBlob: vi.fn() }));
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
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));

// ── Fixtures / defaults (shared by both routes) ──────────────────────

const CATEGORY = {
        restaurant: { id: 7, name: 'al-waha', maxItems: 10, plan: { nameAr: 'أساسية' } },
};

beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
        );
        mockCategoryFindUnique.mockResolvedValue({ ...CATEGORY });
        mockMenuItemCount.mockResolvedValue(0);
        mockMenuItemCreate.mockResolvedValue({ id: 901 });
        mockUserFindUnique.mockResolvedValue({ plan: { maxMenus: 2, nameAr: 'أساسية' } });
        mockSlugFindUnique.mockResolvedValue(null);
        mockUserRestaurantCount.mockResolvedValue(0);
        mockRestaurantCreate.mockResolvedValue({ id: 55, name: 'مطعم جديد', slug: 'new-menu' });
        txMock.userRestaurant.create.mockResolvedValue({});
        txMock.menuCategory.createMany.mockResolvedValue({ count: 4 });
        // round90-F1: no free-plan row by default → the hard fallback caps 10/100
        txMock.subscriptionPlan.findFirst.mockResolvedValue(null);
});

// ── The class itself ────────────────────────────────────────────────────

describe('PlanLimitError (round89-E1)', () => {
        it('message carries the kind label, the limit and the plan name', async () => {
                const { PlanLimitError } = await import('@/lib/plan-limit-error');
                const e = new PlanLimitError({ kind: 'items', limit: 10, planName: 'أساسية' });

                expect(e).toBeInstanceOf(Error);
                expect(e.name).toBe('PlanLimitError');
                expect(e.message).toBe(
                        'لقد وصلت للحد الأقصى للأصناف (10) في خطة «أساسية». قم بترقية خطتك لإضافة المزيد.'
                );
                expect(e.kind).toBe('items');
                expect(e.limit).toBe(10);
                expect(e.planName).toBe('أساسية');
        });

        it('no plan name → the generic «خطتك» phrasing, planName null', async () => {
                const { PlanLimitError } = await import('@/lib/plan-limit-error');
                const e = new PlanLimitError({ kind: 'orders', limit: 500 });

                expect(e.message).toBe(
                        'لقد وصلت للحد الأقصى للطلبات (500) في خطتك. قم بترقية خطتك لإضافة المزيد.'
                );
                expect(e.planName).toBeNull();
        });

        it('menus kind uses the منيوهات label', async () => {
                const { PlanLimitError } = await import('@/lib/plan-limit-error');
                const e = new PlanLimitError({ kind: 'menus', limit: 1 });
                expect(e.message).toContain('للمنيوهات (1)');
        });
});

// ── POST /api/items — plan cap + image cap ──────────────────────────────

function itemBody(overrides: Record<string, unknown> = {}) {
        return { name: 'كابتشينو', price: 8, categoryId: 3, ...overrides };
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

describe('POST /api/items — plan item cap (round89-E1)', () => {
        it('count at maxItems → 403 with the unified plan message, create skipped', async () => {
                mockCategoryFindUnique.mockResolvedValue({ ...CATEGORY });
                mockMenuItemCount.mockResolvedValue(10); // === maxItems

                const res = await postItem(itemBody());

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للأصناف (10) في خطة «أساسية». قم بترقية خطتك لإضافة المزيد.'
                );
                expect(mockMenuItemCreate).not.toHaveBeenCalled();
        });

        it('restaurant without a plan → the generic «خطتك» variant', async () => {
                mockCategoryFindUnique.mockResolvedValue({
                        restaurant: { id: 7, name: 'al-waha', maxItems: 10, plan: null },
                });
                mockMenuItemCount.mockResolvedValue(10);

                const res = await postItem(itemBody());

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للأصناف (10) في خطتك. قم بترقية خطتك لإضافة المزيد.'
                );
        });

        it('count under the cap → create proceeds (201)', async () => {
                mockCategoryFindUnique.mockResolvedValue({ ...CATEGORY });
                mockMenuItemCount.mockResolvedValue(9);

                const res = await postItem(itemBody());

                expect(res.status).toBe(201);
                expect(mockMenuItemCreate).toHaveBeenCalledTimes(1);
        });
});

describe('POST /api/items — image cap (round89-E4)', () => {
        it('250k-char image → 422 at the schema gate, zero DB work', async () => {
                const res = await postItem(itemBody({ image: 'a'.repeat(250_000) }));

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details[0]).toContain('الصورة كبيرة جداً');
                // rejected by zod before any query/transaction
                expect(mockCategoryFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('~20k-char image (an honest compressed payload) → accepted', async () => {
                mockCategoryFindUnique.mockResolvedValue({ ...CATEGORY });

                const res = await postItem(itemBody({ image: 'a'.repeat(20_000) }));

                expect(res.status).toBe(201);
                expect(mockMenuItemCreate).toHaveBeenCalledTimes(1);
                // the stored row carries the image verbatim
                const createArg = mockMenuItemCreate.mock.calls[0][0];
                expect(createArg.data.image).toHaveLength(20_000);
        });

        it('image at exactly 200k chars stays at the boundary (accepted)', async () => {
                mockCategoryFindUnique.mockResolvedValue({ ...CATEGORY });

                const res = await postItem(itemBody({ image: 'a'.repeat(200_000) }));

                expect(res.status).toBe(201);
        });
});

// ── POST /api/owner/restaurants — menus cap ─────────────────────────────

async function postMenu(body: unknown) {
        const { POST } = await import('@/app/api/owner/restaurants/route');
        return POST(
                new NextRequest('http://localhost/api/owner/restaurants', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                })
        );
}

const MENU_BODY = { name: 'مطعم جديد', slug: 'new-menu', description: '', phone: '', whatsapp: '' };

describe('POST /api/owner/restaurants — plan menus cap (round89-E1)', () => {
        it('count at maxMenus → 403 with the unified plan message, restaurant not created', async () => {
                mockUserFindUnique.mockResolvedValue({ plan: { maxMenus: 2, nameAr: 'أساسية' } });
                mockSlugFindUnique.mockResolvedValue(null);
                mockUserRestaurantCount.mockResolvedValue(2); // === maxMenus

                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للمنيوهات (2) في خطة «أساسية». قم بترقية خطتك لإضافة المزيد.'
                );
                expect(mockRestaurantCreate).not.toHaveBeenCalled();
        });

        it('no plan row → default maxMenus 1 with the generic «خطتك» phrasing', async () => {
                mockUserFindUnique.mockResolvedValue({ plan: null });
                mockSlugFindUnique.mockResolvedValue(null);
                mockUserRestaurantCount.mockResolvedValue(1);

                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للمنيوهات (1) في خطتك. قم بترقية خطتك لإضافة المزيد.'
                );
        });

        it('count under the cap → restaurant created (201)', async () => {
                mockUserFindUnique.mockResolvedValue({ plan: { maxMenus: 2, nameAr: 'أساسية' } });
                mockSlugFindUnique.mockResolvedValue(null);
                mockUserRestaurantCount.mockResolvedValue(1);
                mockRestaurantCreate.mockResolvedValue({ id: 55, name: 'مطعم جديد', slug: 'new-menu' });

                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(201);
                expect(mockRestaurantCreate).toHaveBeenCalledTimes(1);
        });
});
