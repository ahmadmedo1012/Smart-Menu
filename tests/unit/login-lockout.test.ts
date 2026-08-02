import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

// Rate limiter state holders — accountLimiter counts FAILED attempts only
const accountState = vi.hoisted(() => ({ count: 0 }));
const loginState = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/lib/db', () => ({
	prisma: {
		user: { findUnique: mockFindUnique, update: mockUpdate },
	},
}));
vi.mock('@/lib/hash', () => ({
	verifyHash: vi.fn((pw: string, stored: string) => pw === stored),
}));
vi.mock('@/lib/session', () => ({ createSession: mockCreateSession }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent }));
vi.mock('@/lib/logger', () => ({ error: vi.fn() }));

// loginLimiter: always allows (10/min IP+username — out of scope for this test)
// accountLimiter: 20/15min — fails from the 21st check onward
vi.mock('@/lib/rate-limit', () => ({
	createDbRateLimiter: vi.fn(({ max }: { max: number }) => {
		if (max === 20) {
			// accountLimiter — counts FAILED attempts only (asserted in tests)
			return {
				check: async () => {
					accountState.count += 1;
					return { success: accountState.count <= max };
				},
			};
		}
		// loginLimiter (10/min) — always allow; tested separately
		return {
			check: async () => {
				loginState.count += 1;
				return { success: true };
			},
		};
	}),
}));

const VALID_PASSWORD = 'correct-password-hash';

function makeRequest(username: string, password: string): Request {
	return new Request('http://localhost/api/auth/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-real-ip': '1.2.3.4',
		},
		body: JSON.stringify({ username, password }),
	});
}

describe('login lockout — account limiter counts only FAILED attempts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		accountState.count = 0;
		loginState.count = 0;
		mockFindUnique.mockResolvedValue({
			id: 1,
			username: 'admin',
			password: VALID_PASSWORD,
			name: 'Admin',
			role: 'owner',
			restaurantId: 1,
			subscriptionStatus: 'PAID',
		});
		mockUpdate.mockResolvedValue({});
	});

	it('25 consecutive SUCCESSFUL logins all pass — no lockout ever', async () => {
		const { POST } = await import('@/app/api/auth/login/route');

		for (let i = 0; i < 25; i++) {
			const res = await POST(makeRequest('admin', VALID_PASSWORD));
			expect(res.status, `attempt ${i + 1} should succeed`).toBe(200);
		}
		// accountLimiter must never have been called on successful logins
		expect(accountState.count).toBe(0);
	});

	it('21 consecutive FAILED logins — 21st returns 429 lockout', async () => {
		const { POST } = await import('@/app/api/auth/login/route');

		for (let i = 0; i < 20; i++) {
			const res = await POST(makeRequest('admin', 'wrong-password'));
			expect(res.status, `failed attempt ${i + 1} → 401`).toBe(401);
		}
		const twentyFirst = await POST(makeRequest('admin', 'wrong-password'));
		expect(twentyFirst.status).toBe(429);
		expect(accountState.count).toBe(21);
	});

	it('a successful login after failures does NOT consume the account budget', async () => {
		const { POST } = await import('@/app/api/auth/login/route');

		// 10 failed attempts
		for (let i = 0; i < 10; i++) {
			await POST(makeRequest('admin', 'wrong-password'));
		}
		// successful login must not increment accountState
		const res = await POST(makeRequest('admin', VALID_PASSWORD));
		expect(res.status).toBe(200);
		expect(accountState.count).toBe(10);
	});
});
