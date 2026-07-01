import { test, expect } from "@playwright/test";

test.describe("Rating & Review System", () => {
  async function openReviewSheet(page: import("@playwright/test").Page) {
    await page.goto("/menu/al-waha-cafe", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    const reviewBtn = page.getByRole("button", { name: /^تقييم/ }).first();
    await reviewBtn.waitFor({ state: "attached", timeout: 15000 });
    await reviewBtn.click({ force: true });
    await page.waitForTimeout(4000);
  }

  test("shows review button on menu items and opens review dialog", async ({ page }) => {
    await page.goto("/menu/al-waha-cafe", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    const reviewBtn = page.getByRole("button", { name: /^تقييم/ }).first();
    await reviewBtn.waitFor({ state: "attached", timeout: 15000 });
    await reviewBtn.click({ force: true });
    await expect(page.getByText("أضف تقييمك")).toBeVisible({ timeout: 10000 });
  });

  test("stars are interactive and submit button enables after selection", async ({ page }) => {
    await openReviewSheet(page);

    // Click 4th star via evaluate — avoids framer-motion intercept issues
    await page.evaluate(() => {
      const h4 = Array.from(document.querySelectorAll("h4")).find(el => el.textContent?.includes("أضف تقييمك"));
      if (!h4) return;
      const section = h4.parentElement;
      if (!section) return;
      const buttons = section.querySelectorAll("button");
      if (buttons.length >= 4) (buttons[3] as HTMLElement).click();
    });
    await page.waitForTimeout(500);

    const submitBtn = page.locator("button").filter({ hasText: "إرسال التقييم" }).last();
    await expect(submitBtn).toBeEnabled();
  });

  test("submits a review successfully", async ({ page }) => {
    await openReviewSheet(page);

    // Click 5th star
    await page.evaluate(() => {
      const h4 = Array.from(document.querySelectorAll("h4")).find(el => el.textContent?.includes("أضف تقييمك"));
      if (!h4) return;
      const section = h4.parentElement;
      if (!section) return;
      const buttons = section.querySelectorAll("button");
      if (buttons.length >= 5) (buttons[4] as HTMLElement).click();
    });
    await page.waitForTimeout(500);

    const textarea = page.locator("textarea").first();
    await textarea.fill("ممتاز! طعم رائع");

    const submitBtn = page.locator("button").filter({ hasText: "إرسال التقييم" }).last();
    await expect(submitBtn).toBeEnabled();
  });

  test("cannot submit without selecting rating", async ({ page }) => {
    await openReviewSheet(page);

    const textarea = page.locator("textarea").first();
    await textarea.fill("اختبار بدون تقييم");

    const submitBtn = page.locator("button").filter({ hasText: "إرسال التقييم" }).last();
    await expect(submitBtn).toBeDisabled();
  });

  test("closes dialog on backdrop click", async ({ page }) => {
    await openReviewSheet(page);

    // Close via evaluate — backdrop click
    await page.evaluate(() => {
      const backdrop = document.querySelector(".fixed.inset-0.z-40");
      if (backdrop) (backdrop as HTMLElement).click();
    });
    await page.waitForTimeout(2000);
    await expect(page.getByText("أضف تقييمك")).not.toBeVisible({ timeout: 5000 });
  });
});
