# دليل تشغيل الاختبارات — Smart Menu

> آخر تحديث: الجولة 89 (الوكيل D2 — w4-d2) · 61 ملف وحدة (1082 اختباراً) · 34 ملف e2e + 1 security
> البوابة الدائمة: `tsc` = 0 · `eslint` = 0 · `vitest` أخضر بالكامل — لا يُحذف اختبار قائم أبداً.

---

## 1) اختبارات الوحدة (vitest)

```bash
# التشغيل العادي — يتطلب DATABASE_URL فقط (يُستخدم عند تحميل وحدات db/env):
DATABASE_URL='postgresql://postgres:postgres@localhost:5434/smartmenu' npx vitest run

# ملف واحد أثناء التطوير:
DATABASE_URL='postgresql://postgres:postgres@localhost:5434/smartmenu' npx vitest run tests/unit/orders-create.test.ts

# مع خريطة التغطية والعتبات (ratchet — تُرفع فقط ولا تُخفض أبداً):
DATABASE_URL='postgresql://postgres:postgres@localhost:5434/smartmenu' npx vitest run --coverage
```

- **العتبات الحالية** (vitest.config.ts، الجولة 89-D2): statements 59 · branches 54 · functions 60 · lines 61 — القياس الفعلي 61.62/56.5/62.28/63.53 بعد موجات 1-3 (+61 اختبار مسارات أدمن ومكتبات) ناقص هامش أمان ~2 نقطة؛ تُرفع فقط ولا تُخفض أبداً.
- **الموقع**: `tests/unit/*.test.ts` فقط (انظر `include` في vitest.config.ts).
- **النمط المعتمد**: عزل كامل عبر `vi.mock('@/lib/db')` + `vi.hoisted` — لا اتصال DB حقيقي (الاستثناء الوحيد: `db-withretry.test.ts` يستورد `@/lib/db` الحقيقي لأن إنشاء العميل/المجمع lazy ولا يفتح اتصالاً إلا عند استعلام فعلي).
- **ممنوع**: اختبارات شكلية (tautology) — كل اختبار يجب أن ينكسر فعلاً لو انكسر السلوك (درس persona-6 الموثق).

## 2) اختبارات e2e (Playwright)

### المتطلبات المسبقة
1. **خادم يعمل على :3000** — إما `pnpm dev` أو بعد `pnpm build`: `node .next/standalone/server.js` (مع نسخ static/public كما في postbuild).
2. **بذور قاعدة البيانات** (Postgres المحلي :5434):
   ```bash
   node scripts/ci-seed.mjs        # admin / admin123456 (SEED_ADMIN_PASS)
   node scripts/round83-seed.mjs   # al-waha-cafe + waha_owner / waha123456 + 5 أصناف featured
   node scripts/qa-seed.mjs        # testmulti1568 + مطاعم IDOR (فرق QA العميقة)
   ```
3. **`BASE_URL` والمضيف**: استخدم `http://localhost:3000` — **وليس 127.0.0.1**. خادم Next يحوّل طلب الـmiddleware إلى localhost، وسياسة CSP بالـnonce تُختم للمضيف المطبَّع فقط؛ الاتصال عبر 127.0.0.1 يترك السكربتات الداخلية بلا nonce فلا تُهيدرَت الصفحات أبداً.
4. **`RATE_LIMIT_RELAX=1`**: يرخّي حدود الـIP (×200) — **متغير بيئة لعملية الخادم نفسها**، وليس لعملية Playwright. يعمل فقط عندما لا يكون الخادم بوضع production. إن شغّلت الخادم standalone بـNODE_ENV=production فالقيمة (في `.env` أو غيره) **لا تُطبَّق إطلاقًا** — استخدم بدلًا منه:
   **`RATE_LIMIT_TEST_RELAX=1`** (جولة 92): نفس الترخيص (×200 مع أرضية 20) لكنه يعمل صراحةً تحت NODE_ENV=production — هذا ما تستخدمه خطوة خادم E2E في CI (الخادم standalone يفرض production) لإسكات رقائق 429 التراكمية (register 5/دقيقة/IP مشترك بين كل المشاريع). ملاحظات: (أ) يُحترم `exemptFromRelax` — أقفال الحسابات تبقى بميزانيتها الحقيقية دائمًا، (ب) لا يُضبط على الإنتاج/Vercel أبدًا، (ج) الفحص الليلي يظل عمدًا بلا ترخيص ليصطاد رقائق نظام الميزانية الحقيقية.

### القاعدة الذهبية: الفرق تعمل **متسلسلة** إلزاماً
حد تسجيل الدخول **5 محاولات/دقيقة لكل مستخدم** — تشغيل الفرق بالتوازي يستهلك الميزانية ويُسقط الدخول. لذا:
- `workers: 1` في CI، و`--workers=1` يدوياً عند تشغيل أكثر من فريق.
- المشروع `qa-teams` (فرق team1..team10 + personas + round*) هو حاملة الفرق — لا تُشغّله مع `round79-c` بالتوازي المحلي.

```bash
# فريق واحد:
npx playwright test tests/e2e/team3-owner.spec.ts --project=qa-teams --workers=1

# مشاريع الـAPI الخفيفة (لا تحتاج متصفحاً حقيقياً لكنها تحتاج الخادم):
npx playwright test --project=security --project=api --project=ui --project=auth-verify

# الفرق الجديدة (الجولة 88):
npx playwright test tests/e2e/team8-featured.spec.ts --project=qa-teams --workers=1
npx playwright test tests/e2e/team9-perf-smoke.spec.ts --project=qa-teams --workers=1
npx playwright test tests/e2e/team10-regression-guard.spec.ts --project=qa-teams --workers=1

# التقرير بعد التشغيل:
npx playwright show-report
```

### خريطة الفرق/المشاريع
| المشروع | الملفات | ملاحظات |
|---|---|---|
| `security` | `tests/security/*` | ويب هوك تيليغرام — أمن |
| `api` | api-smoke/sweep/full-sweep + referral-claim + round86-security | طلبات HTTP فقط |
| `ui` | ui-smoke/ui-sweep | متصفح |
| `auth-verify` | auth-fix-verification | دخول/حدود الدخول |
| `qa-teams` | team1..**team10** + personas 1/3/4/6/7 + round4/5/6/8/29/80/87 | **متسلسلة** — ترحيلات متصفح كاملة |
| `round79-c` | round79-phaseC-journey | مصفوفة رحلة الزبون الكاملة (actionTimeout 15s) |
| `qa-cross-browser(-webkit)` | ui-smoke + ... | firefox/webkit — تشغيل صريح فقط |

### الفرق الجديدة في الجولة 88
- **team8-featured**: جولة الميزة المميزة — تبديل `isFeatured` من محرر الصنف (waha_owner) وظهور/اختفاء المشهد في القسم السينمائي بالمنيو العام. **PENDING WAVE-C**: إن فشلت قبل تفعيل الموجة C فهذا هو الواقع المتوقع (وثّق الفشل — لا تُصلحه باختبار أضعف).
- **team9-perf-smoke**: عتبات زمن استجابة على الخادم المحلي (health < 500ms · صفحة المنيو < 2000ms · /api/stats المصدَّق < 1500ms) — وسيط 3 عينات بعد طلب إحماء (اشرح المنطق في رأس الملف).
- **team10-regression-guard**: حراسة جواهر الجولات 79-87 (404 النحيفة، sw.js v6، promo.mp4، صفحة الطباعة، مؤشر sinceId، ترويسات الأمان) — **يكتب حدثَي حرارة في جدول SystemEvent** (localhost/CI فقط).

## 3) ماذا يشغّل CI (`.github/workflows/ci.yml`)

الوظيفة الرئيسية `lint-build-test` (ubuntu + Postgres 16 خدمة):
1. **Secrets scan** — `node scripts/check-secrets.mjs` (round88-D6): يمسح كل الملفات المتتبعة بـgit بحثاً عن `ghp_`/`github_pat_`/`vcp_`/`sk-` وروابط DB ببيانات اعتماد — يفشل التشغيل فوراً قبل التثبيت/البناء. الاستثناءات المتعمدة موثقة في `FILE_ALLOWLIST` داخل السكربت أو بعلامة `allow-secret-check` في السطر نفسه.
2. حرس `.env` المتتبع → `pnpm audit --prod` → `prisma generate` → **بوابة توازن الهجرات** (migrate diff ضد الـschema).
3. `migrate deploy` + البذور الثلاث (ci/round83/qa) → `lint` → `typecheck` → `check-api-auth` → **`test:coverage` بعتبات ratchet**.
4. `build` (standalone) → إقلاع الخادم على :3000 → **e2e المشاريع الأساسية** (`npm run test:e2e`) → **الرحلات العميقة** (`--project=qa-teams --project=round79-c --workers=2` — يشمل team8/9/10 تلقائياً) → رفع تقرير Playwright عند الفشل.
- وظيفة `prod-qa` منفصلة (main فقط): فريق 1/2/5/6/**9** ضد الإنتاج `https://menu.smart-link.ly` بـ`continue-on-error` (لا تعطل النشر) + تقريرها الخاص — team9 أُضيفت بالجولة 89-D2 (ميزانيات IS_REMOTE جاهزة: توسيع ميزانية /api/stats للشبكة البعيدة، ودخول بمالك qa-seed الموجود بالإنتاج).
- **استثناء workers=2 الموثق** (الجولة 89-D2): خطوة «الرحلات العميقة» في CI تعمل بـ`--workers=2` خلافاً للقاعدة الذهبية — آمن فقط لأن تلك الخطوة تضبط `RATE_LIMIT_RELAX=1` وكل فريق يدخل باسم مستخدم خاص به (الميزانية per ip:username)؛ القاعدة الذهبية تستهدف ميزانية الدخول التسلسلية لا صحة التنفيذ.
- **أثر التغطية** يُرفع كـartifact (lcov+html، retention 7 أيام) من كل تشغيل CI (الجولة 89-D2).
- ملاحظة: `retries: 2` في CI فقط (موثقة في playwright.config.ts لتقلبات حدود المعدل على مشغّلات GitHub) — **ليست retries مخفية داخل الاختبارات**؛ محلياً retries=0.

## 4) القيود المعروفة

- **`SKIP_ENV_CHECK`**: محلي/CI فقط — تخطّي تحقق متغيرات البيئة عند الإقلاع. لا يُضبط في الإنتاج أبداً (انظر `.env.example`).
- **قيد الدخول 5/دقيقة**: سبب التسلسل الإلزامي أعلاه. مساعد `login()` في qa-helpers يعيد المحاولة عبر نافذة الحد — إعادة المحاولة دلالية وليست تخفيف فشل.
- **طعنة #418 المعروفة**: صفحة الطباعة `/menu/[slug]/print` تسبب خطأ هيدريشن موثق (nested html/body) — round87-journeys تسمح بهذا الخطأ تحديداً وحده (راجع رأس الملف). أي خطأ صفحة آخر يفشل الاختبار.
- **team8/10 localhost فقط**: تكتب بيانات (تبديل featured، حدثا SystemEvent) — لا تُشغّل ضد الإنتاج. **team9 صارت ضمن prod-qa** (الجولة 89-D2) لأنها قياسات قراءة فقط بميزانيات IS_REMOTE — الوحيدة من فرق 88 التي تعمل ضد الإنتاج.
- **`auth-fix-verification.spec.ts` لم يعد يفرض baseURL داخل الملف** (الجولة 89-D2): كان يعلّب المشروع على localhost ويعطّل BASE_URL للإنتاج — الكونفق (مشروع auth-verify) هو من يقرر الآن، وروابط الطلبات داخل الملف تشتق من `process.env.BASE_URL` نفسه.
- **التغطية تُقاس على `src/lib` + `src/app/api` فقط** (انظر `coverage.include`) — ملفات مكونات الواجهة خارجها عمداً.
- **ترتيب vitest**: لا اعتماد ترتيب داخل ملفات الوحدة (لا حالة مشتركة على مستوى الوحدة النمطية) — يمكن تشغيل أي ملف منفرداً.

## 5) فحص تسريب الأسرار محلياً

```bash
node scripts/check-secrets.mjs   # نفس خطوة CI — exit 1 عند أي تسريب حقيقي
```
يمسح الملفات المتتبعة + غير المتتبعة (غير المهمَلة) — أي يسابق الـcommit ويكشف التسريب قبل ارتكامه. المخرجات مقنّعة (أول 8 أحرف) حتى لا يطبع الفحص نفسُه السرَّ في السجلات.
