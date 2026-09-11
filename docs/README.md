# Smart-Menu — فهرس التوثيق (round96-W5)

> **129 ملفًا** موزعة على مرجعية حية + أرشيف جولات منظّم (`docs/rounds/`).
> هذا الفهرس هو نقطة الدخول: ابدأ من «المرجعية الحية» ثم `rounds/` حسب نوع
> الوثيقة. كل ملف قبل الجولة 96 كان مبعثرًا في جذر `docs/` وجذر المستودع —
> أُعيد تنظيمه هنا بـ`git mv` (التاريخ محفوظ بالكامل).

## القاعدة الذهبية للأرشيف

> **«الأرشيف سجل قرارات — يُنقل ولا يُحذف.»**
> ملفات الجولات المغلقة تُقرأ «as-of-date»: الأعداد والأوامر والمسارات فيها
> لا تعكس الحاضر — المصدر الحي دائمًا `README.md` / `PROJECT.md` /
> `package.json`. ملاحظة: التعليقات التاريخية داخل الكود قد تشير لمسارات
> ما قبل r96 (مثل `docs/round79-master-plan.md`) — مواقعها الحالية تحت
> `docs/rounds/…` أدناه.

## المرجعية الحية (تُقرأ أولًا — تبقى في مكانها)

| المسار | الملفات | الدور |
|-------|---------|-------|
| `../README.md` | 1 | نظرة عامة + إعداد + بوابات الجودة (الجذر) |
| `../PROJECT.md` | 1 | مرجع المشروع الكامل: معمارية/أدوار/اختبارات/بيئة (الجذر) |
| `../CLAUDE.md` | 1 | قواعد وكيل العمل + بنية المشروع (الجذر) |
| [`ops-runbook.md`](ops-runbook.md) | 1 | تشغيل الإنتاج (PITR/rollback/حوادث) — round86 |
| [`smartbot-design-spec.md`](smartbot-design-spec.md) | 1 | مواصفة التوأمة البصرية مع SmartBot — مرجع الجولات 95/96 الحي |
| [`security/`](security/) | 1 | `rbac-matrix-round88.md` — مصفوفة RBAC (مرجع اختبارات `rbac-*`) |
| [`round90/`](round90/) | 7 | تشخيص الجولة 90 كاملًا (`diagnosis/`: cso-audit · health-devex · investigation · merged-triage · qa-live · review-backend · review-quality) — مذكور حرفيًا في `knip.config.ts` وworkflows |
| [`reports/`](reports/) | 4 | تقارير مؤرخة 2026-08 (نشر/اختبار/UI) |

## أرشيف الجولات — `rounds/` (110 ملفات)

| المجلد | الملفات | المحتوى | النطاق |
|--------|---------|---------|--------|
| [`rounds/plans/`](rounds/plans/) | 17 | خطط الجولات الرسمية | 66 · 79 · 80 · 83 · 85–96 · repair |
| [`rounds/closures/`](rounds/closures/) | 13 | تقارير الإغلاق النهائية | 80 · 86–91 · 93–97 (94 بتقريرين: كامل + ملاحظات partial) |
| [`rounds/inspections/`](rounds/inspections/) | 12 | تقارير الفحص التشغيلي | 93 (a–f) · 94 (a–f) |
| [`rounds/qa/`](rounds/qa/) | 14 | تقارير QA تاريخية + سجلات حرفية | جولات 4→41 + 2026-08-03 |
| [`rounds/design/`](rounds/design/) | 7 | تدقيقات ومراجع التصميم | 20–27 · 79 (design-references ما زال مفيدًا) |
| [`rounds/history/`](rounds/history/) | 47 | سجل الجولات 2→93 (سيناريوهات، إصلاحات، تدقيقات، محاكاة 93) | 29–93 |

### أبرز ملفات الجولات الحديثة

- [`rounds/plans/SMART-MENU-ROUND96-PLAN.md`](rounds/plans/SMART-MENU-ROUND96-PLAN.md) — خطة الجولة 96 (أحدث خطة موثقة؛ 97 عملت من تقارير التشخيص مباشرة)
- [`rounds/closures/round97-closure-report.md`](rounds/closures/round97-closure-report.md) — إغلاق الجولة 97: أدق التفاصيل (SSR المنيو + إصلاح مالي + RCE + سباق team8)
- [`rounds/closures/round96-closure-report.md`](rounds/closures/round96-closure-report.md) — إغلاق الجولة 96: منيو الديمو الواقعي + التوأمة الكاملة + تنظيم المستودع
- [`rounds/closures/round95-closure-report.md`](rounds/closures/round95-closure-report.md) — إغلاق التوأمة البصرية (9/10)
- [`rounds/closures/round94-closure-notes-partial.md`](rounds/closures/round94-closure-notes-partial.md) + `round94-closure-report.md` — القرارات المعلقة (MED-1)
- [`rounds/inspections/round93-inspection-e.md`](rounds/inspections/round93-inspection-e.md) — لغز بيئة 1666/1642 (مُدرج في FILE_ALLOWLIST)

## أرشيف السكربتات — `../scripts/archive/` (35 ملفًا)

سكربتات الجولات لمرة واحدة (round86–92 · r95 المحاكاة/اللقطات · diff الجلسة المقطوعة 93 ·
`round88-perf/` بنتائجه · لقطات/محاكاة إنتاج r96 — أُرشِفت r97-X5 وفق القاعدة #3) —
**لا تستدعَ من CI أو الاختبارات**؛ الأدوات الحية كلها في
`scripts/` الجذر (23 ملفًا — قائمة كاملة بالأغراض في `../PROJECT.md` § Live Scripts).

## اتفاقية الجولات القادمة

1. الخطة → `docs/rounds/plans/` باسم `SMART-MENU-ROUND{N}-PLAN.md`
2. الفحوص → `docs/rounds/inspections/`، الإغلاق → `docs/rounds/closures/`
3. سكربت الجولة بعد إغلاقها → `scripts/archive/` (بعد فحص: workflows · knip · FILE_ALLOWLIST · tests)
4. المرجعية الحية (runbook/مواصفات) تبقى في جذر `docs/` — لا تدخل الأرشيف
