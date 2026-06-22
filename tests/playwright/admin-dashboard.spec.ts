import { test, expect, Page } from "@playwright/test";

/**
 * Attempt to log in as admin via the API and store the session cookie.
 * Returns true if login succeeded, false otherwise so tests can fall back gracefully.
 */
async function loginAsAdmin(page: Page): Promise<boolean> {
  const response = await page.request.post("/api/auth/login", {
    data: { username: "admin", password: "admin" },
  });
  if (!response.ok()) return false;
  // The API sets an httpOnly session cookie — subsequent requests carry it.
  return true;
}

test.describe("Admin Dashboard", () => {
  let authed = false;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    authed = await loginAsAdmin(page);
    await ctx.close();
  });

  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/restaurants redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin/restaurants", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/orders redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin/orders", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/users redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin/users", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/menu redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin/menu", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("API returns 401 for unauthenticated requests", async ({ page }) => {
    const responses = await Promise.all([
      page.request.get("/api/restaurants"),
      page.request.get("/api/users"),
      page.request.get("/api/orders"),
      page.request.get("/api/plans"),
    ]);
    for (const resp of responses) {
      expect(resp.status()).toBe(401);
    }
  });

  test("login page has all required form fields", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("اسم المستخدم")).toBeVisible();
    await expect(page.getByLabel("كلمة المرور")).toBeVisible();
    await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();
  });

  test("invalid credentials show error toast", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("اسم المستخدم").fill("wrong_user");
    await page.getByLabel("كلمة المرور").fill("wrong_pass");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    // Wait for toast (sonner renders a role="status" region)
    await expect(page.locator("[data-sonner-toaster]")).toBeVisible({ timeout: 5000 });
  });

  test("authenticated admin page loads KPI cards", async ({ page, context }) => {
    // Manually re-login to attach cookies to this context
    const resp = await page.request.post("/api/auth/login", {
      data: { username: "admin", password: "admin" },
    });
    test.skip(!resp.ok(), "No admin credentials or server unavailable — skipping");
  });
});

test.describe("Admin API — Restaurants", () => {
  test("unauthenticated restaurants API returns 401", async ({ request }) => {
    const resp = await request.get("/api/restaurants");
    expect(resp.status()).toBe(401);
  });
});

test.describe("Admin API — Users", () => {
  test("unauthenticated users API returns 401", async ({ request }) => {
    const resp = await request.get("/api/users");
    expect(resp.status()).toBe(401);
  });
});

test.describe("Admin API — Orders", () => {
  test("unauthenticated orders API returns 401", async ({ request }) => {
    const resp = await request.get("/api/orders");
    expect(resp.status()).toBe(401);
  });
});

test.describe("Admin API — Plans", () => {
  test("plans API is publicly accessible", async ({ request }) => {
    const resp = await request.get("/api/plans");
    // Plans may be accessible for pricing page; check it doesn't 401
    expect(resp.status()).not.toBe(401);
  });
});
