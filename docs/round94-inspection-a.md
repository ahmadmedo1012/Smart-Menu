# تقرير تفتيش الجولة 94 — الوكيل A (تفتيش الإنتاج والأداء الحي)

- **معرف المهمة**: 2-a · **التاريخ**: 2026-09-08 (03:17–03:25 UTC)
- **خط الأساس**: aec233ba · **الإنتاج**: https://menu.smart-link.ly (حي ✅)
- **نوع العمل**: بحث فقط — لم يُلمس أي ملف في src/ أو tests/ أو config. المكتوب: هذا التقرير + worklog + لقطتا دليل في `download/round94-audit/`.
- **الأدوات**: curl 8.x (3 عينات/مسار + وسيط)، Playwright 1.61.1 + Chromium (chromium-1234 headless, viewport 1366×900, locale=ar)، node 24.19.0.

---

## 1) مسح مسارات الإنتاج (3 عينات لكل مسار — وسيط)

الأمر النموذجي: `curl -s -o /dev/null -w '%{http_code} %{time_starttransfer} %{time_total} %{size_download}' https://menu.smart-link.ly<Route>` ×3.

| المسار | الكود | TTFB (وسيط) | Total (وسيط) | الحجم (بايت) | ملاحظات |
|---|---|---|---|---|---|
| `/` | 200 | 0.360s | 0.369s | 120,991 | ISR، HIT، age=24 |
| `/pricing` | 200 | 0.140s | 0.146s | 119,549 | ISR، HIT |
| `/login` | 200 | 0.339s | 0.347s | 55,618 | ديناميكي، MISS، no-store |
| `/subscribe` | 200 | 0.331s | 0.345s | 55,893 | ديناميكي، MISS، no-store |
| `/privacy` | 200 | 0.347s | 0.557s | 69,218 | ديناميكي، no-store |
| `/terms` | 200 | 0.323s | 0.373s | 68,568 | ديناميكي، no-store |
| `/menu/al-waha-cafe` | 200 | 0.105s | 0.111s | 87,456 | ISR، HIT، age=19 |
| `/menu/al-waha-cafeewewe` | **200** | 0.704s | 0.710s | 82,594 | **مطعم حقيقي في DB** (id=175) — ليس 404. العينة 1–2 بطيئة (MISS بارد) ثم 0.086s |
| `/api/health` | 200 | 0.381s | 0.381s | 201 | JSON، sha مطابق |
| `/api/public/featured` | 200 | 0.085s | 0.085s | 683 | JSON، HIT (age=17) |
| `/sitemap.xml` | 200 | 0.036s | 0.036s | 1,741 | XML، HIT |
| `/robots.txt` | 200 | 0.095s | 0.095s | 191 | text/plain، HIT |
| `/menu/nonexistent-slug-r94-audit-xyz` | **404** ✅ | 0.592s | 0.597s | 46,971 | صفحة 404 HTML صحيحة، مخزنة سلبياً s-maxage=60 |
| `/api/nonexistent-r94-audit-xyz` | **404** | 0.097s | 0.101s | 49,130 | **HTML وليس JSON** (بند D4 — انظر §5.2) |

> جميع الأكواد متسقة عبر العينات الثلاث (لا تذبذب 2xx/5xx). سلوك ISR واضح: العينة الأولى أبطأ (MISS/SWR) ثم HIT سريع.

### رؤوس HTTP المهمة (ملخص)

| مجموعة المسارات | cache-control | x-vercel-cache | CSP (script-src) |
|---|---|---|---|
| `/`, `/pricing`, `/menu/*` | `public, max-age=60, s-maxage=60, stale-while-revalidate=86400` | HIT | `'self' 'unsafe-inline' https://va.vercel-scripts.com` — **بلا nonce** |
| `/login`, `/subscribe`, `/privacy`, `/terms` | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | `'self 'nonce-…' 'strict-dynamic' …` ✅ |
| `/api/*`, sitemap, robots | `public, max-age=0, must-revalidate` | MISS/HIT | `script-src 'self'` + `font-src … https://fonts.gstatic.com` (بقايا قديمة) |

- **HSTS**: `max-age=31536000; includeSubDomains` ✅ على كل المسارات · **X-Frame-Options: DENY** ✅ · `x-content-type-options: nosniff` ✅.
- الصفحات الديناميكية تستخدم nonce لكل طلب؛ صفحات ISR العمومية تُخدم بـ`'unsafe-inline'` (مفاضلة كاش/أمن — انظر MED-3).
- الـ404 لمنيو غير الموجود يُخزَّن سلبياً 60 ثانية (HIT) — سلوك سليم.

---

## 2) بصمات r93 السبع — كلها قائمة ✅

| # | البصمة | الحالة | الدليل (أمر + ناتج) |
|---|---|---|---|
| 1 | commitSha في health | ✅ مطابق حرفياً | `curl /api/health` → `"commitSha":"aec233baa7f534e812fe2a84e5343a4e6278f39d"` + `env=production, db=connected` |
| 2 | قمامة sitemap = 0 | ✅ (0/6 حسب JUNK_SLUG_PATTERNS) | تشغيل أنماط `src/app/sitemap.ts` على الـslugs الحية (al-aseel, pizza-roma, fafaef, al-waha-cafeewewe, ahmed, al-waha-cafe) → **clean لكلها**. تحفّظ: `fafaef` مذكور في تعليق الكود كمثال قمامة لكنه يمر (3 حروف علة + نشِط آخر 90 يوماً) — انظر LOW-9 |
| 3 | كاش منيو HIT/s-maxage | ✅ | `/menu/al-waha-cafe`: `x-vercel-cache: HIT` + `cache-control: public, max-age=60, s-maxage=60, stale-while-revalidate=86400` + `x-matched-path: /menu/[slug]` |
| 4 | og-default حجمه ~38.4KB | ✅ بالضبط | `curl -s /og-default.png \| wc -c` → **38,396 بايت**، `content-type: image/png`، `max-age=86400 + SWR 604800`، ومُشار إليه في `<meta property="og:image">` |
| 5 | fixtures مستبعدة من featured | ✅ | الرد الحي: مطعمان فقط — `al-waha-cafe-demo` (id=312) و`al-waha-cafeewewe` (id=175). `settings-test-ts` و`ede` (TEST_FIXTURE_SLUGS في `src/lib/landing.ts`) **غائبان تماماً**. المطعمان الحاضران "ديمو مقصود" بنص تعليق الكود |
| 6 | h1 البطل SSR ظاهر | ✅ | HTML الأولي لـ`/` يحوي `<h1 …>منيو رقمي لمطعمك…` وللمنيو `<h1 …>مقهى الواحة` (curl قبل أي JS) + Playwright: `h1Visible: true` في الصفحتين |
| 7 | الخطوط self-hosted تعمل | ✅ | 7/7 ملفات woff2 في `/fonts/*` → 200 `font/woff2` + `immutable 31536000`؛ `/fonts/fonts.css` (5,319B) → 200 immutable؛ `font-display: swap` + `unicode-range`؛ preload في HTML؛ Playwright: `document.fonts.status = "loaded"` في الصفحتين |

دعم إضافي للبصمة 1: 3 عينات health → dbLatencyMs = 27 / 3 / 4 (الأولى الباردة 946ms).

---

## 3) قياس متصفح حقيقي (Playwright/Chromium)

السكربت: `/tmp/prod-audit.mjs` (LCP عبر PerformanceObserver buffered + مستمع response لعدّ البايتات + console/pageerror). التشغيل: `cd /home/z/my-project && node /tmp/prod-audit.mjs` بمسار chromium-1234 الصريح.

| المقياس | الهبوط `/` | المنيو `/menu/al-waha-cafe` |
|---|---|---|
| **LCP** | **1,368ms** (جيد CWV) | **892ms** (جيد CWV) |
| FCP | 1,280ms | 508ms |
| DOMContentLoaded | 919.8ms | 483.5ms |
| load | 1,487ms | 667.7ms |
| HTML الأولي (بايت) | 120,991 (فك) / **19,573 على السلك** | 87,456 (فك) / **14,323 على السلك** |
| طلبات الشبكة | 53 (52 فرعياً + nav) | 73 (72 فرعياً + nav) |
| بايتات على السلك (الموارد الفرعية) | 723,002 (~706KB) | 767,335 (~749KB) |
| بايتات مفكوكة (decoded) | 1,944,073 (~1.9MB) | 2,396,519 (~2.3MB) |
| JS | 26 طلباً / 304,859 سلكاً / 1,139,394 فكاً | **30 طلباً / 471,373 سلكاً / 1,635,366 فكاً** |
| CSS | 257,660 سلكاً (خلفيات CSS) | 65,672 سلكاً |
| خطوط woff2 | 232,376 (منها subsets متعددة) | 118,648 |
| صور | avif 65,293 + webp 77,360 + png 2,344 | 20 صورة avif (Unsplash) 75,688 سلكاً / 182,966 فكاً |
| أخطاء console / pageerror | **0 / 0** ✅ | **0 / 0** ✅ |
| h1 ظاهر | ✅ «منيو رقمي لمطعمك…» | ✅ «مقهى الواحة» |
| `documentElement.dir` | `rtl` + `lang="ar"` ✅ | `rtl` + `lang="ar"` ✅ |
| `document.fonts.status` | `loaded` ✅ | `loaded` ✅ |
| صور srcset | 3/3 (100%) | 16/16 (100%) |
| webp/avif | avif للـnext/image + hero-phone.webp ثابت | avif من Unsplash (أفضل من webp) |

**لقطات الدليل** (1366×900): `download/round94-audit/landing.png` (454,699B) · `download/round94-audit/menu.png` (711,836B).

ملاحظات تفسيرية:
- «بايتات على السلك» = مجموع `transferSize` من Resource Timing (مضغوط + رؤوس)؛ «المفكوكة» = `decodedBodySize`.
- الهبوط يحمّل خلفيات CSS بـ258KB (أعمال hero) وخطوط 232KB (subsets عربية/لاتينية + Noto) — يفسر فجوة LCP~FCP.
- المنيو: الصور كلها من `images.unsplash.com` (خارجية، عبر srcset بصيغة avif) وليست عبر `/_next/image` — انظر MED-2.
- `promo.mp4` **لم يُحمَّل** عند زيارة الهبوط (lazy عند الطلب) ✅.

---

## 4) أوزان الأصول (من الإنتاج مباشرة)

| الأصل | الحجم | content-type | cache-control | ملاحظة |
|---|---|---|---|---|
| `/og-default.png` | **38,396B (~38.4KB)** | image/png | `max-age=86400, SWR 604800` | البصمة ✅ — غير immutable (اسم غير مُبعثر) |
| `/main21.webp` | 122,152B | image/webp | `public, max-age=31536000, immutable` ✅ | يُقدَّم عبر `/_next/image?url=%2Fmain21.webp&w=1920&q=75` على الهبوط (يصل المتصفح avif ~65KB) |
| `/hero-phone.webp` | 77,360B | image/webp | `max-age=86400, SWR 604800` | خلفية CSS في الهبوط |
| `/video/promo.mp4` | 153,895B | video/mp4 | `immutable 31536000` + `accept-ranges` (اختبار Range → 206 ✅) | **غير مُشار إليه في أي src/** — محروس فقط باختبار e2e (round87-B10) |
| `/brand-icon.png` | 6,685B | image/png | `max-age=0, must-revalidate` | ⚠️ بلا كاش مباشر (يستخدم عبر _next/image حيث يُحسَّن) |
| `/fonts/fonts.css` | 5,319B | text/css | `immutable 31536000` ✅ | font-display: swap |
| `/fonts/readex-pro.woff2` | 22,864B | font/woff2 | `immutable 31536000` ✅ | + 6 ملفات woff2 أخرى كلها 200 ✅ |

**خلاصة التحسين**: الصور المُدارة عبر `/_next/image` تصل avif (أفضل من webp) بكاش سنة immutable؛ الأصول غير المُبعثرة (og-default, hero-phone) على كاش يوم+SWR — مقبول. عناصر تحسين محدودة: brand-icon.png بلا كاش، وpromo.mp4 حمولة ميتة.

---

## 5) النتائج المصنفة

### CRIT — لا شيء ✅
الإنتاج حي، مطابق لخط الأساس، بلا أخطاء 5xx ولا أخطاء console في المتصفح الحقيقي.

### HIGH — لا شيء جديد
(بند 404-API مؤجل أصلاً منذ r93 — يُقاس هنا ولا يُصنَّف HIGH لأنه معروف ومُؤجل.)

### MED

1. **MED-1 · واجهة الهبوط تعرض بيانات ديمو فقط**: `/api/public/featured` يعيد **مطعمين اثنين فقط** كلاهما ديمو متطابق المحتوى: «مقهى الواحة - تجريبي» (al-waha-cafe-demo, id=312, وصفه «منيو تجريبي للاختبار») و«مقهى الواحة» (al-waha-cafeewewe, id=175 — slug ضربة-لوحة مفاتيح، مكرر نفس الاسم/الوصف/الهاتف/المدينة). مطعم حقيقي واحد (al-waha-cafe) غير مُعرض. تعليق الكود نفسه يقول: «Proper long-term fix is deactivating/un-featuring those prod rows». **قرار بيانات لصاحب المشروع** — الحذف/الإلغاء يحسّن مصداقية الواجهة ويرمّم قائمة featured.
2. **MED-2 · صفحة المنيو العام ثقيلة الحِمل لمسار QR**: 73 طلباً، 471KB JS على السلك (1.56MB مفكوكة، 30 سكربت) + صور من CDN خارجي (unsplash.com) لا تمر عبر `/_next/image` ولا تُاستضاف محلياً. زبون المنيو يأتي غالباً من هاتف عبر QR — الحِمل الحالي (~765KB سلكاً) معقول لكن JS فيه قابل للتقليص (تحليل الوكيل C/D للحِزم: MenuPageClient + zustand + dialog…). كذلك الاعتماد على unsplash = جهة خارجية لعرض المنيو (توافر + خصوصية + CSP `img-src https:` واسعة).
3. **MED-3 · تفاوت CSP بين ISR والديناميكي + بقايا fonts.gstatic**: صفحات ISR العمومية (الهبوط/الأسعار/المنيو) ترسل `script-src 'self' 'unsafe-inline' …` بلا nonce (مضطرة بسبب كاش HTML العمومي) بينما الديناميكية ترسل nonce+strict-dynamic؛ وCSP لمسارات `/api/*` يذكر `https://fonts.gstatic.com` رغم أن الخطوط self-hosted (بقايا سياسة قديمة، غير مؤثرة وظيفياً). **يُحال للوكيل B (أمن)** لتقرير مستوى الخطر الفعلي لـunsafe-inline مع محرك القوالب الحالي.

### LOW

4. **LOW-4 · HTML الـ404 لمسار API (بند D4 مؤكد ومقاس)**: `/api/nonexistent-r94-audit-xyz` → 404 لكن `content-type: text/html; charset=utf-8`، `x-matched-path: /404`، 49,130 بايت HTML كاملة لمسار API. عملاء JSON سيستقبلون HTML. البصمة المقيسة جاهزة لمعالجة مُدَفَّعة لاحقاً (not-found عام لـ/api).
5. **LOW-5 · preload مزدوج للخطوط**: `<head>` يرسل preload لـ`cairo-arabic.woff2` و`readex-pro.woff2` **مرتين لكل منهما** (نمطان مختلفان من الإصدار: `href` أولاً ثم `as` أولاً — مصدران يبعثان نفس preload) في الصفحتين. المتصفح يزيل التكرار لكنه ضجيج HTML (~2×2 وسوم).
6. **LOW-6 · `brand-icon.png` بلا كاش مباشر**: `cache-control: public, max-age=0, must-revalidate` — يُستخدم عملياً عبر `_next/image` (فيصل محسَّناً بكاش طويل) لكن الجلب المباشر يعيد التحقق كل مرة.
7. **LOW-7 · `promo.mp4` حمولة غير مستخدمة**: 153,895B تُقدَّم immutable لكن لا مرجع له في أي src/ — محروس فقط باختبار انحدار e2e (team10). إما إعادة استخدامه أو حذفه مع تحديث الاختبار.
8. **LOW-8 · أصول غير مُبعثرة بكاش قصير نسبياً**: og-default.png وhero-phone.webp على `max-age=86400` بدل سنة (أسماء ثابتة غير مُبعثرة — مفاضلة معروفة، قابل للتحسين بنمط `?v=` أو _next/image).
9. **LOW-9 · `fafaef` ما زال في sitemap رغم أنه مثال القمامة المذكور في الكود**: ينجو من نمط حروف العلة (3 حروف علة) ومن بوابة 90 يوماً (updatedAt=2026-07-05 أي ~65 يوماً). سلبية كاذبة للـheuristic — الحل الجذري تنظيف الصف أو بوابة أدق (الوكيل صاحب قرار البيانات).
10. **LOW-10 · lastmod للصفحات الثابتة في sitemap = وقت إعادة التوليد**: `/`, `/pricing`… تحمل `lastmod` يتحدث كل إعادة توليد (regeneration) — ضجيج SEO صغير (Fetch budget robots يعيد الزيارة لأسباب غير حقيقية).

### P2 (إيجابيات مُقاسة تستحق التثبيت)

- البصمات السبع لr93 **كلها قائمة** بنفس قيم الإغلاق (sha حرفياً + 38,396B og).
- CWV الحية جيدة: LCP 1.37s/0.89s، FCP 1.28s/0.51s، صفر أخطاء console وpageerror.
- HTML الأولي مضغوط جداً على السلك (19.6KB/14.3KB) — SSR يعمل كما صُمم.
- robots.txt سليم (يمنع admin/owner/api/cart/print + sitemap معلن) · 404 المنيو صحيح ومخزَّن سلبياً · HSTS/XFO/nosniff على كل المسارات.
- dbLatency دافئ 3–27ms · promo.mp4 لا يُحمَّل تلقائياً (lazy) · Range requests تعمل (206).

---

## 6) سجل الأوامر الفعلي (مختصراً)

```bash
bash /tmp/curl-scan.sh                     # 14 مساراً × 3 عينات (جدول §1)
bash /tmp/hdr-scan.sh                      # رؤوس HTTP لكل مسار → /tmp/r94-headers/
curl -s /api/health ×3                     # sha + dbLatency (27/3/4ms)
curl -s /sitemap.xml | (تحليل slugs)       # 6 مطاعم — اختبار أنماط JUNK بـnode → clean 0
curl -s /api/public/featured               # مطعمان ديمو فقط — settings-test-ts/ede غائبان
curl -sI + curl -s | wc -c                 # أوزان: og-default 38,396B، main21 122,152B…
node /tmp/prod-audit.mjs                   # Playwright: LCP/DCL/load/شبكة/console/h1/RTL/خطوط + لقطتان
node /tmp/prod-wire.mjs                    # transferSize/decodedBodySize لكل نوع مورد
node -e '…JUNK_SLUG_PATTERNS…'             # التحقاق 0/6 (بصمة 2)
```

الملفات المرجعية المحفوظة: `/tmp/r94-headers/*.txt/html` (رؤوس + HTML خام)، `download/round94-audit/landing.png`، `download/round94-audit/menu.png`.

## 7) الخطوات التالية المقترحة (للمنسق)

1. قرار بيانات: إلغاء تفعيل/إبراز صفوف الديمو الثلاثة المتشابهة (id=175/312 + fafaef) أو استبدال featured بمطاعم حقيقية (MED-1, LOW-9).
2. إحالة MED-3 للوكيل B (تقييم unsafe-inline على ISR + تنظيف fonts.gstatic من CSP الـapi).
3. إدراج D4 (404-API HTML) في موجة إصلاح مع قياس اليوم: 49,130B HTML لمسار API.
4. تقليص JS صفحة المنيو العام (471KB سلكاً) — يقترن بمهمة تفكيك ItemDialog المُؤجلة.
5. تنظيفات صغيرة: preload المزدوج، كاش brand-icon، مصير promo.mp4.
