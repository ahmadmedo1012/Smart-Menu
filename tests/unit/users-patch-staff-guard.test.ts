/**
 * r127-F2 (ADV2-5) — PATCH /api/users/[id] staff-target guard.
 *
 * The audit finding: the route's target guard covered only super_admin
 * (r118-A2-P3) while the sibling r121-E3 policy (admin/reset-password:40-48)
 * protects ALL staff accounts — an admin/sub_admin holding MANAGE_USERS
 * could rename another admin's or sub_admin's name/username through this
 * route (login-lockout griefing; resetting an admin's username is a
 * practical account takeover). The guard now mirrors reset-password:
 * staff targets (super_admin/admin/sub_admin) are only editable by
 * super_admin; MANAGE_USERS keeps its documented purpose: owner/USER support.
 *
 * Guard semantics (mirroring the sibling reset-password-guard.test.ts):
 *   - sub_admin (MANAGE_USERS) → target admin = 403 «لا يمكن تعديل بيانات طاقم الإدارة»
 *   - sub_admin (MANAGE_USERS) → target sub_admin (peer) = 403
 *   - sub_admin (MANAGE_USERS) → target super_admin = 403 (unified message)
 *   - sub_admin (MANAGE_USERS) → target owner = 200 (the support path — regression pin)
 *   - super_admin → target admin = 200 (staff support routes through super_admin)
 *   - super_admin → target super_admin = 200 (peer self-management, preserved)
 *
 * Mock pattern: reset-password-guard.test.ts (mocked requirePermission
 * ladder + prisma + audit), no real DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

// requirePermission result — sub_admin w/ MANAGE_USERS or super_admin
const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'super_admin' as string,
                userId: 1 as number | null,
                restaurantId: null as number | null,
                permissions: [] as string[],
                error: '',
                status: 200,
        },
}));

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockSystemEventCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
        systemEvent: { create: mockSystemEventCreate },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth', () => ({
        requirePermission: vi.fn(async () => authHolder.value),
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

/** The route pre-reads { username, role, restaurantId } for the audit row. */
function targetRow(role: string) {
        return { username: `target_${role}`, role, restaurantId: null };
}

async function callPatch(id: number, body: unknown) {
        const { PATCH } = await import('@/app/api/users/[id]/route');
        const req = new NextRequest(`http://localhost/api/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
        });
        return PATCH(req, { params: Promise.resolve({ id: String(id) }) });
}

const TARGET_ID = 9;

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { ...SUPER_ADMIN_ACTOR };
        // default target: a regular owner account (the MANAGE_USERS support path)
        mockUserFindUnique.mockResolvedValue(targetRow('owner'));
        mockUserUpdate.mockResolvedValue({
                id: TARGET_ID,
                username: 'target_owner',
                name: 'اسم جديد',
                role: 'owner',
                restaurantId: 2,
        });
});

// ── The staff-target guard ──────────────────────────────────────────────

describe('PATCH /api/users/[id] — r127-F2 (ADV2-5) staff-target guard', () => {
        it('sub_admin (MANAGE_USERS) → target admin, name edit = 403 — the admin-rename griefing path is closed', async () => {
                authHolder.value = { ...SUB_ADMIN_MANAGE_USERS };
                mockUserFindUnique.mockResolvedValue(targetRow('admin'));

                const res = await callPatch(TARGET_ID, { name: 'اسم مخرب' });

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('غير مصرح — لا يمكن تعديل بيانات طاقم الإدارة');
                // the row is never rewritten and nothing is audited as an update
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('sub_admin (MANAGE_USERS) → target admin, USERNAME edit = 403 — the login-lockout variant', async () => {
                authHolder.value = { ...SUB_ADMIN_MANAGE_USERS };
                mockUserFindUnique.mockResolvedValue(targetRow('admin'));

                const res = await callPatch(TARGET_ID, { username: 'hijacked_admin' });

                expect(res.status).toBe(403);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin (MANAGE_USERS) → target sub_admin (peer) = 403 — renaming a peer inherits their permission set', async () => {
                authHolder.value = { ...SUB_ADMIN_MANAGE_USERS };
                mockUserFindUnique.mockResolvedValue(targetRow('sub_admin'));

                const res = await callPatch(TARGET_ID, { name: 'زميل مخرب' });

                expect(res.status).toBe(403);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin (MANAGE_USERS) → target super_admin = 403 — the r118-A2-P3 root guard stays closed (unified message)', async () => {
                authHolder.value = { ...SUB_ADMIN_MANAGE_USERS };
                mockUserFindUnique.mockResolvedValue(targetRow('super_admin'));

                const res = await callPatch(TARGET_ID, { name: 'مدير مخرب' });

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('غير مصرح — لا يمكن تعديل بيانات طاقم الإدارة');
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin (MANAGE_USERS) → target owner, name edit = 200 — the documented support path stays intact (regression pin)', async () => {
                authHolder.value = { ...SUB_ADMIN_MANAGE_USERS };
                mockUserFindUnique.mockResolvedValue(targetRow('owner'));

                const res = await callPatch(TARGET_ID, { name: 'اسم مالك جديد' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: TARGET_ID },
                        data: { name: 'اسم مالك جديد' },
                        select: { id: true, username: true, name: true, role: true, restaurantId: true },
                });
                // the successful support edit is audited with the acting sub_admin
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: 'update',
                                targetType: 'user',
                                targetId: TARGET_ID,
                                actorId: 5,
                                metadata: expect.objectContaining({ action: 'update_user', roleFrom: 'owner' }),
                        })
                );
        });

        it('super_admin → target admin = 200 — staff profile support routes through super_admin', async () => {
                authHolder.value = { ...SUPER_ADMIN_ACTOR };
                mockUserFindUnique.mockResolvedValue(targetRow('admin'));

                const res = await callPatch(TARGET_ID, { name: 'اسم طاقم جديد' });

                expect(res.status).toBe(200);
                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: TARGET_ID },
                        data: { name: 'اسم طاقم جديد' },
                        select: { id: true, username: true, name: true, role: true, restaurantId: true },
                });
        });

        it('super_admin → target super_admin = 200 (peer self-management, preserved)', async () => {
                authHolder.value = { ...SUPER_ADMIN_ACTOR };
                mockUserFindUnique.mockResolvedValue(targetRow('super_admin'));

                const res = await callPatch(TARGET_ID, { name: 'مدير عام جديد' });

                expect(res.status).toBe(200);
                expect(mockUserUpdate).toHaveBeenCalled();
        });

        it('missing target → 404 before any write (unchanged)', async () => {
                mockUserFindUnique.mockResolvedValue(null);

                const res = await callPatch(TARGET_ID, { name: 'لا أحد' });

                expect(res.status).toBe(404);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });
});
