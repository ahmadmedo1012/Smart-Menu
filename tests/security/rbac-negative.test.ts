/**
 * Round88-B1/B2 — RBAC matrix negative checks, live-server level.
 *
 * Locks the rejection cells of docs/security/rbac-matrix-round88.md against
 * the running server (:3000 local / production via BASE_URL) using only
 * non-mutating probes:
 *   1. Guest (no session) — every sensitive read must 401.
 *   2. Proxy CSRF — mutating API calls without/with a foreign Origin 403
 *      before any route logic runs.
 *   3. USER (fresh self-registered) — every private read/write 401/403.
 *   4. Owner cross-tenant (waha_owner, seeded restaurant 1) — foreign
 *      restaurant ids 403, admin surfaces 401/403.
 *   5. Login rate limit — the 11th failed attempt for one ip:username
 *      bucket must 429 (verified live: 10/min window).
 *
 * Pattern: same as tests/e2e/round86-security.spec.ts (fresh USER via
 * /api/auth/register, explicit Cookie headers — the request jar does not
 * reliably persist Set-Cookie) and tests/security/webhook-security.test.ts
 * (raw request fixture, no browser). The owner probes live in ONE test so
 * waha_owner logs in exactly once per run (login budget: 10/min per
 * ip:username, shared with the serialized team suites).
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

interface UserSession {
  token: string;
  cookie: string;
}

/** Same registration helper contract as round86-security.spec.ts. */
async function registerUser(
  request: import('@playwright/test').APIRequestContext
): Promise<UserSession> {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const csrf = await request.get('/api/health');
  const csrfToken = (csrf.headers()['set-cookie'] ?? '').match(/csrf-token=([^;]+)/)?.[1] ?? '';
  const origin = new URL(BASE);
  if (origin.hostname === '127.0.0.1') origin.hostname = 'localhost';

  const res = await request.post('/api/auth/register', {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      Cookie: `csrf-token=${csrfToken}`,
      Origin: origin.origin,
    },
    data: JSON.stringify({
      username: `sec88b${suffix}`,
      password: 'SecPass123',
      name: 'Sec88 B Probe',
    }),
  });
  if (res.status() === 429) test.skip(true, 'register rate-limited on this IP');
  expect(res.status()).toBe(201);
  const session = (res.headers()['set-cookie'] ?? '').match(/smart-menu-session=([^;]+)/)?.[1] ?? '';
  expect(session, 'register must set a session cookie').toBeTruthy();
  return { token: session, cookie: `smart-menu-session=${session}` };
}

function sessionHeaders(session: UserSession, csrfToken: string): Record<string, string> {
  const origin = new URL(BASE);
  if (origin.hostname === '127.0.0.1') origin.hostname = 'localhost';
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
    Cookie: `csrf-token=${csrfToken}; ${session.cookie}`,
    Origin: origin.origin,
  };
}

async function mintCsrf(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const res = await request.get('/api/health');
  return (res.headers()['set-cookie'] ?? '').match(/csrf-token=([^;]+)/)?.[1] ?? '';
}

// ── 1. Guest: every sensitive read 401s before any data is touched ──────

test.describe('RBAC negative — guest (no session)', () => {
  const GUEST_401 = [
    '/api/users',
    '/api/orders',
    '/api/orders/count',
    // W7-B (G-4): مسارا الحقيقة/التصدير المبوّبان — 401 قبل أي شيء مثل
    // بقية الأسرة (الضيف لا يذوق بوابات الخطة أصلًا).
    '/api/orders/export',
    '/api/owner/entitlements',
    '/api/admin/audit-logs',
    '/api/admin/stats',
    '/api/settings',
    '/api/stats',
    '/api/stats/advanced',
    '/api/user/events',
    '/api/auth/me',
  ];

  for (const path of GUEST_401) {
    test(`GET ${path} → 401`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(401);
    });
  }
});

// ── 2. Proxy CSRF: mutations rejected before route logic ────────────────

test.describe('RBAC negative — proxy CSRF gate', () => {
  test('POST /api/auth/login with NO Origin header → 403', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ username: 'x', password: 'y' }),
    });
    expect(res.status()).toBe(403);
  });

  test('POST /api/auth/login with a foreign Origin → 403', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' },
      data: JSON.stringify({ username: 'x', password: 'y' }),
    });
    expect(res.status()).toBe(403);
  });
});

// ── 3. USER role: authenticated but denied everywhere private ───────────

test.describe('RBAC negative — USER role', () => {
  test('USER reads: orders/stats/loyalty/admin surfaces all denied', async ({ request }) => {
    const session = await registerUser(request);

    const reads: Array<[string, number]> = [
      ['/api/orders', 403],
      ['/api/stats', 403],
      ['/api/loyalty/stats', 403],
      ['/api/settings', 403],
      ['/api/admin/system-events', 403],
      ['/api/admin/stats', 403],
      // round89-E3: an AUTHENTICATED non-admin now gets 403 (was 401 — the
      // 401/403 split: unauthenticated 401, authenticated-but-denied 403).
      ['/api/users', 403],
      // round91-F-B: requireAdmin routes join the split (was 401 for USER).
      ['/api/admin/audit-logs', 403],
    ];
    for (const [path, expected] of reads) {
      const res = await request.get(path, { headers: { Cookie: session.cookie } });
      expect(res.status(), `GET ${path} as USER`).toBe(expected);
    }
  });

  test('USER writes: no permission path anywhere (403, nothing created)', async ({ request }) => {
    const session = await registerUser(request);
    const csrfToken = await mintCsrf(request);

    const itemRes = await request.put('/api/items/1', {
      headers: sessionHeaders(session, csrfToken),
      data: JSON.stringify({ name: 'probe' }),
    });
    expect(itemRes.status()).toBe(403);

    const userRes = await request.patch('/api/users/1', {
      headers: sessionHeaders(session, csrfToken),
      data: JSON.stringify({ role: 'admin' }),
    });
    expect(userRes.status()).toBe(403);
  });
});

// ── 4. Owner cross-tenant + admin surfaces (single login) ───────────────

test.describe('RBAC negative — owner (waha_owner, restaurant 1)', () => {
  // All probes share ONE login so the per-account login budget (10/min
  // ip:username) is spent exactly once per run.
  test('owner: foreign restaurant ids 403, admin surfaces 401/403', async ({ request }) => {
    const csrfToken = await mintCsrf(request);
    const origin = new URL(BASE);
    if (origin.hostname === '127.0.0.1') origin.hostname = 'localhost';

    const login = await request.post('/api/auth/login', {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: `csrf-token=${csrfToken}`,
        Origin: origin.origin,
      },
      data: JSON.stringify({ username: 'waha_owner', password: 'waha123456' }),
    });
    // M-2 (r127-F2): probe-and-skip, same pattern as the register 429-skip
    // above — waha_owner comes from the round83 seed; in minimal
    // environments (no seed / rate-limited IP) the login fails and this
    // suite must SKIP loudly instead of holding the whole run hostage.
    if (login.status() === 429) test.skip(true, 'waha_owner login rate-limited on this IP');
    if (login.status() !== 200) test.skip(true, 'round83 seed missing (waha_owner)');
    expect(login.status()).toBe(200);
    const session = (login.headers()['set-cookie'] ?? '').match(/smart-menu-session=([^;]+)/)?.[1] ?? '';
    expect(session).toBeTruthy();
    const cookie = `smart-menu-session=${session}`;

    // Cross-tenant reads: an id the owner has NO UserRestaurant link for.
    // The ownership guard fires BEFORE any data is returned.
    const crossTenant: Array<[string, number]> = [
      ['/api/orders?restaurantId=999', 403],
      ['/api/orders/count?restaurantId=999', 403],
      ['/api/settings?restaurantId=999', 403],
      ['/api/items?restaurantId=999', 403],
    ];
    for (const [path, expected] of crossTenant) {
      const res = await request.get(path, { headers: { Cookie: cookie } });
      expect(res.status(), `GET ${path} as owner`).toBe(expected);
    }

    // Owner must not reach staff surfaces.
    const adminSurfaces: Array<[string, number]> = [
      // round89-E3: owner is authenticated → 403 on GET /api/users (was 401;
      // the split matches users/route.ts: 401 only for no session).
      ['/api/users', 403],
      ['/api/restaurants', 403],
      ['/api/admin/stats', 403],
    ];
    for (const [path, expected] of adminSurfaces) {
      const res = await request.get(path, { headers: { Cookie: cookie } });
      expect(res.status(), `GET ${path} as owner`).toBe(expected);
    }

    // Cross-tenant write: PUT on an item the owner does not own. A missing
    // item id → 404 (no leak either way); the guard must never answer 200.
    const putRes = await request.put('/api/items/999999', {
      headers: sessionHeaders({ token: session, cookie }, csrfToken),
      data: JSON.stringify({ name: 'probe' }),
    });
    expect([403, 404]).toContain(putRes.status());
  });
});

// ── 5. Login rate limit: 11th failure in one ip:username bucket → 429 ───

test.describe('RBAC negative — login rate limit (public brute-force surface)', () => {
  test('11 failed logins for one (ip, username) bucket → 429', async ({ request }) => {
    const csrfToken = await mintCsrf(request);
    const origin = new URL(BASE);
    if (origin.hostname === '127.0.0.1') origin.hostname = 'localhost';
    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      Cookie: `csrf-token=${csrfToken}`,
      Origin: origin.origin,
    };
    // Nonexistent username: burns ONLY this probe's bucket — a real account
    // is never locked by this test (the acct limiter key includes the
    // username and only counts FAILED password checks of existing users).
    const username = `rbac-probe-${Date.now()}`;
    const data = JSON.stringify({ username, password: 'WrongPass123' });

    let saw429 = false;
    for (let i = 1; i <= 11; i++) {
      const res = await request.post('/api/auth/login', { headers, data });
      if (res.status() === 429) {
        saw429 = true;
        break;
      }
      expect(res.status(), `attempt ${i} must be a clean 401 rejection`).toBe(401);
    }
    // Verified live against the standalone server: attempts 1-10 → 401,
    // attempt 11 → 429 (loginLimiter 10/min per ip:username).
    expect(saw429, 'the 11th attempt in the same window must be rate-limited').toBe(true);
  });
});
