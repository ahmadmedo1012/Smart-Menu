/**
 * UI Smoke Tests — Production sanity checks
 *
 * Runs against baseURL (default: https://menu.smart-link.ly).
 * Verifies core pages, security headers, auth gates, and RTL layout.
 *
 * Run:  npx playwright test tests/e2e/ui-smoke.test.ts
 */
import { test, expect } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────

async function rawResponse(page, url: string) {
  return await page.goto(url, { waitUntil: "commit" });
}

// ── Landing page ─────────────────────────────────────────────────────

test("GET / returns 200", async ({ page }) => {
  const res = await rawResponse(page, "/");
  expect(res?.status()).toBe(200);
});

// ── Login page ───────────────────────────────────────────────────────

test("GET /login returns 200 with form inputs", async ({ page }) => {
  const res = await rawResponse(page, "/login");
  expect(res?.status()).toBe(200);

  await page.waitForLoadState("networkidle");
  const inputs = page.locator("input");
  await expect(inputs.first()).toBeVisible();
  const count = await inputs.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

// ── Pricing page ─────────────────────────────────────────────────────

test("GET /pricing returns 200 with pricing content", async ({ page }) => {
  const res = await rawResponse(page, "/pricing");
  expect(res?.status()).toBe(200);

  await page.waitForLoadState("networkidle");
  const body = page.locator("body");
  await expect(body).toBeVisible();
});

// ── Auth gates (redirect unauthenticated) ────────────────────────────

test("GET /admin redirects to /login", async ({ request }) => {
  const res = await request.get("/admin", { maxRedirects: 0 });
  const status = res.status();
  expect(status).toBeGreaterThanOrEqual(300);
  expect(status).toBeLessThan(400);
  const headers = await res.headers();
  expect(headers["location"]).toContain("/login");
});

test("GET /admin/telegram redirects to /login", async ({ request }) => {
  const res = await request.get("/admin/telegram", { maxRedirects: 0 });
  const status = res.status();
  expect(status).toBeGreaterThanOrEqual(300);
  expect(status).toBeLessThan(400);
  const headers = await res.headers();
  expect(headers["location"]).toContain("/login");
});

// ── Security headers (fetched raw via request context) ────────────────
// NOTE: res.headers() is async — must use await.

test("response has Content-Security-Policy header", async ({ request }) => {
  const res = await request.get("/");
  const headers = await res.headers();
  expect(headers["content-security-policy"]).toBeDefined();
  expect(headers["content-security-policy"]?.length).toBeGreaterThan(0);
});

// HSTS (proxy.ts:63-68) is emitted when the SERVER runs NODE_ENV=production AND
// the request is secure — https OR the documented TLS-terminating-proxy header
// x-forwarded-proto: https (proxy.ts:27-32). r94 (W1-b/fix 4): the old skip
// keyed on process.env.VERCEL, which NO runner (CI, nightly, prod-qa) ever
// sets — the test was dead everywhere. Now we send the proxy header (exactly
// what a real TLS front door forwards) and assert the exact value; CI marks
// its standalone production build with E2E_SERVER_MODE=production. Dev servers
// (no HSTS by design — WebKit plain-http hydration, see proxy.ts) skip honestly.
test("response has Strict-Transport-Security header", async ({ request }) => {
  test.skip(
    process.env.E2E_SERVER_MODE !== "production",
    "HSTS needs a production-mode server (CI standalone); dev omits it by design"
  );
  const res = await request.get("/", { headers: { "x-forwarded-proto": "https" } });
  const headers = await res.headers();
  expect(headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
});

test("response has X-Content-Type-Options: nosniff header", async ({ request }) => {
  const res = await request.get("/");
  const headers = await res.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

// ── RTL layout ───────────────────────────────────────────────────────

test('html tag has dir="rtl"', async ({ page }) => {
  await rawResponse(page, "/");
  await page.waitForLoadState("networkidle");
  const dir = await page.locator("html").getAttribute("dir");
  expect(dir).toBe("rtl");
});

// ── Additional smoke tests ───────────────────────────────────────────

test("GET /subscribe returns 200 with page content", async ({ page }) => {
  const res = await rawResponse(page, "/subscribe");
  expect(res?.status()).toBe(200);

  await page.waitForLoadState("networkidle");
  const body = page.locator("body");
  await expect(body).toBeVisible();
});

test("GET /cart returns 200", async ({ page }) => {
  const res = await rawResponse(page, "/cart");
  expect(res?.status()).toBe(200);
});

test("GET /terms returns 200 with page content", async ({ page }) => {
  const res = await rawResponse(page, "/terms");
  expect(res?.status()).toBe(200);

  await page.waitForLoadState("networkidle");
  const body = page.locator("body");
  await expect(body).toBeVisible();
});

test("GET /privacy returns 200", async ({ page }) => {
  const res = await rawResponse(page, "/privacy");
  expect(res?.status()).toBe(200);
});
