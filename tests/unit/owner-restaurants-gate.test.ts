/**
 * round90-F1 — S-1 regression lock: POST /api/owner/restaurants role gate.
 *
 * The security-specialist finding (g90-D2 S-1, CRITICAL): POST had NO role
 * gate — any USER account passed requireAuth + the subscription guard and
 * created a live restaurant (isActive:true) at the BLIND schema caps
 * (50 items / 500 orders = 5× the advertised free tier) with zero audit and
 * zero operator notification.
 *
 * This suite locks the four fixes:
 *   1. USER → 403 before any DB work (the categories round86-A1 gate shape:
 *      owner passes, non-owner needs MANAGE_RESTAURANTS).
 *   2. owner happy path → 201 with EXPLICIT free-tier caps (round87-A6
 *      freeCaps — the row no longer inherits 50/500 schema defaults) and
 *      logAudit + notifyEvent fired (the creation is finally visible).
 *   3. zod .max bounds (dx-2 ب-3): name>200 → 422 at the schema gate.
 *   4. the menus counter is serialized: SELECT ... FOR UPDATE on the user row
 *      runs INSIDE the transaction BEFORE the count (R-1/T1 atomicity).
 *
 * Mock pattern: plan-limit.test.ts (tx-mock prisma + mocked auth ladder +
 * mocked audit/telegram) — no real DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner',
                restaurantId: 1 as number | null,
                userId: 10,
                permissions: [] as string[],
        },
}));

// the role-gate's second rung (non-owner → MANAGE_RESTAURANTS) — same shape
// requirePermission returns in @/lib/auth
const permHolder = vi.hoisted(() => ({
        value: { authorized: true, role: 'sub_admin', userId: 4, error: '', status: 200 },
}));

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSlugFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: 0, failed: [] }));

const txMock = vi.hoisted(() => ({
        $queryRaw: vi.fn(),
        userRestaurant: { count: vi.fn(), create: vi.fn() },
        subscriptionPlan: { findFirst: vi.fn() },
        restaurant: { create: vi.fn() },
        menuCategory: { createMany: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique },
        restaurant: { findUnique: mockSlugFindUnique },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => authHolder.value),
        requirePermission: vi.fn(async () => permHolder.value),
}));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent }));

// ── Fixtures ────────────────────────────────────────────────────────────

const MENU_BODY = { name: 'مطعم جديد', slug: 'new-menu', description: 'قهوة', phone: '', whatsapp: '' };

const CREATED = { id: 55, name: 'مطعم جديد', slug: 'new-menu', planId: null };

async function postMenu(body: unknown, role = 'owner') {
        const { POST } = await import('@/app/api/owner/restaurants/route');
        authHolder.value.role = role;
        return POST(
                new NextRequest('http://localhost/api/owner/restaurants', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                })
        );
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 10, permissions: [] };
        permHolder.value = { authorized: true, role: 'sub_admin', userId: 4, error: '', status: 200 };
        mockTransaction.mockImplementation(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));
        // default owner: no plan row → free-tier caps path
        mockUserFindUnique.mockResolvedValue({ id: 10, planId: null, plan: null });
        mockSlugFindUnique.mockResolvedValue(null);
        txMock.userRestaurant.count.mockResolvedValue(0);
        txMock.userRestaurant.create.mockResolvedValue({});
        // no free-plan row in the table → hard fallback 10/100
        txMock.subscriptionPlan.findFirst.mockResolvedValue(null);
        txMock.restaurant.create.mockResolvedValue({ ...CREATED });
        txMock.menuCategory.createMany.mockResolvedValue({ count: 4 });
});

// ── S-1: the role gate ──────────────────────────────────────────────────

describe('POST /api/owner/restaurants — S-1 role gate', () => {
        it('USER → 403 (no MANAGE_RESTAURANTS), zero DB work — the authorization bypass is closed', async () => {
                permHolder.value = { authorized: false, role: 'USER', userId: 55, error: 'لا تملك الصلاحية', status: 403 };

                const res = await postMenu(MENU_BODY, 'USER');

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لا تملك الصلاحية');
                // gate fires before the body is even parsed/queried
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.restaurant.create).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('sub_admin WITH MANAGE_RESTAURANTS → 201 (the permission path the gate allows)', async () => {
                const res = await postMenu(MENU_BODY, 'sub_admin');

                expect(res.status).toBe(201);
                expect(txMock.restaurant.create).toHaveBeenCalledTimes(1);
        });
});

// ── S-1 × round87-A6: explicit free caps + audit/notify ─────────────────

describe('POST /api/owner/restaurants — freeCaps + audit + notify', () => {
        it('owner with NO plan → row created at the free-tier caps (10/100), not the schema defaults (50/500)', async () => {
                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(201);
                const createArg = txMock.restaurant.create.mock.calls[0][0];
                expect(createArg.data.maxItems).toBe(10);
                expect(createArg.data.maxOrders).toBe(100);
                expect(createArg.data.isActive).toBe(true);
        });

        it('a configured price-0 plan row overrides the hard fallback caps', async () => {
                txMock.subscriptionPlan.findFirst.mockResolvedValue({ maxItems: 12, maxOrders: 120 });

                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(201);
                const createArg = txMock.restaurant.create.mock.calls[0][0];
                expect(createArg.data.maxItems).toBe(12);
                expect(createArg.data.maxOrders).toBe(120);
        });

        it('owner WITH a linked plan → the plan row is the caps source', async () => {
                mockUserFindUnique.mockResolvedValue({
                        id: 10,
                        planId: 3,
                        plan: { maxMenus: 2, maxItems: 30, maxOrders: 300, nameAr: 'احترافية' },
                });

                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(201);
                const createArg = txMock.restaurant.create.mock.calls[0][0];
                expect(createArg.data.maxItems).toBe(30);
                expect(createArg.data.maxOrders).toBe(300);
                // plan row present → the free-plan lookup is never even issued
                expect(txMock.subscriptionPlan.findFirst).not.toHaveBeenCalled();
        });

        it('logAudit(create/restaurant) + notifyEvent(restaurant_created) fire on success — the creation is no longer invisible', async () => {
                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(201);
                expect(mockLogAudit).toHaveBeenCalledWith({
                        action: 'create',
                        targetType: 'restaurant',
                        targetId: 55,
                        actorId: 10,
                });
                expect(mockNotifyEvent).toHaveBeenCalledWith(
                        'restaurant_created',
                        { name: 'مطعم جديد', slug: 'new-menu', plan: 'free' },
                        { adminOnly: true }
                );
        });

        it('audit/notify failures never fail the response (best-effort contract)', async () => {
                mockLogAudit.mockRejectedValue(new Error('audit down'));
                mockNotifyEvent.mockRejectedValue(new Error('telegram down'));

                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(201);
        });
});

// ── dx-2 ب-3: zod bounds ────────────────────────────────────────────────

describe('POST /api/owner/restaurants — schema bounds', () => {
        it('name over 200 chars → 422 validation envelope, zero DB work', async () => {
                const res = await postMenu({ ...MENU_BODY, name: 'x'.repeat(201) });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('slug over 100 chars → 422', async () => {
                const res = await postMenu({ ...MENU_BODY, slug: 's'.repeat(101) });

                expect(res.status).toBe(422);
        });

        it('description over 1000 chars → 422', async () => {
                const res = await postMenu({ ...MENU_BODY, description: 'd'.repeat(1001) });

                expect(res.status).toBe(422);
        });
});

// ── R-1/T1: the atomic menus counter ────────────────────────────────────

describe('POST /api/owner/restaurants — atomic menus counter (FOR UPDATE)', () => {
        it('the user row is locked FOR UPDATE INSIDE the tx BEFORE the count (count-then-create serialized)', async () => {
                await postMenu(MENU_BODY);

                expect(mockTransaction).toHaveBeenCalledTimes(1);
                expect(txMock.$queryRaw).toHaveBeenCalledTimes(1);
                const sql = String(txMock.$queryRaw.mock.calls[0][0]);
                expect(sql).toContain('FOR UPDATE');
                expect(sql).toContain('"User"');
                // the lock is the FIRST statement of the critical section
                expect(txMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
                        txMock.userRestaurant.count.mock.invocationCallOrder[0]
                );
        });

        it('count at maxMenus → 403 plan-cap message, create skipped (existing behavior preserved)', async () => {
                mockUserFindUnique.mockResolvedValue({
                        id: 10,
                        planId: null,
                        plan: { maxMenus: 2, maxItems: 10, maxOrders: 100, nameAr: 'أساسية' },
                });
                txMock.userRestaurant.count.mockResolvedValue(2);

                const res = await postMenu(MENU_BODY);

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للمنيوهات (2) في خطة «أساسية». قم بترقية خطتك لإضافة المزيد.'
                );
                expect(txMock.restaurant.create).not.toHaveBeenCalled();
                // nothing was created → no audit, no notify
                expect(mockLogAudit).not.toHaveBeenCalled();
                expect(mockNotifyEvent).not.toHaveBeenCalled();
        });
});
