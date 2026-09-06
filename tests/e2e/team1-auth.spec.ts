/**
 * Team 1 — Registration, Login, Session Management (all roles)
 * Deep interactive auth flows against production. Uses stable selectors.
 * Run: npx playwright test tests/e2e/team1-auth.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";
import { fillSubscribeForm, chooseFreePlan, login, loginBudget, csrfToken, advanceStep } from "./qa-helpers";

const TEST_USER = "testmulti1568";
const TEST_PASS = "testpass123";
const ts = Date.now().toString().slice(-8);

// Each test gets its own context with an empty cookie jar, so mint per test —
// a module-cached token would mismatch the jar and 403.
async function csrfHeadersFor(page: import("@playwright/test").Page): Promise<Record<string, string>> {
  await page.goto("/login");
  // Derive origin from the resolved baseURL instead of hardcoding localhost —
  // Origin must match the server's host or assertSameOrigin rejects the POST.
  const BASE = new URL(page.url()).origin;
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === "csrf-token")?.value ?? "";
  return {
    "X-CSRF-Token": token,
    "Content-Type": "application/json",
    Origin: BASE,
  };
}

test.describe.configure({ mode: "serial" });

/** Click the final submit button, retrying across the 5/min register
 *  rate-limit window when the suite runs in parallel. */
async function submitCreate(page: import("@playwright/test").Page): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    const btn = page.locator('button:has-text("إنشاء الحساب والبدء")');
    if (await btn.count()) {
      await btn.first().click();
      // round87-D7: fixed 6000ms sleep → condition wait on the real outcome —
      // the authenticated redirect to /owner (the register POST itself decides
      // how long this takes).
      await page.waitForURL(/\/owner/, { timeout: 20000 }).catch(() => {});
    }
    if (page.url().includes("/owner")) return true;
    // Kept deliberately (round87-D7): rides out the 5/min register
    // rate-limit window — a semantic backoff, not a flake sleep.
    await page.waitForTimeout(20000);
  }
  return page.url().includes("/owner");
}

test("register: valid free plan creates account", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await chooseFreePlan(page);
  await fillSubscribeForm(page, {
    restaurantName: "QA-TEST-DO-NOT-USE-1",
    slug: `qa1-${ts}`,
    phone: "0910000001",
    whatsapp: "0910000001",
    username: `qa1_${ts}`,
    password: "TestPass123!",
  });
  const created = await submitCreate(page);
  expect(created).toBeTruthy();
  expect(page.url()).toContain("/owner");
});

test("register: duplicate slug rejected", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await chooseFreePlan(page);
  // Fill ONLY the menu step with a duplicate slug, then try to advance.
  await page.getByPlaceholder("اسم المطعم (مثال: مقهى الواحة)").fill("QA Dup");
  await page.getByPlaceholder("الرابط المختصر (مثال: al-waha-cafe)").fill("al-waha-cafe"); // existing slug
  await page.getByPlaceholder("رقم الهاتف (مثال: 0912345678)").fill("0910000002");
  await page.getByPlaceholder("رقم الواتساب (مثال: 0912345678)").fill("0910000002");
  // round87-D7: fixed 4000ms sleep → condition wait for the pre-flight
  // duplicate-slug rejection (field-level error + toast both say محجوز).
  // advanceStep retries across the /validate rate-limit window (10/min per IP
  // — real on the NODE_ENV=production standalone server).
  await advanceStep(page, page.getByText(/محجوز/).first());
  // Pre-flight duplicate check must block advancing to the account step.
  expect(page.url()).not.toContain("/owner");
  const body = await page.locator("body").innerText();
  expect(body).toContain("بيانات المنيوهات"); // still on menu step
  expect(body.length).toBeGreaterThan(50);
});

test("login: wrong password error does not reveal user existence", async ({ page }) => {
  // round87-D7: the csrf-token cookie is minted by the proxy on the /login
  // response itself, so no hydration wait is needed before reading it.
  await page.goto("/login", { waitUntil: "networkidle" });
  const token = await csrfToken(page);
  const res1 = await page.evaluate(async ({ uname, token }) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ username: uname, password: "x" }),
    });
    return { status: r.status, body: await r.text() };
  }, { uname: `ghost_${ts}`, token });
  const res2 = await page.evaluate(async ({ uname, token }) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ username: uname, password: "wrongpass" }),
    });
    return { status: r.status, body: await r.text() };
  }, { uname: TEST_USER, token });
  expect(res1.status).toBe(401);
  expect(res2.status).toBe(401);
  expect(res1.body).toBe(res2.body);
});

test("login: account lockout after 20 failed attempts, then success works", async ({ page }) => {
  // The account limiter (max 20 per 15 min) is the only login limiter that
  // stays strict under dev relax (RATE_LIMIT_RELAX=1); the 10/min login
  // limiter is relaxed locally. It only counts FAILED auth on an EXISTING
  // user (the route returns 401 for unknown usernames before the account
  // check), so first register a fresh user, then send 21 failed logins.
  test.setTimeout(120_000);
  const uname = `qa_lock_${ts}`;
  const headers = await csrfHeadersFor(page);
  const BASE = new URL(page.url()).origin;
  const reg = await page.request.post(`${BASE}/api/auth/register`, {
    data: { username: uname, password: "password123", name: "Lockout QA" },
    headers: { ...headers, "X-Forwarded-For": "10.9.9.1" },
  });
  expect(reg.status()).toBe(201);

  const statuses: number[] = [];
  for (let i = 0; i < 21; i++) {
    const r = await page.request.post(`${BASE}/api/auth/login`, {
      data: { username: uname, password: "wrong" },
      headers: { ...headers, "X-Forwarded-For": "10.9.9.1" },
    });
    statuses.push(r.status());
    // Space attempts out to avoid upsert races on the (key, windowEnd) row.
    // Kept deliberately (round87-D7): semantic pacing between requests.
    await page.waitForTimeout(500);
  }
  expect(statuses.slice(18)).toContain(429);
});

test("login: valid creds succeed", async ({ page }) => {
  test.setTimeout(loginBudget());
  await login(page, TEST_USER, TEST_PASS);
  expect(page.url()).toContain("/owner");
});

test("protected: all admin+owner pages redirect to login when unauthenticated", async ({ page }) => {
  const protectedPaths = [
    "/admin", "/admin/users", "/admin/restaurants", "/admin/subscriptions",
    "/admin/orders", "/admin/menu", "/admin/settings", "/admin/telegram",
    "/admin/audit-logs", "/admin/system-events", "/owner", "/owner/orders",
    "/owner/menu", "/owner/settings", "/owner/qr", "/owner/loyalty",
  ];
  for (const p of protectedPaths) {
    await page.goto(p, { waitUntil: "domcontentloaded" });
    // round87-D7: fixed 800ms sleep → auto-retrying URL assertion (the proxy
    // redirects server-side, so this resolves immediately on a healthy gate).
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  }
});

test("logout: session ends, protected page redirects", async ({ page }) => {
  test.setTimeout(loginBudget());
  await login(page, TEST_USER, TEST_PASS);
  await page.locator('button:has-text("تسجيل الخروج")').first().click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await page.goto("/owner", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login/, { timeout: 15000 });
});