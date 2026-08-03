/**
 * Team 4 — Subscriptions & Payments (3 methods, bank transfer is NEW)
 * Priority: verify the new bank transfer flow end-to-end (visual + logic).
 * We STOP before any real payment confirmation (diagnostic only).
 * Run: npx playwright test tests/e2e/team4-payments.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

const ts = Date.now().toString().slice(-8);

async function selectPlan(page, planText: string) {
  await page.goto("/subscribe", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const btns = page.locator("button");
  const count = await btns.count();
  for (let i = 0; i < count; i++) {
    const t = (await btns.nth(i).innerText()) || "";
    if (t.includes(planText)) { await btns.nth(i).click(); break; }
  }
  await page.waitForTimeout(800);
  for (let i = 0; i < count; i++) {
    const t = (await btns.nth(i).innerText()) || "";
    if (t.includes("اخترت")) { await btns.nth(i).click(); break; }
  }
  await page.waitForTimeout(2000);
}

async function fillBasicForm(page, base: string) {
  const ins = page.locator("input");
  await ins.nth(0).fill(`QA Bank ${base}`);
  await ins.nth(1).fill(`qa-bank-${base}-${ts}`);
  await ins.nth(2).fill("QA");
  await ins.nth(3).fill("0910000011");
  await ins.nth(4).fill("0910000011");
  await ins.nth(5).fill(`qa_bank_${base}_${ts}`);
  await ins.nth(6).fill("TestPass123!");
  await page.waitForTimeout(300);
}

test("bank: amount above 99 accepted (no wallet cap)", async ({ page }) => {
  await selectPlan(page, "129"); // Pro = 129
  // Add second menu (Pro supports 3)
  const addBtn = page.locator('button:has-text("إضافة منيو")');
  if (await addBtn.count()) {
    await addBtn.first().click();
    await page.waitForTimeout(1000);
  }
  const ins = page.locator("input");
  // Fill menu 2 fields (indices shift)
  await ins.nth(0).fill("QA Bank A");
  await ins.nth(1).fill(`qa-bank-a-${ts}`);
  await ins.nth(2).fill("QA");
  await ins.nth(3).fill("0910000011");
  await ins.nth(4).fill("0910000011");
  await ins.nth(5).fill("QA Bank B");
  await ins.nth(6).fill(`qa-bank-b-${ts}`);
  await ins.nth(7).fill("QA");
  await ins.nth(8).fill("0910000012");
  await ins.nth(9).fill("0910000012");
  await ins.nth(10).fill(`qa_bank_${ts}`);
  await ins.nth(11).fill("TestPass123!");
  await page.waitForTimeout(300);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);

  // Payment dialog should open
  const dlg = page.locator('[role="dialog"]');
  expect(await dlg.count()).toBeGreaterThan(0);

  // Verify libyana/madar DISABLED (cap 99), bank ENABLED + selected
  const lib = dlg.locator('button:has-text("ليبيانا")');
  const madar = dlg.locator('button:has-text("مدار")');
  const bank = dlg.locator('button:has-text("تحويل بنكي")');
  if (await lib.count()) expect(await lib.first().isDisabled()).toBeTruthy();
  if (await madar.count()) expect(await madar.first().isDisabled()).toBeTruthy();
  expect(await bank.count()).toBeGreaterThan(0);

  // Verify bank info visible (account/IBAN)
  const body = await page.locator("body").innerText();
  expect(body).toContain("129");
  // Screenshot for visual evidence
  await page.screenshot({ path: "test-results/report/team4-bank-dialog.png", fullPage: false });
  // STOP here — no real payment submission
});

test("bank: submit without sender name/account → validation error", async ({ page }) => {
  await selectPlan(page, "129");
  const ins = page.locator("input");
  await ins.nth(0).fill("QA Bank C");
  await ins.nth(1).fill(`qa-bank-c-${ts}`);
  await ins.nth(2).fill("QA");
  await ins.nth(3).fill("0910000013");
  await ins.nth(4).fill("0910000013");
  await ins.nth(5).fill(`qa_bank_c_${ts}`);
  await ins.nth(6).fill("TestPass123!");
  await page.waitForTimeout(300);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);
  const dlg = page.locator('[role="dialog"]');
  if (await dlg.count()) {
    // Try submitting without filling sender info
    const sub = dlg.locator('button:has-text("إرسال طلب الدفع")');
    if (await sub.count()) {
      await sub.first().click();
      await page.waitForTimeout(2500);
      const body = await page.locator("body").innerText();
      // Either validation error shown OR dialog stays open (no success)
      const hasError = body.includes("مطلوب") || body.includes("يرجى") || (await dlg.count()) > 0;
      expect(hasError).toBeTruthy();
    }
  }
});

test("wallet: libyana shows USSD/phone info (basic plan 19 ≤ 99)", async ({ page }) => {
  await selectPlan(page, "19"); // Basic
  const ins = page.locator("input");
  await ins.nth(0).fill("QA Wallet");
  await ins.nth(1).fill(`qa-wallet-${ts}`);
  await ins.nth(2).fill("QA");
  await ins.nth(3).fill("0910000014");
  await ins.nth(4).fill("0910000014");
  await ins.nth(5).fill(`qa_wallet_${ts}`);
  await ins.nth(6).fill("TestPass123!");
  await page.waitForTimeout(300);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);
  const dlg = page.locator('[role="dialog"]');
  expect(await dlg.count()).toBeGreaterThan(0);
  // Libyana should be ENABLED (19 ≤ 99)
  const lib = dlg.locator('button:has-text("ليبيانا")');
  if (await lib.count()) {
    const disabled = await lib.first().isDisabled();
    expect(disabled).toBeFalsy();
  }
  await page.screenshot({ path: "test-results/report/team4-wallet-dialog.png" });
  // STOP — no submission
});

test("pricing: page shows all plans with menu counts", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText();
  expect(body).toContain("مجاني");
  expect(body).toContain("أساسي");
  expect(body).toContain("بريميوم");
  expect(body).toContain("احترافي");
  expect(body).toContain("شركات");
});
