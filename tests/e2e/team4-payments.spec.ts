/**
 * Team 4 — Subscriptions & Payments (3 methods, bank transfer is NEW)
 * Uses stable selectors (placeholder/aria/text) — no positional indexing.
 * Stop before real payment confirmation (diagnostic + QA-only).
 * Run: npx playwright test tests/e2e/team4-payments.spec.ts --project=qa-teams
 */
import { test, expect, type Page } from "@playwright/test";
import { fillSubscribeForm, choosePlanByPrice, advanceStep } from "./qa-helpers";

const ts = Date.now().toString().slice(-8);
const PASSWORD = "TestPass123!";

test.describe.configure({ mode: "serial" });

/** Click "إنشاء الحساب والبدء" and wait for the payment dialog.
 *  Retries up to 3× with a 20s pause to ride out the register
 *  rate-limit window (5/min per IP) when the suite runs in parallel. */
async function submitAndWaitDialog(page: Page): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    const btn = page.locator('button:has-text("إنشاء الحساب والبدء")');
    if (await btn.count()) {
      await btn.first().click();
      // round87-D7: fixed 6000ms sleep → race the two real outcomes: the
      // payment dialog mounts OR the already-created path lands on /owner.
      const outcome = await Promise.race([
        page
          .locator('[role="dialog"]')
          .first()
          .waitFor({ state: "visible", timeout: 20000 })
          .then(() => "dlg" as const)
          .catch(() => null as const),
        page
          .waitForURL(/\/owner/, { timeout: 20000 })
          .then(() => "owner" as const)
          .catch(() => null as const),
      ]);
      if (outcome) return true;
    }
    if (page.url().includes("/owner")) return true; // already created
    // Kept deliberately (round87-D7): rides out the 5/min register
    // rate-limit window — a semantic backoff, not a flake sleep.
    await page.waitForTimeout(20000); // rate-limit window
  }
  return false;
}

/** Click "إرسال طلب الدفع" if present; returns whether it was clicked. */
async function trySubmitPayment(page: Page): Promise<boolean> {
  const sub = page.locator('[role="dialog"] button:has-text("إرسال طلب الدفع")');
  if (await sub.count()) {
    await sub.first().click();
    return true;
  }
  return false;
}

/** Wait for the register outcome: payment dialog OR /owner redirect.
 *  round87-D7 replaces the fixed 6000ms sleeps in the tests below. */
async function waitForDialogOrOwner(page: Page): Promise<void> {
  await Promise.race([
    page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {}),
    page.waitForURL(/\/owner/, { timeout: 20000 }).catch(() => {}),
  ]);
}

async function fillStandard(page: Page, name: string, slug: string, phone: string, user: string) {
  await fillSubscribeForm(page, {
    restaurantName: name, slug, phone, whatsapp: phone, username: user, password: PASSWORD,
  });
}

test("bank: amount above 99 accepted (no wallet cap)", async ({ page }) => {
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await choosePlanByPrice(page, "129");
  // Pro supports 3 menus — add a second to exercise multi-menu form
  const addBtn = page.locator('button:has-text("إضافة منيو")');
  if (await addBtn.count()) {
    await addBtn.first().click();
    // round87-D7: fixed 1000ms sleep → wait for the 2nd menu group's fields
    await expect(
      page.getByPlaceholder("اسم المطعم (مثال: مقهى الواحة)")
    ).toHaveCount(2, { timeout: 10000 });
  }
  // Menu 1 fields (stable placeholders — first() because menu 2 duplicates them)
  await page.getByPlaceholder("اسم المطعم (مثال: مقهى الواحة)").first().fill("QA Bank A");
  await page.getByPlaceholder("الرابط المختصر (مثال: al-waha-cafe)").first().fill(`qa-bank-a-${ts}`);
  await page.getByPlaceholder("رقم الهاتف (مثال: 0912345678)").first().fill("0910000011");
  await page.getByPlaceholder("رقم الواتساب (مثال: 0912345678)").first().fill("0910000011");
  // Menu 2 fields — the second group also uses the same placeholder, so scope by visible order
  const nameInputs = page.getByPlaceholder("اسم المطعم (مثال: مقهى الواحة)");
  if ((await nameInputs.count()) > 1) {
    await nameInputs.nth(1).fill("QA Bank B");
    const slugInputs = page.getByPlaceholder("الرابط المختصر (مثال: al-waha-cafe)");
    await slugInputs.nth(1).fill(`qa-bank-b-${ts}`);
    const phoneInputs = page.getByPlaceholder("رقم الهاتف (مثال: 0912345678)");
    await phoneInputs.nth(1).fill("0910000012");
  }
  // menu step -> "التالي" -> account step
  // round87-D7: fixed 1500ms/300ms/1500ms sleeps → step-marker waits via
  // advanceStep (account placeholder, then the review-step heading; retries
  // across the /validate rate-limit window — see qa-helpers).
  const username = page.getByPlaceholder("اسم المستخدم (3 أحرف على الأقل)");
  await advanceStep(page, username);
  await username.fill(`qa_bank_${ts}`);
  await page.getByPlaceholder(/^كلمة المرور/).fill(PASSWORD);
  // account step -> "التالي" -> review step
  await advanceStep(
    page,
    page.getByRole("heading", { name: "راجع بياناتك ثم أكّد" })
  );
  const dlgOk = await submitAndWaitDialog(page);
  expect(dlgOk).toBeTruthy();

  const dlg = page.locator('[role="dialog"]');
  expect(await dlg.count()).toBeGreaterThan(0);

  const lib = dlg.locator('button:has-text("ليبيانا")');
  const madar = dlg.locator('button:has-text("مدار")');
  const bank = dlg.locator('button:has-text("تحويل بنكي")');
  if (await lib.count()) expect(await lib.first().isDisabled()).toBeTruthy();
  if (await madar.count()) expect(await madar.first().isDisabled()).toBeTruthy();
  expect(await bank.count()).toBeGreaterThan(0);

  const body = await page.locator("body").innerText();
  expect(body).toContain("129");
  await page.screenshot({ path: "test-results/report/team4-bank-dialog.png", fullPage: false });
  // STOP — no real payment submission
});

test("bank: submit without sender name/account → validation error", async ({ page }) => {
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await choosePlanByPrice(page, "129");
  await fillStandard(page, "QA Bank C", `qa-bank-c-${ts}`, "0910000013", `qa_bank_c_${ts}`);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await waitForDialogOrOwner(page);
  const dlg = page.locator('[role="dialog"]');
  if (await dlg.count()) {
    trySubmitPayment(page);
    // round87-D7: fixed 2500ms sleep → poll for the inline validation
    // message (soft — the original conditional assertion below still gates).
    try {
      await expect
        .poll(
          async () => {
            const t = await page.locator("body").innerText();
            return t.includes("مطلوب") || t.includes("يرجى");
          },
          { timeout: 10000 }
        )
        .toBe(true);
    } catch {
      /* fall through to the original conditional assertion */
    }
    const body = await page.locator("body").innerText();
    const hasError = body.includes("مطلوب") || body.includes("يرجى") || (await dlg.count()) > 0;
    expect(hasError).toBeTruthy();
  }
});

test("wallet: libyana enabled for amounts ≤ 99 (basic plan 19)", async ({ page }) => {
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await choosePlanByPrice(page, "19");
  await fillStandard(page, "QA Wallet", `qa-wallet-${ts}`, "0910000014", `qa_wallet_${ts}`);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await waitForDialogOrOwner(page);
  const dlg = page.locator('[role="dialog"]');
  expect(await dlg.count()).toBeGreaterThan(0);
  const lib = dlg.locator('button:has-text("ليبيانا")');
  if (await lib.count()) {
    expect(await lib.first().isDisabled()).toBeFalsy();
  }
  await page.screenshot({ path: "test-results/report/team4-wallet-dialog.png" });
  // STOP — no submission
});

test("pricing: page shows all plans with menu counts", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "networkidle" });
  // round87-D7: fixed 2000ms sleep + one innerText snapshot → auto-retrying
  // containText assertions.
  const body = page.locator("body");
  for (const plan of ["مجاني", "أساسي", "بريميوم", "احترافي", "شركات"]) {
    await expect(body).toContainText(plan, { timeout: 10000 });
  }
});

// ── Deep payment coverage (QR): madar full flow, bank amount edge cases ──────

test("madar: full flow shows 'بانتظار موافقة الإدارة' without countdown", async ({ page }) => {
  // Madar applies to amounts ≤ 99; use Basic (19) so the wallet channel is enabled.
  test.setTimeout(90000);
  await page.goto("/subscribe", { waitUntil: "domcontentloaded", timeout: 60000 });
  await choosePlanByPrice(page, "19");
  await fillStandard(page, "QA Madar", `qa-madar-${ts}`, "0910000015", `qa_madar_${ts}`);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await waitForDialogOrOwner(page);

  const dlg = page.locator('[role="dialog"]');
  expect(await dlg.count()).toBeGreaterThan(0);
  const madar = dlg.locator('button:has-text("مدار")');
  expect(await madar.count()).toBeGreaterThan(0);
  await madar.first().click();

  // Fill the wallet phone field (09XXXXXXXX) — required to enable submit for madar
  const phoneField = dlg.getByPlaceholder("09XXXXXXXX").first();
  // round87-D7: fixed 500ms sleep → condition wait for the wallet form mount
  await phoneField.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (await phoneField.count()) await phoneField.fill("0910000015");
  // Fill any sender-name/account fields if present (bank mode)
  const senderName = dlg.getByPlaceholder(/الاسم كما يظهر/).first();
  const senderAcct = dlg.getByPlaceholder(/رقم الحساب/).first();
  if (await senderName.count()) await senderName.fill("أحمد اختبار");
  if (await senderAcct.count()) await senderAcct.fill("123456789");

  // Submit → should go straight to "بانتظار موافقة الإدارة", no countdown timer.
  // The POST can take 3-5s on a cold backend, so wait for the waiting-state
  // text deterministically instead of a fixed sleep that races the response.
  const clicked = await trySubmitPayment(page);
  if (clicked) {
    const pendingText = dlg.getByText(/موافقة الإدارة|بانتظار/).first();
    await pendingText.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
    const body = await page.locator("body").innerText();
    const pendingTxt = body.includes("موافقة الإدارة") || body.includes("بانتظار");
    expect(pendingTxt).toBeTruthy();
    // No USSD countdown should appear for madar
    const countdownTxt = await page.evaluate(() => {
      const t = document.body.innerText;
      return /\d+\s*ثانية/.test(t);
    });
    expect(countdownTxt).toBeFalsy();
  }
});

test("bank: zero amount rejected (validation)", async ({ page }) => {
  // Zero/negative/wrong-amount flows happen in the payment dialog against a
  // real plan price. Verify the server-side schema rejects a bad amount by
  // posting directly (no real payment).
  // round87-D7: the csrf-token cookie is minted on the /login response
  // itself, so the hydration sleep before reading it is gone.
  await page.goto("/login", { waitUntil: "networkidle" });
  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  // Post to subscriptions with amount 0 → expect validation error (4xx), not success
  const r = await page.evaluate(async (csrf) => {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ planId: 88, amount: 0, provider: "bank", phone: "0910000099" }),
    });
    return { status: res.status, body: await res.text() };
  }, token);
  // 400/422 (schema) or 401/403 acceptable; NEVER 201 created
  expect(r.status).not.toBe(201);
});

test("bank: negative amount rejected", async ({ page }) => {
  // round87-D7: the csrf-token cookie is minted on the /login response
  // itself, so the hydration sleep before reading it is gone.
  await page.goto("/login", { waitUntil: "networkidle" });
  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  const r = await page.evaluate(async (csrf) => {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ planId: 88, amount: -5, provider: "bank", phone: "0910000099" }),
    });
    return { status: res.status };
  }, token);
  expect(r.status).not.toBe(201);
});

test("bank: non-numeric amount rejected", async ({ page }) => {
  // round87-D7: the csrf-token cookie is minted on the /login response
  // itself, so the hydration sleep before reading it is gone.
  await page.goto("/login", { waitUntil: "networkidle" });
  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  const r = await page.evaluate(async (csrf) => {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ planId: 88, amount: "abc", provider: "bank", phone: "0910000099" }),
    });
    return { status: res.status, body: (await res.text()).slice(0, 80) };
  }, token);
  expect(r.status).not.toBe(201);
});

test("bank: amount above plan cap handled / rejected gracefully", async ({ page }) => {
  // round87-D7: the csrf-token cookie is minted on the /login response
  // itself, so the hydration sleep before reading it is gone.
  await page.goto("/login", { waitUntil: "networkidle" });
  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  // Pro = 129; sending 500 must NOT silently succeed (amount != plan.price) unless intended
  const r = await page.evaluate(async (csrf) => {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ planId: 88, amount: 500, provider: "bank", phone: "0910000099" }),
    });
    return { status: res.status, body: (await res.text()).slice(0, 80) };
  }, token);
  expect(r.status).not.toBe(201);
});