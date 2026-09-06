/**
 * round90-F1 — S-2 regression lock: POST /api/admin/reset-password target guard.
 *
 * The security-specialist finding (g90-D2 S-2, CRITICAL): a sub_admin holding
 * MANAGE_USERS could reset a super_admin's password and revoke that
 * account's sessions — full platform takeover via an audited route. Every
 * sibling route in the family double-guards (admins/[id]:19,29 ·
 * users/[id]:37,114); reset-password was the only one without.
 *
 * Guard semantics (mirroring the mandated test matrix — the support function
 * of sub_admin password resets for regular accounts stays intact):
 *   - sub_admin (MANAGE_USERS) → target super_admin = 403 «لا يمكن تعديل مدير عام»
 *   - super_admin → target super_admin = 200 (peer self-management)
 *   - sub_admin (MANAGE_USERS) → target owner = 200 (the original support path)
 *   - unknown target → 404 before any write
 *
 * Mock pattern: rbac-matrix.test.ts (mocked auth ladder + prisma + audit),
 * no real DB, real PBKDF2 swapped for an instant stub.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

// requirePermission result — sub_admin w/ MANAGE_USERS or super_admin
// (error/status carry the unauthorized shape the route spreads on 403)
const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'super_admin',
                userId: 1,
                restaurantId: null,
                permissions: [] as string[],
                error: '',
                status: 200,
        },
}));

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockSessionDeleteMany = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
        session: { deleteMany: mockSessionDeleteMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth', () => ({
        requirePermission: vi.fn(async () => authHolder.value),
}));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/hash', () => ({
        hashPassword: mockHashPassword,
        verifyHash: vi.fn(),
        needsRehash: vi.fn(() => false),
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

// ── Fixtures / helpers ──────────────────────────────────────────────────

const SUPER_ADMIN_ACTOR = {
        authorized: true,
        role: 'super_admin',
        userId: 1,
        restaurantId: null,
        permissions: [] as string[],
        error: '',
        status: 200,
};
const SUB_ADMIN_MANAGE_USERS = {
        authorized: true,
        role: 'sub_admin',
        userId: 5,
        restaurantId: null,
        permissions: ['MANAGE_USERS'],
        error: '',
        status: 200,
};

function targetRow(role: string) {
        return { role };
}

async function callReset(body: unknown, ip = '1.2.3.4') {
        const { POST } = await import('@/app/api/admin/reset-password/route');
        const req = new NextRequest('http://localhost/api/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
                body: JSON.stringify(body),
        });
        return POST(req);
}

const RESET_BODY = { userId: 9, newPassword: 'newpassword123' };

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { ...SUPER_ADMIN_ACTOR };
        mockRateCheck.mockResolvedValue({ success: true, remaining: 4, reset: 0 });
        mockHashPassword.mockReturnValue('NEWHASH');
        // default target: a regular owner account
        mockUserFindUnique.mockResolvedValue(targetRow('owner'));
        mockUserUpdate.mockResolvedValue({ id: 9 });
        mockSessionDeleteMany.mockResolvedValue(2);
});

// ── The privilege-escalation guard ──────────────────────────────────────

describe('POST /api/admin/reset-password — S-2 super_admin target guard', () => {
        it('sub_admin (MANAGE_USERS) → target super_admin = 403 «لا يمكن تعديل مدير عام» — the takeover path is closed', async () => {
                authHolder.value = { ...SUB_ADMIN_MANAGE_USERS };
                mockUserFindUnique.mockResolvedValue(targetRow('super_admin'));

                const res = await callReset(RESET_BODY);

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لا يمكن تعديل مدير عام');
                // the password is NEVER rewritten and the sessions are NEVER revoked
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockSessionDeleteMany).not.toHaveBeenCalled();
                // nothing happened → nothing is audited as a reset
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('super_admin → target super_admin = 200 (peer reset allowed for the top role only)', async () => {
                authHolder.value = { ...SUPER_ADMIN_ACTOR };
                mockUserFindUnique.mockResolvedValue(targetRow('super_admin'));

                const res = await callReset(RESET_BODY);

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: 9 },
                        data: { password: 'NEWHASH' },
                });
                // sessions revoked with the password change (compromise semantics)
                expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 9 } });
        });

        it('sub_admin (MANAGE_USERS) → target owner = 200 — the support function stays intact', async () => {
                authHolder.value = { ...SUB_ADMIN_MANAGE_USERS };
                mockUserFindUnique.mockResolvedValue(targetRow('owner'));

                const res = await callReset(RESET_BODY);

                expect(res.status).toBe(200);
                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: 9 },
                        data: { password: 'NEWHASH' },
                });
                expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 9 } });
                // the successful reset is audited with the acting sub_admin
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({ action: 'update', targetType: 'user', targetId: 9, actorId: 5 })
                );
        });

        it('unknown target → 404 before any write', async () => {
                mockUserFindUnique.mockResolvedValue(null);

                const res = await callReset(RESET_BODY);

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('المستخدم غير موجود');
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin WITHOUT the permission → 403 at the requirePermission gate (unchanged)', async () => {
                authHolder.value = {
                        authorized: false,
                        role: 'sub_admin',
                        userId: 5,
                        restaurantId: null,
                        permissions: [],
                        error: 'لا تملك الصلاحية',
                        status: 403,
                };

                const res = await callReset(RESET_BODY);

                expect(res.status).toBe(403);
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });
});
