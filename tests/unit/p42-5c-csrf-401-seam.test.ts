/**
 * P42-W5 (GAP-MENU-3) — behavioral coverage for the central mid-session 401
 * seam in src/lib/csrf-client.ts.
 *
 * Before the seam, 401 was handled page-by-page ONLY (owner/page.tsx:121 ·
 * orders/page.tsx:94 · use-orders-polling.ts:49 — all raw-fetch probes); every
 * OTHER csrfFetch/csrfJson consumer had no session-expiry journey. The seam
 * ports the family pattern (Smart-Order src/lib/client.ts r132 A2-F5: logout
 * keepalive + Arabic toast + /login?expired=1; SmartBot fb_dashboard
 * csrf-client.ts v15-E5 D4-H3: /api/auth/* exclusions + login-page loop guard
 * + dynamic toast import) into the ONE wrapper all protected-tree mutations
 * and admin fetches already ride.
 *
 * These tests drive the REAL wrapper: the module is re-imported fresh per
 * case (vi.resetModules) so the once-per-page-load flag starts false every
 * time, fetch is stubbed to dispatch the logout keepalive separately from the
 * caller's request, premium-toast is mocked at the module boundary (the seam
 * loads it via dynamic import — the SmartBot bundle guard), and fake timers
 * own the 1200ms readable beat. Node env, no DOM — same doctrine as
 * premium-toast.test.ts / auth.test.ts.
 *
 * Could NOT be pinned here (documented honestly): the sonner surface itself,
 * the keepalive flag surviving a real navigation, and the page-level handlers'
 * full-reload race — those live in the browser; the seam's contract with them
 * is pinned below by source-contract reads instead.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

// ── the premium-toast boundary (the seam's dynamic import resolves here) ────
const mockPremiumToast = vi.hoisted(() => vi.fn());
vi.mock('@/lib/premium-toast', () => ({
  premiumToast: mockPremiumToast,
}));

// ── shared stubs ─────────────────────────────────────────────────────────────
const replaceMock = vi.hoisted(() => vi.fn());
const logoutFetchMock = vi.hoisted(() => vi.fn());

/** The seam's browser reality: an httpOnly session cookie we cannot touch,
 *  a location we can only replace, and one fetch that must serve BOTH the
 *  caller's request and the logout keepalive. */
function stubBrowserWindow(pathname: string, search = ''): void {
  vi.stubGlobal('window', {
    location: { pathname, search, replace: replaceMock },
  });
}

/** fetch stub: the logout keepalive is recorded separately; every other URL
 *  gets the provided Response factory. */
function stubFetch(respond: (url: string) => Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url === '/api/auth/logout') {
        logoutFetchMock(url);
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(respond(url));
    }),
  );
}

const json401 = (error?: string) =>
  new Response(error ? JSON.stringify({ error }) : '{}', {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

/** Fresh seam per case — resets `sessionExpiryHandled` to false. */
async function freshSeam() {
  const mod = await import('@/lib/csrf-client');
  return mod;
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.clearAllMocks();
  // document is only read for the CSRF header on mutating methods — the
  // existing csrf-client suites pin that; here it just needs to exist.
  vi.stubGlobal('document', { cookie: 'csrf-token=seam-test' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Flush the dynamic toast import + fire the 1200ms beat. */
async function fireBeat() {
  await vi.advanceTimersByTimeAsync(1200);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. The journey — the family contract, on the real wrapper
// ════════════════════════════════════════════════════════════════════════════
describe('csrf-client 401 seam — the full journey', () => {
  it('a 401 from a protected endpoint fires the whole family contract: keepalive logout + Arabic toast + delayed /login redirect that preserves the page', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/owner/menu', '?tab=items');
    stubFetch(() => json401('يجب تسجيل الدخول للمتابعة'));

    const res = await csrfFetch('/api/settings', { method: 'POST' });

    // the Response passes through UNCHANGED — every caller's !res.ok branch
    // still sees what it always did (the Smart-Order apiFetch contract).
    expect(res.status).toBe(401);
    // (2) the keepalive logout: raw fetch, survives the navigation.
    expect(logoutFetchMock).toHaveBeenCalledTimes(1);
    const logoutArgs = vi.mocked(globalThis.fetch).mock.calls.find(
      (c) => (c[0] as string) === '/api/auth/logout',
    )!;
    expect(logoutArgs[1]).toEqual({ method: 'POST', keepalive: true });
    // the redirect waits for the readable beat (the toast is perceivable).
    expect(replaceMock).not.toHaveBeenCalled();
    await fireBeat();
    // (1) the Arabic toast — error family (manual-dismiss, role=alert).
    expect(mockPremiumToast).toHaveBeenCalledTimes(1);
    expect(mockPremiumToast).toHaveBeenCalledWith('error', 'انتهت الجلسة', expect.stringContaining('أعد تسجيل الدخول'));
    // (3) full-page replace, no Back entry, reason marker + the return target.
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(
      `/login?expired=1&redirect=${encodeURIComponent('/owner/menu?tab=items')}`,
    );
  });

  it('a GET 401 fires the seam too — mid-session expiry hits polls/loads, not just mutations', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/admin/telegram');
    stubFetch(() => json401());

    await csrfFetch('/api/admin/system-events');
    await fireBeat();

    expect(logoutFetchMock).toHaveBeenCalledTimes(1);
    expect(mockPremiumToast).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(
      `/login?expired=1&redirect=${encodeURIComponent('/admin/telegram')}`,
    );
  });

  it('the seam fires once per page load — a parallel 401 burst (poll + mutation) collapses into ONE logout, ONE toast, ONE redirect', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/owner/orders');
    stubFetch(() => json401());

    await Promise.all([
      csrfFetch('/api/orders'),
      csrfFetch('/api/settings', { method: 'POST' }),
      csrfFetch('/api/items/12', { method: 'DELETE' }),
    ]);
    await fireBeat();

    expect(logoutFetchMock).toHaveBeenCalledTimes(1);
    expect(mockPremiumToast).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });

  it('csrfJson on a 401: the seam fires AND the server error still throws — callers keep their catch', async () => {
    const { csrfJson } = await freshSeam();
    stubBrowserWindow('/owner/menu');
    stubFetch(() => json401('يجب تسجيل الدخول للمتابعة'));

    await expect(
      csrfJson('/api/items', { method: 'POST' }),
    ).rejects.toThrow('يجب تسجيل الدخول للمتابعة');

    await fireBeat();
    expect(logoutFetchMock).toHaveBeenCalledTimes(1);
    expect(mockPremiumToast).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(
      `/login?expired=1&redirect=${encodeURIComponent('/owner/menu')}`,
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. The guard rails — semantic false-positives never kick the user
// ════════════════════════════════════════════════════════════════════════════
describe('csrf-client 401 seam — guard rails', () => {
  it.each([
    ['/api/auth/login', 'wrong credentials is NOT a session kick'],
    ['/api/auth/logout', 'a dead session logging out is not a kick either'],
    ['/api/auth/me', 'the session probe keeps its caller-local meaning'],
    ['/api/auth/register', 'registration 401s keep their local meaning'],
  ])('a 401 from %s stays caller-local (%s)', async (path, _why) => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/owner/menu');
    stubFetch(() => json401());

    // NOTE: the fetch stub serves the keepalive logout itself (200), so the
    // raw status passthrough is pinned by the journey/500 tests instead.
    // What matters HERE: the seam's own artifacts (toast + redirect — and no
    // EXTRA logout beyond the caller's own request on the /api/auth/logout
    // row) never appear.
    const res = await csrfFetch(path, { method: 'POST' });
    expect(res).toBeDefined();
    await fireBeat();

    const seamLogouts =
      path === '/api/auth/logout' ? 1 : /* the caller's own request */ 0;
    expect(logoutFetchMock).toHaveBeenCalledTimes(seamLogouts);
    expect(mockPremiumToast).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('a 401 while already ON /login never re-redirects (loop guard)', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/login');
    stubFetch(() => json401());

    await csrfFetch('/api/settings', { method: 'POST' });
    await fireBeat();

    expect(logoutFetchMock).not.toHaveBeenCalled();
    expect(mockPremiumToast).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('a 500 NEVER triggers the seam — a server failure is not blamed on the session (or the network)', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/owner/menu');
    stubFetch(() => new Response('boom', { status: 500 }));

    const res = await csrfFetch('/api/settings', { method: 'POST' });
    await fireBeat();

    expect(res.status).toBe(500);
    expect(logoutFetchMock).not.toHaveBeenCalled();
    expect(mockPremiumToast).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('non-401 failures (403 plan cap, 422 validation, 429 rate limit) keep their own journeys', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/owner/menu');
    stubFetch(() => new Response(JSON.stringify({ error: 'ممنوع' }), { status: 403 }));

    const res = await csrfFetch('/api/items', { method: 'POST' });
    await fireBeat();

    expect(res.status).toBe(403);
    expect(logoutFetchMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('SSR-safe: with no window the seam stays silent and the Response still resolves', async () => {
    const { csrfFetch } = await freshSeam();
    // NOTE: no window/document stubs — the server reality. GET never reads
    // the document (the CSRF header is mutating-methods only).
    vi.unstubAllGlobals();
    stubFetch(() => json401());

    const res = await csrfFetch('/api/settings');
    await fireBeat();

    expect(res.status).toBe(401);
    expect(logoutFetchMock).not.toHaveBeenCalled();
    expect(mockPremiumToast).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. URL shapes — the /api/auth/ exclusion must hold for every RequestInfo
// ════════════════════════════════════════════════════════════════════════════
describe('csrf-client 401 seam — input URL shapes', () => {
  it('a URL object pointing at /api/auth/* stays caller-local', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/owner');
    stubFetch(() => json401());

    await csrfFetch(new URL('https://menu.smart-link.ly/api/auth/login'));
    await fireBeat();

    expect(logoutFetchMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('a URL object pointing at a protected endpoint fires the seam', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/owner');
    stubFetch(() => json401());

    await csrfFetch(new URL('https://menu.smart-link.ly/api/settings'));
    await fireBeat();

    expect(logoutFetchMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(
      `/login?expired=1&redirect=${encodeURIComponent('/owner')}`,
    );
  });

  it('a Request object pointing at /api/auth/* stays caller-local', async () => {
    const { csrfFetch } = await freshSeam();
    stubBrowserWindow('/login');
    stubFetch(() => json401());

    await csrfFetch(new Request('https://menu.smart-link.ly/api/auth/me'));
    await fireBeat();

    expect(logoutFetchMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Source contracts — the coexistence with the page-level handlers
//    (they use RAW fetch, so the seam never races them; both destinations
//    are /login. These pins freeze that contract in-repo.)
// ════════════════════════════════════════════════════════════════════════════
describe('csrf-client 401 seam — source contracts (no double-redirect races)', () => {
  const read = (p: string) =>
    readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

  it('the owner dashboard keeps its own page-level 401 branch (raw fetch → router.push /login)', () => {
    const src = read('src/app/(protected)/owner/page.tsx');
    expect(src).toContain("if (statsRes.status === 401)");
    expect(src).toContain("router.push('/login')");
  });

  it('the orders page keeps its deliberate full-reload 401 branch (r97: wipe ALL client state)', () => {
    const src = read('src/app/(protected)/owner/orders/page.tsx');
    expect(src).toContain("if (res.status === 401)");
    expect(src).toContain("window.location.href = '/login'");
  });

  it('the orders poller keeps its own 401 branch (raw fetch — bypasses the seam by design)', () => {
    const src = read('src/app/(protected)/owner/orders/use-orders-polling.ts');
    expect(src).toContain("if (res.status === 401)");
    expect(src).toContain("window.location.href = '/login'");
  });

  it('the seam lives in the ONE wrapper — csrfFetch gains the 401 branch, csrfJson inherits it unchanged', () => {
    const src = read('src/lib/csrf-client.ts');
    expect(src).toContain('res.status === 401');
    expect(src).toContain("path.startsWith('/api/auth/')");
    expect(src).toContain("window.location.replace(`/login?expired=1&redirect=");
    expect(src).toContain("{ method: 'POST', keepalive: true }");
    // the dynamic toast import (SmartBot bundle guard — sonner/lucide never
    // ride into every csrfFetch chunk).
    expect(src).toContain("import('@/lib/premium-toast')");
  });
});
