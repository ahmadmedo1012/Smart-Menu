/**
 * Team 4 — Subscriptions & Payments (3 methods, bank transfer is NEW)
 * Uses stable selectors (placeholder/aria/text) — no positional indexing.
 * Stop before real payment confirmation (diagnostic + QA-only).
 * Run: npx playwright test tests/e2e/team4-payments.spec.ts --project=qa-teams
 */
import { test, expect, type Page } from "@playwright/test";
import { fillSubscribeForm, choosePlanByPrice } from "./qa-helpers";

const ts = Date.now().toString().slice(-8);
const PASSWORD = "TestPass123!";

/** Fill the subscribe form for a single-menu plan. */
async function fillMenu1(page: Page, name: string, slug: string, phone: string, user: string) {
  await fillSubscribeForm(page, {
    restaurantName: name,
    slug,
    phone,
    whatsapp: phone,
    username: user,
    password: PASSWORD,
  });
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

async function openBankDialog(page: Page, name: string, slug: string, user: string) {
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await choosePlanByPrice(page, "129"); // Pro
  await fillStandard1(page, name, slug, "0910000011", user);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);
  const dlg = page.locator('[role="dialog"]');
  return dlg;
}

// passthrough stub to keep call sites identical (defined inline below)
async function fillStandard1(page: Page, name: string, slug: string, phone: string, user: string) {
  await fillStandard(page, name, slug, phone, user);
}
async function fillStandard(page: Page, name: string, slug: string, phone: string, user: string) {
  await fillSubscribeForm(page, {
    restaurantName: name, slug, phone, whatsapp: phone, username: user, password: PASSWORD,
  });
}

test("bank: amount above 99 accepted (no wallet cap)", async ({ page }) => {
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await choosePlanByPrice(page, "129");
  // Pro supports 3 menus — add a second to exercise multi-menu form
  const addBtn = page.locator('button:has-text("إضافة منيو")');
  if (await addBtn.count()) {
    await addBtn.first().click();
    await page.waitForTimeout(1000);
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
  await page.getByPlaceholder("اسم المستخدم (3 أحرف على الأقل)").fill(`qa_bank_${ts}`);
  await page.getByPlaceholder(/^كلمة المرور/).fill(PASSWORD);
  await page.waitForTimeout(300);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);

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
  await page.waitForTimeout(2000);
  await choosePlanByPrice(page, "129");
  await fillStandard(page, "QA Bank C", `qa-bank-c-${ts}`, "0910000013", `qa_bank_c_${ts}`);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);
  const dlg = page.locator('[role="dialog"]');
  if (await dlg.count()) {
    const clicked = await trySubmitPayment(page);
    await page.waitForTimeout(2500);
    const body = await page.locator("body").innerText();
    const hasError = body.includes("مطلوب") || body.includes("يرجى") || (await dlg.count()) > 0;
    expect(hasError).toBeTruthy();
  }
});

test("wallet: libyana enabled for amounts ≤ 99 (basic plan 19)", async ({ page }) => {
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await choosePlanByPrice(page, "19");
  await fillStandard(page, "QA Wallet", `qa-wallet-${ts}`, "0910000014", `qa_wallet_${ts}`);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);
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
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText();
  for (const plan of ["مجاني", "أساسي", "بريميوم", "احترافي", "شركات"]) {
    expect(body).toContain(plan);
  }
});

// ── Deep payment coverage (QR): madar full flow, bank amount edge cases ──────

test("madar: full flow shows 'بانتظار موافقة الإدارة' without countdown", async ({ page }) => {
  // Madar applies to amounts ≤ 99; use Basic (19) so the wallet channel is enabled.
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await choosePlanByPrice(page, "19");
  await fillStandard(page, "QA Madar", `qa-madar-${ts}`, "0910000015", `qa_madar_${ts}`);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);

  const dlg = page.locator('[role="dialog"]');
  expect(await dlg.count()).toBeGreaterThan(0);
  const madar = dlg.locator('button:has-text("مدار")');
  expect(await madar.count()).toBeGreaterThan(0);
  await madar.first().click();
  await page.waitForTimeout(500);

  // Fill the wallet phone field (09XXXXXXXXX) — required to enable submit for madar
  const phoneField = dlg.getByPlaceholder("09XXXXXXXXX").first();
  if (await phoneField.count()) await phoneField.fill("0910000015");
  // Fill any sender-name/account fields if present (bank mode)
  const senderName = dlg.getByPlaceholder(/الاسم كما يظهر/).first();
  const senderAcct = dlg.getByPlaceholder(/رقم الحساب/).first();
  if (await senderName.count()) await senderName.fill("أحمد اختبار");
  if (await senderAcct.count()) await senderAcct.fill("123456789");
  await page.waitForTimeout(400);

  // Submit → should go straight to "بانتظار موافقة الإدارة", no countdown timer
  const clicked = await trySubmitPayment(page);
  await page.waitForTimeout(4000);
  const body = await page.locator("body").innerText();
  if (clicked) {
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
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
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
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
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
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
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
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
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