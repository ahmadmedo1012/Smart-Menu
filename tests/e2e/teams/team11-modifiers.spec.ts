/**
 * Team 11 — Modifiers feature journey (ميزة المعدِّلات — w3-f1).
 *
 * Journey: login as waha_owner → open the item editor in /owner/menu →
 * add a «الحجم» group (صغير +0 / كبير +2 د.ل, min 1 / max 1) to Waha Burger →
 * save → the PUBLIC menu (/menu/al-waha-cafe) shows the «خيارات متاحة» chip →
 * the customer opens the order sheet, picks «كبير», sees the live price
 * (25 + 2 = 27), confirms → /cart carries the configured line (+ summary) →
 * checkout → /order-confirmed → the stored order is re-priced BY THE SERVER
 * (total 27) and its line's modifiersJson holds exactly the «كبير» option id.
 *
 * localhost-only by design (owner writes + order creation are destructive):
 * requires the round83 seed (waha_owner / al-waha-cafe / Waha Burger 25 د.ل).
 * Run: npx playwright test tests/e2e/teams/team11-modifiers.spec.ts --project=qa-teams
 *
 * Idempotency: the editor step DELETES any leftover «الحجم» group from a
 * previous run before re-adding it (the PUT is a full replace, so re-runs
 * converge to the same fixture state).
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import { login as qaLogin, loginBudget } from "../qa-helpers";

const OWNER = "waha_owner";
const PASS = "waha123456";
const MENU = "/menu/al-waha-cafe";
const CATEGORY = "Meals";
const ITEM = "Waha Burger"; // round83 seed: price 25
const ITEM_AR = "برجر الواحة";
const GROUP = "الحجم";
const EXPECTED_TOTAL = 27; // 25 + كبير(+2)

async function ownerLogin(page: Page) {
  test.setTimeout(loginBudget());
  await qaLogin(page, OWNER, PASS);
  if (!page.url().includes("/owner")) {
    await page.waitForTimeout(3000);
    await qaLogin(page, OWNER, PASS);
  }
  expect(page.url()).toContain("/owner");
}

/** The owner-menu row of a specific item (rows live under div.divide-y). */
function itemRow(page: Page, item: string): Locator {
  return page
    .locator("div.divide-y > div", { has: page.locator(`span:text-is("${item}")`) })
    .first();
}

/** Navigate to the menu editor and open the edit dialog for an item. */
async function openItemEditor(page: Page, item: string): Promise<Locator> {
  await page.goto("/owner/menu", { waitUntil: "domcontentloaded" });
  const catHeader = page.locator("div.cursor-pointer", { hasText: CATEGORY }).first();
  await expect(catHeader).toBeVisible({ timeout: 20_000 });
  const row = itemRow(page, item);
  if (!(await row.isVisible().catch(() => false))) {
    await catHeader.click();
  }
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.locator('button[title="تعديل"]').click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText("تعديل صنف")).toBeVisible();
  return dialog;
}

test.describe("team11: modifiers editor → public menu → priced order", () => {
  test(
    "owner adds «الحجم» group → customer picks «كبير» → order stored at 27",
    async ({ page }) => {
      test.setTimeout(330_000);

      // ── 1. Owner: add the modifier group in the item editor ──
      await ownerLogin(page);
      const dialog = await openItemEditor(page, ITEM);

      // idempotency: drop a leftover «الحجم» group from a previous run
      const stale = dialog.locator('button[aria-label="حذف مجموعة الحجم"]');
      if ((await stale.count()) > 0) {
        await stale.first().click();
        await page.waitForTimeout(300);
      }

      await dialog.getByRole("button", { name: "إضافة مجموعة" }).click();
      const group = dialog.locator("fieldset").last();
      await expect(group).toBeVisible();
      await group.getByPlaceholder(GROUP).fill(GROUP);
      await group.getByLabel("الحد الأدنى").fill("1");
      await group.getByLabel("الحد الأقصى").fill("1");

      // two options: صغير (+0) and كبير (+2). Each «إضافة خيار» appends a row
      // (name text input + ± price number input) — target the LAST row each time.
      for (const [name, delta] of [
        ["صغير", "0"],
        ["كبير", "2"],
      ] as const) {
        await group.getByRole("button", { name: "إضافة خيار" }).click();
        const optionRow = group.locator("div.flex-wrap.items-end").last();
        await optionRow.locator("input").first().fill(name);
        await optionRow.locator('input[type="number"]').fill(delta);
      }

      await dialog.getByRole("button", { name: "تحديث" }).click();
      await expect(page.getByText("تم تحديث الصنف")).toBeVisible({ timeout: 20_000 });
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // ── 2. Public menu: the card signals choices and opens the sheet ──
      await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 40_000 });
      const card = page.locator("div.cursor-pointer", { has: page.getByRole("heading", { name: ITEM_AR }) }).first();
      await expect(card).toBeVisible({ timeout: 20_000 });
      await expect(card.getByText("خيارات متاحة")).toBeVisible();

      // round90 (منسق الجولة — إصلاح تذبذب اكتشفه e2e المحلي): سباق الترطيب —
      // بطاقة SSR تظهر قبل أن يربط React المعالجات، فالنقر على «خيارات» قبل
      // اكتمال الترطيب عملية صامتة بلا أثر (dialog لا يفتح أبدًا — برهان
      // g90-debug4: pointerdown+click يصلان للزر لكن لا معالج). إعادة المحاولة
      // بنمط deterministic بدل مهلة صمّاء (نفس توصية D4 بند 4 لليلة).
      const sheet = page.getByRole("dialog");
      for (let attempt = 0; attempt < 3 && (await sheet.count()) === 0; attempt++) {
        await card.getByRole("button", { name: `خيارات ${ITEM_AR}` }).click();
        if (attempt < 2) await page.waitForTimeout(1200);
      }
      await expect(sheet).toBeVisible({ timeout: 15_000 });

      // the group renders with its hint + counter; nothing selected yet
      const groupFieldset = sheet.locator(`fieldset[aria-label="${GROUP}"]`);
      await expect(groupFieldset).toBeVisible({ timeout: 10_000 });
      await expect(groupFieldset.getByText("اختر على الأقل 1")).toBeVisible();
      await expect(groupFieldset.getByText(/المحدد 0/)).toBeVisible();

      // ── 3. Pick «كبير» → live price updates (25 + 2 = 27) ──
      const bigOption = groupFieldset.getByRole("button", { name: /كبير/ });
      await bigOption.click();
      await expect(bigOption).toHaveAttribute("aria-pressed", "true");
      await expect(groupFieldset.getByText(/المحدد 1/)).toBeVisible();
      // unit price + total both reflect the modifier (estimate mirrors server math)
      // round89 coordinator fix: scope to the price span (text-primary) — the
      // quantity stepper also uses text-xl tabular-nums (strict-mode 2-match).
      await expect(sheet.locator("span.text-xl.text-primary.tabular-nums")).toContainText("27.0");
      await expect(sheet.locator("span.text-2xl.tabular-nums")).toContainText("27.0");
      await expect(sheet.getByText("شامل الخيارات +2.0 د.ل")).toBeVisible();

      // ── 4. Confirm → cart carries the configured line ──
      await sheet.getByRole("button", { name: "أرسل الطلب عبر واتساب" }).click();
      await page.waitForURL("**/cart", { timeout: 20_000 });
      await expect(page.getByText("كبير (+2.0 د.ل)")).toBeVisible({ timeout: 10_000 });
      await expect(page.locator("span.text-2xl.tabular-nums").first()).toContainText("27.0");

      // ── 5. Checkout → confirmation page with the order number ──
      await page.getByRole("button", { name: "مراجعة الطلب وإرساله" }).click();
      const preview = page.getByRole("dialog");
      await expect(preview.getByText("مراجعة الطلب")).toBeVisible({ timeout: 10_000 });
      await expect(preview.getByText("كبير (+2.0 د.ل)")).toBeVisible();
      await preview.getByRole("button", { name: "تأكيد وإرسال" }).click();
      await page.waitForURL("**/order-confirmed**", { timeout: 30_000 });
      const orderNo = new URL(page.url()).searchParams.get("orderNo") ?? "";
      expect(orderNo.length).toBeGreaterThan(4);

      // ── 6. Server truth: the stored order is priced 27 with the option id ──
      const listRes = await page.request.get("/api/orders?restaurantId=1&pageSize=10");
      expect(listRes.ok()).toBeTruthy();
      const listJson = await listRes.json();
      const row = (listJson.data ?? []).find((o: { orderNo: string }) => o.orderNo === orderNo);
      expect(row, `order ${orderNo} found via owner session`).toBeTruthy();
      expect(Number(row.total)).toBe(EXPECTED_TOTAL);

      const detRes = await page.request.get(`/api/orders/${row.id}`);
      expect(detRes.ok()).toBeTruthy();
      const detJson = await detRes.json();
      expect(Number(detJson.data.subtotal)).toBe(EXPECTED_TOTAL);
      const line = detJson.data.items[0];
      expect(line.itemId).toBe(4); // Waha Burger
      expect(Number(line.price)).toBe(25); // stored base price (modifiers ride separately)
      const storedIds: number[] = JSON.parse(line.modifiersJson ?? "[]");
      expect(storedIds).toHaveLength(1);

      // the stored id is exactly the «كبير» option of the group we authored
      const itemsRes = await page.request.get("/api/items?categoryId=2&pageSize=50");
      const itemsJson = await itemsRes.json();
      const burger = (itemsJson.data ?? []).find((i: { name: string }) => i.name === ITEM);
      expect(burger).toBeTruthy();
      const sizeGroup = (burger.modifierGroups ?? []).find((g: { nameAr: string }) => g.nameAr === GROUP);
      expect(sizeGroup).toBeTruthy();
      expect(sizeGroup.minSelect).toBe(1);
      expect(sizeGroup.maxSelect).toBe(1);
      const big = sizeGroup.options.find((o: { nameAr: string }) => o.nameAr === "كبير");
      const small = sizeGroup.options.find((o: { nameAr: string }) => o.nameAr === "صغير");
      expect(big).toBeTruthy();
      expect(Number(big.priceDelta)).toBe(2);
      expect(Number(small.priceDelta)).toBe(0);
      expect(storedIds[0]).toBe(big.id);
    }
  );
});
