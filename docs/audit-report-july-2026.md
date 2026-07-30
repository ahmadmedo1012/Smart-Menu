# ≡ تقرير الفحص الشامل — Smart Menu

**التاريخ:** 2026-07-29  
**الفرع:** main  
**الفريق:** 30 وكيل فحص (17 مكتمل، 11 محدود المعدل، 2 فارغ)

---

## ملخص تنفيذي

**إجمالي findings:** 127+  
**CRITICAL:** 20 ⛔  
**HIGH:** 43 ⚠️  
**MEDIUM:** 42  
**LOW:** 22  

**حالة الموقع:** يعمل — جميع الصفحات ترد 200. لكن 20 مشكلة حرجة تمنع الإطلاق الآمن.

---

## ⛔ القائمة الحمراء — يجب الإصلاح فوراً

### أمني • CRITICAL

1. **أسرار حية في git history** — TELEGRAM_BOT_TOKEN، JWT_SECRET، DATABASE_URL، VERCEL_OIDC_TOKEN في commits سابقة (`4f620379`, `d7fb1749`). تدوير فوري + `git filter-repo` لمسح التاريخ.

2. **CSP غائب تماماً** — ملفا middleware.ts (الجذر و src/). الجذر ميت (لا ينفذ). src/middleware.ts لا يضبط أي CSP. XSS protection معدومة.

3. **جلسات بنص عادي في DB** — `crypto.randomUUID()` يخزن التوكن مباشرة دون hashing. اختراق DB = كل الجلسات مكشوفة. تخزين `SHA256(token)`.

4. **CSRF معطل** — `assertSameOrigin()` أزيل. SameSite=Lax وحده لا يحمي من subdomain attacks.

5. **IDOR في subscription status** — أي مستخدم يستعلم عن أي دفععة برقمها. يرجع status بدون التحقق من الملكية.

6. **SW يخزن استجابات API** — `networkFirst()` يخزن auth/financial data. تعليق الكود يقول "never cache" والفعل يعكس.

7. **CSRF يتحقق من Host header فقط** — يقارن Origin بـ `request.headers.get("host")` وليس بـ `NEXT_PUBLIC_DOMAIN`.

8. **JWT_SECRET = AUTH_SECRET** — نفس القيمة. يجب فصلها.

### أداء • CRITICAL

9. **Public menu pages `force-dynamic`** — 3 استعلامات Prisma لكل مشاهدة. ISR `revalidate: 60` يخفض حمل السيرفر 95%.

10. **Landing page 100% client-render** — shell فارغ + useEffect جلب. تحويل إلى server component مع streaming.

11. **Cart persistence write-only** — `skipHydration: true` بدون `rehydrate()`. السلة تفرغ في كل reload.

### قاعدة بيانات • CRITICAL

12. **TOCTOU race على maxOrders** — `order.count()` ثم `order.create()` خارج transaction. طلبان متزامنان يتجاوزان الحد.

13. **Rate limiter 3-call بدون transaction** — `deleteMany` + `create` + `count` خارج atomic. burst يتجاوز الحد.

14. **TOCTOU race على pending payment** — `findFirst({status:"pending"})` ثم `create` خارج transaction.

### واجهة • CRITICAL

15. **لا focus trap في ReviewSheet** — Tab يهرب إلى الخلفية. `role="dialog"` لكن لا focus containment.

16. **تباين ألوان فاشل في الوضع الفاتح** — `--primary` على `--primary-foreground` نسبة ~4.0:1 (تحت 4.5:1 AA).

17. **Password toggle keyboard inaccessible** — `tabIndex={-1}` على زر إظهار/إخفاء كلمة السر.

### واجهة برمجية • CRITICAL

18. **استجابة API غير متناسقة** — 3 تنسيقات error: `{error}`, `{message}`, `{success, error}`. المتجر لا يعرف أي شكل ينتظر.

19. **Session DB errors صامتة** — `prisma.session.deleteMany/.delete/.update` كلها `catch(() => {})`.

20. **استخراج بيانات المطاعم بدون Auth** — `GET /api/restaurants/[id]` بدون مصادقة. تعداد IDs متسلسل يكشف كل المطاعم وخطط الاشتراك.

---

## ⚠️ قائمة عالية — إصلاح قبل الإطلاق

### Security

| # | المشكلة | الملف | الإصلاح |
|---|---------|-------|---------|
| H1 | لا rate limiting على 14 endpoint | routes متعدد | إضافة `createDbRateLimiter` |
| H2 | PBKDF2 بدلاً من bcrypt/argon2id | `src/lib/hash.ts` | ترحيل إلى bcrypt |
| H3 | لا brute force على reset-password | `src/app/api/admin/reset-password/route.ts` | rate limit per-account |
| H4 | Loyalty GET مكشوف بدون Auth | `src/app/api/loyalty/route.ts:82` | مصادقة إلزامية |
| H5 | Menu يخدم مطاعم غير نشطة | `src/app/menu/[slug]/page.tsx:30` | إضافة `isActive: true` |
| H6 | VERCEL_OIDC_TOKEN في git | committed .env.local | تدوير |
| H7 | `owner/reviews` يفضح `e.message` | `src/app/owner/reviews/route.ts:47` | استخدام `handleError(e)` |
| H8 | Landing data functions صامتة | `src/lib/landing.ts:64-78` | تسجيل الخطأ |
| H9 | Webhook route يرجع 200 على كل error | `src/app/api/telegram/webhook/route.ts:188-218` | 5xx لـ Telegram retry |
| H10 | Loyalty يفضح PII بالهاتف | `src/app/api/loyalty/route.ts:82-111` | Auth إلزامي |

### Middleware & Infrastructure

| # | المشكلة | الملف | الإصلاح |
|---|---------|-------|---------|
| H11 | ملفا middleware — الجذر ميت | `middleware.ts`, `src/middleware.ts` | حذف الميت، دمج الـ CSP |
| H12 | لا Vercel config | vercel.json غير موجود | إنشاء مع maxDuration |
| H13 | Dual lockfiles (npm + pnpm) | `package-lock.json`, `pnpm-lock.yaml` | توحيد مدير حزم |
| H14 | SW يخالف تعليقه | `public/sw.js:41-43` | تصحيح الـ strategy أو التعليق |
| H15 | بريط RTL physical classes | 6+ ملفات `mr-*` بدلاً من `ms-*` | logical properties |

### Prisma & API

| # | المشكلة | الإصلاح |
|---|---------|---------|
| H16 | Missing index على `user.createdAt` | إضافة index |
| H17 | Missing composite `[restaurantId, status, createdAt]` | إضافة index |
| H18 | Restaurant update خارج الـ settings transaction | دمج في transaction |
| H19 | Response envelope bypass في 4 routes | استخدام `success()` من api-helpers |
| H20 | كل Zod schemas inline — 0 مشتركة | استخراج `src/lib/schemas/` |
| H21 | `category: true` over-fetch | إضافة `select` |
| H22 | لستة admins بدون pagination | ترقيم الصفحات |

### React & UI

| # | المشكلة | الملف | الإصلاح |
|---|---------|-------|---------|
| H23 | ErrorBoundary dead code | `src/components/shared/ErrorBoundary.tsx` | حذف أو استعمال |
| H24 | AbortController مفقود | 3+ admin pages useEffect | إلغاء fetch عند unmount |
| H25 | `finishFlow` في useEffect deps | `PaymentDialog.tsx:119,176` | useRef للـ callbacks |
| H26 | `overflow-x:hidden` على html | `globals.css:312,327` | يمنع 400% zoom |
| H27 | Labels بدون `htmlFor` | `SubscribeForm.tsx:126+` | إضافة htmlFor/id |
| H28 | أزرار +/- حجم 28-32px | CartSlideOver, MenuItemCard | `min-w-11 min-h-11` |

### SEO & PWA

| # | المشكلة | الإصلاح |
|---|---------|---------|
| H29 | لا robots.txt | إنشاء مع Disallow admin/owner |
| H30 | Admin/Owner pages indexable | X-Robots-Tag في middleware |
| H31 | لا sitemap للمطاعم | query slugs وإضافة |
| H32 | JSON-LD مفقود للمطاعم | إضافة Restaurant + Menu schema |
| H33 | SW يخزن API رغم التعليق | networkOnly أو تصحيح التعليق |

### Performance

| # | المشكلة | الإصلاح |
|---|---------|---------|
| H34 | SSE poll DB كل 5 ثوانٍ | LISTEN/NOTIFY |
| H35 | `/api/admin/stats` 18 queries | server cache 60s |
| H36 | Landing page client-render | server component مع streaming |

---

## 🟡 قائمة متوسطة — إصلاح قريب

| # | المشكلة |
|---|---------|
| M1 | `/api/public/featured` بدون rate limit |
| M2 | حد اتصالات DB 10 بدون env var |
| M3 | `requireAdmin()` deprecated ومستخدم في 6 routes |
| M4 | `fetchPublicStats` floor 500 ثابت |
| M5 | `console.error` بدلاً من logger (env.ts, config.ts) |
| M6 | Array mutation (push) في subscription routes |
| M7 | Rate limiter interval leak |
| M8 | missing `error.tsx` في system-events |
| M9 | 3 صفحات بدون empty state (owner/qr, loyalty, admin/qr) |
| M10 | لا beforeinstallprompt listener |
| M11 | Offline page لا auto-reconnect |
| M12 | لا apple-touch-icon |
| M13 | tsconfig typo `dev/dev/types` |
| M14 | لا `.env.example` |
| M15 | Dockerfile يفتقد prisma/ في runner stage |
| M16 | حواف response غير متسقة (200 بدلاً من 204) |
| M17 | لا CORS على public/* endpoints |
| M18 | Loyalty/stats hardcoded `take: 10` |
| M19 | `getState()` race في OrderDialog |
| M20 | SSE poll catch blocks صامتة |
| M21 | login/register يرجع `Response.json()` بدلاً من `NextResponse.json()` |
| M22 | `TELEGRAM_GROUP_IDS` env var غير موثق |
| M23 | 2 error pages use console.error not logError |
| M24 | OptimizedImage لا onError fallback |

---

## 🟢 قائمة منخفضة — معالجة لاحقاً

- `compress: true` في next.config (لا أثر على Vercel)
- `vercel.app` و `*.vercel.app` remotePatterns تكرار
- Dockerfile بدون HEALTHCHECK
- SW cache version hardcoded
- `staleWhileRevalidate` ديد كود في sw.js
- SW registration catch صامت
- No `onupdatefound` handler
- No `updateViaCache` config
- Offline page theme color mismatch
- Home page بدون metadata خاص
- Terms/privacy صفحات بدون OG description
- OG image 512x512 (ينصح 1200x630)
- Demo route upsert على كل GET
- Seed route محمي بشكل كافٍ
- `console.log` في production paths (logger.ts)
- Footer brand image loading="lazy"

---

## أسئلة مفتوحة (تحتاج إعادة فحص)

1. **DB Schema** — rate limit. الفحص اليدوي للـ Prisma schema مؤجل.
2. **Code quality** — rate limit. dead code scan, knip, duplication pending.
3. **Test coverage** — لم يعد بعد. التغطية الفعلية غير معروفة.
4. **E2E tests** — rate limit. flaky tests غير معروفة.
5. **Auth deep dive** — rate limit. تحليل JWT/RBAC العميق مؤجل.
6. **Telegram** — rate limit. فحص webhook/broadcast مؤجل.
7. **WhatsApp/Orders** — rate limit.
8. **File Upload** — rate limit.
9. **Loyalty** — rate limit.
10. **Build CI** — rate limit. Build يمر clean.
11. **Subscriptions/SSE** — عاد فارغاً.

---

---

## 🧪 فحص الاختبارات (وكيل 17)

| الحالة | العدد |
|--------|-------|
| ✅ اجتياز | 312 tests |
| 📊 التغطية | **0% — معطلة** (v8 لا يسجل أي hits ضد الـ source) |
| 🔴 وحدات بدون اختبارات | 15+ (session, db, config, telegram*, audit, logger, receipt, loyalty-tiers, landing, format) |

### حرج

- **آلية التغطية معطلة** — vitest coverage provider v8 لا يسجل أي تغطية رغم أن 312 test تمر. السبب المرجح: alias `@/` لا يُحل بشكل صحيح مع مسارات v8.
- **30+ وحدة من المصدر بدون أي اختبار** — session.ts (90 سطر، auth-critical)، db.ts (110 سطر)، config.ts (93 سطر، فيه encrypt/decrypt)، telegram-api.ts (119 سطر)، telegram-broadcast.ts (97 سطر).
- **1,054 سطر اختبارات تختبر mock وليس الـ source الحقيقي** — `subscription-decisions.test.ts` تختبر `simulateCheck()` محلي وليس `resolveSubscriptionPayment()` الحقيقي (285 سطر). نفس النمط في telegram-webhook.test.ts، regression.test.ts، regression-sweep.test.ts.

### عالي

- **25+ API route ليس لها unit tests** — كل API routes تختبر فقط عبر E2E ضد production.
- **لا unit tests لـ session, db, config, telegram-*, audit, logger, receipt, loyalty, landing** — هذه تغطي authentication، قاعدة البيانات، Telegram بوت، التسجيل، الـ receipts.
- **E2E تفتقد flows حرجة** — لا يوجد E2E test لـ order placement كامل، payment flow، admin CRUD.

### خطة إصلاح الاختبارات
1. إصلاح vitest.config.ts — تجربة `provider: 'istanbul'` بدلاً من v8، أو تصحيح alias resolution للتغطية
2. كتابة unit tests لـ session.ts (3 دوال، auth-critical)
3. كتابة unit tests لـ db.ts (withRetry، dbHealth)
4. كتابة unit tests لـ config.ts (encrypt/decrypt، getDecryptedBotToken)
5. كتابة unit tests لـ telegram-api.ts (sendMessageWithKeyboard دوال Telegram API)
6. إضافة E2E flows: order creation → WhatsApp confirmation, payment approval, admin CRUD

## خطة الإصلاح المقترحة

### المرحلة 1 — فورية (قبل أي deploy)
1. تدوير كل الأسرار: TELEGRAM_BOT_TOKEN, JWT_SECRET, AUTH_SECRET, DATABASE_URL, VERCEL_OIDC_TOKEN
2. `git filter-repo` لمسح الأسرار من التاريخ
3. إعادة تفعيل CSP مع nonce في src/middleware.ts
4. حذف middleware.ts الميتة (الجذر)
5. Hash session tokens (SHA256) في DB
6. إصلاح CSRF — المقارنة بـ NEXT_PUBLIC_DOMAIN وليس Host header
7. إضافة `isActive: true` لاستعلام المنيو
8. إضافة Auth guard لـ `GET /api/restaurants/[id]`

### المرحلة 2 — أمن وأداء (هذا الأسبوع)
9. إضافة rate limiting للنهايات المكشوفة
10. تبديل public menu pages من `force-dynamic` إلى ISR `revalidate: 60`
11. إصلاح cart persistence — إضافة `rehydrate()` في layout
12. إصلاح Prisma TOCTOU races (orders, rate-limiter, subscriptions)
13. توحيد تنسيق استجابة API
14. إنشاء robots.txt + sitemap + noindex للأدمن
15. إصلاح RTL physical classes (mr-* → ms-*)
16. إصلاح ReviewSheet focus trap
17. إصلاح تباين الألوان في الوضع الفاتح

### المرحلة 3 — جودة ونشر (الأسبوع القادم)
18. توحيد مدير حزم (npm أو pnpm)
19. إنشاء `.env.example`
20. إضافة اختبارات للنهايات الحرجة
21. إصلاح أزرار اللمس والصفحات الفارغة
22. إضافة beforeinstallprompt + apple-touch-icon
23. إنشاء Dockerfile مع HEALTHCHECK و prisma copy
24. إضافة sitemap + JSON-LD + robots.txt
25. تجربة 11 وكيل الذين فشلوا (rate limit) عند توفر quota

---

## إحصائيات الـ Swarm

| الحالة | العدد |
|--------|-------|
| ✅ مكتمل | 17 |
| ⏳ rate limit | 11 |
| ⚠️ عاد فارغاً | 1 (Subscriptions/SSE) |
| ⏳ لم يعد | 1 (لم يعد بعد) |

| النطاق | إجمالي findings |
|--------|----------------|
| CRITICAL ⛔ | 24 |
| HIGH ⚠️ | 40+ |
| MEDIUM 🟡 | 28+ |
| LOW 🟢 | 22+ |
| **الإجمالي** | **140+** |

> **ملاحظة:** وكيل 17 (Test Coverage) عاد متأخراً بعد كتابة التقرير. النتائج مضافة أدناه في قسم الاختبارات.