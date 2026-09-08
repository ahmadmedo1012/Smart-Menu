# تقرير التفتيش 2-e — جودة الاختبارات العميق (الجولة 94)

> الوكيل: E (جودة الاختبارات) · المعرّف: **2-e** · التاريخ: 2026-09-08 · خط الأساس: aec233ba
> المنهج: بحث ساكن + تشغيل تشغيصي فقط (الوحدة حصراً بـ`env -u DATABASE_URL` — لا تشغيل e2e/dev/build، صفر تعديل على src/tests/config).
> كل تشغيلة وحدة في هذا التقرير أنا من نفّذها (حصرية قاعدة البيانات للموجة).

---

## 0) الخلاصة التنفيذية

| المؤشر | النتيجة |
|---|---|
| الوحدة (تشغيلتي التشخيصية الكاملة) | **1830/1830 · 124 ملفاً · exit=0** (41.6 ثانية) — مطابق خط الأساس r93 حرفياً |
| skips في الوحدة | **0** (ساكن + وقت-تشغيل) |
| D5 ضوضاء CI مثبتة | ملف واحد فقط: `reviews-atomic-pii.test.ts` (**4 أسطر** «menu revalidate failed» لكل تشغيلة كاملة) |
| D5 ابتلاع صامت (اكتشاف جديد) | `login-lockout` + `login-timing-equalization`: حدث تدقيق القفل `auth.lockout` (r88-B7) **لا يُختبر فعلياً أبداً** — TypeError يُبتلع في catch فارغ بلا أي أثر |
| skips حية e2e | 13 موقعاً شرطياً — منها **7 لا تعمل في أي بيئة على الإطلاق** (3 webhook + 4 HSTS) |
| جزر تغطية (لا تُحمَّل من أي اختبار وحدة) | **12 مساراً** في src/lib + src/app/api |
| فخ DATABASE_URL في السكربت | `npm test` لا يقيّد المتغير — مثبت تشغيلياً: مع تسريب الشل تصبح «1806 passed» خضراء المظهر و2 ملفان فاشلان (24 اختباراً يختفون من العدّاد) |

---

## 1) مسح نظافة الـmocks — نمط D5 (mock ناقص لـprisma)

### المنهجية
1. `rg "vi.mock\(['\"]@/lib/db"` → **87 ملفاً من 124** يعمل mock للوحدة `@/lib/db` (70% من ملفات الوحدة؛ لا استخدام لـmockDeep — كلها كائنات يدوية).
2. محلل ساكن (Node، خارج الشجرة: `/home/z/.audit/d5-audit.mjs`): لكل ملف — استخراج نماذج الـmock (بما فيها أنماط hoisted/IIFE/txMock)، حساب الوحدات الحقيقية المحمَّلة (الاستيرادات مطروح منها المُوَكَّبة، عبر السلسلة، بلا generated)، ثم مطابقة نماذج `prisma.X`/`tx.X` المستخدمة في الكود المحمَّل مقابل المعرفة في الـmock.
3. تشغيل تشخيصي كامل لتصنيف الأثر الفعلي (ضوضاء / ابتلاع صامت / مسار غير ممسوس).

### الأرقام الكلية

| القياس | القيمة |
|---|---|
| ملفات تُوكّب `@/lib/db` | 87/124 |
| منها بفجوة نموذج ساكنة (نموذج مستخدم في كود محمَّل وغائب عن الـmock) | **38** |
| منها فجوة تظهر كضوضاء سجلات فعلاً | **1** (reviews-atomic-pii) |
| منها فجوة تُبتلع بصمت على مسار مُجرَّب | **2** (login-lockout، login-timing-equalization) |
| البقية (35) | مسارات غير ممسوسة في الاختبارات الحالية (أخضر + صفر ضوضاء) |

### التصنيف بالأولوية (الأهم أولاً)

#### P1-b — ابتلاع صامت = فشل صامت كاذب في التغطية (الأخطر، اكتشاف جديد)

| الملف | النموذج الناقص | المسار المُجرَّب | الدليل |
|---|---|---|---|
| `tests/unit/login-lockout.test.ts` | `prisma.systemEvent` | اختبار «21st returns 429 lockout» يصل فرع القفل الذي يكتب حدث تدقيق `auth.lockout` (login/route.ts:111) → `TypeError` يُبتلع في `catch {}` الفارغ («best-effort audit») → 429 يُعاد والاختبار أخضر | الـmock (الأسطر 22–25) فيه `user` فقط؛ تشغيلة الملفين معاً: `2 passed (2) · 6 tests` وصفر أسطر ERROR — أي أن حدث التدقيق **لم يُكتب أبداً** في أي تشغيلة وحدة |
| `tests/unit/login-timing-equalization.test.ts` | `prisma.systemEvent` | نفس النمط/الملف المصدر | mock بـ`user` فقط؛ أخضر بصمت |

**الأثر**: ميزة أمنية موثقة (r88-B7 «audit the lockout itself») يُثبت اختبار القفل أنها «تعمل» بينما الكتابة نفسها لا تحدث أبداً في بيئة الاختبار. ليست false-green على الـ429 (التوكيد الحقيقي سليم) لكنها **تغطية وهمية غير مرئية** — بلا ضوضاء تكشفها.

#### P1-a — ضوضاء سجلات ملتهَمة (مؤكد — تشخيص المنسق)

| الملف | النموذج الناقص | الأثر الفعلي |
|---|---|---|
| `tests/unit/reviews-atomic-pii.test.ts` | `prisma.restaurant` (عبر `revalidateMenu` الحقيقي — الملف لا يوكّب `@/lib/menu-cache` بينما يوكّب 10 ملفات أخرى) | **4 أسطر** `menu revalidate failed { TypeError: Cannot read properties of undefined (reading 'findUnique') }` لكل تشغيلة كاملة (تُلتقط في CI) — الاختبارات نفسها سليمة (revalidateMenu يلتقط الخطأ داخلياً بأفضل جهد بحكم تصميمه) |

دليل التشغيل: `env -u DATABASE_URL npx vitest run tests/unit/reviews-atomic-pii.test.ts` → 4 أسطر ERROR بهذا النص. وفي التشغيلة الكاملة: `rg -c "menu revalidate failed"` = **4** — لا ملف آخر يصدرها.

**الإصلاح المقترح (موجة قادمة، لا تعديل مني)**: إمّا `vi.mock('@/lib/menu-cache', …)` (النمط السائد في 10 ملفات: items-contract, plan-limit, rbac-matrix…) أو إضافة `restaurant: { findUnique: vi.fn().mockResolvedValue({ slug: 'x' }) }` للـmock + توكيد الاستدعاء (الأفضل — يقفل عقد النشر المتزامن r92-A2). للـlogin: إضافة `systemEvent: { create: vi.fn() }` + `expect(mockSystemEventCreate).toHaveBeenCalled()` عند اختبار القفل.

#### P2 — فجوة كامنة (نفس النمط؛ المسار غير ممسوس اليوم)

| الملف | النموذج الناقص | لماذا كامن |
|---|---|---|
| `r93-reviews-subadmin-pii.test.ts` | `prisma.restaurant` (menu-cache) | يجرّب GET فقط (GET لا يستدعي revalidateMenu) — أول اختبار POST مستقبلي سيورّث ضوضاء D5 |
| `items-featured.test.ts` | `prisma.userRestaurant` | الـfixture يطابق restaurantId الأساسي فلا يُفحص الرابط — تغيير fixture لك مطعم ثانٍ يفعّل TypeError |
| `items-contract` (tx.restaurant)، `r93-items-get-ratelimit` (tx.restaurant + menuCategory)، `owner-restaurants-gate`/`r93-coverage-owner-restaurants`/`r92-categories-route`/`settings-tenant` (list-counts models)، `create-owner`+`r93-create-owner-link` (tx.userRestaurant/subscriptionPlan) | … | المسارات الناقصة في فروع لا تصلها الاختبارات الحالية (فروع admin/حذف متتالٍ/سقف الخطة) |

#### P3 — مسارات غير ممسوسة (35 ملفاً) — أبرز الأنماط المتكررة

| النموذج الناقص (ساكن، عبر) | عدد الملفات | ملاحظة |
|---|---|---|
| `prisma.orderItem` / `prisma.menuCategory` / `prisma.order` عبر `src/lib/list-counts.ts` | 16/16/11 ملفاً | عدّادات «استخدام المنيو» تُستدعى فقط في مسارات حذف/تعطيل غير مُجرَّبة في تلك الملفات |
| `tx.*` عائلة `referral-conversion` (referral/loyaltyCard/rewardTransaction/systemEvent) | 6–7 ملفات orders-* | التحويل يعمل فقط عند إكمال الطلب (PUT orders/[id]) — لا يجرّبه أي من ملفات orders هذه (order-lifecycle يجرّبه بـmock كامل سليم ✓) |
| `tx.*` عائلة `subscription-decisions` (restaurant/user/userRestaurant/systemEvent/menuCategory/subscriptionPlan) | 4 ملفات (regression×2, payment-rejection, r93-subscription-markdown-escape) | درع «best-effort لا يفشل الطلب» يبتلع أي TypeError في تلك الملفات لو مُسّ المسار |
| `prisma.telegramConfig`/`telegramBroadcastTarget` (config/telegram-broadcast) | 3 ملفات | تُوكَّب في ملفات أخرى؛ هنا المسار الإشعاري غير مُجرَّب |

**حكم منهجي على سؤال الأولوية**: النمط الغالب (P3) **ليس** فشلاً صامتاً كاذباً اليوم لأن المسارات غير ممسوسة أصلاً (لا يوجد ادعاء تغطية)؛ الخطر الحقيقي بمرتبتين: (1) **P1-b** — ابتلاع صامت على مسار مُجرَّب يجعل توكيداً ضمنياً غير قابل للانكسار (تغطية وهمية)، (2) **P2** — فجوة كامنة تنفجر ضوضاءً عند أول توسعة اختبار. ضوضاء P1-a مزعجة لكنها الأقل خطراً (الاختبار نفسه صادق).

### عناصر سليمة بالتصميم (للإنصاف)

| الشاهد | الدليل |
|---|---|
| `admin-subscriptions-status.test.ts` يوكّب `prisma: {}` فارغة عمداً | يوكّب `@/lib/subscription-decisions` (المستهلك الوحيد لـsubscriptionPayment في مساره) — موثق في ترويسة الملف |
| `order-lifecycle.test.ts` | الـmock الأكمل في المشروع (prisma + tx يشملان referral/systemEvent/loyaltyCard/rewardTransaction) — النموذج المرجعي |
| `r93-reviews-subadmin-pii` | GET-only عمداً — الفجوة الكامنة فيه نمط D5 ذاته لكن غير مفعّلة |

---

## 2) جرد الـskips الحية

### الوحدة (vitest)

| الفحص | النتيجة |
|---|---|
| `rg "\.skip\(|\.todo\(|\.skipIf\(|\.only\(" tests/unit/` | **صفر نتائج** |
| سطر الخلاصة في تشغيلتي الكاملة | `Tests 1830 passed (1830)` — لا skipped |

### e2e/security (ساكن — 13 موقعاً)

| # | الملف:السطر | الشرط | أين يتحقق skip | موثق؟ | التقييم |
|---|---|---|---|---|---|
| 1 | webhook-security:82 | `!hasSecret` (TELEGRAM_WEBHOOK_SECRET من env أو .env) | **في كل مكان** — المتغير غير معرف في .env المحلي (يوجد فقط في .env.example) ولا يُمرَّر في أي workflow (تحققت: `rg TELEGRAM_WEBHOOK_SECRET .github/workflows` = صفر) | آلية الـskip موثقة في ترويسة الملف؛ حقيقة «لا يعمل أبداً» موثقة في r93-inspection-e بند 5 ولم تُعالج | **ميت دائماً** |
| 2 | webhook-security:118 | مثل فوق | مثل فوق | مثل فوق | **ميت دائماً** |
| 3 | webhook-security:130 | مثل فوق | مثل فوق | مثل فوق | **ميت دائماً** |
| 4 | ui-smoke:82 | `!process.env.VERCEL` (HSTS) | **في كل مكان** — لا workflow ولا سكربت يضبط VERCEL (`rg VERCEL .github/workflows scripts` = صفر) | رسالة الـskip ذاتية التوثيق | **ميت دائماً** (كان مفترضاً لمسار إنتاج Vercel لكن عدّاء الإنتاج prod-qa لا يضبط VERCEL) |
| 5 | ui-sweep:80 | مثل فوق | مثل فوق | مثل فوق | **ميت دائماً** |
| 6 | full-sweep:217 | مثل فوق | مثل فوق | مثل فوق | **ميت دائماً** |
| 7 | round80-security:74 | مثل فوق | مثل فوق | مثل فوق | **ميت دائماً** |
| 8 | r93-sim-abuser:56 | `RATE_LIMIT_TEST_RELAX` (بيئة CI المرخّصة) | في CI (خطوة core e2e تضبطه=1)؛ **يعمل محلياً** عبر r93-sim-hostile.sh بميزانيات حقيقية | موثق صراحة (تعليق + عمل CI) | سليم بالتصميم |
| 9 | r93-sim-abuser:77 | مثل فوق | مثل فوق | مثل فوق | سليم بالتصميم |
| 10 | round86-security:38 | runtime: register رجع 429 | نادراً عند إجهاد التسجيل | موثق برسالة | شرطي مقبول |
| 11 | rbac-negative:55 | مثل فوق | مثل فوق | موثق | شرطي مقبول |
| 12 | team10-regression-guard:182 | BASE_URL = الإنتاج (sinceId يحتاج بذرة أدمن محلية) | في prod-qa فقط؛ يعمل في CI localhost | موثق (تعليق r88) | سليم بالتصميم |
| 13 | round87-journeys:112 | runtime: لا معرض صور في البيئة (probe 8s) | على الإنتاج/بيئات بلا fixture | موثق (round87-closure) | شرطي مقبول |

- `test.fixme`: **0** · `test.only`/`describe.only`: **0** (rg على tests/ كاملة).

**الخلاصة**: 7 من 13 لا تعمل في أي بيئة (بنود 1–7) — أي أن «110/110 متصفح» في r93 كانت تُحسب مع skips صامتة (Playwright يعدّها ok). التوصية: قيمة سر تطوير في .env + تمرير `TELEGRAM_WEBHOOK_SECRET` في CI (أو تحويل الاختبارات الثلاثة إلى ماكينة توكيد ضد localhost بخادم CI)، وقرار صريح حول HSTS×4: إمّا `VERCEL=1` في prod-qa أو حذفها بدل حمل ميت.

---

## 3) جزر التغطية الصفرية (استاتيكي — لا تشغيل coverage)

المنهج: رسم تحميل كامل لكل ملفات tests/unit (استيرادات حقيقية مطروح منها المُوَكَّبة عبر السلسلة) — ثم مطابقة كل ملفات `src/lib/**` و`src/app/api/**` (121 ملفاً، بلا generated). **e2e صندوق أسود تماماً**: `rg "from '@/" tests/e2e tests/security` = **صفر استيراد** — فالوحدة هي مصدر التحميل الوحيد.

**النتيجة: 108/121 محمَّلة — 12 جزيرة لا يستوردها أي اختبار وحدة إطلاقاً:**

| # | الجزيرة (معزولة كلياً) | ملاحظة |
|---|---|---|
| 1 | `src/app/api/admin/events/trigger/route.ts` | 6 أسطر — مشغّل أحداث يدوي |
| 2 | `src/app/api/admin/telegram/approvers/[id]/route.ts` | 9 أسطر (r93-e عدّها 0% lcov) |
| 3 | `src/app/api/admin/telegram/link/route.ts` | 13 سطراً — تدقيق B مسّه (verify مش بـlink) |
| 4 | `src/app/api/auth/logout/route.ts` | مغطى e2e فقط (فرق e2e تضربه عبر HTTP) |
| 5 | `src/app/api/auth/me/route.ts` | e2e (team7) |
| 6 | `src/app/api/config/route.ts` | مسار قراءة إعدادات عام |
| 7 | `src/app/api/plans/route.ts` | e2e (team2/round5) |
| 8 | `src/app/api/public/stats/route.ts` | 5 أسطر |
| 9 | `src/app/api/telegram/config/route.ts` | 34 سطراً — أكبر الجزائر |
| 10 | `src/app/api/telegram/diagnose/route.ts` | 24 سطراً |
| 11 | `src/app/api/telegram/test/route.ts` | 6 أسطر |
| 12 | `src/lib/brand.ts` + `src/lib/logout.ts` | 1 + 8 أسطر — استُوردا في r93-e كـ0% ولا يزالان |

مقارنةً بتقرير r93-e (16 ملفاً 0% lcov): الفرق الأربعة (chime/dietary/high-contrast/public-stats جزئياً) صارت **تُحمَّل** (مثلاً chime عبر NewOrdersBar في r93-w2a-arabic-phrases) لكن التحميل ≠ تنفيذ — تبقى 0% أسطر حتى تُستدعى دوالها. الجزيرة (لا تحميل أصلاً) أشد عزلة من الـ0% lcov.

---

## 4) أنماط الهشاشة

| النمط | النتيجة | الدليل |
|---|---|---|
| نوم طويل في الوحدة | **صفر** ≥1s — فقط 50ms (lib.test:108) و350ms (session.test:121، موثق «الوحدة تنتظر 300ms قبل إعادة المحاولة») | `rg "setTimeout" tests/unit` = 4 ملفات، أعلاها 350ms |
| نوم e2e | 72 `waitForTimeout`؛ الطويلة (15–20s، 8 مواقع) **كلها backoff دلالي موثق لنوافذ حدود المعدل** (تعليقات r92-C6/r87-D7 في persona-3/4, team1/4, qa-helpers:31, round79:288, r93-sim-owner:82)؛ 6s/8s ضمن نفس النمط؛ البقية (≤4s) settle waits عادية | فحصت سياق كل موقع ≥6s |
| `Date.now/new Date` بلا fake timers | 32 ملفاً تستخدم تواريخ؛ **كلها إمّا نسبية** (نِسَب من الآن: −3600s/+20h — session، +300s exp — telegram-verify) **أو ثابتة** (2026 — chart-stats) أو مع fake timers (session-absolute-cap، rate-limit×3) → لا هشاشة حدود زمنية | فحص عينات الملفات الأعلى خطراً |
| اعتماد ترتيب الملفات | **لا يوجد** — لا setupFiles/globalSetup في vitest.config، عزل الملفات الافتراضي قائم، ولا ملف اختبار يقرأ حالة كتبها آخر (الوحيد الكاتب: round79-phaseC يكتب ملف دليل JSON في النهاية ولا يقرؤه أحد) | vitest.config.ts + `rg writeFile tests/` |
| حالة DB مشتركة بين اختبارات الوحدة | **لا يوجد** — 87/124 توكّب prisma؛ الملفات المستوردة لوحدة db الحقيقية (db-withretry/keys) لا تفتح اتصالاً (الـpg pool كسول والمسارات تمرّر دوال موكبة) — لا `tests/infrastructure` أصلاً (البذور idempotent في scripts/: ci-seed + r93-sim-seed) | قراءة ترويسة db-withretry + `ls tests/` |
| طفرات `process.env` في الاختبارات | مُستعادة في afterEach حيث تلزم (regression:245-247، core:140-143، upload-route:102-103)؛ telegram-verify يضبط AUTH_SECRET ثابتاً على مستوى الملف (معزول افتراضياً) | فحص مباشر |
| **سكربتات package.json** | `"test": "vitest run"` **لا تتضمن `env -u DATABASE_URL`** — تعتمد على نظافة شل المستخدم | مثبت تشغيلياً: بنفس الشل المسرّب (`DATABASE_URL=file:...custom.db`): `Test Files 2 failed | 122 passed · Tests 1806 passed (1806)` — سطر الاختبارات يبدو أخضر بينما exit=1 و24 اختباراً (db-withretry 16 + keys 8) اختفت من العدّاد — **فخ r93 نفسه يتوالد مع كل مستخدم جديد**. التوصية: `"test": "env -u DATABASE_URL vitest run"` (وtest:coverage/test:watch بالمثل) |

---

## 5) e2e — playwright.config.ts (ساكن)

| البند | القيمة | التقييم |
|---|---|---|
| المشاريع | **8** (security · api · ui · qa-teams · qa-cross-browser(firefox) · qa-cross-browser-webkit · auth-verify · round79-c) — تصحيح دقيق: تقرير r93-e عدّها 9 وهي 8 | لا معطّل، لا يتيمة: 39 ملف اختبار على القرص = مجموع قوائم testMatch بالضبط (2+5+6+24+1+1) |
| retries | `PW_RETRIES` يتحكم خارجياً؛ CI=2، محلي=0 | موثق (r90-F2) — سليم، والـnightly-flake يشغّل بـPW_RETRIES=0 لكشف «الأخضر بالمحاولة الثانية» |
| workers | CI=1، محلي=2 | مع fullyParallel عام — مسكّن بـserial داخل 7 ملفات موثقة (r93-sim×4 بـdescribe.serial لحالة الرحلة المتصلة + team4 + team8:166 + round79:293 بـdescribe.configure — كلها بمبرر ميزانية دخول/حالة سلة) |
| actionTimeout | round79-c فقط: 15s (مضاد تعليق) | موجّه |
| baseURL | env BASE_URL مع localhost:3000 افتراضياً + auth-verify يحترم BASE_URL (إصلاح r87-D8 قائم) | سليم |
| `test.skip` | 13 موقعاً (جدول القسم 2) | منها 7 ميتة دائماً |
| `test.fixme` / `test.only` | 0 / 0 | نظيف |
| عدد اختبارات ساكن | 295 موقع `test(` · 50 describe (e2e 33 ملفاً + security 2) | للعدّ وقت-التشغيل يُحسم بتشغيل لاحق (r93 أعلن 110) |
| typecheck على e2e | tsconfig يستثني `tests/e2e` (مقصود r85-D2) — eslint يغطيها عبر `lint: "eslint src/ tests/"` | فجوة أنواع معروفة وموثقة |

---

## 6) الخلاصة والإجراءات المقترحة (مرتبة)

1. **[P1-b — الأهم]** ترميم mock نظامي login: أضف `systemEvent.create` + توكيد استدعائه عند القفل في login-lockout/login-timing-equalization — يجعل حدث تدقيق r88-B7 قابلاً للانكسار (اليوم تغطيته وهمية).
2. **[P1-a]** إصلاح ضوضاء D5 المعروفة: reviews-atomic-pii — `vi.mock('@/lib/menu-cache')` أو `restaurant.findUnique` في الـmock + توكيد (يقفل عقد النشر المتزامن r92-A2 في نفس الوقت).
3. **[سكربت]** `env -u DATABASE_URL` داخل سكربتات test/test:coverage/test:watch في package.json — يقتل فخ «1806 الخضراء المزيفة» عند جذوره بدل الاعتماد على انضباط كل مشغّل.
4. **[e2e ميت]** 3 اختبارات webhook-security لا تعمل في أي بيئة: سر تطوير في .env + تمريره في CI؛ و4 اختبارات HSTS لا تعمل أبداً (VERCEL لا يُضبط في أي عدّاء): VERCEL=1 في prod-qa أو حذف واعٍ.
5. **[P2 كامنة]** عند توسيع أي اختبار POST/ملكية في r93-reviews-subadmin-pii أو items-featured: افحص أولاً نماذج الـmock (قائمة القسم 1) وإلا ورثت ضوضاء D5.
6. **[جزر]** 12 جزيرة — أكبرها telegram/config (34 سطراً) وdiagnose (24) وlogout (8+route) — مرشحة لموجة تغطية قصيرة بنمط r93-W3 (بعضها له غطاء e2e فعلي).
7. **[توثيق]** اعتماد قاعدة «أساس عدّ e2e» من r93-e لم يُنفذ بعد — يُعاد اقتراحه: توحيد العدّ الساكن/وقت-التشغيل عند إغلاق الجولات.
