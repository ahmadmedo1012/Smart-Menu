# تقرير التفتيش 1-e — مدقق منظومة الاختبارات (الجولة 93)

> الوكيل: 1-e «مدقق منظومة الاختبارات» · التاريخ: 2026-09-07 · النطاق: وحدة + e2e ساكن + تغطية.
> قاعدة صارمة مُلتزمة: لا تعديل كود، لا تشغيل dev/build/e2e (بناء next يعمل في الخلفية).

---

## 1) حل لغز 1666 مقابل 1642 — حسم قاطع ✅

**الخلاصة: إعلان r92 «1666/1666» كان صادقًا. الرقم 1642 الحالي أثرُ رقيقة بيئية (متغير شل مسرّب)، وليس فقدان اختبارات. والأخطر: خط الأساس المدوَّن في worklog «vitest 1642/1642» كان في الحقيقة تشغيلة حمراء قُرئت خطأً.**

### سلسلة الأدلة

1. **التشغيل الخام الحالي** (`npx vitest run`): `Test Files 2 failed | 106 passed (108)` · `Tests 1642 passed (1642)` — أي أن الملفين الفاشلين **فشلا في مرحلة الجمع (collection) فصفر اختبار منهما دخل عدّاد "Tests" أصلًا** — لهذا يبدو الرقم «أخضر» في سطر الاختبارات بينما exit=1.
2. **الملمان الفاشلان** (من قسم Failed Suites):
   - `tests/unit/db-withretry.test.ts` — 16 اختبارًا (it.each ‏5 + it.each ‏4 + 8 فردي)
   - `tests/unit/keys.test.ts` — 8 اختبارات
   - **المجموع = 24 بالضبط** = 1666 − 1642.
3. **سبب الفشل**: `ZodError` من `validateEnv` (src/lib/env.ts:62) عند الاستيراد: `DATABASE_URL` الحالية `file:/home/z/my-project/db/custom.db` — **رابط SQLite فارغ (0 بايت، أُنشئ 15:19 أثناء ترميم البيئة) يسرب من بيئة الشل ويغلب قيمة .env السليمة** (`postgresql://postgres:postgres@localhost:5434/smartmenu`). كلا الملفين يستورد `@/lib/db` (مباشر أو عبر `@/lib/config`) → ينهار التجميع قبل أي اختبار.
4. **الإثبات الحاسم**: `env -u DATABASE_URL npx vitest run` →
   ```
   Test Files  108 passed (108)
        Tests  1666 passed (1666)   exit=0
   ```
   1642 + 24 = **1666** — الرقم المعلن في r92 يتطابق حرفيًا.
5. **برهان التطابق الكامل**: تشغيل التغطية بنفس البيئة النظيفة أعاد أيضًا 1666/1666 **والقياس 82.22/75.56/76.7/84.66 — مطابق رقمًا برقم لإعلان إغلاق r92** (مصادفة مستحيلة أن تتكرر لو كان أحد الطرفين وهميًا).
6. **استبعاد التفسيرات المنافسة**:
   - `rg "describe.skipIf|it.skipIf|skipIf("` في tests/unit → **صفر نتائج** (لا اختبارات مشروطة إطلاقًا).
   - `rg "describe.skip|it.skip|test.skip"` → **صفر**. `rg ".todo("` → **صفر**.
   - vitest.config.ts: `include: tests/unit/**/*.test.ts` بلا أي استثناء/شرط → 108 ملفات على القرص = 108 في التشغيل.
   - git: آخر حذف لملف وحدة كان في التزامات قديمة (064145a1 حذف comprehensive-council، a8580641 حذف review-action/telegram-broadcast — كلاهما قبل r92 بمراحل). آخر 5 التزامات تلمس tests/unit هي التزامات r92/r91 نفسها. `git status tests/` نظيف.
   - لا `retry`/`testTimeout`/`hookTimeout` في vitest.config (لا إخفاء).

### أصل التسريب
`DATABASE_URL=file:...` موجود في بيئة جلسة الشل الحالية (غير موجود في .bashrc/.profile/.bash_profile//etc/environment — أي أنه محقون من طبقة provisioning للبيئة نفسها). الملف `db/custom.db` مُتجاهَل في .gitignore (سطر `db/`) ولا وجود له في git.

### التوصية (للمنسق — بلا تعديل كود مني)
- أي إجراء خط أساس/تحقق للوحدة يجب أن يُنفَّذ بـ `env -u DATABASE_URL npx vitest run` (أو unset في الشل قبل التشغيل). رسالة الخطأ في env.ts نفسها توثّق هذا العلاج نصًّا.
- تصحيح سجل خط الأساس: ما دُوِّن «vitest 1642/1642 أخضر» في بداية r93 كان **تشغيلة حمراء بملفين فاشلين** — يجب ألا يُعتمد «سطر Tests فقط» كمؤشر خضرة؛ المؤشر الصحيح: exit code + سطر Test Files.
- رقيقة بيئية معاودة الظهور: أي وكيل قادم سيرى 1642 ويفهمها خطأ. يُقترح توثيق هذا البند في دفعة المنسق القادمة.

---

## 2) جرد صحة المنظومة

### الوحدة (vitest)
| المؤشر | القيمة |
|---|---|
| ملفات | 108 (كلها ضمن include) |
| اختبارات | **1666** (بالبيئة النظيفة) — منها 24 في الملفين المُسقَطَين بيئيًا |
| skipped / todo / skipIf | 0 / 0 / 0 |
| retries مخفية في config | لا يوجد |
| timeouts مرتفعة (≥10s) | لا يوجد |
| نومات ثابتة | 2 فقط وكلتاهما موثقة الدلالة: session.test.ts:121 (350ms — اختبار إعادة المحاولة 300ms)، lib.test.ts:108 (50ms) |

### e2e (ساكنًا — لم يُشغَّل التزامًا بالقيود)
- **35 ملف اختبار** (33 في tests/e2e بينها teams/team11-modifiers + 2 في tests/security) + ملفا مساعدات (qa-helpers.ts, csrf-helper.ts).
- **274 اختبارًا ساكنًا** (`test(`) و**46 describe**. توزيعها على مشاريع playwright: security ‏16 · api ‏106 · ui ‏25 · qa-teams ‏112 · auth-verify ‏9 · round79-c ‏6.
- **11 موقع skip شرطي** (لا skip جاف):
  - 4× HSTS (`test.skip(!process.env.VERCEL)`) في ui-smoke/ui-sweep/full-sweep/round80-security — تنطلي محليًا بالتصميم.
  - 3× webhook-security: `TELEGRAM_WEBHOOK_SECRET not resolved` — **ستنطلي محليًا فعلًا** لأن .env لا يعرّف TELEGRAM_WEBHOOK_SECRET (يعرّف TELEGRAM_BOT_TOKEN فقط) — أي أن 3 اختبارات أمنية محلية تتحول skip بصمت.
  - 2× «register rate-limited on this IP» (round86-security, rbac-negative) — شرطية 429.
  - 1× gallery fixture (round87-journeys) · 1× sinceId على الإنتاج (team10).
- ملاحظة منهجية: أرقام r92 للإغلاق («e2e الأساسية 214+6skip · الرحلات 139+2skip» = 353+8skip وقت-التشغيل) لا تُشتق مباشرة من العد الساكن (274) — الفرق = توسيعات حلقات/تكرارات وقت التشغيل + أساس تجميع مختلف. **لا يمكن إعادة إنتاج أرقام e2e ساكنًا** — تُحسم فقط بتشغيل لاحق بعد انتهاء البناء.

### مرايا الاختبار (ادعاء r92-C1/C2) — تحقق عشوائي: **التحويل حقيقي ✅**
| الملف | دليل الاستيراد من الإنتاج |
|---|---|
| regression.test.ts | `import { POST as webhookPost } from "@/app/api/telegram/webhook/route"` (س114) · `POST as restaurantsPost from "@/app/api/restaurants/route"` (س116) · `POST as validatePost from "@/app/api/subscriptions/validate/route"` (س117) · `getAdminTelegramIds from "@/lib/telegram-admin"` (س118) |
| regression-sweep.test.ts | webhook POST (س125) · `GET as userEventsGet from "@/app/api/user/events/route"` (س126) · restaurants POST (س127) · `approversGet/approversPost from "@/app/api/admin/telegram/approvers/route"` (س128) |
| restaurant-password.test.ts | `generateOwnerPassword from "@/app/(protected)/admin/restaurants/RestaurantFormDialog"` (س8) · `passwordOptional from "@/lib/validation"` (س9) · `PASSWORD_MIN_LENGTH from "@/lib/constants"` (س10) — التصدير المصرّح للاختبار فقط |
| core.test.ts | `requireAuth/requireAdmin/requirePermission from "@/lib/auth"` · `session from "@/lib/session"` · `resolveSubscriptionPayment from "@/lib/subscription-decisions"` · `csrfFetch from "@/lib/csrf-client"` (س64-71) |

لا نسخ محلية للمنطق (rg على تعريفات POST/GET محلية = صفر). الـvi.mock محصور في `@/lib/db` وطبقات البنية (نمط المشروع الموثق) — منطق المعالجات نفسه هو كود الإنتاج.
**تأكيد مستقل من التغطية** (أقوى من قراءة الاستيراد): webhook/route.ts ‏99.1% (106/107 سطرًا) · orders/route.ts ‏99.2% · restaurants/route.ts ‏97.2% · subscriptions/validate ‏95.8% · register ‏100% · referrals/claim ‏100%.

---

## 3) التغطية (تشغيل كامل ببيئة نظيفة: 1666/1666 + exit=0)

- **القياس الفعلي: 82.22 عبارة / 75.56 فرع / 76.7 دوال / 84.66 سطر** — مطابق حرفيًا لإعلان r92.
- **العتلة (thresholds) 80/74/75/83** في vitest.config.ts: سليمة، بهامش أمان ~2 نقطة تحت القياس، وقاعدة «ارفع ولا تُخفض» موثقة داخل الملف. لا يوجد تلاعب.
- **ملاحظة إيجابية**: العد الساكن لأسطر DA في lcov.info يطابق جدول text (تم تدقيق تحليل awk على ملفين).

### أدنى التغطيات في src/ (مستثنى generated أصلًا من include)

**16 ملفًا بتغطية 0% كاملة (أسطر)** — الأهم:
| الملف | أسطر غير مغطاة |
|---|---|
| src/app/api/telegram/config/route.ts | 34 |
| src/lib/chime.ts | 32 |
| src/app/api/telegram/diagnose/route.ts | 24 |
| src/app/api/admin/telegram/link/route.ts | 13 |
| src/app/api/config/route.ts | 12 |
| src/app/api/auth/me/route.ts + plans/route.ts | 11 + 11 |
| src/app/api/telegram/test + admin/events/trigger | 6 + 6 |
| src/app/api/auth/logout + src/lib/logout.ts | 7 + 8 |
| src/app/api/admin/telegram/approvers/[id] | 9 |
| src/lib/dietary.ts · public/stats · high-contrast.ts · brand.ts | 5 · 5 · 2 · 1 |

(تلطيف: بعض هذه المسارات — logout/me/plans — تُغطى فعليًا في e2e: api-smoke/team7/auth-fix-verification، فالصفر هنا صفر «تغطية وحدة» فقط.)

**تناقضات مع إعلان r92-C7 «~100%»** (أُعلنت 4 مسارات CRUD/RBAC):
- admin/admins/route.ts (الأساسي POST/GET): **35% أسطر (7/20)** — الرقم ~100% ينطبق فقط على admin/admins/[id]/route.ts (96.4%).
- categories/[id]/route.ts: **50% (20/40)** بينما categories/route.ts الأساسي 100% ✓.
- owner/restaurants/route.ts الأساسي: **73.3% (33/45)** بينما [id] ‏100% ✓.
- owner/reviews/route.ts: 100% ✓ · admin/create-owner: 100% ✓.
- الاستنتاج: ادعاء C7 مبالغ فيه في 3 من 7 مسارات (المسارات الفرعية [id] مغطاة ممتازًا؛ المسارات الأساسية ناقصة فعلًا).

---

## 4) مؤشرات التقادم — النتيجة: نظيفة عمومًا
- لا ملف وحدة واحد بلا `expect(` (فحص عدّي لكل 108 ملفات). أضعف ملف: env-scheme-guard.test.ts (3 اختبارات / 3 توكيدات — نسبة 1:1 سليمة).
- لا timeouts مرتفعة، لا retries خفية في vitest، لا .todo.
- في playwright: retries موثقة و controllable (r90-F2): CI=2، محلي=0، وPW_RETRIES يتحكم — النهج سليم وليس إخفاءً.
- نومات qa-helpers الـ20s موثقة كـ«backoff دلالي لنافذة rate-limit» (round87-D7) — ليست رقائق نوم مقنّعة.

## 5) e2e ساكن — playwright.config.ts
- **9 مشاريع، لا معطل منها**: security · api · ui · qa-teams (24 ملفًا مدرجة صراحة) · qa-cross-browser (firefox: ui-smoke+team2+persona-6) · qa-cross-browser-webkit (ui-smoke+persona-6) · auth-verify (BASE_URL محترم — إصلاح r87-D8) · round79-c (actionTimeout 15s مضاد للتعليق).
- **لا ملفات يتيمة**: الـ35 ملفًا على القرص = بالضبط مجموع قوائم testMatch (2+5+2+24+1+1). حتى teams/team11-modifiers مُدرجة صراحة (تعليق r89 يوثق أن glob لا يلتقط المجلد الجديد — نقطة انتباه لأي ملف e2e جديد مستقبلًا).
- **الشخصيات (personas)**: persona-1-customer · persona-3-owner · persona-4-multimenu · persona-6-browser · persona-7-malicious كلها موجودة و موصولة بـqa-teams. persona-2 وpersona-5 **لم توجدا في تاريخ git أبدًا** (فجوة ترقيم أصلية، لا حذف).
- **المساعدات سليمة**: qa-helpers.ts يصدّر 8 دوال (advanceStep بمنطق backoff موثق، fillSubscribeForm بمحددات placeholder لا موضعية، login/loginBudget...) وcsrf-helper.ts يصدّر mintCsrfPair + csrfHeadersFor — كلاهما مستورد فعليًا في المواصفات.
- ملاحظة إعداد: fullyParallel: true عامًا (رقاقة r92-3 أصلحَت team8 فقط داخل الملف بـserial — سابقة round79 موثقة في الالتزام).

---

## 6) الخلاصة والإجراءات التالية المقترحة (مرتبة بالأولوية)
1. **[حسم]** لغز 24 محلول: بيانات r92 صحيحة (1666 + 82.22/75.56/76.7/84.66)؛ الرقيقة في بيئة الشل المحقونة `DATABASE_URL=file:...` — كل تشغيل وحدة يجب أن يبدأ `env -u DATABASE_URL` (وثّقها المنسق في إجراءات الجولة).
2. **[تصحيح سجل]** بند خط الأساس في worklog (Task 0) يُصحَّح: كانت تشغيلة حمراء (2 failed files) لا «1642/1642 خضراء».
3. **[فجوة اختبارات]** 3 مسارات أساسية ناقصة رغم إعلان C7: admin/admins (35%) · categories/[id] (50%) · owner/restaurants الأساسي (73%) — مرشحة لموجة اختبار قصيرة.
4. **[فجوة اختبارات]** 16 ملفًا 0% (أبرزها telegram/config 34 سطرًا، chime 32، telegram/diagnose 24، telegram/link 13) — أولوية أقل؛ بعضها مغطى e2e.
5. **[أمن-اختبار]** 3 اختبارات webhook-security تنزلق لـskip محليًا بصمت (لا TELEGRAM_WEBHOOK_SECRET في .env) — يُقترح قيمة سر تطوير في .env أو تعليل count-الـskip في تقارير التشغيل.
6. **[منهجية]** توحيد أساس عدّ e2e (ساكن 274 مقابل runtime 353+8 معلنة) عند إغلاق الجولات لتفادي ألغاز مثل لغز هذه الجولة.
