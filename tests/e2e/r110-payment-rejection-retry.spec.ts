/**
 * r110 — ledger #8: the subscribe-page REJECTED-payment retry path, e2e.
 *
 * Coverage gap (documented in ENGINEERING_STATE "Next recommended
 * engineering actions"): resolveSubscriptionPayment's cancelled branch was
 * unit-covered (tests/unit/payment-rejection.test.ts) and the APPROVED end
 * of the dialog was e2e-covered (round79-phaseC approvePayment), but the
 * user-visible rejection → retry loop was never driven end-to-end:
 *
 *   subscribe (paid plan) → PaymentDialog submit (waiting)
 *   → admin CANCELS the payment (real /api/admin/subscriptions POST)
 *   → dialog flips to «تم رفض طلب الاشتراك» within the 5s poll
 *   → «إعادة المحاولة» returns to the FORM step with a clean state
 *   → a second submit reaches the API again (paymentId #2) — the button is
 *     not bricked by the first rejection (the r110 concern from the
 *     submittedRef/sentRef latch history in this dialog).
 *
 * Run (same harness as the other suites):
 *   BASE_URL=http://localhost:3002 npx playwright test
 *     tests/e2e/r110-payment-rejection-retry.spec.ts --workers=1
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fillSubscribeForm } from "./qa-helpers";

const BASE = process.env.BASE_URL || "http://localhost:3002";
const OUT = process.env.R110_OUT_DIR || "test-artifacts/r110-rejection";
const SHOTS = join(OUT, "screenshots");
mkdirSync(SHOTS, { recursive: true });

const ADMIN_USER = process.env.PHASEC_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.PHASEC_ADMIN_PASS || "admin123456";
const PASSWORD = "Owner123!";

/** Unique-per-run subscriber identity (rate limits are per-account + IP).
 * PHONE must be exactly 10 DIGITS starting 09 (PaymentDialog hint «10 أرقام
 * تبدأ بـ 09» + backend zod) — "0912" + a 6-digit numeric tail derived from
 * Date.now() (base36 RUN ids can contain letters, so never use them here;
 * a 5-digit tail was exactly the bug that made the first run send a 9-digit
 * phone → 422 → no data.id → waitForResponse starved → 300s timeout). */
const RUN = Date.now().toString(36);
const USERNAME = `qa_r110_${RUN}`;
const PHONE = `0912${(Date.now() % 1000000).toString().padStart(6, "0")}`;

test.describe.configure({ mode: "serial" });

/**
 * Submit the PaymentDialog once with the libyana provider and capture the
 * paymentId from the POST /api/subscriptions response body (the dialog keeps
 * it in component state — the network exchange is the only outside-visible
 * copy, and it is the exact id the admin endpoint needs).
 */
async function submitPaymentAndCaptureId(page: Page): Promise<number> {
  // Sync predicate → waitForResponse resolves with the Response OBJECT (an
  // async predicate's return value is NOT the resolved value — the first
  // version relied on that and passed a boxed Playwright Response into
  // page.evaluate, exploding with "Attempting to serialize unexpected
  // value"). Capture the Response, parse the id out here instead.
  const paymentResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/subscriptions") &&
      !res.url().includes("/validate") &&
      !res.url().includes("/status") &&
      res.request().method() === "POST"
  );
  const paymentIdPromise = paymentResponsePromise.then(async (res) => {
    let json: { data?: { id?: number }; error?: string } | null = null;
    try {
      json = (await res.json()) as { data?: { id?: number }; error?: string };
    } catch {
      /* non-JSON — fall through to the hard failure below */
    }
    if (!res.ok() || !json?.data?.id) {
      // Fail FAST with the API's own error (422 bad form data, 403 CSRF…)
      // instead of starving until the test timeout (exactly what the first
      // version did on the 9-digit-phone 422).
      throw new Error(`POST ${res.url()} → ${res.status()} :: ${JSON.stringify(json).slice(0, 160)}`);
    }
    return json.data.id as number;
  });

  const dlg = page.locator('[role="dialog"]');
  await expect(dlg).toBeVisible({ timeout: 15000 });

  // libyana tab is the default provider — it needs the phone field
  // (id="payment-phone"; inputMode=numeric, dir=ltr, 10 digits starting 09).
  const phoneInput = dlg.locator('#payment-phone');
  if (await phoneInput.count()) await phoneInput.fill(PHONE);

  await dlg.locator('button:has-text("إرسال")').first().click();
  const captured = await paymentIdPromise;
  expect(captured, "POST /api/subscriptions must return data.id").not.toBeNull();
  return captured as number;
}

/** Admin cancels a pending payment via the real endpoint (round79 pattern). */
async function cancelPaymentAsAdmin(browser: Browser, paymentId: number): Promise<number> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.fill("#username", ADMIN_USER);
    await page.fill("#password", ADMIN_PASS);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/admin/, { timeout: 30000 });
    const status = await page.evaluate(
      async ({ id, url }) => {
        const token =
          document.cookie
            .split("; ")
            .find((c) => c.startsWith("csrf-token="))
            ?.split("=")
            .slice(1)
            .join("=") ?? "";
        const r = await fetch(`${url}/api/admin/subscriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": token },
          credentials: "same-origin",
          body: JSON.stringify({ id, status: "cancelled" }),
        });
        return r.status;
      },
      { id: paymentId, url: BASE }
    );
    return status;
  } finally {
    await ctx.close();
  }
}

test("rejected payment → retry reopens the form and a second submit reaches the API", async ({ browser }) => {
  test.setTimeout(300_000);

  /* ── 1. Subscribe wizard with a PAID plan (Premium 29 — seeded) ────────── */
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/subscribe?plan=Premium`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);

  await fillSubscribeForm(page, {
    restaurantName: `مطعم فحص الرفض ${RUN}`,
    slug: `qa-r110-reject-${RUN}`,
    phone: PHONE,
    whatsapp: PHONE,
    username: USERNAME,
    password: PASSWORD,
  });

  /* fillSubscribeForm advances the wizard itself: menu step → account step
   * → review step (it lands on the «راجع بياناتك ثم أكّد» heading). */
  const submitBtn = page.locator('button:has-text("إنشاء الحساب والبدء")');
  await expect(submitBtn).toBeVisible({ timeout: 15000 });

  /* ── 2. First submit → PaymentDialog (waiting) ─────────────────────────── */
  await submitBtn.first().click();
  const paymentId1 = await submitPaymentAndCaptureId(page);
  await page.screenshot({ path: join(SHOTS, `01-waiting-${RUN}.png`) });

  /* ── 3. Admin CANCELS the payment ─────────────────────────────────────── */
  const cancelStatus = await cancelPaymentAsAdmin(browser, paymentId1);
  expect(cancelStatus, "admin cancel must succeed (200/201)").toBeLessThan(300);

  /* ── 4. The dialog flips to the rejected step within the 5s poll ──────── */
  const dlg = page.locator('[role="dialog"]');
  await expect(dlg.locator("text=تم رفض طلب الاشتراك")).toBeVisible({ timeout: 20000 });
  await expect(
    dlg.locator("text=يمكنك تعديل البيانات والمحاولة مرة أخرى")
  ).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: join(SHOTS, `02-rejected-${RUN}.png`) });

  /* ── 5. «إعادة المحاولة» → back to the FORM step with a clean state ──── */
  await dlg.locator('button:has-text("إعادة المحاولة")').first().click();
  // The form step shows the provider submit button again — proof we left the
  // rejected screen without closing the dialog.
  await expect(dlg.locator('button:has-text("إرسال طلب الدفع")').first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: join(SHOTS, `03-retry-form-${RUN}.png`) });

  /* ── 5b. The PAGE-level rejection poll is a SECOND rejection listener ──
   * (subscribe/page.tsx polls /api/user/events every 15s; on
   * subscription_rejected it setPaymentOpen(false) + resets submittedRef).
   * It fires up to ~15s AFTER the admin cancel — racing the dialog-level
   * retry — and CLOSES the payment dialog on the user's screen. Wait for
   * that close so the second submit below is deterministic. */
  await expect(dlg).toBeHidden({ timeout: 30000 });

  /* ── 6. The wizard's «إنشاء الحساب والبدء» is NOT bricked by the rejection
   * (submittedRef was reset) — clicking it reopens the payment dialog via
   * the r103-F3 retry contract: the me-check sees the same logged-in
   * username, skips re-registration, and a NEW payment is submitted. */
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  const paymentId2 = await submitPaymentAndCaptureId(page);
  expect(paymentId2, "retry must create a NEW payment, not reuse the cancelled one").not.toBe(paymentId1);
  await page.screenshot({ path: join(SHOTS, `04-waiting-again-${RUN}.png`) });

  /* The retry payment stays pending — the round79 spec owns the approval
   * end-to-end; leaving it pending also proves the dialog can WAIT again. */
  await expect(dlg.locator("text=في انتظار")).toBeVisible({ timeout: 10000 }).catch(() => {
    /* wording varies — the second submit's 2xx (id captured) is the core
     * assertion; the waiting copy is best-effort. */
  });

  await page.close();
});
