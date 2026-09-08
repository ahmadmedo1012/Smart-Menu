# تقرير التفتيش الحي الشامل 1-a — الجولة 93 (خط أساس ما قبل نشر r93)

- **الوكيل**: 1-a «مدقق الإنتاج الحي» (production-live-auditor)
- **الهدف**: https://menu.smart-link.ly
- **الأداة**: `curl` فقط (لا متصفح)، مهلة `-m 20` لكل أمر، 3 قياسات لكل مسار
- **تاريخ الفحص**: 2026-09-07 (15:27–15:31 UTC تقريبًا بحسب رؤوس Date)
- **الفرضية المسبقة**: الإنتاج يعمل بكود r91 (الالتزام 0429f11b) وكل إصلاحات r92 غير منشورة — **الفحص أكّدها بـ 6 بصمات مستقلة** (انظر §6)

---

## 0) أهم 10 نتائج (مرتبة بالخطورة)

1. **[حرج — جودة البيانات/الثقة] fixtures الاختبار تظهر للمستخدمين على الصفحة الرئيسية**: كاروسيل «مطاعم مميزة» في الهبوط يعرض 4 بطاقات، منها **2 fixtures داخلية**: `settings-test-ts` (مطعم المرسى، id 260) و `ede` (برغر هاوس، id 262) — بأزرار تنقّل حقيقية. إصلاح r92-A1 (استبعاد موحّد في `landing.ts`) غير منشور. المسار API `/api/public/featured` يستبعدهما (رقعة r91 F-C نُشرت)، لكن مسار RSC للهبات لم يُرقَّع.
2. **[حرج — SEO] 9 مداخل قمامة في sitemap.xml** (من أصل 18): `bssdn, hdydu, hvh, fafaef, sdsdsd, jjhhdhd, free-rest-1783368824, new-rest-300528, hgkjg` — بوابة r92-A5 غير منشورة. `/menu/sdsdsd` صفحة حية 200 بحجم **746KB** (أضخم صفحة في الموقع) بمحتوى اسمه «dsdsdd».
3. **[عالٍ — أداء] صفحات المنيو ديناميكية بالكامل (ISR ميت)**: `x-vercel-cache: MISS` + `private, no-cache, no-store` على كل مسارات `/menu/*` — متوسط TTFB للمنيو **0.40s** مقابل **0.19s** للهبوط المخزّن (أبطأ ~2.1x). إصلاح r92-A2 (ISR 60s) غير منشور.
4. **[عالٍ — لغز محلول] ACAO:* على /api/public/featured موجود وسببه طبقة منصة Vercel وليس الكود**: الاستجابة تحمل بصمة «مُخرَج ثابت» مطابقة حرفيًا لـ robots.txt وsitemap.xml وكل ملفات public:‏ `accept-ranges: bytes` + `content-disposition: inline` + `etag` بصيغة md5 + `access-control-allow-origin: *`، بينما `/api/health` (force-dynamic) لا يحمل أيًّا منها. المسار ISR (`revalidate=60`) فيُخزَّن كمُخرَج CDN. **لغز r92-A6 («لا وجود له في أي نسخة git») محسوم: هو حقن من المنصة، والكود بريء**. الخطر منخفض (بيانات عامة) لكن أي origin يمكنه جلبها.
5. **[عالٍ — أصول] og-default.png يُقدَّم بـ 176.5KB** بينما النسخة المحلية المضغوطة بـ r92 = 38.4KB — سكربت ضغط r92 غير منشور (ترافيك OG زائد ~138KB لكل مشاركة أولى).
6. **[متوسط — أصول] r92-D3 غير منشور**: `main21.webp` (122KB) و `hero-phone.webp` (77KB) يخدمان بـ `max-age=0, must-revalidate` — أي ~199KB تُعاد تنزيلها مع كل زائر QR جديد. الخطوط فقط تحمل `immutable` (رقعة r85 المنشورة).
7. **[متوسط — SEO] غياب canonical عن كل الصفحات غير المنيو** (`/`، `/pricing`، `/privacy`، `/terms`، `/login`، `/subscribe`) — canonical موجود فقط في صفحات المنيو. كما أن privacy/terms يستخدمان **وصف الهبوط الافتراضي** بدل وصف مخصص.
8. **[متوسط — الضوضاء] ضوضاء 401 على /login ما زالت حية**: chunk محمّل من صفحة login يحتوي `fetch("/api/auth/me")` والنقطة النهائية تعيد `401 {"success":false,"error":"غير مصرح"}` لكل زائر مجهول (r92-A10 قائم).
9. **[متوسط — الإصدار] لا علامة إصدار قابلة للتحقق في الإنتاج**: `/api/health` بدون حقل `commitSha` (أُضيف في r92) — لا يمكن تمييز النسخة الحالية إلا بغياب الميزات. **علامة نجاح نشر r93 الحتمية: ظهور `commitSha` في health يطابق الملتزم.**
10. **[منخفض] سلوكيات ثانوية موثقة**: `/register` → 404 (لا صفحة تسجيل؛ التسجيل عبر `/subscribe` فقط)؛ `/manifest.webmanifest` و `/api/manifest` → 404 بينما HTML يشير لـ `/manifest.json` (موجود 200) — لا كسر فعلي؛ ملف cookie‏ `csrf-token` يُصدَر حتى على GET عمومية مثل `/api/health` (من proxy.ts بحسب التصميم — API ليس في قائمة الصفحات القابلة للكاش)؛ h1 البطل ما زال `style="opacity:0;transform:translateY(16px)"` (r92-A7 — يُحل SSR عند الترطيب فقط).

**المفاجآت الإيجابية**: ضغط Brotli ممتاز (الهبوط 121.9KB→19.4KB، sdsdsd 746.6KB→112.3KB — توفير 84–85%)؛ رؤوس أمان كاملة على كل المسارات (CSP/HSTS/XFO/Referrer-Policy/Permissions-Policy + COOP/CORP)؛ nonce-CSP مع `strict-dynamic` يعمل على الصفحات الديناميكية؛ إعادة توجيه HTTP→HTTPS بـ 308؛ محتوى عربي RTL سليم 100% في كل الصفحات (لا نص إنجليزي ظاهر سوى أسماء علامات تجارية: The Cheese, Telepizza, Kubaba, Empire, Smart Menu)؛ العملة د.ل في المنيو.

---

## 1) جرد المسارات العامة

أمر القياس (مكرر لكل مسار، 3 مرات):
```bash
for i in 1 2 3; do curl -s -o /dev/null -m 20 \
  -w "run$i: code=%{http_code} ttfb=%{time_starttransfer}s total=%{time_total}s size=%{size_download}B\n" \
  "https://menu.smart-link.ly<PATH>"; done
```
(المخرجات الكاملة محفوظة في قسم الأوامر أدناه؛ الجدول يعرض **متوسط** القياسات الثلاثة)

| المسار | الكود | متوسط TTFB | متوسط Total | الحجم | Cache-Control | x-vercel-cache | dir/lang |
|---|---|---|---|---|---|---|---|
| `/` | 200 | 0.190s | 0.200s | 121,870B | `public, max-age=60, s-maxage=60, stale-while-revalidate=86400` | HIT (age 24) + `x-nextjs-prerender:1` | `ar`/`rtl` |
| `/pricing` | 200 | 0.183s | 0.196s | 119,464B | نفس الهبوط | HIT + prerender | `ar`/`rtl` |
| `/privacy` | 200 | 0.345s | 0.422s | 68,781B | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | `ar`/`rtl` |
| `/terms` | 200 | 0.344s | 0.556s | 68,135B | private, no-store | MISS | `ar`/`rtl` |
| `/login` | 200 | 0.322s | 0.327s | 55,618B | private, no-store | MISS | `ar`/`rtl` |
| `/register` | **404** | 0.093s | 0.098s | 49,130B | `public, max-age=0, must-revalidate` | HIT (age 28450) | صفحة 404 عربية `noindex` |
| `/subscribe` | 200 | 0.332s | 0.339s | 55,893B | private, no-store | MISS | `ar`/`rtl` |
| `/menu/al-waha-cafe` | 200 | 0.403s | 0.613s | 210,607B | private, no-store | MISS | `ar`/`rtl` |
| `/menu/al-waha-cafeewewe` | 200 | 0.361s | 0.436s | 118,328B | private, no-store | MISS | `ar`/`rtl` |
| `/menu/sdsdsd` | 200 | 0.354s | **1.282s** | **746,603B** | private, no-store | MISS | `ar`/`rtl` |
| `/sitemap.xml` | 200 | 0.051s | 0.051s | 3,063B | `public, max-age=0, must-revalidate` | HIT (age 28,415) | — (XML) |
| `/robots.txt` | 200 | 0.032s | 0.032s | 191B | `public, max-age=0, must-revalidate` | HIT (age 28,548) | — (TXT) |
| `/manifest.webmanifest` | **404** | 0.117s | 0.117s | 49,130B | — (صفحة 404) | HIT | — |
| `/api/manifest` | **404** | 0.105s | 0.105s | 49,130B | — (صفحة 404) | HIT | — |
| `/api/health` | 200 | 0.747s* | 0.747s | 145–147B | `public, max-age=0, must-revalidate` | MISS (دائمًا) | — (JSON) |
| `/api/public/featured` | 200 | 0.167s | 0.167s | 683B | `public, max-age=0, must-revalidate` + etag | HIT (age 37) | — (JSON) |

\* أول استدعاء cold بـ TTFB 1.535s ثم 0.389/0.316s — بارد/ساخن (lambda + اتصال DB). مسار `/manifest.json` (الفعلي المُشار إليه في HTML) = 200 بحجم 1,663B.

### رؤوس الأمان (ملخص التغطية)
كل المسارات الفحوصة (HTML + JSON) تحمل:
`Strict-Transport-Security: max-age=31536000; includeSubDomains` · `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy: camera=(), microphone=(), geolocation=()` · `Cross-Origin-Opener-Policy: same-origin` · `Cross-Origin-Resource-Policy: same-origin` — **التغطية كاملة ✓**

فروقات CSP الثلاثة (مطابقة للتصميم في proxy.ts):
- **الصفحات القابلة للكاش** (`/`, `/pricing`, `/menu/*`): CSP ثابت بـ `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com` (بلا nonce — لا سياق طلب لصفحة مسبقة التصيير) + `upgrade-insecure-requests`.
- **الصفحات الديناميكية** (`/login`, `/privacy`, `/terms`, `/subscribe`): **nonce-CSP مع `'strict-dynamic'`** — دليل حي: `script-src 'self' 'nonce-a4b77b4c0a9e43418094b92a00e6a0fe' 'strict-dynamic' ...` ✓
- **مسارات API**: CSP صارمة `script-src 'self'` (بلا unsafe-inline).

HTTP العادي يعيد `308 Permanent Redirect` إلى https:
```bash
curl -s -m 20 -o /dev/null -D - "http://menu.smart-link.ly/"
# HTTP/1.0 308 Permanent Redirect ; Location: https://menu.smart-link.ly/
```

### أدلة أوامر (عيّنات)
```bash
curl -s -m 20 -D - -o /tmp/home.html "https://menu.smart-link.ly/"
# HTTP/2 200 | age: 24 | cache-control: public, max-age=60, s-maxage=60, stale-while-revalidate=86400
# x-nextjs-prerender: 1 | x-vercel-cache: HIT | x-matched-path: /
# content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; ...
# strict-transport-security: max-age=31536000; includeSubDomains | x-frame-options: DENY

curl -s -m 20 -D - -o /dev/null "https://menu.smart-link.ly/menu/al-waha-cafe" | rg -i 'cache-control|x-vercel-cache|x-matched'
# cache-control: private, no-cache, no-store, max-age=0, must-revalidate
# x-matched-path: /menu/[slug] | x-vercel-cache: MISS
```

---

## 2) صحة المحتوى العربي RTL

| الصفحة | dir/lang | title | نص إنجليزي ظاهر |
|---|---|---|---|
| `/` | `lang="ar" dir="rtl"` | «الربط الذكي \| Smart Menu — منيو رقمي للمطاعم والمقاهي» | أسماء علامات فقط: The Cheese, Telepizza, Kubaba, Empire, Smart Menu |
| `/pricing` | `ar`/`rtl` | «الباقات والأسعار \| Smart Menu \| المنيو الذكي» | Enterprise (اسم باقة), Smart Menu |
| `/privacy` | `ar`/`rtl` | «سياسة الخصوصية \| المنيو الذكي» | Smart Menu فقط |
| `/terms` | `ar`/`rtl` | «شروط الاستخدام \| المنيو الذكي» | Smart Menu فقط |
| `/login` | `ar`/`rtl` | «تسجيل الدخول \| Smart Menu \| المنيو الذكي» | لا شيء |
| `/subscribe` | `ar`/`rtl` | «اشترك الآن \| Smart Menu \| المنيو الذكي» | لا شيء |
| `/menu/al-waha-cafe` | `ar`/`rtl` | «مقهى الواحة \| المنيو الذكي» | لا شيء |
| `/menu/sdsdsd` | `ar`/`rtl` | «dsdsdd \| المنيو الذكي» | الاسم نفسه قمامة (dsdsdd) |
| 404 | `__next_error__` عربية | «404 - الصفحة غير موجودة \| المنيو الذكي» + `noindex` | لا شيء |

العملة: `د.ل` موجودة في الهبوط (مرة) وكل صفحات المنيو (أسعار العناصر: `...text-muted-foreground">د.ل</span>`). أوامر العينة:
```bash
rg -o '<html[^>]*>|<title>[^<]*</title>' /tmp/home.html
# <html lang="ar" dir="rtl"> / <title>الربط الذكي | Smart Menu — منيو رقمي للمطاعم والمقاهي</title>
rg -o '>[A-Z][a-zA-Z ]{6,40}<' /tmp/home.html | sort | uniq -c
# 1 >The Cheese<  1 >Telepizza<  1 >Smart Menu<  (أسماء علامات في قسم العرض)
```

---

## 3) ملاحظات SEO

| الصفحة | title | meta description | og:title/og:image | canonical |
|---|---|---|---|---|
| `/` | ✓ عربي | ✓ «منيو رقمي ذكي للمطاعم...» | ✓ «الربط الذكي \| Smart Menu» / og-default.png (1200×630, ar_LY) | **غائب** |
| `/pricing` | ✓ | ✓ وصف مخصص | ✓ / og-default.png | **غائب** |
| `/privacy` | ✓ | ⚠ **وصف الهبوط الافتراضي** (fallback) | ✓ / og-default.png | **غائب** |
| `/terms` | ✓ | ⚠ وصف افتراضي | ✓ / og-default.png | **غائب** |
| `/login` | ✓ | ✓ «سجّل دخولك...» | ✓ / og-default.png | **غائب** |
| `/subscribe` | ✓ | ✓ | ✓ / og-default.png | **غائب** |
| `/menu/al-waha-cafe` | ✓ | ✓ وصف المطعم | ✓ «مقهى الواحة» / og-default.png | ✓ `https://menu.smart-link.ly/menu/al-waha-cafe` |
| `/menu/[slug]` (كافة) | ✓ | ✓ | ✓ | ✓ لكل slug |

- **og:image = og-default.png لكل الصفحات بما فيها صفحات المنيو** — لا بطاقة OG مخصصة للمطعم (فرصة تحسين).
- **sitemap.xml**: 18 مدخلًا = 4 ثابتة (`/`, `/pricing`, `/terms`, `/privacy`) + 14 صفحة منيو:
  - **9 قمامة**: `bssdn`, `hdydu`, `hvh`, `fafaef`, `sdsdsd`, `jjhhdhd`, `free-rest-1783368824`, `new-rest-300528`, `hgkjg`
  - 5 سليمة: `al-aseel`, `pizza-roma`, `al-waha-cafeewewe`, `ahmed`, `al-waha-cafe`
  - مطابقة المسارات: الثلاثة المفحوصة حية 200 (al-waha-cafe / al-waha-cafeewewe / sdsdsd). **ملاحظة تكرار**: `al-waha-cafe` و `al-waha-cafeewewe` كلاهما «مقهى الواحة» بمحتوى شبه مطابق.
  - يُخزَّن لدى Vercel بعمر ~7.9 ساعة (age 28,415s) — بعد نشر r93 سيولّد النشر الجديد نسخة جديدة فورًا.
- **robots.txt** (مطابق للملف المحلي حرفيًا): `Allow: /` + `Disallow: /admin, /owner, /api` + `Sitemap: https://menu.smart-link.ly/sitemap.xml` ✓
- **manifest**: HTML يشير إلى `rel="manifest" href="/manifest.json"` (موجود 200). `/manifest.webmanifest` و `/api/manifest` غير موجودين (404) — **لا كسر فعلي**.
- **404 SEO**: صفحة 404 عربية مع `meta robots noindex` ✓ (لكنها تُقدَّم كـ HTML حتى لطلبات API غير الموجودة — انظر §7).

---

## 4) جدول الأصول

أمر الفحص (لكل أصل):
```bash
curl -s -m 20 -D /tmp/a-h.txt -o /dev/null -w "code=%{http_code} size=%{size_download}B" \
  "https://menu.smart-link.ly<ASSET>" && rg -i '^(cache-control|etag|access-control-allow-origin|x-vercel-cache)' /tmp/a-h.txt
```

| الأصل | الكود | الحجم (خام) | Cache-Control | ACAO | ملاحظات |
|---|---|---|---|---|---|
| `/favicon.ico` | 200 | 25,931B | `max-age=0, must-revalidate` | `*` | مطابق حرفيًا للمحلي (src/app/favicon.ico) |
| `/favicon.png` | 200 | 2,344B | `max-age=0, must-revalidate` | `*` | مطابق للمحلي |
| `/og-default.png` | 200 | **176,540B** | `max-age=86400, stale-while-revalidate=604800` | `*` | **المحلي المضغوط بـ r92 = 38,396B — الفرق 138KB غير منشور** |
| `/icon-192.png` | 200 | 8,149B | `max-age=0, must-revalidate` | `*` | مطابق |
| `/icon-512.png` | 200 | 19,903B | `max-age=604800, stale-while-revalidate=86400` | `*` | مطابق |
| `/hero-phone.webp` | 200 | 77,360B | **`max-age=0, must-revalidate`** | `*` | **r92-D3 غير منشور** (المطلوب: 86400+SWR) |
| `/main21.webp` | 200 | 122,152B | **`max-age=0, must-revalidate`** | `*` | **r92-D3 غير منشور** (المطلوب: 31536000 immutable) |
| `/fonts/cairo-arabic.woff2` | 200 | 30,712B | `max-age=31536000, immutable` | `*` | ✓ (رقعة r85 حية) |
| `/fonts/noto-sans-arabic.woff2` | 200 | 165,960B | `max, immutable` | `*` | ✓ |
| `/fonts/readex-pro.woff2` | 200 | 22,864B | `max, immutable` | `*` | ✓ |
| `/fonts/fonts.css` | 200 | 5,319B | `max, immutable` | `*` | ✓ |
| `/sw.js` | 200 | 6,126B | `max-age=0, must-revalidate` | `*` | سليم للـ Service Worker |
| `/apple-touch-icon.png` | 200 | 8,299B | `max-age=0` | `*` | — |

**الخلاصة**: `immutable` مطبق على الخطوط (وvideo بالتكوين) فقط. الأصلان الرئيسيان لr92-D3 (main21 + hero-phone) **بدون أي كاش** — كل زائر QR جديد يعيد تنزيل ~199KB.

---

## 5) الأداء التقريبي (TTFB)

| الصفحة | متوسط TTFB | الحالة |
|---|---|---|
| الهبوط `/` | 0.190s (بعد أول HIT بارد 0.39s) | ISR مخزّن (HIT, s-maxage=60) |
| `/pricing` | 0.183s | ISR مخزّن |
| `/privacy`, `/terms`, `/login`, `/subscribe` | 0.32–0.35s | ديناميكية (MISS) |
| `/menu/al-waha-cafe` | 0.403s | **ديناميكي (MISS) — r92-A2 غير منشور** |
| `/menu/al-waha-cafeewewe` | 0.361s | ديناميكي |
| `/menu/sdsdsd` | 0.354s (لكن **total 1.282s**) | ديناميكي + جسم 746KB |
| `/api/health` | بارد 1.535s / ساخن 0.32–0.39s | force-dynamic |

**مقارنة الهبوط مقابل المنيو (محور r92-A2)**: 0.19s مقابل 0.40s — المنيو أبطأ ~2.1x، ويؤكد أن ISR للمنيو غير مفعل. إجمالي sdsdsd 1.28s بسبب الجسم الضخم (تخففه br إلى 112KB لكن الـ TTFB يبقى ديناميكيًا).
ضغط Brotli فعال:
```bash
curl -s -m 20 -o /dev/null -H "Accept-Encoding: gzip, br, zstd" -w "%{size_download}" "https://menu.smart-link.ly/"
# 19350B (من 121,870B خام = توفير 84%) + content-encoding: br
curl -s -m 20 --compressed -o /dev/null -w "%{size_download}" "https://menu.smart-link.ly/menu/sdsdsd"
# 112,344B (من 746,603B = توفير 85%)
```

---

## 6) جدول الشذوذات الموثقة سابقًا — الحالة الراهنة

| # | الشذوذ | الحالة الآن | الدليل |
|---|---|---|---|
| 1 | **r92-A6**: ACAO:* على `/api/public/featured` («لا وجود له في أي نسخة git») | **قائم + اللغز محلول**: الترويسة تُحقن من **طبقة Vercel CDN للأصول/المخرجات الثابتة**، لا من الكود. المسار ISR (`export const revalidate = 60` في الكود) فيُخزَّن كمخرَج CDN ويُخدَم بنفس بصمة الملفات الثابتة: `accept-ranges: bytes` + `content-disposition: inline` + etag-md5 + ACAO:*. **البرهان المقارن**: `/api/health` (force-dynamic، لا يُخزَّن) لا يحمل أيًّا من هذه الترويسات؛ بينما `robots.txt` (ملف ثابت) يحملها كلها بما فيها ACAO:*. كما أن `OPTIONS /api/public/featured` يعيد `204` مع `access-control-allow-methods: OPTIONS, GET, HEAD` — سلوك خادم ملفات Vercel. الخطورة: منخفضة (بيانات عامة مقصودة) — إن أُريد إزالته: ترويسة ACAO صريحة في الكود تتجاوز حقن المنصة، أو جعل المسار ديناميكيًا (بكلفة TTFB) | `curl -s -D - https://menu.smart-link.ly/api/public/featured` مقابل `.../robots.txt` و `.../api/health` (الرؤوس الكاملة أعلاه) |
| 2 | **r92-A10**: ضوضاء 401 على `/login` من `/api/auth/me` | **قائم**: chunk محمّل مع login يحوي `sessionStorage.removeItem("just-logged-out"); fetch("/api/auth/me")...`؛ النقطة النهائية تعيد `401 {"success":false,"error":"غير مصرح"}` لكل مجهول. سلوك مقصود في الكود (فحص حالة ما بعد تسجيل الخروج) لكنه يولّد طلبًا فاشلًا بصفحة تحميل | `curl -s https://menu.smart-link.ly/api/auth/me` → 401؛ `rg 'api/auth/me' <chunks-of-login>` → chunk-3gqxe0pzraezo.js |
| 3 | **r92-A1**: fixtures في featured | **قائم ومحدد**: كاروسيل الهبوط يعرض 4 بطاقات: برغر هاوس (`ede`, id 262) + مطعم المرسى (`settings-test-ts`, id 260) + مقهى الواحة + مقهى الواحة - تجريبي (`al-waha-cafe-demo`, id 312). **fixtures في مسار RSC للهبوط** (r92 غير منشور). بينما `/api/public/featured` يستثني ede/settings-test-ts (رقعة r91 المنشورة) ويعيد فقط: `al-waha-cafe-demo` (id 312) و `al-waha-cafeewewe` (id 175) | `rg 'settings-test-ts' /tmp/home.html` → payload RSC + `aria-label="الانتقال إلى مطعم المرسى"`؛ جسم featured أعلاه |
| 4 | مداخل sitemap القمامة | **قائم**: 9/14 مدخل منيو قمامة (مفصلة بالاسم في §3) + صفحة `/menu/sdsdsd` حية 200 بحجم 746KB | `curl -s https://menu.smart-link.ly/sitemap.xml` (المحتوى الكامل موثق) |
| 5 | **r92-A7**: h1 البطل `style="opacity:0"` | **قائم** على الهبوط: `<h1 class="font-display ..." style="opacity:0;transform:translateY(16px)">منيو رقمي لمطعمك...` — يُظهر عند الترطيب فقط (مخاطرة flash/SEO لبروت فيتينجر) | `rg -o '<h1[^>]*>.{0,120}' /tmp/home.html` |
| 6 | **r92-A2**: المنيو ديناميكي (كان 0.42s) | **قائم**: MISS دائم + private/no-store؛ TTFB متوسط 0.40s | جدول §1 و§5 |
| 7 | **r92-D3**: immutable للأصلين الرئيسيين | **غير منشور**: main21.webp و hero-phone.webp بـ max-age=0 | جدول §4 |
| 8 | (مرتبط) og-default مضغوط (سكربت r92-compress) | **غير منشور**: 176.5KB في الإنتاج مقابل 38.4KB محليًا | جدول §4 |

---

## 7) واجهات API العامة بدون مصادقة (GET)

```bash
curl -s -m 20 -w "\ncode=%{http_code} content-type=%{content_type}\n" "https://menu.smart-link.ly/api/<X>"
```

| المسار | الكود الفعلي | الجسم | التقييم |
|---|---|---|---|
| `/api/analytics` | **404** | صفحة HTML 404 عربية (`noindex`, 49,130B) | **المسار غير موجود أصلًا** في التطبيق (لا يوجد src/app/api/analytics). لا ثغرة — لكن 404-API يعيد HTML وليس JSON (ملاحظة DX بسيطة) |
| `/api/loyalty` | **400** | `{"success":false,"error":"معرف المطعم مطلوب"}` | عام بالتصميم (بحث هاتف→بطاقة): التحقق من المعامل يسبق أي مصادقة. مع `?restaurantId=1&phone=...` يعيد 404 «بطاقة الولاء غير موجودة» — **enum oracle مقصود ومحدود المعدل (20/دقيقة + 60/دقيقة لكل IP) ومجرّد من PII** بحسب الكود |
| `/api/orders` | **401** | `{"success":false,"error":"غير مصرح"}` | **سليم** — مصادقة قبل أي شيء |
| `/api/auth/me` | 401 | `{"success":false,"error":"غير مصرح"}` | سليم (مصدر ضوضاء login فقط) |
| `/api/public/featured` | 200 | قائمة عامة (انظر §6-3) | مقصود + ISR |
| `/api/public/stats` | 200 | `{"totalRestaurants":211,"totalUsers":594}` | مجمّع عام (مقصود على الأرجح — يستحق مراجعة هل يلزم كشف totalUsers) |
| `/api/health` | 200 | انظر §8 | سليم |

---

## 8) بصمات الإصدار (أي نسخة تعمل؟)

```bash
curl -s -m 20 "https://menu.smart-link.ly/api/health"
# {"status":"ok","timestamp":"2026-09-07T15:27:30.538Z","uptime":40.201098646,
#  "version":"0.1.0","db":"connected","dbLatencyMs":15,"env":"production"}
```

- **غياب حقل `commitSha`** (أُضيف في r92 عبر VERCEL_GIT_COMMIT_SHA/GIT_COMMIT_SHA) → **الإنتاج ≠ r92** — أقوى دليل منفرد.
- 6 بصمات مستقلة كلها تقول r91 (0429f11b): ① لا commitSha في health؛ ② ISR المنيو ميت؛ ③ بوابة sitemap غائبة (9 قمامة)؛ ④ fixtures على الهبوط (المسار RSC غير مرقّع)؛ ⑤ og-default غير مضغوط (176KB)؛ ⑥ immutable غائب عن main21/hero-phone.
- **العلامة الحتمية لنجاح نشر r93: ظهور `commitSha` في `/api/health` يطابق الالتزام المنشور + اختفاء القمامة من sitemap + HIT على صفحات المنيو.**
- ملاحظات صحية: DB متصل (15ms)، uptime منخفض (40s عند الفحص — Lambda معاد تدويرها)، أول طلب بارد 1.5s.
- ملاحظة جانبية: `set-cookie: csrf-token` يُصدَر على GET عمومية مثل `/api/health` (من proxy.ts — مسارات API ليست في قائمة isCacheablePage) — غير ضار لكنه cookie غير ضروري لفحوص الصحة.

---

## 9) ملاحظات ختامية لخط الأساس

1. كل النتائج أعلاه **متوقعة ومفسَّرة** بحالة «r91 حي»: لا يوجد أي شذوذ جديد غير معروف سوى حل لغز ACAO (إيجابي) وحجم sdsdsd الكبير (746KB — يوصى بحذف/تعطيل المطعم القمامة من DB بعد نشر r93).
2. أثر sitemap/robots العمر ~7.9h: بعد النشر الجديد ستُولَّد نسخة نظيفة تلقائيًا (نشر جديد = مخرجات جديدة).
3. توصية تحسين غير مغطاة في r92 (للجولات القادمة): canonical للصفحات العامة + وصف مخصص لprivacy/terms + og:image لكل مطعم.
4. لم تُنفَّذ أي عمليات git ولم يُعدَّل أي ملف مشروع — الأوامر كلها قراءة عبر HTTP + نسخ محلية إلى /tmp.
