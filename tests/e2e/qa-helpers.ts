/**
 * Shared stable selectors for the QA team E2E suites.
 * Avoids positional input.nth(N) selectors — any field reorder would silently
 * break tests. Use placeholder/aria-label/text-based selectors instead.
 */
import { Page, Locator } from "@playwright/test";

/** Fill the subscribe form by unique placeholder — no positional indexing. */
export async function fillSubscribeForm(
  page: Page,
  data: {
    restaurantName: string;
    slug: string;
    description?: string;
    phone: string;
    whatsapp: string;
    username: string;
    password: string;
  }
): Promise<void> {
  await page.getByPlaceholder("اسم المطعم (مثال: مقهى الواحة)").fill(data.restaurantName);
  await page.getByPlaceholder("الرابط المختصر (مثال: al-waha-cafe)").fill(data.slug);
  if (data.description) {
    await page.getByPlaceholder("وصف المطعم (اختياري)").fill(data.description);
  }
  await page.getByPlaceholder("رقم الهاتف (مثال: 0912345678)").fill(data.phone);
  await page.getByPlaceholder("رقم الواتساب (مثال: 0912345678)").fill(data.whatsapp);
  // Multi-step wizard (round87+): menu step -> "التالي" -> account step
  await page.locator('button:has-text("التالي")').first().click();
  await page.waitForTimeout(1500);
  await page.getByPlaceholder("اسم المستخدم (3 أحرف على الأقل)").fill(data.username);
  await page
    .getByPlaceholder(/^كلمة المرور/)
    .fill(data.password);
  // account step -> "التالي" -> review step (where the submit button lives)
  await page.locator('button:has-text("التالي")').first().click();
  await page.waitForTimeout(1500);
  await page.waitForTimeout(300);
}

/** Click the free-plan card then the confirm button on /subscribe. */
export async function chooseFreePlan(page: Page): Promise<void> {
  await page.locator("button").filter({ hasText: "مجاني" }).first().click();
  await page.waitForTimeout(800);
  await page.locator("button").filter({ hasText: "اخترت" }).first().click();
  await page.waitForTimeout(2000);
}

/** Click a plan card by price text, then confirm. */
export async function choosePlanByPrice(page: Page, price: string): Promise<void> {
  await page.locator("button").filter({ hasText: price }).first().click();
  await page.waitForTimeout(800);
  await page.locator("button").filter({ hasText: "اخترت" }).first().click();
  await page.waitForTimeout(2000);
}

/** Read the CSRF token cookie (set by proxy on non-cacheable pages). */
export async function csrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === "csrf-token")?.value ?? "";
}

/** Login with the given credentials via the login form. Retries on 429 rate-limit. */
export async function login(page: Page, username: string, password: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    // If a session is already active, /login redirects to /owner — no fields.
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1200);
    if (page.url().includes("/owner")) return;
    const nameField = page.getByPlaceholder("اسم المستخدم");
    if (await nameField.count()) {
      await nameField.fill(username);
      await page.getByPlaceholder("كلمة المرور").fill(password);
      await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
      await page.waitForTimeout(4000);
      if (page.url().includes("/owner")) return;
    }
    // Not logged in — likely 429 rate-limit; wait and retry
    await page.waitForTimeout(8000 * (attempt + 1));
  }
  throw new Error(`login failed for ${username} after 3 attempts (rate-limited?)`);
}
