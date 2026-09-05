# Round80 — تقرير الإغلاق (Closure Report)

**التاريخ:** 2026-09-05 · **المنفّذ:** وكيل مستقل (Super Z) · **الأساس:** commit `8c4e2a06` (main) + تعديلات Round80 المحلية (انظر §6)
**قاعدة الإثبات:** لا ادعاء بلا ناتج أمر فعلي / لقطة فعلية / استجابة API فعلية.

---

## 1) حكم تنفيذي

| المرحلة | الحالة | ملاحظة |
|---|---|---|
| 1 — تفعيل القسم المميز + التحقق | ✅ منفَّذ ومُثبت محليًا عبر الواجهة الحقيقية (Playwright) | الإنتاج يحتاج دخول المالك — التعليمات في §4 (بيانات اعتماد المالك غير متاحة للمراجع) |
| 2 — الأمان الكامل | ⚠️ **[يتطلب المالك]** — عدّة تنفيذ كاملة جاهزة في §5 | بيئة المراجع بلا اعتمادات Vercel/GitHub (الدليل: `git push` → EXIT 128 "could not read Username") |
| 3 — إغلاق متابعة Round79 (5 بنود) | ✅ البنود الخمسة منفَّذة، كل بند ببوابته الكاملة | 447/447 اختبارًا، 84/84 صفحة، صفر أخطاء |
| 4 — هذا التقرير | ✅ | — |

---

## 2) المرحلة 1 — الأدلة (بوابة الخروج)

**بيئة:** نسخة محلية مطابقة (`next dev` + embedded-postgres + بذر 16 صنفًا في `al-waha-cafe` كلها `isFeatured=false` — **إعادة إنتاج حالة الإنتاج الحالية بالضبط** — + مطعم `al-aseel` بأربعة أصناف بدون مميز لحالة الحافة). التدفق الكامل عبر الواجهة الحقيقية لا API مباشر: دخول من نموذج `/login` الحقيقي → `/owner/menu` → توسيع التصنيف → زر التعديل (القلم) → `ItemDialog` → مفتاح "عرض في قسم الأصناف المميزة" → ترتيب الظهور + شارة العرض → "تحديث" → `PUT /api/items/{id}`.

| البوابة المطلوبة | الدليل الفعلي | الحكم |
|---|---|---|
| JSON حي يُظهر `isFeatured:true` لعدد الأصناف المفعّلة بالضبط | HTML الصفحة الحية يحتوي `"isFeatured":true` **×3 بالضبط** + استعلام SQL: `al-waha-cafe = 3/16 مميز` (كابتشينو rank=1 "الأكثر طلبًا"، كيك الشوكولاتة rank=2 "حصري"، موهيتو الواحة rank=3 "مقرمش") | ✅ |
| لقطة Light + Dark للقسم الظاهر | `/home/z/my-project/download/round80/menu-light-full.png` + `showcase-light.png` + `menu-dark-full.png` + `showcase-dark.png` (الداك موثّق بـ `html.dark=true`) + نقاط المشاهد = 3 + أول مشهد = كابتشينو (الترتيب يعمل) + الشارة "الأكثر طلبًا" مرسومة | ✅ |
| مطعم آخر بصفر مميز — اختفاء أنيق | `menu-zero-featured.png`: عقد القسم = 0، العنوان = 0، صفر أصناف خام في الـDOM، **صفر أخطاء كونسول حقيقية** (الوحيد: إشعار React dev-mode `eval()` — غير موجود في بناء الإنتاج) | ✅ |
| axe-core بعد ظهور القسم فعليًا | بالإعدادات الحرفية لـ phaseC (wcag2a/2aa/21aa): `menu-slug|light = 0`، `menu-slug|dark = 0` — **القسم لا يضيف أي انتهاك WCAG** (`axe-wcag-baseline.json`). بالقواعد الكاملة: 4 انتهاكات landmark/region (قواعد best-practice سابقة غير مشمولة بباب WCAG) | ✅ |

---

## 3) المرحلة 3 — البنود الخمسة وبواباتها

كل بند تبعه بوابة كاملة منفصلة (لا دفعة واحدة): `typecheck` EXIT 0 + `lint` EXIT 0 + `vitest` (انتهى بـ **447/447** في 25 ملفًا) + `build` EXIT 0 مع `migrate deploy` و **84/84** صفحة ثابتة.

| # | البند | التغيير | بوابة إضافية خاصة |
|---|---|---|---|
| 3.1 | db-sync → migrations نظامية | `package.json`: `"build": "prisma migrate deploy && next build"` + حذف `scripts/round79-db-sync.mjs` (vercel.json لا يعرّف buildCommand فيستخدم package.json) | ناتج البناء الحرفي: `11 migrations found in prisma/migrations` / `No pending migrations to apply.` — القناة النظامية تعمل داخل خط البناء ✅ (فحص information_schema على قاعدة **الإنتاج** يحتاج DATABASE_URL — أُضيف للعدّة §5) |
| 3.2 | تصليب بوابة لوحة المفاتيح | الاستبدال الجذري في `round79-phaseC-journey.spec.ts`: التركيز على زر فعلي داخل القسم (`nextBtn.focus()`) + إثبات أن التركيز داخل القسم (`activeElement.closest(section)`) + **إلزام تغيّر العداد** (`expect(kbAfter).not.toBe(kbBefore)`) بدل مجرد `length>0` الذي كان ينجح حتى لو لم يتحرك شيء | تشغيل حقيقي للخلية `1440px-light-madar` كاملة: **`1 passed (1.5m)`** والسجل الحرفي: `keyboard ArrowLeft "2 من 2: كابتشينو مرحلة C" → "1 من 2: لاتيه مرحلة C"` — الضغط يغيّر المشهد فعليًا ✅ |
| 3.3 | AXE_BASELINE + حارس | أعيد قياس الأساس بعد ظهور القسم (بالإعدادات الحرفية): menu-slug = 0/0 (موثّق في تعليق AXE_BASELINE) + **حارس عقد جديد**: `expect(axe.nodes).toBeLessThanOrEqual(axe.baseline)` مع تفصيل القواعد في رسالة الفشل + انتظار اختفاء التوستات العابرة قبل الفحص (حتمية القياس) | الحارس أثبت عمله حيًا: التقط `owner|light = 2 > baseline 1` (كان توست نجاح عابرًا بعد الموافقة) → بعد التصليب: 8 صفحات كلها ضمن الأساس ✅ |
| 3.4 | توحيد لون التوفير | **القرار التصميمي الموثّق**: دلالة "الخصم/التوفير" = عائلة `success` في كل واجهات الزبون (السعر المخفّض `text-success` + شارة `-X%` بالخلفية `bg-success`) — الخصم نتيجة إيجابية؛ و`destructive` يبقى محجوزًا للأخطاء/عدم التوفر. `MenuItemCard.tsx` وحّد مع `FeaturedShowcase.tsx` (الذي كان success أصلًا) | بوابة B الخام سليمة: grep ألوان Tailwind خام = **0** ✅ |
| 3.5 | الاختبارات المفقودة | 3 ملفات جديدة (+38 اختبارًا): `tests/unit/validation.test.ts` (حدود 3/30، 8/100، 1/100 + الرسائل العربية)، `tests/unit/featured-showcase.test.ts` (صفر مميز → قائمة فارغة → القسم يُخفى؛ الترتيب؛ حد 5؛ nulls أخيرًا)، `tests/unit/payment-rejection.test.ts` (**الدالة الفعلية** `resolveSubscriptionPayment` بموك prisma: pending→cancelled + UNPAID→REJECTED + حدثا SystemEvent داخل معاملة واحدة + الحالات الحدية) | 447/447 (كانت 409/409) ✅ |

**تصليبات دعم ضرورية وثّقت أثناء التنفيذ** (هشاشة اختبارات كشفتها التشغيلات الحقيقية، خارج قائمة Round80 لكنها كانت تحجب بوابتها): تحمّل سباق الانتقال التلقائي بعد الموافقة (خطوة 9)، وترشيح إشعار React dev-mode `eval()` في watchConsole (غير موجود إنتاجيًا).

---

## 4) تفعيل القسم في الإنتاج — خطوات بسيطة لصاحب الحساب (دقيقة لكل صنف)

> الفرق عن المحلي: صفحة المنيو عمومية ذات `revalidate = 60` — قد يستغرق ظهور التغيير حتى ~دقيقة بعد الحفظ.

1. سجّل الدخول https://menu.smart-link.ly/login بحساب مالك `al-waha-cafe`.
2. من القائمة الجانبية: **المنيو**.
3. اضغط على **اسم التصنيف** (مثل "القهوة") لتوسيعه — الأصناف تظهر تحته.
4. اضغط زر **القلم ✏️ (تعديل)** بجانب الصنف المطلوب.
5. فعّل المفتاح **"عرض في قسم الأصناف المميزة"**.
6. (اختياري) اكتب **ترتيب الظهور** من 1 إلى 5 (1 = أول مشهد) و**شارة العرض** (مثل "الأكثر طلبًا").
7. اضغط **تحديث**. كرّر لـ3–5 أصناف.
8. افتح `/menu/al-waha-cafe` بنافذة تخفيّ (كزائر) — قسم **"أصنافنا المميزة"** يظهر أعلى الصفحة.

---

## 5) المرحلة 2 — عدّة تنفيذ المالك (تم إعدادها كاملة؛ التنفيذ يتطلب اعتمادات لا يملكها المراجع)

**الدليل على غياب الاعتمادات:** `GIT_TERMINAL_PROMPT=0 git push origin main` → `EXIT 128 — could not read Username for 'https://github.com'` (مُوثّق في worklog Task 6). لا يوجد وصول لوحات Vercel/Neon/BotFather من هذه البيئة. **بمجرد تزويد الوكيل بتوكن GitHub (Fine-grained، هذا المستودع، Contents: R/W) + وصول Vercel، تُنفَّذ المرحلة 2 كاملة بالترتيب أدناه.**

الترتيب إلزامي (تدوير → إعادة تفويض → تحويل لخاص → إبطال التوكن):

1. **تدوير الأسرار (Vercel → Settings → Environment Variables):**
   - `JWT_SECRET` و`AUTH_SECRET`: `openssl rand -hex 64` لكل منهما (أو: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`).
   - `CRON_SECRET`: 32-hex جديد.
   - `TELEGRAM_BOT_TOKEN` من BotFather (إن كان مستخدمًا — فحص سريع: وجود ربط تيليجرام في لوحة الأدمن).
   - `DATABASE_URL`: كلمة مرور Neon جديدة من لوحة Neon → تحديث المتغير.
   - بعد كل تحديث: **Redeploy فعلي** (Deployments → … → Redeploy) — إبطال الجلسات القائمة سلوك متوقع.
   - **بوابة:** `curl -s -X POST https://menu.smart-link.ly/api/auth/login` بحساب اختبار → نجاح (200) بالسر الجديد.
2. **إعادة تفويض Vercel↔GitHub قبل التحويل لخاص:** GitHub → Settings → Applications → Installed GitHub Apps → Vercel → Configure → تأكد أن `Smart-Menu` ضمن "Repository access" صراحة. **بوابة:** لقطة من صفحة التطبيق.
3. **التحويل لخاص:**
   ```bash
   curl -X PATCH -H "Authorization: Bearer <TOKEN>" -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/ahmadmedo1012/Smart-Menu -d '{"private":true}'
   # البوابة: الاستجابة تتضمن "private": true
   git commit --allow-empty -m "test: verify deploy while private" && git push
   # راقب Deployments حتى Ready وهو خاص — البوابة الأهم في الجولة
   ```
4. **إبطال التوكن القديم فورًا:** GitHub → Settings → Developer settings → Personal access tokens → إبطال `ghp_0U3xOtAd…` (الموثّق جزئيًا في round79-phaseF-security.md). **بوابة:** استخدامه لاحقًا يعيد 403. ثم إنشاء Fine-grained بديل (هذا المستودع فقط، Contents: Read/Write).

---

## 6) تأكيدات صريحة مطلوبة بالخطة

**هل المستودع خاص فعليًا الآن؟** **لا.** الوكيل لا يملك توكن GitHub لتنفيذ `PATCH` (الدليل أعلاه). الحالة الحالية كما راجعها Round79: عام (أُعيد للعلنية لفك حجب Vercel — موثّق في launch-readiness §5). الحلّ الكامل في §5 أعلاه بترتيبه الملزم.

**كم صنفًا مميزًا فعّالًا حاليًا على كل مطعم تجريبي حي؟**
- **الإنتاج (`menu.smart-link.ly`): صفر** على `al-waha-cafe` (16/16 صنفًا `isFeatured:false` — فحص Round79 المباشر للحمولة الحية). لم يتغير لأن تفعيل الإنتاج يتطلب دخول المالك (§4).
- **النسخة المحلية المُثبتة:** `al-waha-cafe = 3` (ranks 1/2/3 بشارات)، `al-aseel = 0` (حالة الحافة). موثّق باستعلام SQL في worklog Task 7.

---

## 7) اكتشافات جانبية جديدة (خارج نطاق الخطة، موثّقة للأمانة)

1. **تحذير hydration مسبق في حقل البحث** (`caret-color:transparent` على `#menu-search`): يظهر في أي منيو ≥8 أصناف (مع القسم أو بدونه — ليس سببه القسم؛ `al-aseel` بأربعة أصناف بلا حقل بحث بلا التحذير). خطورة منخفضة — يُقترح كبند متابعة round81.
2. **تعارض مجلد تقارير Playwright HTML** (`test-results/report` داخل `test-results`): يمنع تشغيل `--reporter=html` الافتراضي؛ التشغيل المحلي استخدم `--reporter=line`. إصلاح مقترح: تغيير outputFolder في playwright.config.ts.

---

## 8) الوصول للكود

كل تعديلات Round80 **محمّلة محليًا في `/home/z/my-project/Smart-Menu` على main (2 كوميتات: الخطة + التعديلات)** والدفع لـ GitHub يتطلب اعتمادات (الدليل EXIT 128 أعلاه) — إمّا دفعها يدويًا أو تزويد الوكيل بتوكن محدود الصلاحية. البوابة الختامية بعد الدفع: نشر Vercel ناجح واحد (خاصةً مع تبديل قناة البناء إلى `prisma migrate deploy`).

الأدلة الكاملة: `/home/z/my-project/download/round80/` (لقطات + JSON القياسات + ملخص المرحلة 1) و`/home/z/my-project/download/round79-phaseC/journey-matrix.json` (رحلة الخلية الحقيقية) و`/home/z/my-project/worklog.md` (سجل تنفيذ خطوة بخطوة).
