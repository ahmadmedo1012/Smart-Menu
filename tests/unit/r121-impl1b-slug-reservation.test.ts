/**
 * r121-IMPL-1b (C-3, X2 §2) — pending-payment slug reservation on every
 * slug-write path.
 *
 * r103-F4 added the reservation to public self-registration only; X2 verified
 * three more snipe paths (restaurants/[id] PUT regex-only, owner/restaurants
 * POST Restaurant-table-only, settings restaurant_slug regex-only AND missing
 * even the Restaurant-uniqueness pre-check). A snipe re-created the payer
 * dead-end: approval hits SLUG_TAKEN inside the tx BEFORE the payment update
 * → payment pending forever, no self-service retry.
 *
 * What these tests pin (per site):
 *   - PUT /api/restaurants/[id]: reserved slug → 409 «الرابط … محجوز بطلب دفع
 *     معلق» BEFORE any restaurant.update; free slug → 200; body without slug →
 *     the reservation helper is never queried.
 *   - POST /api/owner/restaurants: reserved → 409, transaction never opens;
 *     free slug → 201.
 *   - PUT /api/settings restaurant_slug: reserved → 409 (reservation copy);
 *     slug held by ANOTHER restaurant → 409 «الرابط … محجوز مسبقاً» (the
 *     honest disambiguated copy — this branch previously had NO pre-check and
 *     a real collision died as the misleading P2002 name-conflict 409); the
 *     restaurant's OWN slug → 200 (no-op saves must keep working).
 *
 * Mock pattern: the r93/r118 house style — vi.hoisted prisma mock consumed by
 * the real routes AND by the shared helper (src/lib/validation.ts), which
 * resolves '@/lib/db' through the same vi.mock registry via dynamic import.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantUpdate = vi.hoisted(() => vi.fn());
const mockSettingUpsert = vi.hoisted(() => vi.fn());
const mockPaymentFindFirst = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique, update: mockRestaurantUpdate },
        setting: { upsert: mockSettingUpsert },
        subscriptionPayment: { findFirst: mockPaymentFindFirst },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 1 as number | null,
                userId: 7 as number | null,
                permissions: [] as string[],
        },
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => authHolder.value),
        requirePermission: vi.fn(async () => ({ ...authHolder.value, authorized: true })),
}));

vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));
vi.mock('@/lib/blob', () => ({ deleteBlob: vi.fn(), mediaUrlError: () => null }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: vi.fn(async () => {}) }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/telegram', () => ({
        notifyEvent: vi.fn().mockResolvedValue({ sent: 0, failed: [] }),
}));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: vi.fn(async () => ({ success: true })), destroy: () => {} }),
}));

// owner/restaurants POST runs its creates inside a $transaction — a tx mock
// that hands the callback a prisma-shaped object (r92/r93 pattern).
const txMock = vi.hoisted(() => ({
        $queryRaw: vi.fn(),
        userRestaurant: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
        subscriptionPlan: { findFirst: vi.fn() },
        restaurant: { create: vi.fn().mockResolvedValue({ id: 77, name: 'مطعم جديد', slug: 'new-menu' }) },
        menuCategory: { createMany: vi.fn().mockResolvedValue({ count: 4 }) },
}));

// ── Route invocation helpers ────────────────────────────────────────────

const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

function putRestaurant(body: unknown, id = '1') {
        return import('@/app/api/restaurants/[id]/route').then(({ PUT }) =>
                PUT(
                        new NextRequest(`http://localhost/api/restaurants/${id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                        }),
                        idParams(id)
                )
        );
}

function postOwnerRestaurant(body: unknown) {
        return import('@/app/api/owner/restaurants/route').then(({ POST }) =>
                POST(
                        new NextRequest('http://localhost/api/owner/restaurants', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                        })
                )
        );
}

function putSettings(items: unknown) {
        return import('@/app/api/settings/route').then(({ PUT }) =>
                PUT(
                        new NextRequest('http://localhost/api/settings', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(items),
                        })
                )
        );
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 7, permissions: [] };
        // No pending-payment reservation by default (free slug).
        mockPaymentFindFirst.mockResolvedValue(null);
        // settings batch: $transaction receives an ARRAY of upsert promises.
        mockTransaction.mockImplementation((arg: unknown) =>
                Array.isArray(arg) ? Promise.all(arg) : (arg as (t: unknown) => Promise<unknown>)(txMock)
        );
        mockSettingUpsert.mockResolvedValue({});
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockRestaurantFindUnique.mockResolvedValue({ id: 999, logo: null, gallery: [] });
        mockRestaurantUpdate.mockResolvedValue({ id: 1, slug: 'updated' });
        mockUserFindUnique.mockResolvedValue({
                id: 7,
                planId: null,
                plan: { maxMenus: 1, maxItems: 10, maxOrders: 100, nameAr: 'مجاني' },
        });
});

// ── Site 1: PUT /api/restaurants/[id] ───────────────────────────────────

describe('r121-C3 — PUT /api/restaurants/[id] slug reservation', () => {
        it('slug held by a PENDING payment → 409 reservation copy, no restaurant.update', async () => {
                mockPaymentFindFirst.mockResolvedValue({ id: 55 });
                const res = await putRestaurant({ slug: 'sniped-slug' });
                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('الرابط sniped-slug محجوز بطلب دفع معلق');
                // the shared helper ran with the canonical pending-payment filter
                expect(mockPaymentFindFirst).toHaveBeenCalledWith({
                        where: {
                                status: 'pending',
                                metadata: { path: ['tempRestaurants'], array_contains: [{ slug: 'sniped-slug' }] },
                        },
                        select: { id: true },
                });
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('free slug → 200 and the update proceeds (guard is not a blanket block)', async () => {
                const res = await putRestaurant({ slug: 'fresh-slug-1' });
                expect(res.status).toBe(200);
                expect(mockPaymentFindFirst).toHaveBeenCalledTimes(1);
                expect(mockRestaurantUpdate).toHaveBeenCalledWith({
                        where: { id: 1 },
                        data: { slug: 'fresh-slug-1' },
                });
        });

        it('body without slug → the reservation helper is never queried (no cost on ordinary edits)', async () => {
                const res = await putRestaurant({ name: 'اسم جديد' });
                expect(res.status).toBe(200);
                expect(mockPaymentFindFirst).not.toHaveBeenCalled();
                expect(mockRestaurantUpdate).toHaveBeenCalled();
        });
});

// ── Site 2: POST /api/owner/restaurants ─────────────────────────────────

describe('r121-C3 — POST /api/owner/restaurants slug reservation', () => {
        const MENU = { name: 'مطعم جديد', slug: 'new-menu' };

        it('slug held by a PENDING payment → 409, transaction never opens', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null); // not in the Restaurant table
                mockPaymentFindFirst.mockResolvedValue({ id: 55 });
                const res = await postOwnerRestaurant(MENU);
                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('الرابط new-menu محجوز بطلب دفع معلق');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('free slug → 201 (Restaurant-table check + reservation check both pass)', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null); // slug not in Restaurant table
                const res = await postOwnerRestaurant(MENU);
                expect(res.status).toBe(201);
                expect(mockPaymentFindFirst).toHaveBeenCalledWith({
                        where: {
                                status: 'pending',
                                metadata: { path: ['tempRestaurants'], array_contains: [{ slug: 'new-menu' }] },
                        },
                        select: { id: true },
                });
                expect(txMock.restaurant.create).toHaveBeenCalled();
        });
});

// ── Site 3: PUT /api/settings — restaurant_slug branch ──────────────────

describe('r121-C3 — PUT /api/settings restaurant_slug branch', () => {
        it('slug held by a PENDING payment → 409 reservation copy, no restaurant.update', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null); // no Restaurant-table clash — only the reservation blocks
                mockPaymentFindFirst.mockResolvedValue({ id: 55 });
                const res = await putSettings([{ key: 'restaurant_slug', value: 'sniped-slug' }]);
                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('الرابط sniped-slug محجوز بطلب دفع معلق');
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('slug held by ANOTHER restaurant → 409 «الرابط … محجوز مسبقاً» (the missing uniqueness pre-check)', async () => {
                // mockRestaurantFindUnique default: { id: 999 } — a different restaurant
                const res = await putSettings([{ key: 'restaurant_slug', value: 'taken-slug' }]);
                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('الرابط taken-slug محجوز مسبقاً');
                expect(mockRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { slug: 'taken-slug' },
                        select: { id: true },
                });
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it("the restaurant's OWN slug → 200 (no-op saves keep working, not a false conflict)", async () => {
                mockRestaurantFindUnique.mockResolvedValue({ id: 1, logo: null, gallery: [] }); // self
                const res = await putSettings([{ key: 'restaurant_slug', value: 'my-current-slug' }]);
                expect(res.status).toBe(200);
                expect(mockRestaurantUpdate).toHaveBeenCalledWith({
                        where: { id: 1 },
                        data: { slug: 'my-current-slug' },
                });
        });

        it('free slug → 200 and the update stores the normalized slug', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null); // no clash
                const res = await putSettings([{ key: 'restaurant_slug', value: 'fresh-setting-slug' }]);
                expect(res.status).toBe(200);
                expect(mockRestaurantUpdate).toHaveBeenCalledWith({
                        where: { id: 1 },
                        data: { slug: 'fresh-setting-slug' },
                });
        });

        it('malformed slug stays a 422 format error (r138: canonical slugField message)', async () => {
                // (r138): صار الفحص عبر slugField القانوني (آخر نسخة regex inline
                // حية في settings — وحّدتها r138 بعد أن وثّقت r138-e خطر انحرافها)،
                // فرسالة 422 هي رسالة slugField القانونية نفسها التي تثبّتها
                // payment-schema-caps.test.ts لبقية مسارات الرابط.
                const res = await putSettings([{ key: 'restaurant_slug', value: 'INVALID_SLUG' }]);
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('الرابط يجب أن يحتوي على أحرف إنكليزية وأرقام فقط');
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });
});
