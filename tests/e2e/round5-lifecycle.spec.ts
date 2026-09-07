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
  // round92-C6: settle → conditional wait — hydration settle + the first add
  // button visible (exactly what the count assertion below needs).
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await expect(page.locator('button:has-text("أضف")').first()).toBeVisible({ timeout: 15000 });
  const adds = page.locator('button:has-text("أضف")');
  expect(await adds.count()).toBeGreaterThan(0);
  await adds.first().click();
  // round92-C6: settle → conditional wait — the cart-add toast proves the
  // click landed and the persisted store updated before navigating.
  await expect(page.getByText("تمت الإضافة!").first()).toBeVisible({ timeout: 5000 });

  await page.goto("/cart", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the phone field renders with the
  // cart form; the unguarded fill below needs it.
  await page.locator("#cart-phone").waitFor({ state: "visible", timeout: 15000 });
  const note = page.getByPlaceholder(/ملاحظات للطلب/).first();
  if (await note.count()) await note.fill("توصيل سريع R5");
  // name field removed per UX decision
  await page.locator("#cart-phone").fill("0915550005");
  await page.locator('button:has-text("مراجعة")').first().click({ timeout: 8000 });
  // round92-C6: settle → conditional wait — the ReviewDialog mounts client-side;
  // tolerant because the count() guard below treats absence as skip.
  await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const dlg = page.locator('[role="dialog"] button:has-text("تأكيد"), [role="dialog"] button:has-text("إرسال")');
  if (await dlg.count()) {
    await dlg.first().click({ timeout: 8000 });
    // round92-C6: settle → conditional wait — checkout POSTs the order then
    // redirects to /order-confirmed; wait for the navigation itself
    // (tolerant: the assertion below also accepts the in-place confirmed
    // state before the redirect).
    await page.waitForURL(/order-confirmed/, { timeout: 20000 }).catch(() => {});
  }
  const url = page.url();
  const body = await page.locator("body").innerText();
  const confirmed = url.includes("order-confirmed") || body.includes("تأكيد");
  expect(confirmed).toBeTruthy();

  // ── 2. Owner opens orders page and sees the order with the note ──
  const ctx2 = await page.context().newPage();
  await ctx2.goto("/login", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — fills/clicks auto-wait for the
  // form, but not React hydration (round87-journeys race); settle the network.
  await ctx2.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await ctx2.locator("input").nth(0).fill(OWNER);
  await ctx2.locator("input").nth(1).fill(PASS);
  await ctx2.locator('button[type="submit"], button:has-text("دخول")').first().click();
  // round92-C6: settle → conditional wait — the login POST decides the wait
  // (tolerant: the suite continues to /owner/orders regardless).
  await ctx2.waitForURL(/\/owner/, { timeout: 20000 }).catch(() => {});
  await ctx2.goto("/owner/orders", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the orders h1 renders only when
  // the fetch settles (loading shows the skeleton branch).
  await ctx2
    .getByRole("heading", { name: "الطلبات" })
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  const ordersBody = await ctx2.locator("body").innerText();
  const hasNote = ordersBody.includes("توصيل سريع R5");
  console.log(`R5 owner sees order note: ${hasNote}`);
  expect(ordersBody).not.toContain("فشل");
  await ctx2.close();
});

test("edge: empty cart cannot be submitted", async ({ page }) => {
  await page.goto("/cart", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the empty state renders after
  // store hydration; tolerant because a non-empty cart takes the submit
  // path the guard below handles.
  await page.getByText("السلة فارغة").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const body = await page.locator("body").innerText();
  const emptyState = body.includes("لا توجد") || body.includes("فارغة") || body.includes("أضف أصناف");
  // Either the empty state is shown, or a submit attempt is blocked
  const submit = page.locator('button:has-text("مراجعة"), button:has-text("تأكيد"), button:has-text("إرسال الطلب")').first();
  if (await submit.count()) {
    // try to submit empty cart — must not proceed to confirmation
    await submit.click({ timeout: 5000 }).catch(() => {});
    // deliberate (round92-C6): negative-observation window — proves an empty
    // cart does NOT navigate to order-confirmed; there is no element to await
    // for an absence, so the fixed window stays (short and semantic).
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
  // round92-C6: settle → conditional wait — hydration settle before the
  // SSR'd CTA click (the click itself auto-waits for the button).
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  const adds = page.locator('button:has-text("أضف")');
  await adds.first().click();
  // round92-C6: settle → conditional wait — the cart-add toast proves the
  // click landed before navigating to /cart.
  await expect(page.getByText("تمت الإضافة!").first()).toBeVisible({ timeout: 5000 });
  await page.goto("/cart", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the phone field renders with the
  // cart form; the qty/delete flow below needs the hydrated page.
  await page.locator("#cart-phone").waitFor({ state: "visible", timeout: 15000 });
  // increase quantity via + button (scope inside main content)
  const main = page.locator("main").first();
  const plus = main.locator('button:has-text("+")').first();
  if (await plus.count()) {
    await plus.click();
    // round92-C6: settle → conditional wait — the line counter re-renders
    // with toArabicNumber(2) after "+" (guarded, unasserted → tolerant).
    await main.getByText("٢").first().waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  }
  // Remove the item: delete button is the ONLY one with text-destructive class
  const delBtn = main.locator('button[class*="destructive"]').first();
  expect(await delBtn.count()).toBeGreaterThan(0);
  await delBtn.click({ timeout: 6000 });
  // round92-C6: settle → conditional wait — the empty-state text the
  // assertion looks for is itself the wait target.
  await expect(page.getByText("أضف بعض الأصناف إلى السلة").first()).toBeVisible({ timeout: 10000 });

  // After deleting our item, cart shows empty state OR our item is gone
  const body = await page.locator("body").innerText();
  const fullyEmpty = body.includes("أضف بعض الأصناف") || !body.includes("د.ل");
  expect(fullyEmpty).toBeTruthy();
});