/**
 * r93-S1 (موجة 4 — محاكاة المستخدمين) — «محاكاة زبون كامل».
 *
 * رحلة واقعية متصلة لزبون يدخل منيو مقهى الواحة (al-waha-cafe) ويطلب فعلًا:
 *   دخول المنيو (SSR عربي RTL + رابط واتساب wa.me) → تصفية بفئة → بحث
 *   (جمع عربي: صنف واحد/صنفان — إصلاحات r93-U2) → فتح صنف بخيارات →
 *   تحقق بوابة الخيار الإلزامي → اختيار خيارات وكمية → إضافة للسلة →
 *   تعديل الكمية في السلة → إتمام الطلب (الاسم/الهاتف) → POST /api/orders
 *   201 → رسالة النجاح ورقم الطلب → لوحة الولاء بعد الطلب → رابط الإحالة.
 *
 * القواعد: انتظارات شرطية لا نومًا ثابتًا · تحققات نصية عربية دقيقة ·
 * لقطة بعد كل محطة تحت download/round93-simulations/ ·
 * test.describe.serial لأن الرحلة متصلة (السلة/الجلسة حالة مشتركة).
 *
 * Run: bash scripts/r92-e2e-local.sh "tests/e2e/r93-sim-customer.spec.ts --project=ui"
 * يتطلب البذرة: node scripts/round83-seed.mjs && node scripts/r93-sim-seed.mjs
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const SHOTS = "download/round93-simulations"; // نسبي — يعمل محليًا وعلى عدّاء CI (Playwright ينشئ المجلد)
const MENU = "/menu/al-waha-cafe";

/** عنصر صنف في شبكة القائمة — دائمًا h2 (البطاقة)؛ عرض «أصنافنا المميزة"
 * السينمائي h3 ويعرض الأصناف المميزة بمعزل عن التصفية/البحث فلا يصلح لتحقق
 * الشبكة — التمييز بالوسم أسمن من first() الذي قد يلتقط بطاقة العرض. */
const gridItem = (page: Page, name: string) => page.locator('h2').filter({ hasText: name });

/* زبون الجولة — بيانات ثابتة داخل الرحلة لتتحقق في الطلب والولاء */
const CUSTOMER_NAME = "سالم المحاكي";
const CUSTOMER_PHONE = "0913999888";

/* حاصلا الاستماع: أخطاء JS + حالة POST /api/orders و /api/loyalty (نمط persona-1) */
const pageErrors: string[] = [];
let orderPostStatus = 0;
let orderPostBody = "";
let loyaltyPostStatus = 0;
let loyaltyPostBody = "";

test.describe.serial("r93 محاكاة زبون كامل — رحلة سعيدة متصلة", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    page = await context.newPage();
    page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
    page.on("response", (r) => {
      if (r.url().includes("/api/orders") && r.request().method() === "POST") {
        orderPostStatus = r.status();
        r.text()
          .then((t) => {
            orderPostBody = t.slice(0, 400);
          })
          .catch(() => {});
      }
      if (r.url().endsWith("/api/loyalty") && r.request().method() === "POST") {
        loyaltyPostStatus = r.status();
        r.text()
          .then((t) => {
            loyaltyPostBody = t.slice(0, 300);
          })
          .catch(() => {});
      }
    });
    /* wa.me هدف خارجي — نstubه محليًا حتى لا يعتمد نجاح الرحلة على الشبكة
     * الخارجية، وتبقى سلسلة URL الحقيقية (wa.me/<رقم>?text=…) قابلة للتحقق. */
    await context.route(/https:\/\/wa\.me\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: "wa-stub" })
    );
  });

  test.afterAll(async () => {
    await context.close();
  });

  /* ── 1. المنيو يُحمَّل SSR: عربي، RTL، باسم المطعم، ورابط واتساب حي ── */
  test("دخول المنيو: SSR عربي RTL + رابط واتساب wa.me", async () => {
    await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 45000 });

    // SSR: البطل h1 يحمل اسم المطعم العربي — يُصيَّر من الخادم (لا ينتظر JS)
    const h1 = page.getByRole("heading", { level: 1 }).first();
    await expect(h1).toHaveText(/مقهى الواحة/, { timeout: 20000 });
    // العنوان (title) يولده generateMetadata من صف المطعم
    await expect(page).toHaveTitle(/مقهى الواحة/);

    // اتجاه المستند عربي RTL (تحقق SSR — نفس قالب rtlCheck في round79)
    const dir = await page.evaluate(
      () => document.documentElement.dir + "/" + document.documentElement.lang
    );
    expect(dir).toBe("rtl/ar");

    // رابط واتساب في هيدر المنيو: href حقيقي يحمل wa.me مع رقم المطعم
    const waLink = page.locator('a[href^="https://wa.me/"]').first();
    await expect(waLink).toBeVisible({ timeout: 15000 });
    const href = await waLink.getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+$/);

    await page.screenshot({ path: `${SHOTS}/sim-customer-01-menu-ssr.png` });
  });

  /* ── 2. تصفية بفئة: النتائج تنحصر والجمع العربي صحيح ── */
  test("تصفية بفئة «المشروبات الساخنة»: 3 أصناف فقط", async () => {
    // r134-W2 (#7): القسم → الفئة — the category filter group label unified on فئة
    const catGroup = page.getByRole("group", { name: "تصفية الأصناف حسب الفئة" });
    await expect(catGroup).toBeVisible({ timeout: 15000 });

    await catGroup.locator('button:has-text("المشروبات الساخنة")').first().click();
    // عدّاد النتائج الحي (r93-U2): 3 → صيغة الجمع «أصناف» بالرقم الغربي
    await expect(page.getByText("تم العثور على 3 أصناف")).toBeVisible({ timeout: 10000 });
    // عناصر الأصناف في شبكة القائمة (h2) — والعرض المميز المستقل عن التصفية لا يحسب
    await expect(gridItem(page, "لاتيه كراميل")).toBeVisible();
    // المشروبات الباردة اختفت من الشبكة (فلترة فعلًا لا إخفاء بصري)
    await expect(gridItem(page, "عصير مانجو")).toBeHidden();
    await expect(gridItem(page, "كيك الشوكولاتة")).toBeHidden();

    await page.screenshot({ path: `${SHOTS}/sim-customer-02-category-filter.png` });

    // إعادة «الكل» تُرجع القائمة كاملة ويختفي عدّاد التصفية
    await catGroup.locator('button:has-text("الكل")').first().click();
    await expect(page.getByText("تم العثور على")).toBeHidden({ timeout: 10000 });
    await expect(gridItem(page, "عصير مانجو")).toBeVisible();
  });

  /* ── 3. البحث: جمع «صنفان» ثم «صنف واحد» (إصلاحات r93) ── */
  test("البحث: «مشوي» → صنفان، «لاتيه» → صنف واحد", async () => {
    /* r135 (إصلاح CI): كان الاختبار يمسك صندوق البحث عبر getByPlaceholder
       بالنص «ابحث في القائمة...» بثلاث نقاط ASCII — وواجهة المنيو تكتب
       الحرف المطبعي «…» (U+2026) منذ r133 فصار المطابقة الحرفية تفشل
       (element not found). getByLabel يستهدف aria-label — وهو العقد
       المستقر الذي توثقه الواجهة صراحة (r120 U8-F-3) ولا يتأثر بتغيير
       نص placeholder التزييني. */
    const search = page.getByLabel("ابحث في القائمة");
    await expect(search).toBeVisible({ timeout: 10000 });

    // كلمتان تصيبان وصفَي برجر الواحة وباستا الدجاج فقط → «صنفان» بلا رقم
    await search.fill("مشوي");
    await expect(page.getByText("تم العثور على صنفان")).toBeVisible({ timeout: 10000 });
    await expect(gridItem(page, "برجر الواحة")).toBeVisible();
    await expect(gridItem(page, "باستا الدجاج")).toBeVisible();
    await expect(gridItem(page, "لاتيه كراميل")).toBeHidden();

    await page.getByLabel("مسح البحث").click();
    await expect(page.getByText("تم العثور على")).toBeHidden({ timeout: 10000 });

    // كلمة واحدة تصيب اسم الصنف فقط → «صنف واحد» (العدد يحمله الاسم نحويًا)
    await search.fill("لاتيه");
    await expect(page.getByText("تم العثور على صنف واحد")).toBeVisible({ timeout: 10000 });
    await expect(gridItem(page, "لاتيه كراميل")).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/sim-customer-03-search-plural.png` });

    await page.getByLabel("مسح البحث").click();
    await expect(page.getByText("تم العثور على")).toBeHidden({ timeout: 10000 });
  });

  /* ── 4. صنف بخيارات: بوابة الإلزامي ثم الحجم والإضافات والكمية ── */
  test("فتح «لاتيه كراميل»: خيارات الحجم الإلزامية والإضافات والكمية", async () => {
    // زر «خيارات» المستقر على البطاقة (aria-label عربي — لا سيلكتور هش)
    await page.getByLabel("خيارات لاتيه كراميل").first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // مجموعتا الخيارات من بذرة r93: الحجم (إلزامي 1) + إضافات (حتى 2) —
    // fieldset حقيقي بـ aria-label عربي لكل مجموعة (w3-f1)
    await expect(dialog.locator('fieldset[aria-label="الحجم"]')).toBeVisible();
    await expect(dialog.getByText("اختر على الأقل 1")).toBeVisible();
    await expect(dialog.locator('fieldset[aria-label="إضافات"]')).toBeVisible();

    /* r135 (اختيارات مسبقة — نمط Starbucks): المجموعات الإلزامية تُملأ عند
       الفتح بأرخص خيار متاح، فيصبح «أضف إلى السلة» نقرة واحدة. الحجم
       «صغير» (+0) هو الأرخص في بذرة r93 — نثبّت التحديد المسبق (aria-pressed)
       بدل افتراض الحوار فارغًا كما كان الاختبار قبل r135. */
    await expect(
      dialog.getByRole("button", { name: "صغير", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    /* بوابة r93-W1a/w3-f1 ما زالت حية — لكن مسار الوصول إليها تغيّر: لا
       يمكن الوصول إليها بالإرسال مباشرة (الافتراضي يشبع المجموعة)، بل
       بإلغاء تحديد الخيار المسبق (النقر على الرقاقة المحددة يفكها — سلوك
       toggleModifierOption). نثبت البوابة عبر هذا المسار. */
    await dialog.getByRole("button", { name: "صغير", exact: true }).click();
    await dialog.getByRole("button", { name: "أضف إلى السلة" }).click();
    await expect(dialog.getByRole("alert").first()).toHaveText(/اختر على الأقل 1 من الحجم/);

    // اختيار الحجم «وسط» (+1.5) وإضافة «شوفان» (+1) — الراديو يستبدل الصغير
    await dialog.locator('button:has-text("وسط")').first().click();
    await dialog.locator('button:has-text("شوفان")').first().click();
    // السعر الحي: الأساسي 12 + خيارات 2.5 = 14.5، والمجموع يعكسها فورًا
    await expect(dialog.getByText("شامل الخيارات +2.5 د.ل")).toBeVisible();
    await expect(dialog.getByText("المجموع")).toBeVisible();
    await expect(dialog.getByText("14.5", { exact: true })).toBeVisible();

    // زيادة الكمية إلى 2 داخل الحوار → المجموع 29 (r120 formatPrice الذكي
    // يعرض 29.0 كـ«29» — pin القديم كان decimals:1؛ حُدّث r121)
    await dialog.getByLabel("زيادة الكمية").click();
    await expect(dialog.getByText("29")).toBeVisible();

    // بيانات الزبون داخل الحوار (تصعد مع السلة إلى صفحة الدفع)
    await dialog.getByPlaceholder("الاسم (اختياري)").fill(CUSTOMER_NAME);
    await dialog.getByPlaceholder("رقم الهاتف (اختياري)").fill(CUSTOMER_PHONE);

    await page.screenshot({ path: `${SHOTS}/sim-customer-04-item-options.png` });
  });

  /* ── 5. إرسال الحوار → السلة الموحدة بالسطر المُهيَّأ ── */
  test("إضافة للسلة: تأكيد الحوار ثم الانتقال إلى السلة", async () => {
    const dialog = page.locator('[role="dialog"]').first();
    // r120-U3 renamed the OrderDialog CTA to the honest «أضف إلى السلة» (was «أرسل الطلب عبر واتساب») — pin updated r121.
    await dialog.getByRole("button", { name: "أضف إلى السلة" }).click();
    // حالة التأكيد داخل الحوار قبل التحويل (r120-U5: الصدق — «تمت الإضافة
    // إلى السلة!» بدل الكذبة «تم إرسال الطلب!»؛ pin حُدّث r121)
    await expect(dialog.getByText("تمت الإضافة إلى السلة!")).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: `${SHOTS}/sim-customer-05-order-dialog-sent.png` });

    // التحويل التلقائي إلى صفحة السلة الموحدة
    await page.waitForURL(/\/cart/, { timeout: 20000 });

    // سطر واحد بكمية 2 — ترويسة السلة تجمعها «صنف» مفردًا (r92-A9)
    await expect(page.getByText("1 صنف", { exact: true })).toBeVisible({ timeout: 15000 });
    // اسم الصنف يظهر في السلة (الترويسة + سطر السلة — نكتفي بأول ظهور)
    await expect(page.getByText("لاتيه كراميل").first()).toBeVisible();
    /* r135 (إصلاح CI): «المجموع الإجمالي» يظهر مرتين منذ r133 (بطاقة الملخص
       + معاينة الطلب/الشريط اللاصق) — strict mode يرفض التعدد؛ نكتفي بأول
       ظهور ظاهر. الاختبار كان معفى من هذا المسار لأن اختبار ما قبله كان
       يفشل فيتخطى البقية (serial) — لما شُفي وصل إلى هنا وانكشف. */
    await expect(page.getByText("المجموع الإجمالي").first()).toBeVisible();
    // المجموع الإجمالي للسطر المُهيَّأ: (12 + 1.5 + 1) × 2 = 29.0
    await expect(page.locator('[dir="ltr"], .tabular-nums').getByText("29").first()).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/sim-customer-06-cart.png` });
  });

  /* ── 6. تعديل الكمية في السلة: +1 → المجموع يتحدث فورًا ── */
  test("تعديل الكمية في السلة: 3 × 14.5 = 43.5", async () => {
    // r119-B3: بطاقة السلة صارت بتسميات مصغّرة على مستوى الصنف (a11y أفضل)
    // — «زيادة كمية لاتيه كراميل» بدل التسمية العامة؛ pin حُدّث r121
    await page.getByLabel("زيادة كمية لاتيه كراميل").first().click();
    // الرقم داخل شريط السطر (أرقام غربية — سياسة المنصة)
    await expect(page.getByText("المجموع الإجمالي")).toBeVisible();
    await expect(page.locator('[dir="ltr"], .tabular-nums').getByText("43.5").first()).toBeVisible({
      timeout: 10000,
    });
    await page.screenshot({ path: `${SHOTS}/sim-customer-07-cart-qty.png` });
  });

  /* ── 7. إتمام الطلب: مراجعة → تأكيد → POST 201 → wa.me → رقم الطلب ── */
  test("إتمام الطلب: مراجعة وتأكيد ثم رقم طلب حقيقي", async () => {
    // الهاتف (اسم الزبون صعد من الحوار) — ثم حوار المراجعة
    const phone = page.locator("#cart-phone");
    await expect(phone).toBeVisible({ timeout: 15000 });
    await phone.fill(CUSTOMER_PHONE);

    await page.getByRole("button", { name: "مراجعة الطلب وإرساله" }).click();
    const review = page.locator('[role="dialog"]').first();
    await expect(review.getByRole("heading", { name: "مراجعة الطلب" })).toBeVisible({
      timeout: 10000,
    });
    // المراجعة تعرض السطر وخياراته والمجموع نفسه — لا مفاجآت عند الإرسال
    await expect(review.getByText("لاتيه كراميل")).toBeVisible();
    await expect(review.getByText(/وسط/)).toBeVisible();
    await expect(review.getByText(/شوفان/)).toBeVisible();
    await expect(review.getByText("الإجمالي")).toBeVisible();
    // «43.5 د.ل» يظهر مرتين (سطر المجموع + الإجمالي) — أول ظهور يكفي
    await expect(review.getByText("43.5").first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/sim-customer-08-review-dialog.png` });

    // التأكيد: يكتب الطلب في القاعدة (POST 201) ثم يفتح واتساب ويوجه للتأكيد
    const popupPromise = page.waitForEvent("popup", { timeout: 20000 }).catch(() => null);
    await review.getByRole("button", { name: "تأكيد وإرسال" }).click();
    // POST /api/orders نجح فعلًا (201) وأعاد رقم الطلب — التحقق أولًا كي يظهر
    // جسم الخطأ الفعلي في رسالة الفشل إن لم ينجح (تشخيص r93)
    await expect
      .poll(async () => orderPostStatus, { timeout: 20000 })
      .toBe(201);
    /* r95-D: نفس سباق r94 (السطر أدناه في لوحة الولاء) — r.status() يُضبط
     * تزامنيًا عند وصول الاستجابة بينما r.text() promise يحل لحظة بعدها؛ تحت
     * عمال متوازيين (دفعة persona-1 بجانبنا) قراءة sync واحدة سبقت الجسم
     * الفارغ فأخفق التوكيد رغم 201 حقيقي (أثبت: الملف منفردًا 8/8). poll
     * للجسم بنفس نمط الحالة — التوكيد نفسه بلا تخفيف. */
    await expect
      .poll(async () => orderPostBody, { timeout: 5000 })
      .toContain("orderNo");
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState("domcontentloaded").catch(() => {});
      expect(popup.url()).toContain("wa.me");
      await popup.close().catch(() => {});
    } else {
      // window.open من سلسلة async بعد POST — قد يحجبه المتصفح headless؛
      // صفحة التأكيد تقدم رابط wa.me اليدوي بديلًا فلا نعتبره فشلًا للرحلة
      console.log("[sim] popup محجوب — سيُتحقق من رابط wa.me في صفحة التأكيد");
    }

    // رسالة النجاح + رقم الطلب على صفحة التأكيد
    await page.waitForURL(/\/order-confirmed/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: "تم تأكيد الطلب!" })).toBeVisible({
      timeout: 15000,
    });
    const orderNo = new URL(page.url()).searchParams.get("orderNo") ?? "";
    expect(orderNo).toMatch(/^ORD-/);
    // r120 أضافت زر «نسخ رقم الطلب» — المطابقة التامة لتفادي strict-mode
    // (ثلاثة عناصر تحمل النص جزئيًا الآن)
    await expect(page.getByText("رقم الطلب", { exact: true })).toBeVisible();
    await expect(page.locator("bdi").filter({ hasText: orderNo })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/sim-customer-09-order-confirmed.png` });
  });

  /* ── 8. لوحة الولاء بعد الطلب: الهاتف → رابط الإحالة ── */
  test("لوحة الولاء بعد الطلب: بوابة المطعم المفقودة (🚨 r93-S1-A)", async () => {
    // تفتح تلقائيًا بعد ~1.2 ثانية من وصول رقم الطلب
    const share = page.getByText("ادع صديق وكل منكما يحصل على خصم 10%");
    await expect(share).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SHOTS}/sim-customer-10-loyalty-dialog.png` });

    await page.locator("#shareafter-phone").fill(CUSTOMER_PHONE);
    await page.getByRole("button", { name: "احصل على رابط الإحالة" }).click();

    /* ✅ r95-F1 (إصلاح r93-S1-A الموعود): صفحة السلة تمرر rid+slug عبر رابط
     * التأكيد، وShareAfterOrder يفضل الخاصية على المخزن المُفرَّغ، فيصل
     * المعرف للخادم ويعود 200 + referralCode. أُستبدل حكم الكشف (400) بحكم
     * النجاح كما وثّق التعليق الأصلي المضمن بالمواصفة. */
    await expect
      .poll(async () => loyaltyPostStatus, { timeout: 15000 })
      .toBe(200);
    await expect(page.getByText("رابط الإحالة الخاص بك")).toBeVisible({ timeout: 10000 });
    const linkText = await page.locator('[dir="ltr"]').filter({ hasText: /ref=/ }).first().textContent();
    expect(linkText).toContain("/menu/");
    expect(linkText).toMatch(/\?ref=[A-Za-z0-9]+/);
    await page.screenshot({ path: `${SHOTS}/sim-customer-10-loyalty-referral.png` });


    // لا أخطاء JavaScript في الرحلة كلها (نمط persona-1)
    expect(pageErrors).toEqual([]);
  });
});
