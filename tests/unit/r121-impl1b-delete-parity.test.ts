/**
 * r121-IMPL-1b (D-6/D-7) — delete-path parity.
 *
 * D-6: the OWNER restaurant DELETE never cleaned Vercel Blob (the admin path
 *      did — src/app/api/restaurants/[id] collects item images + logo + gallery
 *      pre-delete and deleteBlob's them after the DB tx succeeds). Every
 *      owner-side delete leaked the tenant's blobs silently. Now mirrored.
 * D-7: category DELETE hit the r119-S7 RESTRICT FKs (OrderItem/Review →
 *      MenuItem) whenever a category holds an ever-ordered/reviewed item, and
 *      the P2003 fell to handleError's generic 400 «بيانات مرتبطة لا يمكن
 *      حذفها» — no blocker, no remedy. Now mapped to the honest 409 family
 *      the restaurant DELETE paths use.
 *
 * Mock pattern: the r118-restaurant-delete-guard / r93-coverage-categories-id
 * house style — hoisted prisma mock, real route handlers, tx mock that hands
 * the callback a prisma-shaped object.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn().mockResolvedValue(0));
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockRestaurantDelete = vi.hoisted(() => vi.fn());
const mockReviewDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 0 }));
const mockLinkDelete = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockDeleteBlob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockCategoryDelete = vi.hoisted(() => vi.fn());
const mockRevalidateMenu = vi.hoisted(() => vi.fn(async () => {}));

const txMock = vi.hoisted(() => ({
        userRestaurant: { delete: mockLinkDelete },
        review: { deleteMany: mockReviewDeleteMany },
        restaurant: { delete: mockRestaurantDelete },
}));

const mockPrisma = vi.hoisted(() => ({
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        order: { count: mockOrderCount },
        restaurant: { findUnique: mockRestaurantFindUnique },
        menuItem: { findMany: mockMenuItemFindMany },
        menuCategory: { findUnique: mockCategoryFindUnique, delete: mockCategoryDelete },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/blob', () => ({ deleteBlob: mockDeleteBlob, mediaUrlError: () => null }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidateMenu }));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 313 as number | null,
                userId: 7 as number | null,
                permissions: [] as string[],
        },
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => authHolder.value),
        requirePermission: vi.fn(async () => ({ ...authHolder.value, authorized: true })),
}));

const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 313, userId: 7, permissions: [] };
        mockOrderCount.mockResolvedValue(0);
        mockUserRestaurantFindUnique.mockResolvedValue({ isPrimary: false });
        mockRestaurantFindUnique.mockResolvedValue({
                name: 'مقهى الواحة',
                slug: 'al-waha-cafe',
                logo: 'https://x.vercel-storage.com/restaurants/313/logo.png',
                gallery: [
                        'https://x.vercel-storage.com/restaurants/313/g1.png',
                        'https://x.vercel-storage.com/restaurants/313/g2.png',
                ],
        });
        mockMenuItemFindMany.mockResolvedValue([
                { image: 'https://x.vercel-storage.com/restaurants/313/i1.png' },
                { image: 'https://x.vercel-storage.com/restaurants/313/i2.png' },
        ]);
        mockTransaction.mockImplementation(async (fn: (t: typeof txMock) => Promise<unknown>) => fn(txMock));
        mockRestaurantDelete.mockResolvedValue(undefined);
        mockCategoryFindUnique.mockResolvedValue({ id: 11, restaurantId: 313, name: 'مشروبات' });
        mockCategoryDelete.mockResolvedValue({ id: 11 });
});

// ── D-6: owner restaurant DELETE — blob cleanup parity ─────────────────

describe('r121-D6 — owner restaurant DELETE cleans Vercel Blob (admin parity)', () => {
        async function callDelete() {
                const { DELETE } = await import('@/app/api/owner/restaurants/[id]/route');
                return DELETE(new NextRequest('http://localhost/api/owner/restaurants/313', { method: 'DELETE' }), idParams(313));
        }

        it('successful delete → item images + logo + gallery all deleteBlob-scoped to the tenant', async () => {
                const res = await callDelete();
                expect(res.status).toBe(200);

                // every URL captured pre-delete, deleted exactly once, tenant-scoped
                expect(mockDeleteBlob).toHaveBeenCalledTimes(5);
                expect(mockDeleteBlob).toHaveBeenCalledWith('https://x.vercel-storage.com/restaurants/313/i1.png', { restaurantId: 313 });
                expect(mockDeleteBlob).toHaveBeenCalledWith('https://x.vercel-storage.com/restaurants/313/i2.png', { restaurantId: 313 });
                expect(mockDeleteBlob).toHaveBeenCalledWith('https://x.vercel-storage.com/restaurants/313/logo.png', { restaurantId: 313 });
                expect(mockDeleteBlob).toHaveBeenCalledWith('https://x.vercel-storage.com/restaurants/313/g1.png', { restaurantId: 313 });
                expect(mockDeleteBlob).toHaveBeenCalledWith('https://x.vercel-storage.com/restaurants/313/g2.png', { restaurantId: 313 });
                // images are collected BEFORE the cascade erases the rows
                expect(mockMenuItemFindMany).toHaveBeenCalledWith({
                        where: { category: { is: { restaurantId: 313 } } },
                        select: { image: true },
                });
        });

        it('failed transaction → no blob deletion (deletion strictly post-commit)', async () => {
                mockRestaurantDelete.mockRejectedValue(new Error('delete internals'));
                const res = await callDelete();
                expect(res.status).toBe(500);
                expect(mockDeleteBlob).not.toHaveBeenCalled();
        });

        it('P2003 orders-RESTRICT still maps to the r119-S7 409 (blob work never starts)', async () => {
                mockOrderCount.mockResolvedValue(0);
                mockRestaurantDelete.mockRejectedValue(
                        Object.assign(new Error('Foreign key constraint failed on the fields: (`restaurantId`)'), {
                                code: 'P2003',
                                meta: { field_name: 'Order_restaurantId_fkey' },
                        })
                );
                const res = await callDelete();
                expect(res.status).toBe(409);
                expect(mockDeleteBlob).not.toHaveBeenCalled();
        });
});

// ── D-7: category DELETE — P2003 → honest 409 ───────────────────────────

describe('r121-D7 — category DELETE P2003 → honest Arabic 409', () => {
        async function callDelete() {
                const { DELETE } = await import('@/app/api/categories/[id]/route');
                return DELETE(new NextRequest('http://localhost/api/categories/11', { method: 'DELETE' }), idParams(11));
        }

        it('RESTRICT violation (ordered/reviewed items) → 409 with blocker + remedy, not the generic 400', async () => {
                mockCategoryDelete.mockRejectedValue(
                        Object.assign(new Error('Foreign key constraint failed on the fields: (`itemId`)'), { code: 'P2003' })
                );
                const res = await callDelete();
                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe(
                        'لا يمكن حذف قسم يحتوي أصنافاً لها طلبات أو تقييمات مسجلة — انقل الأصناف إلى قسم آخر أولاً'
                );
                expect(mockLogAudit).not.toHaveBeenCalled();
                expect(mockRevalidateMenu).not.toHaveBeenCalled();
        });

        it('non-P2003 failure keeps the generic 500 path (no over-broad mapping)', async () => {
                mockCategoryDelete.mockRejectedValue(new Error('boom'));
                const res = await callDelete();
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
        });

        it('empty category still deletes cleanly → 200 (the guard is P2003-only)', async () => {
                const res = await callDelete();
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: { id: 11 } });
                expect(mockRevalidateMenu).toHaveBeenCalledWith(313);
        });
});
