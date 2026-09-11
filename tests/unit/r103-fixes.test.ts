/**
 * r103 — unit coverage for this round's fixes:
 *
 *   N3  cart store: cross-restaurant consistency (setRestaurantDetails no longer
 *       flips the restaurant under a full cart; addItem's reset branch now lands
 *       on a FULLY consistent state — new restaurant's whatsapp/name included).
 *   F1  GET /api/items: staff (super_admin/admin/sub_admin) may list unscoped
 *       (the /admin/menu console contract — round87-B9); owners/USER/anonymous
 *       still require an explicit scope.
 *   F5a POST reviews: rating is .int() — 4.5 is a clean 422, not Prisma noise.
 *   F5b DELETE reviews: owner-scoped moderation; cross-item reviewId → 404;
 *       counters recomputed exactly (set-based SQL) + menu revalidated.
 *   F3  /api/subscriptions/validate: the AUTHENTICATED user's own username is
 *       valid (paid-plan retry after rejection is the designed path).
 *   F4  POST /api/restaurants public self-registration: a slug held by a
 *       PENDING payment is a 409 (no more sniping the payer's reserved slug).
 *
 * Mock pattern: tx-mock prisma + mutable requireAuth (same style as
 * orders-create.test.ts / items-contract.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mutable auth mock (per-suite role switching) ────────────────────────
const authState = vi.hoisted(() => ({
        authorized: true as boolean,
        role: 'owner' as string,
        userId: 1,
        restaurantId: null as number | null,
        permissions: [] as string[],
}));

vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => ({ ...authState })),
        requirePermission: vi.fn(async () => ({ ...authState, authorized: true })),
}));

// ── Prisma mock ─────────────────────────────────────────────────────────
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockReviewDelete = vi.hoisted(() => vi.fn());
const mockExecuteRaw = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindFirst = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSubscriptionPaymentFindFirst = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        review: { delete: mockReviewDelete },
        $executeRaw: mockExecuteRaw,
}));

const prismaMock = vi.hoisted(() => ({
        menuItem: { findMany: mockMenuItemFindMany, count: mockMenuItemCount, findUnique: mockMenuItemFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique, findFirst: mockUserRestaurantFindFirst },
        user: { findUnique: mockUserFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
        subscriptionPayment: { findFirst: mockSubscriptionPaymentFindFirst },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 19, reset: 0 })),
                destroy: () => {},
        }),
}));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: vi.fn(async () => undefined) }));
vi.mock('@/lib/telegram', () => ({
        notifyEvent: vi.fn(async () => undefined),
        getDecryptedBotToken: vi.fn(async () => null),
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn(async () => undefined) }));

// ── Route imports (AFTER mocks) ─────────────────────────────────────────
import { GET as itemsGET } from '@/app/api/items/route';
import { POST as reviewsPOST, DELETE as reviewsDELETE } from '@/app/api/items/[id]/reviews/route';
import { POST as validatePOST } from '@/app/api/subscriptions/validate/route';
import { POST as restaurantsPOST } from '@/app/api/restaurants/route';
import { useCart } from '@/store/cart';

// ── Helpers ─────────────────────────────────────────────────────────────
function req(url: string, init?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
        return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}
function jsonReq(url: string, body: unknown, method = 'POST'): NextRequest {
        return req(url, {
                method,
                headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
                body: JSON.stringify(body),
        });
}
function resetAuth(role: string, extra: Partial<typeof authState> = {}) {
        Object.assign(authState, {
                authorized: true,
                role,
                userId: 1,
                restaurantId: 7,
                permissions: [],
        }, extra);
}
function resetCart() {
        useCart.setState({
                items: [],
                restaurantId: 0,
                restaurantWhatsapp: '',
                restaurantName: '',
                customerName: '',
                customerPhone: '',
                notes: '',
                pickupType: 'inside',
                lastRemoved: null,
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        resetAuth('owner', { restaurantId: 7 });
        mockMenuItemFindMany.mockResolvedValue([]);
        mockMenuItemCount.mockResolvedValue(0);
        mockMenuItemFindUnique.mockResolvedValue({
                id: 50,
                category: { restaurantId: 7 },
        });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockUserRestaurantFindFirst.mockResolvedValue(null);
        mockUserFindUnique.mockResolvedValue(null);
        mockRestaurantFindUnique.mockResolvedValue(null);
        mockSubscriptionPaymentFindFirst.mockResolvedValue(null);
        mockExecuteRaw.mockResolvedValue(1);
        resetCart();
});

// ═══════════════════════════════════════════════════════════════════════
// N3 — cart store cross-restaurant consistency
// ═══════════════════════════════════════════════════════════════════════
describe('r103-N3 cart store — cross-restaurant guard', () => {
        it('empty cart adopts whatever restaurant details arrive', () => {
                useCart.getState().setRestaurantDetails(10, '+218111', 'مطعم أ');
                expect(useCart.getState().restaurantId).toBe(10);
                expect(useCart.getState().restaurantWhatsapp).toBe('+218111');
        });

        it('visiting menu B with a full A-cart does NOT flip the restaurant', () => {
                useCart.getState().setRestaurantDetails(10, '+218111', 'مطعم أ');
                useCart.getState().addItem({ itemId: 1, name: 'شاي', price: 3, restaurantId: 10 });
                expect(useCart.getState().items).toHaveLength(1);

                useCart.getState().setRestaurantDetails(20, '+218222', 'مطعم ب');

                const s = useCart.getState();
                expect(s.restaurantId).toBe(10); // cart's own restaurant stays authoritative
                expect(s.restaurantWhatsapp).toBe('+218111');
                expect(s.items).toHaveLength(1); // nothing silently lost
        });

        it('adding a B-item while holding an A-cart resets to a FULLY consistent B state', () => {
                useCart.getState().setRestaurantDetails(10, '+218111', 'مطعم أ');
                useCart.getState().addItem({ itemId: 1, name: 'شاي', price: 3, restaurantId: 10 });
                useCart.getState().setCustomerName('زبون');

                useCart.getState().addItem({
                        itemId: 2,
                        name: 'قهوة',
                        price: 5,
                        restaurantId: 20,
                        restaurantName: 'مطعم ب',
                        restaurantWhatsapp: '+218222',
                });

                const s = useCart.getState();
                expect(s.items).toHaveLength(1);
                expect(s.items[0].itemId).toBe(2);
                expect(s.restaurantId).toBe(20);
                expect(s.restaurantWhatsapp).toBe('+218222'); // the handoff opens B's chat, not A's
                expect(s.restaurantName).toBe('مطعم ب');
                expect(s.customerName).toBe(''); // reset with the cart
        });

        it('same-restaurant setRestaurantDetails still refreshes (no false lock)', () => {
                useCart.getState().setRestaurantDetails(10, '+218111', 'مطعم أ');
                useCart.getState().addItem({ itemId: 1, name: 'شاي', price: 3, restaurantId: 10 });

                useCart.getState().setRestaurantDetails(10, '+218999', 'مطعم أ المحدّث');

                const s = useCart.getState();
                expect(s.restaurantWhatsapp).toBe('+218999');
                expect(s.restaurantName).toBe('مطعم أ المحدّث');
                expect(s.items).toHaveLength(1);
        });
});

// ═══════════════════════════════════════════════════════════════════════
// F1 — GET /api/items unscoped staff listing
// ═══════════════════════════════════════════════════════════════════════
describe('r103-F1 GET /api/items — staff unscoped listing', () => {
        it('super_admin without scope → 200 (admin console contract restored)', async () => {
                resetAuth('super_admin');
                const res = await itemsGET(req('http://localhost:3000/api/items?pageSize=5'));
                expect(res.status).toBe(200);
                expect(mockMenuItemFindMany).toHaveBeenCalled();
        });

        it('sub_admin without scope → 200', async () => {
                resetAuth('sub_admin', { permissions: ['MANAGE_RESTAURANTS'] });
                const res = await itemsGET(req('http://localhost:3000/api/items'));
                expect(res.status).toBe(200);
        });

        it('owner without scope → 400 (tenant boundary intact)', async () => {
                resetAuth('owner', { restaurantId: 7 });
                const res = await itemsGET(req('http://localhost:3000/api/items'));
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('معرف التصنيف أو المطعم مطلوب');
        });

        it('anonymous without scope → 400', async () => {
                resetAuth('USER', { authorized: false });
                const res = await itemsGET(req('http://localhost:3000/api/items'));
                expect(res.status).toBe(400);
        });

        it('staff unscoped query MAY use the status filter (canSeeAll)', async () => {
                resetAuth('admin');
                await itemsGET(req('http://localhost:3000/api/items?status=unavailable'));
                const arg = mockMenuItemFindMany.mock.calls[0][0];
                expect(arg.where.status).toBe('unavailable');
        });

        it('anonymous with status=unavailable cannot bypass (available only)', async () => {
                resetAuth('USER', { authorized: false });
                await itemsGET(req('http://localhost:3000/api/items?restaurantId=7&status=unavailable'));
                const arg = mockMenuItemFindMany.mock.calls[0][0];
                expect(arg.where.status).toBe('available');
        });
});

// ═══════════════════════════════════════════════════════════════════════
// F5a — reviews rating must be an integer
// ═══════════════════════════════════════════════════════════════════════
describe('r103-F5a POST reviews — rating .int()', () => {
        it('rating 4.5 → 422 validation (not a Prisma Int-column 400)', async () => {
                const res = await reviewsPOST(
                        jsonReq('http://localhost:3000/api/items/50/reviews', { rating: 4.5, comment: '', customerName: '', customerPhone: '' }),
                        { params: Promise.resolve({ id: '50' }) }
                );
                expect(res.status).toBe(422);
                expect(mockReviewDelete).not.toHaveBeenCalled();
        });

        it('rating 5 → passes validation', async () => {
                const res = await reviewsPOST(
                        jsonReq('http://localhost:3000/api/items/50/reviews', { rating: 5, comment: '', customerName: '', customerPhone: '' }),
                        { params: Promise.resolve({ id: '50' }) }
                );
                expect(res.status).not.toBe(422);
        });
});

// ═══════════════════════════════════════════════════════════════════════
// F5b — DELETE /api/items/[id]/reviews moderation
// ═══════════════════════════════════════════════════════════════════════
describe('r103-F5b DELETE reviews — owner moderation ladder', () => {
        it('owner of the item\'s restaurant → deletes, recomputes counters, revalidates', async () => {
                resetAuth('owner', { restaurantId: 7 });
                mockReviewDelete.mockResolvedValue({ id: 9, menuItemId: 50, rating: 1 });
                mockTransaction.mockImplementation(async (fn: (tx: typeof txMock) => unknown) => fn(txMock));

                const res = await reviewsDELETE(
                        req('http://localhost:3000/api/items/50/reviews?reviewId=9', { method: 'DELETE' }),
                        { params: Promise.resolve({ id: '50' }) }
                );

                expect(res.status).toBe(200);
                expect(mockReviewDelete).toHaveBeenCalledWith({
                        where: { id: 9 },
                        select: { id: true, menuItemId: true, rating: true },
                });
                expect(mockExecuteRaw).toHaveBeenCalledTimes(1); // set-based recompute
                const json = await res.json();
                expect(json.data.deleted).toBe(true);
        });

        it('review belonging to ANOTHER item → 404, transaction rolled back to null', async () => {
                resetAuth('owner', { restaurantId: 7 });
                mockReviewDelete.mockResolvedValue({ id: 9, menuItemId: 77, rating: 1 }); // different item
                mockTransaction.mockImplementation(async (fn: (tx: typeof txMock) => unknown) => fn(txMock));

                const res = await reviewsDELETE(
                        req('http://localhost:3000/api/items/50/reviews?reviewId=9', { method: 'DELETE' }),
                        { params: Promise.resolve({ id: '50' }) }
                );
                expect(res.status).toBe(404);
        });

        it('owner of a DIFFERENT restaurant (no UserRestaurant link) → 403', async () => {
                resetAuth('owner', { restaurantId: 99 });
                mockUserRestaurantFindUnique.mockResolvedValue(null);

                const res = await reviewsDELETE(
                        req('http://localhost:3000/api/items/50/reviews?reviewId=9', { method: 'DELETE' }),
                        { params: Promise.resolve({ id: '50' }) }
                );
                expect(res.status).toBe(403);
                expect(mockReviewDelete).not.toHaveBeenCalled();
        });

        it('sub_admin WITHOUT MANAGE_RESTAURANTS and without ownership link → 403', async () => {
                resetAuth('sub_admin', { permissions: [] });
                const res = await reviewsDELETE(
                        req('http://localhost:3000/api/items/50/reviews?reviewId=9', { method: 'DELETE' }),
                        { params: Promise.resolve({ id: '50' }) }
                );
                expect(res.status).toBe(403);
        });

        it('sub_admin WITH MANAGE_RESTAURANTS → allowed', async () => {
                resetAuth('sub_admin', { permissions: ['MANAGE_RESTAURANTS'] });
                mockReviewDelete.mockResolvedValue({ id: 9, menuItemId: 50, rating: 1 });
                mockTransaction.mockImplementation(async (fn: (tx: typeof txMock) => unknown) => fn(txMock));

                const res = await reviewsDELETE(
                        req('http://localhost:3000/api/items/50/reviews?reviewId=9', { method: 'DELETE' }),
                        { params: Promise.resolve({ id: '50' }) }
                );
                expect(res.status).toBe(200);
        });

        it('anonymous → 401', async () => {
                resetAuth('USER', { authorized: false });
                const res = await reviewsDELETE(
                        req('http://localhost:3000/api/items/50/reviews?reviewId=9', { method: 'DELETE' }),
                        { params: Promise.resolve({ id: '50' }) }
                );
                expect(res.status).toBe(401);
        });
});

// ═══════════════════════════════════════════════════════════════════════
// F3 — validate: own username is valid on the retry path
// ═══════════════════════════════════════════════════════════════════════
describe('r103-F3 POST /api/subscriptions/validate — own username', () => {
        it('username owned by the AUTHENTICATED user → valid (retry after rejection)', async () => {
                resetAuth('USER', { userId: 42, restaurantId: null });
                mockUserFindUnique.mockResolvedValue({ id: 42 });

                const res = await validatePOST(
                        jsonReq('http://localhost:3000/api/subscriptions/validate', { username: 'same_user', slugs: ['free-slug-1'] })
                );
                const json = await res.json();
                expect(json.data.valid).toBe(true);
                expect(json.data.errors?.username).toBeUndefined();
        });

        it('username owned by SOMEONE ELSE → still taken', async () => {
                resetAuth('USER', { userId: 42, restaurantId: null });
                mockUserFindUnique.mockResolvedValue({ id: 77 });

                const res = await validatePOST(
                        jsonReq('http://localhost:3000/api/subscriptions/validate', { username: 'other_user', slugs: ['free-slug-1'] })
                );
                const json = await res.json();
                expect(json.data.valid).toBe(false);
                expect(json.data.errors.username).toBe('اسم المستخدم مستخدم بالفعل');
        });
});

// ═══════════════════════════════════════════════════════════════════════
// F4 — public registration cannot snipe a pending-payment slug
// ═══════════════════════════════════════════════════════════════════════
describe('r103-F4 POST /api/restaurants — pending-payment slug reservation', () => {
        const publicBody = {
                restaurants: [{ name: 'مقهى جديد', slug: 'reserved-slug', description: '', phone: '', whatsapp: '' }],
                username: 'new_user_1',
                password: 'password123',
        };

        it('slug held by a PENDING payment → 409 before any write', async () => {
                mockSubscriptionPaymentFindFirst.mockResolvedValue({ id: 9001 });

                const res = await restaurantsPOST(jsonReq('http://localhost:3000/api/restaurants', publicBody));

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toContain('محجوز بطلب دفع معلق');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('no pending payment → proceeds past the reservation check', async () => {
                mockSubscriptionPaymentFindFirst.mockResolvedValue(null);
                mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
                        fn({
                                restaurant: {
                                        findUnique: vi.fn(async () => null),
                                        create: vi.fn(async () => ({ id: 1, name: 'مقهى جديد', slug: 'reserved-slug' })),
                                },
                                menuCategory: { createMany: vi.fn(async () => ({ count: 4 })) },
                                user: {
                                        create: vi.fn(async () => ({ id: 2 })),
                                        findUniqueOrThrow: vi.fn(async () => ({ id: 2 })),
                                },
                                userRestaurant: { create: vi.fn(async () => ({})) },
                        })
                );

                const res = await restaurantsPOST(jsonReq('http://localhost:3000/api/restaurants', publicBody));

                expect(res.status).not.toBe(409);
                expect(mockSubscriptionPaymentFindFirst).toHaveBeenCalled();
        });
});
