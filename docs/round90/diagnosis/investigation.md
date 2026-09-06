# تقرير تحقيق g90-D4 «المحقق» — البنود الأربعة المؤجلة من r89

**المنهجية:** gstack `investigate` — Iron Law (لا حكم قبل دليل) · Phase 1 (جمع الأدلة من الكود سطرًا سطرًا) · Phase 2 (تصنيف الأنماط) · Phase 3 (اختبار الفرضيات — بما فيها تجارب حية) · Phase 5 (تقرير منظم).
**الوضع:** تشخيص فقط — صفر تعديل على كود المصدر. كل أرقام الأسطر من قراءة فعلية للملفات بتاريخ هذا التقرير.

---

## بند 1 — TOCTOU في مسارات المال (الأهم أمنيًا)

### الفرضيات الأولية
- H1: نمط read-then-write غير ذري في awardPoints/redeemPoints (قراءة رصيد ثم تحديثه بقيم محسوبة).
- H2: count-then-create على حدود الخطط (maxOrders) — العدّ داخل transaction لا يكفي بمعزل READ COMMITTED.
- H3: check-then-create على «طلب دفع معلق واحد لكل مستخدم» قابل للتضاعف بتزامن.
- H4: انعكاس الواجهة مضمون بفهارس فريدة (P2002) — أي أن بعض السباقات تنتهي بأمان لكن برسالة 409 غير دلالية.

### الدليل البنيوي الحاسم (قبل كل بند فردي)
`rg "FOR UPDATE|isolationLevel|queryRaw" src/` → **صفر استخدام لـ `SELECT … FOR UPDATE` أو `isolationLevel` في كود التطبيق** (النتائج الوحيدة في `src/generated/` ومسارات قراءة إحصاءات `$queryRaw` للقراءة فقط). كل `prisma.$transaction` في المشروع يعمل بمعزل **PostgreSQL الافتراضي = READ COMMITTED**. تحت READ COMMITTED:
- عبارة `UPDATE` تُعيد تقييم شرطها بعد acquiring row-lock (المُنهزَم يرى 0 صفوف) — **هذا ما ينقذ مسارات التصميم الجيد**.
- عدّاد `count()` ثم `create()` داخل نفس المعاملة **لا يتسلسل** — كلا المعاملتين تعدّ نفس اللقطة → السباق قائم.

### أ) المواضع المأمونة سباقيًا (تحققت سطرًا سطرًا — مرفوضة كثغرات)

| # | المسار | الدليل (file:line) |
|---|--------|---------------------|
| 1 | استبدال نقاط الولاء `POST /api/loyalty/redeem` | `updateMany` بشرط ذري `totalOrders: {gte:5}, points:{gte:5}` + فحص `count===0` (redeem/route.ts:56-77) — مصمم صراحة ضد هذا السباق (تعليقات :47-63). |
| 2 | تحويل الإحالة `convertReferralForCompletedOrder` | قلب شرطي `updateMany WHERE status='pending'` + `count===0 → race-lost` (referral-conversion.ts:146-154) داخل $transaction — الخاسر لا يمنح شيئًا. |
| 3 | استحقاق نقاط إكمال الطلب `PUT /api/orders/[id]` | 3 طبقات: انتقال في الذاكرة (:119) + فحص صف earn داخل المعاملة (:123-127) + قلب شرطي `updateMany WHERE id AND status=snapshot` (:129-160). الخاسر المتزامن: `updateMany` يُقيَّم بعد commit الخصم → 0 صفوف → لا استحقاق مزدوج. مسار plain-update (:229) بلا مال. |
| 4 | spend-mark توكنات ربط تيليجرام | إنشاء-أو-موت على مفتاح فريد `link-token:${hash}` في webhook/route.ts:259-266 و admin/telegram/verify/route.ts:69-76 (المفتاح نفسه للطريقين). |
| 5 | قرار الدفع (verified/cancelled) | `update` بشرط `id+status:'pending'` (subscription-decisions.ts:69-71, 159-162) → الخاسر المتزامن يرمي P2025 → rollback كامل للمعاملة. الرفض: `updateMany` + فحص count (:270-274). |
| 6 | مطالبة إحالة مجهولة `POST /api/referrals/claim` | findFirst ثم create مع التقاط P2002 على الفريد `(referralCode, referredName)` (claim/route.ts:66-71 + schema.prisma `@@unique([referralCode, referredName])`). |
| 7 | idempotency الطلب | `Order.orderNo @unique` (schema.prisma:184) → السباق ينتهي P2002 → handleError يرجع 409 (api-helpers.ts:113-115) — لا طلب مكرر (عيب UX فقط، انظر هـ). |

### ب) الثغرات المؤكدة (جذر + أثر + إصلاح)

#### T1 — سقف طلبات الباقة: count-then-create رغم وجوده داخل المعاملة
- **الموضع:** `src/app/api/orders/route.ts:236-244` — `tx.order.count` ثم `tx.order.create` داخل `$transaction`.
- **الجذر:** READ COMMITTED لا يمنع phantom — طلبان متزامنان عند `maxOrders-1` يعدّان كلاهما 49 → ينشآن كلاهما → 51 طلبًا مقابل سقف 50. تعليق round-76 «TOCTOU race — concurrent POSTs both passed the old outside count check» وصف الإصلاح القديم (نقل العدّ داخل المعاملة) — وهذا **يضيّق نافذة السباق فقط ولا يغلقه**.
- **الأثر:** خرق سقف باقة بحده الأدنى (1..N بحسب التزامن) — **ليس double-spend**؛ الإيراد يُحتسب على طلبات حقيقية. الخطورة: منخفضة (عدالة الخطط/فوترة الباقات).
- **الإصلاح (Prisma، نمط قفل صف):**
```ts
// داخل نفس $transaction، قبل tx.order.count:
await tx.$queryRaw`SELECT id FROM "Restaurant" WHERE id = ${body.restaurantId} FOR UPDATE`;
const orderCount = await tx.order.count({ where: { restaurantId: body.restaurantId } });
if (orderCount >= restaurant.maxOrders) throw new PlanLimitError({ kind: 'orders', limit: restaurant.maxOrders });
// ... tx.order.create(...) كما هو
```
قفل صف المطعم يُسلسل كل إنشاء طلب لذلك المطعم — نفس صف `Restaurant` الذي تقرأه `maxOrders` أصلًا. بديل بدون Raw: `updateMany({where:{id, maxOrders:{gte:1}}, data:{...بلا تغيير فعلي}})` لا يصلح (لا يوجد عمود عدّاد) — أو advisory lock `pg_advisory_xact_lock(hashtext('orders:'||restaurantId))`. الأنظف: FOR UPDATE.

#### T2 — «طلب دفع معلق واحد» قابل للتكرار بتزامن (أقرب موضع للمال)
- **الموضعان:** `src/app/api/subscriptions/route.ts:79-82` (findFirst ثم create) و `src/app/api/subscriptions/upgrade/route.ts:133-136` (نفس النمط).
- **الجذر:** لا قيد فريد على «pending واحد لكل مستخدم» — طلبا POST متزامنان يجتازان فحص `findFirst(pending)` قبل أي كتابة → صفّا pending.
- **الأثر المُتحقق من الكود:** كلا الطلبين يبثّ لوحة موافقة لتيليجرام. إن وافق الأدمن على الاثنين:
  - فرع الترقية (subscription-decisions.ts:66-136): **كلاهما ينجح** — نفس planId/planEnd (شبه idempotent على المطعم) لكن المستخدم قد يدفع مرتين (تحويلان بنكيان) مقابل ترقية واحدة.
  - فرع المستخدم الجديد: الثاني يفشل `SLUG_TAKEN` (:154-157) **فقط إذا أُرسلت tempRestaurants** — مسار التوافق القديم `restaurant-${payment.id}` (slug مختلف لكل دفعة!) يمرّ للاثنين → مطاعم مزدوجة.
- **الإصلاح (فهرس فريد جزئي + التقاط P2002) — يحتاج migration:**
```sql
-- prisma/migrations/XXX_one_pending_payment_per_user/migration.sql
CREATE UNIQUE INDEX "SubscriptionPayment_one_pending_per_user"
  ON "SubscriptionPayment"("userId") WHERE status = 'pending';
```
```ts
// في كلا المسارين، بعد فشل create:
} catch (e) {
  if ((e as {code?: string})?.code === 'P2002') return error('لديك طلب دفع معلق بالفعل', 409);
  throw e;
}
```
(ملاحظة: `userId` nullable في المخطط — الفهرس الجزئي مع WHERE pending يتجاهل الصفوف NULL-userId تلقائيًا. الاختبارات القائمة تتوقع 400 «لديك طلب دفع معلق» — يجب تحديثها إلى 409 أو إبقاء الفحص الأولي للرسالة 400 والفهرس كشبكة أمان سباق — **التوصية: الفحص الأولي يبقى (400) والفهرس يلتقط السباق فقط برسالة 409**.)

#### T3 — سقف استخدامات كود الإحالة (MAX_REFERRAL_USES=10): count-then-flip
- **المواضع:** `src/lib/referral-conversion.ts:136-143` (داخل المعاملة) و `src/app/api/loyalty/referral/route.ts:48-54`.
- **الجذر:** عدّ التحويلات ثم القلب الشرطي — تحت READ COMMITTED يرى كلا الطلبين المتزامنين `convertedCount=9` → كلاهما يقلب صفّين مختلفين → 11 تحويلًا. القلب الشرطي نفسه يحمي من تحويل نفس الصف مرتين (T2 في القسم أ)، لكنه لا يحمي سقف الكود.
- **الأثر:** المكافأة تُمنح لكل طلب **مختلف ومكتمل فعلاً** (ليس double-spend على نفس الطلب) — خرق سقف أعمال بحد التزامن. الخطورة: منخفضة.
- **الإصلاح:** قفل صف بطاقة المُحيل قبل العدّ (الكود ↔ البطاقة 1:1 عبر `referralCode @unique`):
```ts
// referral-conversion.ts، داخل $transaction قبل tx.referral.count:
await tx.$queryRaw`SELECT id FROM "LoyaltyCard" WHERE id = ${referral.referrerId} FOR UPDATE`;
```

#### T4 — تقييمات الأصناف: read-then-write مضيع للتحديث (lost update)
- **الموضع:** `src/app/api/items/[id]/reviews/route.ts:137-145` — قراءة `avgRating/ratingCount` ثم كتابة قيم **مطلقة محسوبة** في $transaction.
- **الجذر:** القيم المطلقة (وليس `{increment}`) — تقييمان متزامنان يقرآن `ratingCount=10` → كلاهما يكتب 11 (كان يجب 12) ومتوسط منحرف. عدّاد النقرات يضيع تحديثًا لكل سباق.
- **الأثر:** إحصاءات عرض فقط (لا مال، لا صلاحيات). الخطورة: منخفضة (سلامة بيانات).
- **الإصلاح (تحديث ذري واحد):**
```ts
await prisma.$executeRaw`
  UPDATE "MenuItem" SET
    "ratingCount" = "ratingCount" + 1,
    "avgRating"   = ROUND((COALESCE("avgRating",0) * "ratingCount" + ${rating}) / ("ratingCount" + 1) * 10) / 10
  WHERE id = ${itemId}`;
```
(في SQL تستخدم تعبيرات SET قيم الصف **القديمة** — المعادلة مطابقة لمنطق :140 مع إسقاط المعاملة اليدوية.)

#### هـ) سباقات تنتهي عند قيود فريدة برسائل غير دلالية (توثيق فقط — لا فساد بيانات)
- `POST /api/orders` idempotency (orders/route.ts:219-227): خاسر السباق يستلم 409 «بيانات مكررة — هذا الاسم موجود مسبقًا» (handleError:113-115) بدل `200 {already:true}` — التوصية: التقاط P2002 على orderNo وإرجاع ردّ idempotency.
- `POST /api/loyalty` إنشاء بطاقة (loyalty/route.ts:49-72): P2002 على `(customerPhone, restaurantId)` → 409 برسالة «اسم موجود» غير دلالية — التقاط P2002 وإرجاع البطاقة القائمة (idempotent re-ack).
- فحوصات slug المسبقة في subscriptions POST (:62-76) — تُحمى لاحقًا بفهرس الفريد عند التصدير (SLUG_TAKEN).

### خلاصة البند 1
- **الحالة: مؤكد جزئيًا.** لا يوجد double-spend قابل للاستغلال في استحقاق/استبدال النقاط (التصميم there متين ومُختبر) — الثغرات الحقيقية: T2 (الأقرب للمال: دفعات معلقة مزدوجة → ترقية تُدفع مرتين)، T1 (خرق سقف الباقات)، T3 (خرق سقف الإحالات)، T4 (إحصاءات مضيعة).
- **الجذر النظامي:** الاعتماد على «عدّ/فحص داخل $transaction» بمعزل READ COMMITTED بلا صف أقفال أو فهارس فريدة جزئية — والتصحيح النمطي المتاح في Prisma: `FOR UPDATE` عبر `$queryRaw` أو قيود فريدة جزئية.

---

## بند 2 — الرسائل الإنجليزية الست

**المصدر الموثق:** docs/round89-closure-report.md:55 — «الرسائل الإنجليزية الست الباقية (loyalty/referral · subscriptions/status · auth/me)». تم تحديد مواقع الستة وقراءة سياق كل واحدة ومستهلكيها في الواجهة.

### الستة المؤكدة (موقع · نص حالي · مقترح عربي · ظهور)

| # | الموقع | النص الحالي (الكود) | المقترح | هل تظهر للمستخدم النهائي؟ (الدليل) |
|---|--------|----------------------|---------|-------------------------------------|
| 1 | `src/app/api/loyalty/referral/route.ts:36` | `"Invalid referral code"` (404, POST) | «كود إحالة غير صالح» | **لا** — `rg '/api/loyalty/referral' src/ --glob '!**/api/**'` = صفر مستهلك واجهة (التعليقات فقط في referral-conversion.ts). المسار يظهر لمتصل HTTP مباشر فقط. |
| 2 | `src/app/api/loyalty/referral/route.ts:78` | `"code query parameter is required"` (400, GET عام) | «معامل الاستعلام code مطلوب» | **لا** — نفس الفحص: صفر مستهلك واجهة. |
| 3 | `src/app/api/loyalty/referral/route.ts:103` | `"Referral code not found"` (404, GET عام) | «كود الإحالة غير موجود» | **لا** — صفر مستهلك واجهة (صفحة الهبوط تستخدم `/api/loyalty` و`?ref=`). |
| 4 | `src/app/api/subscriptions/status/route.ts:14` | `'id is required'` (400) | «معرّف الدفع مطلوب» | **لا** — المستهلك الوحيد `usePaymentStatusPoll.ts:38-51`: غير-2xx يُحسب فشلًا، وبعد 3 فشل توست عربي «تعذر الاتصال بالخادم…» — نص الخطأ لا يُعرض أبدًا. |
| 5 | `src/app/api/subscriptions/status/route.ts:21` | `'not found'` (404) | «طلب الدفع غير موجود» | **لا** — نفس المسلك. |
| 6 | `src/app/api/auth/me/route.ts:17` | `"Not authenticated"` (401) | «غير مصرح» | **لا** — كل المستهلكين (useAccessGate.ts:30-44 فشل مغلق بلا عرض نص، login/page.tsx:66، AdminSidebar:63، admin/layout:85، useActiveRestaurant:59، subscribe/page:112,254، owner/layout:98) يفحصون `res.ok/بيانات` ولا يعرضون نص الخطأ. |

**الحكم:** الستة **موجودة كما وُثّق** (مؤكد) — لكن زعم «ظاهرة للمستخدم النهائي» **مرفوض بالدليل**: كل واحدة غير معروضة في أي واجهة اليوم؛ ظاهرة فقط لمتصل API مباشر (curl/اختبارات/تكامل مستقبلي). التعريب ما زال مستحقًا كإجراء اتساق رخيصًا (أي مستهلك واجهة مستقبلي سيبرز الإنجليزية فورًا).

### اكتشافات إضافية خارج قائمة الستة (نفس الفلترة: استبعاد log/تعليقات/أسماء تقنية/cron-machine/next-auth)
- `src/app/api/categories/[id]/route.ts:27,73` — `"Invalid ID"` ×2 (فاتت قائمة E-2 التي عرّبت 18 موضعًا — categories لم تكن فيها). مسلك: dev-facing (URL مصنوع يدويًا فقط). مقترح: «معرف غير صالح».
- `src/app/api/admin/create-owner/route.ts:23` — `"Username already exists"` (409) — صفر مستهلك واجهة. مقترح: «اسم المستخدم مستخدم بالفعل».
- `src/app/api/admin/system-events/route.ts:130` — `"id query param is required"` (DELETE). مقترح: «معرّف الحدث مطلوب».
- `src/app/api/admin/config/route.ts:144` — `"key is required"` (DELETE). مقترح: «المفتاح مطلوب».
- `src/app/api/config/route.ts:18` — `'Not found'` — المستهلك useConfig.ts:46 لا يمرر key أصلًا (فرع ميت عمليًا) + لا يعرض الخطأ. مقترح: «غير موجود».
- `src/app/api/auth/logout/route.ts:13,18` — `"Logged out"`/`"Logout failed"` — logout.ts يعرض توست عربي خاص به ولا يقرأ النص. مقترح: «تم تسجيل الخروج»/«فشل تسجيل الخروج».
- `src/app/demo/route.ts:13` — `'Not available in production'` (404) — **يظهر** لزائر `/demo` في الإنتاج. مقترح: «غير متاح في بيئة الإنتاج».
- cron (`cleanup:16`, `subscription-expiry:18,45`) وwebhook (`Forbidden`/`Too Many Requests`): machine-to-machine (Vercel Cron/خوادم تيليجرام) — خارج النطاق بحكم التعليمات.
- عمق ملاحظ (خارج نطاق العدّ): رسائل zod الافتراضية الإنجليزية في `validationError` تفاصيل (details) — يظهر النص الرئيسي العربي فقط في معظم المسارات؛ فحص شامل منفصل إن أُريد.

---

## بند 3 — سقف image في PUT

### الحالة: مؤكد بالقراءة المباشرة
- **POST:** `src/app/api/items/route.ts:72` — `image: z.string().max(200_000, 'الصورة كبيرة جداً — الحد الأقصى حوالي 150 كيلوبايت بعد الضغط')` (إصلاح r89-E4 + 3 اختبارات في plan-limit.test.ts).
- **PUT:** `src/app/api/items/[id]/route.ts:114` — `image: z.string().max(7000000).optional()` — **بقي 7M حرفًا (~5.25MB ثنائيًا بعد فك base64)**.
- نفس العمود `MenuItem.image` (نص base64 يُخزَّن في DB — مصدر انتفاخ الجدول المُوثق dx-2 #9). الاثنان نفس سطح الكتابة الفعلي: ItemDialog يرسل PUT عند التحرير — أي أن المسار الأكثر استخدامًا للتحرير هو غير المحمي.
- `rg "7000000|200_000" src/` = موضعان فقط (المذكوران أعلاه) — لا مسارات كتابة صور أخرى في API (logo في restaurants/[id] سقف 2000 = URL وليس base64؛ /api/upload ملف multipart محدود 5MB + magic bytes + CDN — ليس مسار انتفاخ DB).

### الأثر
مستخدم مصادق (owner) يستطيع عبر PUT تخزين ~5MB لكل صنف في عمود DB — يعيد فتح ثغرة dx-2 #9 التي أغلقها POST (تُغطيها حاصرات النطاق الاختبارية فقط في plan-limit.test.ts على POST). خطورة: متوسطة (bloat/DoS تخزيني متدرج عبر أصناف كثيرة)، ليست أمن صلاحيات.

### خطة الإصلاح الدقيقة (موجة 2 — جراحة سطر واحد + اختبار)
```diff
// src/app/api/items/[id]/route.ts:114
-   image: z.string().max(7000000).optional(),
+   image: z.string().max(200_000, 'الصورة كبيرة جداً — الحد الأقصى حوالي 150 كيلوبايت بعد الضغط').optional(),
```
- الاختبار الموازي (نمط plan-limit.test.ts الموجود): PUT لصنف موجود بحقل image بطول 250k → 422 قبل أي استعلام كتابة؛ صورة 20k → مقبولة؛ 200k بالضبط → مقبولة.
- التحقق من التوازي: نفس الرسالة/النبرة الحرفية للـ POST (اتساق ردود الواجهة) — لا حاجة لتغيير أي شيء آخر (mediaUrlError يبقى بعد السقف كما هو :234-237).

---

## بند 4 — nightly flake

### أولاً: تصحيح الواقع — لا يوجد nightly يشغّل اختبارات اليوم
- `.github/workflows/` = ملفان فقط: `ci.yml` (push/PR/workflow_dispatch — **بلا `schedule:`**) و`keep_alive.yml` (cron كل 12 دقيقة — curl واحد لـ menu.smart-link.ly، لا اختبارات).
- البند المؤجل إذن هو **المقترح المُوثق** (round89-closure-report.md:52): «nightly flake-detection بretries=0: مقترح موثق بالCI — يحتاج قرار تشغيل أسبوعيًا أولًا». مهمة التحقيق: تحديد مصادر عدم الاستقرار التي سيكشفها/يصطدم بها التشغيل الليلي.

### تجربة حية (أُجريت فعلاً — الخادم standalone على :3000 بمعزل CI-parity، DB المحمولة :5434)
| التشغيل | النتيجة | الدلالة |
|---------|---------|--------|
| security ×3 متتالية (5s لكل تشغيلة) | تشغيلة 1: **25 passed** · تشغيلة 2: **25 passed** · تشغيلة 3: **24 passed + 1 skipped** | السكِب: rbac-negative.test.ts:125 «USER reads» — سببه `register: 429` (السطر :55 skip) |
| الدليل من DB | صف `RateLimitEntry` للمفتاح `register:::1` عدّاد **4** داخل نافذة دقيقة جدارية واحدة (15:23:00) | عدّاد التسجيل تراكم عبر التشغيلات الثلاث (كل تشغيلة تسجل مستخدمين اثنين: اختبارا USER reads/writes) — السقف 5/min/IP (register/route.ts:18) |
| team9-perf-smoke ×2 | 4/4 ثم 4/4 (health 104-114ms · menu 331-739ms · stats 533-545ms) | ميزانيات الأداء مستقرة محليًا (median-of-3 + warmup تعمل) |
| api ×2 | 159 passed + 1 skipped في **كليهما** | السكِب حتمي: HSTS على localhost (full-sweep:216) — ليس flake |

### تصنيف الأسباب المرجحة (بالترتيب)
1. **تراكم حدّات المعدل عبر التشغيلات على DB ثابتة (مؤكد بإعادة إنتاج حية + صف DB):** `createDbRateLimiter` يخزن النوافذ في `RateLimitEntry` بنوافذ **جدارية مُحاذاة** (rate-limit.ts:55-56) — التشغيل المتكرر خلال نفس الدقيقة الجدارية يشارك الدلاء. `RATE_LIMIT_RELAX=1` **معطّل إلزامًا** في خادم إنتاج محلي (`NODE_ENV=production` — rate-limit.ts:29-33) — لذا التشغيل المتكرر محليًا/ليليًا على DB دائمة يصطدم بالسقوف الحقيقية (register 5/min/IP، login 10/min/ip:username). مؤثر أيضًا على **prod-qa** (يعمل ضد الإنتاج بكل push على main — `continue-on-error: true` معلق بتعليق صريح «never block deploys on flaky rate-limits» — إقرار موثق بنفس الظاهرة).
2. **CI retries=2 يخفي الـ flakes** (playwright.config.ts:7): أي اختبار متذبذب يمر بالمحاولة الثانية/الثالثة — المقترح الليلي retries=0 هو الكاشف الصحيح.
3. **مهل زمنية ثابتة متبقية** (معظمها موثق كـ«backoff دلالي» وليس flake-sleep): team1:46 وteam4:42 (20s نافذة login/validate) · round79-phaseC:238/283/288 · team8-featured:40 (3000ms) · referral-claim:114/128 · team5:25/48. مخاطرها منخفضة (نوافذ جدارية تجعل 20s كافية دائمًا) لكنها تُبطئ التشغيل وتقترب من المهال إن تراكمت الحدود.
4. **حساسية ميزانيات الأداء على runners مشتركة** (team9): مخففة بmedian-of-3 — تبقى حساسة ل2-vCPU محمّل؛ IS_REMOTE يوسّع /api/stats إلى 5s للإنتاج (موثق).
5. **تراكم البيانات على DB ثابتة:** الأصناف الشعبية (اكتشاف w5-g — أُصلح) · نقاط الولاء تتراكم مع طلبات الاختبارات المكتملة (orders/[id] accrual) — تحوّل قيم لوحات الولاء عبر التشغيلات (غير مكسِّر حاليًا لأن الاختبارات لا تحقق على قيم نقاط ثابتة — تحقق بالنظر لعدم وجود asserts على قيم نقاط في team2/team11).
6. **شبكة prod-qa** (TLS+edge+Neon): موثقة بالموازين الموسعة + continue-on-error.
7. **ملاحظة بيئة (خارج المنتج):** في هذه الصندوقة، خوادم `next start -p 3000` مع `output: standalone` ماتت مرتين منتصف التشغيل بينما `node .next/standalone/server.js` صمد أمام نفس الحِمل — يطابق تحذير ci.yml:188-191 («next start warns and can misbehave»)؛ توصية توثيقية: استخدام standalone دائمًا للتشغيل المحلي الطويل.

### خطة الإصلاح المقترحة (جاهزة للموجة 2)
1. **وظيفة nightly-flake في ci.yml:**
```yaml
  nightly-flake:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    timeout-minutes: 45
    # نفس services.postgres وكل خطوات lint-build-test-job حتى E2E، مع:
    #   - PW_RETRIES=0 (يتطلب سطر config أدناه)
    #   - تشغيل المرحلة العميقة مرتين متتاليتين (تكرار الثاني يكشف تراكم الحدود على DB نفسها)
    # schedule: cron '0 3 * * *'  (يضاف إلى on: أعلى الملف)
```
```ts
// playwright.config.ts:7
retries: process.env.PW_RETRIES !== undefined ? Number(process.env.PW_RETRIES) : (process.env.CI ? 2 : 0),
```
   - قرارات مطلوبة من المنسق (كما قال إغلاق r89): التكرار أسبوعيًا أم يوميًا، وهل nightly blocking أم advisory (التوصية: advisory أول أسبوعين — يجمع بيانات flake بلا ضغط).
2. **إزالة تلوث الحدود بين التكرارات المحلية/الليلية:** أمر توثيقي أو سكربت `scripts/clear-rate-limits.mjs` (`DELETE FROM "RateLimitEntry"`) يُستدعى بين التكرارين في الوظيفة الليلية وفي README للتشغيل المحلي المتكرر (الصفوف زهيدة أصلًا وتُكنس بعد 120s — لكن النافذة الجدارية نفسها تبقى مشتركة أثناء التكرار المتلاحق).
3. **استبدال المهال الثابتة المتبقية** بنمط round87-D7 (انتظار شرط): team8-featured:40 (انتظار ظهور شارة/عنصر الشعبية) · referral-claim:114/128 (انتظار حالة الطلب/الصف) — 4 مواضع فقط، البقية backoffs دلالية موثقة تُترك.
4. **عزل بذور الميزانيات الحساسة:** team9 يبقى كما هو (الأدلة: مستقر ×2) — لا عمل مطلوب حاليًا؛ يُترك للمقارنة الليلية عبر annotations (`perf median=` موجودة أصلًا في test.info).
5. prod-qa: يبقى continue-on-error؛ يُقترح إضافة prefix للمقارنة الليلية فقط بعد أسبوعين من البيانات.

---

## خلاصة تنفيذية للبنود الأربعة

| البند | الحالة | أهم دليل | أولوية إصلاح الموجة 2 |
|-------|--------|----------|------------------------|
| 1-TOCTOU | **مؤكد جزئيًا** — لا double-spend في نقاط الولاء/الاستبدال (تصميم متين)؛ 4 مواضع حقيقية: T2 دفعات معلقة مزدوجة (الأقرب للمال) · T1 سقف طلبات الباقة · T3 سقف الإحالات · T4 lost-update التقييمات | صفر `FOR UPDATE`/`isolationLevel` في src/ → كل المعاملات READ COMMITTED → count-inside-tx لا يتسلسل | T2 (migration فهرس فريد جزئي + P2002) ثم T1 (`FOR UPDATE` صف المطعم) |
| 2-الست إنجليزية | **مؤكد وجودًا، مرفوض كظهور للمستخدم** | كل مستهلكي الستة يفحصون `res.ok` ولا يعرضون النص؛ صفر مستهلك واجهة لloyalty/referral | تعريب الستة + 7 اكتشافات إضافية (grapes: categories ×2، create-owner، system-events، admin/config، logout، demo) |
| 3-PUT image cap | **مؤكد** | items/[id]/route.ts:114 = 7M مقابل items/route.ts:72 = 200k — نفس عمود DB | سطر واحد + اختبار PUT مرآة لاختبار POST |
| 4-nightly flake | **مؤكد كظاهرة مصادر (لا وظيفة ليلية موجودة)** | إعادة إنتاج حية: security ×3 → تشغيلة 3 قفزت test (register 429) + صف `RateLimitEntry` عدّاد 4 بنافذة جدارية واحدة | وظيفة nightly-flake بPW_RETRIES=0 + clear-rate-limits بين التكرارات + 4 مهال ثابتة تستبدل بانتظار شرط |

**أمان التجارب:** شُغّلت التجارب على DB المحمولة المحلية (:5434) وخادم standalone محلي (:3000) — اقتُل الخادم بعد الانتهاء (المنفذ 3000 حرّ، خادم 3100 لوكيل آخر لم يُمس). صفر تعديل على كود المصدر.
