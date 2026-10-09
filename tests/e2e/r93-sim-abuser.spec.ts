/**
 * r93-S2 (موجة 4 — جيش المحاكاة) — «محاكاة مخرب» ضد الميزانيات الحقيقية.
 *
 * يعمل عبر scripts/r93-sim-hostile.sh (بلا RATE_LIMIT_TEST_RELAX — الدلاء
 * الحقيقية) ويفحص الدفاعات الحية:
 *   1. حد المعدل الجديد على GET /api/items (r93-W1a/M3) → 429 عربي بعد 60
 *   2. حد المعدل الجديد على GET /api/restaurants/[id] (r93-W1b/N7) → 429
 *   3. CSRF: POST بلا x-csrf-token → 403 CSRF validation failed
 *   4. XSS تخزيني: طلب باسم <script> → يُخزَّن ويُعرض كنص محايد في لوحة
 *      الأدمن (لا حوار alert إطلاقًا — مستمع dialog يوثّق أي انفجار)
 *   5. تعداد الدخول: رسالة موحدة بلا كشف وجود المستخدم
 *   6. مصفوفة أجهزة: 375/768/1280 بلا تمرير أفقي على الصفحات العامة
 *
 * Run: bash scripts/r93-sim-hostile.sh "tests/e2e/r93-sim-abuser.spec.ts --project=ui"
 */
import { test, expect, type Page } from "@playwright/test";

const SHOTS = "download/round93-simulations"; // نسبي — يعمل محليًا وعلى عدّاء CI (Playwright ينشئ المجلد)

/* نفس عقد بيئة البذرة (ci-seed.mjs): CI يبذر admin/admin123456 افتراضيًا
 * والمحلية (سكربتات المشغّل) تصدّر SEED_ADMIN_PASS=smart123 */
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASS || "admin123456";

let restaurantId = 0;
let itemId = 0;
// r121 fix (r118-B1 contract): the chosen item carries a REQUIRED modifier
// group («الحجم») since the r93-sim seed — the server-side group contract
// (r118-B1/r109-F9) correctly 400s orders that skip it. These specs predate
// that contract and CI has been billing-dead since r117 (one round BEFORE it
// shipped), so the breakage went unnoticed. The fix honors the contract:
// select an available option from a required group, like a real customer.
let modifierOptionId = 0;

test.beforeAll(async () => {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const r = await client.query(
    `SELECT r.id AS rid, m.id AS iid,
       (SELECT o.id FROM "ModifierGroup" g
         JOIN "ModifierOption" o ON o."groupId" = g.id
        WHERE g."menuItemId" = m.id AND g."minSelect" > 0 AND o."isAvailable" = true
        ORDER BY o."sortOrder" ASC LIMIT 1) AS oid
     FROM "Restaurant" r
     JOIN "MenuCategory" c ON c."restaurantId" = r.id
     JOIN "MenuItem" m ON m."categoryId" = c.id
     WHERE r.slug = 'al-waha-cafe' LIMIT 1`,
  );
  if (!r.rows[0]) {
    // M-2 (r127-F2): probe-and-skip بدل الانفجار — بلا بذور الجولة تُتخطى
    // المواصفة بصوت عالٍ بدل احتجاز التشغيلة (نمط loyalty-redeem).
    test.skip(true, "بذور الجولة ناقصة (al-waha-cafe غير موجود) — شغّل بذور الجولة أولًا");
    await client.end();
    return;
  }
  restaurantId = r.rows[0].rid;
  itemId = r.rows[0].iid;
  modifierOptionId = r.rows[0].oid ?? 0;
  await client.end();
});

/** جلب كوكي csrf عبر مسار غير قابل للكاش ثم قراءتها */
async function primeCsrf(page: Page): Promise<string> {
  await page.goto("/api/health", { waitUntil: "domcontentloaded" }).catch(() => {});
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === "csrf-token")?.value ?? "";
}

test.describe.serial("r93 محاكاة مخرب — دفاعات حية بميزانيات حقيقية", () => {
  /* ── 1. حد المعدل على items GET (دفاع r93-M3) ── */
  test("ضغط عالٍ على /api/items → 429 برسالة عربية", async ({ request }) => {
    // تحت RATE_LIMIT_TEST_RELAX (بيئة CI) تتسع الميزانية ×200 فلا يُبلغ 429
    // عمليًا — التغطية المنطقية هناك في وحدة r93-items-get-ratelimit؛ هذا
    // الاختبار الضغطي الحي لبيئات بلا ترخيص (المشغّل العدائي المحلي).
    test.skip(
      !!process.env.RATE_LIMIT_TEST_RELAX,
      "بيئة مرخّصة (CI) — الميزانيات الحقيقية تُختبر محليًا عبر r93-sim-hostile.sh",
    );
    let saw429 = false;
    let lastBody = "";
    for (let i = 0; i < 65; i++) {
      const r = await request.get(`/api/items?restaurantId=${restaurantId}`);
      if (r.status() === 429) {
        saw429 = true;
        lastBody = await r.text();
        break;
      }
      expect([200, 400]).toContain(r.status());
    }
    expect(saw429, "يجب أن يظهر 429 بعد تجاوز 60/دقيقة").toBe(true);
    expect(lastBody).toContain("محاولات كثيرة");
  });

  /* ── 2. حد المعدل على restaurants/[id] GET (دفاع r93-N7) ── */
  test("ضغط عالٍ على /api/restaurants/[id] → 429", async ({ request }) => {
    test.skip(
      !!process.env.RATE_LIMIT_TEST_RELAX,
      "بيئة مرخّصة (CI) — الميزانيات الحقيقية تُختبر محليًا عبر r93-sim-hostile.sh",
    );
    let saw429 = false;
    for (let i = 0; i < 65; i++) {
      const r = await request.get(`/api/restaurants/${restaurantId}`);
      if (r.status() === 429) {
        saw429 = true;
        break;
      }
      expect([200, 404]).toContain(r.status());
    }
    expect(saw429, "يجب أن يظهر 429 بعد تجاوز 60/دقيقة").toBe(true);
  });

  /* ── 3. CSRF: POST بلا توكن → 403 ── */
  test("POST /api/orders بلا x-csrf-token → 403 CSRF", async ({ page }) => {
    await primeCsrf(page);
    const res = await page.evaluate(async ({ rid, iid }) => {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // بلا x-csrf-token عمدًا
        credentials: "same-origin",
        body: JSON.stringify({
          items: [{ itemId: iid, quantity: 1, price: 5 }],
          customerName: "مخرب بلا توكن",
          pickupType: "takeaway",
          restaurantId: rid,
        }),
      });
      return { status: r.status, body: await r.text() };
    }, { rid: restaurantId, iid: itemId });
    expect(res.status).toBe(403);
    expect(res.body).toContain("CSRF");
  });

  /* ── 4. XSS تخزيني: الاسم الخطير يُعرض نصًّا محايدًا في لوحة الأدمن ── */
  test("اسم <script> في الطلب → عرض كنص بلا تنفيذ (لا حوار alert)", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    const token = await primeCsrf(page);

    // زرع الطلب بالاسم الخطير (zod يفرض subtotal/total موجبين واسمًا ≤ 50)
    const payload = "<script>alert(1)</script>سالم المخرب";
    const placed = await page.evaluate(
      async ({ rid, iid, mid, token: t, name }) => {
        const r = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": t },
          credentials: "same-origin",
          body: JSON.stringify({
            items: [{ itemId: iid, quantity: 1, price: 5, ...(mid ? { modifierOptionIds: [mid] } : {}) }],
            customerName: name,
            pickupType: "takeaway",
            subtotal: 5,
            total: 5,
            restaurantId: rid,
          }),
        });
        return { status: r.status, body: await r.json() };
      },
      { rid: restaurantId, iid: itemId, mid: modifierOptionId, token, name: payload },
    );
    expect(placed.status).toBe(201);

    // دخول الأدمن وعرض الطلبات — أي alert يعني تنفيذًا (فشل ذريع)
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.getByPlaceholder("اسم المستخدم").fill("admin");
    await page.getByPlaceholder("كلمة المرور").fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });
    await page.goto("/admin/orders", { waitUntil: "domcontentloaded", timeout: 45000 });
    // جدول الطلبات يرِد — انتظار أول صف/حالة تحميل
    await page.waitForTimeout(2500);
    // النص الحرفي للحمولة ظاهر كنص (React رمّزه) — أو جزؤه العربي على الأقل
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("سالم المخرب");
    // لا سكربت منفذ — لا حوارات على الإطلاق
    expect(dialogs, `حوارات alert: ${dialogs.join(" | ")}`).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/sim-abuser-01-xss-neutralized.png` });
    await ctx.close();
  });

  /* ── 5. تعداد الدخول: رسالة موحدة ── */
  test("دخول بمستخدم غير موجود مقابل خاطئ — رسالة موحدة", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.getByPlaceholder("اسم المستخدم").waitFor({ state: "visible", timeout: 15000 });
    const tryLogin = async (u: string) => {
      await page.getByPlaceholder("اسم المستخدم").fill(u);
      await page.getByPlaceholder("كلمة المرور").fill("Wrong#Pass99");
      await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
      // رسالة الفشل الموحدة (توست) — انتظار شرطي على النص نفسه
      await expect(page.getByText(/غير صحيحة|تعذّر تسجيل الدخول/).first()).toBeVisible({
        timeout: 12000,
      });
      return (await page.locator("body").innerText()).slice(0, 1500);
    };
    const notFound = await tryLogin("r93_ghost_user_zz");
    const wrongPass = await tryLogin("admin");
    // الواجهة تعرض الرسالة العامة الموحدة «فشل تسجيل الدخول» للحالتين —
    // لا تمييز يكشف وجود المستخدم من عدمه (المسار يفعل مثلها 401 موحدًا)
    expect(notFound).toContain("تعذّر تسجيل الدخول");
    expect(wrongPass).toContain("تعذّر تسجيل الدخول");
    const leak = /غير موجود|لا يوجد مستخدم|user not found/i;
    expect(notFound.match(leak), "رسالة تكشف عدم وجود المستخدم").toBeNull();
  });

  /* ── 6. مصفوفة الأجهزة: بلا تمرير أفقي ── */
  for (const vp of [
    { name: "موبايل 375", width: 375, height: 812 },
    { name: "تابلت 768", width: 768, height: 1024 },
    { name: "ديسكتوب 1280", width: 1280, height: 800 },
  ]) {
    test(`${vp.name}: الصفحات العامة بلا تمرير أفقي`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      for (const path of ["/", "/menu/al-waha-cafe", "/pricing"]) {
        await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(1200);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} يتجاوز العرض بـ${overflow}px`).toBeLessThanOrEqual(1);
      }
      await page.screenshot({ path: `${SHOTS}/sim-abuser-02-viewport-${vp.width}.png` });
      await ctx.close();
    });
  }
});
