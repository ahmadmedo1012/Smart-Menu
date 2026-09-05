# Smart-Menu — Documentation Index (round85)

> **73 ملف** من تقارير الجولات 2→85. هذا الفهرس هو نقطة الدخول: ابدأ من
> "المرجعية" ثم "الجولات الحديثة" — كل ما قبل الجولة 75 أرشيف تاريخي
> (اقرأه فقط عند تتبع قرار قديم).

## المرجعية (اقرأها أولاً)

| الملف | الدور |
|-------|-------|
| `../README.md` | نظرة عامة + إعداد + بوابات الجودة (محدّث جولة 84/85) |
| `../PROJECT.md` | مرجع المشروع الكامل: المعمارية، الأدوار، الاختبارات، البيئة (أعيدت كتابته جولة 85) |
| `../CLAUDE.md` | قواعد وكيل العمل + بنية المشروع |
| `../SMART-MENU-ROUND83-PLAN.md` + `round83-implementation-report.md` | خطة/تنفيذ ميزة الأصناف المميزة (featured showcase) |
| `round84-audit-report.md` | آخر تدقيق عالمي (axe صفر مخالفات، OG card، apple-touch) |

## الجولات الحديثة (75 → 85) — الحية

| الملف | الموضوع |
|-------|---------|
| `round79-launch-readiness.md` + `round79-master-plan.md` + `round79-phase{A,B,C,D,F,H}*.md` | جولة الإطلاق الشاملة: جرد → توحيد الثيم → رحلات → dedup → أمان → showcase |
| `round80-plan.md` + `round80-closure-report.md` | إغلاق جولة 80: قناة migrate-deploy، P1002، البوابات الصارمة |
| `round81-audit-report.md` | أول CI أخضر + سلاسل migrations قابلة لإعادة التشغيل |
| `round78-perf-fixes.md` | تحسينات أداء (aggregate بدل findMany، narrowing الاستعلامات) |
| `../SMART-MENU-ROUND85-PLAN.md` | الجولة الحالية: أمان/أداء/جودة/اختبارات/توثيق |

## الاختبارات وQA (أرشيف)

- `full-qa-report-round*.md` (10 ملفات) — تقارير QA للجولات 4→19
- `full-qa-report-2026-08-03*.md` + `qa-run-verbatim-2026-08-03.txt` — سجلات يوم واحد
- `comprehensive-qa-report.md`، `final-verification-report.md`، `final-mega-report-round41.md`
- `reports/` — تقارير مؤرخة (نشر/اختبار/تدقيق UI بتاريخ 2026-08)

## التصميم (أرشيف)

- `design-audit-round{20,22,23}.md`، `design-audit-full-round20-21.md`، `design-improvements-round24.md`، `design-opendesign-round26-27.md`
- `design-references-round79.md` — المراجع البصرية العالمية (ما زالت مفيدة)

## سجل الجولات التاريخي (2 → 74)

| النطاق | الملفات |
|--------|---------|
| 18–41 | `full-qa-report-round18/19.md`، `rounds29-30-scenarios.md`، `round31…round41-*.md`، `rounds42-43-animated-icons.md` |
| 45–58 | `round45-landing-coherence.md` … `rounds57-58-landing-final.md` (landing/UI) |
| 59–74 | `round59-tests-pass.md` … `round73-rerun-fixes.md` (اختبارات، نشر، UIUX، onboarding، صلاحيات) |
| متفرقات | `audit-report-july-2026.md`، `repair-plan.md`، `fix-user-notes-round28.md`، `glowing-search-bar-plan.md` (حُذف — منفّذ) |

> **ملاحظة حفظ**: لا تحذف الأرشيف — هو سجل قرارات المشروع الوحيد. الملفات
> المؤرخة قبل الجولة 75 تُقرأ "as-of-date" فقط: الأعداد والأوامر فيها لا
> تعكس الحاضر (المصدر الحقيقي دائماً README/PROJECT/package.json).

- [ops-runbook.md](ops-runbook.md) — production ops runbook (round86)
