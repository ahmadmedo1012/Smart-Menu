/**
 * Round 80 — Deep security audit against LIVE site.
 * Uses page.request (shares session cookies) — the round-79 lesson.
 */
import { test, expect } from "@playwright/test";
import { login } from "./qa-helpers";

const OWNER_A = "testmulti1568"; // restaurants 313/315/316
// Owner B is targeted by restaurant id (317) in the IDOR probes below, not by
// login — the account exists only as the data owner on the other side of the fence.
const OWNER_B_RESTAURANT_ID = 317;
const PASS = "testpass123";

test("S1: owner A cannot read settings of owner B (IDOR)", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const res = await page.request.get(`/api/settings?restaurantId=${OWNER_B_RESTAURANT_ID}`, {
    headers: { Accept: "application/json" },
  });
  expect(res.status()).toBe(403);
});

test("S2: owner A cannot read orders of owner B", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const res = await page.request.get(`/api/orders?restaurantId=${OWNER_B_RESTAURANT_ID}`, {
    headers: { Accept: "application/json" },
  });
  expect(res.status()).toBeGreaterThanOrEqual(401);
});

test("S3: owner A cannot modify owner B restaurant via PATCH", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const cookies = await page.context().cookies();
  const csrf = cookies.find((c) => c.name === "csrf-token")?.value ?? "";
  const res = await page.request.patch(`/api/restaurants/${OWNER_B_RESTAURANT_ID}`, {
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    data: { name: "HACKED" },
  });
  expect(res.status()).toBeGreaterThanOrEqual(403);
});

test("S4: CSRF — mutating POST without token is rejected", async ({ page }) => {
  // No login needed; fresh context has csrf cookie minted by proxy
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const res = await page.request.post("/api/categories", {
    headers: { "Content-Type": "application/json" }, // NO X-CSRF-Token
    data: { name: "csrf-probe", restaurantId: 316 },
  });
  // Either 403 (double-submit) or 401 (no session) — never 201
  expect([401, 403]).toContain(res.status());
});

test("S5: admin API blocked for owner (RBAC)", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  for (const p of ["/api/admin/stats", "/api/admin/users", "/api/admin/config"]) {
    const res = await page.request.get(p, { headers: { Accept: "application/json" } });
    expect(res.status(), p).toBeGreaterThanOrEqual(401);
  }
});

test("S6: XSS payload in item name never executes", async ({ page }) => {
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const executed = await page.evaluate(() => (window as { __xss?: number }).__xss === 1);
  expect(executed).toBe(false);
  const injected = await page.evaluate(() =>
    Array.from(document.querySelectorAll("script")).some((s) => s.textContent.includes("__xss"))
  );
  expect(injected).toBe(false);
});

test("S7: security headers present on every page", async ({ page }) => {
  // HSTS (proxy.ts:63-68): production server + secure request. r94 (W1-b/fix 4):
  // the old VERCEL-gated skip never fired (no runner sets VERCEL) — this WHOLE
  // header check (XFO/nosniff/CSP included) was dead everywhere. Send the
  // TLS-terminating-proxy header like a real front door and assert the exact
  // HSTS value; only non-production servers (dev omits HSTS by design — WebKit
  // plain-http hydration, see proxy.ts) skip honestly.
  test.skip(
    process.env.E2E_SERVER_MODE !== "production",
    "HSTS needs a production-mode server (CI standalone); dev omits it by design"
  );
  const r = await page.request.get("/", {
    headers: { Accept: "application/json", "x-forwarded-proto": "https" },
  });
  const h = r.headers();
  expect(h["x-frame-options"] || h["X-Frame-Options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
  expect(h["content-security-policy"]).toBeTruthy();
  expect(h["content-security-policy"]).toContain("frame-src 'none'");
});