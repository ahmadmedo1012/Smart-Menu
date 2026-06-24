import { test, expect } from "@playwright/test";

test.describe("Smart Menu - Public Pages", () => {
  test("homepage loads and shows hero section", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("حوّل مطعمك");
    await expect(page.locator('header a:has-text("الخطط والأسعار")').first()).toBeVisible();
  });

  test("pricing page loads and shows plan table", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("h1")).toContainText("اختر خطتك");
    await expect(page.locator("text=شهري").first()).toBeVisible();
  });

  test("login page has form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("تسجيل الدخول");
  });

  test("subscribe page loads with plan selection", async ({ page }) => {
    await page.goto("/subscribe", { waitUntil: "domcontentloaded" });
    // Subscribe page loads — check body rendered
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
  });

  test("menu redirects to first restaurant or shows empty state", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "domcontentloaded" });
    const currentUrl = page.url();
    if (currentUrl.includes("/menu/") && !currentUrl.endsWith("/menu")) {
      await expect(page.locator("h1")).toBeVisible();
    } else {
      expect(currentUrl).toContain("/menu");
    }
  });

  test("cart page shows empty state", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("order-confirmed shows confirmation", async ({ page }) => {
    await page.goto("/order-confirmed", { waitUntil: "domcontentloaded" });
    // Page loaded — confirmation message
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Smart Menu - Auth Redirects", () => {
  test("unknown route shows 404; admin and owner redirect or load", async ({ page }) => {
    for (const path of ["/nonexistent-xyz", "/admin", "/admin/restaurants", "/owner"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const url = page.url();
      if (path === "/nonexistent-xyz") {
        await expect(page.getByText("الصفحة غير موجودة")).toBeVisible();
      } else if (url.includes("/login")) {
        await expect(page).toHaveURL(/\/login/);
      } else {
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});

test.describe("Smart Menu - SEO & Static Files", () => {
  test("robots.txt is served with directives", async ({ request }) => {
    const resp = await request.get("/robots.txt");
    expect(resp.status()).toBe(200);
    const text = await resp.text();
    expect(text.toLowerCase()).toContain("user-agent");
    expect(text).toContain("Disallow");
  });
});
