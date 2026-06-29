import { test, expect } from "@playwright/test";

test.describe("Visual — Component Interaction States", () => {
  test("hero CTA button hover", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const ctas = page.locator("a[href='/subscribe'], a[href='/pricing']");
    const count = await ctas.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      await ctas.nth(i).hover({ force: true, timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(200);
    }
  });

  test("login form focus states", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('input[placeholder="اسم المستخدم"]');
    const input = page.locator('input[placeholder="اسم المستخدم"]');
    await input.focus();
    await page.waitForTimeout(300);
    await expect(input).toBeFocused();
  });

  test("owner sidebar nav navigation", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('input[placeholder="اسم المستخدم"]');
    await page.fill('input[placeholder="اسم المستخدم"]', "testuser_pw");
    await page.fill('input[placeholder="كلمة المرور"]', "test123456");
    await page.locator("button").filter({ hasText: "تسجيل الدخول" }).first().click();
    await page.waitForURL(/\/owner/, { timeout: 10000 });

    for (const s of ["/owner/menu", "/owner/orders", "/owner/qr", "/owner/settings"]) {
      await page.goto(s, { timeout: 10000 });
      await page.waitForTimeout(800);
    }
  });
});
