/**
 * Round88-B7 — audit trail for security-sensitive events.
 *
 * The sensitive-event inventory (worklog 88-B) found three families with no
 * audit record at all; these tests lock the added coverage:
 *   1. Login account lockout (20 failed passwords / 15 min) → ONE warning
 *      SystemEvent at the trip moment (not per 401 — the feed stays signal).
 *   2. Role/restaurant assignment via PATCH /api/users/[id] → logAudit with
 *      roleFrom→roleTo + a rbac.role_change SystemEvent (privilege event).
 *   3. User deletion → logAudit with username/role (destructive family).
 *
 * Everything else was verified already present: login success (logAudit),
 * permission changes (admins/[id]), password resets, item/category/order/
 * restaurant writes, referral conversions, subscription decisions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserDelete = vi.hoisted(() => vi.fn());
const mockSystemEventCreate = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockPrisma = vi.hoisted(() => ({
        user: {
                findUnique: mockUserFindUnique,
                update: mockUserUpdate,
                delete: mockUserDelete,
        },
        // r119-S7: users DELETE now checks last-ownership before deleting —
        // default mock: the target owns no restaurant links (guard passes).
        userRestaurant: {
                findMany: vi.fn().mockResolvedValue([]),
        },
        restaurant: {
                findMany: vi.fn().mockResolvedValue([]),
        },
        systemEvent: { create: mockSystemEventCreate },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn() }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({
        validateSession: mockValidateSession,
        createSession: mockCreateSession,
}));

vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent }));
vi.mock('@/lib/logger', () => ({ error: vi.fn(), warn: vi.fn() }));
vi.mock('@/lib/hash', () => ({
        verifyHash: vi.fn((pw: string, stored: string) => pw === stored),
        needsRehash: vi.fn(() => false),
        hashPassword: vi.fn(() => '600000:mocksalt:mockhash'),
}));

// loginLimiter (max 10) always allows; accountLimiter (max 20) is driven by
// the accountState counter — the test trips it on demand.
const accountState = vi.hoisted(() => ({ count: 0, limit: 0 }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: vi.fn(({ max }: { max: number }) => {
                if (max === 20) {
                        return {
                                check: async () => {
                                        accountState.count += 1;
                                        return { success: accountState.count <= accountState.limit };
                                },
                                destroy: () => {},
                        };
                }
                return {
                        check: async () => ({ success: true, remaining: 9, reset: 0 }),
                        destroy: () => {},
                };
        }),
}));

// ── Personas ────────────────────────────────────────────────────────────

const SUPER_ADMIN = {
        id: 2,
        role: 'super_admin',
        restaurantId: null,
        subscriptionStatus: 'active',
        permissions: [],
};

const setSession = (user: Record<string, unknown> | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true, userId: user.id, user } : { valid: false, userId: null }
        );
};

const loginRequest = (username: string, password: string) =>
        new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
        });

const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

beforeEach(() => {
        vi.clearAllMocks();
        accountState.count = 0;
        accountState.limit = Infinity;
        setSession(SUPER_ADMIN);
        mockUserUpdate.mockResolvedValue({ id: 9, username: 'target', name: 't', role: 'owner', restaurantId: 2 });
        mockSystemEventCreate.mockResolvedValue({});
        mockLogAudit.mockResolvedValue(undefined);
});

// ── 1. Login lockout → one warning SystemEvent ──────────────────────────

describe('B7 — login account lockout audit', () => {
        it('the trip moment writes ONE auth.lockout warning SystemEvent, the 429 still returns', async () => {
                mockUserFindUnique.mockResolvedValue({
                        id: 7,
                        username: 'victim',
                        password: 'real-hash',
                        name: 'Victim',
                        role: 'owner',
                        restaurantId: 1,
                        subscriptionStatus: 'active',
                });
                // Trip the account limiter on its FIRST check in this test (count 1 > limit 0).
                accountState.limit = 0;

                const { POST } = await import('@/app/api/auth/login/route');
                const res = await POST(loginRequest('victim', 'wrong-password'));

                expect(res.status).toBe(429);
                expect(mockSystemEventCreate).toHaveBeenCalledTimes(1);
                const data = mockSystemEventCreate.mock.calls[0][0].data;
                expect(data.eventType).toBe('auth.lockout');
                expect(data.severity).toBe('warning');
                expect(data.metadata).toMatchObject({ username: 'victim', limiter: 'acct:ip:username' });
        });

        it('an ordinary failed login (no trip) writes NO SystemEvent — the feed stays signal', async () => {
                mockUserFindUnique.mockResolvedValue({
                        id: 7,
                        username: 'victim',
                        password: 'real-hash',
                        name: 'Victim',
                        role: 'owner',
                        restaurantId: 1,
                        subscriptionStatus: 'active',
                });

                const { POST } = await import('@/app/api/auth/login/route');
                const res = await POST(loginRequest('victim', 'wrong-password'));

                expect(res.status).toBe(401);
                expect(mockSystemEventCreate).not.toHaveBeenCalled();
        });

        it('a SystemEvent write failure never breaks the 429 (best-effort contract)', async () => {
                mockUserFindUnique.mockResolvedValue({
                        id: 7,
                        username: 'victim',
                        password: 'real-hash',
                        name: 'Victim',
                        role: 'owner',
                        restaurantId: 1,
                        subscriptionStatus: 'active',
                });
                accountState.limit = 0;
                mockSystemEventCreate.mockRejectedValue(new Error('db down'));

                const { POST } = await import('@/app/api/auth/login/route');
                const res = await POST(loginRequest('victim', 'wrong-password'));

                expect(res.status).toBe(429);
        });
});

// ── 2. Role change → logAudit + rbac.role_change SystemEvent ────────────

describe('B7 — PATCH /api/users/[id] role change audit', () => {
        async function patchUser(body: unknown) {
                const { PATCH } = await import('@/app/api/users/[id]/route');
                return PATCH(
                        new NextRequest('http://localhost/api/users/9', {
                                method: 'PATCH',
                                body: JSON.stringify(body),
                        }),
                        idParams(9)
                );
        }

        it('role change: audit row carries roleFrom→roleTo, plus the privilege SystemEvent', async () => {
                mockUserFindUnique.mockResolvedValue({ username: 'target', role: 'USER', restaurantId: null });
                const res = await patchUser({ role: 'owner', restaurantId: 2 });

                expect(res.status).toBe(200);
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: 'update',
                                targetType: 'user',
                                targetId: 9,
                                metadata: expect.objectContaining({
                                        action: 'update_user',
                                        username: 'target',
                                        roleFrom: 'USER',
                                        roleTo: 'owner',
                                }),
                        })
                );
                expect(mockSystemEventCreate).toHaveBeenCalledTimes(1);
                const data = mockSystemEventCreate.mock.calls[0][0].data;
                expect(data.eventType).toBe('rbac.role_change');
                expect(data.severity).toBe('warning');
                expect(data.metadata).toMatchObject({
                        targetUserId: 9,
                        username: 'target',
                        roleFrom: 'USER',
                        roleTo: 'owner',
                        actorId: 2,
                });
        });

        it('name-only edit: audit row still written, NO privilege SystemEvent', async () => {
                mockUserFindUnique.mockResolvedValue({ username: 'target', role: 'owner', restaurantId: 2 });
                const res = await patchUser({ name: 'New Name' });

                expect(res.status).toBe(200);
                expect(mockLogAudit).toHaveBeenCalledTimes(1);
                expect(mockSystemEventCreate).not.toHaveBeenCalled();
        });

        it('missing target user → clean 404 (no update, no audit)', async () => {
                mockUserFindUnique.mockResolvedValue(null);
                const res = await patchUser({ role: 'owner' });

                expect(res.status).toBe(404);
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });
});

// ── 3. User deletion → logAudit ─────────────────────────────────────────

describe('B7 — DELETE /api/users/[id] audit', () => {
        async function deleteUser() {
                const { DELETE } = await import('@/app/api/users/[id]/route');
                return DELETE(
                        new NextRequest('http://localhost/api/users/9', { method: 'DELETE' }),
                        idParams(9)
                );
        }

        it('deletion writes an audit row with the deleted identity', async () => {
                mockUserFindUnique.mockResolvedValue({ username: 'target', role: 'owner' });
                mockUserDelete.mockResolvedValue({ id: 9 });

                const res = await deleteUser();

                expect(res.status).toBe(200);
                expect(mockUserDelete).toHaveBeenCalledWith({ where: { id: 9 } });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: 'delete',
                                targetType: 'user',
                                targetId: 9,
                                metadata: { username: 'target', role: 'owner' },
                        })
                );
        });

        it('super_admin target is protected → 403, no delete, no audit', async () => {
                mockUserFindUnique.mockResolvedValue({ username: 'root', role: 'super_admin' });

                const res = await deleteUser();

                expect(res.status).toBe(403);
                expect(mockUserDelete).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        // r119-S7: deleting a user who is the LAST owner of a restaurant would
        // orphan it (UserRestaurant cascade removes the link; the restaurant
        // keeps serving publicly with nobody able to manage it). The guard
        // blocks the delete with 409 + the restaurant names.
        it('r119: last-owner of a restaurant → 409 with the restaurant name, nothing deleted', async () => {
                mockUserFindUnique.mockResolvedValue({ username: 'solo-owner', role: 'owner' });
                mockPrisma.userRestaurant.findMany
                        .mockResolvedValueOnce([{ restaurantId: 5 }]) // target's links
                        .mockResolvedValueOnce([]); // nobody else owns #5
                mockPrisma.restaurant.findMany.mockResolvedValueOnce([{ name: 'مقهى الواحة' }]);

                const res = await deleteUser();

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toContain('مقهى الواحة');
                expect(json.error).toContain('المالك الوحيد');
                expect(mockUserDelete).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('r119: user who CO-OWNS (another owner exists) deletes normally', async () => {
                mockUserFindUnique.mockResolvedValue({ username: 'co-owner', role: 'owner' });
                mockPrisma.userRestaurant.findMany
                        .mockResolvedValueOnce([{ restaurantId: 5 }])
                        .mockResolvedValueOnce([{ restaurantId: 5 }]); // someone else owns #5 too

                const res = await deleteUser();

                expect(res.status).toBe(200);
                expect(mockUserDelete).toHaveBeenCalledWith({ where: { id: 9 } });
        });
});
