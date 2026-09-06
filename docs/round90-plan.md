# Smart-Menu — الجولة 90 «جولة gstack العميقة»

> منهجية هذه الجولة مبنية على **gstack** (https://github.com/garrytan/gstack) — مصنع البرمجيات مفتوح المصدر
> لـ Garry Tan (رئيس YC): 23 دورًا متخصصًا + 8 أدوات قوة. مُثبَّت رسميًا في `~/.claude/skills/gstack`
> (55 مهارة · متصفح browse جاهز) — ومنهجياته تُدار عبر أسطول وكلائنا.

## الهدف
أعمق فحص وتشخيص في تاريخ المشروع (CSO/STRIDE/OWASP + جيش مراجعة 8 تخصصات + محقق + صحة + DevEx + QA حي)
ثم أعلاه إصلاحًا وإتقانًا، مع إنجاز بنود الجولة 89 المؤجلة.

## خط الأساس (مُتحقق منه قبل الإطلاق)
- tsc: 0 أخطاء · eslint: 0 أخطاء (21 تحذير any موروث) · vitest: **1082/1082** · build: 85 صفحة ✅
- PostgreSQL محمول :5434 يعمل · 19 هجرة مطبقة
- ⚠️ بيئة: `DATABASE_URL` في الـ shell يشير لملف SQLite آخر — **كل أمر يلمس قاعدة البيانات يحتاج البادئة**:
  `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/smartmenu" SKIP_ENV_CHECK=true`

## موجات الجولة

### الموجة 1 — أسطول التشخيص (6 وكلاء متوازين، تشخيص فقط بلا تعديل كود)
| ID | الوكيل | منهجية gstack | النطاق |
|----|--------|---------------|--------|
| g90-D1 | مدقق الأمن الأعلى (CSO) | `cso/SKILL.md` + `cso/sections/audit-phases.md` | Phases 0-14 كاملة: STRIDE + OWASP A01-A10 + أسرار التاريخ + سلسلة التوريد + CI/CD |
| g90-D2 | جيش المراجعة (خلفي) | `review/specialists/{security,red-team,api-contract,data-migration}.md` | src/app/api · src/lib · prisma — كامل الشجرة لا diff فقط |
| g90-D3 | جيش المراجعة (جودة) | `review/specialists/{performance,testing,maintainability,simplification}.md` | استعلامات · فجوات اختبار · كود ميت · بنية زائدة |
| g90-D4 | المحقق | `investigate/SKILL.md` (Iron Law + الفرضيات) | بنود r89 المؤجلة: TOCTOU · 6 رسائل إنجليزية · PUT image cap · nightly flake |
| g90-D5 | الصحة + DevEx | `health/SKILL.md` + `devex-review/SKILL.md` | لوحة صحة الأدوات + تجربة المطور + نظافة المستودع |
| g90-D6 | QA حي بمتصفح | `qa/SKILL.md` + `qa/references/issue-taxonomy.md` | رحلات حية على next start محلي + مقارنة بالإنتاج |

**مخرجات كل وكيل**: نتائج بصيغة JSON سطرًا-بسطر (schema gstack) + تقرير في `docs/round90/diagnosis/` + إلحاق بالـ worklog.

### الموجة 1.5 — الدمج والفرز (المنسِّق)
- دمج كل النتائج → بصمات (fingerprints) → إزالة التكرار → بوابات الثقة (7+ عرض · 5-6 بتحفظ · 3-4 ملحق · 1-2 إسقاط)
- `quality_score = max(0, 10 - (critical×2 + informational×0.5))`
- فرز إلى دفعات إصلاح (Fix-First: آلي للآلي/الآمن · قرار للمخاطر الكبيرة)

### الموجة 2 — أسطول الإصلاح (وكلاء متوازون حسب الدفعات)
- أمان حرج أولاً ثم بنود r89 المؤجلة ثم جودة/أداء/اختبارات
- كل إصلاح مرفق باختبار يثبته (بحسب منهجية testing specialist)

### الموجة 3 — البوابات والدفع والنشر
- check-secrets · tsc · eslint · vitest (فوق العتبات 59/54/60/61) · build · e2e (security/api/ui/qa-teams)
- دفع موقّع (6+ commits) → Vercel → تحقق إنتاجي حي شامل + تقرير إغلاق

## قواعد صارمة
1. وكلاء التشخيص **لا يعدلون كودًا** — قراءة وتشغيل فحوص فقط
2. كل أمر DB بالبادئة أعلاه · لا git push/commit إلا من المنسِّق
3. نتائج JSON بخط المعايير `{severity, confidence, path, line, category, summary, fix, fingerprint, specialist}`
4. الثقة 7+ فقط تدخل قائمة الإصلاح الرئيسية
