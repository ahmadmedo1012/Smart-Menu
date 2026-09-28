/**
 * r93-S1 (موجة 4 — محاكاة المستخدمين) — «محاكاة أدمن منصة».
 *
 * رحلة مدير عام (super_admin) ثم مشرف بلا أذونات (sub_admin):
 *   دخول r93_sim_root → لوحة التحكم → إنشاء sub_admin فعليًا عبر واجهة
 *   /admin/admins (النموذج الحقيقي: الاسم/المستخدم/كلمة المرور + مفاتيح
 *   الصلاحيات) → جرد المطاعم → الطلبات → خروج → دخول r93_sim_sa
 *   (بذرة صلاحياتها صفرية) → **بوابة PII المراجعات (r93-W1a)**: مقارنة
 *   حية — super_admin يرى الاسم/الهاتف (شاهد إيجابي) وsub_admin بلا
 *   أذونات لا يرى المفتاحين أصلًا → **بوابة الطلبات (r92-B1)**: 403.
 *
 * القواعد: انتظارات شرطية · تحققات عربية · لقطة لكل محطة تحت
 * download/round93-simulations/ · describe.serial.
 *
 * Run: bash scripts/r92-e2e-local.sh "tests/e2e/r93-sim-admin.spec.ts --project=ui"
 * يتطلب البذرة: node scripts/r93-sim-seed.mjs (أنشأ r93_sim_root وr93_sim_sa)
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const SHOTS = "download/round93-simulations"; // نسبي — يعمل محليًا وعلى عدّاء CI (Playwright ينشئ المجلد)

const SUPER_ROOT = "r93_sim_root";
const SUPER_PASS = "Root#Sim93";
const SUB_ZERO = "r93_sim_sa";
const SUB_PASS = "SubSim#2026";

const ts = Date.now().toString().slice(-8);
const NEW_SUB = `r93adm${ts}`;

/* مراجعة تجريبية بPII مميزة — تُزرع idempotent على «لاتيه كراميل» */
const REVIEW_NAME = "زبون بوابة r93";
const REVIEW_PHONE = "0917317317";
const REVIEW_COMMENT = "تجربة بوابة خصوصية المراجعات — الجولة 93";

let latteItemId = 0;
let rootCtx: BrowserContext;
let rootPage: Page;
let subCtx: BrowserContext;
let subPage: Page;

/** دخول الإدارة — ينتظر /admin (مساعد qa-helpers ينتظر /owner للمالكين فقط) */
async function loginAdmin(page: Page, username: string, password: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 45000 });
    const alreadyIn = await page
      .waitForURL(/\/admin/, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (alreadyIn) return;
    const nameField = page.getByPlaceholder("اسم المستخدم");
    await nameField.waitFor({ state: "visible", timeout: 15000 });
    await nameField.fill(username);
    await page.getByPlaceholder("كلمة المرور").fill(password);
    await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
    const loggedIn = await page
      .waitForURL(/\/admin/, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (loggedIn) return;
    if (attempt < 2) await page.waitForTimeout(3000 * (attempt + 1));
  }
  throw new Error(`loginAdmin failed for ${username}`);
}

test.describe.serial("r93 محاكاة أدمن المنصة — من لوحة التحكم إلى بوابات الخصوصية", () => {
  test.beforeAll(async ({ browser }) => {
    rootCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    rootPage = await rootCtx.newPage();

    /* زرع مراجعة بPII على «لاتيه كراميل» (idempotent) — نفس قاعدة البذرة */
    const pg = (await import("pg")).default;
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query('DELETE FROM "Review" WHERE "customerPhone" = $1', [REVIEW_PHONE]);
    const item = (
      await client.query(
        `SELECT m.id FROM "MenuItem" m
         JOIN "MenuCategory" c ON c.id = m."categoryId"
         JOIN "Restaurant" r ON r.id = c."restaurantId"
         WHERE r.slug = 'al-waha-cafe' AND m.name = 'Caramel Latte'`,
      )
    ).rows[0];
    if (!item) throw new Error("Caramel Latte غير موجود — شغّل scripts/round83-seed.mjs ثم r93-sim-seed.mjs");
    latteItemId = item.id;
    await client.query(
      `INSERT INTO "Review" (rating, comment, "customerName", "customerPhone", "menuItemId")
       VALUES (5, $1, $2, $3, $4)`,
      [REVIEW_COMMENT, REVIEW_NAME, REVIEW_PHONE, latteItemId],
    );
    await client.end();
  });

  test.afterAll(async () => {
    await rootCtx.close();
    await subCtx?.close().catch(() => {});
  });

  /* ── 1. دخول المدير العام ولوحة التحكم ── */
  test("دخول super_admin إلى لوحة تحكم الإدارة", async () => {
    await loginAdmin(rootPage, SUPER_ROOT, SUPER_PASS);
    await expect(rootPage.getByRole("heading", { name: "لوحة التحكم" })).toBeVisible({
      timeout: 20000,
    });
    await rootPage.screenshot({ path: `${SHOTS}/sim-admin-01-dashboard.png` });
  });

  /* ── 2. إنشاء sub_admin عبر الواجهة الحقيقية (بلا صلاحيات) ── */
  test("إنشاء مسؤول جديد (sub_admin بصلاحيات صفرية) من واجهة /admin/admins", async () => {
    await rootPage.goto("/admin/admins", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(rootPage.getByRole("heading", { name: "إدارة المسؤولين" })).toBeVisible({
      timeout: 20000,
    });
    await rootPage.getByRole("button", { name: "إضافة مسؤول" }).first().click();
    const sheet = rootPage.locator('[role="dialog"], [data-slot="sheet-content"]').first();
    await expect(sheet.getByText("إضافة مسؤول جديد")).toBeVisible({ timeout: 10000 });
    await sheet.locator("#inv-name").fill("مشرف واجهة r93");
    await sheet.locator("#inv-username").fill(NEW_SUB);
    await sheet.locator("#inv-password").fill("AdmUi#2026");
    // بلا أي صلاحية — عمدًا (بوابة PII تُختبر بصلاحيات صفرية)
    await sheet.getByRole("button", { name: "إضافة المسؤول" }).click();
    await expect(rootPage.getByText("تم إنشاء المسؤول بنجاح")).toBeVisible({ timeout: 15000 });
    // يظهر في الجدول باسم مستخدمه
    await expect(rootPage.getByText(NEW_SUB).first()).toBeVisible({ timeout: 10000 });
    await rootPage.screenshot({ path: `${SHOTS}/sim-admin-02-create-subadmin.png` });
  });

  /* ── 3. جرد المطاعم: بطاقات مطاعم المنصة ── */
  test("صفحة المطاعم تعرض مطاعم المنصة", async () => {
    await rootPage.goto("/admin/restaurants", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(rootPage.locator("h1").first()).toBeVisible({ timeout: 20000 });
    // القائمة عميلة وتُجلب من الـAPI — انتظار شرطي لأول بطاقة. روابط «عرض
    // المنيو» aria-label بلا نص داخلي فالتمييز بالدور والاسم (r93 تشخيص)
    await expect(rootPage.getByRole("link", { name: /^عرض منيو/ }).first()).toBeVisible({
      timeout: 20000,
    });
    await rootPage.screenshot({ path: `${SHOTS}/sim-admin-03-restaurants.png` });
  });

  /* ── 4. طلبات المنصة ── */
  test("صفحة الطلبات الإدارية", async () => {
    await rootPage.goto("/admin/orders", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(rootPage.locator("h1").first()).toBeVisible({ timeout: 20000 });
    await rootPage.screenshot({ path: `${SHOTS}/sim-admin-04-orders.png` });
  });

  /* ── 5. الشاهد الإيجابي: super_admin يرى PII المراجعة ── */
  test("super_admin يرى اسم وهاتف المراجعة (شاهد إيجابي للبوابة)", async () => {
    const res = await rootPage.evaluate(async (itemId) => {
      const r = await fetch(`/api/items/${itemId}/reviews`, { credentials: "same-origin" });
      return { status: r.status, body: await r.json() };
    }, latteItemId);
    expect(res.status).toBe(200);
    const review = (res.body?.data ?? []).find((x: { comment?: string }) => x.comment === REVIEW_COMMENT);
    expect(review, "المراجعة التجريبية موجودة").toBeTruthy();
    expect(review.customerName, "super_admin يرى الاسم (ثقة كاملة)").toBe(REVIEW_NAME);
    expect(review.customerPhone).toBe(REVIEW_PHONE);
  });

  /* ── 6. دخول المشرف بلا أذونات ── */
  test("دخول sub_admin (صلاحيات صفرية)", async ({ browser }) => {
    subCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    subPage = await subCtx.newPage();
    await loginAdmin(subPage, SUB_ZERO, SUB_PASS);
    // r121: the dashboard requires VIEW_ANALYTICS (sub_zero has none) — the
    // honest render is AccessDenied «غير مصرح», NOT the dashboard heading.
    // (Historically this test passed only by matching LayoutHeader's duplicate
    // h1 «لوحة التحكم» — an a11y defect fixed in r121-K-6; the page-level h1
    // was unreachable for zero-permission viewers all along: stats 403 → error
    // state. r121 also fixed the render order so denied short-circuits BEFORE
    // the misleading «فشل تحميل البيانات» error state.)
    await expect(subPage.getByRole("heading", { name: "غير مصرح" })).toBeVisible({
      timeout: 20000,
    });
    await subPage.screenshot({ path: `${SHOTS}/sim-admin-05-subadmin-dashboard.png` });
  });

  /* ── 7. بوابة PII المراجعات (r93-W1a): المفتاحان غائبان تمامًا ── */
  test("بوابة r93: sub_admin بلا أذونات لا يرى اسم/هاتف المراجعة", async () => {
    const res = await subPage.evaluate(async (itemId) => {
      const r = await fetch(`/api/items/${itemId}/reviews`, { credentials: "same-origin" });
      return { status: r.status, body: await r.json() };
    }, latteItemId);
    expect(res.status).toBe(200);
    const review = (res.body?.data ?? []).find((x: { comment?: string }) => x.comment === REVIEW_COMMENT);
    expect(review, "المراجعة نفسها مرئية (قراءة عامة) لكن بلا PII").toBeTruthy();
    expect(review.customerName, "لا اسم للزبون").toBeUndefined();
    expect(review.customerPhone, "لا هاتف للزبون").toBeUndefined();
    await subPage.screenshot({ path: `${SHOTS}/sim-admin-06-reviews-pii-gate.png` });
  });

  /* ── 8. بوابة الطلبات (r92-B1): 403 لقائمة PII المنصة ── */
  test("بوابة r92-B1: sub_admin بلا APPROVE_ORDERS → 403 على قائمة الطلبات", async () => {
    const res = await subPage.evaluate(async () => {
      const r = await fetch("/api/orders", { credentials: "same-origin" });
      return { status: r.status, body: await r.text() };
    });
    expect(res.status).toBe(403);
    // الرسالة الفعلية للمسار (r92-B1): «لا تملك الصلاحية» — عقد المسار
    expect(res.body).toContain("لا تملك الصلاحية");
  });
});
