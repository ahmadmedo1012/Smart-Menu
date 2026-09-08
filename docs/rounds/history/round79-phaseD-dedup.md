# تقرير المرحلة D — التحقق البنيوي للتكرار + الدمج (round79)

**التاريخ:** 2026-09-05 · **الأساس:** كوميت `b482f0d4` (ما بعد دفع A+B ونشر Vercel) · **النتيجة:** دمج ثلاثة تكرارات مؤكدة + مراجعة وكيل مستقل + إصلاح ملاحظتها

---

## 0) الأدوات المفروضة مقابل المنفَّذ فعليًا (شفافية)

| الأداة المفروضة في الخطة | حالتها | ما نُفِّذ فعليًا |
|---|---|---|
| `ast-grep-mcp` | الـ MCP غير مثبت في هذه البيئة (موثّق منذ المرحلة A) | **محرك ast-grep نفسه** `@ast-grep/cli 0.45.3` (ما يغلّفه الـ MCP) — فحص طازج كامل على HEAD + مقارنات قبل/بعد لكل دمج. السجل الخام: `scripts/round79-phaseD-astgrep.txt` |
| `Understand-Anything` /understand-diff | غير مثبت في هذه البيئة (موثّق منذ المرحلة A) | مقارنة بنيوية مكافئة: `git show <base>:<file>` (قبل) مقابل `ast-grep run` (بعد) لكل نمط مدموج — القسم 3 أدناه + أوامر حرفية قابلة لإعادة التشغيل |

---

## 1) القائمة الصريحة بكل تكرار حقيقي (بوابة الخروج #1)

> كل بند مؤكد بفحص ast-grep طازج على `b482f0d4` (قبل أي تعديل). البنود د1/د3/د5 **دُمجت** في هذه المرحلة؛ البنود الأخرى وُثّقت بقرار صريح (دمج/تأجيل) مع المبرر.

### دُمجت فعليًا في هذه المرحلة

**د1 — بطاقتا KPI بنفس البنية الوظيفية:**
- قبل: `src/components/admin/KpiCard.tsx` (كامل) + `OwnerKpiGrid.tsx` StatCard الداخلية (سطر 72-134) — كلاهما: رابط ممدود + `sr-only` + بلاطة أيقونة + قيمة `text-3xl` + `toArabicNumber`. الدليل القاطع: تعليق داخل KpiCard نفسه: "(OwnerKpiGrid pattern)"
- **الدمج:** `src/components/shared/KpiCard.tsx` موحّد (فائق الخصائص: animated/subtitle للمالك + trend/sparkline/suffix للأدمن، مدخل reduced-motion)؛ `admin/KpiCard.tsx` أصبح جسر إعادة تصدير (8 مستهلكين بلا تغيير استيراد)؛ `OwnerKpiGrid.tsx` حذف StatCard+AnimatedCounter (~120 سطر)
- إثبات بعدي: نمط `<span className="sr-only">{$L}</span>` = **ملف واحد** (كان 2)

**د3 — ثلاثة مسارات إحصائيات تعيد نفس الاستعلامات:**
- قبل: `api/stats/route.ts` (104 سطرًا) + `api/admin/stats/route.ts` (215) + `api/stats/advanced/route.ts` (230) — مشتركة: كتلة حلّ نطاق المطعم (متطابقة حرفيًا 15 سطرًا ×2)، orderItem.groupBy للأصناف الشائعة ×4 (مع انحراف take: 10 مقابل 15)، ترطيب الأسماء findMany+Map ×3، order.aggregate للإيراد ×2
- **الدمج:** `src/lib/stats-queries.ts` جديدة: `resolveRestaurantScope` + `popularItemsQuery` + `hydratePopularItems` (بثلاثة أنماط أسماء تحفظ سلوك كل مسار حرفيًا) + `revenueAggregate`. المسارات الثلاثة تعيد البناء عليها — استجابات API متطابقة بايت-ببايت
- إثبات بعدي: استعلامات groupBy الحرفية المتبقية = **0** (كانت 4)

**د5 — قيود تحقق الحقول مكررة inline بلا مصدر موحد:**
- قبل: username بـ8 صيغ منحرفة (min3+max30+رسالة / min3+max50 / min3 / min1 / ...) عبر: `auth/register`, `auth/login`, `admin/admins`, `admin/create-owner`, `users/[id]`, `subscriptions/validate`, `subscriptions` (tempUsername — اكتشفته المراجعة المستقلة), `restaurants` + password بـ4 صيغ + name بـ5 مواضع
- **الدمج:** `src/lib/validation.ts` جديدة (تبع نمط `lib/constants.ts` القائم): `usernameField/Optional/Presence/PresenceOptional` + `passwordField/Optional/Presence` + `nameField/Optional`. اعتُمدت في 9 مسارات (الثمانية أعلاه + `admin/profile` للاسم)
- توثيق توحيد السياسة (تشديد فقط، لا مس ببيانات قائمة): username max→30 في admins (كان 50)، إضافة max(30) لcreate-owner/validate/restaurants، إضافة max(100) لكلمات المرور حيث غابت، رسائل عربية موحدة حيث كانت إنكليزية افتراضية
- إثبات بعدي: `username:\s*z\.string` inline = **0** (كانت 7)

### وُجدت ولم تُدمج — بقرار موثّق

**د2 — انتشار استدعيات Prisma القياسية (79 findUnique في 37 ملفًا):** ليست تكرارًا منطقيًا — هذه طريقة استدعاء Prisma المعتادة. التوحيد القسري (مثل `lib/prisma-calls.ts` عالمي) سيضيف طبقة غير مجدية. **القرار: لا دمج.** الحالة المشابهة التي تستحق دمجًا (استعلامات نفس المعنى عبر مسارات) عولجت ضمن د3.

**د4 — مكتبة fetchJson مهجورة (3 متبنّين مقابل 75 fetch خام):** فرصة تبنٍّ حقيقية لكن تبديل 75 استدعاء دفعة واحدة على إنتاج حي = مخاطرة كبيرة بلا اختبارات E2E بعد (المرحلة C لم تُنفّذ). **القرار: تأجيل التبنّي التدريجي لما بعد المرحلة C** (يُعاد فتحه هناك لأن مصفوفة C ستوفر شبكة الأمان).

**د6 — ثلاثة تطبيقات لصف البحث:** `search-input.tsx` (مستهلكة في 7 صفحات) و`MenuToolbar.tsx` (debounce مخصص مُصدَّر لاختبارات وحدة ناجحة: `debounced-callback.test.ts`) و`action-search-bar.tsx` (لوحة أوامر ⌘K مختلفة وظيفيًا). البنية مختلفة وظيفيًا (debounce قيمة مقابل callback مقابل palette). **القرار: لا دمج الآن** — توحيد debounce فقط سيُدرس بعد C.

**د7 — هيكل حواريات CRUD المتوازي:** `RestaurantFormDialog` و`ItemDialog` كلاهما [form]+[saving]+csrfFetch لكنها كيانات مختلفة الحقول تمامًا (432+ سطر لكل). استخراج hook عام = إعادة هيكلة كبيرة لملفين حساسين على إنتاج حي. **القرار: توثيق فقط** (مرشح لجولة مستقبلية مع اختبارات C).

**د8 — دورة تحميل client-side يدوية (useState(true) في 28 ملفًا):** يتطلب hook عامًا (useApiQuery) وتبديل عشرات الملفات — نفس منطق د4. **القرار: تأجيل لما بعد C.**

**عائلات مقصودة (لا تُعد تكرارًا أصلًا):** أيقونات ج51 (24 غلافًا بقرار موثق)، premium-toast (هو المصدر الموحد الصحيح)، requireAuth/requirePermission (استدعاء صحي معماريًا)، الحوامل الخادمة الصغيرة (تفويض مقصود).

**ملاحظة نطاق أسماء الحقول:** أسماء الأصناف/التصنيفات (`items/[id]`, `categories/*`) تتشارك الشكل min(1).max(100) مع أسماء الأشخاص لكنها **نطاقات سياسة مختلفة** — لم تُدمج عمدًا (منع تسريب سياسة بين نطاقات مختلفة).

---

## 2) المقارنة البنيوية قبل/بعد لكل دمج (بديل understand-diff الموثّق)

```
# M1 (د1): النمط القاطع للتكرار
$ git show b482f0d4:src/app/'(protected)'/owner/OwnerKpiGrid.tsx | grep -c 'sr-only'   → 1 (نسخة ثانية موجودة)
$ ast-grep run -l tsx -p '<span className="sr-only">{$L}</span>' src/                 → 1 ملف فقط (shared/KpiCard.tsx:163)

# M2 (د3): الاستعلامات الحرفية
$ rg -c 'orderItem\.groupBy\(\{' src/app/api   → لا نتائج (كانت 4 حرفية)
$ rg -c 'popularItemsQuery' src/app/api        → admin/stats:2, stats/advanced:3, stats:2 (استيراد+استدعاء)

# M3 (د5): القيود الحرفية
$ rg "username:\s*z\.string" src/app/api       → لا نتائج (كانت 7)
$ rg -c 'usernameField|passwordField|nameField|nameOptional' src/app/api → 9 مواضع عبر 8 مسارات
```

---

## 3) بوابة الخروج #2 — الدمج لم يكسر شيئًا (نواتج حرفية)

```
$ npm run typecheck   → tsc --noEmit، EXIT=0 (صفر أخطاء)
$ npm run lint        → eslint src/ tests/، EXIT=0 (صفر أخطاء)
$ npm run build       → Next.js 16.2.12، EXIT=0، 84/84 صفحة ثابتة، postbuild OK
$ npm run test        → Test Files 22 passed (22) · Tests 409 passed (409) · EXIT=0
```

> ملاحظة: أسطر [ERROR] في ناتج vitest من `keys.test.ts` هي **اختبار مقصود** لفشل التحقق من متغيرات البيئة (stderr متوقع داخل الاختبار نفسه) — الاختبار ناجح.

---

## 4) صافي التغيير

- ملفات جديدة: 3 (`src/components/shared/KpiCard.tsx`, `src/lib/stats-queries.ts`, `src/lib/validation.ts`)
- ملفات معدّلة: 15 (OwnerKpiGrid، admin/KpiCard كجسر، مسارات stats الثلاثة، المسارات التسعة للتحقق)
- diff كلي: **71 إضافة / 355 حذفًا = 100% محتوى حقيقي، صفر ضجيج مسافات** (diff العادي = diff متجاهل المسافات بالضبط)

---

## 5) المراجعة المستقلة (مبدأ لا-تنفيذ-منفرد) — النتائج والمعالجة

وكيل مراجعة مستقل (Task ID: D-REVIEW في سجل العمل) راجع الدمجات الثلاثة بـ git diff/show + ast-grep + tsc + eslint. أحكامه:

- **M1 SAFE-WITH-NOTES:** كل props المستهلكين مدعومة، الجسر لا يكسر استيرادًا، AnimatedCounter منقولة حرفيًا. التغييرات البصرية على نسخة الأدمن فقط (إزالة ambient glow، spring→easeOut+stagger) — موثقة كقرار «اتباع chrome المالك» + مكسب a11y (reduced-motion كان غائبًا عن أدمن)
- **M2 SAFE:** تعادل استجابات مثبت سطرًا سطرًا (الرسائل/الترتيب/الوعود)
- **M3 SAFE-WITH-NOTES:** تشديد فقط لا تفكيك؛ login بقي presence-check؛ الرسائل العربية الموحدة ظاهرة للعميل في المسارات التي كانت ترد إنجليزية

**ملاحظاتها وعلاجها:**
| الملاحظة | العلاج |
|---|---|
| `tempUsername` في subscriptions/route.ts = موقع ثامن فات الدمج (إلزامي) | **عُولج** — رُحّل إلى `usernameOptional` |
| ضجيج مسافات tabs→spaces في 5 ملفات يضخّم الـdiff | **عُولج جذريًا** — أُعيد تطبيق كل التعديلات بمسافات جد أصلية عبر سكربتات بايتية (`scripts/round79-phaseD-reapply.py` + `-stats-reapply.py`) — diff نهائي صفر ضجيج |
| groupBy خامس شبيه في menu/[slug] (best-sellers بفلتر status) | وُثّق كتوسعة اختيارية — ليس drop-in للباني الحالي، خارج نطاق د3 المعلن |
| أسماء الأصناف/التصنيفات/senderAccountName تتشارك الشكل فقط | وُثّق كقرار واعٍ بعدم الدمج (عزل نطاق السياسة) |
