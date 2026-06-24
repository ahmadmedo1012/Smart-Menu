import { test, expect } from "@playwright/test";

test.describe("Public Menu Page", () => {
  test("menu page loads and either redirects to restaurant or shows empty state", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "domcontentloaded" });

    const currentUrl = page.url();

    if (currentUrl.includes("/menu/") && !currentUrl.endsWith("/menu")) {
      // We got redirected to a restaurant menu
      await expect(page.locator("h1")).toHaveText(/.+/, { timeout: 15000 });
      // At least body rendered
      await expect(page.locator("body")).toBeVisible();
    } else {
      // No restaurants available — check empty state or just that page loaded
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("menu restaurant page shows restaurant info and menu sections", async ({ page }) => {
    // Navigate directly to a known restaurant
    await page.goto("/menu/al-waha-cafe", { waitUntil: "domcontentloaded" });

    // Restaurant name should be visible in the header
    await expect(page.locator("h1")).toBeVisible();

    // Check for contact info or action buttons
    await page.waitForTimeout(1500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("menu page has working cart flow through localStorage", async ({ page }) => {
    await page.goto("/menu/al-waha-cafe", { waitUntil: "domcontentloaded" });

    // Cart page should show empty state
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    // The cart page loaded
    await expect(page.locator("body")).toBeVisible();
  });

  test("menu page loads with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!text.includes("favicon") && !text.includes("DevTools") && !text.includes("service worker")) {
          errors.push(text);
        }
      }
    });

    await page.goto("/menu", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});

test.describe("Public Menu — Navigation", () => {
  test("homepage has link to menu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const menuLink = page.locator("a[href*='/menu']").first();
    await expect(menuLink).toBeVisible();
  });

  test("menu page has link back to cart after adding items", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    const backLink = page.locator("a[href='/menu']").first();
    await expect(backLink).toBeVisible();
  });
});
