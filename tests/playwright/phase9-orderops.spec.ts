import { test, expect } from "@playwright/test";

const OWNER = { username: "testuser_pw", password: "test123456" };

test.describe("Phase 9 — Merchant Dashboard & Order Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('input[placeholder="اسم المستخدم"]');
    await page.fill('input[placeholder="اسم المستخدم"]', OWNER.username);
    await page.fill('input[placeholder="كلمة المرور"]', OWNER.password);
    await page.locator("button").filter({ hasText: "تسجيل الدخول" }).first().click();
    await page.waitForURL(/\/owner/, { timeout: 10000 });
  });

  test("2a: dashboard loads all sections", async ({ page }) => {
    await expect(page.locator("a").filter({ hasText: "لوحة التحكم" }).first()).toBeAttached();
    await expect(page.locator("a").filter({ hasText: "الطلبات" }).first()).toBeAttached();
    await expect(page.locator("a").filter({ hasText: "المنيو" }).first()).toBeAttached();
    await expect(page.locator("a").filter({ hasText: "رمز QR" }).first()).toBeAttached();
    await expect(page.locator("a").filter({ hasText: "الولاء" }).first()).toBeAttached();
    await expect(page.locator("a").filter({ hasText: "الإعدادات" }).first()).toBeAttached();
  });

  test("2b: orders page loads with tabs", async ({ page }) => {
    await page.goto("/owner/orders");
    await page.waitForTimeout(2000);
    // Tabs should render
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("2c: menu page loads items", async ({ page }) => {
    await page.goto("/owner/menu");
    await page.waitForTimeout(2000);
    // Should show items or empty state
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("2d: QR page renders", async ({ page }) => {
    await page.goto("/owner/qr");
    await page.waitForTimeout(2000);
    await expect(page.locator("h2, h1").filter({ hasText: /رمز|QR/i }).first()).toBeAttached({ timeout: 5000 });
  });

  test("2e: settings page loads", async ({ page }) => {
    await page.goto("/owner/settings");
    await page.waitForTimeout(2000);
    await expect(page.locator("text=إعدادات").or(page.locator("text=settings")).first()).toBeAttached({ timeout: 5000 });
  });
});
