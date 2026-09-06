import type { APIRequestContext } from '@playwright/test';

// Middleware enforces double-submit CSRF on ALL mutating /api/* (except
// CSRF_EXEMPT): X-CSRF-Token header must equal the csrf-token cookie.
//
// The request fixture's cookie jar does NOT reliably persist the Set-Cookie
// response header, and each test gets a fresh context, so a module-cached
// token goes stale. Instead: mint per request fixture and return BOTH the
// token and the cookie, so the caller can send an explicit Cookie header that
// matches X-CSRF-Token exactly.
export async function mintCsrfPair(request: APIRequestContext): Promise<{ token: string; cookie: string }> {
  const res = await request.get('/api/health');
  const setCookie = res.headers()['set-cookie'] ?? '';
  const m = setCookie.match(/csrf-token=([^;]+)/);
  let token = m?.[1] ?? '';
  if (!token) {
    // round88 closure fix (surfaced by team10 sinceId): the proxy only
    // (re)issues the csrf-token cookie when the request carries none — a
    // mid-test gate response (e.g. an unauthenticated 401 from a gated API)
    // already planted one in the jar, so /api/health's set-cookie comes back
    // EMPTY and minting returned '' → login POST without a token → 403.
    // Fall back to the LIVE cookie in the request context's jar.
    const state = await request.storageState();
    token = state.cookies.find((c) => c.name === 'csrf-token')?.value ?? '';
  }
  return { token, cookie: token ? `csrf-token=${token}` : '' };
}

export function csrfHeadersFor(
  base: string,
  pair: { token: string; cookie: string }
): Record<string, string> {
  const origin = new URL(base);
  // Next dev normalizes the middleware request URL to localhost even when the
  // client connects via 127.0.0.1, and assertSameOrigin anchors to that
  // normalized host — so the Origin must claim localhost to match. Production
  // hosts (menu.smart-link.ly, custom domains) pass through unchanged.
  if (origin.hostname === '127.0.0.1') origin.hostname = 'localhost';
  return {
    'X-CSRF-Token': pair.token,
    Cookie: pair.cookie,
    Origin: origin.origin,
  };
}