/**
 * Round88-B1 — RBAC authorization matrix, executed as unit tests.
 *
 * The matrix itself is documented first (docs/security/rbac-matrix-round88.md);
 * this file locks the critical cells of that matrix to real behavior. Unlike
 * orders-list/stats-permission (which stub @/lib/auth), these tests run the
 * REAL requireAuth/requirePermission logic — only @/lib/session (validateSession)
 * and @/lib/db (prisma rows) are mocked, so the role ladder in src/lib/auth.ts
 * (super_admin pass / admin legacy-trust minus MANAGE_USERS / sub_admin
 * permission match / everything else 403) is what is actually under test.
 *
 * Sampled families: item writes, category writes, user management, admin
 * surfaces (audit-logs, admins, system-events, reset-password), restaurant
 * updates (restricted vs full schema), and tenant settings reads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemUpdate = vi.hoisted(() => vi.fn());
const mockMenuCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockMenuCategoryUpdate = vi.hoisted(() => vi.fn());
// round89-C3: GET /api/settings now counts orders/categories via the
// list-counts helpers (restaurant.groupBy → prisma.order.groupBy /
// prisma.menuCategory.groupBy) instead of the `_count` include — the mock
// prisma needs the two grouped-count calls (defaults: empty lists → 0).
const mockOrderGroupBy = vi.hoisted(() => vi.fn());
const mockMenuCategoryGroupBy = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserCount = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockAuditLogFindMany = vi.hoisted(() => vi.fn());
const mockAuditLogCount = vi.hoisted(() => vi.fn());
const mockSystemEventFindMany = vi.hoisted(() => vi.fn());
const mockSystemEventCount = vi.hoisted(() => vi.fn());
const mockSettingFindMany = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantUpdate = vi.hoisted(() => vi.fn());
const mockSessionDeleteMany = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        menuItem: { findUnique: mockMenuItemFindUnique, update: mockMenuItemUpdate },
        menuCategory: { findUnique: mockMenuCategoryFindUnique, update: mockMenuCategoryUpdate, groupBy: mockMenuCategoryGroupBy },
        order: { groupBy: mockOrderGroupBy },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        user: { findMany: mockUserFindMany, findUnique: mockUserFindUnique, count: mockUserCount, update: mockUserUpdate },
        auditLog: { findMany: mockAuditLogFindMany, count: mockAuditLogCount },
        systemEvent: { findMany: mockSystemEventFindMany, count: mockSystemEventCount },
        setting: { findMany: mockSettingFindMany },
        restaurant: { findUnique: mockRestaurantFindUnique, update: mockRestaurantUpdate },
        session: { deleteMany: mockSessionDeleteMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn() }));

// The REAL @/lib/auth runs — only its session dependency is stubbed.
const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

// Module-level limiters (audit-logs, reset-password) — stubbed like every
// existing unit suite.
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 99, reset: 0 })),
                destroy: () => {},
        }),
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: vi.fn(async () => {}) }));
vi.mock('@/lib/blob', () => ({
        deleteBlob: vi.fn(),
        mediaUrlError: vi.fn(() => null),
}));

// ── Personas (one user row per matrix column) ───────────────────────────

interface UserRow {
        id: number;
        role: string;
        restaurantId: number | null;
        subscriptionStatus: string | null;
        permissions: string[];
}

const persona = (overrides: Partial<UserRow>): UserRow => ({
        id: 1,
        role: 'USER',
        restaurantId: null,
        subscriptionStatus: 'active',
        permissions: [],
        ...overrides,
});

const GUEST_SESSION = { valid: false as const, userId: null };

const setSession = (user: UserRow | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST_SESSION
        );
};

const OWNER_A = persona({ id: 10, role: 'owner', restaurantId: 1 });
const USER_PLAIN = persona({ id: 55, role: 'USER', restaurantId: null });
const SUB_ADMIN_ZERO = persona({ id: 3, role: 'sub_admin', restaurantId: null, permissions: [] });
const SUB_ADMIN_VA = persona({ id: 4, role: 'sub_admin', restaurantId: null, permissions: ['VIEW_ANALYTICS'] });
const ADMIN = persona({ id: 1, role: 'admin', restaurantId: null });
const SUPER_ADMIN = persona({ id: 2, role: 'super_admin', restaurantId: null });

// ── Route invocation helpers ────────────────────────────────────────────

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
        return new NextRequest(url, {
                method,
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
}

const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

async function putItem(id: number, body: unknown) {
        const { PUT } = await import('@/app/api/items/[id]/route');
        return PUT(jsonRequest(`http://localhost/api/items/${id}`, 'PUT', body), idParams(id));
}

async function putCategory(id: number, body: unknown) {
        const { PUT } = await import('@/app/api/categories/[id]/route');
        return PUT(jsonRequest(`http://localhost/api/categories/${id}`, 'PUT', body), idParams(id));
}

async function getUsers() {
        const { GET } = await import('@/app/api/users/route');
        return GET(jsonRequest('http://localhost/api/users', 'GET'));
}

async function patchUser(id: number, body: unknown) {
        const { PATCH } = await import('@/app/api/users/[id]/route');
        return PATCH(jsonRequest(`http://localhost/api/users/${id}`, 'PATCH', body), idParams(id));
}

async function getAuditLogs() {
        const { GET } = await import('@/app/api/admin/audit-logs/route');
        return GET(jsonRequest('http://localhost/api/admin/audit-logs', 'GET'));
}

async function getAdmins() {
        const { GET } = await import('@/app/api/admin/admins/route');
        return GET();
}

async function getSystemEvents() {
        const { GET } = await import('@/app/api/admin/system-events/route');
        return GET(jsonRequest('http://localhost/api/admin/system-events', 'GET'));
}

async function postResetPassword(body: unknown) {
        const { POST } = await import('@/app/api/admin/reset-password/route');
        return POST(jsonRequest('http://localhost/api/admin/reset-password', 'POST', body));
}

async function putRestaurant(id: number, body: unknown) {
        const { PUT } = await import('@/app/api/restaurants/[id]/route');
        return PUT(jsonRequest(`http://localhost/api/restaurants/${id}`, 'PUT', body), idParams(id));
}

async function getSettings(query = '') {
        const { GET } = await import('@/app/api/settings/route');
        return GET(jsonRequest(`http://localhost/api/settings${query}`, 'GET'));
}

// ── Shared fixtures ─────────────────────────────────────────────────────

const ITEM_OF_RESTAURANT_2 = {
        id: 77,
        name: 'Foreign item',
        price: 20,
        discountedPrice: null,
        image: null,
        isFeatured: false,
        category: { restaurantId: 2 },
};

const CATEGORY_OF_RESTAURANT_2 = { id: 88, restaurantId: 2, name: 'Drinks', nameAr: 'مشروبات' };

beforeEach(() => {
        vi.clearAllMocks();
        setSession(OWNER_A);
        // Default: no UserRestaurant links, so any cross-tenant request 403s
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        // Happy-path DB rows (only reached by authorized callers)
        mockMenuItemFindUnique.mockResolvedValue({ ...ITEM_OF_RESTAURANT_2, category: { restaurantId: 2 } });
        mockMenuItemUpdate.mockResolvedValue({ id: 77, name: 'Updated', category: { id: 1, name: 'C', nameAr: 'س' } });
        mockMenuCategoryFindUnique.mockResolvedValue({ ...CATEGORY_OF_RESTAURANT_2 });
        mockMenuCategoryUpdate.mockResolvedValue({ id: 88, name: 'Updated' });
        mockUserFindMany.mockResolvedValue([{ id: 5, username: 'u', name: 'n', role: 'owner', restaurantId: 1 }]);
        // round88-B7: the users PATCH route pre-reads its target (roleFrom audit)
        mockUserFindUnique.mockResolvedValue({ username: 'target', role: 'USER', restaurantId: null });
        mockUserCount.mockResolvedValue(1);
        mockUserUpdate.mockResolvedValue({ id: 9, username: 'target', name: 't', role: 'owner', restaurantId: 2 });
        mockAuditLogFindMany.mockResolvedValue([]);
        mockAuditLogCount.mockResolvedValue(0);
        mockSystemEventFindMany.mockResolvedValue([]);
        mockSystemEventCount.mockResolvedValue(0);
        mockSettingFindMany.mockResolvedValue([{ key: 'theme', value: 'dark' }]);
        mockRestaurantFindUnique.mockResolvedValue({ id: 1, name: 'R', plan: null });
        mockOrderGroupBy.mockResolvedValue([]);
        mockMenuCategoryGroupBy.mockResolvedValue([]);
        mockRestaurantUpdate.mockResolvedValue({ id: 1, name: 'Updated' });
        mockSessionDeleteMany.mockResolvedValue({ count: 2 });
});

// ── PUT /api/items/[id] — menu item writes (matrix §2) ───────────────────

describe('RBAC matrix — PUT /api/items/[id]', () => {
        it('guest → 401, no item row is even read', async () => {
                setSession(null);
                const res = await putItem(77, { name: 'X' });
                expect(res.status).toBe(401);
                expect(mockMenuItemFindUnique).not.toHaveBeenCalled();
        });

        it('USER → 403 (authenticated but no permission path for item writes)', async () => {
                setSession(USER_PLAIN);
                const res = await putItem(77, { name: 'X' });
                expect(res.status).toBe(403);
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('owner of restaurant 1 writing restaurant 2 item, no link → 403, update never runs', async () => {
                setSession(OWNER_A);
                const res = await putItem(77, { name: 'X' });
                expect(res.status).toBe(403);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('owner of restaurant 1 writing restaurant 2 item WITH a link (multi-menu) → 200', async () => {
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await putItem(77, { name: 'X' });
                expect(res.status).toBe(200);
                expect(mockMenuItemUpdate).toHaveBeenCalled();
        });

        it('sub_admin with zero permissions → 403 (MANAGE_RESTAURANTS missing)', async () => {
                setSession(SUB_ADMIN_ZERO);
                const res = await putItem(77, { name: 'X' });
                expect(res.status).toBe(403);
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('legacy admin passes MANAGE_RESTAURANTS → 200 (full-trust role)', async () => {
                setSession(ADMIN);
                const res = await putItem(77, { name: 'X' });
                expect(res.status).toBe(200);
        });

        it('super_admin → 200', async () => {
                setSession(SUPER_ADMIN);
                const res = await putItem(77, { name: 'X' });
                expect(res.status).toBe(200);
        });
});

// ── PUT /api/categories/[id] — category writes (matrix §2) ──────────────

describe('RBAC matrix — PUT /api/categories/[id]', () => {
        it('USER → 403 (authenticated, no permission path)', async () => {
                setSession(USER_PLAIN);
                const res = await putCategory(88, { name: 'X' });
                expect(res.status).toBe(403);
                expect(mockMenuCategoryUpdate).not.toHaveBeenCalled();
        });

        it('owner cross-tenant without link → 403, update never runs', async () => {
                setSession(OWNER_A);
                const res = await putCategory(88, { name: 'X' });
                expect(res.status).toBe(403);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockMenuCategoryUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin with zero permissions → 403', async () => {
                setSession(SUB_ADMIN_ZERO);
                const res = await putCategory(88, { name: 'X' });
                expect(res.status).toBe(403);
        });

        it('admin → 200 (legacy full-trust)', async () => {
                setSession(ADMIN);
                const res = await putCategory(88, { name: 'X' });
                expect(res.status).toBe(200);
                expect(mockMenuCategoryUpdate).toHaveBeenCalled();
        });
});

// ── GET /api/users — user list (matrix §5) ──────────────────────────────

describe('RBAC matrix — GET /api/users', () => {
        // round89-E3: an AUTHENTICATED non-staff caller is now 403 (was 401 —
        // dx-1 ب-5); guest stays 401. Rows updated with the route change.
        it.each([
                ['guest', null, 401],
                ['USER', USER_PLAIN, 403],
                ['owner', OWNER_A, 403],
        ] as const)('%s → 401/403 by auth state, user rows never read', async (_label, user, expected) => {
                setSession(user);
                const res = await getUsers();
                expect(res.status).toBe(expected);
                expect(mockUserFindMany).not.toHaveBeenCalled();
        });

        it('sub_admin with zero permissions → 403 (r103-F6: user rows are PII — MANAGE_USERS required)', async () => {
                setSession(SUB_ADMIN_ZERO);
                const res = await getUsers();
                expect(res.status).toBe(403);
                expect(mockUserFindMany).not.toHaveBeenCalled();
        });

        it('admin → 200', async () => {
                setSession(ADMIN);
                const res = await getUsers();
                expect(res.status).toBe(200);
        });
});

// ── PATCH /api/users/[id] — role change (matrix §5) ─────────────────────

describe('RBAC matrix — PATCH /api/users/[id] (role change)', () => {
        const ROLE_CHANGE = { role: 'owner', restaurantId: 2 };

        it('sub_admin with zero permissions → 403 (no MANAGE_USERS)', async () => {
                setSession(SUB_ADMIN_ZERO);
                const res = await patchUser(9, ROLE_CHANGE);
                expect(res.status).toBe(403);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('legacy admin → 403 (MANAGE_USERS is super_admin-only — escalation guard)', async () => {
                setSession(ADMIN);
                const res = await patchUser(9, ROLE_CHANGE);
                expect(res.status).toBe(403);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('super_admin → 200 and the role write lands', async () => {
                setSession(SUPER_ADMIN);
                const res = await patchUser(9, ROLE_CHANGE);
                expect(res.status).toBe(200);
                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: 9 },
                        data: ROLE_CHANGE,
                        select: { id: true, username: true, name: true, role: true, restaurantId: true },
                });
        });
});

// ── GET /api/admin/audit-logs — audit trail (matrix §5) ─────────────────

describe('RBAC matrix — GET /api/admin/audit-logs (super_admin-only by design)', () => {
        it.each([
                ['guest', null, 401],
                // round91-F-B (D2-#3): authenticated wrong-role now 403 (was 401 —
                // requireAdmin conflated no-session and wrong-role)
                ['USER', USER_PLAIN, 403],
                ['owner', OWNER_A, 403],
                ['sub_admin (zero perms)', SUB_ADMIN_ZERO, 403],
                ['legacy admin', ADMIN, 403],
        ] as const)('%s → %s, audit rows never read', async (_label, user, expected) => {
                setSession(user);
                const res = await getAuditLogs();
                expect(res.status).toBe(expected);
                expect(mockAuditLogFindMany).not.toHaveBeenCalled();
        });

        it('super_admin → 200 (the only reader of the full audit feed)', async () => {
                setSession(SUPER_ADMIN);
                const res = await getAuditLogs();
                expect(res.status).toBe(200);
                expect(mockAuditLogFindMany).toHaveBeenCalled();
        });
});

// ── GET /api/admin/admins — admin management (matrix §5) ────────────────

describe('RBAC matrix — GET /api/admin/admins (MANAGE_USERS)', () => {
        it.each([
                ['sub_admin (zero perms)', SUB_ADMIN_ZERO, 403],
                ['legacy admin', ADMIN, 403],
        ] as const)('%s → 403, admin rows never read', async (_label, user, expected) => {
                setSession(user);
                const res = await getAdmins();
                expect(res.status).toBe(expected);
                expect(mockUserFindMany).not.toHaveBeenCalled();
        });

        it('super_admin → 200 and reads only super/sub admin rows', async () => {
                setSession(SUPER_ADMIN);
                const res = await getAdmins();
                expect(res.status).toBe(200);
                expect(mockUserFindMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { role: { in: ['super_admin', 'sub_admin'] } } })
                );
        });
});

// ── GET /api/admin/system-events — VIEW_ANALYTICS gate (matrix §5) ──────

describe('RBAC matrix — GET /api/admin/system-events (VIEW_ANALYTICS)', () => {
        it('guest → 401', async () => {
                setSession(null);
                const res = await getSystemEvents();
                expect(res.status).toBe(401);
        });

        it('owner → 403 (no permission path for owners)', async () => {
                setSession(OWNER_A);
                const res = await getSystemEvents();
                expect(res.status).toBe(403);
                expect(mockSystemEventFindMany).not.toHaveBeenCalled();
        });

        it('sub_admin with zero permissions → 403 (round86-A8 gate holds)', async () => {
                setSession(SUB_ADMIN_ZERO);
                const res = await getSystemEvents();
                expect(res.status).toBe(403);
                expect(mockSystemEventFindMany).not.toHaveBeenCalled();
        });

        it('sub_admin WITH VIEW_ANALYTICS → 200', async () => {
                setSession(SUB_ADMIN_VA);
                const res = await getSystemEvents();
                expect(res.status).toBe(200);
                expect(mockSystemEventFindMany).toHaveBeenCalled();
        });

        it('admin → 200', async () => {
                setSession(ADMIN);
                const res = await getSystemEvents();
                expect(res.status).toBe(200);
        });
});

// ── POST /api/admin/reset-password (matrix §5) ──────────────────────────

describe('RBAC matrix — POST /api/admin/reset-password (MANAGE_USERS = super only)', () => {
        it.each([
                ['sub_admin (zero perms)', SUB_ADMIN_ZERO, 403],
                ['legacy admin', ADMIN, 403],
        ] as const)('%s → 403, password never rewritten', async (_label, user, expected) => {
                setSession(user);
                const res = await postResetPassword({ userId: 9, newPassword: 'newpassword123' });
                expect(res.status).toBe(expected);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('super_admin → 200, sessions revoked with the password change', async () => {
                setSession(SUPER_ADMIN);
                const res = await postResetPassword({ userId: 9, newPassword: 'newpassword123' });
                expect(res.status).toBe(200);
                expect(mockUserUpdate).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 9 } })
                );
                expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 9 } });
        });
});

// ── PUT /api/restaurants/[id] — restricted vs full schema (matrix §5) ───

describe('RBAC matrix — PUT /api/restaurants/[id]', () => {
        it('USER → 403 (no write access to restaurants at all)', async () => {
                setSession(USER_PLAIN);
                const res = await putRestaurant(2, { name: 'X' });
                expect(res.status).toBe(403);
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('owner cross-tenant without link → 403', async () => {
                setSession(OWNER_A);
                const res = await putRestaurant(2, { name: 'X' });
                expect(res.status).toBe(403);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin without MANAGE_RESTAURANTS and without a link → 403 (restricted branch)', async () => {
                setSession(SUB_ADMIN_ZERO);
                const res = await putRestaurant(2, { name: 'X' });
                expect(res.status).toBe(403);
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('admin (MANAGE_RESTAURANTS auto-pass) → 200 full-schema branch', async () => {
                setSession(ADMIN);
                const res = await putRestaurant(2, { name: 'X' });
                expect(res.status).toBe(200);
                expect(mockRestaurantUpdate).toHaveBeenCalled();
        });
});

// ── GET /api/settings — tenant settings (matrix §4) ─────────────────────

describe('RBAC matrix — GET /api/settings (tenant settings)', () => {
        it('guest → 401', async () => {
                setSession(null);
                const res = await getSettings();
                expect(res.status).toBe(401);
        });

        it('USER → 403, no settings read', async () => {
                setSession(USER_PLAIN);
                const res = await getSettings();
                expect(res.status).toBe(403);
                expect(mockSettingFindMany).not.toHaveBeenCalled();
        });

        it('owner without any restaurant → 400 (fail closed, not all-tenant)', async () => {
                setSession(persona({ id: 10, role: 'owner', restaurantId: null }));
                const res = await getSettings();
                expect(res.status).toBe(400);
        });

        it('owner requesting another tenant without a link → 403', async () => {
                setSession(OWNER_A);
                const res = await getSettings('?restaurantId=2');
                expect(res.status).toBe(403);
                expect(mockSettingFindMany).not.toHaveBeenCalled();
        });

        it('owner on own restaurant → 200', async () => {
                setSession(OWNER_A);
                const res = await getSettings();
                expect(res.status).toBe(200);
                expect(mockSettingFindMany).toHaveBeenCalledWith({ where: { restaurantId: 1 }, select: { key: true, value: true } });
        });

        it('sub_admin without MANAGE_RESTAURANTS → 403', async () => {
                setSession(SUB_ADMIN_ZERO);
                const res = await getSettings('?restaurantId=2');
                expect(res.status).toBe(403);
        });
});
