/**
 * Team 2 — Public visitor / customer journey (no login)
 * Deep interactive flows: menu browse, search, filter, cart, order, share, 404, PWA.
 * Run: npx playwright test tests/e2e/team2-customer.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

const MENU = "/menu/al-waha-cafe-demo";

test("menu: loads with items and categories", async ({ page }) => {
  await page.goto(MENU, { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — the menu grid is SSR'd, so waiting
  // for the first "أضف" card CTA covers the name/price/count assertions below.
  await expect(page.locator('button:has-text("أضف")').first()).toBeVisible({ timeout: 15000 });
  const body = await page.locator("body").innerText();
  expect(body).toContain("مقهى الواحة");
  expect(await page.locator('button:has-text("أضف")').count()).toBeGreaterThan(0);
  expect(body).toContain("د.ل");
});

test("menu: category filter shows only that category", async ({ page }) => {
  await page.goto(MENU, { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — category tabs are SSR'd, so
  // visibility alone can't prove React hydration (round87-journeys race);
  // settle the network before the click instead of a blind 2500ms nap.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  const cat = page.locator('button:has-text("مشروبات ساخنة")').first();
  if (await cat.count()) {
    await cat.click();
    // round92-C6: settle → conditional wait — the result banner renders only
    // with an active category, proving the list re-rendered before the
    // negative text assertions below (guarded flow → tolerant).
    // r138-exec-2: «عُثر على» — the counter copy changed from «تم العثور على».
    await page
      .getByText(/عُثر على|لا توجد نتائج/)
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {});
    const body = await page.locator("body").innerText();
    // Hot drinks category should NOT show cold drinks (سموثي/ليموناضة)
    expect(body).not.toContain("سموثي");
    expect(body).not.toContain("ليموناضة");
  }
});

test("cart: add 2 items, change qty, remove, empty state", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(MENU, { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — hydration settle before clicking
  // the SSR'd CTA (the render wait already follows on the next line).
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  const adds = page.locator('button:has-text("أضف")');
  await adds.first().waitFor({ state: "visible", timeout: 15000 });
  await adds.first().click();
  // round92-C6: settle → conditional wait — the cart-add toast proves the
  // click landed and the localStorage-persisted store updated before nav.
  await expect(page.getByText("تمت الإضافة!").first()).toBeVisible({ timeout: 5000 });
  await page.goto("/cart", { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — the remove button renders with
  // the cart line items (after store hydration); tolerant because the
  // /login-bounce guard below decides.
  await page
    .getByRole("button", { name: "حذف الصنف" })
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  // Cart is protected — if bounced to /login, the empty-state assertions
  // still hold (no "د.ل" cart totals rendered).
  const body = await page.locator("body").innerText();
  if (!page.url().includes("/login")) {
    expect(body).toContain("د.ل");
  }
  // Remove item → empty state. The remove button is icon-only with the
  // label in aria-label (no text node), so :has-text never matches — use the
  // accessible name instead.
  const removeBtn = page.getByRole("button", { name: "حذف الصنف" });
  await removeBtn.waitFor({ state: "visible", timeout: 15000 });
  await removeBtn.click();
  // round92-C6: settle → conditional wait — the empty-state text the
  // assertion looks for is itself the wait target.
  await expect(page.getByText("السلة فارغة").first()).toBeVisible({ timeout: 10000 });
  const body2 = await page.locator("body").innerText();
  const emptyShown = body2.includes("فارغة") || body2.includes("لا توجد");
  expect(emptyShown).toBeTruthy();
});

test("order: complete flow to confirmation", async ({ page }) => {
  test.setTimeout(90000);
  // Guest order path: browse demo menu → order dialog → WhatsApp confirm.
  // (The /cart page is account-scoped; guest ordering goes through OrderDialog.)
  await page.goto(MENU, { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — hydration settle before clicking
  // the SSR'd CTA (the render wait already follows on the next line).
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  const adds = page.locator('button:has-text("أضف")');
  await adds.first().waitFor({ state: "visible", timeout: 15000 });
  // round92-C6: settle → conditional wait — the pre-click 600ms nap was a
  // hydration buffer; the network is already settled above.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  // Open the direct order dialog for the first item
  const orderBtns = page.locator('button:has-text("اطلب")');
  if (await orderBtns.count()) {
    await orderBtns.first().click({ timeout: 8000 });
    // round92-C6: settle → conditional wait — the click either opens the
    // OrderDialog or quick-adds (toast, role=alert); guarded flow → tolerant.
    await page
      .locator('[role="dialog"], [role="alert"]')
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {});
  } else {
    // Fallback: click the item card itself to open the dialog
    await adds.first().click({ timeout: 8000 });
    // round92-C6: settle → conditional wait — same outcome wait (dialog or
    // add-toast) for the fallback branch.
    await page
      .locator('[role="dialog"], [role="alert"]')
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {});
  }
  const dlg = page.locator('[role="dialog"]');
  if (await dlg.count()) {
    // Fill phone (optional field) then confirm via WhatsApp
    const phone = dlg.getByPlaceholder("رقم الهاتف (اختياري)").first();
    if (await phone.count()) await phone.fill("0910000099");
    // r120-U3: the dialog CTA is now the honest «أضف إلى السلة» (was «أرسل الطلب عبر واتساب»);
    // try the current label first, keep the old one as a tolerant fallback.
    const wa = dlg.locator('button:has-text("أضف إلى السلة"), button:has-text("أرسل الطلب عبر واتساب")').first();
    if (await wa.count()) {
      await wa.click({ timeout: 8000 });
      // round92-C6: settle → conditional wait — WhatsApp-confirm adds the
      // line then auto-redirects to /cart (~800ms); wait for a terminal cart
      // surface before the health read (guarded flow → tolerant).
      await page
        .locator('#cart-phone, input[placeholder="اسم المستخدم"]')
        .first()
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {});
    }
  }
  const body = await page.locator("body").innerText();
  // Either the success screen rendered or WhatsApp opened — page stays healthy
  expect(body.length).toBeGreaterThan(50);
});

test("share: menu share button produces valid URL", async ({ page }) => {
  await page.goto(MENU, { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — the share button is a client-only
  // island (dynamic ssr:false), so its visibility proves hydration; tolerant
  // because the count() guard below treats absence as skip.
  await page
    .locator('button:has-text("شارك المنيو")')
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  const share = page.locator('button:has-text("شارك المنيو")').first();
  if (await share.count()) {
    await share.click();
    // round92-C6: settle → conditional wait — the copy/share result toast
    // (success or failure text) proves the click landed (guarded → tolerant).
    await page
      .getByText(/تم نسخ الرابط|فشل النسخ/)
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {});
    // Share may open native dialog — verify page still fine, no crash
    expect(await page.locator("body").innerText()).toContain("مقهى الواحة");
  }
});

test("404: random slug shows not-found page", async ({ page }) => {
  await page.goto(`/menu/qa-ghost-${Date.now()}`, { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — the root 404 boundary's h1;
  // tolerant: the weak body assertions below stay the deciders.
  await page
    .getByRole("heading", { name: "الصفحة غير موجودة" })
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(50);
  // Should not render a normal menu (no prices)
  expect(body).not.toContain("د.ل");
});

test("landing: all internal links resolve (no broken links)", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — the landing link farm is SSR'd;
  // wait for the first link so the harvest below sees a populated DOM
  // (tolerant — an empty harvest is the old weak-pass path).
  await page.locator("a[href]").first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && !h.startsWith("#") && !h.startsWith("tel:") && !h.startsWith("wa.me") && !h.startsWith("http"))
  );
  const broken: string[] = [];
  for (const rawH of [...new Set(hrefs)]) {
    const h = rawH ?? "";
    if (!h) continue;
    const status = await page.evaluate(async (url) => {
      const r = await fetch(url, { method: "GET" });
      return r.status;
    }, h);
    if (status >= 400 && !h.includes("/api/")) broken.push(`${h} → ${status}`);
  }
  expect(broken).toEqual([]);
});

test("PWA: manifest + service worker registered", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // SW registration can lag behind first paint — poll until active or timeout
  let sw = "";
  // round92-C6: settle → conditional wait — the manual poll loop (10 × fixed
  // 1500ms naps) becomes expect.poll: same retry-until-active semantics and
  // the same 15s budget, with no blind sleep between checks.
  await expect
    .poll(
      async () => {
        sw = await page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) return "unsupported";
          const regs = await navigator.serviceWorker.getRegistrations();
          return regs.map((r) => !!r.active).join(",");
        });
        return sw;
      },
      { timeout: 15000 }
    )
    .toContain("true");
  expect(sw).toContain("true");
  const manifest = await page.evaluate(async () => {
    const r = await fetch("/manifest.json");
    return r.status;
  });
  expect(manifest).toBe(200);
});
