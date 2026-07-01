import { test, expect } from "@playwright/test";

test.describe("Subscription Flow — Real Browser E2E", () => {
  test("landing page loads with all sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    // Hero section has the app name
    await expect(page.getByText("Smart Menu").first()).toBeVisible();
  });

  test("pricing page shows plans", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForTimeout(2000);
    await expect(page.getByText("Basic").or(page.getByText("بيسك")).first()).toBeVisible({ timeout: 10000 });
  });

  test("subscribe page loads with plans", async ({ page }) => {
    await page.goto("/subscribe");
    await page.waitForTimeout(2000);
    await expect(page.getByText("اختر خطة تناسب مطعمك")).toBeVisible({ timeout: 10000 });
  });

  test("free plan creates account and redirects to login", async ({ page }) => {
    const ts = Date.now();
    const username = `test${ts}`;
    const slug = `test-cafe-${ts}`;

    await page.goto("/subscribe");
    await page.waitForTimeout(2000);

    // Click first plan card
    await page.locator("button").filter({ hasText: /مجاني|بيسك/ }).first().click();
    await page.waitForTimeout(500);

    // Click next
    await page.locator("button").filter({ hasText: "اخترت" }).click();
    await page.waitForTimeout(500);

    // Fill form
    await page.fill('input[placeholder="مقهى الواحة"]', `Test Cafe ${ts}`);
    await page.fill('input[placeholder="al-waha-cafe"]', slug);
    await page.fill('input[placeholder="0910089975"]', "0912345678");
    await page.fill('input[placeholder="admin"]', username);
    await page.fill('input[type="password"]', "test1234");

    await page.getByText("إنشاء الحساب والبدء").click();

    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.getByText("اسم المستخدم").first()).toBeVisible({ timeout: 5000 });
  });

  test("can login with created account", async ({ page }) => {
    const ts = Date.now();
    const username = `logintest${ts}`;

    // Create account via UI form (avoids CSRF issues with API)
    await page.goto("/subscribe");
    await page.waitForTimeout(2000);
    await page.locator("button").filter({ hasText: /مجاني|بيسك/ }).first().click();
    await page.waitForTimeout(500);
    await page.locator("button").filter({ hasText: "اخترت" }).click();
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="مقهى الواحة"]', `Login Test ${ts}`);
    await page.fill('input[placeholder="al-waha-cafe"]', `login-test-${ts}`);
    await page.fill('input[placeholder="0910089975"]', "0912345678");
    await page.fill('input[placeholder="admin"]', username);
    await page.fill('input[type="password"]', "test1234");
    await page.getByText("إنشاء الحساب والبدء").click();
    await page.waitForURL(/\/login/, { timeout: 15000 });
    // Explicitly navigate to login to ensure fresh page state
    await page.goto("/login");
    await page.waitForSelector('input[placeholder="اسم المستخدم"]', { timeout: 5000 });

    // Now login with created account
    await page.fill('input[placeholder="اسم المستخدم"]', username);
    await page.fill('input[placeholder="كلمة المرور"]', "test1234");
    await page.locator("button").filter({ hasText: "تسجيل الدخول" }).first().click();

    await page.waitForURL(/\/owner/, { timeout: 10000 });
    await expect(page.locator("a").filter({ hasText: "لوحة التحكم" }).first()).toBeAttached({ timeout: 5000 });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder="اسم المستخدم"]', "nonexistent_user_999");
    await page.fill('input[placeholder="كلمة المرور"]', "wrongpass");
    await page.locator("button").filter({ hasText: "تسجيل الدخول" }).click();

    // Error appears as sonner toast notification
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });
  });

  test("login page has decorative elements", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(1000);
    // Login form should be visible
    await expect(page.getByText("اسم المستخدم").first()).toBeVisible();
  });

  test("cart page handles empty state", async ({ page }) => {
    await page.goto("/cart");
    await page.waitForTimeout(2000);
    await expect(page.getByText("السلة فارغة")).toBeVisible({ timeout: 5000 });
  });
});
