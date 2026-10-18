/**
 * r121-E1 — PUT /api/items/[id] destination-category tenant guard.
 *
 * The finding (E-security E-1, P1): the PUT ownership ladder validated only
 * the item's CURRENT restaurant — the updateSchema's categoryId was copied
 * verbatim into the update, so any owner could move an item into ANOTHER
 * tenant's category (ids are small sequential integers exposed by the public
 * menu payload): the item lands on the victim's public menu, orderable by
 * their customers, counted into their plan cap.
 *
 * The fix mirrors the POST ladder (items/route.ts:196-228): when a NEW
 * categoryId is sent, the destination category is fetched and must belong to
 * the caller (owner: primary restaurant or UserRestaurant link; staff already
 * passed MANAGE_RESTAURANTS — platform-wide by design, same as POST).
 *
 * Mock pattern: items-contract.test.ts (tx-mock prisma + auth holder).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemUpdate = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRevalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRequirePermission = vi.hoisted(() => vi.fn());

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 7 as number | null,
                userId: 1 as number | null,
                permissions: [] as string[],
        },
}));

const prismaMock = vi.hoisted(() => ({
        menuCategory: { findUnique: mockCategoryFindUnique },
        menuItem: { findUnique: mockMenuItemFindUnique, update: mockMenuItemUpdate },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidate }));
vi.mock('@/lib/blob', () => ({
        mediaUrlError: vi.fn(() => null),
        deleteBlob: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 19, reset: 0 })),
                destroy: () => {},
        }),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => ({ ...authHolder.value })),
        requirePermission: mockRequirePermission,
}));
// r138 (W5-C3): items PUT carries the owner expiry guard now — always active here.
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

// Owner A (userId 1, primary restaurant 7) editing HIS item 901 which lives
// in category 70 (restaurant 7).
const OWN_ITEM = {
        id: 901,
        categoryId: 70,
        name: 'كابتشينو',
        price: 8,
        discountedPrice: null,
        image: '',
        isFeatured: false,
        category: { restaurantId: 7 },
};

// A second category in A's OWN restaurant (a legitimate in-tenant move).
const OWN_SECOND_CATEGORY = { restaurantId: 7 };
// A category of tenant B (restaurant 8) — the injection target.
const FOREIGN_CATEGORY = { restaurantId: 8 };

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 7, userId: 1, permissions: [] };
        mockRequirePermission.mockResolvedValue({ authorized: true, role: 'admin', userId: 2 });
        mockMenuItemFindUnique.mockResolvedValue({ ...OWN_ITEM });
        mockMenuItemUpdate.mockResolvedValue({ ...OWN_ITEM, category: { id: 71, name: 'C', nameAr: 'س' } });
        mockCategoryFindUnique.mockResolvedValue({ ...OWN_SECOND_CATEGORY });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
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

// ── The guard ───────────────────────────────────────────────────────────

describe('r121-E1 PUT /api/items/[id] — destination-category tenant guard', () => {
        it('owner A moving own item to tenant B\'s category → 403 «غير مصرح», row unchanged', async () => {
                mockCategoryFindUnique.mockResolvedValue({ ...FOREIGN_CATEGORY });

                const res = await putItem(901, { categoryId: 88 });

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('غير مصرح');
                // the link lookup was for the DESTINATION restaurant (8), not the item's current one (7)
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 1, restaurantId: 8 } },
                });
                // zero writes: the item row is untouched
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
                expect(mockRevalidate).not.toHaveBeenCalled();
        });

        it('owner A moving to a SECOND category of their OWN restaurant → 200, update carries the new categoryId', async () => {
                mockCategoryFindUnique.mockResolvedValue({ ...OWN_SECOND_CATEGORY });

                const res = await putItem(901, { categoryId: 71 });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate).toHaveBeenCalledTimes(1);
                expect(mockMenuItemUpdate.mock.calls[0][0].data.categoryId).toBe(71);
        });

        it('multi-menu owner WITH a UserRestaurant link to the destination restaurant → 200 (round90-F3 parity)', async () => {
                mockCategoryFindUnique.mockResolvedValue({ ...FOREIGN_CATEGORY });
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 1, restaurantId: 8, isPrimary: false });

                const res = await putItem(901, { categoryId: 88 });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate.mock.calls[0][0].data.categoryId).toBe(88);
        });

        it('destination category does not exist → 404 «التصنيف غير موجود» (POST\'s copy), no write', async () => {
                mockCategoryFindUnique.mockResolvedValue(null);

                const res = await putItem(901, { categoryId: 424242 });

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('التصنيف غير موجود');
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('same categoryId as the current one (ItemDialog full-body re-send) → no destination read, 200', async () => {
                const res = await putItem(901, { categoryId: 70 });

                expect(res.status).toBe(200);
                expect(mockCategoryFindUnique).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).toHaveBeenCalledTimes(1);
        });

        it('legacy admin (MANAGE_RESTAURANTS full-trust) moving to a foreign category → 200 — platform-wide moderation, same contract as POST', async () => {
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 2, permissions: [] };
                mockCategoryFindUnique.mockResolvedValue({ ...FOREIGN_CATEGORY });

                const res = await putItem(901, { categoryId: 88 });

                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate.mock.calls[0][0].data.categoryId).toBe(88);
        });

        it('sub_admin WITHOUT MANAGE_RESTAURANTS + foreign categoryId → 403 at the staff gate (destination never fetched)', async () => {
                authHolder.value = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 3, permissions: [] };
                mockRequirePermission.mockResolvedValue({ authorized: false, error: 'لا تملك الصلاحية', status: 403 });

                const res = await putItem(901, { categoryId: 88 });

                expect(res.status).toBe(403);
                expect(mockCategoryFindUnique).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });
});
