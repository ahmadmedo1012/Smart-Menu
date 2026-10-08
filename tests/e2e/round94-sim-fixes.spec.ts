/**
 * r94-S1 (موجة 4 — جيش المحاكاة الأضخم) — «محاكاة تحقق إصلاحات الجولة 94».
 *
 * يتحقق من دفاعات الجولة الجديدة بمنظور مستخدم حقيقي (مخرب + مالك + مجهول):
 *   1. [HIGH W1-a] بوابة احتيال الإحالة: حساب USER مجاني يحاول حشو رقم
 *      ضحية عبر كود إحالة صالح → 403 (كان مقبولًا قبل الجولة)
 *   2. [W1-a] مجهول بلا جلسة → 401 قبل أي منطق
 *   3. [W1-a] شاهد إيجابي: مالك المطعم نفسه يضيف إحالة صالحة → نجاح
 *      (البوابة لا تكسر المسار الشرعي)
 *   4. [W1-a] /api/config: مجهول 401 · مالك يرى قنوات الدفع فقط بلا
 *      المفاتيح الداخلية · ?key= داخلي → 403
 *   5. [W1-a] سقف الجلسات 5: الجلسة الأولى تموت بعد السادسة (trim ذري)
 *   6. [W1-a] whatsapp/generate: 21 ضغطة متتالية → 429 عربي (حد 20/دقيقة)
 *
 * Run: bash scripts/r92-e2e-local.sh "tests/e2e/round94-sim-fixes.spec.ts --project=ui"
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { mintCsrfPair, csrfHeadersFor } from "./csrf-helper";

const SHOTS = "download/round94-simulations";
const TS = Date.now().toString().slice(-8);
/* عقد البذرة المحلية (PROJECT.md): round83-seed يبذر waha_owner/waha123456
 * (SEED_ADMIN_PASS=smart123 خاص بحساب admin من ci-seed — ليس المالك) */
const OWNER_PASSWORD = process.env.WAHA_OWNER_PASS || "waha123456";

let referralCode = "";
const victimPhone = "0917777788"; // رقم ضحية وهمي — لا يملكه أحد
let alWahaId = 0;

test.beforeAll(async () => {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const r = await client.query(
    `SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe' LIMIT 1`,
  );
  if (!r.rows[0]) {
    // M-2 (r127-F2): probe-and-skip بدل الانفجار — بلا بذور الجولة تُتخطى
    // المواصفة بصوت عالٍ بدل احتجاز التشغيلة (نمط loyalty-redeem).
    test.skip(true, "بذور الجولة ناقصة (al-waha-cafe غير موجود) — شغّل بذور الجولة أولًا");
    await client.end();
    return;
  }
  alWahaId = r.rows[0].id;
  // بطاقة ولاء حقيقية بكود إحالة (تُنشأ إن لم توجد — idempotent)
  const card = await client.query(
    `SELECT "referralCode" FROM "LoyaltyCard" WHERE "restaurantId" = $1 LIMIT 1`,
    [alWahaId],
  );
  if (!card.rows[0]) {
    const code = `R94SIM${TS.slice(-4)}`;
    await client.query(
      `INSERT INTO "LoyaltyCard" ("customerPhone", "customerName", "restaurantId", "referralCode", "points", "totalSpent", "tier", "createdAt", "updatedAt")
       VALUES ('0910000000', 'محاكاة r94', $1, $2, 0, 0, 'bronze', NOW(), NOW())`,
      [alWahaId, code],
    );
    referralCode = code;
  } else {
    referralCode = card.rows[0].referralCode;
  }
  await client.end();
});

/** تسجيل دخول API وإرجاع كوكي الجلسة (نمط mintCsrfPair + حمل يدوي) */
async function apiLogin(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<{ session: string; headers: Record<string, string> }> {
  const pair = await mintCsrfPair(request);
  const base = new URL(request.constructor === Object ? "http://localhost:3000" : "http://localhost:3000");
  const res = await request.post("http://localhost:3000/api/auth/login", {
    headers: { "Content-Type": "application/json", ...csrfHeadersFor("http://localhost:3000", pair) },
    data: { username, password },
  });
  expect(res.status(), `login ${username} يجب أن ينجح`).toBe(200);
  const setCookie = res.headers()["set-cookie"] ?? "";
  const session = setCookie.match(/smart-menu-session=([^;]+)/)?.[1] ?? "";
  expect(session).not.toBe("");
  const merged = {
    "X-CSRF-Token": pair.token,
    Cookie: `${pair.cookie}; smart-menu-session=${session}`,
    Origin: "http://localhost:3000",
  };
  return { session, headers: merged };
}

test.describe.serial("r94 محاكاة تحقق الإصلاحات — المخرب ثم المالك", () => {
  /* ── 1. [HIGH] احتيال الإحالة: USER مجاني + كود صالح + رقم ضحية ── */
  test("حساب USER مجاني يحاول حشو إحالة برقم ضحية → 403", async ({ request }) => {
    const uname = `r94fraud_${TS}`;
    const pair = await mintCsrfPair(request);
    // تسجيل حساب USER مجاني (المخرب — مسار الخدمة الذاتية)
    const reg = await request.post("http://localhost:3000/api/auth/register", {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor("http://localhost:3000", pair) },
      data: { username: uname, password: "password123", name: `مخرب ${TS}` },
    });
    expect(reg.status()).toBe(201);

    const { headers } = await apiLogin(request, uname, "password123");
    // الهجوم: كود إحالة صالح لمطعم الضحية + رقم هاتف الضحية
    const attack = await request.post("http://localhost:3000/api/loyalty/referral", {
      headers: { "Content-Type": "application/json", ...headers },
      data: { referralCode, referredPhone: victimPhone, referredName: "المخرب" },
    });
    expect(attack.status(), "USER بلا علاقة بالمطعم يجب ألا يضيف إحالة").toBe(403);
    const body = await attack.text();
    expect(body).toContain("غير مصرح");
  });

  /* ── 2. مجهول بلا جلسة → 401 قبل أي منطق ── */
  test("إحالة مجهولة (بلا جلسة) → 401", async ({ request }) => {
    const pair = await mintCsrfPair(request);
    const res = await request.post("http://localhost:3000/api/loyalty/referral", {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor("http://localhost:3000", pair) },
      data: { referralCode, referredPhone: victimPhone },
    });
    expect(res.status()).toBe(401);
  });

  /* ── 3. الشاهد الإيجابي: المالك الشرعي يضيف إحالة صالحة ── */
  test("مالك المطعم (waha_owner) يضيف إحالة صالحة → نجاح", async ({ request }) => {
    const { headers } = await apiLogin(request, "waha_owner", OWNER_PASSWORD);
    const phone = `09155500${TS.slice(-2)}`; // رقم جديد كليًا لهذه التشغيلة
    const res = await request.post("http://localhost:3000/api/loyalty/referral", {
      headers: { "Content-Type": "application/json", ...headers },
      data: { referralCode, referredPhone: phone, referredName: `زبون ${TS}` },
    });
    expect([200, 201], "المسار الشرعي يجب أن يبقى يعمل").toContain(res.status());
    const json = await res.json().catch(() => ({}));
    expect(json.success).toBe(true);
  });

  /* ── 4. بوابة /api_config (W1-a LOW-5) ── */
  test("/api/config: مجهول 401 · مالك يرى الدفع فقط · ?key= داخلي 403", async ({ request }) => {
    // مجهول
    const anon = await request.get("http://localhost:3000/api/config");
    expect(anon.status()).toBe(401);

    // بذر حتمي: قناة دفع + مفتاح داخلي (عقد r94-W1a — idempotent)
    const pg = (await import("pg")).default;
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(
      `INSERT INTO "SystemConfig" (key, value, category, "isSecret", description, "updatedAt")
       VALUES ('bank_transfer_bank_name', '"بنك المحاكاة"', 'payment', false, 'r94 e2e fixture', NOW()),
              ('withdrawal_rules_r94', '"قواعد داخلية"', 'internal', false, 'r94 e2e fixture', NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()`,
    );
    await client.end();

    // المالك: قنوات الدفع فقط — لا المفتاح الداخلي
    const { headers } = await apiLogin(request, "waha_owner", OWNER_PASSWORD);
    const ownerView = await request.get("http://localhost:3000/api/config", { headers });
    expect(ownerView.status()).toBe(200);
    const body = await ownerView.text();
    expect(body).toContain("bank_transfer_bank_name"); // قناة الدفع الشرعية للمالك
    expect(body).not.toContain("withdrawal_rules_r94"); // الداخلية محجوبة
    expect(body).not.toContain("telegram_bot_token"); // السرية محجوبة دائماً
    expect(body).not.toContain("JWT_SECRET");

    // ?key= داخلي → 403
    const internal = await request.get("http://localhost:3000/api/config?key=withdrawal_rules_r94", { headers });
    expect(internal.status()).toBe(403);
    // ?key= قناة دفع → مسموح (404 إن لم توجد — هنا موجودة → 200)
    const payKey = await request.get("http://localhost:3000/api/config?key=bank_transfer_bank_name", { headers });
    expect(payKey.status()).toBe(200);
  });

  /* ── 5. سقف الجلسات 5 (W1-a LOW-2 — trim ذري) ── */
  test("سقف الجلسات: السادسة تُبعد الأولى (5 كحد أقصى)", async ({ request }) => {
    const sessions: string[] = [];
    for (let i = 0; i < 6; i++) {
      // جلسة جديدة كل مرة: نطلب زوج csrf نظيفًا عبر سياق الطلب نفسه
      const { session } = await apiLogin(request, "waha_owner", OWNER_PASSWORD);
      sessions.push(session);
    }
    expect(sessions).toHaveLength(6);
    // الأولى أُبعدت بفعل السادسة → 401
    const pair = await mintCsrfPair(request);
    const checkOld = await request.get("http://localhost:3000/api/auth/me", {
      headers: { Cookie: `${pair.cookie}; smart-menu-session=${sessions[0]}` },
    });
    expect(checkOld.status(), "أقدم جلسة يجب أن تُبعد بعد السادسة").toBe(401);
    // الأحدث حية → 200
    const checkNew = await request.get("http://localhost:3000/api/auth/me", {
      headers: { Cookie: `${pair.cookie}; smart-menu-session=${sessions[5]}` },
    });
    expect(checkNew.status()).toBe(200);
  });

  /* ── 6. حد معدل whatsapp/generate (W1-a LOW-1) — 21 ضغطة ── */
  test("whatsapp/generate: الضغطة 21 → 429 عربي", async ({ request }) => {
    const { headers } = await apiLogin(request, "waha_owner", OWNER_PASSWORD);
    let saw429 = false;
    let lastBody = "";
    for (let i = 0; i < 24; i++) {
      const res = await request.post("http://localhost:3000/api/whatsapp/generate", {
        headers: { "Content-Type": "application/json", ...headers },
        data: { orderId: 99999999 }, // طلب غير موجود — يجتاز البوابات إلى 404
      });
      if (res.status() === 429) {
        saw429 = true;
        lastBody = await res.text();
        break;
      }
      expect([404]).toContain(res.status()); // قبل الحد: 404 نظيفة (لا 403/401)
    }
    expect(saw429, "يجب أن يظهر 429 بعد تجاوز 20/دقيقة").toBe(true);
    expect(lastBody).toContain("محاولات كثيرة");
  });
});
