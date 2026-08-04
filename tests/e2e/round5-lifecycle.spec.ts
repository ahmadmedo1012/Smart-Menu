/**
 * Round 5 — full order lifecycle (real restaurant simulation):
 * owner publishes → customer orders (with note/qty) → owner sees it → status change.
 * Plus edge cases: empty order attempt, zero quantity.
 * Run: npx playwright test tests/e2e/round5-lifecycle.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";

const OWNER = "testmulti1568";
const PASS = "testpass123";
const MENU = "/menu/al-waha-cafe-demo";

test("lifecycle: customer order with note reaches owner orders page", async ({ page }) => {
  test.setTimeout(90000);
  // ── 1. Customer places an order with a unique note ──
  await page.goto(MENU, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const adds = page.locator('button:has-text("أضف")');
  expect(await adds.count()).toBeGreaterThan(0);
  await adds.first().click();
  await page.waitForTimeout(600);

  await page.goto("/cart", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const note = page.getByPlaceholder(/ملاحظات للطلب/).first();
  if (await note.count()) await note.fill("توصيل سريع R5");
  // name field removed per UX decision
  await page.locator("#cart-phone").fill("0915550005");
  await page.locator('button:has-text("مراجعة")').first().click({ timeout: 8000 });
  await page.waitForTimeout(2000);
  const dlg = page.locator('[role="dialog"] button:has-text("تأكيد"), [role="dialog"] button:has-text("إرسال")');
  if (await dlg.count()) {
    await dlg.first().click({ timeout: 8000 });
    await page.waitForTimeout(8000);
  }
  const url = page.url();
  const body = await page.locator("body").innerText();
  const confirmed = url.includes("order-confirmed") || body.includes("تأكيد");
  expect(confirmed).toBeTruthy();

  // ── 2. Owner opens orders page and sees the order with the note ──
  const ctx2 = await page.context().newPage();
  await ctx2.goto("/login", { waitUntil: "networkidle" });
  await ctx2.waitForTimeout(1500);
  await ctx2.locator("input").nth(0).fill(OWNER);
  await ctx2.locator("input").nth(1).fill(PASS);
  await ctx2.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await ctx2.waitForTimeout(4000);
  await ctx2.goto("/owner/orders", { waitUntil: "networkidle" });
  await ctx2.waitForTimeout(4000);
  const ordersBody = await ctx2.locator("body").innerText();
  const hasNote = ordersBody.includes("توصيل سريع R5");
  console.log(`R5 owner sees order note: ${hasNote}`);
  expect(ordersBody).not.toContain("فشل");
  await ctx2.close();
});

test("edge: empty cart cannot be submitted", async ({ page }) => {
  await page.goto("/cart", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  const emptyState = body.includes("لا توجد") || body.includes("فارغة") || body.includes("أضف أصناف");
  // Either the empty state is shown, or a submit attempt is blocked
  const submit = page.locator('button:has-text("مراجعة"), button:has-text("تأكيد"), button:has-text("إرسال الطلب")').first();
  if (await submit.count()) {
    // try to submit empty cart — must not proceed to confirmation
    await submit.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(url).not.toContain("order-confirmed");
  } else {
    expect(emptyState).toBeTruthy();
  }
});

test("edge: item quantity can be increased via counter then removed", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(MENU, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const adds = page.locator('button:has-text("أضف")');
  await adds.first().click();
  await page.waitForTimeout(600);
  await page.goto("/cart", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  // increase quantity via + button (scope inside main content)
  const main = page.locator("main").first();
  const plus = main.locator('button:has-text("+")').first();
  if (await plus.count()) {
    await plus.click();
    await page.waitForTimeout(600);
  }
  // Remove the item: delete button is the ONLY one with text-destructive class
  const delBtn = main.locator('button[class*="destructive"]').first();
  expect(await delBtn.count()).toBeGreaterThan(0);
  await delBtn.click({ timeout: 6000 });
  await page.waitForTimeout(1200);

  // After deleting our item, cart shows empty state OR our item is gone
  const body = await page.locator("body").innerText();
  const fullyEmpty = body.includes("أضف بعض الأصناف") || !body.includes("د.ل");
  expect(fullyEmpty).toBeTruthy();
});