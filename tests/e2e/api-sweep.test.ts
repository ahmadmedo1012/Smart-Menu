/**
 * E2E API Sweep Tests
 *
 * Covers ALL API routes for: unauthenticated access (401), wrong method (405),
 * empty body (400), invalid input (400), and success path (200) where possible.
 *
 * Runs against production https://menu.smart-link.ly
 *
 * Run:  npx playwright test tests/e2e/api-sweep.test.ts
 */
import { test, expect } from '@playwright/test';
import { csrfHeaders } from './csrf-helper';

const BASE = process.env.BASE_URL || 'https://menu.smart-link.ly';
let CSRF = '';

// Re-mint every test: each test's request context has a fresh cookie jar, so
// the CSRF cookie must land in THIS context's jar (not just a module var).
test.beforeEach(async ({ request }) => {
  const res = await request.get(`${BASE}/api/health`);
  const setCookie = res.headers()['set-cookie'] ?? '';
  const m = setCookie.match(/csrf-token=([^;]+)/);
  CSRF = m?.[1] ?? '';
});

async function expectJson(
	res: {
		status: () => number;
		json: () => Promise<unknown>;
		headers: () => Record<string, string>;
	},
	expectedStatus: number
) {
	expect(res.status()).toBe(expectedStatus);
	const headers = await res.headers();
	expect(headers['content-type'] ?? '').toContain('application/json');
	return res.json() as Promise<{ success: boolean; error?: string; data?: unknown }>;
}

test.describe('Auth — POST /api/auth/login', () => {
	test('GET returns 405 method not allowed', async ({ request }) => {
		const res = await request.get(`${BASE}/api/auth/login`);
		expect([403, 405]).toContain(res.status());
	});

	test('PUT returns 405 method not allowed', async ({ request }) => {
		const res = await request.put(`${BASE}/api/auth/login`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('DELETE returns 405 method not allowed', async ({ request }) => {
		const res = await request.delete(`${BASE}/api/auth/login`);
		expect([403, 405]).toContain(res.status());
	});
});

test.describe('Auth — POST /api/auth/register', () => {
	test('GET returns 405 method not allowed', async ({ request }) => {
		const res = await request.get(`${BASE}/api/auth/register`);
		expect([403, 405]).toContain(res.status());
	});

	function expect400or429(status: number) {
		expect([400, 429]).toContain(status);
	}

	test('empty body returns 400 (or 429 if rate-limited)', async ({ request }) => {
		const res = await request.post(`${BASE}/api/auth/register`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: {},
		});
		expect400or429(res.status());
		if (res.status() === 400) {
			const json = await res.json();
			expect(json.success).toBe(false);
			expect(typeof json.error).toBe('string');
		}
	});

	test('username too short returns 400 (or 429 if rate-limited)', async ({ request }) => {
		const res = await request.post(`${BASE}/api/auth/register`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: { username: 'ab', password: '123456', name: 'Test' },
		});
		expect400or429(res.status());
		if (res.status() === 400) {
			const json = await res.json();
			expect(json.success).toBe(false);
		}
	});

	test('password too short returns 400 (or 429 if rate-limited)', async ({ request }) => {
		const res = await request.post(`${BASE}/api/auth/register`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: { username: 'testuser_sweep', password: '12345', name: 'Test' },
		});
		expect400or429(res.status());
		if (res.status() === 400) {
			const json = await res.json();
			expect(json.success).toBe(false);
		}
	});

	test('name missing returns 400 (or 429 if rate-limited)', async ({ request }) => {
		const res = await request.post(`${BASE}/api/auth/register`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: { username: 'testuser_sweep', password: '123456' },
		});
		expect400or429(res.status());
		if (res.status() === 400) {
			const json = await res.json();
			expect(json.success).toBe(false);
		}
	});

	test('PATCH returns 405 method not allowed', async ({ request }) => {
		const res = await request.patch(`${BASE}/api/auth/register`);
		expect([403, 405]).toContain(res.status());
	});
});

test.describe('Auth — GET /api/auth/me', () => {
	test('POST returns 405 method not allowed', async ({ request }) => {
		const res = await request.post(`${BASE}/api/auth/me`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('PUT returns 405 method not allowed', async ({ request }) => {
		const res = await request.put(`${BASE}/api/auth/me`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('DELETE returns 405 method not allowed', async ({ request }) => {
		const res = await request.delete(`${BASE}/api/auth/me`);
		expect([403, 405]).toContain(res.status());
	});
});

test.describe('Plans — GET /api/plans', () => {
	test('POST returns 405 method not allowed', async ({ request }) => {
		const res = await request.post(`${BASE}/api/plans`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('PUT returns 405 method not allowed', async ({ request }) => {
		const res = await request.put(`${BASE}/api/plans`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('DELETE returns 405 method not allowed', async ({ request }) => {
		const res = await request.delete(`${BASE}/api/plans`);
		expect([403, 405]).toContain(res.status());
	});

	test('response headers include content-type json', async ({ request }) => {
		const res = await request.get(`${BASE}/api/plans`);
		expect(res.status()).toBe(200);
		const headers = await res.headers();
		expect(headers['content-type'] ?? '').toContain('application/json');
	});

	test('each plan has required fields', async ({ request }) => {
		const res = await request.get(`${BASE}/api/plans`);
		const json = await res.json();
		expect(json.success).toBe(true);
		expect(Array.isArray(json.data)).toBe(true);
		if (json.data.length > 0) {
			for (const plan of json.data) {
				expect(plan).toHaveProperty('id');
				expect(plan).toHaveProperty('name');
				expect(plan).toHaveProperty('price');
				expect(plan).toHaveProperty('features');
			}
		}
	});
});

test.describe('Restaurants — GET /api/restaurants', () => {
	test('returns 401 for unauthenticated access (auth-gated)', async ({ request }) => {
		const res = await request.get(`${BASE}/api/restaurants`);
		expect(res.status()).toBe(401);
	});
});

test.describe('Restaurants — POST /api/restaurants', () => {
	test('PUT returns 405 method not allowed', async ({ request }) => {
		const res = await request.put(`${BASE}/api/restaurants`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('DELETE returns 405 method not allowed', async ({ request }) => {
		const res = await request.delete(`${BASE}/api/restaurants`);
		expect([403, 405]).toContain(res.status());
	});

	test('without auth and without user credentials returns 401', async ({ request }) => {
		// 429 tolerated: route rate-limits per IP per 60s and the sweep fires
		// many POSTs from one IP.
		const res = await request.post(`${BASE}/api/restaurants`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: { name: 'Sweep Test', slug: 'sweep-test' },
		});
		expect([401, 429]).toContain(res.status());
		if (res.status() === 401) {
			const json = await res.json();
			expect(json.success).toBe(false);
		}
	});

	// POST /api/restaurants uses Zod .parse() directly (not .safeParse()),
	// so Next.js catches the thrown ZodError and returns 422, not 400.
	test('empty body returns 422', async ({ request }) => {
		const res = await request.post(`${BASE}/api/restaurants`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: {},
		});
		expect([422, 429]).toContain(res.status());
	});

	test('missing required name field returns 422', async ({ request }) => {
		const res = await request.post(`${BASE}/api/restaurants`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: { slug: 'sweep-test' },
		});
		expect([422, 429]).toContain(res.status());
	});

	test('invalid slug returns 422', async ({ request }) => {
		const res = await request.post(`${BASE}/api/restaurants`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: { name: 'Sweep Test', slug: 'INVALID SLUG!!!' },
		});
		expect([422, 429]).toContain(res.status());
	});
});

test.describe('Subscriptions — POST /api/subscriptions', () => {
	test('GET returns 405 method not allowed', async ({ request }) => {
		const res = await request.get(`${BASE}/api/subscriptions`);
		expect([403, 405]).toContain(res.status());
	});

	test('PUT returns 405 method not allowed', async ({ request }) => {
		const res = await request.put(`${BASE}/api/subscriptions`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('DELETE returns 405 method not allowed', async ({ request }) => {
		const res = await request.delete(`${BASE}/api/subscriptions`);
		expect([403, 405]).toContain(res.status());
	});
});

test.describe('Telegram — GET /api/telegram/diagnose', () => {
	test('POST returns 405 method not allowed', async ({ request }) => {
		const res = await request.post(`${BASE}/api/telegram/diagnose`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('PUT returns 405 method not allowed', async ({ request }) => {
		const res = await request.put(`${BASE}/api/telegram/diagnose`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('DELETE returns 405 method not allowed', async ({ request }) => {
		const res = await request.delete(`${BASE}/api/telegram/diagnose`);
		expect([403, 405]).toContain(res.status());
	});
});

test.describe('Telegram Config — GET/POST /api/telegram/config', () => {
	test('GET without auth returns 401', async ({ request }) => {
		const json = await expectJson(await request.get(`${BASE}/api/telegram/config`), 401);
		expect(json.success).toBe(false);
	});

	test('POST without auth returns 401', async ({ request }) => {
		const res = await request.post(`${BASE}/api/telegram/config`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: { botToken: 'test', chatId: '1', events: [] },
		});
		expect([401, 429]).toContain(res.status());
		if (res.status() === 401) {
			const json = await res.json();
			expect(json.success).toBe(false);
		}
	});

	test('PUT returns 405 method not allowed', async ({ request }) => {
		const res = await request.put(`${BASE}/api/telegram/config`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('DELETE returns 405 method not allowed', async ({ request }) => {
		const res = await request.delete(`${BASE}/api/telegram/config`);
		expect([403, 405]).toContain(res.status());
	});

	test('PATCH returns 405 method not allowed', async ({ request }) => {
		const res = await request.patch(`${BASE}/api/telegram/config`);
		expect([403, 405]).toContain(res.status());
	});
});

test.describe('Admin Telegram Approvers — GET/POST /api/admin/telegram/approvers', () => {
	test('GET without auth returns 401', async ({ request }) => {
		const json = await expectJson(await request.get(`${BASE}/api/admin/telegram/approvers`), 401);
		expect(json.success).toBe(false);
	});

	test('POST without auth returns 401', async ({ request }) => {
		const res = await request.post(`${BASE}/api/admin/telegram/approvers`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
			data: { telegramId: '12345', label: 'Test' },
		});
		expect([401, 429]).toContain(res.status());
	});

	test('PUT returns 405 method not allowed', async ({ request }) => {
		const res = await request.put(`${BASE}/api/admin/telegram/approvers`, {
		headers: { ...csrfHeaders(CSRF), 'Content-Type': 'application/json' },
		data: {} });
		expect([403, 405]).toContain(res.status());
	});

	test('DELETE returns 405 method not allowed', async ({ request }) => {
		const res = await request.delete(`${BASE}/api/admin/telegram/approvers`);
		expect([403, 405]).toContain(res.status());
	});

	test('PATCH returns 405 method not allowed', async ({ request }) => {
		const res = await request.patch(`${BASE}/api/admin/telegram/approvers`);
		expect([403, 405]).toContain(res.status());
	});
});
