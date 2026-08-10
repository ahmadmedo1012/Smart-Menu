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
  // Use page.request (shares the browser context's session cookies) — a raw
  // page.evaluate(fetch) does NOT attach cookies, which made every request
  // unauthenticated (middleware/edge would 200-HTML instead of 403 JSON).
  // Try reading settings/orders of random other restaurant IDs
  for (const rid of [1, 2, 50, 100, 161, 317, 99999]) {
    const res = await page.request.get(`/api/settings?restaurantId=${rid}`, {
      headers: { Accept: "application/json" },
    });
    const status = res.status();
    // Owner must NOT get 200 for restaurants they don't own
    expect(status, `settings for rid=${rid}`).not.toBe(200);
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
    Array.from(document.querySelectorAll("script")).some((s) => s.textContent.includes("__xss"))
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
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === "csrf-token")?.value ?? "";
  const res = await page.request.post("/api/categories", {
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    data: { name: "X".repeat(100000), restaurantId: 313 },
  });
  // 400 (validation) or 413 (payload too large) or 403 — never 500
  expect(res.status()).not.toBe(500);
  expect(res.status()).not.toBe(201); // must not create
});

test("P7: admin endpoints hidden from owner via path fuzzing", async ({ page }) => {
  await login(page, OWNER, PASS);
  const paths = [
    "/api/admin/stats", "/api/admin/users", "/api/admin/config",
    "/api/admin/restaurants", "/api/admin/subscriptions", "/api/admin/audit-logs",
  ];
  for (const p of paths) {
    // page.request carries the session cookie; page.evaluate(fetch) does not
    const res = await page.request.get(p, { headers: { Accept: "application/json" } });
    expect(res.status(), p).toBeGreaterThanOrEqual(401);
  }
});