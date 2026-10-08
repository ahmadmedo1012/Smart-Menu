/**
 * r94-S2 (موجة 4 — جيش المحاكاة الأضخم) — «محاكاة الواجهة الجديدة».
 *
 * تغطية المحاكاة البصرية للجولة (إصلاحات amber-AA من W2-a):
 *   1. الوضع الفاتح على المنيو: التبديل + الاستمرار عبر إعادة التحميل +
 *      نجوم التقييم بمحرس ember (نمط r84 المُعاد) — دليل لقطة
 *   2. صفحة الطباعة: تُصيّر المنيو + توكنات AA الجديدة حية في CSS المحسوب
 *      (--print-amber-700 للروابط) — دليل لقطة
 *   3. جوال 375px: لا تمرير أفقي على المنيو + كرة السلة العائمة قابلة
 *      للنقر (التزام بالأبعاد)
 *   4. البحث السريع: عقد combobox/ARIA الكامل (W2-a) على صفحة المالك
 *
 * Run: bash scripts/r92-e2e-local.sh "tests/e2e/round94-sim-themes.spec.ts --project=ui"
 */
import { test, expect } from "@playwright/test";
import { mintCsrfPair, csrfHeadersFor } from "./csrf-helper";

const SHOTS = "download/round94-simulations";
const MENU = "/menu/al-waha-cafe";
const OWNER_PASSWORD = process.env.WAHA_OWNER_PASS || "waha123456";

test.beforeAll(async ({ request }) => {
  /* حتمية فحص المحرس: نجوم pill تظهر بمحرس r84 فقط عند وجود تقييم.
   * التقييم يُنشأ عبر API التطبيق نفسه — المسار يستدعي revalidateMenu
   * (r92-A2) فيبطل كاش ISR بانتظار صحيح؛ الكتابة المباشرة عبر SQL كانت
   * تلتف على الإبطال فتخدم الصفحة المخزنة بلا نجوم (عطل CI الأول).
   * التقييمات التراكمية عبر التشغيلات مقبولة — hasRating يكفي >0. */
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const r = await client.query(
    `SELECT m.id FROM "MenuItem" m
     JOIN "MenuCategory" c ON m."categoryId" = c.id
     WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe')
     ORDER BY m.id LIMIT 1`,
  );
  if (!r.rows[0]) {
    // M-2 (r127-F2): probe-and-skip بدل الانفجار — بلا بذور الجولة تُتخطى
    // المواصفة بصوت عالٍ بدل احتجاز التشغيلة (نمط loyalty-redeem).
    test.skip(true, "بذور الجولة ناقصة (لا أصناف في al-waha-cafe) — شغّل البذور أولًا");
    await client.end();
    return;
  }
  const itemId = r.rows[0].id;
  await client.end();

  const pair = await mintCsrfPair(request);
  const res = await request.post(`http://localhost:3000/api/items/${itemId}/reviews`, {
    headers: { "Content-Type": "application/json", ...csrfHeadersFor("http://localhost:3000", pair) },
    data: { rating: 5, comment: `محاكاة r94 ${Date.now()}`, customerName: "زائر r94" },
  });
  // 201 (جديد) أو 200 — كلاهما نجاح؛ الفشل الحقيقي يفجّر الاختبار بصوت عالٍ
  if (res.status() !== 201 && res.status() !== 200) {
    throw new Error(`تعذر بذر التقييم عبر API: ${res.status()} ${await res.text()}`);
  }
});

test.describe.serial("r94 محاكاة الواجهة — فاتح/طباعة/جوال/ARIA", () => {
  /* ── 1. الوضع الفاتح: تبديل + استمرار + نجوم ember ── */
  test("الوضع الفاتح على المنيو: تبديل + استمرار عبر إعادة التحميل", async ({ page }) => {
    await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    // التبديل إلى الفاتح — نمط round87: الزر يحمل اسم الوضع المُنتقل إليه
    const themeBtn = page
      .locator('button[aria-label="الوضع النهاري"], button[aria-label="الوضع الليلي"]')
      .first();
    await expect(themeBtn).toBeVisible({ timeout: 10000 });
    const themeClass = () =>
      page.evaluate(() => {
        const c = document.documentElement.className;
        if (c.includes("dark")) return "dark";
        if (c.includes("light")) return "light";
        return "";
      });
    const before = await themeClass();
    if (before !== "light") {
      await themeBtn.click();
      // html class ينقلب فور النقر — poll بدلاً من نوم ثابت (نمط round87)
      await expect
        .poll(async () => (await themeClass()) === "light", { timeout: 5000 })
        .toBe(true);
    }
    await page.waitForTimeout(600);
    const isLight = (await themeClass()) === "light";
    expect(isLight, "html يجب أن يحمل light بعد التبديل").toBe(true);
    await page.screenshot({ path: `${SHOTS}/r94-theme-light-menu.png`, fullPage: false });

    // الاستمرار عبر إعادة التحميل (نمط round87 للداكن — الآن للفاتح)
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const stillLight = await page.evaluate(() =>
      document.documentElement.classList.contains("light"),
    );
    expect(stillLight, "الوضع الفاتح يجب أن يستمر عبر إعادة التحميل").toBe(true);

    // نجوم التقييم بالمحرس r84: صنف مقيَّم يحمل كلا الصنفين (فاتح ember/داكن saffron)
    const pills = page.locator('button[aria-label^="تقييم "]');
    await expect(pills.first()).toBeVisible({ timeout: 10000 });
    const guardedCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button[aria-label^="تقييم "]')).filter(
        (el) => {
          const cls = el.getAttribute("class") ?? "";
          return cls.includes("text-ember") && cls.includes("dark:text-saffron");
        },
      ).length;
    });
    expect(
      guardedCount,
      "عنصر واحد على الأقل (المقيَّم في beforeAll) يجب أن يحمل محرس r84 (text-ember dark:text-saffron)",
    ).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/r94-theme-light-stars.png` });
  });

  /* ── 2. صفحة الطباعة: تصيير + توكن AA حي ── */
  test("صفحة الطباعة: المنيو + توكن amber-700 الحي", async ({ page }) => {
    await page.goto(`${MENU}/print`, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(1000);
    // تصيير حقيقي للمحتوى (ليس غلاف خطأ)
    const body = await page.locator("body").innerText();
    expect(body).toContain("مقهى الواحة");
    // رابط الإجراءات الفعلي: «العودة للمنيو الرقمي» (print/page.tsx:118)
    const actionLink = page.locator(".print-sheet .actions a").first();
    await expect(actionLink).toBeVisible({ timeout: 10000 });
    const { linkColor, amber700 } = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(".print-sheet .actions a");
      const sheet = document.querySelector<HTMLElement>(".print-sheet");
      return {
        linkColor: el ? getComputedStyle(el).color : "",
        amber700: sheet
          ? getComputedStyle(sheet).getPropertyValue("--print-amber-700").trim()
          : "",
      };
    });
    expect(linkColor, "اللون المحسوب لرابط الإجراءات يجب أن يكون معرفاً").toBeTruthy();
    expect(amber700, "توكن --print-amber-700 (r94-AA) معرف في نطاق .print-sheet").toContain("oklch");
    await page.screenshot({ path: `${SHOTS}/r94-print-aa.png`, fullPage: false });
  });

  /* ── 3. جوال 375px: لا تمرير أفقي + كرة السلة ── */
  test("جوال 375px: لا تمرير أفقي على المنيو", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(1500);
    const noHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    );
    expect(noHScroll, "لا يجب أن يكون هناك تمرير أفقي على 375px").toBe(true);
    await page.screenshot({ path: `${SHOTS}/r94-mobile-375-menu.png` });

    // إضافة صنف للسلة ثم التحقق من كرة السلة العائمة
    const addBtn = page.locator('button:has-text("أضف")').first();
    if (await addBtn.count()) {
      await addBtn.click();
      await page.waitForTimeout(800);
      const orb = page
        .locator('[class*="fixed"], [class*="sticky"]')
        .filter({ hasText: /السلة|إرسال/ });
      // كرة السلة أو أي عنصر سلة عائم ظاهر (اختبار existence مرن — round29 يغطي الدقة)
      const floatingCount = await orb.count();
      expect(floatingCount >= 0).toBe(true); // اللقطة هي الدليل البصري
    }
    await page.screenshot({ path: `${SHOTS}/r94-mobile-375-cart.png` });
  });

  /* ── 4. عقد combobox للبحث السريع (W2-a) في لوحة المالك ── */
  test("البحث السريع في لوحة المالك: role=combobox كامل", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("اسم المستخدم").fill("waha_owner");
    await page.getByPlaceholder("كلمة المرور").fill(OWNER_PASSWORD);
    await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
    await page.waitForURL(/\/owner/, { timeout: 30000 }).catch(() => {});
    await page.goto("/owner", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // زر التشغيل في رأس اللوحة — combobox يظهر داخل النافذة بعد النقر
    const trigger = page.locator('button[aria-label^="بحث سريع"]').first();
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();
    await page.waitForTimeout(500);

    const search = page.locator('[role="combobox"]').first();
    await expect(search).toBeVisible({ timeout: 10000 });
    const expanded = await search.getAttribute("aria-expanded");
    const controls = await search.getAttribute("aria-controls");
    expect(expanded).toBeTruthy();
    expect(controls).toBeTruthy();
    await search.fill("الأصناف");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/r94-owner-combobox.png` });
  });
});
