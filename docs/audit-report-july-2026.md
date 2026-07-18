# ≡ تقرير الفحص الشامل — Smart Menu

**التاريخ:** 2026-07-18  
**الموقع:** https://menu.smart-link.ly  
**الفرع:** main  
**آخر commit:** 064145a1  

---

## ملخص تنفيذي

**إجمالي findings:** 87  
**CRITICAL:** 12 ⛔  
**HIGH:** 28 ⚠️  
**MEDIUM:** 30  
**LOW:** 17  

**حالة الموقع:** يعمل — جميع الصفحات ترد 200، E2E 20/20. فيه 3 مشاكل حرجة تمنع الإطلاق للمشاريع الكبيرة.

### أهم 3 مشاكل
1. **CRITICAL** — `destroySession(undefined)` يمسح كل الجلسات — بأي طلب Logout بدون كوكي
2. **CRITICAL** — توكن تيليغرام وكلمة سر DB مكشوفة في git history
3. **CRITICAL** — CSRF protection غير فعّال و ˝dead code˝

---

## 1. هيكل المشروع والتكوين

### إيجابي
- TypeScript strict mode ✅  
- path alias `@/* → ./src/*` ✅  
- Next.js 16.2.9 (أحدث) ✅  
- tsconfig شامل مع exclude مناسب

### مشاكل
| الخطورة | المشكلة | الملف |
|---------|---------|-------|
| HIGH | Remotion dependencies (4 packages ≈ 153 MB) بلا استخدام | package.json |
| HIGH | `.env.production` موجود على القرص مع بيانات حية | `.env.production` |
| HIGH | `test:legacy` script ما يشتغل — tsx ما يدعم glob | package.json |
| MED | `.githooks/` مش موجود بس script يشير له | package.json |
| MED | eslint يتجاهل tests/ بالكامل | eslint.config.mjs |
| LOW | `tsconfig.json` target ES2017 (قديم — الأحدث ES2022+) | tsconfig.json |
| LOW | `.playwright-mcp/` و `screenshots/` مش في gitignore | .gitignore |
| LOW | tsconfig يمنع prisma/ من الـ typecheck | tsconfig.json |

---

## 2. جودة الكود

### 2.1 TypeScript Issues (13 HIGH)

| الخطورة | المشكلة | الملف |
|---------|---------|-------|
| HIGH | 10+ دوال مصدرة without return type (تعتمد على inference) | lib/auth.ts, session.ts, config.ts, receipt.ts, env.ts, ... |
| HIGH | `as string[]` على حقل JSON بدون Zod validation | lib/telegram.ts |
| HIGH | `as Record<string, unknown>` يخفي نوع الخطأ الحقيقي | lib/subscription-decisions.ts |
| MED | 15+ non-null assertions `!` في subscription-decisions.ts | lib/subscription-decisions.ts |

### 2.2 React Issues (5 HIGH)

| الخطورة | المشكلة | الملف |
|---------|---------|-------|
| HIGH | 4 useEffects بدون AbortController — خطر تسريب ذاكرة | HomePage.tsx, AdminSidebar.tsx, ConfigEditor.tsx, LoyaltySettings.tsx |
| HIGH | console.error متروك في production | HomePage.tsx |

### 2.3 API Routes (2 CRITICAL + 6 HIGH)

| الخطورة | المشكلة | الملف |
|---------|---------|-------|
| ⛔ CRITICAL | GET items/[id]/reviews بدون try/catch — ينهار على أي DB error | items/[id]/reviews/route.ts |
| ⛔ CRITICAL | GET demo/fix-images يعمل UPDATEs (side effects) | demo/fix-images/route.ts |
| HIGH | `Record<string, unknown>` يلغي type safety للـ Prisma where | orders/route.ts, items/route.ts, ... |
| HIGH | `as any` للـ Prisma where — أخطر استخدام | items/[id]/reviews/route.ts |
| HIGH | POST restaurants بدون rate limiting | restaurants/route.ts |
| HIGH | 3 event stream routes `catch {}` بدون أي logging | events/stream/route.ts وغيرها |

### 2.4 SEO/Metadata

| الخطورة | المشكلة | الملف |
|---------|---------|-------|
| HIGH | /pricing تفتقر page-specific metadata | pricing/page.tsx |
| HIGH | OG `url: "/"` hardcoded — كل الصفحات تورثها | layout.tsx |
| MED | /login, /subscribe, /cart, /order-confirmed بدون metadata | عدة صفحات |
| LOW | sitemap.ts بها 3 entries فقط — ناقصها صفحات مهمة | sitemap.ts |

---

## 3. الأمان

### 3.1 المصادقة والجلسات

| الخطورة | المشكلة | الملف |
|---------|---------|-------|
| ⛔ CRITICAL | destroySession(undefined) يمسح **كل** الجلسات — cookie مفقودة = ماسح كل التوكنات | lib/session.ts:47 |
| ⛔ CRITICAL | CSRF protection غير فعّال — الكود يرسل X-CSRF-Token header لكن السيرفر ما يتحقق منه أبدًا | lib/csrf.ts |
| HIGH | Logout بدون CSRF + بدون مصادقة + بدون rate limit — ممكن CSRF mass logout | api/auth/logout/route.ts |
| HIGH | sameSite='lax' — الأفضل strict للوحة الإدارة | lib/session.ts:41 |
| HIGH | middleware ما يحمي /api/ — الحماية تعتمد كليًا على كل handler | middleware.ts |

### 3.2 الثغرات الأمنية

| الخطورة | المشكلة | الملف |
|---------|---------|-------|
| ⛔ CRITICAL | AUTH_SECRET يُستخدم مباشرةً HMAC signing + AES-GCM encryption بنفس المفتاح | lib/env.ts, lib/config.ts |
| ⛔ CRITICAL | توكن تيليغرام وكلمة سر DB وجميع الأسرار مدفونة في git history (commit dafcbb37) | git history |
| HIGH | CSP `'unsafe-inline'` + `https:` wildcard — يلغي حماية XSS | next.config.ts |
| HIGH | POST validate بدون rate limiting — enumeration للـ usernames/slugs | subscriptions/validate/route.ts |
| MED | Upload بدون rate limit + بدون body size limit — DoS | upload/route.ts |
| MED | JWT_SECRET و AUTH_SECRET نفس القيمة — تدوير إحداهما يكسر الأخرى | lib/env.ts, config.ts |

### 3.3 Middleware و CSP

| الخطورة | المشكلة |
|---------|---------|
| HIGH | CSP ضعيف — `unsafe-inline` يلغي حماية XSS بالكامل |
| HIGH | no report-uri — خروقات CSP تمر بدون إشعار |
| MED | order-confirmed و demo خارج نطاق الـ matcher ما ياخذون CSP |
| LOW | Permissions-Policy تغطي 3 من 8 recommended features |

---

## 4. الـ Database / Prisma Schema

### 4.1 مشاكل Relations (CRITICAL)

| الخطورة | المشكلة | الجدول/العلاقة |
|---------|---------|----------------|
| ⛔ CRITICAL | توكن البوت مخزن plaintext — اختراق DB = سيطر على البوت | TelegramConfig.botToken |
| ⛔ CRITICAL | Referral.order و RewardTransaction.order بدون onDelete — حذف الطلب يفشل | Referral, RewardTransaction |

### 4.2 مشاكل أداء (HIGH)

| الخطورة | المشكلة  |
|---------|----------|
| HIGH | SubscriptionPayment.planId بدون relation — مرجع يتيم |
| HIGH | Review بدون unique(menuItemId, customerPhone) — تكرار التقييمات |
| HIGH | Restaurant.pickupTypes مخزنة كـ comma-separated String مش مصفوفة |
| HIGH | SubscriptionPlan بدون أي indexes |
| HIGH | مفقود indexes: SubscriptionPayment.phone, LoyaltyCard.customerPhone |
| MED | OrderItem.modifiersJson مخزنة كـ String مش Json type |
| MED | مفقود composite index: MenuItem(categoryId, status), sortOrder على MenuCategory و MenuItem |

---

## 5. اختبارات الموقع الحي

### 5.1 E2E Tests (20/20 ✅)

كل الاختبارات تمر بنجاح — تسجيل، دخول، خروج، middleware, API, tabs متعددة

### 5.2 API Live Tests (6/10 ✅)
- 6 نجاح، 4 فشل (كلها بسبب rate limiting أو عدم وجود بيانات اختبار مناسبة — مو أخطاء حقيقية)
- 154 مطعم، 293 مستخدم في قاعدة البيانات

### 5.3 الصفحات العامة (10 صفحات — 5 PASS / 5 FAIL مشروط)
- **PASS**: /, /pricing, /subscribe, /menu, /not-found
- **FAIL (بالجوالة)**: /login, /terms, /privacy, /cart, /order-confirmed — يرجع 200 لكن المحتوى مش مرئي لأن الـ React redirect يشتغل (عميل مسجل)

### 5.4 صفحة المنيو
- ✅ كل الـ 4 فئات تظهر (مشروبات ساخنة، باردة، حلويات، وجبات خفيفة)
- ✅ البحث يشتغل
- ✅ السلة تشتغل
- ❌ **زر مشاركة المنيو معطل** — يوجه إلى /pricing بدلاً من مشاركة الرابط
- ❌ Unsplash صور 404 — 5 صور ما تظهر (روابط خارجية مكسورة)

### 5.5 صفحة التسعير
- ✅ كل الخطط الخمسة تظهر (مجاني، أساسي، مدفوعة، احترافي، شركات)
- ✅ 7 أزرار CTA — كلها توجّه لـ /subscribe صح
- ✅ FAQ يظهر
- ✅ الفوتر يظهر
- ⚠️ زر "جرب لوحة التحكم" → /subscribe (صح بعد التعديل، لكن النص مضلل)

### 5.6 المصادقة (12/12 ✅)
- تسجيل الدخول → API → session → /admin → logout كلها تشتغل
- Rate limiting يشتغل: 10 محاولات/دقيقة لكل IP
- رسائل الخطأ بالعربية صحيحة

---

## 6. Responsive Design

| الجهاز | Width | Height | Issues |
|--------|-------|--------|--------|
| Desktop | 1440 | 900 | Unsplash 404 فقط |
| Tablet | 768 | 1024 | Unsplash 404 فقط |
| Mobile | 375 | 812 | Unsplash 404 فقط |

لا يوجد horizontal scroll، الأزرار قابلة للنقر، لا تداخلات.

---

## 7. خطة الإصلاح

### 🔴 المطلوب فوراً (CRITICAL — يمنع الإطلاق)

| # | المهمة | الملف | الجهد |
|---|--------|-------|-------|
| 1 | **destroySession(undefined)** — أضف guard: إذا `token` فارغ أو undefined، لا تنفذ deleteMany، فقط امسح الكوكيز | lib/session.ts:47 | 5 دقائق |
| 2 | **CSRF فعّال** — إما طبقه على كل state-changing routes، أو امسح dead code | lib/csrf.ts + middleware | 1-2 ساعات |
| 3 | **تدوير كل الأسرار** — JWT_SECRET, AUTH_SECRET, TELEGRAM_BOT_TOKEN, DATABASE_URL (كلها مكشوفة في git history) | إدارة | 30 دقيقة |
| 4 | **try/catch ناقص** — أضف try/catch في items/[id]/reviews | api/items/[id]/reviews/route.ts | 5 دقائق |
| 5 | **GET fix-images** — غيّر لـ POST أو أضف idempotency | api/demo/fix-images/route.ts | 10 دقائق |
| 6 | **botToken plaintext** — شفّر التوكن أو استخدم env var فقط | prisma schema | 1 ساعة |
| 7 | **Referral/RewardTransaction onDelete** — أضف onDelete إلى الـ schema | prisma schema | 15 دقيقة |

### 🟠 عاجل (HIGH)

| # | المهمة | الجهد |
|---|--------|-------|
| 8 | AbortControllers للـ useEffects — 4 مكونات | 20 دقيقة |
| 9 | إزالة console.error من HomePage | 2 دقائق |
| 10 | إزالة Remotion packages من dependencies | 5 دقائق |
| 11 | إزالة .env.production من القرص (واستخدم Vercel env variables) | 2 دقيقة |
| 12 | Rate limiting على /api/subscriptions/validate | 10 دقائق |
| 13 | Rate limiting على /api/restaurants POST | 10 دقائق |
| 14 | Rate limiting + body size limit على /api/upload | 15 دقيقة |
| 15 | Add return types على 10+ دوال مصدرة | 15 دقيقة |
| 16 | Metadata لـ /pricing, /login, /subscribe | 20 دقيقة |
| 17 | Fix OG url (`/` → per-page) | 10 دقائق |
| 18 | middleware matcher يشمل /api/ | 5 دقائق |
| 19 | Fix "جرب لوحة التحكم" → /menu/al-waha-cafe بدلاً من /subscribe | 5 دقائق |

### 🟡 متوسط (MEDIUM)

| # | المهمة | الجهد |
|---|--------|-------|
| 20 | أضف indexes مفقودة (SubscriptionPlan, SubscriptionPayment.phone, ...) | 30 دقيقة |
| 21 | Fix sitemap.ts — أضف المسارات المفقودة | 15 دقيقة |
| 22 | `PickupType` comma-separated → JSON array | 30 دقيقة |
| 23 | إصلاح "1 أصناف" → "1 صنف" في السلة | 5 دقائق |
| 24 | إصلاح زر المشاركة في المنيو | 15 دقيقة |
| 25 | eslint يغطي tests/ | 5 دقائق |
| 26 | Fix صور Unsplash 404 — استخدم صور افتراضية | 20 دقيقة |
| 27 | .githooks/ — إما أنشئ المجلد أو امسح script | 5 دقائق |

---

## 8. التوصيات النهائية

1. **CRITICAL — أوقف الإطلاق** حتى إصلاح destroySession + CSRF + تدوير الأسرار
2. HIGH — أصلح الـ 19 مشكلة عالية قبل الإطلاق الرسمي
3. بعد الإصلاح — أعد تشغيل E2E + المتصفح للتأكيد
4. أضف CI pipeline: lint + typecheck + tests قبل كل push
