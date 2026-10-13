/**
 * r93-S1 (موجة 4 — محاكاة المستخدمين) — «محاكاة مالك من الصفر».
 *
 * مالك جديد يسجل عبر /subscribe (خطة مجانية — نمط persona-3) ويبني مطعمه:
 *   لوحة التحكم → إنشاء فئة → إنشاء صنف بخيارات وسعر → ظهوره في المنيو
 *   العام (/menu/<slug>) → طلبان من زبائن (عبر واجهة API الحقيقية بجلسة
 *   زبون) → معالجة الطلبات (قبول: جديد → قيد التحضير، ورفض: إلغاء) →
 *   الإحصاءات (KPIs + آخر الطلبات) → صفحة QR.
 *
 * القواعد: انتظارات شرطية · تحققات عربية · لقطة لكل محطة تحت
 * download/round93-simulations/ · test.describe.serial للرحلة المتصلة.
 *
 * Run: bash scripts/r92-e2e-local.sh "tests/e2e/r93-sim-owner.spec.ts --project=ui"
 * يتطلب البذرة: node scripts/round83-seed.mjs (للخطط) — السجل عبر السكربت.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { fillSubscribeForm, chooseFreePlan } from "./qa-helpers";

const SHOTS = "download/round93-simulations"; // نسبي — يعمل محليًا وعلى عدّاء CI (Playwright ينشئ المجلد)

const ts = Date.now().toString().slice(-8);
const OWNER = `r93own${ts}`;
const SLUG = `r93-own-${ts}`;
const PASSWORD = "Owner#Sim93";

const CAT_NAME = "مشروبات المحاكاة";
const ITEM_NAME = "قهوة المحاكاة";
const ITEM_PRICE = 18;

/* حالة مشتركة عبر الرحلة المتصلة */
let ownerCtx: BrowserContext;
let ownerPage: Page;
let restaurantId = 0;
let itemId = 0;
// r121 fix (r118-B1 contract): the item's «الحجم» group is REQUIRED (min 1) —
// the server-side group contract correctly 400s orders that skip it. This spec
// predates the contract; CI was billing-dead since r117 (one round before it
// shipped) so the breakage went unnoticed. Fix: select the option, like the UI does.
let modifierOptionId = 0;
let orderNoAccepted = "";
let orderNoCancelled = "";

test.describe.serial("r93 محاكاة مالك من الصفر — رحلة سعيدة متصلة", () => {
  test.beforeAll(async ({ browser }) => {
    ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    ownerPage = await ownerCtx.newPage();
    /* r106-N2: كان هنا stub لمولّد QR الخارجي (api.qrserver.com) — لم يعد
     * ضرورياً؛ الصفحة تولّد الرمز محلياً عبر حزمة qrcode (data URL). */
  });

  test.afterAll(async () => {
    await ownerCtx.close();
  });

  /* ── 1. التسجيل عبر /subscribe (خطة مجانية — نمط persona-3) ── */
  test("تسجيل مالك جديد: الاشتراك المجاني حتى لوحة التحكم", async () => {
    await ownerPage.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
    await ownerPage
      .locator("button")
      .filter({ hasText: "مجاني" })
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
    await chooseFreePlan(ownerPage);
    await fillSubscribeForm(ownerPage, {
      restaurantName: "مقهى محاكاة r93",
      slug: SLUG,
      description: "مطعم أنشأه وكيل المحاكاة S1",
      phone: "0912345678",
      whatsapp: "0912345678",
      username: OWNER,
      password: PASSWORD,
    });
    // لقطة محطة المراجعة — آخر ما يراه المالك قبل إنشاء الحساب
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-01-subscribe-review.png` });
    await ownerPage.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
    await ownerPage.waitForURL(/\/owner/, { timeout: 20000 }).catch(() => {});
    // نمط persona-3: نافذة حد التسجيل (429) قد ترتد بنا — إعادة محاولة واحدة
    if (!ownerPage.url().includes("/owner")) {
      await ownerPage.waitForTimeout(20000); // نافذة حد التسجيل — انتظار دلالي
      const retry = ownerPage.locator('button:has-text("إنشاء الحساب والبدء")');
      if (await retry.count()) {
        await retry.first().click();
        await ownerPage.waitForURL(/\/owner/, { timeout: 20000 }).catch(() => {});
      }
    }
    expect(ownerPage.url()).toContain("/owner");
    await expect(ownerPage.locator("body")).toContainText("لوحة التحكم");
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-02-owner-dashboard.png` });
  });

  /* ── 2. لوحة المالك: مؤشرات حية ومطعم يستقبل الطلبات ── */
  test("لوحة التحكم: المؤشرات وحالة استقبال الطلبات", async () => {
    await ownerPage.goto("/owner", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(ownerPage.getByRole("heading", { name: "لوحة التحكم" })).toBeVisible({
      timeout: 20000,
    });
    // مطعم جديد مفتوح لاستقبال الطلبات (بوابة isActive على مستوى الطلب)
    await expect(ownerPage.getByText("متصل — يستقبل الطلبات")).toBeVisible({ timeout: 15000 });
    // شبكة KPI بأربع بطاقات عربية (نستهدف فقرات البطاقات — الشريط الجانبي
    // يحمل نصوصًا مطابقة sr-only فالتمييز بالدور أسلم من first/last)
    const kpi = (t: string) =>
      // البطاقة حصرية الدقة: hasText يساوي التسمية كاملة (exact) كي لا يلتقط
      // النص الطويل «الأصناف الأكثر طلباً...» في حالة الفراغ (r93 تشخيص)
      ownerPage.getByText(t, { exact: true }).first();
    await expect(kpi("إجمالي الطلبات")).toBeVisible({ timeout: 15000 });
    await expect(kpi("طلبات اليوم")).toBeVisible();
    await expect(kpi("الأصناف")).toBeVisible();
  });

  /* ── 3. إنشاء فئة من محرر المنيو ── */
  test("إنشاء فئة «مشروبات المحاكاة» في محرر المنيو", async () => {
    await ownerPage.goto("/owner/menu", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(
      ownerPage.getByRole("heading", { name: "إدارة المنيو" })
    ).toBeVisible({ timeout: 20000 });

    await ownerPage.getByRole("button", { name: "تصنيف جديد" }).click();
    const catDialog = ownerPage.locator('[role="dialog"]').first();
    await expect(catDialog.getByRole("heading", { name: "إضافة تصنيف" })).toBeVisible({
      timeout: 10000,
    });
    await catDialog.getByPlaceholder("مشروبات ساخنة").fill(CAT_NAME);
    await catDialog.getByRole("button", { name: "إضافة", exact: true }).click();
    // توست الحفظ ثم ظهور الفئة في القائمة
    await expect(ownerPage.getByText("تمت الإضافة")).toBeVisible({ timeout: 10000 });
    await expect(ownerPage.getByText(CAT_NAME, { exact: true })).toBeVisible({ timeout: 10000 });
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-03-category-created.png` });
  });

  /* ── 4. إنشاء صنف بخيارات وسعر داخل الفئة ── */
  test("إنشاء صنف «قهوة المحاكاة» بسعر ومجموعة خيارات «الحجم»", async () => {
    // فتح الفئة (توسيع) ثم زر «إضافة صنف» الخاص بها
    // P6-3-a: البطاقة التقاعدية div.rounded-md تقاعدت مع تحرير شكل المحرر
    // (CategoriesList صار div.rounded-lg منذ r150) — عقد a11y الحقيقي للتوسيع
    // هو ترويسة role="button" بـ aria-expanded (r150 §8) فنستهدفها هي؛
    // النقر على اسم الفئة داخلها يفجّر onClick نفسه (توسيع) بلا التقاط
    // أزرار الترويسة الثلاثة بـ stopPropagation.
    const catCard = ownerPage.getByRole("button", { name: CAT_NAME }).first();
    await catCard.getByText(CAT_NAME, { exact: true }).click();
    // الزر داخل الترويسة مكشوف دائمًا (والجسم الموسّع الفارغ يحمل نسخة
    // ثانية خارجه) — أول واحد هو زر الترويسة (r93 تشخيص)
    await catCard.getByRole("button", { name: "إضافة صنف" }).first().click();

    const itemDialog = ownerPage.locator('[role="dialog"]').first();
    await expect(itemDialog.getByRole("heading", { name: "إضافة صنف" })).toBeVisible({
      timeout: 10000,
    });
    await itemDialog.getByPlaceholder("كابتشينو").fill(ITEM_NAME);
    await itemDialog.getByLabel("السعر (د.ل)").fill(String(ITEM_PRICE));

    // مجموعة خيارات «الحجم»: إلزامية (حد أدنى 1) بخيار «كبير» (+2)
    await itemDialog.getByRole("button", { name: "إضافة مجموعة خيارات" }).click();
    await itemDialog.getByPlaceholder("الحجم").fill("الحجم");
    await itemDialog.getByLabel("الحد الأدنى").fill("1");
    await itemDialog.getByRole("button", { name: "إضافة خيار إلى المجموعة رقم 1" }).click();
    await itemDialog.getByPlaceholder("مثال: كبير").fill("كبير");
    await itemDialog.getByLabel("السعر ± (د.ل)").fill("2");

    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-04-item-dialog.png` });
    await itemDialog.getByRole("button", { name: "إضافة", exact: true }).click();
    await expect(ownerPage.getByText("تمت إضافة الصنف")).toBeVisible({ timeout: 15000 });
    // الصنف يظهر داخل الفئة الموسعة في المحرر
    await expect(ownerPage.getByText(ITEM_NAME, { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-05-item-created.png` });
  });

  /* ── 5. المنيو العام: الفئة والصنف وخياراته ظاهرة للزبائن ── */
  test("المنيو العام /menu/<slug> يعرض الصنف بخياراته", async () => {
    // قراءة المعرفات من واجهات المالك نفسها (بجلسة المالك الحقيقية)
    const ids = await ownerPage.evaluate(async () => {
      const r = await fetch("/api/owner/restaurants");
      const rj = await r.json();
      const rest = (rj.data ?? [])[0];
      const c = await fetch(`/api/categories?restaurantId=${rest.id}`);
      const cj = await c.json();
      const cat = (cj.data ?? []).find((x: { name: string }) => x.name === "مشروبات المحاكاة");
      const i = await fetch(`/api/items?categoryId=${cat.id}`);
      const ij = await i.json();
      const item = (ij.data ?? []).find((x: { name: string }) => x.name === "قهوة المحاكاة");
      // r121: capture an available option id from a required group (minSelect > 0)
      // so the order payload satisfies the r118-B1 server-side modifier contract.
      const reqGroup = (item?.modifierGroups ?? []).find(
        (g: { minSelect: number; options?: { id: number; isAvailable: boolean }[] }) =>
          g.minSelect > 0 && (g.options ?? []).some((o) => o.isAvailable),
      );
      const optId = reqGroup
        ? (reqGroup.options ?? []).find((o: { isAvailable: boolean }) => o.isAvailable)?.id
        : undefined;
      return { restaurantId: rest.id, slug: rest.slug, itemId: item?.id, modifierOptionId: optId ?? 0 };
    });
    expect(ids.restaurantId).toBeGreaterThan(0);
    expect(ids.itemId).toBeGreaterThan(0);
    restaurantId = ids.restaurantId;
    itemId = ids.itemId;
    modifierOptionId = ids.modifierOptionId;

    await ownerPage.goto(`/menu/${SLUG}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(ownerPage.getByRole("heading", { level: 1 }).first()).toHaveText(/مقهى محاكاة r93/);
    // بطاقة الصنف في الشبكة + شارة «خيارات متاحة» (مجموعة «الحجم» المرفوعة)
    await expect(ownerPage.locator("h2").filter({ hasText: ITEM_NAME })).toBeVisible({
      timeout: 20000,
    });
    await expect(ownerPage.getByText("خيارات متاحة").first()).toBeVisible();
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-06-public-menu.png` });
  });

  /* ── 6. زبائن يطلبون: طلبان حقيقيان عبر API بجلسة زبون ── */
  test("طلبان من زبائن عبر POST /api/orders", async ({ browser }) => {
    const custCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const custPage = await custCtx.newPage();
    try {
      // دخول صفحة المنيو كزبون مجهول (يكسب كوكي CSRF من البروكسي — نمط round79)
      await custPage.goto(`/menu/${SLUG}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      const placeOrder = () =>
        custPage.evaluate(async ({ rid, iid, mid }) => {
          // صفحات المنيو قابلة للكاش فلا تُسك كوكي CSRF عليها (تصميم proxy) —
          // زيارة GET لمسار غير قابل للكاش تسك الكوكي أولًا (كما يفعل الزبون
          // الحقيقي بمروره على /cart) ثم نقرأها (r93 تشخيص)
          if (!document.cookie.includes("csrf-token=")) {
            await fetch("/api/health", { credentials: "same-origin" });
          }
          const token =
            document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=").slice(1).join("=") ?? "";
          const r = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-csrf-token": token },
            credentials: "same-origin",
            body: JSON.stringify({
              items: [{ itemId: iid, quantity: 1, price: 18, ...(mid ? { modifierOptionIds: [mid] } : {}) }],
              customerName: "زبون محاكاة r93",
              customerPhone: "0913999777",
              pickupType: "takeaway",
              subtotal: 18,
              total: 18,
              restaurantId: rid,
            }),
          });
          return { status: r.status, body: await r.json() };
        }, { rid: restaurantId, iid: itemId, mid: modifierOptionId });

      const o1 = await placeOrder();
      expect(o1.status, `POST /api/orders #1 → ${o1.status}: ${JSON.stringify(o1.body).slice(0, 200)}`).toBe(201);
      orderNoAccepted = o1.body?.data?.orderNo ?? "";
      expect(orderNoAccepted).toMatch(/^ORD-/);

      const o2 = await placeOrder();
      expect(o2.status, `POST /api/orders #2 → ${o2.status}`).toBe(201);
      orderNoCancelled = o2.body?.data?.orderNo ?? "";
      expect(orderNoCancelled).toMatch(/^ORD-/);
    } finally {
      await custCtx.close();
    }
  });

  /* ── 7. معالجة الطلبات: قبول (جديد → قيد التحضير) ── */
  /* r135 (إصلاح CI — الجولة الثانية): بطاقات role=link صارت md:hidden
     (عرض الجوال فقط) منذ r133 والشاشة المكتبية (سياق ownerPage المُنشأ
     يدويًا 1280×800 في beforeAll — test.use لا يمسّه) تعرض الجدول.
     الاختبار يستهدف الآن صفوف الجدول: نفس البنية (رقم الطلب + شارة
     الحالة + أزرار التقدم/الإلغاء) داخل خلايا الصف. */
  test("قبول الطلب الأول: جديد → قيد التحضير", async () => {
    await ownerPage.goto("/owner/orders", { waitUntil: "domcontentloaded", timeout: 45000 });
    const card = ownerPage.locator("tbody tr").filter({ hasText: orderNoAccepted }).first();
    await expect(card).toBeVisible({ timeout: 20000 });
    /* r135 (إصلاح CI): في الجدول المكتبي نص «قيد التحضير» موجود في شارة
       الحالة وفي زر التقدم نفسه (وأثناء busy يبقى نص الزر) — strict mode
       يفشل على التعدد. نستهدف شارة الحالة تحديدًا ([data-slot="badge"])
       فتكون الإثباتات على الحالة لا على نص زر ثابت الوجود. */
    const statusBadge = () => card.locator('[data-slot="badge"]').filter({ hasText: "جديد" });
    await expect(statusBadge()).toBeVisible();

    await card.getByRole("button", { name: "قيد التحضير" }).click();
    // تحول متفائل فوري + توست التأكيد بالحالة الجديدة
    await expect(card.locator('[data-slot="badge"]').filter({ hasText: "قيد التحضير" })).toBeVisible({ timeout: 10000 });
    await expect(ownerPage.getByText("تم تغيير الحالة إلى قيد التحضير")).toBeVisible({
      timeout: 10000,
    });
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-07-order-accepted.png` });
  });

  /* ── 8. معالجة الطلبات: رفض (إلغاء الطلب الثاني) ── */
  test("رفض الطلب الثاني: إلغاء → ملغي", async () => {
    const card = ownerPage.locator("tbody tr").filter({ hasText: orderNoCancelled }).first();
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card.locator('[data-slot="badge"]').filter({ hasText: "جديد" })).toBeVisible();

    /* r135 (إصلاح CI): تأكيد الإلغاء انتقل من confirm() الأصلي إلى
       ConfirmDialog (مكوّن مشترك بنص «إلغاء الطلب» منذ r133) — معالج
       الحوار الأصلي page.once("dialog") لم يعد يلتقط شيئًا فيبقى الحوار
       مفتوحًا بلا قبول. ننقر زر التأكيد في الحوار المخصص مباشرة. */
    await card.getByRole("button", { name: "إلغاء", exact: true }).click();
    await ownerPage.getByRole("button", { name: "إلغاء الطلب" }).click();
    await expect(card.locator('[data-slot="badge"]').filter({ hasText: "ملغي" })).toBeVisible({ timeout: 10000 });
    await expect(ownerPage.getByText("تم تغيير الحالة إلى ملغي")).toBeVisible({ timeout: 10000 });
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-08-order-cancelled.png` });
  });

  /* ── 9. الإحصاءات: KPIs تعكس الطلبات و«آخر الطلبات» يعرضها ── */
  test("الإحصاءات: المؤشرات تعكس طلبات الجولة", async () => {
    await ownerPage.goto("/owner", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(ownerPage.getByRole("heading", { name: "لوحة التحكم" })).toBeVisible({
      timeout: 20000,
    });
    // إجمالي الطلبات ≥ 2 (طلبا هذه الرحلة — رقم غربي بلا فواصل) — نطابق
    // بطاقة المؤشر نفسها (التسمية+القيمة معًا) فلا نلتقط روابط الشريط (r93 تشخيص)
    await expect(ownerPage.getByText(/إجمالي الطلبات\s*[2-9]/)).toBeVisible({ timeout: 15000 });
    // قسم آخر الطلبات يعرض الطلب المقبول برقمه
    await expect(ownerPage.getByText("آخر الطلبات")).toBeVisible({ timeout: 15000 });
    await expect(ownerPage.getByText(orderNoAccepted).first()).toBeVisible({ timeout: 15000 });
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-09-stats.png` });
  });

  /* ── 10. صفحة QR: رمز حي لمنيو المطعم ── */
  test("صفحة QR: رمز المنيو وأدواته", async () => {
    await ownerPage.goto("/owner/qr", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(ownerPage.getByRole("heading", { name: "رمز QR" })).toBeVisible({
      timeout: 20000,
    });
    // صورة QR الحية (توليد محلي — data URL) بحجم افتراضي
    await expect(ownerPage.locator('[data-testid="qr-code"]').first()).toBeVisible({
      timeout: 15000,
    });
    // رابط المنيو داخل حقل القراءة فقط + أدوات النسخ والتحميل والطباعة
    await expect(ownerPage.locator("#qr-url-input")).toHaveValue(new RegExp(`/menu/${SLUG}`));
    await expect(ownerPage.getByLabel("نسخ الرابط")).toBeVisible();
    await expect(ownerPage.getByRole("button", { name: "تحميل QR" })).toBeVisible();
    await expect(ownerPage.getByRole("group", { name: "حجم رمز QR" })).toBeVisible();
    await ownerPage.screenshot({ path: `${SHOTS}/sim-owner-10-qr.png` });
  });
});
