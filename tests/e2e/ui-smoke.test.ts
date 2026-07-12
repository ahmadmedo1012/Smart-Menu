/**
 * UI Smoke Tests — Production sanity checks
 *
 * Runs against the configured baseURL (default: https://menu.smart-link.ly).
 * Verifies core pages load, security headers are present, and auth gates
 * redirect unauthenticated requests properly.
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

test("GET /admin redirects 307 to /login", async ({ request }) => {
  // Disable redirect following so we can inspect the redirect itself
  const res = await request.fetch("/admin", { method: "GET", maxRedirects: 0 });
  expect(res.status()).toBe(307);
  const location = res.headers()["location"] ?? "";
  expect(location).toContain("/login");
});

test("GET /admin/telegram redirects 307 to /login", async ({ request }) => {
  const res = await request.fetch("/admin/telegram", {
    method: "GET",
    maxRedirects: 0,
  });
  expect(res.status()).toBe(307);
  const location = res.headers()["location"] ?? "";
  expect(location).toContain("/login");
});

// ── Security headers (fetched raw via request context) ────────────────

test("response has Content-Security-Policy header", async ({ request }) => {
  const res = await request.get("/");
  const csp = res.headers()["content-security-policy"];
  expect(csp).toBeDefined();
  expect(csp?.length).toBeGreaterThan(0);
});

test("response has Strict-Transport-Security header", async ({ request }) => {
  const res = await request.get("/");
  const hsts = res.headers()["strict-transport-security"];
  expect(hsts).toBeDefined();
  expect(hsts?.length).toBeGreaterThan(0);
});

// ── RTL layout ───────────────────────────────────────────────────────

test('html tag has dir="rtl"', async ({ page }) => {
  await rawResponse(page, "/");
  await page.waitForLoadState("networkidle");
  const dir = await page.locator("html").getAttribute("dir");
  expect(dir).toBe("rtl");
});

// ── Subscribe page (similar to a "connect" onboarding page) ──────────

test("GET /subscribe returns 200 with page content", async ({ page }) => {
  const res = await rawResponse(page, "/subscribe");
  expect(res?.status()).toBe(200);

  await page.waitForLoadState("networkidle");
  const body = page.locator("body");
  await expect(body).toBeVisible();
});

// ── Additional smoke tests ───────────────────────────────────────────

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

test('response has X-Content-Type-Options header', async ({ request }) => {
  const res = await request.get("/");
  const nosniff = res.headers()["x-content-type-options"];
  expect(nosniff).toBe("nosniff");
});
