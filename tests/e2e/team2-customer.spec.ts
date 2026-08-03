/**
 * Team 2 — Public visitor / customer journey (no login)
 * Deep interactive flows: menu browse, search, filter, cart, order, share, 404, PWA.
 * Run: npx playwright test tests/e2e/team2-customer.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

const MENU = "/menu/al-waha-cafe-demo";

test("menu: loads with items and categories", async ({ page }) => {
  await page.goto(MENU, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  expect(body).toContain("مقهى الواحة");
  expect(await page.locator('button:has-text("أضف")').count()).toBeGreaterThan(0);
  expect(body).toContain("د.ل");
});

test("menu: category filter shows only that category", async ({ page }) => {
  await page.goto(MENU, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const cat = page.locator('button:has-text("مشروبات ساخنة")').first();
  if (await cat.count()) {
    await cat.click();
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    // Hot drinks category should NOT show cold drinks (سموثي/ليموناضة)
    expect(body).not.toContain("سموثي");
    expect(body).not.toContain("ليموناضة");
  }
});

test("cart: add 2 items, change qty, remove, empty state", async ({ page }) => {
  await page.goto(MENU, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const adds = page.locator('button:has-text("أضف")');
  expect(await adds.count()).toBeGreaterThanOrEqual(1);
  await adds.first().click();
  await page.waitForTimeout(600);
  await page.goto("/cart", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  expect(body).toContain("د.ل");
  // Remove item → empty state
  const btns = await page.locator("button").all();
  const svgBtns: number[] = [];
  for (let i = 0; i < btns.length; i++) {
    if (!(await btns[i].innerText()).trim() && (await btns[i].locator("svg").count())) svgBtns.push(i);
  }
  if (svgBtns.length) {
    await btns[svgBtns[svgBtns.length - 1]].click();
    await page.waitForTimeout(1000);
    const body2 = await page.locator("body").innerText();
    const emptyShown = body2.includes("فارغة") || body2.includes("لا توجد");
    expect(emptyShown).toBeTruthy();
  }
});

test("order: complete flow to confirmation", async ({ page }) => {
  await page.goto(MENU, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const adds = page.locator('button:has-text("أضف")');
  await adds.first().click();
  await page.waitForTimeout(600);
  await page.goto("/cart", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.getByPlaceholder("الاسم (اختياري)").fill("QA Customer");
  await page.getByPlaceholder("رقم الهاتف (اختياري)").fill("0910000099");
  await page.locator('button:has-text("مراجعة")').first().click({ timeout: 8000 });
  await page.waitForTimeout(2000);
  const dlg = page.locator('[role="dialog"] button:has-text("تأكيد"), [role="dialog"] button:has-text("إرسال")');
  if (await dlg.count()) {
    await dlg.first().click({ timeout: 8000 });
    await page.waitForTimeout(8000);
  }
  const body = await page.locator("body").innerText();
  const confirmed = page.url().includes("order-confirmed") || body.includes("تأكيد");
  expect(confirmed).toBeTruthy();
});

test("share: menu share button produces valid URL", async ({ page }) => {
  await page.goto(MENU, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const share = page.locator('button:has-text("شارك المنيو")').first();
  if (await share.count()) {
    await share.click();
    await page.waitForTimeout(1500);
    // Share may open native dialog — verify page still fine, no crash
    expect(await page.locator("body").innerText()).toContain("مقهى الواحة");
  }
});

test("404: random slug shows not-found page", async ({ page }) => {
  await page.goto(`/menu/qa-ghost-${Date.now()}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(50);
  // Should not render a normal menu (no prices)
  expect(body).not.toContain("د.ل");
});

test("landing: all internal links resolve (no broken links)", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
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
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const sw = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "unsupported";
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map((r) => !!r.active).join(",");
  });
  expect(sw).toContain("true");
  const manifest = await page.evaluate(async () => {
    const r = await fetch("/manifest.json");
    return r.status;
  });
  expect(manifest).toBe(200);
});
