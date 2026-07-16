import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3000" });

const BASE = "http://localhost:3000";

const uid = (label = "user") => `${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

test.describe("Auth Fix Verification", () => {
  // ── 1. Register min-length 8: short password fails ─────────────────────
  test("1. Register with password < 8 chars returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { username: uid("short"), password: "123456", name: "Short PW Test" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  // ── 2. Register min-length 8: sufficient password succeeds ─────────────
  test("2. Register with password >= 8 chars returns 201", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { username: uid("longpw"), password: "pass1234", name: "Long PW Test" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.username).toBeDefined();
  });

  // ── 3. Register returns 201 with full user data ────────────────────────
  test("3. Register returns 201 status code with user data", async ({ request }) => {
    const username = uid("status");
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { username, password: "verystrongpw1", name: "Status Test" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe(username);
    expect(body.user.role).toBe("USER");
  });

  // ── 4. Login wrong password returns 401 ────────────────────────────────
  test("4. Login with wrong password returns 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { username: "admin", password: "definitelywrongpassword" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  // ── 5. Login correct returns success with user data ────────────────────
  test("5. Login with correct credentials returns user data", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { username: "admin", password: "admin123" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe("admin");
  });

  // ── 6. Account-level rate limiter: 20+ failed logins → 429 ────────────
  test("6. Account-level rate limiter blocks after 20+ failed logins", async ({ request }) => {
    test.setTimeout(120_000);
    const username = uid("ratelimit");

    // Register a fresh user (separate IP to avoid register limiter collision)
    const regRes = await request.post(`${BASE}/api/auth/register`, {
      data: { username, password: "password123", name: "Rate Limit Test" },
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.254" },
    });
    expect(regRes.status()).toBe(201);

    // Send 22 failed logins sequentially with rotating IPs.
    // Sequential ensures the rate limiter count is accurate (avoids race conditions).
    let lastStatus = 200;
    for (let i = 0; i < 22; i++) {
      // Small delay between attempts allows the DB-backed rate limiter to settle
      if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 200));
      const fakeIp = `10.0.0.${Math.floor(i / 10)}`;
      const res = await request.post(`${BASE}/api/auth/login`, {
        data: { username, password: "wrongpass" },
        headers: { "Content-Type": "application/json", "X-Forwarded-For": fakeIp },
      });
      lastStatus = res.status();
    }

    expect(lastStatus).toBe(429);
  });

  // ── 7. Logout then /me returns 401 ─────────────────────────────────────
  test("7. Logout then GET /api/auth/me returns 401", async ({ request }) => {
    const username = uid("logout");

    const regRes = await request.post(`${BASE}/api/auth/register`, {
      data: { username, password: "password123", name: "Logout Test" },
      headers: { "Content-Type": "application/json" },
    });
    expect(regRes.status()).toBe(201);

    const logoutRes = await request.post(`${BASE}/api/auth/logout`);
    expect(logoutRes.status()).toBe(200);

    const meRes = await request.get(`${BASE}/api/auth/me`);
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
  test("10. Session persists after login, GET /api/auth/me returns user info", async ({ request }) => {
    const username = uid("session");

    const regRes = await request.post(`${BASE}/api/auth/register`, {
      data: { username, password: "password123", name: "Session Test" },
      headers: { "Content-Type": "application/json" },
    });
    expect(regRes.status()).toBe(201);

    const meRes = await request.get(`${BASE}/api/auth/me`);
    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.success).toBe(true);
    expect(meBody.data).toBeDefined();
    expect(meBody.data.authenticated).toBe(true);
    expect(meBody.data.role).toBeDefined();
  });
});
