# Round 90 — g90-D5: لوحة الصحة + مراجعة DevEx (تشخيص فقط، لا تعديل كود)

التاريخ: الجولة 90 · الوكيل: D5 · الأوامر نُفّذت من جذر المشروع `/home/z/my-project/smart-menu`.

## 1) لوحة الصحة

| الفئة | القياس الفعلي | الحساب | الدرجة |
|---|---|---|---|
| **Types** (`npx tsc --noEmit`) | 0 خطأ TS | 10 − 0×2 | **10/10** |
| **Lint** (`npx eslint .`) | 0 أخطاء، 3 تحذيرات: 1 حقيقي (`tests/e2e/persona-7-malicious.spec.ts:34` no-explicit-any) + 2 داخل `coverage/` المولّد (unused eslint-disable) | 10 − 0×2 − 1×0.5 − 0.5 (لأن `eslint .` يجرف مجلدًا مولّدًا) | **9/10** |
| **Tests** (معلومة معتمدة، لم تُعد) | vitest **1082/1082** أخضر | 10 | **10/10** |
| **Build** (معلومة معتمدة) | **85 صفحة** ناجحة | 10 | **10/10** |
| **Dead-code** (knip v5.46.4) | 56 ملفًا غير مستعمل (منها ~36 ملف اختبار موصول فعليًا عبر CLI = إيجابيات كاذبة) · 62 export غير مستعمل · 52 type غير مستعمل · 1 export مكرر · 3 deps + 2 devDeps غير مستعملة (أغلبها إيجابيات كاذبة) · لا يوجد knip config ولا أتمتة | 10 − 1.5 (≈15 ملفًا ميتًا حقيقيًا) − 1.5 (114 رمزًا مُصدَّرًا ميتًا) − 1 (بلا config/CI) | **6/10** |

**الدرجة المجمعة: (10+9+10+10+6)/5 = 9.0/10** — سطح الكود نظيف (types/lint/tests/build كله أخضر)؛ الدين التقني متركّز في الصمامات الميتة وغياب أتمتة رصدها.

### ملحق القياس
- **tsc:** `rg -c "error TS"` = **0**.
- **eslint:** `✖ 0 errors` / تحذيرات كما في الجدول (`0 errors and 2 warnings potentially fixable`).
- **knip:** أحدث إصدار (v6، oxc-parser) ينهار في هذه البيئة بـ `RangeError: Array buffer allocation failed` — نجح **knip@5.46.4** بعد ربط typescript المحلي (5.9.3). النتيجة الكاملة: 56 ملفًا / 3+2 حزمًا / 62+52 رمزًا / 1 تكرار.
- **deps:** `deps: 22 · devDeps: 15` (المجموع 37).

### أهم 15 صمامًا ميتًا (الأعلى أثرًا، بعد استبعاد الإيجابيات الكاذبة)
1. `src/lib/telegram.ts:36` — `sendTelegramMessage` غير مستعملة + **export مكرر** (`sendTelegramNotification` مُصدَّر مرتين) — أعلى خطر تشويش صيانة.
2. `src/lib/telegram-broadcast.ts:15` — `sendToChat`.
3. `src/lib/logger.ts:23,40` — `log`, `debug`.
4. `src/lib/csrf.ts:8` — `CSRF_EXEMPT` (ثابت أمني ميت — تحقق أنه ليس عقدًا مكسورًا).
5. `src/lib/chart-stats.ts` — `ANALYTICS_RANGES` + `startOfDay` + `addDays` + `eachDateKey` (4 رموز).
6. `src/lib/chart-geometry.ts:56` — `polarToCartesian`.
7. `src/lib/payment-schema.ts:18` — `normalizeDigits`.
8. `src/lib/order-status.ts:87` — `PICKUP_TYPE_META`.
9. `src/lib/motion.ts:18` — `fadeUpSpring`.
10. `src/hooks/useScrollProgress.ts` — ملف كامل غير مستورد.
11. `src/components/ui/motion-icons.tsx` — ~16 أيقونة Motion غير مستعملة (MotionPhone…MotionStethoscope).
12. `src/components/landing/landing-data.ts` — 5 ثوابت (BENEFITS/PARTNERS/PRICING_PLANS/SHOWCASES/TESTIMONIALS) + 7 أنواع.
13. `src/components/ui/VideoWrapper.tsx` + `kinetic-text.tsx` — ملفان كاملان.
14. `scripts/round86→89` evidence/prod-verify (8 سكربتات لمرة واحدة) + `scripts/round88-perf/*` (5) — أرشيف جولات داخل شجرة الكود.
15. `tests/e2e/qa-helpers.ts:95` — `choosePlanByPrice` + `tests/e2e/csrf-helper.ts` (الملف كله).

**إيجابيات كاذبة مؤكدة (لا تحذفها):** ملفات `tests/e2e/*` و`tests/security/*` (موصولة عبر `pnpm test:e2e` → playwright CLI glob) · `prisma.config.ts` (يُحمَّل تلقائيًا من Prisma CLI) · `@prisma/client`/`sharp`/`tw-animate-css`/`tailwindcss`/`axe-core` (استهلاك runtime/CSS/peer) · `public/sw.js` (يُسجَّل من العميل).

## 2) مراجعة DevEx

### README.md — خطوات التشغيل
الخطوات موجودة ومرتبة صحيحًا: `pnpm install` → `export DATABASE_URL` → `prisma migrate deploy` → `ci-seed.mjs` → `pnpm dev`. **الفجوات:**
- **الفخ نفسه:** يوصي بـ `export DATABASE_URL` في الشل بدل ملف `.env` — هذا ما أنتج بيئة مكسورة (انظر §مشكلة البيئة).
- أرقام متقادمة: "692 اختبارًا في 38 ملفًا" (الفعلي **1082**) · "16 هجرة" في §التقنيات مقابل "18 هجرة" في §الهيكل (الفعلي **20**) · لا خطوات لتشغيل E2E (`test:e2e`) ولا حد أدنى لأطوال `JWT_SECRET`/`AUTH_SECRET` (64/32).
- بيانات دخول البذر موثقة (admin) ✓ والمرجع `PROJECT.md` موجود ✓.

### package.json — السكربتات (12)
الموجود: dev · build (db-unstick + migrate deploy + generate + next build) · start · clean · lint · lint:fix · typecheck · test · test:watch · test:coverage · test:e2e · webhook:register · postbuild.
**الناقص/الغريب:** لا `db:reset`/`db:seed`/`db:migrate` (تُكتب أوامر prisma خام) · لا `lint:typecheck` كبوابة موحدة · لا سكربت knip/_format · `postbuild` يستعمل `cp -r` يونكس-فقط مع `|| true` يبتلع الفشل (غير محمول لـ Windows).

### .env.example مقابل المستعمل فعليًا
- `.env.example`: **13 فعّالة** + **10 معلّقة** (DATABASE_POOL_MAX · SKIP_ENV_CHECK · TELEGRAM_GROUP_IDS/BOT_USERNAME · ADMIN_PASSWORD · SEED_ADMIN_* · ALLOW_SEED · WEBHOOK_URL · SHADOW_DATABASE_URL · RATE_LIMIT_RELAX).
- الكود يستعمل **~26 متغيرًا** في `src/`+`scripts/` (منها NODE_ENV/VERCEL تلقائيان).
- **المطابقة:** جيدة — كل المستعمل فعليًا موثّق ما عدا: `SENTRY_DSN` (سطر معلّق في `src/instrumentation.ts` — ميت) و`PERF_DB_NAME` (سكربت perf غير موصول). القيود (JWT≥64 · AUTH≥32 · schema افتراضي public) متوافقة بين `.env.example` و`src/lib/env.ts` ✓. `PORT` موثق لكنه غير مرجع في الكود (ضمني لـ next start — مقبول).

### .github/workflows/ — ملفان (325 سطرًا)
- `ci.yml` (295): push + pull_request + workflow_dispatch · **لا schedule/nightly** · صلاحيات أقل امتيازًا ✓ · ماسح أسرار `scripts/check-secrets.mjs` قبل التثبيت ✓ · **لا أسرار inline** (بيانات postgres الخدمية test/test للاختبار فقط).
- `keep_alive.yml` (30): **schedule cron `*/12 * * * *`** (ping الإنتاج) — الوظيفة الليلية المخططة (worklog: retries=0 + تنظيف حدود المعدل) غير موجودة بعد.

### مشكلة البيئة (موثقة)
`$DATABASE_URL` في الشل = `file:/home/z/my-project/db/custom.db` (SQLite لمشروع آخر) — **وهو يغلب `.env`** لأن Next.js وPrisma CLI لا يستبدلان متغيرًا موجودًا مسبقًا في البيئة. أي `prisma migrate/generate` أو `next dev` من مستخدمٍ بهذا الشل يصطدم بقاعدة SQLite/رابط خاطئ.
**الحل الهيكلي المقترح (واحد):** حارس مخطط الاتصال في `src/lib/env.ts` — تغيير `DATABASE_URL` من `z.string()` إلى `z.url().refine(u => u.startsWith('postgres://') || u.startsWith('postgresql://'), 'DATABASE_URL يجب أن يكون رابط PostgreSQL')`. هذا يحوّل الفخ الصامت إلى **fail-fast برسالة عربية واضحة** عند الإقلاع، ويعمل في dev وproduction معًا (مع `cp .env.example .env` في README بدل export).

## 3) توصيات DevEx — مرتبة بالأثر
1. **حارس مخطط DATABASE_URL في env.ts** (رفض غير postgres:// + رسالة عربية) + استبدال `export DATABASE_URL` في README بـ `cp .env.example .env` — يقضي على فخ الشل الحالي نهائيًا.
2. **تجديد أرقام README آليًا**: 692→1082 اختبارًا · توحيد 16/18→**20 هجرة** · إضافة خطوة `test:e2e` وحدود أطوال الأسرار.
3. **إضافة knip config + خطوة CI advisory**: knip.json يعلم entry points (globs لـ playwright/vitest) ليفصل الإيجابيات الكاذبة، ويمنع تراكم الصمامات (الميزانية الحالية: ~15 ملفًا + ~60 رمزًا ميتًا حقيقيًا).
4. **استثناء `coverage/` (و`.next/`) من eslint**: يجعل `eslint .` يعكس نفس قناة `npm run lint` ويزيل التحذيرين المولّدين.
5. **سكربتات npm مفقودة**: `db:migrate`/`db:seed`/`db:reset` + `lint:typecheck` (بوابة واحدة للتوظيف/الدروبو-إن) + `knip`.
6. **بناء الوظيفة الليلية** (workflow بـ schedule): خطة worklog جاهزة (retries=0 + تنظيف حدود المعدل + استبدال 4 مهال) — غير منفذة.
7. **تنظيف الأرشيف**: نقل `scripts/round8*-evidence/prod-verify` و`round88-perf` إلى `docs/round8x/archive/` أو حذفها (خارج مسار التشغيل).
8. **توثيق/إزالة المتغيرين اليتيمين**: SENTRY_DSN (ميت — سطر معلّق في instrumentation.ts) وPERF_DB_NAME — إما تعليق في .env.example أو حذف الاستعمال.

---
*قياسات هذه الجولة: tsc=0 · eslint=0E/3W · knip=56 ملف/114 رمز/1 تكرار (knip@5.46.4 — v6 ينهار بـ oxc-parser في هذه البيئة: ArrayBuffer allocation failed) · deps=22/15 · vitest 1082/1082 · build 85 صفحة · تغطية 61.6%.*
