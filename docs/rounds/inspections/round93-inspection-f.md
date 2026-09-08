# تقرير التفتيش 1-f — تدقيق التبعيات وسلسلة التوريد (الجولة 93)

> **الوكيل**: 1-f «مدقق التبعيات وسلسلة التوريد» · **التاريخ**: 2026-09-07 15:30–16:10 UTC
> **النطاق**: package.json · pnpm-lock.yaml · pnpm-workspace.yaml · node_modules · knip · env.example
> **القاعدة**: تدقيق فقط — لم يُعدَّل أي ملف (عدا هذا التقرير وسجل العمل)، لم تُثبَّت/تُحدَّث أي حزمة، لم يُشغَّل build/dev.

---

## الخلاصة التنفيذية

| # | النتيجة | الخطورة | الحالة |
|---|---------|---------|--------|
| 1 | **حماية `minimumReleaseAge` (24h) غير مفعّلة فعليًا** — المفتاح مفقود من pnpm-workspace.yaml (بقي `minimumReleaseAgeExclude` الأجوف فقط) | **حرجة (سلسلة توريد)** | تحتاج إصلاحًا بسطر واحد |
| 2 | **تلوث bun في node_modules**: ~1.1GB من أصل 2.0GB بقايا من غزو 14:58 (25 مجلد `.ignored_*` + 446 مجلدًا مرفوعًا حقيقيًا + `.package-map.json`) | عالية (سلامة/قرص) | تحتاج تنظيفًا مدروسًا |
| 3 | `pnpm audit` نظيف تمامًا (إنتاج + dev) وكل الـ overrides موثّقة التطبيق في القفل | ✅ سليم | — |
| 4 | `prisma@latest` على npm يشير إلى **RC** (8.0.0-rc.13) — أي `update` أعمى سيلتقطها | متوسطة (تحذير منهجية) | تحذير تشغيلي |
| 5 | فجوة توثيق env: `RATE_LIMIT_TEST_RELAX` مستخدم في كود الإنتاج بلا ذكر في .env.example | منخفضة | توثيق |
| 6 | فحوصات التقادم/knip/التراخيص/الأثر التنفيذي: كلها بحالة مقبولة | ✅ | — |

---

## 1) التدقيق الأمني

### 1.1 نتائج الفحص

```
corepack pnpm audit --prod   → No known vulnerabilities found
corepack pnpm audit           → No known vulnerabilities found (يشمل dev)
```

**صفر ثغرات معروفة** في شجرة القفل كاملة (705 حزمة في .pnpm). لا توجد أي ثغرة عالية بلا override — لا شيء أصلًا.

### 1.2 التحقق أن الـ overrides فُعِّلت فعلًا (مقارنة pnpm-workspace.yaml ↔ pnpm-lock.yaml ↔ النسخ المثبتة)

| الحزمة (الهدف الأمني) | القيد في pnpm-workspace.yaml | المثبت في القفل | الحكم |
|---|---|---|---|
| zod | `4.3.6` | 4.3.6 (+ 3.25.76 في شجرة knip المنفصلة عمدًا) | ✅ |
| fast-uri (SSRF) | `^3.1.6` | 3.1.7 | ✅ |
| mysql2 (auth-downgrade/zlib) | `^3.23.1` | 3.24.3 | ✅ |
| brace-expansion (DoS ×2) | `^1.1.18` / `^5.0.9` | 1.1.18 و 5.0.9 | ✅ |
| js-yaml (quadratic omap) | `^4.3.1` | 4.3.2 | ✅ |
| browserslist (OOM/proto-write) | `^4.28.7` | 4.28.9 | ✅ |
| postcss / sharp / nanoid / valibot / deepmerge-ts / hono / @hono/node-server | مثبتة | 8.5.26 / 0.35.3 / 3.3.18 / 1.4.2 / 8.0.1 / 4.13.3 / مطابقة | ✅ |

قسم `overrides:` في رأس pnpm-lock.yaml (أسطر 7–22) مطابق حرفيًا لـ pnpm-workspace.yaml، وقيم الإصدارات المحلولة كلها فوق الحدود الأمنية. **الحماية الموثقة تعمل.**

> ملاحظة سياق: نص الرسالة «✓ Lockfile passes supply-chain policies» عند التثبيت تعني فقط `allowBuilds` (لا يوجد عنصر سياسة آخر — انظر §3).

---

## 2) اكتشاف حرج — `minimumReleaseAge` غير مفعّلة

**الوثائق تقول** (سياق الجولة + SMART-MENU-ROUND86-PLAN D7 + docs/round90/diagnosis/cso-audit.md:18,97): الحماية مثبتة «نشر ≥ 24 ساعة».

**الواقع**: pnpm-workspace.yaml يحتوي التعليق الواصف للحماية لكن **المفتاح نفسه غير موجود** — الموجود فقط:

```yaml
minimumReleaseAgeExclude:
  - hono@4.13.3
```

قائمة الاستبعاد بلا `minimumReleaseAge: 1440` = **صفر تأثير** (التعليق نفسه يصفها بأنها inert). كما أن `corepack pnpm config get minimumReleaseAge` = undefined، و`.npmrc` لا يحويها، و`node_modules/.modules.yaml` يسجّل `allowBuilds` فقط بلا أي سياسة نشر.

### الدليل التجريبي (اختبار محكوم في /tmp — لم يمسّ المشروع)

اختُبرت الحزمة `@types/node@26.5.0` المنشورة **قبل ساعة وربع فقط** من الفحص (2026-09-07T14:07Z):

- **الاختبار A** — نسخة pnpm-workspace.yaml الحالية كما هي: `pnpm install --dry-run` حلّ الحزمة بلا أي اعتراض. → **الحماية لا تعمل.**
- **الاختبار B (المجموعة الضابطة)** — نفس الملف + `minimumReleaseAge: 1440`: رفض pnpm الحل فورًا:
  `[ERR_PNPM_NO_MATURE_MATCHING_VERSION] @types/node@26.5.0 was published … within the minimumReleaseAge cutoff` → **الآلية تعمل عند وجود المفتاح.**

**الاستنتاج**: المفتاح فُقد على الأرجح أثناء تخريب جلسة r92 / إعادة تهيئة r93 (الـ overrides نفسها بقيت لأنها في git). **الإصلاح المطلوب**: إضافة `minimumReleaseAge: 1440` فوق `minimumReleaseAgeExclude` في pnpm-workspace.yaml (سطر واحد — خارج نطاقي: تدقيق فقط).

---

## 3) سلامة القفل (pnpm-lock.yaml)

```
corepack pnpm install --frozen-lockfile --dry-run
→ Dry run complete. pnpm-lock.yaml is up to date; a real install would make no changes.
```

- **القفل متزامن 100% مع package.json** (dry-run رسمي: لا تغييرات). الفارق الوحيد الظاهري `sharp: ^0.35.3` في package.json مقابل `0.35.3` في importers القفل هو **أثر الـ override نفسه** (pnpm يعيد كتابة المحدد بعد التطبيق) — سلوك متوقع لا انحراف.
- **لا نسخ قفل متنازعة**: لا bun.lock ولا bun.lockb ولا package-lock.json ولا yarn.lock — pnpm-lock.yaml (lockfileVersion 9.0، 7074 سطرًا) وحيد. ✅
- التحقق الشكلي: مستوردو القفل 22 dep + 16 devDep = مطابقون لـ package.json عدًا ومحتوى.
- تحذيرات جانبية من التثبيت الجاف: `eslint@9.39.5 deprecated` (سلسلة dev فقط، عادية لدعم EOL) + `@snyk/github-codeowners@1.1.0 deprecated` (تبعية عميقة عبر سلسلة nyc/coverage — dev فقط) + ملاحظة peer-dependencies عامة (موجودة منذ جولات، غير حاجزة).
- `.npmrc` يحوي `legacy-peer-deps=true` (خيار npm صرف؛ pnpm يستعمل `autoInstallPeers: true` المسجل في القفل — الخيار شبه معطّل بالنسبة لـ pnpm، ذكر للعلم فقط).

---

## 4) التقادم الحرج (22 تبعية إنتاج — مثبت ↔ أحدث npm)

⚠️ **تحذير منهجية أولًا**: وسم `latest` لحزمة **prisma** على npm يشير حاليًا إلى **8.0.0-rc.13 (نسخة RC!)** — بينما المستقر 7.x هو 7.10.0 (وسم `prev`). أي `pnpm update` أعمى أو `npm i prisma` قد يسحب RC. (مع غياب minimumReleaseAge لا يوجد صمام يمنع حتى نشرات عمرها ساعات.)

| الحزمة | مثبت | أحدث مستقر | الفجوة | التصنيف والمبرر |
|---|---|---|---|---|
| next | 16.2.12 | 16.3.4 | minor | **minor يُراجع** — 16.2.12 هو آخر 16.2.x بلا patch أنظف؛ القفزة 16.3 تحتاج جولة اختبار ISR/منيو (لا patch آمن متاح) |
| react / react-dom | 19.2.4 | 19.2.8 | 4 patch | **patch آمن** — لكنها مثبتة بدقة بلا `^` عمدًا (تزامن مع peer لـ next)؛ حدّث ضمن جولة مع tsc+e2e |
| prisma / @prisma/client / @prisma/adapter-pg | 7.8.0 | 7.10.0 | minor ×2 (7.9/7.10) | **minor يُراجع** — تحديث واحد متسق للمثلث؛ احذر وسم latest=RC أعلاه |
| zod | 4.3.6 (override) | 4.5.4 | minor ×2 | **minor يُراجع** — يتطلب رفع قيمة الـ override نفسها (لا مجرد تحديث) + إبقاء carve-out `knip>zod: ^3` |
| motion | 12.43.0 | 13.2.0 | **major** | **major مؤجل بمبرر موثق** — معمارية LazyMotion (domAnimation/domMax strict) مقاسة في r88-A1 بـ 5 بناءات؛ ترقية v13 تكسر أرضية القياس وتحتاج دراسة مستقلة |
| lucide-react | 1.24.0 | 1.42.0 | 18 minor | **minor يُراجع** — خطر منخفض (tree-shakeable) لكن راجع إزالات/تغييرات أيقونات عبر build |
| sharp | 0.35.3 (override) | 0.35.4 | patch | **patch آمن** — عبر تحديث قيمة override إلى 0.35.4 |
| pg | 8.22.0 | 8.23.0 | minor | **minor يُراجع** — خطر منخفض (سائق DB) |
| @vercel/blob | 2.6.1 | 2.8.0 | minor ×2 | **minor يُراجع** |
| @base-ui/react | 1.6.0 | 1.8.0 | minor ×2 | **minor يُراجع** (مكوّنات UI أساسية — شغّل e2e للسلة والحوارات) |
| sonner | 2.0.7 | 2.0.8 | patch | **patch آمن** |
| zustand | 5.0.14 | 5.0.15 | patch | **patch آمن** |
| hono (تبعية غير مباشرة) | 4.13.3 | 4.13.7 | patch | **patch آمن** — عبر تحديث القفل فقط (الـ override `^4.13.3` يسمح) |
| qrcode · next-themes · @vercel/analytics · clsx · class-variance-authority · tailwind-merge · tw-animate-css | — | = المثبت | 0 | **محدّثة تمامًا** ✅ |

**خلاصة التقادم**: لا يوجد أي patch أمني مستعجل (الـ audit نظيف). القيمة الحقيقية للتحديث: جولة واحدة تجمع (react 19.2.8 + sharp 0.35.4 + sonner + zustand + prisma 7.10) كدفعة «منخفضة المخاطر»، ودفعة منفصلة للـ minors (next 16.3 / @base-ui / lucide / @vercel/blob / zod) بعد اختبارات، وmotion 13 مؤجلة بقرار موثق.

---

## 5) knip — الكود الميت (`npx knip`، إعداد knip.config.ts)

- **تبعيات غير مستخدمة: 0** ✅ — قسم Unused dependencies غائب من الناتج كليًا. **ادعاء r92-D2 (12→0) مؤكد الآن.** (تبعيات الـ runtime/CSS الموثقة في `ignoreDependencies` — @prisma/client, sharp, tw-animate-css, tailwindcss, axe-core — مستثناة عمدًا وبمبرر).
- **ملفات غير مستخدمة: 24**:
  - 21 سكربتًا في `scripts/` (أغلبها أدوات جولات لمرة واحدة: round86–91 prod-verify/evidence, round88-perf/*, r91-check-premium, r92-compress-og, r92-prod-audit, bundle-report, image-health, qa-cleanup-check, render-og) — التوصية المنهجية المعتمدة (knip.config.ts): advisory أرشيفي لا بوابة CI.
  - **3 ملفات src ميتة فعلًا**: `src/hooks/useScrollProgress.ts` · `src/components/ui/VideoWrapper.tsx` · `src/components/ui/kinetic-text.tsx` — مرشحة للحذف في جولة تنظيف.
- **تصديرات غير مستخدمة: 55 تصديرًا + 45 نوعًا مصدَّرًا** — غالبها عناصر shadcn/ui فرعية غير مستهلكة (DialogTrigger, SheetFooter, CardTitle…) وأنواع داخلية؛ إشارات تنظيف تدريجي low-priority.
- **تبعية شبح (Unlisted): 1** — `dotenv/config` في `prisma.config.ts` وdotenv غير معلنة في package.json:
  - محليًا تُحل حاليًا عبر **نسخة bun المتخلفة** في جذر node_modules (§8) — أي أن عمل prisma CLI محليًا معلّق على تلوث bun!
  - على CI (pnpm نظيف) تعمل عبر سلسلة الرفع الخاص (`.pnpm/node_modules/dotenv` → تصلها آلية jiti/c12 في @prisma/config — CI أخضر على e68c2c1f منذ 10:28 يشهد).
  - **التوصية**: أضف `dotenv` إلى devDependencies (سطر واحد) — يزيل الاعتماد على الحظ والرفع.

---

## 6) الأثر التنفيذي — التبعيات الثقيلة client-side

| المكتبة | أين تُستورد | الحكم |
|---|---|---|
| **motion** | 25+ ملفًا (`m, AnimatePresence` من `motion/react`) | ✅ معمارية سليمة: LazyMigration r88-A1 — `LazyMotion domAnimation strict` يُركَّب مرة عبر `MotionProvider` في **كلا التخطيطين الجذريين** ((public) و(protected)) — هذا دخول app-wide **مقصود وموثق** بحزمة الميزات الصغيرة، و`strict` يرمي صراحةً لو ارتد أحد لاستخدام `motion.*` الكامل. domMax محصور في 4 مواضع layoutId فقط (NavLink/Header/CategoryTabs/action-search-bar). |
| **qrcode** | ملف واحد: `src/app/(protected)/owner/loyalty/ReferralQR.tsx` | ✅ **مستورد ديناميكيًا** (`import('qrcode')` داخل التأثير) — خارج حزم المسارات العامة، صفحة مالك فقط. خطر صفري على حزمة المشتركة. |
| **lucide-react** | ~15+ ملفًا، استيراد مسمّى واحد لكل ملف | ✅ قابل للتشذير عبر ESM؛ لا استيراد برميل. |
| **recharts/chart.js** | لا وجود للاستيراد في src أصلًا | ✅ لا مكتبة مخططات — Doughnut/Area/Spline ملفات SVG مخصصة (`chart-geometry.ts`) تستخدم `m` — نسخ chart.js الموجودة في node_modules هي **بقايا bun فقط** (§8). |
| sharp / pg / @vercel/blob / @prisma/client | server-side فقط | ✅ لا تدخل حزم العميل. |

**الخلاصة**: لا انحدار في الأثر التنفيذي؛ التصميم الحالي هو النمط الموصى به (feature-bundle + dynamic import + tree-shaking).

---

## 7) التراخيص — تبعيات الإنتاج المباشرة (22)

MIT (14): next, react, react-dom, motion, next-themes, pg, qrcode, sonner, tailwind-merge, tw-animate-css, zod, zustand, clsx, @vercel/analytics, @base-ui/react (15 مع base-ui)
Apache-2.0 (6): @prisma/adapter-pg, @prisma/client, prisma, @vercel/blob, class-variance-authority, sharp
ISC (1): lucide-react

**لا GPL/AGPL/أي رخصة copyleft** في التبعيات الإنتاجية المباشرة. ملاحظة صغيرة: Apache-2.0 يفرض إشعار NOTICE عند التوزيع الثنائي — غير ذي أثر على SaaS. المشروع نفسه `UNLICENSED` (خاص) — متسق.

---

## 8) نظافة node_modules — بقايا غزو bun (الاكتشاف الثاني بالخطورة)

`node_modules/.pnpm` نفسه نظيف (618 مجلدًا بأسماء pnpm القياسية: `@alloc+quick-lru@5.2.0`, `@babel+code-frame@7.29.7`, …)، **bun.lock محذوف ولا وجود له** ✅ — لكن الجذر ملوث:

| البقايا | الحجم | الدليل |
|---|---|---|
| 25 مجلد `.ignored_*` (axe-core, next, prisma, sharp, zod, typescript, motion, …) | **~312MB** | بصمة bun: ينقل مجلدات pnpm المتضاربة إلى `.ignored_<name>` — كلها بتوقيت **14:58** (لحظة انقطاع الجلسة) |
| 446 مجلدًا حقيقيًا (غير روابط) في جذر node_modules (axios, chart.js, framer-motion, tsx, lodash, rxjs, dotenv, hono…) | **~788MB** | bun يرفع كل التبعيات العميقة كنسخ حقيقية؛ `.modules.yaml` يسجل **صفر** رفع عام من pnpm → كلها ملك bun. tsx نفسها حُذفت من package.json في r86 (ميتة) |
| `.package-map.json` + `.cache`/`.vite*` | صغير | بصمة بيانات bun (بصمة الحزم المثبتة) + مخابئ أدوات |
| **الإجمالي** | **~1.1GB من 2.0GB (≈55%)** | — |

**ما هو سليم رغم ذلك** (تحقق تجريبي):
- كل الـ 25 رابطًا رمزيًا في الجذر = التبعيات المباشرة غير الموسّبة، وقد أعاد pnpm إنشاءها 15:15 وتشير كلها إلى `.pnpm/...` (مثال: `require.resolve('next')` → .pnpm/next@16.2.12). سلاسل الحل داخل .pnpm سليمة.
- نسخ bun الجذرية للحزم الأمنية الحساسة **مطابقة للحدود الآمنة** (postcss 8.5.26, browserslist 4.28.9, mysql2 3.24.3, brace-expansion 1.1.18, js-yaml 4.3.2, fast-uri 3.1.7, zod 4.3.6) — لا انزلاق إصداري خطر الآن (غالبًا لأن bun طبّق الـ overrides المكررة في package.json وقتها).
- النسخ الجذرية غير قابلة للوصول من سلاسل .pnpm العادية، فحُزَم البناء الحالي تسحب من شجرة pnpm — الاستثناء الموثّق: `dotenv` في prisma.config.ts (§5).

**الخطر المتبقي**: (أ) هدر قرصي كبير؛ (ب) غموض حل — أي استيراد شبح من جذر المشروع (كdotenv) سيجد نسخة bun لا نسخة pnpm؛ (ج) أدوات تفحص node_modules (فحوص أمن/تراخيص) ستفحص نسختين متوازيتين. **العلاج المقترح** (لجولة إصلاح، ليس الآن): `rm -rf node_modules && corepack pnpm install --frozen-lockfile` (مع إضافة dotenv إلى devDependencies أولًا وإلا انكسر prisma.config.ts محليًا — انظر §5) ثم التحقق أن البناء الأخضر يعيد إنتاجه.

---

## 9) اتساق .env.example ↔ src/lib/env.ts ↔ process.env في src

المتغيرات المستخدمة في src (rg، 25 مفتاحًا) قورنت بـ .env.example (13 موثقًا فعّالًا + 13 موثقًا معلّقًا اختياريًا) وenv.ts (مخطط zod):

| الفحص | النتيجة |
|---|---|
| متغير مستخدم في src وغير موثق | **`RATE_LIMIT_RELAX` موثّق ✓ لكن `RATE_LIMIT_TEST_RELAX` غير موثّق إطلاقًا** — يُقرأ في كود الإنتاج (src/lib/rate-limit.ts:49، يعمل حتى تحت NODE_ENV=production، ترخيص ×200!) ومضبوط في scripts/r92-e2e-local.sh وCI. يستحق سطرًا معلّقًا بتحذير «لا يُضبط على الإنتاج أبدًا». |
| متغير موثق وغير مستخدم | PORT (يقرأه next start ✓)، BLOB_READ_WRITE_TOKEN (تقرأه SDK @vercel/blob داخليًا ✓ — blob.ts يستعمل put/del بلا تمرير token)، WEBHOOK_URL/SHADOW_DATABASE_URL/SEED_*/PERF_DB_NAME (سكربتات ✓) — كلها متسقة. |
| إشارة ميتة | `SENTRY_DSN` تظهر فقط **كتعليق** في src/instrumentation.ts:9 ولا حزمة sentry في التبعيات — توثيق ميت بلا أثر (يحذَر فهمه كميزة قائمة). |
| env.ts ↔ .env.example | المخطط يتحقق من: DATABASE_URL (postgres فقط، ≥1) · JWT_SECRET ≥64 · NEXT_PUBLIC_DOMAIN (URL) · NEXT_PUBLIC_WHATSAPP_NUMBER · AUTH_SECRET ≥32 · اختيارية: TELEGRAM_BOT_TOKEN/CHAT_ID · DATABASE_SCHEMA · SKIP_ENV_CHECK — **كلها موثقة في .env.example بقيم استبدال صحيحة** ✅ |

---

## 10) التوصيات (مرتبة بالأولوية — للمنسّق)

1. **[حرجة — سطر واحد]** أضف `minimumReleaseAge: 1440` إلى pnpm-workspace.yaml فوق `minimumReleaseAgeExclude` (الدليل التجريبي A/B في §2) — يعيد تفعيل درع النشرات الفتية الموثق في r86-D7/r90.
2. **[عالية — قبلها بسطر]** أضف `dotenv` إلى devDependencies (يزيل التبعية الشبح التي تسقط عند أي تنظيف لـ node_modules — انكسار محتمل في `prisma migrate deploy` داخل سكربت البناء).
3. **[عالية — عملية مُدارة]** نظّف تلوث bun: بعد (2)، `rm -rf node_modules && corepack pnpm install --frozen-lockfile` ثم تحقق أخضر (tsc/lint/vitest عيّنة) — يسترد ~1.1GB ويزيل غموض الحل ونسختي الحقيقة المتوازيتين. لا تفعلها أثناء بناء جارٍ.
4. **[متوسطة]** جولة تحديث مجمّعة منخفضة المخاطر: react/react-dom 19.2.8 + sharp 0.35.4 (رفع override) + sonner 2.0.8 + zustand 5.0.15 + prisma 7.10.0 (المثلث) — كلها patch/minor قريبة، مع تشغيل الاختبارات. **ممنوع استخدام وسم latest لـ prisma (يشير إلى RC 8.0.0-rc.13!)** — ثبّت `prisma@7.10.0` تحديدًا.
5. **[متوسطة]** دفعة minors بجولة منفصلة + اختبار انحدار: next 16.3.4 · @base-ui/react 1.8.0 · lucide-react 1.42.0 · @vercel/blob 2.8.0 · pg 8.23.0 · zod 4.5.4 (رفع الـ override بعد التحقق). motion 13 **مؤجل بقرار موثق** (مبرر r88-A1).
6. **[منخفضة]** وثّق RATE_LIMIT_TEST_RELAX في .env.example (تعليق + تحذير إنتاج)، واحذف/أرشف: 3 ملفات src الميتة + 21 سكربت جولات، وادمج تنظيف 55+45 تصديرًا ميتًا تدريجيًا (advisory لا بوابة).
7. **[تحذير تشغيلي دائم]** أي وكيل/سكربت يعمل `pnpm update` بلا تحديد إصدار في هذا المشروع يخاطر بسحب RCs وfresh-releases حتى إصلاح (1).

---

## أدلة الأوامر (مختصرة)

```
corepack pnpm audit --prod            → No known vulnerabilities found
corepack pnpm audit                   → No known vulnerabilities found
corepack pnpm list --prod --depth 0   → 22 حزمة (نسخها موثقة §4)
corepack pnpm install --frozen-lockfile --dry-run → "up to date; no changes" (18.8s)
npx knip                              → 0 deps · 24 files · 55 exports · 45 types · 1 unlisted
npm view <pkg> version (×22 + hono)   → جدول §4
ls node_modules/.pnpm | head -5       → مجلدات pnpm قياسية نظيفة
find node_modules -maxdepth 1 …       → 513 إدخالًا: 25 symlink (pnpm 15:15) + 488 حقيقيًا (bun 14:58)
```

— نهاية تقرير 1-f
