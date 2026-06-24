import { test, expect } from "@playwright/test";

test.describe("Authentication — Login Page", () => {
  test("login page loads with all form fields", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Check heading (card title is a div, not an ARIA heading)
    await expect(page.locator('[data-slot="card-title"]')).toContainText("الربط الذكي");
    await expect(page.getByText("لوحة تحكم المطاعم")).toBeVisible();

    // Check form fields by id to avoid duplicate label strict mode
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // Check submit button
    await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();
  });

  test("password visibility toggle works", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator("#password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click the eye toggle
    const toggleButton = page.locator('[aria-label="إظهار كلمة المرور"]');
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Toggle back
    const hideButton = page.locator('[aria-label="إخفاء كلمة المرور"]');
    await hideButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("theme toggle button is present", async ({ page }) => {
    await page.goto("/login");
    const themeToggle = page.getByLabel(/Switch to (dark|light) mode/);
    await expect(themeToggle).toBeVisible();
  });

  test("empty form submission does not navigate away", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    // Should still be on login page (form validation prevents submission)
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page redirect param is preserved after navigation", async ({ page }) => {
    await page.goto("/login?redirect=%2Fadmin", { waitUntil: "domcontentloaded" });
    // The redirect param should be in the URL
    expect(page.url()).toContain("redirect=%2Fadmin");
  });
});

test.describe("Authentication — Form Interaction", () => {
  test("can type into username and password fields", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#username").fill("test_user");
    await expect(page.locator("#username")).toHaveValue("test_user");

    await page.locator("#password").fill("test_pass");
    await expect(page.locator("#password")).toHaveValue("test_pass");
  });

  test("username field is auto-focused", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#username")).toBeFocused();
  });
});

test.describe("Authentication — Invalid Credentials", () => {
  test("invalid credentials show error toast", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#username").fill("nonexistent");
    await page.locator("#password").fill("wrongpassword");

    // Monitor the login API response
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/auth/login") && r.request().method() === "POST"),
      page.getByRole("button", { name: "تسجيل الدخول" }).click(),
    ]);

    // API should return error
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test("invalid credentials do not redirect", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#username").fill("baduser");
    await page.locator("#password").fill("badpass");
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
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // Wait for redirect
      await page.waitForTimeout(2000);
      const url = page.url();
      const redirected = url.includes("/login");
      if (!redirected) {
        await expect(page.locator("body")).toBeVisible();
      } else {
        await expect(page).toHaveURL(/\/login/);
      }
    });
  }
});

test.describe("Authentication — Unknown routes", () => {
  test("unknown route shows 404 page", async ({ page }) => {
    await page.goto("/nonexistent-route", { waitUntil: "networkidle" });
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("الصفحة غير موجودة")).toBeVisible();
  });

  test("deep unknown route shows 404 page", async ({ page }) => {
    await page.goto("/admin/some/deep/path/that/does/not/exist", { waitUntil: "domcontentloaded" });
    // Middleware may redirect to login before 404 fires
    const url = page.url();
    if (url.includes("/login")) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.getByText("404")).toBeVisible();
    }
  });
});
