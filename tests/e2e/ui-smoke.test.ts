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

test("response has Strict-Transport-Security header", async ({ request }) => {
  const res = await request.get("/");
  const headers = await res.headers();
  const hsts = headers["strict-transport-security"];
  expect(hsts).toBeDefined();
  expect(hsts?.length).toBeGreaterThan(0);
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

// ── Connect / Telegram ──────────────────────────────────────────────

test("GET /connect/telegram responds with a page", async ({ page }) => {
  const res = await rawResponse(page, "/connect/telegram");
  // Route does not exist yet — expect a response with visible body (404 page)
  expect(res?.status()).toBe(404);

  await page.waitForLoadState("networkidle");
  const body = page.locator("body");
  await expect(body).toBeVisible();
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
