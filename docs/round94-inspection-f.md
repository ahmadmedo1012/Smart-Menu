# تقرير تفتيش الجولة 94 — الوكيل F (التبعيات وسلسلة التوريد والحزمة)

> Task ID: 2-f · التاريخ: 2026-09-08 · خط الأساس: aec233ba · **بحث فقط — لم يُعدَّل أي كود/تبعية/قفل**.
> المصدر: `pnpm@11.9.0` عبر corepack · lockfile `9.0` (739 مدخلاً) · node_modules محلي (تفاصيل بيئة في §6.3).
> قاعدة الجولة: لا build ولا dev ولا vitest — التزمت بها (لم أُشغّل `bundle-report.mjs` لأنه يتطلب `.next` من بناء سابق — انظر §4.3).

---

## الملخص التنفيذي

| البند | الحصيلة |
|---|---|
| ثغرات (prod فقط) | **صفر** (audit نظيف، exit 0) |
| ثغرات (كامل الشجرة prod+dev) | **صفر** (audit نظيف، exit 0) |
| تحديثات PATCH آمنة متاحة | **8 فورية + 1 مشروطة (sharp تحت override)** |
| تحديثات MINOR منخفضة المخاطر | 12 (أبرزها prisma 7.8.0→**7.10.0 stable** وnext 16.2.12→16.3.4) |
| MAJOR/RC ممنوعة هذه الجولة | 7 (أخطرها: وسم `latest` لـprisma = **8.0.0-rc.13** — فخ RC مؤكد مجدداً) |
| درع سلسلة التوريد `minimumReleaseAge` | **1440 قائم ومُتحقَّق فعلياً أثناء التثبيت** (دليل حي) + عقد اختبار قفل |
| سكربتات تثبيت غير مأذونة | **صفر** (4 حزم فقط في الشجرة كلها، جميعها في allowBuilds) |
| تناسق القفل مع package.json | **متوافق** (dry-run مجمّد: «لا تغييرات») + ملاحظة تجميلية واحدة (sharp) |
| أوزان public/ | **908,620 بايت (887 KB)** — 15 ملفاً — الجدول في §4.1 |
| تبعيات غير مستعملة | **1**: wait-on (dev، مثبتة 9.1.0) — كل تبعيات prod الـ22 مستعملة |

---

## 1) التدقيق الأمني (pnpm audit)

الأوامر الفعلية وتواترها:

```
corepack pnpm audit --prod  →  «No known vulnerabilities found» · EXIT=0
corepack pnpm audit         →  «No known vulnerabilities found» · EXIT=0
```

تفصيل البيانات الوصفية (بصيغة `--json`):

| النطاق | dependencies | devDependencies | optionalDependencies | الإجمالي | ثغرات (info/low/mod/high/crit) |
|---|---|---|---|---|---|
| `--prod` فقط | 204 | 0 | 83 | 287 | **0/0/0/0/0** |
| كامل (prod+dev) | 250 | 452 | 143 | 739 | **0/0/0/0/0** |

**الفرق dev/prod**: لا فرق في الثغرات إطلاقاً — الشجرتان (287 مدخلاً إنتاجياً مقابل 739 كاملة) كلتاهما نظيفتان من GitHub/npm advisories بتاريخ الفحص. سلسلة r86-D7/r88-B8 (overrides الأمنية: fast-uri، mysql2، browserslist، brace-expansion، js-yaml) أبقت الرصيد صفراً كما في خط الأساس aec233ba.

> لا CVEs لتوثيقها — جدول الثغرات فارغ بامتياز (رابع جولة تقريبية متتالية؟ انظر §7 للمراقبة الدورية).

---

## 2) جرد التحديثات (pnpm outdated + dist-tags + أوقات النشر)

**ملاحظة منهجية أولاً**: `corepack pnpm outdated` أظهر عمود Current كله «missing» لأن الـnode_modules المحلي بتخطيط npm مسطح (§6.3) بلا بيانات وصفية لـpnpm — **ليس عيباً في المشروع**. استخرجت الإصدارات «الحالية» من `pnpm-lock.yaml` (مصدر الحقيقة المتتبع في git) وتحققت من مطابقتها للإصدارات المثبتة فعلياً لـ18 حزمة مفتاحية (§6.3) — **متطابقة كلها**.

### 2.1 الجدول الكامل (الحالي من القفل · الأحدث من registry · تاريخ نشر الإصدار الأحدث — كلها تمر بوابة 24 ساعة)

| الحزمة | الحالي (مقفل) | الأحدث | نوع الفرق | نُشر الأحدث | الحكم |
|---|---|---|---|---|---|
| react | 19.2.4 | 19.2.8 | PATCH | 2026-07-21 (48 يوم) | ✅ مرشح فوري |
| react-dom | 19.2.4 | 19.2.8 | PATCH | 2026-07-21 | ✅ مرشح فوري |
| sonner | 2.0.7 | 2.0.8 | PATCH | 2026-08-09 | ✅ مرشح فوري |
| zustand | 5.0.14 | 5.0.15 | PATCH | 2026-08-13 | ✅ مرشح فوري |
| @types/react (dev) | 19.2.17 | 19.2.18 | PATCH | 2026-07-30 | ✅ مرشح فوري |
| @types/react-dom (dev) | 19.2.3 | 19.2.7 | PATCH | 2026-09-03 (5 أيام) | ✅ مرشح فوري |
| tailwindcss (dev) | 4.3.2 | 4.3.3 | PATCH | 2026-07-16 | ✅ مرشح فوري |
| @tailwindcss/postcss (dev) | 4.3.2 | 4.3.3 | PATCH | 2026-07-16 | ✅ مرشح فوري |
| sharp | 0.35.3 | 0.35.4 | PATCH | 2026-08-26 | ⚠️ مرشح **مشروط**: يتطلب تعديل override `sharp: 0.35.3` في pnpm-workspace.yaml (خارج نطاق «فوري») |
| prisma | 7.8.0 | **8.0.0-rc.13** | **RC/MAJOR** | (وسم latest) | 🚫 **ممنوع** — انظر §2.2 |
| @prisma/client | 7.8.0 | 7.10.0 | MINOR | 2026-08-25 | 🔶 بعد اختبار (مع CLI) |
| @prisma/adapter-pg | 7.8.0 | 7.10.0 | MINOR | 2026-08-25 | 🔶 بعد اختبار (مع CLI) |
| next | 16.2.12 | 16.3.4 | **MINOR** (ليس patch) | 2026-08-31 | 🔶 بعد اختبار — انظر §2.3 |
| eslint-config-next (dev) | 16.2.12 | 16.3.4 | MINOR | 2026-08-31 | 🔶 يتحرك مع next بالقفل lockstep |
| pg | 8.22.0 | 8.23.0 | MINOR | 2026-08-08 | 🔶 بعد اختبار (سائق DB) |
| @types/pg (dev) | 8.21.0 | 8.23.1 | MINOR | 2026-08-17 | 🔶 بعد اختبار |
| lucide-react | 1.24.0 | 1.41.0 | MINOR ×17 | 2026-09-04 (4 أيام) | 🔶 انجراف كبير (17 minor) — اختبار UI مطلوب |
| @base-ui/react | 1.6.0 | 1.8.0 | MINOR ×2 | 2026-09-04 | 🔶 بعد اختبار |
| @vercel/blob | 2.6.1 | 2.8.0 | MINOR ×2 | 2026-08-10 | 🔶 بعد اختبار |
| @playwright/test (dev) | 1.61.1 | 1.63.0 | MINOR ×2 | 2026-09-04 | 🔶 بنية اختبار — موجة مستقلة |
| zod | 4.3.6 | 4.5.4 | MINOR | 2026-08-29 | 🚫 **محجوب بقرار**: override `zod: 4.3.6` + عقد اختبار r93 «لا تلمس» |
| typescript (dev) | 5.9.3 | 7.0.2 | MAJOR | — | 🚫 ممنوع (TS7 = مترجم Go أصلي) |
| eslint (dev) | 9.39.5 | 10.10.0 | MAJOR | — | 🚫 ممنوع — **و9.39.5 Deprecated الآن** (§7) |
| vitest / @vitest/coverage-v8 (dev) | 4.1.10 | 5.0.0 | MAJOR | — | 🚫 ممنوع |
| knip (dev) | 5.46.4 | 6.34.0 | MAJOR | — | 🚫 ممنوع — مثبت عمداً (v6 ينهار على oxc-parser — r90-F6) |
| motion | 12.43.0 | 13.2.0 | MAJOR | — | 🚫 ممنوع (محرك حركة) |
| @types/node (dev) | 20.19.43 | 26.4.1 | MAJOR | — | 🚫 ممنوع — ولاحظ §7: types 20 مقابل engines node≥24 |
| @vercel/analytics | 2.0.1 | 2.0.1 | — | — | محدث (لا شيء) |
| class-variance-authority | 0.7.1 | 0.7.1 | — | — | محدث |
| clsx | 2.1.1 | 2.1.1 | — | — | محدث |
| next-themes | 0.4.6 | 0.4.6 | — | — | محدث |
| qrcode | 1.5.4 | 1.5.4 | — | — | محدث |
| @types/qrcode (dev) | 1.5.6 | 1.5.6 | — | — | محدث |
| tailwind-merge | 3.6.0 | 3.6.0 | — | — | محدث |
| tw-animate-css | 1.4.0 | 1.4.0 | — | — | محدث |
| axe-core (dev) | 4.13.0 | 4.13.0 | — | — | محدث |
| wait-on (dev) | 9.1.0 | 9.1.0 | — | — | محدث — **لكنه غير مستعمل أصلاً** (§4.4) |

**عدّ التبعيات المباشرة**: 22 prod + 16 dev = **38** (مطابقة 1:1 مع قسم `importers` في القفل).

### 2.2 prisma — تأكيد جديد للدرس التاريخي (RC!)

فحص `corepack pnpm view prisma dist-tags --json`:

| الوسم | الإصدار |
|---|---|
| **latest** | **8.0.0-rc.13** ← **RC! هذا ما سيسحبه أي `pnpm update prisma` أعمى أو `@latest`** |
| prev | **7.10.0** ← **أحدث stable فعلياً** |
| next | 8.0.0-rc.10 |
| dev / integration / patch-dev | 8.0.0-rc.13-dev.92 / 7.10.0-integration-fix… / 7.9.1-dev.1 |

- **البقاء الحالي: 7.8.0 صحيح** (لا حاجة لإجراء أي شيء هذه الجولة — قرار المؤجل مبرر).
- **الترقية الآمنة الوحيدة المستقبلية**: تثبيت صريح `7.10.0` للأسر الثلاث (prisma + @prisma/client + @prisma/adapter-pg) — **نفس الإصدار الثلاثي إلزامي** — مع اختبار migrate deploy محلياً أولاً (الحزم الثلاث نُشرت 2026-08-25، عمرها 14 يوماً — تمر بوابة 24 ساعة).
- أي أمر يلامس prisma يجب أن يتجنب `latest` و`^8` و`^` غير المقيدة العلوياً — **هذا هو فخ r93 نفسه، ما زال قائماً بتاريخ اليوم**.

### 2.3 next — فرق MINOR لا PATCH

- الحالي: **16.2.12** (مثبت حرفياً في package.json والقفل) · الأحدث stable: **16.3.4** (وسم `latest`).
- `pnpm view next versions`: سلسلة 16.2.x تنتهي عند **16.2.12** (لا يوجد 16.2.13) ثم 16.3.0→16.3.4 → **الفرق MINOR (16.2→16.3) وليس patch**.
- إن قُررت الترقية (موجة مستقلة): يجب تحريك `next` و`eslint-config-next` **معاً** (كلاهما مثبت 16.2.12 حرفياً — lockstep موثق) + تشغيل e2e كامل + فحص بصمات الوكيل A (og-default وأحجام chunks) قبل/بعد.

---

## 3) سلسلة التوريد

### 3.1 درع النشرات الفتية (minimumReleaseAge) — قائم ومتحقق حياً

- `pnpm-workspace.yaml:13` → `minimumReleaseAge: 1440` ✅ (مفتاح جذر، غير معلق، القيمة نفسها الموثقة r86/r90/r93).
- `minimumReleaseAgeExclude: hono@4.13.3` — الاستثناء المعلن الوحيد (نشط لأن البوابة مفعلة).
- **دليل حي من هذا التفتيش**: أثناء `pnpm install --frozen-lockfile --dry-run` طبع pnpm:
  `✓ Lockfile passes supply-chain policies (739 entries in 13.7s)` — أي أن البوابة **تتحقق فعلياً من كل مدخلات القفل** عند كل تثبيت، لا مجرد مفتاح صامت.
- **اختبار القفل الحامي**: `tests/unit/r93-supply-chain-shield.test.ts` (وجدته بـrg) — 3 عقود صارمة على النص الخام:
  1. `^minimumReleaseAge:\s*1440\s*$` كجذر (تعليقه/إزاحته/حذفه يكسر العقد — «فقد مرة!»)
  2. بقاء `hono@4.13.3` في قائمة الاستبعاد
  3. بقاء override `zod: 4.3.6` (قائمة «لا تلمس»)
  → **الدرع محمي من الفقد مجدداً كما أعادته r93-W2-b** — تحققت منه قراءة كاملة للملف.

### 3.2 سكربتات دورة الحياة (خطر تنفيذ عند التثبيت)

مسحت **كل** node_modules (node_modules/* وnode_modules/@*/*) بحثاً عن preinstall/install/postinstall:

| الحزمة | الإصدار | السكربت | التصنيف |
|---|---|---|---|
| prisma (مباشرة) | 7.8.0 | `preinstall: node scripts/preinstall-entry.js` | **الوحيدة المباشرة** — نقطة الامتياز الأعلى (تعمل قبل اكتمال الحزمة)؛ مورد موثوق، إصدار مقيد ^7.8.0 + بوابة عمر — خطر مقبول وموثق |
| @prisma/engines (انتقالية) | 7.8.0 | postinstall | مأذونة |
| esbuild (انتقالية) | 0.28.1 | postinstall | مأذونة |
| unrs-resolver (انتقالية) | 1.12.2 | postinstall | مأذونة |
| **المجموع في الشجرة كلها** | | | **4 حزم فقط — جميعها في allowBuilds** |

- `allowBuilds` في pnpm-workspace.yaml = قائمة سماح من 5: `@prisma/engines, esbuild, prisma, sharp, unrs-resolver` → **صفر سكربتات تنفيذية خارج المأذون** (pnpm يمنع ما عداها افتراضياً).
- ملاحظة تجميلية: **sharp** مذكورة في allowBuilds لكن sharp 0.35.3 **لا يحمل أي سكربت تثبيت** (الثنائيات انتقلت إلى optionalDependencies ضمن @img/*) — إبقاء السماح لها بلا ضرر (وربما ضروري لإصدارات أقدم).
- qrcode وnext يحملان `prepublish` فقط — **لا يعمل عند تثبيت المستهلك** (npm 7+ سلوك) — ليس خطراً.

### 3.3 overrides الأمنية (كلها موثقة بتعليق سبب في الملف)

15 إدخالاً: zod 4.3.6 (تثبيت عام) · `knip>zod ^3.25.76` (استثناء r90-F6 لكي يبني knip CLI) · postcss 8.5.26 · nanoid ^3.3.18 · hono ^4.13.3 · @hono/node-server · fast-uri ^3.1.6 (SSRF — r86-D7) · browserslist ^4.28.7 (OOM — r86-D7) · mysql2 ^3.23.1 (auth-downgrade — r86-D7) · deepmerge-ts · valibot · sharp 0.35.3 · brace-expansion ×2 وjs-yaml (r88-B8 — سلسلة eslint dev).
**أثر جانبي موثق ومقصود**: `pnpm peers check` يظهر unmet peer واحداً: `zod-validation-error@3.5.4` يريد zod 4.3.6 ويجد 3.25.76 (جذور knip) — **متوقع ومقصود (r90-F6)، dev-tooling فقط، صفر أثر إنتاجي**.

---

## 4) الحزمة والأصول (تحليل استاتيكي فقط)

### 4.1 جرد public/ الكامل — المجموع 908,620 بايت = 887 KB (du -sh: 944K بالبلوكات)

| الأصل | الحجم (بايت) | ملاحظات |
|---|---|---|
| **fonts/** (10 ملفات) | **451,703** | noto-sans-arabic 165,960 · noto-naskh-arabic 94,032 · cairo-latin 33,644 · cairo-arabic 30,712 · readex-pro-latin 31,428 · noto-sans-arabic-latin 31,416 · readex-pro 22,864 · noto-naskh-latin 19,696 · cairo-latin-ext 16,632 · fonts.css 5,319 |
| **video/promo.mp4** | **153,895** | ⚠️ **حمولة ميتة**: صفر مراجع في src/ — يحرسها اختبار فقط (team10-regression-guard:154 + proxy-matcher.test:44) — يؤكد نتيجة الوكيل A |
| video/promo-poster.webp | 9,838 | كذلك: مرجع في الاختبارات فقط، لا src/ |
| main21.webp | 122,152 | مستعمل (ShowcaseSection.tsx) · كاش immutable سنة (r92-D3) |
| hero-phone.webp | 77,360 | مستعمل (HeroSection.tsx) · كاش 1ي+SWR أسبوع |
| og-default.png | 38,396 | **مطابق بالبايت** لقياس الإنتاج عند الوكيل A (38,396B) |
| icon-512.png | 19,903 | 7 أيام + SWR |
| apple-touch-icon.png | 8,299 | |
| icon-192.png | 8,149 | |
| sw.js | 6,126 | |
| brand-icon.png | 6,685 | ⚠️ بلا قاعدة كاش ( الوكيل A: max-age=0) — خارج نطاقي لكنه أصل |
| favicon.png | 2,344 | |
| offline.html | 1,986 | |
| manifest.json | 1,663 | |
| robots.txt | 121 | |

- مجلدا الفرز: `public/fonts` (464K بالبلوكات) و`public/video` (168K) — لا مجلدات أخرى (لا /animations — حذفت r87-C2).
- **قرار معلق للمالك** (موجّه من A وF معاً): حذف promo.mp4+promo-poster.webp (~164KB من الحزمة الإنتاجية ومن الحزمة الإنتاجية standalone المنسوخة في postbuild) يوفر نحو 18% من public/ — لكنه **مقيد باختبار team10** يجب تعديله أولاً.

### 4.2 تحسينات next.config.ts — الحالة

| الإعداد | الحالة | القيمة |
|---|---|---|
| output | ✅ مفعّل | `standalone` (حزمة خادم مكتفية — postbuild ينسخ static+public إليها) |
| compress | ✅ مفعّل | true (gzip خادم/CDN) |
| images | ✅ مفعّل | avif+webp · remotePatterns allow-list (unsplash/vercel-storage) · deviceSizes 5 قيم · imageSizes 8 قيم |
| headers() | ✅ مفعّل | أمان شامل (nosniff/XFO/Referrer/Permissions/COOP/CORP) + HSTS على Vercel فقط + 6 قواعد كاش تفاضلية (fonts/video/main21: immutable سنة؛ og/hero: يوم+SWR؛ icon-512: أسبوع+SWR) |
| poweredByHeader | ✅ معطل | false |
| reactStrictMode | ✅ مفعّل | true |
| experimental.optimizePackageImports | ✅ مفعّل | lucide-react, @base-ui/react, sonner (يخفف وزن شجرة الاستيراد — مهم مع 96 ملفاً يستورد lucide) |
| experimental.cpus | ✅ مقيد محلياً | 2 (يجنّب إغراق قاعدة البناء Neon) — Vercel يبقى الافتراضي |
| outputFileTracing | غير مضبوط | افتراضي Next (يعمل تلقائياً مع standalone — لا حاجة لضبط يدوي) |
| turbopack.root | ✅ | process.cwd() |
| مُحلل الحزمة الرسمي | ❌ غير موجود | لا @next/bundle-analyzer — البديل المحلي bundle-report.mjs (§4.3) |

**التقييم**: كل مفاتيح التحسين الجوهرية مفعلة أو مضبوطة بقصد موثق بالتعليقات (r85-B4/B7، r89-B2، r92-D3). لا يوجد إعداد معطل بغير سبب.

### 4.3 scripts/bundle-report.mjs — كيف يعمل (لم أشغّله)

- **صفر تبعيات**: يستخدم فقط `node:fs`, `node:path`, `node:zlib` (gzipSync level 9), `node:process` — يعمل بأي node ≥ بلا تثبيت.
- **آلية**: يمشي على `.next/static/chunks/**/*.js` (walkJsFiles) → لكل chunk: حجم خام + حجم gzip + فحص 7 تواقيع minification لمحرك motion/framer (MotionHandoffIsComplete, ProjectionNode…) → جدول مفروز بgzip + إجماليات + كتل motion — خيارات `--json out.json` (لقطة) و`--compare before.json` (دلتا).
- **القيد**: يحتاج **بناءً سابقاً** — محلياً `.next` غير موجود → سيخرج exit 1 برسالة «run npm run build first». لذا **لم أشغّله** (قاعدة الجولة: لا build). يمكن للوكيل/الموجة التنفيذية تشغيله بعد أول build (سطر واحد: `node scripts/bundle-report.mjs`).
- لا يعدل شيئاً (قراءة + كتابة JSON عند الطلب فقط) — آمن للـCI كخطوة ما بعد build.

### 4.4 أوزان التبعيات والاستعمال (38 مباشرة)

فحص rg لكل التبعيات prod الـ22 في src/scripts/tests + تحقق موضعي للمفردة منها:

| الحزمة | مراجع في الكود | الحكم |
|---|---|---|
| lucide-react | 96 ملفاً | مستعملة بكثافة |
| motion | 120 ملفاً | الأكثر استيراداً |
| @prisma/client | 30 ملفاً | + pg: 60 · zod: 59 · @base-ui/react: 8 · sonner: 8 · next-themes: 9 · qrcode: 6 · @vercel/blob: 4 · @vercel/analytics: 4 · @prisma/adapter-pg: 2 · class-variance-authority: 2 · tailwind-merge: 2 · sharp: 2 |
| clsx | 1 ملف | ✅ حقيقي: `src/lib/utils.ts:1` (مساعد cn لshadcn) |
| tw-animate-css | 1 ملف | ✅ حقيقي: `src/app/globals.css:18` (@import CSS) |
| zustand | 1 ملف | ✅ حقيقي: `src/store/cart.ts:2-3` (create + persist) |
| **wait-on (dev)** | **صفر في الكود النشط** | 🚩 **غير مستعملة**: لا playwright.config (لا webServer أصلاً) ولا سكربتات ولا tests تشير إليها — فقط وثائق تاريخية (خطط r86/r87) — **مرشح إزالة** (dev فقط، صفر أثر إنتاجي؛ إزالتها تنقص القفل) |
| axe-core / knip | tests/e2e/round79 · knip.config.ts + سكربت | مستعملتان عبر بنية الاختبار/الأدوات |

(متقاطع مع knip r90-F6 للوكيل C: 21 سكربت جولات غير مستخدمة + dotenv unlisted في prisma.config.ts — لا تعارض مع نتائجي.)

---

## 5) تناسق القفل (pnpm-lock.yaml ↔ package.json)

### 5.1 الفحص الرئيسي — dry-run مجمّد (مدعوم في pnpm 11)

```
corepack pnpm install --frozen-lockfile --dry-run
→ ✓ Lockfile passes supply-chain policies (739 entries in 13.7s)
→ resolved 739, downloaded 0, added 0, done
→ EXIT=0
→ «Dry run complete. pnpm-lock.yaml is up to date; a real install would make no changes.»
```

- **الدعم مؤكد**: `pnpm help install` يوثق `--dry-run` («Report what an install would change») — استخدمته بدل تثبيت فعلي.
- **لم يُلمس شيء**: git status بعده = نظيف (لا تغيير على القفل ولا tracked files — فقط تعديلات وكلاء آخرين سابقة لي: pg-local-start.sh + تقارير a/b/c غير المتتبعة).
- تحذيران فقط أثناء الفحص: deprecated **eslint@9.39.5** («This version is no longer supported» — سلسلة 9.x خرجت من الدعم) وsubdependency مهجورة واحدة: **@snyk/github-codeowners@1.1.0** (داخل شجرة knip — dev فقط).

### 5.2 تحقق يدوي برمجي (22+16 محدداً)

قارنت كل محدد specifier في package.json مع قسم `importers` في القفل (python، النص الخام): **تطابق كامل 38/38 عدا واحدة**:

| الحزمة | package.json | القفل (specifier) | الأثر |
|---|---|---|---|
| sharp | `^0.35.3` | `0.35.3` (بلا ^) | **حميد**: 0.35.3 يحقق ^0.35.3، وoverride `sharp: 0.35.3` يثبّت التحديد على أي حال، وfrozen dry-run نجح بلا اعتراض. السبب تاريخياً: القفل من 69fcb613 (كان تثبيتاً حرفياً) ثم 925213b5 أضاف ^ إلى package.json **بلا إعادة قفل**. أي `pnpm install` غير مجمّد مستقبلاً سيحدّث سطر المحدد فقط (churn تجميلي، لا تغيير إصدار). |

### 5.3 فحص peers

`corepack pnpm peers check` → unmet peer واحد: zod-validation-error@3.5.4 (يريد zod 4.3.6، يجد 3.25.76 داخل جذور knip بسبب carve-out r90-F6). **مقصود وموثق — dev-tooling فقط.**

---

## 6) ملاحظات بيئة التفتيش (لا علاقة لها بالمستودع)

### 6.1 node_modules محلي بتخطيط npm
لا يوجد `node_modules/.pnpm` ولا `.modules.yaml`، و`.npmrc` يحوي `legacy-peer-deps=true` (راية npm) — أي أن المثيل المحلي ثُبت بتخطيط مسطح (480 مجلداً جذرياً)، وهذا سبب «missing» في عمود Current بpnpm outdated. **تحققت من تعويض ذلك**: قرأت الإصدارات المثبتة فعلياً لـ18 حزمة مفتاحية (react/prisma/next/sharp/zod/lucide/motion/pg/zustand/sonner/@base-ui/eslint/typescript/vitest/knip/tailwindcss/@prisma/client/react-dom) — **كلها تطابق القفل بايتاً بايتاً** (مثل next 16.2.12، prisma 7.8.0، react 19.2.4، zod 4.3.6). node_modules متجاهَل في git (gitignored) — CI/Vercel يثبتان بpnpm الحقيقي: **ليس عيباً مشروعياً**، لكن وكلاء الجولات القادمة يجب أن يعرفوا أن أوامر node_modules-metadata (outdated/some/why) سترى «missing».

### 6.2 أداء registry
بطء ملحوظ في بعض استعلامات registry (تحذيرات «Request took 10-29s» لnext وprisma) — بلا أثر على النتائج.

### 6.3 بطاقة القفل
lockfileVersion 9.0 · autoInstallPeers: true · 739 مدخلاً (250 prod / 452 dev / 143 optional في audit).

---

## 7) جدول المرشحين للتحديث بالأولوية (للموجة التنفيذية — خارج نطاق هذه الجولة)

| # | المرشح | من → إلى | الفئة | الأولوية | الشروط/التحذيرات |
|---|---|---|---|---|---|
| 1 | react + react-dom | 19.2.4 → 19.2.8 | PATCH | **فورية** (موجة قادمة) | تعديل التثبيت الحرفي في package.json (specifier 19.2.4 exact) — نشر 2026-07-21 (48 يوماً) — يمر بوابة 24 ساعة بسهولة |
| 2 | sonner | 2.0.7 → 2.0.8 | PATCH | فورية | ^ موجود — يكفي pnpm update مقيّد |
| 3 | zustand | 5.0.14 → 5.0.15 | PATCH | فورية | ^ موجود |
| 4 | @types/react | 19.2.17 → 19.2.18 | PATCH (dev) | فورية | ^ موجود |
| 5 | @types/react-dom | 19.2.3 → 19.2.7 | PATCH (dev) | فورية | ^ موجود |
| 6 | tailwindcss + @tailwindcss/postcss | 4.3.2 → 4.3.3 | PATCH (dev) | فورية | تتحركان معاً (نفس الإصدار المنسق) |
| 7 | sharp | 0.35.3 → 0.35.4 | PATCH | **مشروطة** | يتطلب تعديل override `sharp: 0.35.3` أيضاً (ثلاثي: package.json + override + قفل) + sharp في allowBuilds |
| 8 | prisma ×3 (CLI+client+adapter) | 7.8.0 → **7.10.0** | MINOR | موجة مستقلة بعد اختبار | ⚠️ **تثبيت حرفي 7.10.0 للأسر الثلاث معاً** — ممنوع latest/^8 (latest=8.0.0-rc.13!) — اختبار migrate deploy + generate + تشغيل الاختبارات الدخانية قبل الدفع |
| 9 | next + eslint-config-next | 16.2.12 → 16.3.4 | MINOR | موجة مستقلة بعد اختبار | lockstep معاً (كلاهما pinned 16.2.12) + e2e كامل + مقارنة بصمات الأداء (A) — الفرق minor 16.2→16.3 لا patch |
| 10 | pg | 8.22.0 → 8.23.0 | MINOR | بعد اختبار | سائق DB الإنتاجي — أعد تشغيل اختبارات DB محلياً |
| 11 | @base-ui/react · @vercel/blob · @types/pg | → 1.8.0 / 2.8.0 / 8.23.1 | MINOR | بعد اختبار | نافذة مخاطر منخفضة |
| 12 | lucide-react | 1.24.0 → 1.41.0 | MINOR ×17 | بعد اختبار UI | انجراف API كبير نسبياً (optimizePackageImports يحمي الحجم لا التوافق) |
| 13 | @playwright/test | 1.61.1 → 1.63.0 | MINOR (dev) | موجة بنية الاختبار | قد يرافق موجة الاختبارات (الوكيل E) |
| 14 | **إزالة wait-on** | حذف devDep | تنظيف | فورية بلا خطر | صفر مراجع نشطة — يصغر القفل — إزالة سطر واحد من package.json |
| 15 | 🚫 typescript 7 · eslint 10 · vitest 5 · knip 6 · motion 13 · @types/node 26 · prisma 8-rc | — | MAJOR/RC | **ممنوعة هذه الجولة** | خطر عالٍ — تفرد بموجات مخصصة مع خطط ترحيل |

**توصية إضافية للمراقبة**: eslint@9.39.5 أصبح **Deprecated رسمياً** (تحذير التثبيت) مع توفر 10.10.0 — بلا ثغرات لكن خارج نطاق الدعم؛ ادرجه في خارطة الترقيات المستقبلية (major مستقبلاً مع eslint-config-next). و@types/node ما زال على ^20 بينما engines = node≥24 — أنواع أقل من زمن التشغيل (ملاحظة دقة لا خلل).

---

## 8) خلاصة الإحالة إلى المنسق

1. **لا يوجد أي إجراء أمني عاجل**: صفر ثغرات، درع التوريد يعمل ويُتحقق منه حياً، صفر سكربتات تنفيذ غير مأذونة، القفل متوافق.
2. **بنك المرشحين جاهز**: 8 PATCH فورية + 9 مشروطة/organizational (prisma 7.10.0 بثلاثي الأسر، next 16.3.4 lockstep) — التنفيذ موجة إصلاح مستقلة بعد اعتماد المنسق، مع قاعدة ذهبية: **prisma بلا latest أبداً**.
3. **تنظيف صفري المخاطر**: إزالة wait-on، وقرار المالك بشأن promo.mp4 (يوفر 164KB من الحزمة standalone — مقيد باختبار team10).
4. موعد `bundle-report.mjs`: بعد أول build للجولة (وكيل التنفيذ) — سطر واحد.
