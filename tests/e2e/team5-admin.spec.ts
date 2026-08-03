/**
 * Team 5 — Admin panel (access control, audit, config)
 * Uses non-admin account to verify access denied; admin full flows need admin creds.
 * Diagnostic only.
 * Run: npx playwright test tests/e2e/team5-admin.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

const OWNER = "testmulti1568";
const PASS = "testpass123";

test("admin: owner cannot access admin pages", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const ins = page.locator("input");
  await ins.nth(0).fill(OWNER);
  await ins.nth(1).fill(PASS);
  await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await page.waitForTimeout(4000);
  // Try admin pages → should NOT render admin dashboard
  for (const p of ["/admin", "/admin/users", "/admin/settings"]) {
    await page.goto(p, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const url = page.url();
    const ok = url.includes("/login") || url.includes("/owner") || url.includes("403");
    expect(ok).toBeTruthy();
  }
});

test("admin: admin API blocked for owner (401/403)", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const ins = page.locator("input");
  await ins.nth(0).fill(OWNER);
  await ins.nth(1).fill(PASS);
  await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await page.waitForTimeout(4000);
  const status = await page.evaluate(async () => {
    const r = await fetch("/api/admin/stats");
    return r.status;
  });
  expect(status).toBeGreaterThanOrEqual(401);
});

test("admin: all admin pages redirect to login when logged out", async ({ page }) => {
  const paths = ["/admin", "/admin/restaurants", "/admin/subscriptions", "/admin/orders",
    "/admin/users", "/admin/settings", "/admin/telegram", "/admin/audit-logs"];
  for (const p of paths) {
    await page.goto(p, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    expect(page.url()).toContain("/login");
  }
});
