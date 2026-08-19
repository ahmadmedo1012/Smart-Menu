/**
 * CSRF — assertSameOrigin unit tests.
 * Verifies Origin/Host matching gate on mutating requests
 * and exemption list for webhook/health endpoints (auth endpoints are
 * NOT exempt since wave6 — CSRF enforced on login/register).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertSameOrigin, getExpectedHosts } from '@/lib/csrf';

beforeAll(() => {
	process.env.NEXT_PUBLIC_DOMAIN = 'https://example.com';
});

function makeRequest(
	method: string,
	pathname: string,
	origin: string | null,
	host: string
): Request {
	const url = new URL(pathname, 'https://' + host);
	const headers: Record<string, string> = { host };
	if (origin) headers['origin'] = origin;
	// Double-submit token: matching cookie + header for legit same-origin requests
	if (origin && new URL(origin).host === host) {
		headers['cookie'] = 'csrf-token=test-token-123';
		headers['x-csrf-token'] = 'test-token-123';
	}
	return new Request(url, { method, headers });
}

describe('assertSameOrigin', () => {
	describe('mutating methods (POST/PUT/PATCH/DELETE)', () => {
		it('POST with matching origin → passes', () => {
			const req = makeRequest('POST', '/api/restaurants', 'https://example.com', 'example.com');
			expect(() => assertSameOrigin(req)).not.toThrow();
		});

		it('POST with mismatched origin → throws 403', () => {
			const req = makeRequest('POST', '/api/restaurants', 'https://attacker.com', 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('CSRF check failed: Origin mismatch');
		});

		it('POST with missing origin → throws', () => {
			const req = makeRequest('POST', '/api/restaurants', null, 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('CSRF check failed: missing Origin');
		});

		it('PUT with mismatched origin → throws', () => {
			const req = makeRequest('PUT', '/api/restaurants/1', 'https://evil.com', 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('PATCH with mismatched origin → throws', () => {
			const req = makeRequest('PATCH', '/api/restaurants/1', 'https://evil.com', 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('DELETE with mismatched origin → throws', () => {
			const req = makeRequest('DELETE', '/api/restaurants/1', 'https://evil.com', 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('POST with matching origin but missing CSRF token → throws', () => {
			const req = makeRequest('POST', '/api/restaurants', 'https://example.com', 'example.com');
			// strip the auto-added token to simulate a non-browser attacker
			const headers = new Headers(req.headers);
			headers.delete('cookie');
			headers.delete('x-csrf-token');
			const stripped = new Request(req.url, { method: 'POST', headers });
			expect(() => assertSameOrigin(stripped)).toThrow('CSRF check failed: token mismatch');
		});

		it('POST with matching origin but mismatched CSRF token → throws', () => {
			const req = makeRequest('POST', '/api/restaurants', 'https://example.com', 'example.com');
			const headers = new Headers(req.headers);
			headers.set('x-csrf-token', 'wrong-token');
			const stripped = new Request(req.url, { method: 'POST', headers });
			expect(() => assertSameOrigin(stripped)).toThrow('CSRF check failed: token mismatch');
		});
	});

	describe('non-mutating method (GET)', () => {
		it('GET passes regardless of origin mismatch', () => {
			const req = makeRequest('GET', '/api/restaurants', 'https://attacker.com', 'example.com');
			expect(() => assertSameOrigin(req)).not.toThrow();
		});
	});

	describe('exempt paths', () => {
		it('/api/telegram/webhook passes with mismatched origin', () => {
			const req = makeRequest(
				'POST',
				'/api/telegram/webhook',
				'https://external.com',
				'example.com'
			);
			expect(() => assertSameOrigin(req)).not.toThrow();
		});

		it('/api/health passes with mismatched origin', () => {
			const req = makeRequest('POST', '/api/health', 'https://monitor.com', 'example.com');
			expect(() => assertSameOrigin(req)).not.toThrow();
		});

		// wave6 (commit 5028572e "enforce CSRF on login/register") deliberately
		// removed /api/auth/login and /api/auth/register from CSRF_EXEMPT to
		// block login-CSRF attacks. The old expectation (auth exempt from CSRF)
		// is obsolete — auth endpoints now require a valid same-origin request
		// plus the double-submit token, like every other mutating API route.
		it('/api/auth/login throws with mismatched origin (CSRF enforced since wave6)', () => {
			const req = makeRequest('POST', '/api/auth/login', 'https://phish.com', 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('/api/auth/register throws with mismatched origin (CSRF enforced since wave6)', () => {
			const req = makeRequest('POST', '/api/auth/register', 'https://phish.com', 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('sub-path under exempt path is blocked (exact match only)', () => {
			const req = makeRequest('POST', '/api/telegram/webhook/extra', 'https://phish.com', 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});
	});

	describe('cron exemptions (server-originated, Bearer-authenticated)', () => {
		it('POST /api/cron/* passes with no Origin (Vercel Cron)', () => {
			const req = makeRequest('POST', '/api/cron/cleanup', null, 'example.com');
			expect(() => assertSameOrigin(req)).not.toThrow();
		});

		it('POST /api/cron/ passes with no Origin', () => {
			const req = makeRequest('POST', '/api/cron/', null, 'example.com');
			expect(() => assertSameOrigin(req)).not.toThrow();
		});

		it('non-cron API path is NOT prefix-exempt', () => {
			const req = makeRequest('POST', '/api/cronn', 'https://phish.com', 'example.com');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});
	});

	describe('non-exempt API path still blocked', () => {
		it('/api/admin/restaurants POST with mismatched origin → throws', () => {
			const req = makeRequest(
				'POST',
				'/api/admin/restaurants',
				'https://attacker.com',
				'example.com'
			);
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});
	});

	describe('deploy-agnostic host resolution (vercel.app vs custom domain)', () => {
		it('POST from vercel.app origin with matching request host → passes', () => {
			const req = makeRequest(
				'POST',
				'/api/subscriptions',
				'https://smart-menu-abc123.vercel.app',
				'smart-menu-abc123.vercel.app'
			);
			expect(() => assertSameOrigin(req)).not.toThrow();
		});

		it('POST from custom domain origin with matching request host → passes', () => {
			const req = makeRequest(
				'POST',
				'/api/subscriptions',
				'https://menu.smart-link.ly',
				'menu.smart-link.ly'
			);
			expect(() => assertSameOrigin(req)).not.toThrow();
		});

		it('POST from vercel.app origin when request host is custom domain → throws', () => {
			const req = makeRequest(
				'POST',
				'/api/subscriptions',
				'https://smart-menu-abc123.vercel.app',
				'menu.smart-link.ly'
			);
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('POST with forged x-forwarded-host matching origin → throws (header not trusted)', () => {
			const req = makeRequest('POST', '/api/subscriptions', 'https://evil.com', 'victim.com');
			req.headers.set('x-forwarded-host', 'evil.com');
			// attacker also forges the double-submit token — must still be rejected
			req.headers.set('cookie', 'csrf-token=forged');
			req.headers.set('x-csrf-token', 'forged');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('POST with forged Host header matching origin → throws (Host header not trusted)', () => {
			const req = makeRequest(
				'POST',
				'/api/subscriptions',
				'https://evil.com',
				'victim.com'
			);
			req.headers.set('host', 'evil.com');
			req.headers.set('cookie', 'csrf-token=forged');
			req.headers.set('x-csrf-token', 'forged');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('POST with x-forwarded-host but mismatching origin → throws', () => {
			const req = makeRequest(
				'POST',
				'/api/subscriptions',
				'https://evil.com',
				'internal.edge'
			);
			req.headers.set('x-forwarded-host', 'menu.smart-link.ly');
			expect(() => assertSameOrigin(req)).toThrow('Origin mismatch');
		});

		it('getExpectedHosts with no env and unparseable URL → empty list', () => {
			const prevEnv = process.env.NEXT_PUBLIC_DOMAIN;
			process.env.NEXT_PUBLIC_DOMAIN = '';
			try {
				// Simulate an edge request whose URL host cannot be resolved:
				// Request always yields a URL, so cover the branch via a stub.
				const req = new Request('http://x/', { method: 'POST' });
				// Patch the URL to a value whose host parsing fails — same branch
				// getExpectedHosts guards against malformed platform URLs.
				Object.defineProperty(req, 'url', { value: 'not a url' });
				expect(getExpectedHosts(req)).toEqual([]);
			} finally {
				process.env.NEXT_PUBLIC_DOMAIN = prevEnv;
			}
		});
	});
});
