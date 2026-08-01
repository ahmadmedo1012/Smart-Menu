import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

// ════════════════════════════════════════════════════════════════════
// 1. hash.ts — PBKDF2 password hashing (stand-in for bcrypt)
// ════════════════════════════════════════════════════════════════════
import { hashPassword, verifyHash } from '@/lib/hash';

describe('hash.ts', () => {
	it('hashPassword returns string', () => {
		const hashed = hashPassword('correct-horse-battery-staple');
		expect(typeof hashed).toBe('string');
	});

	it('hashPassword format salt:hash', () => {
		const hashed = hashPassword('correct-horse-battery-staple');
		expect(hashed).toContain(':');
	});

	it('salt = 64 hex chars (32 bytes)', () => {
		const [salt] = hashPassword('correct-horse-battery-staple').split(':');
		expect(salt).toHaveLength(64);
	});

	it('hash = 128 hex chars (64 bytes)', () => {
		const [, hash] = hashPassword('correct-horse-battery-staple').split(':');
		expect(hash).toHaveLength(128);
	});

	it('salt is hex only', () => {
		const [salt] = hashPassword('correct-horse-battery-staple').split(':');
		expect(salt).toMatch(/^[0-9a-f]+$/);
	});

	it('hash is hex only', () => {
		const [, hash] = hashPassword('correct-horse-battery-staple').split(':');
		expect(hash).toMatch(/^[0-9a-f]+$/);
	});

	it('verifyHash correct password → true', () => {
		const pwd = 'correct-horse-battery-staple';
		const hashed = hashPassword(pwd);
		expect(verifyHash(pwd, hashed)).toBe(true);
	});

	it('verifyHash wrong password → false', () => {
		const hashed = hashPassword('real-password');
		expect(verifyHash('wrong-password', hashed)).toBe(false);
	});

	it('verifyHash empty password → false', () => {
		const hashed = hashPassword('real-password');
		expect(verifyHash('', hashed)).toBe(false);
	});

	it('verifyHash empty stored → false', () => {
		expect(verifyHash('anything', '')).toBe(false);
	});

	it('verifyHash no-colon stored → false', () => {
		expect(verifyHash('anything', 'no-colon')).toBe(false);
	});

	it('verifyHash multi-colon stored → false', () => {
		expect(verifyHash('anything', 'a:b:c')).toBe(false);
	});

	it('verifyHash idempotent for same password', () => {
		const pwd = 'test-password';
		const hashed = hashPassword(pwd);
		expect(verifyHash(pwd, hashed)).toBe(true);
	});

	it('unique salt per call', () => {
		const pwd = 'test-password';
		const salt1 = hashPassword(pwd).split(':')[0];
		const salt2 = hashPassword(pwd).split(':')[0];
		expect(salt1).not.toBe(salt2);
	});
});

// ════════════════════════════════════════════════════════════════════
// 2. auth.ts — requireAuth / requireAdmin / requirePermission
// ════════════════════════════════════════════════════════════════════

vi.mock('@/lib/session', () => ({ validateSession: vi.fn() }));
vi.mock('@/lib/db', () => ({ getUserById: vi.fn() }));

import { requireAuth, requireAdmin, requirePermission } from '@/lib/auth';
import * as session from '@/lib/session';
import * as db from '@/lib/db';
import type { Role, Permission, SubscriptionStatus } from '@/generated/prisma/enums';

type UserRow = {
	id: number;
	role: Role;
	restaurantId: number | null;
	subscriptionStatus: SubscriptionStatus | null;
	permissions: Permission[];
};

const userRow = (overrides: Partial<UserRow> = {}): any => ({
	id: 1,
	role: 'admin' as Role,
	restaurantId: 5,
	subscriptionStatus: 'active' as string,
	permissions: [],
	...overrides,
});

const validSession = { valid: true as const, userId: 1 };
const badSession = { valid: false as const, userId: null };

const adminRow = userRow({ role: 'admin' });
const superAdminRow = userRow({ role: 'super_admin', id: 2, restaurantId: null });
const subAdminRow = userRow({ role: 'sub_admin', id: 3, restaurantId: 10, permissions: [] });
const subAdminPermRow = userRow({ role: 'sub_admin', id: 4, permissions: ['MANAGE_USERS'] });
const memberRow = userRow({ role: 'owner', id: 5, restaurantId: null });

describe('auth.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('requireAuth', () => {
		it('invalid session → {authorized:false}', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(badSession);
			const r = await requireAuth();
			expect(r.authorized).toBe(false);
		});

		it('valid session but user null → {authorized:false}', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue(null);
			const r = await requireAuth();
			expect(r.authorized).toBe(false);
		});

		it('valid session + user → authorized with userId/role/restaurantId/subscription', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue(adminRow);
			const r = await requireAuth();
			expect(r.authorized).toBe(true);
			if (r.authorized) {
				expect(r.userId).toBe(1);
				expect(r.role).toBe('admin');
				expect(r.restaurantId).toBe(5);
				expect(r.subscriptionStatus).toBe('active');
				expect(r.permissions).toEqual([]);
			}
		});

		it('requireRestaurant blocks null restaurantId', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue({ ...memberRow, restaurantId: null });
			const r = await requireAuth({ requireRestaurant: true });
			expect(r.authorized).toBe(false);
		});

		it('requireRestaurant allows non-null restaurantId', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue({ ...memberRow, restaurantId: 7 });
			const r = await requireAuth({ requireRestaurant: true });
			expect(r.authorized).toBe(true);
		});

		it('expired session (valid:false) → {authorized:false}', async () => {
			vi.mocked(session.validateSession).mockResolvedValue({ valid: false, userId: 1 });
			const r = await requireAuth();
			expect(r.authorized).toBe(false);
		});

		it('valid session but userId null → {authorized:false}', async () => {
			vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: null });
			const r = await requireAuth();
			expect(r.authorized).toBe(false);
		});

		it('member with null restaurant OK without requireRestaurant', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue(memberRow);
			const r = await requireAuth();
			expect(r.authorized).toBe(true);
		});
	});

	describe('requireAdmin', () => {
		it('admin role → authorized', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue(adminRow);
			const r = await requireAdmin();
			expect(r.authorized).toBe(true);
		});

		it('super_admin role → authorized', async () => {
			vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 2 });
			vi.mocked(db.getUserById).mockResolvedValue(superAdminRow);
			const r = await requireAdmin();
			expect(r.authorized).toBe(true);
		});

		it('sub_admin role → authorized', async () => {
			vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 3 });
			vi.mocked(db.getUserById).mockResolvedValue(subAdminRow);
			const r = await requireAdmin();
			expect(r.authorized).toBe(true);
		});

		it('member role → {authorized:false}', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue(memberRow);
			const r = await requireAdmin();
			expect(r.authorized).toBe(false);
		});

		it('unauthenticated → {authorized:false}', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(badSession);
			const r = await requireAdmin();
			expect(r.authorized).toBe(false);
		});
	});

	describe('requirePermission', () => {
		it('unauthenticated → 401', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(badSession);
			const r = await requirePermission('manage_orders');
			expect(r.authorized).toBe(false);
			if (!r.authorized) expect(r.status).toBe(401);
		});

		it('super_admin bypasses permission check — always authorized', async () => {
			vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 2 });
			vi.mocked(db.getUserById).mockResolvedValue(superAdminRow);
			const r = await requirePermission('anything');
			expect(r.authorized).toBe(true);
		});

		it('admin bypasses permission check — always authorized', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue(adminRow);
			const r = await requirePermission('anything');
			expect(r.authorized).toBe(true);
		});

		it('sub_admin with matching permission → authorized', async () => {
			vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 4 });
			vi.mocked(db.getUserById).mockResolvedValue(subAdminPermRow);
			const r = await requirePermission('MANAGE_USERS');
			expect(r.authorized).toBe(true);
		});

		it('sub_admin missing permission → 403', async () => {
			vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 3 });
			vi.mocked(db.getUserById).mockResolvedValue(subAdminRow);
			const r = await requirePermission('manage_orders');
			expect(r.authorized).toBe(false);
			if (!r.authorized) expect(r.status).toBe(403);
		});

		it('sub_admin wrong permission → 403', async () => {
			vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 4 });
			vi.mocked(db.getUserById).mockResolvedValue(subAdminPermRow);
			const r = await requirePermission('manage_users');
			expect(r.authorized).toBe(false);
			if (!r.authorized) expect(r.status).toBe(403);
		});

		it('member role → 403', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue(memberRow);
			const r = await requirePermission('anything');
			expect(r.authorized).toBe(false);
			if (!r.authorized) expect(r.status).toBe(403);
		});

		it('requireRestaurant option forwarded to requireAuth', async () => {
			vi.mocked(session.validateSession).mockResolvedValue(validSession);
			vi.mocked(db.getUserById).mockResolvedValue({ ...memberRow, restaurantId: null });
			const r = await requirePermission('anything', { requireRestaurant: true });
			expect(r.authorized).toBe(false);
		});
	});
});

// ════════════════════════════════════════════════════════════════════
// 3. csrf.ts — Origin-based CSRF validation
// ════════════════════════════════════════════════════════════════════
import { assertSameOrigin } from '@/lib/csrf';

describe('csrf.ts', () => {
	beforeAll(() => {
		process.env.NEXT_PUBLIC_DOMAIN = 'https://example.com';
	});
	it('GET — skips check (non-mutating)', () => {
		const req = new Request('http://example.com/api/orders', {
			method: 'GET',
			headers: { origin: 'http://evil.com' },
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('HEAD — skips check (non-mutating)', () => {
		const req = new Request('http://example.com/api/orders', {
			method: 'HEAD',
			headers: { origin: 'http://evil.com' },
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('OPTIONS — skips check (non-mutating)', () => {
		const req = new Request('http://example.com/api/orders', {
			method: 'OPTIONS',
			headers: { origin: 'http://evil.com' },
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('POST — passes when origin matches host and CSRF token matches', () => {
		const req = new Request('http://example.com/api/orders', {
			method: 'POST',
			headers: {
				origin: 'http://example.com',
				host: 'example.com',
				cookie: 'csrf-token=tok1',
				'x-csrf-token': 'tok1',
			},
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('PUT — passes when origin matches host and CSRF token matches', () => {
		const req = new Request('http://example.com/api/items', {
			method: 'PUT',
			headers: {
				origin: 'http://example.com',
				host: 'example.com',
				cookie: 'csrf-token=tok1',
				'x-csrf-token': 'tok1',
			},
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('DELETE — passes when origin matches host and CSRF token matches', () => {
		const req = new Request('http://example.com/api/items/1', {
			method: 'DELETE',
			headers: {
				origin: 'http://example.com',
				host: 'example.com',
				cookie: 'csrf-token=tok1',
				'x-csrf-token': 'tok1',
			},
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('POST — throws on mismatched origin', () => {
		const req = new Request('http://example.com/api/orders', {
			method: 'POST',
			headers: { origin: 'http://evil.com', host: 'example.com' },
		});
		expect(() => assertSameOrigin(req)).toThrow('CSRF check failed: Origin mismatch');
	});

	it('POST — throws when Origin header is missing', () => {
		const req = new Request('http://example.com/api/orders', { method: 'POST' });
		expect(() => assertSameOrigin(req)).toThrow('CSRF check failed: missing Origin');
	});

	it('exempt path /api/auth/login — no check', () => {
		const req = new Request('http://example.com/api/auth/login', {
			method: 'POST',
			headers: { origin: 'http://evil.com' },
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('exempt path /api/health — no check', () => {
		const req = new Request('http://example.com/api/health', {
			method: 'POST',
			headers: { origin: 'http://evil.com' },
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('exempt path /api/telegram/webhook — no check', () => {
		const req = new Request('http://example.com/api/telegram/webhook', {
			method: 'POST',
			headers: { origin: 'http://evil.com' },
		});
		expect(() => assertSameOrigin(req)).not.toThrow();
	});

	it('POST — throws on invalid Origin URL', () => {
		const req = new Request('http://example.com/api/orders', {
			method: 'POST',
			headers: { origin: 'not-a-valid-url' },
		});
		expect(() => assertSameOrigin(req)).toThrow('CSRF');
	});
});

// ════════════════════════════════════════════════════════════════════
// 4. csrf-client.ts — fetch wrapper adds CSRF header to mutations
// ════════════════════════════════════════════════════════════════════
import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/csrf';
import { csrfFetch } from '@/lib/csrf-client';

describe('csrf-client.ts', () => {
	const CSRF_TOKEN = 'mock-csrf-' + Math.random().toString(16).slice(2, 10);

	beforeEach(() => {
		vi.stubGlobal('document', { cookie: `${CSRF_COOKIE}=${CSRF_TOKEN}` });
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('GET — no CSRF header added', async () => {
		await csrfFetch('/api/test');
		const mockFetch = vi.mocked(globalThis.fetch);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		const init = mockFetch.mock.calls[0][1];
		expect(init).toBeUndefined();
	});

	it('POST — adds CSRF header with token', async () => {
		await csrfFetch('/api/test', { method: 'POST' });
		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/test',
			expect.objectContaining({
				method: 'POST',
				headers: { [CSRF_HEADER]: CSRF_TOKEN },
			})
		);
	});

	it('PUT — adds CSRF header', async () => {
		await csrfFetch('/api/test', { method: 'PUT' });
		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/test',
			expect.objectContaining({
				headers: { 'x-csrf-token': CSRF_TOKEN },
			})
		);
	});

	it('DELETE — adds CSRF header', async () => {
		await csrfFetch('/api/test', { method: 'DELETE' });
		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/test',
			expect.objectContaining({
				headers: { 'x-csrf-token': CSRF_TOKEN },
			})
		);
	});

	it('PATCH — adds CSRF header', async () => {
		await csrfFetch('/api/test', { method: 'PATCH' });
		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/test',
			expect.objectContaining({
				headers: { 'x-csrf-token': CSRF_TOKEN },
			})
		);
	});

	it('preserves original headers while adding CSRF', async () => {
		await csrfFetch('/api/test', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});
		const mockFetch = vi.mocked(globalThis.fetch);
		const callInit = mockFetch.mock.calls[0][1] as RequestInit & {
			headers: Record<string, string>;
		};
		const headers = callInit.headers;
		expect(headers['Content-Type']).toBe('application/json');
		expect(headers['x-csrf-token']).toBe(CSRF_TOKEN);
	});

	it('lowercase POST method still adds header', async () => {
		await csrfFetch('/api/test', { method: 'post' });
		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/test',
			expect.objectContaining({
				headers: { 'x-csrf-token': CSRF_TOKEN },
			})
		);
	});

	it('no CSRF cookie → sends empty token value', async () => {
		vi.stubGlobal('document', { cookie: '' });
		await csrfFetch('/api/test', { method: 'POST' });
		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/test',
			expect.objectContaining({
				headers: { 'x-csrf-token': '' },
			})
		);
	});
});
