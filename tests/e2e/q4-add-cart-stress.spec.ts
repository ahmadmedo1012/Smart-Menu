/**
 * Q-4 (r127-F2) — مسار المال تحت الضغط: إضافة إلى السلة 10 دورات متتالية.
 *
 * الخلفية (Q-4 الأصلي): 34 ملف error.tsx تغطي مستوى المسارات على مسار
 * المال، لكن معالج الإضافة في OrderDialog كان بلا أي احتواء — أي انفجار
 * في متجر السلة كان يفكّ تركيب صفحة المنيو بالكامل (عَرَض «صفحة بيضاء
 * 1 من 10»). هذه المواصفة هي مسمار الجولة: 10 دورات كاملة، كل دورة
 * بجامع pageerror خاص بها يجب أن يبقى فارغًا:
 *
 *   منيو al-waha-cafe-demo → فتح حوار أول صنف (زر «خيارات») →
 *   «أضف إلى السلة» (مسار handleConfirm — نفس المسار المحروس الآن
 *   بtry/catch r127-F2) → تحويل تلقائي إلى /cart → السطر حاضر →
 *   حذف السطر («حذف الصنف») → «السلة فارغة».
 *
 * لماذا describe.serial + سياق جديد لكل دورة: كل دورة تبدأ بسلة نظيفة
 * وجامع أخطاء نقي — عزل الأخطاء يعرّف الدورة المذنبة فورًا.
 *
 * البذرة: qa-seed.mjs ينشئ مطعم al-waha-cafe-demo (نسخة الإنتاج المحلية)
 * — غيابه يُتخطى بصوت عالٍ (نمط M-2 probe-and-skip، مثل loyalty-redeem).
 *
 * Run: npx playwright test tests/e2e/q4-add-cart-stress.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

const MENU = "/menu/al-waha-cafe-demo";
const ITERATIONS = 10;

test.beforeAll(async () => {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const r = await client.query(
    `SELECT r.id AS rid,
       (SELECT COUNT(*)::int AS items
          FROM "MenuItem" m
          JOIN "MenuCategory" c ON c.id = m."categoryId"
         WHERE c."restaurantId" = r.id AND m.status = 'available') AS items
     FROM "Restaurant" r
     WHERE r.slug = 'al-waha-cafe-demo' LIMIT 1`,
  );
  // M-2 (r127-F2): probe-and-skip بدل الانفجار — البيئة الدنيا بلا بذرة
  // qa-seed كانت ستحتجز المواصفة. الرسالة تبقى صوتية وعربية.
  if (!r.rows[0] || r.rows[0].items < 1) {
    test.skip(true, "بذرة qa-seed ناقصة (al-waha-cafe-demo أو أصنافه) — شغّل node scripts/qa-seed.mjs أولًا");
    await client.end();
    return;
  }
  await client.end();
});

test.describe.serial("Q-4 — إضافة إلى السلة تحت الضغط: 10 دورات بلا pageerror", () => {
  test("كل دورة: منيو → حوار الصنف → أضف إلى السلة → /cart → سطر حاضر → إفراغ", async ({ browser }) => {
    // 10 دورات × (تنقلان + حوار + سلة) — ميزانية سخية لكنها محدودة
    test.setTimeout(300_000);

    for (let i = 1; i <= ITERATIONS; i++) {
      // سياق جديد لكل دورة: سلة نظيفة (localStorage فارغ) + جامع pageerror نقي
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const pageErrors: string[] = [];
      /* r135 (تشخيص CI): كنا نخزّن err.message فقط («TypeError: Cannot read
         properties of null (reading 'querySelectorAll')») بلا أي أثر مكاني —
         الخطأ انفجر في دورات سريعة منذ موجة r133 وكل مواقع querySelectorAll
         في كودنا محصّنة ضد null، فالمصدر شبه مؤكد داخل تبعية (@base-ui
         useDismiss/markOthers أثناء فكّ الحوار مع تحويل /cart المتزامن).
         تخزين stack كاملًا يجعل التشغيل التالي يشير للسطر الدقيق في
         الحزمة — عندها فقط تُقيَّم ترقية @base-ui/react 1.9.0 (التي تعدّلت
         مسارات التنظيف في useDismiss تحديدًا) بدل ترقية عمياء. */
      page.on("pageerror", (err) => pageErrors.push(String(err.stack ?? err)));

      try {
        // 1) صفحة المنيو (SSR) — استقرار الشبكة قبل النقر (نمط round92-C6)
        await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

        // 2) فتح حوار أول صنف — زر «خيارات {الاسم}» هو المفتاح الميسّر
        //    (a11y) لفتح OrderDialog من البطاقة
        const opener = page.locator('button[aria-label^="خيارات"]').first();
        await expect(opener, `الدورة ${i}: زر خيارات أول صنف`).toBeVisible({ timeout: 15_000 });
        await opener.click();

        // 3) الحوار حيّ ثم «أضف إلى السلة» — مسار handleConfirm نفسه
        const dlg = page.locator('[role="dialog"]').first();
        await expect(dlg, `الدورة ${i}: حوار الصنف يفتح`).toBeVisible({ timeout: 10_000 });
        const cta = dlg.locator('button:has-text("أضف إلى السلة")').first();
        await expect(cta, `الدورة ${i}: زر أضف إلى السلة`).toBeVisible({ timeout: 10_000 });
        await cta.click();

        // 4) الحوار يحوّل تلقائيًا إلى /cart بعد ~800ms
        await page.waitForURL("**/cart", { timeout: 20_000 });

        // 5) السطر حاضر: زر الحذف الميسّر + سعر — بطاقة السلة رسمت فعلًا
        const removeBtn = page.getByRole("button", { name: "حذف الصنف" });
        await expect(removeBtn.first(), `الدورة ${i}: سطر السلة حاضر في /cart`).toBeVisible({ timeout: 15_000 });
        const body = await page.locator("body").innerText();
        expect(body, `الدورة ${i}: إجمالي السلة يظهر`).toContain("د.ل");

        // 6) إفراغ — حذف السطر ثم حالة الفراغ (نفس عقد team2/round29)
        await removeBtn.first().click();
        await expect(page.getByText("السلة فارغة").first(), `الدورة ${i}: السلة تُفرغ`).toBeVisible({
          timeout: 10_000,
        });

        // بوابة الدورة: جامع pageerror يجب أن يبقى فارغًا — أي انفجار
        // في مسار الإضافة (كان يفكّ الصفحة كلها قبل r127-F2) يفشل هنا
        expect(pageErrors, `الدورة ${i}/10 أطلقت pageerror — مسار الإضافة انفجر`).toEqual([]);
      } finally {
        await context.close();
      }
    }
  });
});
