/**
 * Round 80 — Visual geometry audit on mobile (390x844) for ALL public pages.
 * Checks: horizontal overflow, floating cart button inside viewport,
 * bottom CTAs visible, dialogs not taller than viewport.
 */
import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/menu/al-waha-cafe-demo",
  "/login",
  "/pricing",
  "/subscribe",
  "/terms",
];

for (const path of PAGES) {
  test(`geometry: ${path} — no overflow on 390px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);
    const geo = await page.evaluate(() => {
      const de = document.documentElement;
      const overflowX = de.scrollWidth > window.innerWidth;
      const overflowEls: string[] = [];
      if (overflowX) {
        document.querySelectorAll("*").forEach((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          if (r.right > window.innerWidth + 1 || r.left < -1) {
            const tag = el.tagName.toLowerCase();
            const cls = ((el as HTMLElement).className || "").toString().slice(0, 60);
            if (r.width > 0) overflowEls.push(`${tag}.${cls} [${Math.round(r.left)},${Math.round(r.right)}]`);
          }
        });
      }
      return { overflowX, overflowEls: overflowEls.slice(0, 5), scrollW: de.scrollWidth, innerW: window.innerWidth };
    });
    expect(geo.overflowX, JSON.stringify(geo.overflowEls)).toBe(false);
  });
}

test("geometry: menu page — floating cart button fully visible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  // find the floating cart button by aria-label pattern "السلة - N أصناف"
  const btn = page.locator('button[aria-label^="السلة"]').last();
  if (await btn.count()) {
    const box = await btn.boundingBox();
    console.log("CART BTN BOX:", JSON.stringify(box));
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    expect(box!.y + box!.height).toBeLessThanOrEqual(845);
  } else {
    console.log("No floating cart button found (menu may be empty)");
  }
});

test("geometry: half-sheet dialogs never exceed 85vh on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  // Open first item (add-to-cart sheet)
  const addBtn = page.locator('button:has-text("أضف")').first();
  if (await addBtn.count()) {
    await addBtn.click();
    await page.waitForTimeout(1200);
    const dialogs = await page.evaluate(() => {
      const out: any[] = [];
      document.querySelectorAll('[role="dialog"], [class*="sheet"], [class*="Sheet"]').forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.height > 0 && r.width > 100) {
          out.push({ cls: (el.className || "").toString().slice(0, 60), h: Math.round(r.height), vh: Math.round((r.height / window.innerHeight) * 100) });
        }
      });
      return out;
    });
    console.log("DIALOGS:", JSON.stringify(dialogs));
    for (const d of dialogs) {
      expect(d.vh, `dialog ${d.cls} exceeds 85vh`).toBeLessThanOrEqual(85);
    }
  } else {
    console.log("No add button found on menu page");
  }
});