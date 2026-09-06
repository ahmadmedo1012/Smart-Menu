/**
 * Shared stable selectors for the QA team E2E suites.
 * Avoids positional input.nth(N) selectors — any field reorder would silently
 * break tests. Use placeholder/aria-label/text-based selectors instead.
 */
import { expect, Page, type Locator } from "@playwright/test";

/**
 * Click "التالي" and wait for a locator that proves the wizard advanced
 * (next step's marker, or a same-step validation message).
 *
 * round87-D7: retries across the /subscriptions/validate rate-limit window
 * (10/min per IP). The standalone localhost e2e server runs with
 * NODE_ENV=production, so RATE_LIMIT_RELAX=1 in .env is INERT — the bucket
 * is real, and team1 + team4 + round87-journeys collectively exceed it when
 * the (now sleep-free) specs run fast. A 429 leaves the wizard silently on
 * the current step (the client treats it as "not valid" with no error text),
 * so the only observable signal is the marker not appearing. The 20s pause
 * is a semantic window backoff, not a flake sleep.
 */
export async function advanceStep(page: Page, marker: Locator): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    // Marker may already be there (e.g. a previous attempt advanced late).
    if (await marker.isVisible()) return;
    await page.locator('button:has-text("التالي")').first().click();
    const advanced = await marker
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (advanced) return;
    if (attempt < 3) await page.waitForTimeout(20000); // validate window backoff
  }
  // Hard failure with Playwright's own retry/assertion diagnostics.
  await expect(marker).toBeVisible({ timeout: 5000 });
}

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
  // Multi-step wizard (round87+): menu step -> "التالي" -> account step.
  // round87-D7: the fixed 1500ms/1500ms/300ms sleeps are gone — each step
  // advance now waits on the NEXT step's own marker (account placeholder /
  // review heading), so the wait tracks the /validate pre-flight network
  // round-trip instead of guessing a duration (see advanceStep for the
  // rate-limit retry).
  await advanceStep(page, page.getByPlaceholder("اسم المستخدم (3 أحرف على الأقل)"));
  await page.getByPlaceholder("اسم المستخدم (3 أحرف على الأقل)").fill(data.username);
  await page
    .getByPlaceholder(/^كلمة المرور/)
    .fill(data.password);
  // account step -> "التالي" -> review step (where the submit button lives)
  await advanceStep(
    page,
    page.getByRole("heading", { name: "راجع بياناتك ثم أكّد" })
  );
}

/** Click the free-plan card then the confirm button on /subscribe. */
export async function chooseFreePlan(page: Page): Promise<void> {
  await page.locator("button").filter({ hasText: "مجاني" }).first().click();
  // round85: plan cards select IN PLACE — the confirm text is now the stepper
  // CTA "متابعة مع خطة ...". The old "اخترت" button was removed from the UI a
  // long time ago; this helper silently broke and nothing caught it because
  // the CI trigger never matched main (fixed this round).
  // round87-D7: fixed 800ms sleep → condition wait — selecting a plan flips
  // the CTA from "اختر خطة أولاً" (disabled) to "متابعة مع خطة …" (enabled),
  // and waiting for enabled proves the selection actually landed.
  const cta = page.locator("button").filter({ hasText: "متابعة مع خطة" }).first();
  await expect(cta).toBeEnabled({ timeout: 10000 });
  await cta.click();
  // round87-D7: fixed 2000ms sleep → wait for the menu step's heading.
  await expect(
    page.getByRole("heading", { name: "بيانات المنيوهات" })
  ).toBeVisible({ timeout: 15000 });
}

/** Click a plan card by price text, then confirm. */
export async function choosePlanByPrice(page: Page, price: string): Promise<void> {
  await page.locator("button").filter({ hasText: price }).first().click();
  // round87-D7: sleeps → condition waits (same markers as chooseFreePlan).
  const cta = page.locator("button").filter({ hasText: "متابعة مع خطة" }).first();
  await expect(cta).toBeEnabled({ timeout: 10000 });
  await cta.click();
  await expect(
    page.getByRole("heading", { name: "بيانات المنيوهات" })
  ).toBeVisible({ timeout: 15000 });
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
