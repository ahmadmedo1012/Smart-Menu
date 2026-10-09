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

      // the group renders with its hint + counter; r135 defaults: the cheapest
      // option (صغير +0) is preselected (Starbucks pattern — required groups
      // never block on open), so the counter reads «المحدد ١/١» not 0.
      const groupFieldset = sheet.locator(`fieldset[aria-label="${GROUP}"]`);
      await expect(groupFieldset).toBeVisible({ timeout: 10_000 });
      await expect(groupFieldset.getByText("اختر على الأقل 1")).toBeVisible();
      /* r135: الافتراضي المسبق — أرخص خيار (صغير) محدد فور الفتح؛ العدّاد
         يعرض «المحدد ١/١» بالأرقام العربية الهندية (toArabicNumber). */
      const smallOption = groupFieldset.getByRole("button", { name: "صغير", exact: true });
      await expect(smallOption).toHaveAttribute("aria-pressed", "true");
      await expect(groupFieldset.getByText(/المحدد [1١]/)).toBeVisible();

      // ── 3. Pick «كبير» → live price updates (25 + 2 = 27) ──
      const bigOption = groupFieldset.getByRole("button", { name: /كبير/ });
      await bigOption.click();
      await expect(bigOption).toHaveAttribute("aria-pressed", "true");
      /* r135: الراديو يستبدل — العدّاد يبقى ١ والاختيار المسبق (صغير) ينزلق */
      await expect(smallOption).toHaveAttribute("aria-pressed", "false");
      await expect(groupFieldset.getByText(/المحدد [1١]/)).toBeVisible();
      // unit price + total both reflect the modifier (estimate mirrors server math)
      // round89 coordinator fix: scope to the price span — the quantity stepper
      // also uses text-xl tabular-nums (strict-mode 2-match).
      // r95: الحبر السعري أصبح text-accent-foreground (توأمة SmartBot) بدل text-primary.
      // r123: r120-B1's formatPrice smart-trim contract — never a bare ".0"
      // (27.0 renders "27"; +2.0 renders "+2"). The deep suite hadn't run in CI
      // since 2026-09-17, so these pins kept the pre-r120 shape.
      await expect(sheet.locator("span.text-xl.text-accent-foreground.tabular-nums")).toContainText("27");
      await expect(sheet.locator("span.text-2xl.tabular-nums")).toContainText("27");
      await expect(sheet.getByText("شامل الخيارات +2 د.ل")).toBeVisible();

      // ── 4. Confirm → cart carries the configured line ──
      // r123: r120 (U5-F-3) renamed the CTA to the honest «أضف إلى السلة» (it adds
      // to the cart; it never sent WhatsApp directly).
      await sheet.getByRole("button", { name: "أضف إلى السلة" }).click();
      await page.waitForURL("**/cart", { timeout: 20_000 });
      await expect(page.getByText("كبير (+2 د.ل)")).toBeVisible({ timeout: 10_000 });
      await expect(page.locator("span.text-2xl.tabular-nums").first()).toContainText("27");

      // ── 5. Checkout → confirmation page with the order number ──
      await page.getByRole("button", { name: "مراجعة الطلب وإرساله" }).click();
      const preview = page.getByRole("dialog");
      await expect(preview.getByText("مراجعة الطلب")).toBeVisible({ timeout: 10_000 });
      await expect(preview.getByText("كبير (+2 د.ل)")).toBeVisible(); // r123: r120-B1 smart-trim
      await preview.getByRole("button", { name: "تأكيد وإرسال" }).click();
      await page.waitForURL("**/order-confirmed**", { timeout: 30_000 });
      const orderNo = new URL(page.url()).searchParams.get("orderNo") ?? "";
      expect(orderNo.length).toBeGreaterThan(4);

      // ── 6. Server truth: the stored order is priced 27 with the option id ──
      // r96: كل المعرفات ديناميكية — كانت مثبتة (restaurantId=1 / itemId=4 /
      // categoryId=2) بافتراض ترتيب الإنشاء الذاتي لقاعدة نظيفة، لكن هجرة
      // 20260909_round96_demo_menu تنشئ al-waha-cafe-demo و25 صنفًا قبل البذور
      // (migrate deploy يسبق البذور) فيزيح كل الترقيم الذاتي.
      const meJson = await (await page.request.get("/api/auth/me")).json();
      const rid: number = meJson?.data?.restaurantId ?? 1;

      // الصنف الحي بمجموعاته الخيارات (قبل توكيد الطلب — المصدر نفسه للمعرفات)
      const itemsRes = await page.request.get(`/api/items?restaurantId=${rid}&pageSize=100`);
      expect(itemsRes.ok()).toBeTruthy();
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

      const listRes = await page.request.get(`/api/orders?restaurantId=${rid}&pageSize=10`);
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
      expect(line.itemId).toBe(burger.id); // Waha Burger — المعرف الحي (r96: الترقيم الذاتي زاح)
      // r123: r120-B1 cutover (2026-09-25, commit 4ba875a2) — OrderItem.price
      // stores the EFFECTIVE price (base 25 + كبير 2 = 27); pre-cutover rows
      // kept the base. The r122 backfill migration documents the same contract.
      expect(Number(line.price)).toBe(27); // stored EFFECTIVE price (r120 cutover)
      // r123: modifiersJson carries the r118-B1 SNAPSHOT format
      // ([{id,name,nameAr,priceDelta}]) — bare-id arrays were the pre-r118 shape.
      const storedMods: Array<{ id: number; nameAr: string; priceDelta: number }> = JSON.parse(line.modifiersJson ?? "[]");
      expect(storedMods).toHaveLength(1);
      expect(storedMods[0].id).toBe(big.id); // exactly the «كبير» option we authored
      expect(storedMods[0].nameAr).toBe("كبير");
      expect(storedMods[0].priceDelta).toBe(2);
    }
  );
});
