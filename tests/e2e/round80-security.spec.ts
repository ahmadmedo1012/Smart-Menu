/**
 * Round 80 — Deep security audit against LIVE site.
 * Uses page.request (shares session cookies) — the round-79 lesson.
 */
import { test, expect } from "@playwright/test";
import { login } from "./qa-helpers";

const OWNER_A = "testmulti1568"; // restaurants 313/315/316
const OWNER_B = "newuser300528"; // restaurant 317
const PASS = "testpass123";

test("S1: owner A cannot read settings of owner B (IDOR)", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const res = await page.request.get("/api/settings?restaurantId=317", {
    headers: { Accept: "application/json" },
  });
  expect(res.status()).toBe(403);
});

test("S2: owner A cannot read orders of owner B", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const res = await page.request.get("/api/orders?restaurantId=317", {
    headers: { Accept: "application/json" },
  });
  expect(res.status()).toBeGreaterThanOrEqual(401);
});

test("S3: owner A cannot modify owner B restaurant via PATCH", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const cookies = await page.context().cookies();
  const csrf = cookies.find((c) => c.name === "csrf-token")?.value ?? "";
  const res = await page.request.patch("/api/restaurants/317", {
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
  const executed = await page.evaluate(() => (window as any).__xss === 1);
  expect(executed).toBe(false);
  const injected = await page.evaluate(() =>
    Array.from(document.querySelectorAll("script")).some((s) => s.textContent.includes("__xss"))
  );
  expect(injected).toBe(false);
});

test("S7: security headers present on every page", async ({ page }) => {
  const r = await page.request.get("/", { headers: { Accept: "application/json" } });
  const h = r.headers();
  expect(h["x-frame-options"] || h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toBeTruthy();
  expect(h["content-security-policy"]).toBeTruthy();
  expect(h["content-security-policy"]).toContain("frame-src 'none'");
});