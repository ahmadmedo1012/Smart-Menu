# 🍽️ الربط الذكي | Smart Menu

**منصة SaaS متكاملة لإدارة منيو المطاعم واستقبال الطلبات عبر واتساب**

منصة رقمية تتيح لأصحاب المطاعم إنشاء منيو تفاعلي احترافي، وإدارته بالكامل، واستقبال الطلبات مباشرة عبر واتساب — مع نظام اشتراكات، لوحات تحكم، بوت تلقجرام للإدارة، وتجربة عربية RTL كاملة.

> **الإنتاج:** <https://menu.smart-link.ly> · Next.js 16 · PostgreSQL (Neon) · Vercel

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
- **QR كود** — توليد بأربعة أحجام مع تخصيص
- **إشعارات تلقجرام** — بوت كامل للموافقة على الطلبات والمدفوعات

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

---

## 🧪 الجودة
| البوابة | الحجم | الحالة |
|---|---|---|
| TypeScript (tsc --noEmit) | صفر أخطاء | ✅ |
| ESLint (`npm run lint` = eslint src/ tests/) | 0 أخطاء · 6 تحذيرات no-explicit-any في مواصفات e2e فقط — src/ نظيف تمامًا 0/0 (قياس r92) | ✅ |
| Vitest | **1830 اختبارًا** في 124 ملفًا (قياس r93: +164 على r92 — جزر التغطية admins/categories/owner-restaurants إلى 100% أسطر + إصلاحات الأمن/البيانات/الواجهة + درع سلسلة التوريد) | ✅ |
| Playwright E2E + أمن | 35 ملف سيناريو · 435 فحصًا (قياس r92 بـ`playwright test --list` — رحلات كاملة، مصفوفة 375/768/1440 × light/dark × مزودو الدفع، referral مُصلَح جولة 85) | ✅ |
| axe-core WCAG 2.x | أساس صفري على صفحات المنيو | ✅ |
| سلسلة الهجرات | **قابلة لإعادة التشغيل من الصفر + مطابقة schema.prisma حرفيًا** (فرق فارغ) | ✅ |

CI (GitHub Actions): نفس قناة الإنتاج — `prisma migrate deploy` + بذر اختباري + build + unit + E2E + انحدار QA على الإنتاج الحي.

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

المتغيرات الثانوية (`ADMIN_PASSWORD` · `SEED_ADMIN_*` · `ALLOW_SEED` · `WEBHOOK_URL` · `SHADOW_DATABASE_URL` · `DATABASE_POOL_MAX` · `TELEGRAM_GROUP_IDS` · `BLOB_READ_WRITE_TOKEN` · `CRON_SECRET`) موثقة معلّقة داخل `.env.example` نفسه — والمرجع الكامل في `PROJECT.md`.

### 🧪 تشغيل E2E (Playwright)

```bash
pnpm test                    # unit (Vitest) — لا يحتاج خادمًا
pnpm test:e2e                # مشاريع security + api + ui + auth-verify
npx playwright test --project=qa-teams      # رحلات الفرق (team1-11)
```

- **`BASE_URL`**: افتراضي `http://localhost:3000` — للتشغيل ضد الإنتاج:
  `BASE_URL=https://menu.smart-link.ly npx playwright test ...`
- يتطلب خادمًا يعمل (`pnpm dev`) + بذر اختباري (`pnpm db:seed` — حساب `admin`)
- للمحلي المكثّف: `RATE_LIMIT_RELAX=1` لعملية الخادم نفسها (انظر `tests/README.md`)
- بقية المشاريع في `playwright.config.ts`: `qa-cross-browser` (firefox/webkit) · `round79-c`

### بيانات الدخول بعد البذر الاختباري
| المستخدم | كلمة المرور | الدور |
|---|---|---|
| `admin` | `admin123456` | مدير شامل (بيئة تطوير فقط) |

> في CI تُبذر تلقائيًا عبر `scripts/ci-seed.mjs`. أما الإنتاج فيُدار من مالك الحساب.

---

## 🛠 التقنيات
- **Framework**: Next.js 16 (App Router, proxy middleware, ISR)
- **Database**: PostgreSQL + Prisma 7 (23 هجرة، قابلة لإعادة التشغيل)
- **Styling**: Tailwind CSS 4 + shadcn/ui + Motion
- **State**: Zustand
- **Infra**: Vercel (Cron، Blob، Analytics) + Neon
- **Testing**: Vitest + Playwright + axe-core

## 📁 الهيكل
```
src/
├── app/
│   ├── (public)/    # المنيو، الأسعار، الهبوط، الاشتراك
│   ├── (protected)/ # owner (10 صفحات) + admin (13 صفحة)
│   ├── api/         # 65 مسار API (حراسة تفويض check-api-auth)
│   └── demo/        # جولة تجريبية
├── components/      # 137 ملفًا (menu/ui/layout/landing)
├── lib/             # الأمن، الجلسات، CS­RF، Rate-limit، Zod
├── proxy.ts         # CSP/CSRF/جلسات على الحافة
└── store/           # Zustand
prisma/              # المخطط + 23 هجرة (parity مضمون)
tests/               # 124 ملف unit (1830 اختبارًا — قياس r93) + 35 ملف E2E/أمن (فرق team1-11 · 435 فحصًا)
docs/                # تقارير الجولات + التوثيق الهندسي (فهرس README.md — جولة 85)
```

---

## 📜 التراخيص والملكية
مشروع خاص — جميع الحقوق محفوظة لصاحب الحساب `ahmadmedo1012` (المستودع خاص).
