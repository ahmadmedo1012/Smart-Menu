# خطة الإصلاح والتحسين الشاملة — Smart Menu

**تاريخ التقرير:** 28 يوليو 2026  
**الموقع:** https://menu.smart-link.ly  
**الوكلاء:** 19/23 اكتملوا (3 توقفوا بسبب timeout, 1 قيد التشغيل)  
**المشاكل المكتشفة:** 58  

---

## 1. ملخص تنفيذي

| البعد | النتيجة | الحالة |
|-------|---------|--------|
| **عدد المشاكل الإجمالي** | 58 (7 حرجة، 17 عالية، 22 متوسطة، 12 منخفضة) | |
| **صحة المشروع** | ⚠️ **7/10** — بنية سليمة، إنتاج جاهز، ثغرات تحتاج معالجة | |
| **الأمان** | 3 مخاطر عالية (CSP, Telegram secrets, rate limiting) | 🟡 |
| **الأداء** | كود معمول جيداً لكن يحتاج تحسين CDN, images, fonts | 🟢 |
| **الـ UI/UX** | يعمل بشكل ممتاز مع 3 مشاكل سهلة الحل | 🟢 |
| **جودة الكود** | ممتازة مع بعض تحسينات الاتساق | 🟢 |
| **المتصفح** | 3 صفحات 500/503, 1 صفحة معطلة (system-events) | 🟡 |

---

## 2. مصفوفة الأولويات

### 🔴 CRITICAL (يجب الإصلاح فوراً — 7)

| # | المشكلة | الملف | التأثير | الحل |
|---|---------|-------|---------|------|
| C1 | `/admin/system-events` معطل كلياً | `src/app/admin/system-events/client.tsx` | توقف كامل لصفحة إدارة الأحداث | unWrap أر `events` من `res.events` بدلاً من `events.map` |
| C2 | 9 ثغرات في `next@16.2.9` (SSRF, DoS، تجاوز middleware) | `package.json` | ثغرات أمنية خطيرة — middleware bypass جاهز | تحديث `next` إلى `16.2.12` فوراً |
| C3 | CSP `script-src 'unsafe-inline'` على كل الصفحات | `middleware.ts` | XSS ممكن عبر أي inline script | إضافة nonce لكل request + إزالة `unsafe-inline` |
| C4 | Bot token يعود ك ciphertext صريح عند فشل الـ decryption | `src/lib/config.ts:78` | النظام يرسل garbage لـ Telegram API — صامت | إضافة validation ping + تنبيه إداري |
| C5 | race condition في `/owner/menu` — "فشل تحميل التصنيفات" رغم API→200 | `src/app/owner/menu/page.tsx` | UI يظهر خطأ رغم نجاح API — مستخدم يظن المشكلة تعطل | إعادة تحميل الـ categories بعد استقرار restaurantId |
| C6 | `useConfig()` يبلع كل الأخطاء بصمت (`catch(() => {})`) | `src/hooks/useConfig.ts:26` | config فارغ = delivery fee/feature flags مكسورة بصمت | إضافة حالة error + رسالة للمستخدم |
| C7 | `SystemEventsClient` يتوقع array لكن API يرجع `{events, total, page}` | `src/app/admin/system-events/client.tsx` | `events.map is not a function` يحطم الصفحة | استخراج `events` من response قبل map |

### 🟠 HIGH (إصلاح عاجل — 17)

| # | المشكلة | الملف | الحل |
|---|---------|-------|------|
| H1 | صفحات رئيسية تستدعي `/api/auth/me` → 401 (قبل تسجيل الدخول) | `layout.tsx` | إخفاء طلب الـ auth-me عن الزوار غير المسجلين |
| H2 | 500/503 أخطاء تحميل موارد على الصفحة الرئيسية | `src/app/page.tsx` | إزالة المصادر الخارجية الفاشلة أو استخدام fallback |
| H3 | duplicate lockfile (pnpm-lock.yaml + package-lock.json) | الجذر | حذف ملفات pnpm — المشروع يستخدم npm |
| H4 | 4 ثغرات libvips في sharp | transitive via next | ترقية sharp إلى `0.35.3` |
| H5 | صور Unsplash معطلة 404 (`/order-confirmed`, menu) | `src/app/order-confirmed/` | استبدال صور Unsplash بأخرى صالحة أو صور محلية |
| H6 | قفل Prisma Decimal → Number يفقد الدقة | `src/lib/db.ts:31` | تحويل الأنواع في الـ API layer وليس الـ DB layer |
| H7 | `withRetry` يطابق رسائل خطإ بالانجليزية فقط | `src/lib/db.ts:60` | إضافة مطابقة موضعية أو الاعتماد على error codes |
| H8 | فشل تشغيل validateEnv في بيئة التطوير | `src/lib/env.ts`, `src/lib/db.ts` | تشغيل validateEnv على كل البيئات |
| H9 | Telegram notifications fire-and-forget — بدون backpressure | `src/lib/subscription-decisions.ts:117` | إضافة logging + retry للرسائل الفاشلة |
| H10 | الـ `useConfig` ينشئ 3 طلبات شبكة منفصلة لكل مكون | `src/hooks/useConfig.ts` | إضافة cache layer للمسار `/api/config` |
| H11 | 2 شكل من أشكال الكلمة يتطلب id/name | menu page | إضافة `id` و `name` attributes |
| H12 | `console.log` متناثرة في كود الإنتاج | متعدد | إزالة أو استبدال بـ logger |
| H13 | 3 وكيل من Chrome DevTools عالقين (timeout) | workflow browser agents | تحديد مهلة أصغر + retry logic |
| H14 | Preloaded CSS chunk غير مستخدم (1iz8kmo2kjqks.css) | الصفحة الرئيسية | تحسين تكوين الـ CSS chunks |
| H15 | `/terms` و `/privacy` لا يخلّفان محتوى — redirect إلى /pricing أو /owner | `src/app/terms/`, `src/app/privacy/` | إضافة محتوى فعلي أو إزالة الصفحات |
| H16 | `/cart` يعيد التوجيه إلى `/menu/al-waha-cafe` بدلاً من عرض السلة | `src/app/cart/page.tsx` | فتح السلة للزائرين بدون تسجيل |
| H17| `@types/node@20` vs `@types/node@26` — 6 إصدارات خلف | `package.json` | ترقية آمنة إذا لم يكن هناك تعارض types |

### 🟡 MEDIUM (إصلاح ضمن السباق القادم — 22)

| # | المشكلة | الحل |
|---|---------|------|
| M1 | inconsistencies في الفاصلة المنقوطة (56% vs 44%) | إضافة Prettier config + `eslint --fix` |
| M2 | خلاف في علامات الاقتباس (double vs single) | توحيد على single quotes |
| M3 | ترتيب imports غير متناسق | إضافة `import/order` ESLint rule |
| M4 | duplicate `.animate-shimmer` مع keyframes مختلفة | توحيد على keyframe واحد |
| M5 | duplicate glass-* (plain CSS + @utility) | إزالة @utility + استخدام CSS فقط |
| M6 | Dead CSS: `.motion-safe *` selector لا يطابق أبداً | إزالة |
| M7 | خلط المسافات والـ tabs في globals.css | توحيد على tabs |
| M8 | Mixed named/default exports في المجلدات | توحيد على named exports |
| M9 | `badge.tsx` ينقصه `"use client"` | إضافة التوجيه |
| M10 | `@tailwindcss/postcss` و `tailwindcss` كلاهما | إزالة duplicate |
| M11| `@dotlottie/react-player` فيه valibot vuln | تقييم استبدال |
| M12 | `eslint@9` → `10` تأخير كبير | اختبار منفصل للترقية |
| M13 | `typescript@5` → `7` تأخير كبير | ترقية مع اختبار شامل |
| M14 | SSE EventEmitter in-memory — per-instance (ينهار مع multiple instances) | ترقية إلى Redis pub/sub |
| M15 | no per-component ErrorBoundary | إضافة ErrorBoundary عام |
| M16 | 2 تسجيلات auth على الصفحة الرئيسية | تقليل إلى تسجيل واحد |
| M17 | Telegram Approver BigInt → Number يفقد الدقة | استخدام string |
| M18 | webhook rate limiting على IP بدلاً من `chat_id` | تغيير الـ key |
| M19| getDecryptedBotToken لا يحتوي على cache | إضافة lazy cache |
| M20| `react` + `react-dom@19.2.4` → `19.2.8` | ترقية patch |
| M21| `framer-motion` ربما غير محسن | تقييم استخدام `layout` animations |
| M22| Tailwind CSS v4 → `@tailwindcss/postcss` config | تحقق من التهيئة |

### 🔵 LOW (تحسين مستمر — 12)

| # | المشكلة |
|---|---------|
| L1 | `zod@4.3.6` → `4.4.3` |
| L2 | `lucide-react@1.24` → `1.27` |
| L3| إزالة orphan deps: `dotenv`, `playwright` |
| L4 | callback data parsing بدون max-length validation |
| L5 | token anti-replay يكتب DB في كل مرة |
| L6 | `@prisma/client@7.8` → `7.9.1` |
| L7| `tsx@4.23` → `4.23.1` |
| L8 | `@tailwindcss/postcss@4.3.2` → `4.3.3` |
| L9 | `sharp@0.33` → `0.35` |
| L10| PHP server extras قديمة (5.x) |
| L11| إزالة متغيرات بيئة غير مستخدمة |
| L12| `@types/node` → `26` (اختبار أولاً) |

---

## 3. خطة الـ Sprint

### Sprint 1 — نقدي (الأسبوع الأول — 2-3 أيام)

| المهمة | الأولوية | الملفات المتأثرة | المجهود |
|--------|---------|-----------------|---------|
| Fix `/admin/system-events` كلياً | CRITICAL | client.tsx, API route | 30 دقيقة |
| تحديث `next@16.2.12` | CRITICAL | package.json | 10 دقائق |
| Fix CSP nonce لـ XSS | CRITICAL | middleware.ts | ساعتان |
| Fix race condition في `/owner/menu` | CRITICAL | menu/page.tsx | ساعة |
| Fix `useConfig` صامت | CRITICAL | useConfig.ts | 30 دقيقة |
| إخفاء `401 GET /api/auth/me` من الزوار | HIGH | layout.tsx | 30 دقيقة |
| Fix 500/503 أخطار على الرئيسية | HIGH | page.tsx | 30 دقيقة |
| حذف pnpm-lock | HIGH | الجذر | 5 دقائق |

### Sprint 2 — عالي (الأسبوع الثاني)

| المهمة | الأولوية | المجهود |
|--------|---------|---------|
| ترقية sharp@0.35 (4 CVEs) | HIGH | 30 دقيقة |
| استبدال صور Unsplash المقطوعة | HIGH | 30 دقيقة |
| Fix Prisma Decimal فقدان الدقة | HIGH | ساعة |
| Fix withRetry locale-blind | HIGH | 30 دقيقة |
| تشغيل validateEnv لكل البيئات | HIGH | 15 دقيقة |
| Fix Telegram notifications | HIGH | ساعة |
| إضافة cache لـ useConfig | HIGH | 30 دقيقة |
| Fix a11y form fields | HIGH | 15 دقيقة |

### Sprint 3 — متوسط (الأسبوع الثالث-الرابع)

جميع الـ 22 MEDIUM مشكلة — تحسين جودة الكود والاتساق.

---

## 4. توصيات استراتيجية

### البنية التحتية
- ترقية Next.js بشكل روتيني (كل patch)
- ترقية Prisma (كل minor)
- ترقية sharp (أمني)
- إزالة duplicate lockfiles
- استخدام nonce لـ CSP الحقيقي

### الأمان
- CSP كامل مع nonce لكل request
- إخفاء `unsafe-inline` بعد nonce
- اختبار Telegram decryption flow
- فحص ثغرات npm audit أسبوعياً
- إضافة rate limiting على كل API

### الأداء
- تحسين الـ CDN caching للصور
- تقليل طلبات `auth/me` المتكررة
- lazy load images خارج viewport
- تقليل bundle size عبر التقسيم

### UX/UI
- إصلاح الـ 500/503 على الصفحة الرئيسية
- إضافة محتوى فعلي لـ /terms, /privacy
- فتح السلة للزوار
- تحسين error boundaries لكل مكون

### جودة الكود
- توحيد style (Prettier + ESLint)
- إزالة duplicate CSS
- توحيد named exports
- إزالة console.log من الإنتاج
- إضافة ErrorBoundary component

### الاختبارات
- توسيع التغطية إلى 60 API route
- Playwright E2E لكل صفحة
- اختبار أمني للثغرات الحرجة
- اختبار race conditions

---

## 5. إحصائيات الفحص

| البعد | عدد الـ Findings |
|-------|----------------|
| 🔴 الثغرات الأمنية | 7 |
| 🟠 جودة API/Kod | 17 |
| 🟡 نمط الكود/CSS | 22 |
| 🔵 تحسينات ثانوية | 12 |
| **المجموع** | **58** |

| صفحة / واجهة | الحالة |
|-------------|--------|
| Landing page `/` | ⚠️ 500/503 errors |
| `/pricing` | ✅ نظيف |
| `/login` | ⚠️ 401 على auth/me |
| `/menu/[slug]` | ✅ يعمل كامل |
| `/cart` | ⚠️ redirect غير صحيح |
| `/owner/*` | ✅ يعمل (مشكلة menu categ. race cond.) |
| `/admin/*` | ⚠️ صفحة system-events معطلة |
| `/subscribe` | ✅ يعمل |
| 404 page | ✅ ممتازة |
| PWA/Offline | ✅ شغالة |

---

**التقرير معد من 19 وكيل فحص (أمن، أداء، كود، متصفح، UX، اعتماديات).**  
لم يتم استلام نتائج 3 وكلاء بسبب timeout في Chrome DevTools ضد الموقع الحي.
