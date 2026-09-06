import { test, expect } from "@playwright/test";

// round89-D2 (dx-5 #7): the file-level `test.use({ baseURL:
// "http://localhost:3000" })` override is REMOVED — it silently beat the
// auth-verify project's env-aware baseURL (round87-D8) and pinned every run
// to localhost, so BASE_URL=https://menu.smart-link.ly production runs hit a
// dead local origin. The config now decides (playwright.config.ts auth-verify:
// process.env.BASE_URL ?? localhost). Absolute request URLs below derive from
// the same env so page navigation and API probes agree on one origin.
const BASE = process.env.BASE_URL || "http://localhost:3000";

const uid = (label = "user") => `${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Mint the csrf-token cookie + matching X-CSRF-Token header via a shared
// page whose origin is the app itself. / is a CACHEABLE page — the middleware
// skips cookie minting there (and on /menu/*, /pricing) so a cached page can
// stay CDN-cacheable. Always navigate to a non-cacheable page first (here:
// /login) to force the middleware to set the cookie, then echo it.
// Each test gets its own context with an empty cookie jar, so mint per test —
// a module-cached token (csrf-helper.ts) would mismatch the jar and 403.
async function csrfHeadersFor(page: import("@playwright/test").Page): Promise<Record<string, string>> {
  await page.goto("/login");
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === "csrf-token")?.value ?? "";
  return {
    "X-CSRF-Token": token,
    "Content-Type": "application/json",
    Origin: BASE,
  };
}

test.describe("Auth Fix Verification", () => {
  // ── 1. Register min-length 8: short password fails ─────────────────────
  test("1. Register with password < 8 chars returns 400", async ({ page }) => {
    await page.goto("/login");
    const headers = await csrfHeadersFor(page);
    const res = await page.request.post(`${BASE}/api/auth/register`, {
      data: { username: uid("short"), password: "123456", name: "Short PW Test" },
      headers,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  // ── 2. Register min-length 8: sufficient password succeeds ─────────────
  test("2. Register with password >= 8 chars returns 201", async ({ page }) => {
    await page.goto("/login");
    const headers = await csrfHeadersFor(page);
    const res = await page.request.post(`${BASE}/api/auth/register`, {
      data: { username: uid("longpw"), password: "pass1234", name: "Long PW Test" },
      headers,
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.username).toBeDefined();
  });

  // ── 3. Register returns 201 with full user data ────────────────────────
  test("3. Register returns 201 status code with user data", async ({ page }) => {
    const username = uid("status");
    await page.goto("/login");
    const headers = await csrfHeadersFor(page);
    const res = await page.request.post(`${BASE}/api/auth/register`, {
      data: { username, password: "verystrongpw1", name: "Status Test" },
      headers,
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.username).toBe(username);
    expect(body.data.role).toBe("USER");
  });

  // ── 4. Login wrong password returns 401 ────────────────────────────────
  test("4. Login with wrong password returns 401", async ({ page }) => {
    await page.goto("/login");
    const headers = await csrfHeadersFor(page);
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { username: "admin", password: "definitelywrongpassword" },
      headers,
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  // ── 5. Login correct returns success with user data ────────────────────
  test("5. Login with correct credentials returns user data", async ({ page }) => {
    // Must match scripts/ci-seed.mjs default (SEED_ADMIN_PASS) — the CI/local
    // admin is seeded with this credential. Was "admin123" (stale era).
    const adminPass = process.env.SEED_ADMIN_PASS || "admin123456";
    await page.goto("/login");
    const headers = await csrfHeadersFor(page);
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { username: "admin", password: adminPass },
      headers,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    const user = body.data.user;
    expect(user).toBeDefined();
    expect(user.username).toBe("admin");
  });

  // ── 6. Account-level rate limiter: 20+ failed logins → 429 ────────────
  test("6. Account-level rate limiter blocks after 20+ failed logins", async ({ page }) => {
    test.setTimeout(120_000);
    const username = uid("ratelimit");
    await page.goto("/login");
    const headers = await csrfHeadersFor(page);

    // Register a fresh user (separate IP to avoid register limiter collision)
    const regRes = await page.request.post(`${BASE}/api/auth/register`, {
      data: { username, password: "password123", name: "Rate Limit Test" },
      headers: { ...headers, "X-Forwarded-For": "10.0.0.254" },
    });
    expect(regRes.status()).toBe(201);

    // Send 20+ failed logins from the SAME IP+username key (account+IP
    // throttle — the account limiter only fires on FAILED auth, so each
    // attempt increments acct:<ip>:<username>). Sequential keeps the count
    // accurate (avoids race conditions).
    let lastStatus = 200;
    for (let i = 0; i < 22; i++) {
      // Small delay between attempts allows the DB-backed rate limiter to settle
      if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 200));
      const res = await page.request.post(`${BASE}/api/auth/login`, {
        data: { username, password: "wrongpass" },
        headers: { ...headers, "X-Forwarded-For": "10.0.0.254" },
      });
      lastStatus = res.status();
    }

    expect(lastStatus).toBe(429);
  });

  // ── 7. Logout then /me returns 401 ─────────────────────────────────────
  test("7. Logout then GET /api/auth/me returns 401", async ({ page }) => {
    const username = uid("logout");
    await page.goto("/login");
    const headers = await csrfHeadersFor(page);

    const regRes = await page.request.post(`${BASE}/api/auth/register`, {
      data: { username, password: "password123", name: "Logout Test" },
      headers,
    });
    expect(regRes.status()).toBe(201);

    const logoutRes = await page.request.post(`${BASE}/api/auth/logout`, { headers });
    expect(logoutRes.status()).toBe(200);

    const meRes = await page.request.get(`${BASE}/api/auth/me`);
    expect(meRes.status()).toBe(401);
    const meBody = await meRes.json();
    expect(meBody.success).toBe(false);
  });

  // ── 8. Middleware guards /admin ──────────────────────────────────────
  test("8. Middleware redirects unauthenticated /admin to /login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  // ── 9. Middleware guards /owner ──────────────────────────────────────
  test("9. Middleware redirects unauthenticated /owner to /login", async ({ page }) => {
    await page.goto("/owner");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  // ── 10. Session works: /me returns user info after login ─────────────
  test("10. Session persists after login, GET /api/auth/me returns user info", async ({ page }) => {
    const username = uid("session");
    await page.goto("/login");
    const headers = await csrfHeadersFor(page);

    const regRes = await page.request.post(`${BASE}/api/auth/register`, {
      data: { username, password: "password123", name: "Session Test" },
      headers,
    });
    expect(regRes.status()).toBe(201);

    const meRes = await page.request.get(`${BASE}/api/auth/me`);
    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.success).toBe(true);
    expect(meBody.data).toBeDefined();
    expect(meBody.data.authenticated).toBe(true);
    expect(meBody.data.role).toBeDefined();
  });
});