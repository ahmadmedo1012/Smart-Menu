/**
 * Round89-D2 (D2-3) — unit coverage for the four admin API routes that sat
 * at 0% lcov: admin/stats, admin/config, admin/profile,
 * admin/notification-preferences.
 *
 * Standard mock pattern (orders-create.test.ts): vi.hoisted prisma + mocked
 * @/lib/session so the REAL requirePermission ladder in @/lib/auth runs —
 * the RBAC cells (guest 401 / USER 403 / sub_admin permission match) are
 * what is under test, not a stubbed envelope.
 *
 * Caching choice (documented per the task): Next's unstable_cache cannot run
 * in a bare vitest process (no request/work store), so next/cache is mocked
 * with a single-entry memoizing wrapper that (a) records the wiring the route
 * passes to unstable_cache (keyParts + TTL + tags) and (b) simulates the data
 * cache: the underlying query function runs only while the entry is cold.
 * That lets us prove the round89-C1 contract — two consecutive GETs answer
 * from one execution, and an unauthorized caller never populates or reads the
 * shared entry (requirePermission stays OUTSIDE the cached scope).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserCount = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockRestaurantCount = vi.hoisted(() => vi.fn());
const mockRestaurantGroupBy = vi.hoisted(() => vi.fn());
const mockRestaurantFindMany = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockOrderAggregate = vi.hoisted(() => vi.fn());
const mockOrderGroupBy = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockPlanFindMany = vi.hoisted(() => vi.fn());
const mockSystemEventFindMany = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockSystemConfigFindMany = vi.hoisted(() => vi.fn());
const mockSystemConfigFindUnique = vi.hoisted(() => vi.fn());
const mockSystemConfigUpsert = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockSessionDeleteMany = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockEncryptValue = vi.hoisted(() => vi.fn());
const mockVerifyHash = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        user: {
                count: mockUserCount,
                findMany: mockUserFindMany,
                findUnique: mockUserFindUnique,
                update: mockUserUpdate,
        },
        restaurant: {
                count: mockRestaurantCount,
                groupBy: mockRestaurantGroupBy,
                findMany: mockRestaurantFindMany,
        },
        order: {
                count: mockOrderCount,
                aggregate: mockOrderAggregate,
                groupBy: mockOrderGroupBy,
        },
        orderItem: { groupBy: mockOrderItemGroupBy },
        subscriptionPlan: { findMany: mockPlanFindMany },
        systemEvent: { findMany: mockSystemEventFindMany },
        menuItem: { findMany: mockMenuItemFindMany },
        systemConfig: { findMany: mockSystemConfigFindMany, findUnique: mockSystemConfigFindUnique },
        session: { deleteMany: mockSessionDeleteMany },
        $queryRaw: mockQueryRaw,
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn((fn: () => unknown) => fn()) }));

// REAL @/lib/auth runs — only its session dependency is stubbed.
const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

// module-level limiters (pattern of every existing suite) — these admin
// routes import no limiter today, but the mock keeps the pattern if one is
// added later.
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 99, reset: 0 })),
                destroy: () => {},
        }),
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/config', () => ({ encryptValue: mockEncryptValue }));
// real PBKDF2 costs ~290ms per call — profile PUT is about route logic here,
// not the hash function (covered by restaurant-password/session suites).
vi.mock('@/lib/hash', () => ({ verifyHash: mockVerifyHash, hashPassword: mockHashPassword, needsRehash: vi.fn(() => false) }));

// next/cache: see the header — single-entry memoizing stand-in for
// unstable_cache + a revalidateTag spy (admin/config PUT calls it).
const nextCacheState = vi.hoisted(() => ({
        calls: [] as Array<{ keyParts: unknown; opts: unknown }>,
        dataFn: vi.fn(),
        store: { has: false, value: undefined as unknown },
}));
const mockRevalidateTag = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({
        unstable_cache: (fn: (...a: unknown[]) => Promise<unknown>, keyParts: unknown, opts: unknown) => {
                nextCacheState.calls.push({ keyParts, opts });
                return async (...args: unknown[]) => {
                        if (!nextCacheState.store.has) {
                                nextCacheState.dataFn();
                                nextCacheState.store.value = await fn(...args);
                                nextCacheState.store.has = true;
                        }
                        return nextCacheState.store.value;
                };
        },
        revalidateTag: mockRevalidateTag,
}));

// ── Route modules (imported once — unstable_cache wiring captured) ──────

const statsRoute = await import('@/app/api/admin/stats/route');
const configRoute = await import('@/app/api/admin/config/route');
const profileRoute = await import('@/app/api/admin/profile/route');
const notifRoute = await import('@/app/api/admin/notification-preferences/route');
// snapshot of what the stats route passed to unstable_cache at module scope
const statsCacheWiring = nextCacheState.calls[0];

// ── Personas (session.user shapes fed to the REAL requirePermission) ────

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
const USER_PLAIN = persona({ id: 55, role: 'USER' });
const OWNER = persona({ id: 10, role: 'owner', restaurantId: 1 });
const SUB_ADMIN_ES = persona({ id: 5, role: 'sub_admin', permissions: ['EDIT_SETTINGS'] });
const SUB_ADMIN_VA = persona({ id: 4, role: 'sub_admin', permissions: ['VIEW_ANALYTICS'] });
const ADMIN = persona({ id: 1, role: 'admin' });

const setSession = (user: Persona | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST,
        );
};

function putRequest(url: string, body: unknown): NextRequest {
        return new NextRequest(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
        });
}

// ── Fixtures / defaults (admin/stats happy path) ────────────────────────

const SIGNUP_ROW = {
        id: 21, name: 'مطعم النخيل', slug: 'nakheel', createdAt: new Date('2026-09-01T10:00:00Z'),
        users: [{ id: 21, name: 'مالك', username: 'nakheel_owner' }],
};
const LOGIN_ROW = {
        id: 21, name: 'مالك', username: 'nakheel_owner', lastLoginAt: new Date('2026-09-05T09:00:00Z'),
        restaurant: { id: 7, name: 'al-waha-cafe' },
};
const TOP_REST_DETAIL = { id: 7, name: 'al-waha-cafe', isActive: true, slug: 'al-waha-cafe' };

beforeEach(() => {
        vi.clearAllMocks();
        setSession(ADMIN);
        // cold cache for every test — the wiring snapshot above stays untouched
        nextCacheState.store.has = false;
        nextCacheState.store.value = undefined;

        mockUserCount.mockImplementation(async (args?: { where?: { createdAt?: { gte?: Date; lt?: Date } } }) => {
                if (!args?.where) return 100; // platform total
                if (args.where.createdAt?.lt) return 50; // previous 30d window
                return 60; // current 30d window
        });
        mockRestaurantCount.mockImplementation(
                async (args?: { where?: { planId?: unknown; createdAt?: { lt?: Date } } }) => {
                        if (args?.where?.planId !== undefined) return 6; // linked to a plan
                        if (args?.where?.createdAt?.lt) return 1; // previous month
                        if (args?.where?.createdAt) return 3; // current month
                        return 10; // platform total
                },
        );
        mockOrderCount.mockResolvedValue(500);
        mockPlanFindMany.mockResolvedValue([
                { id: 1, price: 0 }, // free plan
                { id: 2, price: 10 }, // paid plan
        ]);
        mockRestaurantGroupBy.mockResolvedValue([
                { planId: 1, _count: { _all: 4 } },
                { planId: 2, _count: { _all: 2 } },
        ]);
        mockRestaurantFindMany.mockImplementation(
                async (args: { where?: unknown }) => (args?.where ? [TOP_REST_DETAIL] : [SIGNUP_ROW]),
        );
        mockUserFindMany.mockResolvedValue([LOGIN_ROW]);
        mockOrderAggregate.mockImplementation(async (args: { _count?: boolean; where?: { createdAt?: { lt?: Date } } }) => {
                if (args?._count) return { _count: 5, _sum: { total: 250 } }; // today
                if (args?.where?.createdAt?.lt) return { _avg: { total: 40 } }; // prev AOV
                return { _avg: { total: 50 } }; // current AOV
        });
        mockOrderGroupBy.mockResolvedValue([{ restaurantId: 7, _count: { id: 30 } }]);
        mockOrderItemGroupBy.mockResolvedValue([{ itemId: 9, _sum: { quantity: 42 } }]);
        mockSystemEventFindMany.mockResolvedValue([
                { id: 1, eventType: 'order', title: 'طلب جديد', message: '', severity: 'info', createdAt: new Date(), read: false },
        ]);
        mockMenuItemFindMany.mockResolvedValue([{ id: 9, name: 'Latte', nameAr: 'لاتيه' }]);
        mockQueryRaw.mockImplementation(async (strings: TemplateStringsArray | string[]) => {
                // two raw trends: revenue (SUM) and volume (COUNT) — keyed by SQL text
                if (String(strings[0]).includes('SUM(total)')) return [{ date: '2026-09-01', revenue: '120.5' }];
                return [{ date: '2026-09-01', count: 7n }];
        });

        // config / profile / notif defaults
        mockSystemConfigFindMany.mockResolvedValue([
                { id: 1, key: 'public.key', value: 'v', category: 'general', isSecret: false, description: '', updatedAt: new Date(), updatedBy: null },
                { id: 2, key: 'secret.key', value: 'ENC(blob)', category: 'general', isSecret: true, description: '', updatedAt: new Date(), updatedBy: null },
        ]);
        mockSystemConfigFindUnique.mockResolvedValue(null);
        mockSystemConfigUpsert.mockResolvedValue({
                id: 5, key: 'site.name', category: 'ui', isSecret: false, description: 'd', updatedAt: new Date(),
        });
        mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({ systemConfig: { upsert: mockSystemConfigUpsert } }),
        );
        mockUserFindUnique.mockResolvedValue(null);
        mockUserUpdate.mockResolvedValue({});
        mockSessionDeleteMany.mockResolvedValue(2);
        mockEncryptValue.mockResolvedValue('ENC(secret)');
        mockVerifyHash.mockReturnValue(true);
        mockHashPassword.mockReturnValue('NEWHASH');
        mockLogAudit.mockResolvedValue(undefined);
});

// ── GET /api/admin/stats — RBAC (real requirePermission ladder) ─────────

describe('GET /api/admin/stats — RBAC', () => {
        it('guest (no session) → 401, zero cache population and zero prisma work', async () => {
                setSession(null);
                const res = await statsRoute.GET();
                expect(res.status).toBe(401);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('غير مصرح');
                // requirePermission stays OUTSIDE unstable_cache: an unauthorized
                // first caller never populates the shared cache and never queries.
                expect(nextCacheState.dataFn).not.toHaveBeenCalled();
                expect(mockUserCount).not.toHaveBeenCalled();
        });

        it('USER role → 403 (no VIEW_ANALYTICS), zero cache population', async () => {
                setSession(USER_PLAIN);
                const res = await statsRoute.GET();
                expect(res.status).toBe(403);
                expect(nextCacheState.dataFn).not.toHaveBeenCalled();
        });

        it('owner → 403 (admin surface), zero cache population', async () => {
                setSession(OWNER);
                const res = await statsRoute.GET();
                expect(res.status).toBe(403);
                expect(nextCacheState.dataFn).not.toHaveBeenCalled();
        });

        it('sub_admin WITHOUT the permission → 403 even after the cache is warm', async () => {
                // warm the (mocked) data cache as an authorized caller first
                setSession(SUB_ADMIN_VA);
                await statsRoute.GET();
                expect(nextCacheState.dataFn).toHaveBeenCalledTimes(1);

                setSession(SUB_ADMIN_ES); // has EDIT_SETTINGS, not VIEW_ANALYTICS
                const res = await statsRoute.GET();
                expect(res.status).toBe(403);
                // 403 responses are never served from / never touch the shared cache
                expect(nextCacheState.dataFn).toHaveBeenCalledTimes(1);
        });
});

// ── GET /api/admin/stats — round89-C1 cache contract ────────────────────

describe('GET /api/admin/stats — round89-C1 unstable_cache wiring', () => {
        it('the data fetch is registered through unstable_cache with keyParts ["admin-stats"], 60s TTL and the admin-stats tag', () => {
                // captured at module scope (the route registers it once at import)
                expect(statsCacheWiring).toBeDefined();
                expect(statsCacheWiring!.keyParts).toEqual(['admin-stats']);
                expect(statsCacheWiring!.opts).toEqual({ revalidate: 60, tags: ['admin-stats'] });
        });

        it('two consecutive GETs with identical inputs answer from ONE underlying execution (data cache hit)', async () => {
                setSession(SUB_ADMIN_VA);
                const first = await statsRoute.GET();
                const second = await statsRoute.GET();

                expect(first.status).toBe(200);
                expect(second.status).toBe(200);
                // the memoizing stand-in proves the route serves the second call from
                // the cached entry: the prisma-backed function ran exactly once
                expect(nextCacheState.dataFn).toHaveBeenCalledTimes(1);
                const a = await first.json();
                const b = await second.json();
                expect(b).toEqual(a);
        });
});

// ── GET /api/admin/stats — happy path values (post C-4 groupBy counts) ──

describe('GET /api/admin/stats — payload', () => {
        it('success envelope with the platform-wide counters', async () => {
                setSession(SUB_ADMIN_VA);
                const res = await statsRoute.GET();
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.totalUsers).toBe(100);
                expect(json.data.totalRestaurants).toBe(10);
                expect(json.data.totalOrders).toBe(500);
                expect(json.data.linkedRestaurants).toBe(6);
                // C-4: plan counts come from one grouped count, not embedded rows —
                // free = unlinked (10-6) + restaurants on the price-0 plan (4) = 8
                expect(json.data.freePlanCount).toBe(8);
                expect(json.data.paidPlanCount).toBe(2);
                expect(json.data.monthlyRevenue).toBe(20);
        });

        it('computed fields: growth pct, AOV, orders-today and hydrated top rows', async () => {
                setSession(SUB_ADMIN_VA);
                const json = await (await statsRoute.GET()).json();
                expect(json.data.ordersToday).toEqual({ count: 5, revenue: 250 });
                expect(json.data.userGrowthPct).toBe(20); // (60-50)/50
                expect(json.data.restaurantGrowthPct).toBe(200); // (3-1)/1
                expect(json.data.avgOrderValue).toBe(50);
                expect(json.data.avgOrderValuePrev).toBe(40);
                // top restaurants hydrate via the second wave query
                expect(json.data.topRestaurants).toEqual([{ restaurant: TOP_REST_DETAIL, orderCount: 30 }]);
                // nameAr-fallback hydration mode for top items
                expect(json.data.topItems).toEqual([{ itemId: 9, name: 'لاتيه', totalSold: 42 }]);
        });

        it('raw trends are number-coerced (bigint/decimal from postgres)', async () => {
                setSession(SUB_ADMIN_VA);
                const json = await (await statsRoute.GET()).json();
                expect(json.data.revenueTrend).toEqual([{ date: '2026-09-01', revenue: 120.5 }]);
                expect(json.data.orderVolumeTrend).toEqual([{ date: '2026-09-01', count: 7 }]);
        });
});

// ── /api/admin/config — RBAC + masking ─────────────────────────────────

describe('/api/admin/config — RBAC', () => {
        it('GET as guest → 401 before any query', async () => {
                setSession(null);
                const res = await configRoute.GET();
                expect(res.status).toBe(401);
                expect(mockSystemConfigFindMany).not.toHaveBeenCalled();
        });

        it('GET as USER → 403 (EDIT_SETTINGS required)', async () => {
                setSession(USER_PLAIN);
                const res = await configRoute.GET();
                expect(res.status).toBe(403);
                expect(mockSystemConfigFindMany).not.toHaveBeenCalled();
        });

        it('GET as sub_admin WITH EDIT_SETTINGS → 200, secret rows masked, public rows passthrough', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await configRoute.GET();
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toHaveLength(2);
                expect(json.data[0]).toMatchObject({ key: 'public.key', value: 'v' });
                expect(json.data[1]).toMatchObject({ key: 'secret.key', value: '••••••••' });
                // ordered by category then key (admin settings table grouping)
                expect(mockSystemConfigFindMany).toHaveBeenCalledWith(
                        expect.objectContaining({ orderBy: [{ category: 'asc' }, { key: 'asc' }] }),
                );
        });
});

describe('PUT /api/admin/config', () => {
        const put = (body: unknown) => configRoute.PUT(putRequest('http://localhost/api/admin/config', body));

        it('happy path: upsert inside a transaction + audit + revalidateTag, value masked in response', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await put({ key: 'site.name', value: 'Smart', category: 'ui', description: 'd' });
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.value).toBe('••••••••'); // never echo the stored value

                expect(mockSystemConfigUpsert).toHaveBeenCalledTimes(1);
                const arg = mockSystemConfigUpsert.mock.calls[0][0];
                expect(arg.where).toEqual({ key: 'site.name' });
                expect(arg.create).toMatchObject({ key: 'site.name', value: 'Smart', category: 'ui', updatedBy: 5 });
                expect(arg.update).toMatchObject({ value: 'Smart', category: 'ui' });
                // plain (non-secret) value is stored as-is — no encryption
                expect(mockEncryptValue).not.toHaveBeenCalled();
                expect(mockRevalidateTag).toHaveBeenCalledWith('system-config', { expire: 60 });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({ action: 'update', targetType: 'SystemConfig', actorId: 5 }),
                );
        });

        it('isSecret:true → the value is encrypted at rest before upsert', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await put({ key: 'telegram.token', value: '123:ABC', isSecret: true });
                expect(res.status).toBe(200);
                expect(mockEncryptValue).toHaveBeenCalledWith('123:ABC');
                const arg = mockSystemConfigUpsert.mock.calls[0][0];
                expect(arg.create.value).toBe('ENC(secret)');
        });

        it('masked placeholder value means "unchanged" — existing row returned, nothing written', async () => {
                setSession(SUB_ADMIN_ES);
                mockSystemConfigFindUnique.mockResolvedValue({
                        id: 9, key: 'telegram.token', value: 'ENC(real)', category: 'tg', isSecret: true,
                        description: '', updatedAt: new Date(), updatedBy: null,
                });
                const res = await put({ key: 'telegram.token', value: '••••••••', isSecret: true });
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toMatchObject({ key: 'telegram.token', value: '••••••••' });
                // the bullets must never overwrite the stored secret
                expect(mockSystemConfigUpsert).not.toHaveBeenCalled();
                expect(mockEncryptValue).not.toHaveBeenCalled();
        });

        it('oversized serialized value → 422 before any DB work (round87-A10)', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await put({ key: 'big', value: 'x'.repeat(20_001) });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('قيمة الإعداد كبيرة جداً (الحد 20 ألف حرف)');
                expect(mockSystemConfigFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});

// ── /api/admin/profile ─────────────────────────────────────────────────

describe('/api/admin/profile', () => {
        it('GET as guest → 401; GET as USER → 403', async () => {
                setSession(null);
                expect((await profileRoute.GET()).status).toBe(401);
                setSession(USER_PLAIN);
                expect((await profileRoute.GET()).status).toBe(403);
                expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        it('GET happy path → own profile shape with telegramLinked derived', async () => {
                setSession(SUB_ADMIN_ES);
                mockUserFindUnique.mockResolvedValue({
                        name: 'سالم', username: 'sub1', role: 'sub_admin', permissions: ['EDIT_SETTINGS'],
                        telegramChatId: null, telegramUsername: 'salem_tg',
                });
                const res = await profileRoute.GET();
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toEqual({
                        name: 'سالم', username: 'sub1', role: 'sub_admin', permissions: ['EDIT_SETTINGS'],
                        telegramLinked: false, telegramUsername: 'salem_tg',
                });
                expect(mockUserFindUnique).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 5 } }),
                );
        });

        const putProfile = (body: unknown) =>
                profileRoute.PUT(putRequest('http://localhost/api/admin/profile', body));

        it('PUT name only → update scoped to the session user, no password/session work', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await putProfile({ name: 'الاسم الجديد' });
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toEqual({ updated: true });
                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: 5 },
                        data: { name: 'الاسم الجديد' }, // only the provided field
                });
                expect(mockHashPassword).not.toHaveBeenCalled();
                expect(mockSessionDeleteMany).not.toHaveBeenCalled();
        });

        it('PUT password change → verified, rehashed, other sessions revoked', async () => {
                setSession(SUB_ADMIN_ES);
                mockUserFindUnique.mockResolvedValue({ password: 'stored:hash' });
                const res = await putProfile({ currentPassword: 'oldpass123', newPassword: 'newpass123' });
                expect(res.status).toBe(200);
                expect(mockVerifyHash).toHaveBeenCalledWith('oldpass123', 'stored:hash');
                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: 5 },
                        data: { password: 'NEWHASH' },
                });
                // no session cookie on the request → every session is revoked
                expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 5 } });
        });

        it('PUT wrong current password → 400, update skipped', async () => {
                setSession(SUB_ADMIN_ES);
                mockUserFindUnique.mockResolvedValue({ password: 'stored:hash' });
                mockVerifyHash.mockReturnValue(false);
                const res = await putProfile({ currentPassword: 'wrongpass1', newPassword: 'newpass123' });
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('كلمة المرور الحالية غير صحيحة');
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('PUT newPassword without currentPassword → 422 validation (pair rule)', async () => {
                setSession(SUB_ADMIN_ES);
                const res = await putProfile({ newPassword: 'newpass123' });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });
});

// ── /api/admin/notification-preferences ─────────────────────────────────

describe('/api/admin/notification-preferences', () => {
        it('GET as guest → 401; GET as USER → 403', async () => {
                setSession(null);
                expect((await notifRoute.GET()).status).toBe(401);
                setSession(USER_PLAIN);
                expect((await notifRoute.GET()).status).toBe(403);
                expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        it('GET with no stored prefs → the flat defaults derived from defaultMatrix()', async () => {
                setSession(SUB_ADMIN_ES);
                mockUserFindUnique.mockResolvedValue({ notificationPrefs: null });
                const res = await notifRoute.GET();
                expect(res.status).toBe(200);
                const json = await res.json();
                // note: defaultMatrix() enables settings_change.telegram (true) even
                // though the legacy User.telegramNotifySettings column defaults to
                // false — locked here as the CURRENT behavior, not an endorsement.
                expect(json.data).toEqual({
                        telegramNotifyOrders: true,
                        telegramNotifyPayments: true,
                        telegramNotifySettings: true,
                });
        });

        it('GET with a stored matrix → flat booleans derived from the events map', async () => {
                setSession(SUB_ADMIN_ES);
                mockUserFindUnique.mockResolvedValue({
                        notificationPrefs: {
                                channels: { in_app: true, telegram: false, system_log: true },
                                events: {
                                        new_order: { telegram: false },
                                        payment: { telegram: true },
                                        settings_change: { telegram: true },
                                },
                        },
                });
                const json = await (await notifRoute.GET()).json();
                expect(json.data).toEqual({
                        telegramNotifyOrders: false,
                        telegramNotifyPayments: true,
                        telegramNotifySettings: true,
                });
        });

        it('PUT happy path → matrix built from the flat toggles and persisted with the legacy columns', async () => {
                setSession(SUB_ADMIN_ES);
                mockUserUpdate.mockResolvedValue({
                        telegramNotifyOrders: true, telegramNotifyPayments: false, telegramNotifySettings: true,
                });
                const res = await notifRoute.PUT(
                        putRequest('http://localhost/api/admin/notification-preferences', {
                                telegramNotifyOrders: true, telegramNotifyPayments: false, telegramNotifySettings: true,
                        }),
                );
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toEqual({
                        telegramNotifyOrders: true, telegramNotifyPayments: false, telegramNotifySettings: true,
                });
                const arg = mockUserUpdate.mock.calls[0][0];
                expect(arg.where).toEqual({ id: 5 });
                // matrixFromFlat: telegram channel off, per-event flags from the body
                expect(arg.data.notificationPrefs.channels).toEqual({ in_app: true, telegram: false, system_log: true });
                expect(arg.data.notificationPrefs.events.new_order.telegram).toBe(true);
                expect(arg.data.notificationPrefs.events.payment.telegram).toBe(false);
                expect(arg.data.notificationPrefs.events.settings_change.telegram).toBe(true);
                // the three flat columns stay in sync for legacy consumers
                expect(arg.data).toMatchObject({
                        telegramNotifyOrders: true, telegramNotifyPayments: false, telegramNotifySettings: true,
                });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({ targetType: 'User', targetId: 5 }),
                );
        });
});
