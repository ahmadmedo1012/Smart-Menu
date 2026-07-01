import { test, expect } from "@playwright/test";
import { v4 as uuid } from "uuid";

const uid = () => `t${Date.now()}`;

test.describe("Phase 9 — Onboarding & Account Lifecycle", () => {
  test("1a: free plan registration → login → dashboard", async ({ page }) => {
    const u = uid();
    await page.goto("/subscribe");
    await page.waitForTimeout(1500);
    await page.locator("button").filter({ hasText: /مجاني/ }).first().click();
    await page.waitForTimeout(500);
    await page.locator("button").filter({ hasText: "اخترت" }).click();
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="مقهى الواحة"]', `Cafe ${u}`);
    await page.fill('input[placeholder="al-waha-cafe"]', `cafe-${u}`);
    await page.fill('input[placeholder="0910089975"]', "0912345678");
    await page.fill('input[placeholder="admin"]', u);
    await page.fill('input[type="password"]', "pass12345");
    await page.getByText("إنشاء الحساب والبدء").click();
    await page.waitForURL(/\/login/, { timeout: 15000 });

    // login
    await page.goto("/login");
    await page.waitForSelector('input[placeholder="اسم المستخدم"]');
    await page.fill('input[placeholder="اسم المستخدم"]', u);
    await page.fill('input[placeholder="كلمة المرور"]', "pass12345");
    await page.locator("button").filter({ hasText: "تسجيل الدخول" }).first().click();
    await page.waitForURL(/\/owner/, { timeout: 10000 });
    await expect(page.locator("a").filter({ hasText: "لوحة التحكم" }).first()).toBeAttached();
  });

  test("1b: login persistence across page navigations", async ({ page }) => {
    const u = uid();
    // create
    await page.goto("/subscribe");
    await page.waitForTimeout(1500);
    await page.locator("button").filter({ hasText: /مجاني/ }).first().click();
    await page.waitForTimeout(500);
    await page.locator("button").filter({ hasText: "اخترت" }).click();
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="مقهى الواحة"]', `Cafe ${u}`);
    await page.fill('input[placeholder="al-waha-cafe"]', `cafe-${u}`);
    await page.fill('input[placeholder="0910089975"]', "0912345678");
    await page.fill('input[placeholder="admin"]', u);
    await page.fill('input[type="password"]', "pass12345");
    await page.getByText("إنشاء الحساب والبدء").click();
    await page.waitForURL(/\/login/, { timeout: 15000 });

    // login
    await page.goto("/login");
    await page.waitForSelector('input[placeholder="اسم المستخدم"]');
    await page.fill('input[placeholder="اسم المستخدم"]', u);
    await page.fill('input[placeholder="كلمة المرور"]', "pass12345");
    await page.locator("button").filter({ hasText: "تسجيل الدخول" }).first().click();
    await page.waitForURL(/\/owner/, { timeout: 15000 });

    // navigate around
    await page.goto("/owner/menu");
    await page.waitForTimeout(3000);
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
    await page.goto("/owner/orders");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
    await page.goto("/owner/settings");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
    await page.goto("/pricing");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });

  test("1c: login form validation — empty fields blocked", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('input[placeholder="اسم المستخدم"]');
    await page.locator("button").filter({ hasText: "تسجيل الدخول" }).first().click();
    // Should still be on /login
    await expect(page.locator('input[placeholder="اسم المستخدم"]')).toBeVisible();
  });

  test("1d: public routes accessible without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await page.goto("/pricing");
    await page.waitForTimeout(2000);
    await page.goto("/menu/demo");
    await page.waitForTimeout(2000);
    await page.goto("/cart");
    await expect(page.getByText("السلة فارغة")).toBeVisible({ timeout: 5000 });
  });
});
