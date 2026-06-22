import { test, expect } from "@playwright/test";

test.describe("Authentication — Login Page", () => {
  test("login page loads with all form fields", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Check heading
    await expect(page.getByText("الربط الذكي")).toBeVisible();
    await expect(page.getByText("لوحة تحكم المطاعم")).toBeVisible();

    // Check form fields
    await expect(page.getByLabel("اسم المستخدم")).toBeVisible();
    await expect(page.getByLabel("كلمة المرور")).toBeVisible();

    // Check submit button
    await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();
  });

  test("password visibility toggle works", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.getByLabel("كلمة المرور");
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click the eye toggle
    const toggleButton = page.getByLabel("إظهار كلمة المرور");
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Toggle back
    const hideButton = page.getByLabel("إخفاء كلمة المرور");
    await hideButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("theme toggle button is present", async ({ page }) => {
    await page.goto("/login");
    const themeToggle = page.getByLabel("تبديل الثيم");
    await expect(themeToggle).toBeVisible();
  });

  test("empty form submission does not navigate away", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    // Should still be on login page (form validation prevents submission)
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page redirect param is preserved after navigation", async ({ page }) => {
    // Simulate being redirected from admin
    await page.goto("/login?redirect=%2Fadmin", { waitUntil: "domcontentloaded" });

    // The redirect param should be in the URL
    expect(page.url()).toContain("redirect=%2Fadmin");
  });
});

test.describe("Authentication — Form Interaction", () => {
  test("can type into username and password fields", async ({ page }) => {
    await page.goto("/login");

    const usernameInput = page.getByLabel("اسم المستخدم");
    await usernameInput.fill("test_user");
    await expect(usernameInput).toHaveValue("test_user");

    const passwordInput = page.getByLabel("كلمة المرور");
    await passwordInput.fill("test_pass");
    await expect(passwordInput).toHaveValue("test_pass");
  });

  test("username field is auto-focused", async ({ page }) => {
    await page.goto("/login");
    const usernameInput = page.getByLabel("اسم المستخدم");
    await expect(usernameInput).toBeFocused();
  });
});

test.describe("Authentication — Invalid Credentials", () => {
  test("invalid credentials show error toast", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("اسم المستخدم").fill("nonexistent");
    await page.getByLabel("كلمة المرور").fill("wrongpassword");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();

    // Wait for the toast to appear (sonner creates a toast with role="status")
    await page.waitForTimeout(2000);
    const toast = page.locator("[data-sonner-toaster]");
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test("invalid credentials do not redirect", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("اسم المستخدم").fill("baduser");
    await page.getByLabel("كلمة المرور").fill("badpass");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();

    // Should stay on login page after failure
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Authentication — Unauthenticated Access", () => {
  const PROTECTED_ROUTES = [
    "/admin",
    "/admin/restaurants",
    "/admin/orders",
    "/admin/users",
    "/admin/menu",
    "/admin/settings",
    "/admin/qr",
    "/owner",
    "/owner/menu",
    "/owner/orders",
    "/owner/loyalty",
    "/owner/qr",
  ];

  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to login`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Authentication — Unknown routes", () => {
  test("unknown route redirects to login", async ({ page }) => {
    await page.goto("/nonexistent-route", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("deep unknown route redirects", async ({ page }) => {
    await page.goto("/admin/some/deep/path/that/does/not/exist", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });
});
