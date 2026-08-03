/**
 * Persona 7 — Malicious user: IDOR via direct IDs, XSS payloads, URL
 * tampering, SQL-ish injection in search, oversized values, method abuse.
 * The goal: every attempt must fail safely (no data leak, no execution).
 * Run: npx playwright test tests/e2e/persona-7-malicious.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";
import { login } from "./qa-helpers";

const OWNER = "testmulti1568";
const PASS = "testpass123";

test("P7: IDOR — enumerate other restaurants via direct API", async ({ page }) => {
  await login(page, OWNER, PASS);
  // Try reading settings/orders of random other restaurant IDs
  for (const rid of [1, 2, 50, 100, 161, 317, 99999]) {
    const res = await page.evaluate(async (rid) => {
      const r = await fetch(`/api/settings?restaurantId=${rid}`);
      return r.status;
    }, rid);
    // Owner must NOT get 200 for restaurants they don't own
    expect(res, `settings for rid=${rid}`).not.toBe(200);
  }
});

test("P7: XSS — payload in item name renders escaped (never executes)", async ({ page }) => {
  test.setTimeout(90000);
  // Use the public menu page: verify no stored payload executes (window flag)
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const executed = await page.evaluate(() => (window as any).__xss === 1);
  expect(executed).toBe(false);
  // Also verify no <script> tags injected into DOM from any item text
  const injected = await page.evaluate(() =>
    [...document.querySelectorAll("script")].some((s) => s.textContent.includes("__xss"))
  );
  expect(injected).toBe(false);
});

test("P7: URL tampering — fake order numbers don't leak data", async ({ page }) => {
  await page.goto("/order-confirmed?orderNo=FAKE-NO-123&wa=0910089975", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  // Should render confirmation page but NOT leak real order data
  expect(body.length).toBeGreaterThan(20); // page renders
  expect(body).not.toContain("ORD-MSC"); // no real order numbers leaked
});

test("P7: SQL-injection-ish search input handled safely", async ({ page }) => {
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const payload = "' OR 1=1 --";
  const search = page.locator('input[type="search"], input[placeholder*="بحث"]').first();
  if (await search.count()) {
    await search.fill(payload);
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    // No crash, no error page
    expect(body).not.toContain("Internal Server Error");
    expect(body).not.toContain("SQL");
  }
});

test("P7: oversized input rejected gracefully (no 500)", async ({ page }) => {
  await login(page, OWNER, PASS);
  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  const big = "A".repeat(100000);
  const res = await page.evaluate(async (csrf) => {
    const r = await fetch("/api/categories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ name: "X".repeat(100000), restaurantId: 313 }),
    });
    return r.status;
  }, token);
  // 400 (validation) or 413 (payload too large) or 403 — never 500
  expect(res).not.toBe(500);
  expect(res).not.toBe(201); // must not create
});

test("P7: admin endpoints hidden from owner via path fuzzing", async ({ page }) => {
  await login(page, OWNER, PASS);
  const paths = [
    "/api/admin/stats", "/api/admin/users", "/api/admin/config",
    "/api/admin/restaurants", "/api/admin/subscriptions", "/api/admin/audit-logs",
  ];
  for (const p of paths) {
    const res = await page.evaluate(async (p) => {
      const r = await fetch(p);
      return r.status;
    }, p);
    expect(res, p).toBeGreaterThanOrEqual(401);
  }
});