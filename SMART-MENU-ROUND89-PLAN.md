# خطة Smart-Menu — الجولة 89 «الأعمق والأقوى — إغلاق ديون التشخيص الخمسة»
## من إغلاق 88 المتين إلى: تحصين مسار المال + أمان مغلق + أداء مقيس + ميزة المعدِّلات مكتملة + اختبارات المال + تفكيك الوحوش

> **التاريخ:** 2026-09-06 · **القاعدة:** `9798204a` (إغلاق الجولة 88 — منشور وREADY) · **الإنتاج يخدم كود 88 — مؤكد**
> **الحجم:** 6 موجات · **~65 مهمة** (88 كانت 50) · **8 وكلاء تنفيذ + منسق** (إضافة إلى 5 وكلاء تشخيص) — أكبر جولة تاريخيًا
> **المنهجية:** تشخيص عميق أولًا (5 وكلاء Explore — تقارير dx-1..dx-5 في worklog) → موجات تنفيذ بنطاقات ملفات منفصلة تمامًا → بوابات بين الموجات → commits مرحلية موقّعة → إغلاق تحقق إنتاجي حي (نمط 86/87/88)

---

## 0. السياق وقرارات المنسق (من تقارير التشخيص الخمسة)

**خط الأساس (المرحلة 0 — منجزة):** استنساخ · PostgreSQL 17.11 محمول على :5434 (بدون root — حزم deb مستخرجة إلى /home/z/pgroot، سكربت pg-boot.mjs) · 18/18 هجرة · بذور ci+round83 · tsc 0 · eslint 0 · vitest **778/778** · build ناجح · الإنتاج health 200 (db 20ms) على dpl_9K1ef2yR.

**قرارات المنسق المؤسِّسة (مبنية على الأدلة، لا الظن):**

1. **D-89/قرار-1 — ترقية motion 13 تُسقَط كهدف:** وكيل dx-3 فكّك حزم 13.2.0 فعليًا: البرميل `motion/react.mjs` متطابق حرفيًا مع 12.43 — «البرميل المُصلَح» المؤجل من 88 **غير موجود في 13.x**. الترقية تعطي ~صفر ربح. البديل الحقيقي المكتشف: **chunk polyfills بـ38.6KB gz** (core-js) هو مرشح التقليص الوحيد المعقول → موجة C تفحصه.
2. **D-89/قرار-2 — ميزة المعدِّلات (Modifiers) تُكمَّل:** التشخيص أثبت أنها نصف موصولة (مخطط + API يسعّر ويمتلك `modifierOptionIds` + منطق خالص مختبر في menu-types.ts) لكن صفر UI ومحرر واستعلام منيو. إكمالها = أعلى قيمة منتج في الجولة. `menu-types.ts` يُنقل من قائمة الكود الميت إلى نطاق وكيل الميزة.
3. **D-89/قرار-3 — فهرسة مسار المال فورية:** `RewardTransaction.orderId` و`Referral.orderId` بلا فهارس — بوابات منع تكرار منح النقاط/المكافآت تعمل SeqScan مع كل طلب (EXPLAIN مؤكد محليًا). هجرة 19 في الموجة 1.
4. **D-89/قرار-4 — حادثة الأمان الحرجة:** سلسلة اتصال Neon ملتزمة في تاريخ git (~80 commit عبر .env.local) — **تدوير كلمة مرور Neon فعل مالك إلزامي في الإغلاق** (البند المؤجل من 88 صار حرجة). تنظيف التاريخ اختياري بعدها.
5. **D-89/قرار-5 — رافعة ratchet التغطية:** الواقع 43.66% والعتبات 28/29 متقادمة — تُرفع لتثبيت مكاسب 88 و89.

---

## 1. القواعد الإلزامية (كل وكيل — بلا استثناء)

1. **الوكلاء لا يرتكِمون** — المنسق وحده يرتكِم بالتوقيع الإلزامي `ahmadmedo1012 <220099349+ahmadmedo1012@users.noreply.github.com>` بعد بوابات كل موجة.
2. **اقرأ `/home/z/my-project/worklog.md` أولًا** (تقارير dx-1..dx-5 مرجعك الأول — فيها ملف:سطر لكل مشكلة) وألحق سجلك بنهايته بقالب Task ID / Agent / Task / Work Log / Stage Summary.
3. **متغيرات البيئة الإلزامية لكل أمر:**
   - Prisma/vitest/build: `export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/smartmenu" SKIP_ENV_CHECK=true`
   - **ممنوع** تصدير `RATE_LIMIT_RELAX` عند vitest (يفشل 4 اختبارات rate-limit وحدية — max×200). مخصص لـ e2e فقط.
   - إن سقط الخادم: `node /home/z/my-project/scripts/pg-boot.mjs`
4. **بوابات قبل تسليم كل موجة:** tsc 0 · eslint 0 · vitest ≥ 778/778 (لا اختبار يُكسر — يُصلَح أو يُحدَّث بتوثيق) · build ناجح.
5. **نطاق ملفات صارم** لكل وكيل (أدناه) — لا تعديل خارجه مهما بدا أفضل.
6. **لا اعتماديات جديدة** (package.json/lockfile) — أدوات التحليل عبر npx -y فقط إن لزم.
7. **لا أسرار في أي ملف يُرتكَم.**
8. **دقة Next.js 16:** هذا ليس Next.js الذي تعرفه — `node_modules/next/dist/docs/` قبل أي نمط غير مؤكد. RTL أول، خصائص منطقية (ms-/me-)، shadcn/ui base-nova، اقرأ CLAUDE.md وPROJECT.md للمشروع.
9. **جراحة دقيقة:** لا إعادة تنسيق شاملة، لا حذف اختبارات، كل تغيير سلوكي يقابله اختبار/تحقق موثّق.
10. **هجرات prisma:** الموجة 1 فقط (الوكيل A) يملك `prisma/migrations/` — الباقي يقرأ المخطط ولا يهاجر.

---

## 2. الموجات والمهام (~65 مهمة)

### الموجة 1 (متوازية) — الوكيل A «تحصين مسار المال» + الوكيل D1 «اختبارات مسار المال»

**الوكيل A — نطاق: `prisma/schema.prisma`, `prisma/migrations/**` (هجرة 19), `src/app/api/orders/route.ts` (سقف items فقط), `src/app/api/demo/fix-images/route.ts`, `src/app/api/seed/route.ts`, `src/lib/env.ts`, `eslint.config.mjs`, `src/app/admin/restaurants/page.tsx` (سطر 73 فقط) · 9 مهام**

| # | المهمة |
|---|---|
| A-1 | هجرة 19: `RewardTransaction @@index([orderId])` + `Referral @@index([orderId])` عبر `npx prisma migrate dev --name add_round89_money_path_indexes` (بDATABASE_URL الصحيح) — برهان EXPLAIN قبل/بعد على الاستعلامين (`findFirst orderId, type:'earn'` و `findFirst orderId, status:'converted'`) بجدول مبذور |
| A-2 | `orders/route.ts:31`: `items: z.array(...)` → إضافة `.max(50)` + سقف أصغر لحقل image (dx-2: يقبل حتى 7M حرفاً) — مع اختبار/تحقق موثق للرفض |
| A-3 | `demo/fix-images/route.ts:57`: تصحيح مغلف الخطأ (مفتاح error بدل message + HTTP صحيح للفشل بدل 200) |
| A-4 | `seed/route.ts:37`: إزالة تسريب `e.message` الخام → مغلف handleError العام + توحيد شكل success |
| A-5 | `src/lib/env.ts:13`: أرضية AUTH_SECRET من min(1) → min(32) وJWT_SECRET من min(16) → min(64) — تحقق أن البيئة المحلية والإنتاج (قيم الطول الكافي) يمران |
| A-6 | `eslint.config.mjs:26`: قلب `no-explicit-any` من off → warn كحارس انحدار |
| A-7 | `admin/restaurants/page.tsx:73`: آخر `catch (e: any)` → getErrorMessage (مستورد أصلاً في الملف) — صفر any نوعي متبقٍ |
| A-8 | البوابات: tsc 0 · eslint 0 · vitest 778/778 · build |
| A-9 | سجل worklog كامل ببراهين EXPLAIN والقياسات |

**الوكيل D1 — نطاق: `tests/unit/**` (ملفات جديدة فقط) · 8 مهام**

| # | المهمة |
|---|---|
| D1-1 | دراسة النمط الجاهز: `tests/unit/orders-create.test.ts` (نمط tx-mock + إبطال limiter) — ثم استنساخه |
| D1-2 | وحدة `subscriptions/upgrade` (225 سطراً 0%): تجاوز سقف البنك 99 + إشعار الموافقين + 429 + فشل جزئي — نموذج mock prisma+limiter+telegram-api |
| D1-3 | وحدة `subscriptions` POST + `validate` + `status` (مسار المال: إنشاء/التحقق/الحالة) |
| D1-4 | وحدة `loyalty/referral` + `loyalty/stats` (277 سطراً 0%) |
| D1-5 | وحدة `cron/subscription-expiry` (خفض مالي مجدول — mock CRON_SECRET + مسار الخطأ) |
| D1-6 | وحدة lib: `telegram-api` (AbortController/timeout/تحليل الاستجابة — mock fetch + fake timers) + `telegram-broadcast` (تقسيم/allSettled/جمع إخفاقات) |
| D1-7 | وحدة lib نقية: `plan-types` + `payment-constants` (قرارات مال — رخيصة وسريعة) |
| D1-8 | البوابات + سجل worklog بعدد الاختبارات الجديدة (الهدف ≥ +60) |

### الموجة 2 (متوازية) — الوكيل B «الأمان المغلق» + الوكيل E «جودة الكود»

**الوكيل B — نطاق: `src/proxy.ts`, `src/lib/session.ts`, `src/lib/csrf.ts`, `src/lib/secure-compare.ts` (قراءة), `src/app/api/user/events/route.ts`, `src/app/api/orders/count/route.ts`, `src/app/api/stats/route.ts`, `src/app/api/stats/advanced/route.ts`, `src/app/api/admin/telegram/verify/route.ts`, `tests/unit/**` (جديد لسلوكه), `next.config.ts` (ترويسات فقط) · 10 مهام**

| # | المهمة |
|---|---|
| B-1 | إصلاح matcher الـproxy المعطل (dx-4 #4): أنماط الامتدادات لا تستثني شيئًا — استبدال بأنماط تعمل فعلاً (`.*\\.(png|woff2?|mp4|webp|svg|ico|txt|xml|webmanifest)$` صيغة صحيحة أو بادئات صريحة) + برهان: curl محلي لأصل ثابت بلا set-cookie و bلا nonce |
| B-2 | CSP: إضافة `frame-ancestors 'none'` لطبقات CSP الثلاث + COOP (`same-origin`) وCORP — عبر proxy/next.config حسب النمط القائم |
| B-3 | سقف عمر جلسة مطلق: 7 أيام من createdAt داخل `validateSession` (dx-4 #3) — مع اختبار وحدة: توكن أقدم من 7 أيام يُرفض حتى لو السلسلة منزلقة |
| B-4 | حاصرات خفيفة لنقاط الاستطلاع بلا حد: `user/events`, `orders/count`, `stats`, `stats/advanced` (120/min لكل مستخدم — نمط المشروع createDbRateLimiter) |
| B-5 | مقارنة CSRF زمنيًا ثابتة: إعادة استخدام `timingSafeEqualStrings` من secure-compare.ts في csrf.ts:87 |
| B-6 | `admin/telegram/verify`: anti-replay بنمط rateLimitEntry spend-mark من الويبهوك (توكن الربط 5-min يصبح للاستخدام الواحد) |
| B-7 | اختبارات وحدة لكل بند أعلاه (matcher يُختبر منطقيًا بالأنماط، السقف المطلق، الحاصرات) |
| B-8 | تحقق ترويسات محلي: dev server + curl لصفحة عامة وAPI وأصل ثابت — جدول قبل/بعد في worklog |
| B-9 | البوابات (vitest ≥ العدد بعد D1) |
| B-10 | سجل worklog |

**الوكيل E — نطاق: `src/lib/plan-limit-error.ts` (جديد), `src/app/api/orders/route.ts` (PlanLimitError فقط), `src/app/api/items/route.ts`, `src/app/api/owner/restaurants/route.ts`, مسارات `[id]` لتعريب الرسائل فقط, `src/lib/csrf-client.ts` (قراءة), ملفات العميل المعنية بcsrfJson (قائمة dx-1), `src/types/**` أو مكان النمط القائم للـRestaurant المشترك, 4 نصوص UI إنجليزية · 10 مهام**

| # | المهمة |
|---|---|
| E-1 | استخراج `PlanLimitError` موحد من الثلاث المتطابقة (OrderLimitError/ItemLimitError/MenuLimitError) مع اسم الخطة/الحد بخصائص موحدة — تحديث المستهلكين الثلاثة |
| E-2 | تعريب ~30 رسالة خطأ خادم ('Invalid ID' ×16 + عائلة loyalty الإنجليزية كاملة) — رسائل عربية موجزة متسقة مع نبرة المشروع |
| E-3 | تصحيح دلالة 401/403: `restaurants/route.ts:66,141` (غير مصادق → 401) و`users/route.ts:9` (مصادق غير أدمن → 403) — تحديث الاختبارات/e2e المتأثرة بتوثيق |
| E-4 | واجهة `Restaurant` مشتركة واحدة ×6 مواضع (admin/qr, admin/settings, admin/restaurants/page, RestaurantFormDialog, RestaurantTable) — ملف types واحد |
| E-5 | تبني `csrfJson` في ~4 مواضع إضافية عالية القيمة من قائمة dx-1 (بدون مساس بنطاق وكلاء آخرين) — أولًا `useOrderDetail.ts:110-122` |
| E-6 | تعريب 4 نصوص UI الإنجليزية (alt "Referral QR"، placeholder "Hot Drinks"/"Cappuccino"، aria-label "Area chart") |
| E-7 | توحيد رمز التحقق 400/422 حيث التناقض موثق (login/register مقابل validationError) — قرار موثق في worklog |
| E-8 | اختبارات/تحديثات موثقة لكل تغيير سلوكي (رسائل + رموز) |
| E-9 | البوابات |
| E-10 | سجل worklog |

### الموجة 3 (متوازية) — الوكيل C «الأداء والتنظيف» + الوكيل F1 «ميزة المعدِّلات»

**الوكيل C — نطاق: `src/app/api/admin/stats/route.ts`, `src/app/api/subscriptions/route.ts` + `upgrade/route.ts` (الإرسالات المتوازية فقط), `src/app/api/restaurants/[id]/route.ts` + `src/app/api/owner/restaurants/route.ts` + `src/app/api/owner/settings/route.ts` (list-counts فقط), `src/app/sitemap.ts` إن وجد, حذف ملفات الكود الميت المدرجة (بدون menu-types.ts!), `scripts/**` (أدوات قياس), `browserslist`/next.config (polyfill target) · 10 مهام**

| # | المهمة |
|---|---|
| C-1 | كاش `/api/admin/stats` 60 ثانية (unstable_cache + tag `admin-stats` + إبطال عند أحداث جوهرية إن لزم بنمط المشروع) — قياس قبل/بعد موثق (زمن المسار + عدد استعلامات DB عبر log) |
| C-2 | توازي إرسالات تيليجرام في `subscriptions` POST + `upgrade` (نمط chunks+allSettled من telegram-broadcast.ts:75-86) — قياس أثر RTT قبل/بعد بمحاكاة |
| C-3 | إزالة بقايا `_count` المجمّع: `restaurants/[id]:118-121`, `owner/restaurants:42`, `settings:74` + sitemap → استخدام list-counts.ts الجاهز — برهان استعلام قبل/بعد |
| C-4 | `admin/stats` plans→restaurants: groupBy count بدل embed كامل (dx-2 #6) |
| C-5 | حذف الكود الميت المؤكد (1,016 سطرًا — قائمة dx-1 الكاملة): circular-testimonials.tsx, design-tokens.ts, StickyCartBar.tsx, menu-types.ts **مستثنى (ملك F1)**, PlanComparisonTable, SuccessPanel, ErrorBoundary, animated-icon, FormAlert, PhoneVideo, GlowPool + تصدير `fetchPublicStats` الميت من landing.ts — لكل حذف برهان صفر استيراد |
| C-6 | تنظيف `revalidateTag("system-config")` الميت (لا منتج/مستهلك) — إزالة أو توصيل قارئ مخزن (قرار موثق) |
| C-7 | فحص chunk polyfills (38.6KB gz): تحليل مصدر core-js (browserslist/ترانسبيل) — إن أمكن تقليصه بأمان بتوتير استهداف حديث (توثيق القياس، بلا كسر) |
| C-8 | `node scripts/bundle-report.mjs` قبل/بعد الموجة — جدول في worklog |
| C-9 | البوابات |
| C-10 | سجل worklog |

**الوكيل F1 — نطاق: `src/lib/menu-types.ts` (يملكه), `src/lib/menu-queries.ts`, `src/app/api/menu/**` أو مصدر بيانات المنيو العام, `src/components/**/ItemDialog.tsx` (محرر المالك), `src/components/**/MenuItemCard.tsx` + `OrderDialog.tsx` (UI الزبون), `tests/**` (جديد للميزة) · 12 مهمة**

| # | المهمة |
|---|---|
| F1-1 | دراسة العمق: schema (modifierGroup/Option 211,236) + `orders/route.ts:165-188` (التسعير والملكية) + menu-types.ts (المنطق المختبر) + menu-modifiers.test.ts — خطة تنفيذ داخلية موثقة أولًا |
| F1-2 | استعلام المنيو العام: إرجاع modifierGroups مع الأصناف (شكل استجابة موثق — مدمج بنمط menu-queries القائم بلا كسر) |
| F1-3 | محرر المالك في ItemDialog: إدارة مجموعات المعدِّلات (إضافة مجموعة/خيارات/أسعار تعديل ±) — بنمط shadcn القائم + RTL + a11y |
| F1-4 | UI الزبون في MenuItemCard/OrderDialog: اختيار المعدلات عند الطلب + إظهار السعر المحسوب حيًّا + إرسال `modifierOptionIds` |
| F1-5 | التسعير من الخادم يبقى المصدر الوحيد للثقة (البند مقيم أصلًا في API — تحقق أن UI لا يثق بأرقام العميل) |
| F1-6 | الحالات الطرفية: مجموعة بلا خيارات، خيار بلا سعر، تجاوز حد الاختيارات (min/max للمجموعة إن وُجد بالمخطط) |
| F1-7 | اختبارات وحدة للتسعير النهائي مع المعدِّلات (إن لم تكن مغطاة) + للتحقق الملكية |
| F1-8 | e2e فريق جديد `team11-modifiers`: مالك يضيف مجموعة → زبون يختار معدلًا → الطلب يحمل السعر المعدّل — (يُكتب ويسجل؛ تعطيله الموثق مسموح إن اعتمد بيانات غير موجودة) |
| F1-9 | اجتياز a11y: أزرار المعدلات موصوفة aria، لوحة مفاتيل تعمل، تباين كافٍ |
| F1-10 | مراجعة UI/UX ذاتية (قاعدة CLAUDE.md 5/6): RTL بلا انحراف، استجابة جوال/مكتب، micro-interactions بLazyMotion/m.* الحالية |
| F1-11 | البوابات |
| F1-12 | سجل worklog |

### الموجة 4 — الوكيل D2 «اتساع الاختبارات وCI»

**نطاق: `tests/unit/**` (جديد), `tests/e2e/**` (تحسينات محدودة), `.github/workflows/ci.yml`, `vitest.config.ts` (عتبات فقط), `tests/README.md` · 8 مهام**

| # | المهمة |
|---|---|
| D2-1 | رفع ratchet: من 28/25/33/29 إلى القياس الجديد بعد موجات 1-3 (الأرض: 40/38/42/43 — القياس الفعلي بعد الموجات هو الحكم، يُرفع فقط) |
| D2-2 | إصلاح `auth-fix-verification.spec.ts`: إزالة override الـbaseURL localhost:3000 (dx-5 #7 — يفعّل إصلاح round87-D8) |
| D2-3 | وحدة admin paths: `admin/stats` (بعد كاش C-1 — سلوك الكاش موثق)، `admin/config`, `admin/profile`, `admin/notification-preferences` (RBAC+tenant) |
| D2-4 | وحدة lib: `premium-toast.tsx` (33 مستوردًا!) + `image-compress` + `menu-queries` (بعد F1-2) |
| D2-5 | CI: رفع أثر coverage (lcov+html) artifact + إضافة team9 إلى prod-qa (ميزانيات IS_REMOTE جاهزة) |
| D2-6 | CI: توثيق استثناء workers=2، جدولة nightly اختيارية بretries=0 لكشف flake (إن أمكن بلا مخاطرة) |
| D2-7 | البوابات (الاختبارات الجديدة كلها خضراء) |
| D2-8 | سجل worklog |

### الموجة 5 — الوكيل G «تفكيك الوحوش» (جراحة استخراج)

**نطاق: `src/app/(owner)/menu/**` أو `owner/menu/page.tsx`, `src/app/(owner)/orders/**` أو `owner/orders/page.tsx`, `src/app/cart/page.tsx` + ملفات استخراج جديدة ضمن مجلداتها · 7 مهام**

| # | المهمة |
|---|---|
| G-1 | cart/page.tsx (755): استخراج hooks (useCart totals/actions) + مكونات فرعية (CartLine, CartSummary, CheckoutSection) — سلوك مطابق حرفيًا، صفر إعادة تنسيق |
| G-2 | owner/orders (659): استخراج OrdersTable + مرشحات + probe-then-refetch hook (المشترك مع admin/orders — استخراج مشترك إن سمح النطاق) |
| G-3 | owner/menu (636): استخراج أقسام الأصناف/الفئوات + ItemDialog connections من F1 |
| G-4 | كل استخراج: tsc + vitest + e2e الفرق المتأثرة (team2/3) خضراء |
| G-5 | تحسين قابلية القراءة فقط ضمن المستخرَج — لا تغيير سلوكي |
| G-6 | البوابات |
| G-7 | سجل worklog |

### الموجة 6 — المنسق: الإغلاق والنشر

| # | المهمة |
|---|---|
| H-1 | البوابات الكاملة: tsc · eslint · vitest (≥778+الجديدة كلها) · build · check-secrets · migrate diff (متطابق) · e2e محلية كاملة متسلسلة (security+api → ui+auth-verify → qa-teams → round79-c → رحلات 87/88) |
| H-2 | commits مرحلية موقّعة (رسائل عربية بنمط الجولات لكل موجة: fix+security / security+quality / perf+feat / test+ci / refactor+quality / docs+test إغلاق) |
| H-3 | `git push origin main` + مراقبة نشر Vercel عبر API حتى READY فعليًا + migrate deploy عبر قناة البناء |
| H-4 | التحقق الإنتاجي الحي: 41+15+15 فحوص الجولات السابقة + فحوص 89 الجديدة (سكربت round89-prod-verify): matcher مُصلَح (صفر set-cookie على أصول ثابتة) · ترويسات B الجديدة · إحصاءات الأدمن بكاش · المعدِّلات حية · سقف جلسة مطلق · رافعات ratchet |
| H-5 | تقرير إغلاق الجولة 89 (كل بند → دليل → PASS/FAIL) + تحديث worklog |
| H-6 | تذكير الأمان الختامي: **تدوير كلمة مرور Neon فورًا** (حرجة — dx-4 #1) + توكنات الجلسة + TELEGRAM_BOT_TOKEN/CRON_SECRET (أفعال مالك) |

---

## 3. معايير قبول الجولة 89

1. كل بوابات H-1 خضراء بلا تساهل — لا retries تخفي.
2. دفع + نشر READY + تحقق إنتاجي كله بدليل حي (فحوص الجولات 86/87/88 + فحوص 89 الجديدة).
3. ميزة المعدِّلات مكتملة: محرر مالك + UI زبون + استعلام منيو + e2e — أو إرجاؤها الموثق بقرار.
4. مسار المال محصّن: هجرة الفهارس ببرهان EXPLAIN + سقف items + ≥60 اختبار وحدة جديد للمسارات المالية 0%.
5. الأمان المغلق: matcher مُصلَح بترويسات نظيفة على الأصول + سقف جلسة + حاصرات استطلاع + timing-safe.
6. قياسات فعلية موثقة (admin/stats كاش · bundle قبل/بعد · EXPLAIN) — لا ادعاءات بلا أرقام.
7. لا انحدار: اختبارات 88 كلها تبقى خضراء (تُحدَّث بتوثيق سبب مشروع فقط).
8. رافعة ratchet مرتفعة عن الواقع الجديد — لا عودة للخلف.
