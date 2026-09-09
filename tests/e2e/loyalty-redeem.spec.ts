/**
 * Loyalty REDEMPTION journey (r97-X4 / fix [2]) — أول تغطية e2e للاستبدال.
 *
 * الواقع المقروء من الكود: الاستبدال (استبدال وجبة مجانية مقابل 5 طلبات)
 * ليس رحلة واجهة — لا يوجد زر/UI يستدعي /api/loyalty/redeem (واجهة الزبون
 * LoyaltyCard.tsx في السلة تعرض شعار الكسب فقط، وLoyaltyWidget على المنيو
 * يعرض الرصيد). الاستبدال يُنفَّذ من جهة المالك/الطاقم عبر الـAPI مباشرة.
 * لذلك هذه المواصفة تغطي «ما هو موجود فعلًا»: رحلة API كاملة بواقع حقيقي —
 *
 *   زبون مجهول يقدّم 5 طلبات بنفس الهاتف (POST /api/orders — بلا جلسة،
 *   كما يفعله السلة الحقيقي) → المالك يكمل كل طلب (PUT /api/orders/:id
 *   status=completed — نقاط الولاء تتجمّع هنا فقط، 2 نقطة لطلب البرجر 25)
 *   → بطاقة 5 طلبات/10 نقاط → المالك يستبدل (POST /api/loyalty/redeem)
 *   → 200 «تم استبدال وجبتك المجانية» + totalOrders 5→0 + نقاط 10→5
 *   + صف RewardTransaction نوع redeem بقيمة -5 (السجل المحاسبي).
 *
 * ثم الحدود السلبية: مجهول → 401 · حساب USER بلا علاقة → 403 · استبدال
 * ثانٍ بعد نفاد الرصيد → 400 «لا توجد طلبات كافية» · بطاقة غير موجودة → 400.
 *
 * ملاحظة الربط (للمنسّق): الملف جديد — يجب إدراجه في testMatch لمشروع
 * `api` في playwright.config.ts ليُشغَّل في CI (نمط round85-D1 عندما كانت
 * referral-claim يتيمة). Run محلي:
 *   bash scripts/r92-e2e-local.sh "tests/e2e/loyalty-redeem.spec.ts --project=api"
 * يتطلب بذرة round83 (waha_owner/waha123456 + al-waha-cafe + Waha Burger 25)
 * وDATABASE_URL لعملية الاختبار (نفس عقد r93/round94-sim).
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { mintCsrfPair, csrfHeadersFor } from "./csrf-helper";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OWNER_USER = "waha_owner";
const OWNER_PASSWORD = process.env.WAHA_OWNER_PASS || "waha123456"; // عقد البذرة (PROJECT.md)

// هوية الزبون فريدة لكل تشغيلة (هاتف ليبي الشكل) — البطاقة تُنشأ عند أول
// إكمال طلب، فلا تتداخل التشغيلات المتكررة (نمط round94-sim: رقم وهمي لا
// يملكه أحد، بلا 0910 بذرة).
const RUN_SUFFIX = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
const CUSTOMER_PHONE = `0929${RUN_SUFFIX}`;
const CUSTOMER_NAME = `زبون استبدال r97 ${RUN_SUFFIX.slice(-4)}`;
const ORDERS_TO_REDEEM = 5; // REWARD_COST في مسار الاستبدال (5 طلبات)
const NONEXISTENT_CARD_ID = 999_999_999;

let alWahaId = 0;
let burgerItemId = 0;
let burgerPrice = 25; // بذرة round83: برجر الواحة 25 د.ل (يُقرأ من القاعدة)
let gateCardId = 0; // بطاقة بوابة 403 (موجودة لكن بلا رصيد — للفحص السلبي فقط)
let ownerCookie = ""; // جلسة waha_owner (تُسكّ في beforeAll وتُستعمل في الاختبارات المتسلسلة)

/** تسجيل دخول API وإرجاع كوكي الجلسة فقط (نمط mintCsrfPair + حمل يدوي). */
async function apiLoginCookie(request: APIRequestContext, username: string, password: string): Promise<string> {
  const pair = await mintCsrfPair(request);
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, pair) },
    data: JSON.stringify({ username, password }),
  });
  expect(res.status(), `login ${username} يجب أن ينجح (بذرة round83 مثبتة؟)`).toBe(200);
  const session = (res.headers()["set-cookie"] ?? "").match(/smart-menu-session=([^;]+)/)?.[1] ?? "";
  expect(session, "login يجب أن يزرع كوكي الجلسة").not.toBe("");
  return `smart-menu-session=${session}`;
}

/** CSRF طازج + جلسة — لكل طلب متغيّر (نمط round86-security sessionHeaders،
 * مع تطبيع Origin من csrfHeadersFor نفسه). */
async function authedJson(request: APIRequestContext, sessionCookie: string): Promise<Record<string, string>> {
  const pair = await mintCsrfPair(request);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...csrfHeadersFor(BASE, pair),
  };
  headers.Cookie = `${pair.cookie}; ${sessionCookie}`;
  return headers;
}

test.beforeAll(async ({ request }) => {
  // بذرة round83 موجودة؟ (al-waha-cafe + برجر الواحة) — نفس عقد r93/round94
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const rest = await client.query(`SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe' LIMIT 1`);
  if (!rest.rows[0]) throw new Error("al-waha-cafe غير موجود — شغّل node scripts/round83-seed.mjs أولًا");
  alWahaId = rest.rows[0].id;
  const item = await client.query(
    `SELECT m.id, m.price FROM "MenuItem" m
     JOIN "MenuCategory" c ON c.id = m."categoryId"
     WHERE m.name = 'Waha Burger' AND c."restaurantId" = $1 LIMIT 1`,
    [alWahaId],
  );
  if (!item.rows[0]) throw new Error("Waha Burger غير موجود — بذرة round83 ناقصة");
  burgerItemId = item.rows[0].id;
  burgerPrice = Number(item.rows[0].price);

  // بطاقة «البوابة»: موجودة لكن بلا رصيد — فحص 403 لـUSER يحتاج بطاقة
  // حقيقية (NOT_FOUND يسبق فحص الدور في المعاملة، فبطاقة وهمية تعطي 400).
  const gate = await client.query(
    `INSERT INTO "LoyaltyCard" ("customerPhone", "customerName", "restaurantId", "referralCode", "points", "totalOrders", "totalSpent", "tier", "createdAt", "updatedAt")
     VALUES ($1, 'بوابة r97', $2, $3, 0, 0, 0, 'bronze', NOW(), NOW()) RETURNING id`,
    [`0920${RUN_SUFFIX}`, alWahaId, `R97GATE${RUN_SUFFIX.slice(-6)}`],
  );
  gateCardId = gate.rows[0].id;
  await client.end();

  // جلسة المالك تُسكّ مرة واحدة — الاختبارات متسلسلة (serial) فيستعملها
  // مسار الاستبدال والفحوص السلبية بعده.
  ownerCookie = await apiLoginCookie(request, OWNER_USER, OWNER_PASSWORD);
});

test.describe.serial("رحلة استبدال الولاء — الزبون يطلب، المالك يستبدل", () => {
  test("مجهول بلا جلسة → 401 قبل أي منطق", async ({ request }) => {
    const pair = await mintCsrfPair(request);
    const res = await request.post(`${BASE}/api/loyalty/redeem`, {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, pair) },
      data: JSON.stringify({ cardId: gateCardId }),
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("غير مصرح");
  });

  test("حساب USER مسجّل بلا علاقة بالمطعم → 403 (بوابة الدور)", async ({ request }) => {
    // تسجيل حساب USER مجاني (مسار الخدمة الذاتية) والإمساك بجلسته من الاستجابة
    const pair = await mintCsrfPair(request);
    const reg = await request.post(`${BASE}/api/auth/register`, {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, pair) },
      data: JSON.stringify({
        username: `r97redeem_${RUN_SUFFIX}`,
        password: "password123",
        name: `مستخدم استبدال r97 ${RUN_SUFFIX.slice(-4)}`,
      }),
    });
    if (reg.status() === 429) test.skip(true, "register rate-limited على هذا الـIP");
    expect(reg.status()).toBe(201);
    const userSession = (reg.headers()["set-cookie"] ?? "").match(/smart-menu-session=([^;]+)/)?.[1] ?? "";
    expect(userSession).not.toBe("");

    const res = await request.post(`${BASE}/api/loyalty/redeem`, {
      headers: await authedJson(request, `smart-menu-session=${userSession}`),
      data: JSON.stringify({ cardId: gateCardId }),
    });
    expect(res.status(), "USER بلا علاقة بالمطعم لا يستبدل بطاقة غيره").toBe(403);
    const body = await res.json();
    expect(body.error).toContain("غير مصرح");
  });

  test("الرحلة الكاملة: 5 طلبات مكتملة → استبدال 200 + رصيد منقوص + سجل redeem", async ({ request }) => {
    // 1) الزبون يقدّم 5 طلبات مجهولة بنفس الهاتف (نفس ما ترسله السلة) —
    //    إعادة تسعير الخادم تجعل total = 25 لكل طلب (برجر الواحة).
    const pair = await mintCsrfPair(request);
    const anonHeaders = {
      "Content-Type": "application/json",
      ...csrfHeadersFor(BASE, pair),
    };
    const orderIds: number[] = [];
    for (let i = 0; i < ORDERS_TO_REDEEM; i++) {
      const res = await request.post(`${BASE}/api/orders`, {
        headers: anonHeaders,
        data: JSON.stringify({
          restaurantId: alWahaId,
          customerName: CUSTOMER_NAME,
          customerPhone: CUSTOMER_PHONE,
          pickupType: "takeaway",
          subtotal: burgerPrice,
          total: burgerPrice,
          items: [{ itemId: burgerItemId, quantity: 1, price: burgerPrice }],
        }),
      });
      expect(res.status(), `الطلب رقم ${i + 1} يجب أن يُقبل (201)`).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      orderIds.push(body.data.id);
    }
    expect(orderIds).toHaveLength(ORDERS_TO_REDEEM);

    // 2) المالك يكمل كل طلب — نقاط الولاء تتجمّع عند الإكمال فقط
    //    (floor(25/10)=2 نقطة × 5 = 10 نقاط، totalOrders=5).
    for (const id of orderIds) {
      const res = await request.put(`${BASE}/api/orders/${id}`, {
        headers: await authedJson(request, ownerCookie),
        data: JSON.stringify({ status: "completed" }),
      });
      expect(res.status(), `إكمال الطلب ${id} يجب أن ينجح`).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("completed");
    }

    // 3) البطاقة اكتملت: 5 طلبات + 10 نقاط (عقد المسار، لا واجهة بعد)
    const pg = (await import("pg")).default;
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const card = await client.query(
      `SELECT id, "totalOrders", points FROM "LoyaltyCard"
       WHERE "customerPhone" = $1 AND "restaurantId" = $2 LIMIT 1`,
      [CUSTOMER_PHONE, alWahaId],
    );
    expect(card.rows[0], "البطاقة تُنشأ عند أول إكمال طلب").toBeTruthy();
    const cardId = card.rows[0].id;
    expect(card.rows[0].totalOrders).toBe(ORDERS_TO_REDEEM);
    expect(card.rows[0].points).toBe(ORDERS_TO_REDEEM * 2); // 2 نقطة لكل طلب برجر
    await client.end();

    // 4) الاستبدال: المالك يصرف المكافأة (فحص السقف: 5 طلبات/5 نقاط)
    const redeem = await request.post(`${BASE}/api/loyalty/redeem`, {
      headers: await authedJson(request, ownerCookie),
      data: JSON.stringify({ cardId }),
    });
    expect(redeem.status()).toBe(200);
    const redeemBody = await redeem.json();
    expect(redeemBody.success).toBe(true);
    expect(redeemBody.data.message).toContain("تم استبدال وجبتك المجانية");
    // العقد الذري: خصم 5 طلبات + 5 نقاط (updateMany المحروس من السباق)
    expect(redeemBody.data.card.totalOrders).toBe(0);
    expect(redeemBody.data.card.points).toBe(5);

    // 5) السجل المحاسبي: صف RewardTransaction نوع redeem بقيمة -5
    const client2 = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client2.connect();
    const tx = await client2.query(
      `SELECT points, type, "cardId", description FROM "RewardTransaction"
       WHERE "cardId" = $1 AND type = 'redeem' ORDER BY id DESC LIMIT 1`,
      [cardId],
    );
    expect(tx.rows[0], "كل استبدال يسجّل معاملة redeem").toBeTruthy();
    expect(Number(tx.rows[0].points)).toBe(-5);
    expect(tx.rows[0].description).toContain("استبدال وجبة مجانية");
    const after = await client2.query(`SELECT "totalOrders", points FROM "LoyaltyCard" WHERE id = $1`, [cardId]);
    expect(after.rows[0].totalOrders).toBe(0); // 5 - REWARD_COST(5)
    expect(after.rows[0].points).toBe(5); // 10 - REWARD_POINTS(5) — لا سالب أبدًا
    await client2.end();
  });

  test("استبدال ثانٍ بعد نفاد الرصيد → 400 «لا توجد طلبات كافية»", async ({ request }) => {
    const pg = (await import("pg")).default;
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const card = await client.query(
      `SELECT id FROM "LoyaltyCard" WHERE "customerPhone" = $1 AND "restaurantId" = $2 LIMIT 1`,
      [CUSTOMER_PHONE, alWahaId],
    );
    await client.end();
    expect(card.rows[0]).toBeTruthy();
    const cardId = card.rows[0].id;

    const res = await request.post(`${BASE}/api/loyalty/redeem`, {
      headers: await authedJson(request, ownerCookie),
      data: JSON.stringify({ cardId }),
    });
    expect(res.status(), "البطاقة 0 طلبات — السقف يرفض لا يمرّ").toBe(400);
    const body = await res.json();
    expect(body.error).toContain("لا توجد طلبات كافية للاستبدال بعد");
  });

  test("بطاقة غير موجودة → 400 «البطاقة غير موجودة»", async ({ request }) => {
    const res = await request.post(`${BASE}/api/loyalty/redeem`, {
      headers: await authedJson(request, ownerCookie),
      data: JSON.stringify({ cardId: NONEXISTENT_CARD_ID }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("البطاقة غير موجودة");
  });
});
