# الجولة الضخمة 66 — Open Design شامل للمظهر وUX (10+ وكلاء)

## الخطة المعمارية
**الأبعاد الستة** (لكل منها وكلاء فحص + إصلاح):

1. **RTL/Bidi** — أبعاد open design: bdi للأرقام mixed، dir=ltr للحقول، tracking على عربية
2. **Anti-AI-slop** — indigo/trust gradients/emoji icons/filler copy
3. **الألوان** — accent discipline (5-10% pixel)، تباين 4.5:1، dark mode
4. **قوانين UX** — Hick/Miller/Fitts/von Restorff/Peak-End في كل الصفحات
5. **الأنيميشن** — animation discipline، prefers-reduced-motion
6. **a11y** — focus-visible، aria، keyboard، contrast

## التنفيذ
1. تشغيل مسبار الـ DOM الشامل (design_probe.py) — قياسات حقيقية
2. تجنيد 10 وكلاء: 6 فحص كل بُعد + 2 شخصيات (مالك/زبون) + 1 i18n + 1 تلخيص
3. دمج النتائج → إصلاحات مرتبة بالتأثير
4. tsc+build → push → تحقق حي → تقرير نهائي

## أدوات
- design_probe.py (مسبار DOM)
- canvas color resolution
- regex sweeps (tracking/emoji/left-right/indigo)
