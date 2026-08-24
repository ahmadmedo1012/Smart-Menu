/**
 * Shared stable selectors for the QA team E2E suites.
 * Avoids positional input.nth(N) selectors — any field reorder would silently
 * break tests. Use placeholder/aria-label/text-based selectors instead.
 */
import { Page } from "@playwright/test";

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
export function loginBudget(): number {
  // Per-attempt worst case: /login load (45s guard) + authenticated-redirect
  // wait (5s) OR field hydration wait (15s) + POST + redirect wait (20s) +
  // inter-attempt gap (3s/6s; none after the final attempt).
  // 3 × ~85s + gaps ≈ 265s. Budget 270s so a single slow step can't blow it.
  return 270_000;
}
export async function login(page: Page, username: string, password: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 45000 });
    // Already-authenticated fast path: /login redirects CLIENT-side
    // (/api/auth/me → replace('/owner')), so the URL check must be a bounded
    // wait — an immediate read races and loses while the SPA is still at /login.
    const alreadyIn = await page
      .waitForURL(/\/owner($|\/|\?)/, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (alreadyIn) return;
    const nameField = page.getByPlaceholder("اسم المستخدم");
    // Wait for the form to hydrate — the field can lag domcontentloaded on a
    // slow backend, and a count() check that runs too early sees zero fields.
    const fieldReady = await nameField
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (fieldReady) {
      await nameField.fill(username);
      await page.getByPlaceholder("كلمة المرور").fill(password);
      await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
      // Wait on the redirect itself instead of a fixed 4s poll: the login
      // POST alone can take 3-4s on a warm backend.
      const loggedIn = await page
        .waitForURL(/\/owner/, { timeout: 20000 })
        .then(() => true)
        .catch(() => false);
      if (loggedIn) return;
    }
    // Not logged in — likely 429 rate-limit; wait briefly and retry
    if (attempt < 2) await page.waitForTimeout(3000 * (attempt + 1));
  }
  throw new Error(`login failed for ${username} after 3 attempts (rate-limited?)`);
}
