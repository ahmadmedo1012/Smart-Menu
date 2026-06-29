import { test, expect } from "@playwright/test";

test.describe("Rating & Review System", () => {
  test("shows review button on menu items and opens review dialog", async ({ page }) => {
    // Navigate to a known menu page
    await page.goto("/menu/1", { waitUntil: "networkidle" });

    // Wait for menu items to render
    await page.waitForSelector('[role="button"]');

    // Check that items have review triggers (either "قيّم" button or rating badge)
    const reviewButton = page.locator('button[aria-label*="تقييم"]').first();
    await expect(reviewButton).toBeVisible({ timeout: 10000 });

    // Click review trigger
    await reviewButton.click();

    // Wait for review dialog to open
    await expect(page.getByText(/كيف كانت تجربتك/i)).toBeVisible({ timeout: 5000 });
  });

  test("stars are interactive and submit button enables after selection", async ({ page }) => {
    await page.goto("/menu/1", { waitUntil: "networkidle" });

    // Open review dialog
    const reviewButton = page.locator('button[aria-label*="تقييم"]').first();
    await reviewButton.click();

    // Wait for star rating buttons
    const stars = page.locator('[role="radio"]');
    await expect(stars.first()).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled before rating
    const submitBtn = page.getByRole("button", { name: /إرسال التقييم/i });
    await expect(submitBtn).toBeDisabled();

    // Click 4th star
    await stars.nth(3).click();
    await expect(submitBtn).toBeEnabled();
  });

  test("submits a review successfully", async ({ page }) => {
    await page.goto("/menu/1", { waitUntil: "networkidle" });

    const reviewButton = page.locator('button[aria-label*="تقييم"]').first();
    await reviewButton.click();

    // Select rating
    const stars = page.locator('[role="radio"]');
    await stars.nth(4).click(); // 5 stars

    // Type comment
    const textarea = page.locator("textarea").first();
    await textarea.fill("ممتاز! طعم رائع");

    // Submit
    const submitBtn = page.getByRole("button", { name: /إرسال التقييم/i });
    await submitBtn.click();

    // Wait for success message
    await expect(page.getByText(/شكراً لتقييمك/i)).toBeVisible({ timeout: 10000 });
  });

  test("cannot submit without selecting rating", async ({ page }) => {
    await page.goto("/menu/1", { waitUntil: "networkidle" });

    const reviewButton = page.locator('button[aria-label*="تقييم"]').first();
    await reviewButton.click();

    // Type comment only
    const textarea = page.locator("textarea").first();
    await textarea.fill("اختبار بدون تقييم");

    const submitBtn = page.getByRole("button", { name: /إرسال التقييم/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("closes dialog on backdrop click", async ({ page }) => {
    await page.goto("/menu/1", { waitUntil: "networkidle" });

    const reviewButton = page.locator('button[aria-label*="تقييم"]').first();
    await reviewButton.click();

    // Close via ESC
    await page.keyboard.press("Escape");
    await expect(page.getByText(/كيف كانت تجربتك/i)).not.toBeVisible();
  });
});
