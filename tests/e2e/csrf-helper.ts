import type { APIRequestContext } from '@playwright/test';

// Middleware enforces double-submit CSRF on ALL mutating /api/* (except
// CSRF_EXEMPT): X-CSRF-Token header must equal the csrf-token cookie.
// A real browser gets the cookie minted by middleware on first response;
// Playwright's request context starts cookie-less, so mint explicitly once
// per test (GET /api/health passes middleware which sets csrf-token) and
// attach both cookie + header to every mutating call.
let cachedToken = '';

export async function mintCsrf(request: APIRequestContext): Promise<string> {
	if (cachedToken) return cachedToken;
	const res = await request.get('/api/health');
	const setCookie = res.headers()['set-cookie'] ?? '';
	const m = setCookie.match(/csrf-token=([^;]+)/);
	cachedToken = m?.[1] ?? '';
	return cachedToken;
}

export function csrfHeaders(token: string): Record<string, string> {
	// Origin must match the request's actual host (assertSameOrigin anchors to
	// request.url host + NEXT_PUBLIC_DOMAIN, NOT to a hardcoded env).
	const base = process.env.BASE_URL || 'https://menu.smart-link.ly';
	return {
		'X-CSRF-Token': token,
		// Cookie comes from Playwright's jar automatically (mint response stored
		// it); sending a manual Cookie duplicates it and breaks the token match.
		Origin: base,
	};
}

// Mint token once per suite; returns headers for mutating calls.
export async function setupCsrf(request: APIRequestContext): Promise<() => Record<string, string>> {
	const token = await mintCsrf(request);
	return () => csrfHeaders(token);
}
