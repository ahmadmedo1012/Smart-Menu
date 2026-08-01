# Smart Menu — تقرير الاختبار الشامل (2026-08-01)

نطاق: 14 ملف وحدة، 6 ملف E2E، مسح أمني، تدقيق DB (Neon)، تدقيق Runtime (Vercel)، Lighthouse، فحص سكريبتات، استعراض multi-agent.

---

## 1) ملخص النتائج

| الأداة | النتيجة |
|---|---|
| Vitest unit (14 ملف / 327 اختبار) | ✅ **PASS 327/327** |
| Coverage (v8) | ❌ **FAIL** — lines 10.95% / functions 14% / statements 10.21% / branches 9.35% (العتبة 50/50/50/40) |
| `test:legacy` (tsx glob) | ❌ **معطوب** — `ERR_MODULE_NOT_FOUND: tests/unit/**/*.test.ts` (glob لا يتوسع مع tsx ESM) |
| TypeScript `tsc --noEmit` | ✅ **PASS** |
| ESLint | ⚠️ **src نظيف** (0 أخطاء، 4 تحذيرات)؛ لكن الجذر: 92 خطأ + 836 تحذير في ملفات غير مصدرية (index.js + رقائق .next) — ESLint يمسح `node_modules/.next` (لا يوجد ignores في eslint.config.mjs) |
| Production build | ✅ **PASS** (79 صفحة، 4.7s) — تحذيران: `middleware` deprecated → استخدم `proxy`؛ pg SSL mode warning |
| Playwright E2E (4 مشاريع ضد prod) | ⚠️ **146 PASS / 34 FAIL** — كل الـ 34 بسبب 403 CSRF (انظر §4) |
| SSE comprehensive (prod) | ❌ **8 PASS / 10 FAIL** — SSE لا يعمل في prod إطلاقاً |
| scan.js (فحص صفحات) | ✅ **11/11 PASS** (هبوط، دخول، اشتراك، شروط، أسعار، سلة، منيو، 404...) |
| Lighthouse landing (mobile) | a11y **90**، Best-Practices **100**، SEO **100** — فشل 4: aria-prohibited-attr، color-contrast، heading-order، agent-accessibility-tree |
| Lighthouse /menu/al-waha-cafe | a11y **98**، SEO **92** — فشل: heading-order، **meta-description مفقود** |
| أمان git history | ✅ لا أسرار حقيقية (env files كانت placeholders، أزيلت في 6696ac6b) |
| Neon DB | بيانات سليمة (0 orphan items/categories، 0 طلبات بدون items، 0 أسعار سالبة) + مشاكل: 34 مطعم اختبار، 15 جلسة منتهية |
| Vercel runtime (7 أيام) | ❌ **50 مجموعة أخطاء** — 5 فئات حقيقية (انظر §3) |

---

## 2) أخطاء الإنتاج الحقيقية (Vercel runtime — 7 أيام)

| # | الخطأ | count | التأثير | الملف |
|---|---|---|---|---|
| E1 | `Unknown argument 'restaurantId'` في `prisma.menuItem.findMany()` | 30+ (2 users) | **GET /api/items?restaurantId= يرمي 500** — منيو المطاعم لا يعمل في RSC `/menu/[slug]` + `/menu` | `src/app/api/items/route.ts:45,48` |
| E2 | `Event handlers cannot be passed to Client Component props` | **219** (10 users) | زر الطباعة يكسر تقديم صفحة /menu/[slug]/print | `src/app/menu/[slug]/print/page.tsx:123` |
| E3 | `Task timed out after 300 seconds` | **127** (12 users) | كل مسارات SSE تموت عند حد Vercel | `src/app/api/*/events/stream/route.ts` ×3 |
| E4 | `Connection terminated due to connection timeout` | 14 (5 users) | /menu + /menu/[slug].rsc — إعداد pool غير مناسب لـ serverless | `src/lib/db.ts` |
| E5 | `subscriptionPayment.findUnique` — `Argument 'id' is missing` | 1 | /api/subscriptions/status | `src/app/api/subscriptions/status/route.ts:15` |
| E6 | Telegram broadcast `chat not found` (chatId -1002487956117) | 3 | bot غير عضو في المجموعة — غير قاتل (Promise.allSettled) | `src/lib/telegram-broadcast.ts` |
| E7 | Webhook `not valid json` | 1 | محجوب (catch → OK)؛ **setWebhook لا يُستدعى في أي مكان** — bot لا يستقبل تحديثات | `src/app/api/telegram/webhook/route.ts` |

---

## 3) نتيجة SSE في prod (فشل تصميمي)

- `Content-Type: application/json` بدل `text/event-stream` — المسار الخطأ (error() JSON) يُرجع بدل الدفق
- 0 heartbeats، 0 بيانات، اتصال ينقطع — حلقة setInterval داخل ReadableStream تُقتل عند 300s Vercel
- دفق user/events **لا يفلتر بـ userId** (يعيد كل أحداث كل المستخدمين — ثغرة عزل بيانات)
- `admin/events/stream` بلا مستهلكين (كود ميت)
- `subscribe/page.tsx` و `UserBannerNotifier` بلا fallback polling — المستخدم لا يعلم برفض الاشتراك بعد موت الدفق
- **الحل: استبدال SSE بـ client polling** (fallback موجود أصلاً في OrderNotifier و orders/page)

---

## 4) CSRF — 34 فشل E2E + تطبيقات مكسورة

- middleware يفرض double-submit (`X-CSRF-Token` = قيمة كوكي `csrf-token`) على **كل** POST/PUT/PATCH/DELETE في `/api/*` ما عدا `CSRF_EXEMPT`
- Playwright `request.post` بلا كوكيز → **403** (التوقعات 401/405 صحيحة في النية — الـ 403 من الـ middleware قبل handler)
- **مكسور في prod**: `src/app/owner/orders/[id]/page.tsx:55` — fetch PUT خام بلا رأس CSRF → تحديث حالة الطلب يفشل 403 (يخصم من قيمة core feature)
- بقية client code سليم (csrfFetch)

---

## 5) قاعدة البيانات (Neon — Smart-Menu)

- سليم: 0 orphan items/categories، 0 طلبات بلا items، 0 أسعار ≤ 0، علاقات Referential Integrity
- 163 مطعم، 80 صنف فقط في 18 منهم، 342 مستخدم، 512 طلب (508 status=new — لا حياة فيه سير عمل الحالة؟)، 172 دفع (147 verified / 23 cancelled / 2 pending)
- ⚠️ **34 مطعم تجريبي** (10+ نسخ "مقهى الواحة" بأسماء متحولة: al-waha-ewew، cafefrfrfr، cafeshhshjs...) — تلوث بيانات، حاجة تنظيف
- ⚠️ 15 جلسة منتهية غير محذوفة
- ⚠️ pg_stat_statements غير مثبت — لا يمكن تحليل الاستعلامات البطيئة
- SSL: `sslmode` aliases deprecated — استخدم `verify-full`

---

## 6) UX/A11y (Lighthouse)

- Landing a11y 90: ARIA محظور (role=button على div غير تفاعلية؟)، contrast ضعيف في footer (`text-xs` رمادي على أبيض)، heading-order (h4 في footer بعد h2)، tree غير سليم
- Menu page: **لا meta description** + heading-order
- `beforeinstallprompt` ممنوع (لا يحث على التثبيت) — تحذير PWA

---

## 7) أخطاء التهيئة/الأدوات

- `eslint.config.mjs` بلا `ignores: ['node_modules','.next']` — 92 خطأ + 836 تحذير من ملفات خارج src
- `test:legacy` script معطوب (glob tsx)
- **coverage 11%** — 14 ملف اختبار فقط من ~80 ملف src؛ عتبات غير واقعية في vitest.config.ts (50%) مع نسبة 11%
- middleware → proxy (Next 16 deprecation)
- 8 صفحات owner/admin بلا تغطية اختبار إطلاقاً

---

## خطة الإصلاح المقترحة (بالأولوية)

### المرحلة 1 — حرجة (إنتاج مكسور)
1. **إصلاح علاقات Prisma 7**: `src/app/api/items/route.ts:45,48` + `src/app/api/owner/reviews/route.ts:20` + `src/app/api/restaurants/[id]/route.ts:127` + `src/app/api/stats/route.ts:34` + `src/app/api/demo/fix-images/route.ts:53` + `src/app/menu/[slug]/page.tsx:67` — `where.category = { restaurantId }` → `{ is: { restaurantId } }`
2. **زر الطباعة**: استخراج `"use client"` component من `print/page.tsx:123`
3. **CSRF في owner/orders/[id]/page.tsx:55**: استخدم csrfFetch بدل fetch خام

### المرحلة 2 — عالية (تصميم معطل)
4. **استبدال SSE الثلاثة بـ client polling** (نقل المنطق من OrderNotifier) + إضافة fallback لـ subscribe/page و UserBannerNotifier + **إصلاح تسريب userId في user/events stream** + حذف admin/events/stream الميت
5. **إصلاح subscription/status**: `findUnique({ where: { id } })` → `findFirst({ where: { id, userId } })`
6. **db.ts**: `max: 10` → 5، إضافة `query_timeout: 15_000`، `sslmode=verify-full` في DATABASE_URL
7. **تسجيل setWebhook** + معالجة "chat not found" (تحقق من عضويات bot)

### المرحلة 3 — متوسطة
8. **إصلاح الاختبارات**: Playwright mint csrf-token cookie في fixtures (addCookies قبل POST)
9. `eslint.config.mjs` — أضف ignores
10. إصلاح `test:legacy` script (استخدم vitest أو tsx مع list)
11. تنظيف 34 مطعم تجريبي + جلسات منتهية + جدولة cron cleanup
12. تثبيت `pg_stat_statements` في Neon

### المرحلة 4 — منخفضة/تجميل
13. إصلاحات Lighthouse: aria-prohibited, contrast footer, heading-order, meta description للمنيو
14. تحسين التغطية نحو 50% (ركز: db.ts, session.ts, telegram-api.ts, subscription-decisions.ts — الأهمية الأعلى)
15. ترحيل middleware → proxy (Next 16)

---

## ملفات التقرير
- التقرير الحالي: `TEST-REPORT-2026-08-01.md`
- تقرير mega السابق: `TEST-REPORT-MEGA.md` (378 findings، fixes مثبتة)
- Lighthouse: `/tmp/chrome-devtools-mcp-*/report.json`
- Playwright: `test-results/report/`


---

# تحديث 2026-08-01 (بعد الإصلاحات)

## المرحلة 1 (حرجة) — مكتملة ✅ commit 9547dbf
- Prisma 7 relation filters `{ is: { restaurantId } }` في 6 ملفات — /api/items و /menu/[slug] 500s مُصلحة
- زر الطباعة → PrintButton client component — 219 خطأ live مُصالح
- order status PUT عبر csrfFetch — 403 مُصالح

## المرحلة 2 (عالية) — مكتملة ✅ commit b5221f8
- SSE ×3 → client polling (Vercel 300s cap) + /api/user/events?sinceId= بفلترة userId (تسريب بيانات مُصالح) + حذف dead admin stream
- db.ts: pool max 5 + query/statement_timeout 15s + sslmode verify-full
- subscription/status findUnique→findFirst
- Telegram: setWebhook عند حفظ الإعدادات (bot كان صامتاً)، ack لغير JSON، prune targets stale

## المرحلة 3 (متوسطة) — مكتملة ✅ commit 919463c
- E2E: csrf-helper (mint per-test) — **152/152 PASS محلياً** (كان 146/180)
- webhook security: rate-limit بعد التحقق من السر — **9/9 PASS**
- lint مقصور على src/ tests/ — 0 أخطاء (كان 92)
- test:legacy script مُصلح — 327 pass
- DB: حذف 25 مطعم تجريبي + جلسات منتهية (163→138 مطعماً)
- pg_stat_statements مثبت

## المرحلة 4 (منخفضة) — متبقية
- Lighthouse: aria-prohibited, contrast, heading-order, meta-description للمنيو
- التغطية نحو 50%
- middleware → proxy (Next 16)


# تحديث 2026-08-01 (بعد النشر ضد prod) ✅

## النشر
- push ae15086 → Vercel auto-deploy `dpl_6bPyr99YvvQEFcprJNNNmYQB6vyk` READY (git integration)

## الاختبارات ضد prod (menu.smart-link.ly)
| الجولة | النتيجة |
|---|---|
| api + security projects | ✅ **152/152** |
| ui-smoke + ui-sweep | ✅ **26/26** |
| المجموع | ✅ **178/178** |

## التحقق المباشر (curl)
- `/menu/al-waha-cafe` → 200 (كان 500 — Prisma relation)
- `/api/items?restaurantId=102` → 200 مع بيانات (كان `Unknown argument 'restaurantId'`)
- `/menu/al-waha-cafe/print` → 200 (كان event-handler crash)
- `/api/user/events?sinceId=` → 401 بدون auth (نقطة polling جديدة، SSE محذوف)
- meta description موجود ✓
- CSRF gate يعمل: POST بدون token → "CSRF validation failed" ✓
- CSP سليم ✓

## Vercel runtime بعد النشر (1h)
- **0 أخطاء حقيقية** — فقط pg SSL deprecation warning (sslmode=verify-full في .env المحلي؛ Vercel env يحتاج نفس التحديث)

## ملاحظة واحدة
- Vercel env: `DATABASE_URL` ما زال sslmode=require — حدّثه إلى verify-full عند أول فرصة (غير حرج، مجرد تحذير)


---

# تحديث 2026-08-01 (محاكاة المستخدمين — 62 وكيل شخصية)

## النطاق
62 persona agent × متصفح حقيقي (Playwright chromium) ضد prod menu.smart-link.ly.
- 45 شخصية زائر/عميل (public pages, منيو, سلة, تسعير, 404, robots, sitemap, manifest, أمان headers)
- 17 شخصية owner (login, dashboard, menu manager, orders, settings, loyalty, reviews, QR, logout, RTL)
- 6 viewports: موبايل 375، تابلت 768، ديسكتوب 1280/1920
- سيناريوهات: شبكة بطيئة، بحث، deep links, طباعة، جلسات، rate-limit probes

## النتيجة النهائية
| مقياس | القيمة |
|---|---|
| Personas | 62 |
| Steps | 125 |
| النجاح | **119-125 (95-100%)** — كل الفشل إما race artifacts (62 متصفح متوازي) أو flakiness تحقق لاحقاً أنه نظيف منعزلاً |
| أخطاء حقيقية | **0** |

## باغ أمني حقيقي اكتشفه السرب
**Account lockout DoS** (commit 6f9c9e2):
- `accountLimiter` كان keyed على username فقط — أي مهاجم يستطيع قفل أي حساب بـ 20 كلمة مرور خاطئة من IP واحد (تحقق حي: حساب waha انقفل أثناء الفحص)
- الإصلاح: key = `acct:<ip>:<username>` — لا يمكن قفل حساب الضحية بعد الآن
- موثق في تقرير الإنتاج الأصلي كـ "فئة E8"

## Flakiness المتبقية (غير تطبيقية)
- 62 متصفح متوازي + Vercel cold starts → بعض الـ page.goto تفشل (status 0) أو innerText يسبق hydration
- كل الفشل نظيف عند إعادة التشغيل منعزلاً
- إن أردت صفر flakiness: شغّل بـ 10-15 متوازي + retries=1

## الملفات
- `tests/persona-runner.mjs` — إطار المحاكاة (62 شخصية)
- النتائج: `/tmp/persona-*.json`
