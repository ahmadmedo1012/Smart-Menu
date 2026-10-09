# 🍽️ الربط الذكي | Smart Menu

**Digital menu & WhatsApp ordering for restaurants — an Arabic-first RTL SaaS on Next.js 16.**

> 🌐 **العربية** · [English](./README.en.md)

**منصة SaaS متكاملة لإدارة منيو المطاعم واستقبال الطلبات عبر واتساب** — الزبون يتصفح منيوًا رقميًا تفاعليًا ويرسل طلبه مباشرة على واتساب، وصاحب المطعم يدير كل شيء من لوحة تحكم أو تطبيق جوال، مع نظام اشتراكات، بوت تلقجرام للإدارة، وتجربة عربية RTL كاملة على هوية مدارك للتصميم.

> **الإنتاج:** <https://menu.smart-link.ly> · Next.js 16 · PostgreSQL (Neon) · Vercel

[![CI](https://github.com/ahmadmedo1012/Smart-Menu/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmadmedo1012/Smart-Menu/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-menu.smart--link.ly-25D366)](https://menu.smart-link.ly)
[![License](https://img.shields.io/badge/license-proprietary-important)](LICENSE)

---

## 🖼 نظرة سريعة

| الوضع النهاري ☀️ | الوضع الليلي 🌙 |
|:---:|:---:|
| [![الصفحة الرئيسية بالوضع النهاري — العنوان «منيو رقمي لمطعمك والطلبات تصلك على واتساب» وزر «ابدأ مجاناً»](docs/screenshots/hero-light.webp)](docs/screenshots/hero-light.webp) | [![الصفحة الرئيسية بالوضع الليلي — شريط ترحيبي مدارك بهوية night/gold](docs/screenshots/hero-dark.webp)](docs/screenshots/hero-dark.webp) |

> مزيد من اللقطات في قسم «لقطات الشاشة» أدناه — والتعليقات الكاملة والمقاسات في
> [`docs/screenshots/README.md`](docs/screenshots/README.md).

---

## 🧭 ما هو الربط الذكي؟

- **منيو رقمي للمطاعم** — صفحة عامة سريعة لكل مطعم: أقسام، صور، أسعار، خصومات، وسوم غذائية ومشتقات.
- **طلبات عبر واتساب** — سلة متعددة الأصناف تُرسَل رسالة واتساب جاهزة إلى رقم المطعم.
- **لوحة تحكم للمالك** — إحصائيات حقيقية، إدارة منيو وطلبات، توليد QR، تصدير CSV.
- **QR قابل للطباعة** — أربعة أحجام قابلة للتخصيص + صفحة طباعة جاهزة لكل منيو (`/menu/[slug]/print`).
- **تطبيق جوال** — رفيق Expo/React Native للزبائن والمالكين (التفاصيل في [`mobile/README.md`](mobile/README.md)).
- **اشتراكات SaaS** — خطط مجانية ومدفوعة، دفع محلي (ليبيانا/مدار/تحويل بنكي)، وموافقات إدارية عبر بوت تلقجرام.

---

## ✨ المميزات

### 🌐 للزبائن
- **منيو رقمي تفاعلي** — أقسام، صور، أسعار، خصومات، وسوم غذائية، ومشتقات ( modifiers )
- **قسم الأصناف المميزة** — عرض سينمائي بأولوية وشارة لكل صنف مختار
- **بحث ذكي** — بحث فوري مع اقتراحات وتنقل لوحة مفاتيح كامل
- **طلب عبر واتساب** — سلة متعددة الأصناف مع تفاصيل كاملة
- **برنامج ولاء** — نقاط ومكافآت واستبدال
- **تقييمات** — مراجعات موثوقة على مستوى الصنف

### 👨‍🍳 لأصحاب المطاعم
- **لوحة تحكم** — إحصائيات حقيقية، أشهر الأصناف، آخر الطلبات
- **إدارة المنيو** — أصناف/أقسام/مشتقات + رفع الصور (Vercel Blob)
- **إدارة الطلبات** — خط زمني تفاعلي، تصفية، تصدير CSV
- **QR كود** — توليد بأربعة أحجام مع تخصيص + صفحة طباعة جاهزة
- **إشعارات تلقجرام** — بوت كامل للموافقة على الطلبات والمدفوعات

### 📱 تطبيق الجوال
- **للزبائن** — تصفح المنيو، سلة بمشتقاتها، وإرسال الطلب على واتساب
- **للمالك** — تسجيل دخول، طلبات حية (تحديث كل 15 ثانية)، عرض/طباعة QR، وإدارة المنيو
- Expo 53 · React Native · NativeWind · عربي RTL من أول إطار — الدليل الكامل في [`mobile/README.md`](mobile/README.md)

### 👑 للإدارة
- **لوحة شاملة** — مطاعم، مستخدمون، خطط، دخل، أحداث النظام
- **صلاحيات دقيقة** — نظام Permission لكل مستخدم
- **مراقبة الأحداث** — سجل تدقيق كامل (SystemEvent)

### 💳 الاشتراكات
- خطط مجانية ومدفوعة مع تطبيق حدود تلقائي على مستوى API
- تدفق دفع محلي (ليبيانا/مدار/تحويل بنكي) مع تحقق إداري
- انتهاء صلاحية مجدول (Vercel Cron) وتنظيف دوري

---

## 🛡 الأمان
- جلسات كوكيز httpOnly مُجزَّأة + تحقق جلسة على طبقتين (Edge proxy + route)
- CSRF مزدوج (كوكي + Origin) على كل مسارات API وصفحات المحمية
- CSP بثلاث قنوات: nonce ديناميكي للصفحات الديناميكية، سياسة ثابتة للصفحات العامة، وسياسة صارمة للمسارات
- HSTS + nosniff + DENY framing + Referrer-Policy
- Rate-limiting بقاعدة بيانات على كل المسارات العامة (تسجيل/دخول/ولاء/تقييم/ويبهوك)
- تحقق Zod على كل مدخل، بـرسائل عربية

> سياسة الإبلاغ عن الثغرات ونطاق الدعم في [`SECURITY.md`](SECURITY.md).

---

## 🧪 الجودة والبوابات

| البوابة | المعيار |
|---|---|
| TypeScript (`pnpm typecheck`) | صفر أخطاء |
| ESLint (`pnpm lint` = eslint src/ tests/ scripts/) | `src/` نظيف تمامًا — التحذيرات في مواصفات e2e فقط |
| Vitest (unit) | يكبر كل جولة — القياس الحي في [CI](https://github.com/ahmadmedo1012/Smart-Menu/actions/workflows/ci.yml) والتاريخ في [`CHANGELOG.md`](CHANGELOG.md) |
| Playwright E2E + أمن | رحلات كاملة · مصفوفة 375/768/1440 × light/dark × مزودو الدفع · فرق qa-cross-browser |
| axe-core WCAG 2.x | أساس صفري على صفحات المنيو |
| سلسلة الهجرات | قابلة لإعادة التشغيل من الصفر + مطابقة `schema.prisma` حرفيًا (فرق فارغ) |

CI (GitHub Actions): نفس قناة الإنتاج — `prisma migrate deploy` + بذر اختباري + build + unit + E2E + انحدار QA على الإنتاج الحي. لا نثبّت أعداد الاختبارات في هذا الملف — هي تتغير كل جولة؛ الشارة أعلاه والـ CHANGELOG هما مصدر الحقيقة.

---

## 🚀 التشغيل المحلي

```bash
# المتطلبات: Node 24+ و pnpm 11+ وقاعدة PostgreSQL محلية
pnpm install
cp .env.example .env        # ثم عدّل القيم — انظر «متغيرات البيئة» أدناه

pnpm db:migrate             # prisma migrate deploy — نفس قناة الإنتاج بالضبط
pnpm db:seed                # مدير اختباري + الخطط (بلا حلقة مصادقة)
pnpm dev                    # → http://localhost:3000
```

> ⚠️ لا تستعمل `export DATABASE_URL=...` في الشل: متغير الشل **يغلب** قيمة `.env`
> (Next.js وPrisma لا يستبدلان متغيرًا موجودًا مسبقًا في البيئة) — ورابط غريب من
> مشروع آخر (مثل SQLite بصيغة `file:`) يُمسَك الآن عند الإقلاع بحارس المخطط
> في `src/lib/env.ts` برسالة عربية توضح السبب والحل (`unset DATABASE_URL`).

### 🔐 متغيرات البيئة

انسخ `.env.example` إلى `.env` وعدّل القيم — القيود أدناه مطبّقة عند الإقلاع عبر `src/lib/env.ts` (فشل مبكر برسالة عربية):

| المتغير | القيد / الافتراضي |
|---|---|
| `DATABASE_URL` | إلزامي · يجب أن يبدأ بـ `postgresql://` أو `postgres://` (رابط SQLite/ملف يُرفض مبكرًا) |
| `JWT_SECRET` | إلزامي · 64 حرفًا على الأقل |
| `AUTH_SECRET` | إلزامي · 32 حرفًا على الأقل |
| `NEXT_PUBLIC_DOMAIN` | إلزامي · رابط صالح (مثل `https://example.com`) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | إلزامي · رقم واتساب استقبال الطلبات |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | اختياري · افتراضي فارغ |
| `DATABASE_SCHEMA` | اختياري · افتراضي `public` |
| `SKIP_ENV_CHECK` | تخطي فحص الإقلاع — للتشغيل المحلي/CI فقط، لا يُضبط في الإنتاج |
| `RATE_LIMIT_RELAX` | يرخّي حدود المعدل للتشغيل المحلي المكثّف — لا يُضبط في الإنتاج |

المتغيرات الثانوية (`ADMIN_PASSWORD` · `SEED_ADMIN_*` · `ALLOW_SEED` · `WEBHOOK_URL` · `SHADOW_DATABASE_URL` · `DATABASE_POOL_MAX` · `TELEGRAM_ADMIN_IDS` · `TELEGRAM_GROUP_IDS` · `TELEGRAM_WEBHOOK_SECRET` · `BLOB_READ_WRITE_TOKEN` · `CRON_SECRET` · `PORT`) موثقة معلّقة داخل `.env.example` نفسه — والمرجع الكامل في `PROJECT.md`.

### 🧪 تشغيل E2E (Playwright)

```bash
pnpm test                    # unit (Vitest) — لا يحتاج خادمًا
pnpm test:e2e                # مشاريع security + api + ui + auth-verify
npx playwright test --project=qa-teams      # رحلات الفرق (team1-11)
```

- **`BASE_URL`**: افتراضي `http://localhost:3000` — للتشغيل ضد الإنتاج:
  `BASE_URL=https://menu.smart-link.ly npx playwright test ...`
- يتطلب خادمًا يعمل (`pnpm dev`) + بذر اختباري (`pnpm db:seed` — حساب `admin`)
- متصفحات Playwright تُثبَّت مرة واحدة بعد الاستنساخ: `npx playwright install` (وعلى Debian/CI: `--with-deps`؛ وفروع `qa-cross-browser` تحتاج `firefox webkit` — التفاصيل في `tests/README.md` §2)
- للمحلي المكثّف: `RATE_LIMIT_RELAX=1` لعملية الخادم نفسها (انظر `tests/README.md`)
- بقية المشاريع في `playwright.config.ts`: `qa-cross-browser` (firefox/webkit) · `round79-c`

### بيانات الدخول بعد البذر الاختباري
| المستخدم | كلمة المرور | الدور |
|---|---|---|
| `admin` | `admin123456` | مدير شامل (بيئة تطوير فقط) |

> في CI تُبذر تلقائيًا عبر `scripts/ci-seed.mjs`. أما الإنتاج فيُدار من مالك الحساب.

### 📱 تشغيل تطبيق الجوال

```bash
cd mobile && pnpm install && npx expo start
```

الإعداد الكامل (متغيرات Expo، البناء عبر EAS، فخ إصدارات pnpm المزدوجة) في [`mobile/README.md`](mobile/README.md).

---

## 🛠 التقنيات
- **Framework**: Next.js 16 (App Router, proxy middleware, ISR)
- **Database**: PostgreSQL + Prisma 7 — سلسلة هجرات قابلة لإعادة التشغيل ومطابقة للمخطط حرفيًا (ملاحظات الترتيب في `docs/ops-runbook.md` §10)
- **Styling**: Tailwind CSS 4 + shadcn/ui + Motion — نظام تصميم **مدارك** (Madarek): ليلي night/gold ‎`#070B16`/`#E9B44C`‎، نهاري cream/copper ‎`#FBFAF9`/`#B57438`‎، خط IBM Plex Sans Arabic (القوانين الكاملة في `DESIGN.md`)
- **Mobile**: Expo + React Native + NativeWind — نفس هوية مدارك الليلية، RTL من أول إطار
- **State**: Zustand
- **Infra**: Vercel (Cron، Blob، Analytics) + Neon
- **Testing**: Vitest + Playwright + axe-core

---

## 📁 الهيكل

```
smart-menu/
├── src/                     # تطبيق الويب (Next.js 16)
│   ├── app/
│   │   ├── (public)/        # المنيو العام، الأسعار، الهبوط، الاشتراك، طباعة QR
│   │   ├── (protected)/     # owner (10 صفحات) + admin (13 صفحة)
│   │   ├── api/             # 66 مسار API (حراسة تفويض check-api-auth)
│   │   └── demo/            # جولة تجريبية
│   ├── components/          # ≈150 ملفًا (menu/ui/layout/landing)
│   ├── lib/                 # الأمن، الجلسات، CSRF، Rate-limit، Zod
│   ├── proxy.ts             # CSP/CSRF/جلسات على الحافة
│   └── store/               # Zustand
├── mobile/                  # تطبيق الجوال — Expo + React Native (mobile/README.md)
│   ├── src/
│   │   ├── app/             # الجذر App.tsx + المزوّدات
│   │   ├── navigation/      # React Navigation 7 + navTheme
│   │   ├── screens/         # public (منيو/سلة) · owner (طلبات حية/QR) · subscribe · auth · admin
│   │   ├── components/      # motion/ shared/ ui/ landing/
│   │   ├── services/        # عميل API — نفس إنتاج الويب
│   │   ├── lib/             # واتساب، الإيصالات، الأخطاء العربية
│   │   └── theme/           # ألوان مدارك الليلية (تكافؤ globals.css)
│   ├── plugins/             # with-force-rtl — فرض RTL من أول إطار
│   ├── eas.json / app.json  # ملفات البناء (minSdk 25، روابط Android)
│   └── tests/               # اختبارات تكافؤ التصميم
├── public/
│   ├── demo/                # 28 صورة عرض webp لمنيو الديمو
│   └── fonts/               # خطوط self-hosted + إسناد OFL
├── prisma/                  # المخطط + سلسلة هجرات قابلة لإعادة التشغيل
├── tests/                   # unit + E2E/أمن (فرق qa team1-11) — يكبر كل جولة
├── docs/                    # rounds/ + مرجعية حية + ops-runbook + توثيق الجوال + screenshots/
└── scripts/                 # أدوات CI الحية + archive/ لسكربتات الجولات المنتهية
```

---

## ⌨️ السكربتات

| الأمر | الوظيفة |
|---|---|
| `pnpm dev` | خادم التطوير |
| `pnpm build` | بناء الإنتاج (فكّ قفل DB → `migrate deploy` → `prisma generate` → `next build`) |
| `pnpm start` | تشغيل نسخة الإنتاج محليًا |
| `pnpm lint` / `pnpm lint:fix` | ESLint على `src/ tests/ scripts/` |
| `pnpm lint:idioms` | حاجز تعابير التصميم — صدّ الانحدارات المرصودة في التدقيق |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | اختبارات unit (Vitest — بلا خادم، `env -u DATABASE_URL`) |
| `pnpm test:e2e` | Playwright — مشاريع security + api + ui + auth-verify |
| `pnpm db:migrate` | `prisma migrate deploy` — نفس قناة الإنتاج |
| `pnpm db:seed` | بذر اختباري (مدير + الخطط) |
| `pnpm verify` | البوابة الكاملة: author + lint + idioms + typecheck + test + build |
| `pnpm verify:mobile` | بوابات الجوال: typecheck + lint |
| `pnpm knip` | فحص الكود الميت |

> للمساهمة وقواعد الالتزامات راجع [`CONTRIBUTING.md`](CONTRIBUTING.md)، ولسجل التغييرات [`CHANGELOG.md`](CHANGELOG.md).

---

## 🖼️ لقطات الشاشة

| صفحة الدخول (ليلي) | من المنيو التجريبي |
|:---:|:---:|
| [![صفحة دخول صاحب المطعم بالوضع الليلي — نموذج دخول ببيانات تجريبية](docs/screenshots/login.webp)](docs/screenshots/login.webp) | [![طبق برجر من المنيو التجريبي](public/demo/oasis-burger.webp)](public/demo/oasis-burger.webp) [![فنجان كابتشينو من المنيو التجريبي](public/demo/cappuccino.webp)](public/demo/cappuccino.webp) [![قطعة تشيز كيك من المنيو التجريبي](public/demo/cheesecake.webp)](public/demo/cheesecake.webp) |

> التعليقات الكاملة والمقاسات في [`docs/screenshots/README.md`](docs/screenshots/README.md) — وصور المنيو التجريبي الكاملة (28 صورة webp) في `public/demo/`.

---

## 🛰️ جزء من منظومة مدارك — Part of the Madarek Ecosystem

> نظام تصميم واحد لكل المشاريع · هوية مدارك: ليلي night/gold `#070B16`/`#E9B44C` — نهاري cream/copper `#FBFAF9`/`#B57438` — خط IBM Plex Sans Arabic

| المشروع | الدور | GitHub | الموقع المباشر |
|---|---|---|---|
| 🎓 **مدارك / Madarek** | منصة التعليم الذكي لجامعة الزاوية — المرجع الأم لنظام التصميم | [github.com/ahmadmedo1012/madarek](https://github.com/ahmadmedo1012/madarek) | [madarek.onrender.com](https://madarek.onrender.com) |
| 🔗 **سمارت لينك / Smart-Link** | المظلة الرقمية للأعمال في ليبيا | [github.com/ahmadmedo1012/Smart-Link](https://github.com/ahmadmedo1012/Smart-Link) | [smart-link.ly](https://smart-link.ly) |
| 🍽️ **سمارت منيو / Smart-Menu** | منيو رقمي وطلبات واتساب للمطاعم | [github.com/ahmadmedo1012/Smart-Menu](https://github.com/ahmadmedo1012/Smart-Menu) | [menu.smart-link.ly](https://menu.smart-link.ly) |
| 🤖 **سمارت بوت / SmartBot** | بوت ماسنجر وأتمتة لصفحات فيسبوك | [github.com/ahmadmedo1012/SmartBot](https://github.com/ahmadmedo1012/SmartBot) | [bot.smart-link.ly](https://bot.smart-link.ly) |
| 🛍️ **سمارت أوردر / Smart-Order** | متجر رقمي وطلبات وتوصيل للأعمال | [github.com/ahmadmedo1012/Smart-Order](https://github.com/ahmadmedo1012/Smart-Order) | [order.smart-link.ly](https://order.smart-link.ly) |

## 📜 التراخيص والملكية

مشروع خاص — جميع الحقوق محفوظة لصاحب الحساب `ahmadmedo1012`. النص القانوني الكامل في ملف [`LICENSE`](LICENSE).

### الخطوط
العلامة الأساسية **IBM Plex Sans Arabic** 400–700 (subsets عربية + لاتينية،
self-hosted — تكافؤ مدارك الحرفي)، مع IBM Plex Mono وIBM Plex Serif (لاتيني)
واحتياطات Cairo · Readex Pro · Noto Naskh Arabic في الويب، وحزمة
`@expo-google-fonts/ibm-plex-sans-arabic` (400–700) في تطبيق الجوال —
الجميع بموجب **رخصة SIL Open Font License 1.1**؛ الإسناد الكامل وحقوق النشر
لكل عائلة في [`public/fonts/OFL-LICENSES.md`](public/fonts/OFL-LICENSES.md).
