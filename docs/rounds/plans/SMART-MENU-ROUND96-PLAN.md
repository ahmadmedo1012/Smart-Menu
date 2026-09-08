# خطة الجولة 96 — «منيو عرض واقعي + إقفال التوأمة + فحص Neon + تنظيف المستودع»

> التاريخ: 2026-09-09 · خط الأساس: `fac1508c` (r95 = إنتاج حي، CI أخضر) · الهدف: https://menu.smart-link.ly

## أمر المستخدم (مطابَق حرفيًا)
1. **منيو عرض شبه حقيقي**: أسماء + صور + أصناف + أسعار + كل شيء لتجربة كاملة.
2. تحسين المظهر والشكل أكثر.
3. فحوصات وتشخيص شامل مفصلة على كل المستويات بـ**عدد كبير من الوكلاء**.
4. **حذف «اعرف المزيد»** من تحت البطاقات (غير قابلة للنقر، لا فائدة منها) — كليًا.
5. مطابقة ألوان وشكل SmartBot — **مشروعان متطابقان** في الألوان والمؤثرات والثيمات والتفاعلات والأيقونات.
6. فحص **قاعدة البيانات Neon** والتأكد من سلامتها.
7. تنظيف المستودع وتنظيمه: احترافي، منظم، إبداعي، مختصر.
8. عمق وتخطيط ثم اختبار والتأكد من صحة كل شيء.

## التشخيص (مُنجز — 4 وكلاء + منسّق)
- **r96-A1** (تصميم SmartBot): جرد كامل — 52+ رمزًا حرفيًا، 12 keyframe، سلم radius (2xl=28px!)، نظام زر (sweep+glow+flame)، منظومة dashboard (sidebar/KpiCard/PageHeader)، قواعد عامة (scrollbar/selection/focus/grain/grid)، نظام reveal — التفاصيل في worklog.
- **r96-A2** (فجوات Smart-Menu): «اعرف المزيد» موضع وحيد FeaturesSection:117-126+استيراد ArrowUpRight · 5 رموز مفقودة (placeholder-text + soft×4) · background-radial معرف بلا استخدام · FeaturedRestaurantsSection غير مؤدم (ظلال rgba مقحمة) · owner/loyalty فاتح first (14 موضع bg-white) · dietary إيموجي (10) · upload-fly مفقود · cosmetic (font-display ميت، rounded-[20px]، ease مقحم).
- **r96-A3** (بيانات الديمو): آلية التوصيل المثلى = **هجرة بيانات idempotent** (سابقة معتمدة r92) بمفاتيح slug/name لا ids · منيو الإنتاج الحالي بلا صور/خيارات (فجوة F2) · صور Unsplash سقطت مرتين → **قرار: صور محلية public/demo/** · بنية مقترحة 5 فئات/24 صنفًا/مجموعات خيارات/featured 1-5 · اختبار team2 متوافق (مشروبات ساخنة + غياب سموثي/ليموناضة عنها).
- **r96-A4** (نظافة المستودع): 10 خطط جذر→docs/rounds/plans/ · 112 ملف docs→بنية rounds/{plans,closures,inspections,qa,design,history} · ~28 سكربت→scripts/archive/ · حذف bun.lock + container-scroll-animation.tsx (الوحيد الميت في src) · خطوط حمراء محددة (8 سكربتات + اختبارات تستورد مسارات + FILE_ALLOWLIST) · README/فهرس متقادم.
- **r96-A5** (Neon — منسّق): health=connected 359ms · كل النقاط 200 (featured/menu/plans/sitemap/stats/print) · CI أخضر على fac1508c (بوابة migrate parity) · سلسلة الهجرات مطبقة نظيفة على PGlite محليًا (عميل pg) · F1 الإحالة أثبتت مسار الكتابة حيًا (r95).

## الموجات التنفيذية

### W1 — حذف «اعرف المزيد» (منسّق، فوري)
FeaturesSection.tsx: حذف الكتلة 117-126 + استيراد ArrowUpRight إن بلا استخدام آخر.

### W2 — توليد صور الطعام (منسّق — مهارة image-generation)
~20 صورة طعام/مشروبات عربية واقعية بنمط موحد (إضاءة دافئة داكنة تناسب ثيم اللهب) → ضغط webp → `public/demo/*.webp` → فهرس JSON للمرجع.

### W3 — هجرة بيانات المنيو الواقعي (منسّق)
`prisma/migrations/20260909_round96_demo_menu/migration.sql`:
- UPDATE المطعم al-waha-cafe-demo (وصف/شعار محلي/مدينة/ساعات/غلاف).
- 5 فئات (name/nameAr أيقونات) بترتيب، الأربع الحالية بالاسم نفسه (توافق team2).
- 24 صنفًا (اسم عربي واقعي/وصف/سعر د.ل/صورة /demo/x.webp) — INSERT..WHERE NOT EXISTS + UPDATE للموجود بالاسم.
- مجموعات خيارات للحجم/الإضافات (لاتيه كراميل + برجر الواحة) فقط عند غيابها.
- featured 1-5 + showcaseTags (مميز البيت/الأكثر طلبًا...).
- إخفاء المطعم المكرر al-waha-cafeewewe من الهبوط (showOnLanding=false) — قرار round94 MED-1.
- idempotent كليًا، بلا ids رقمية، محمي بـ WHERE.

### W4 — إقفال التوأمة البصرية (وكيلان متوازيان)
- **r96-W4a** (globals + أقسام الزوار): الرموز الخمسة المفقودة + upload-fly + تطبيق background-radial في layout العام + تأديم FeaturedRestaurantsSection (رموز الظل، text-white→tokens) + cosmetic (rounded-2xl، ease-smooth، حذف font-display الميت) + text-white→text-orange-foreground في عدادات MenuItemCard.
- **r96-W4b** (أيقونات + loyalty): DIETARY_ICONS إيموجي→أيقونات lucide SVG (بالنص العربي كما هو) + fallback MenuItemCard + CategoryTabs fallback نظيف + تأديم owner/loyalty (bg-white→bg-card/border-border — 14 موضعًا).

### W5 — تنظيم المستودع (وكيل بإشراف منسّق)
تنفيذ خطة r96-A4: git mv للأرشيف (جذر نظيف 3 ملفات md) + scripts/archive/ + حذف bun.lock + container-scroll-animation.tsx (بعد vitest) + .gitignore (worklog.md منقول من info/exclude + إزالة remotion البائد) + docs/README.md فهرس جديد + تحديث README.md/tests/README.md/PROJECT.md — **بلا مساس بالخطوط الحمراء**.

### W6 — بوابة الجودة (منسّق)
tsc=0 · lint=0 · vitest كامل · build نظيف (هجرة على قاعدة نظيفة) · e2e محلي (r92-e2e-local: teams الأساسية + journey) · لقطات مرئية للمنيو الجديد والتوأمة.

### W7 — النشر والتحقق الإنتاجي (منسّق)
push → CI + Vercel auto-deploy → تحقق: health.commitSha = الجديد · منيو الديمو بصور/خيارات/featured حي · featured في الهبوط · «اعرف المزيد» اختفت · محاكاة مستخدم (طلب بخيارات عبر WhatsApp flow) · لقطات إنتاج.

### W8 — الإغلاق (منسّق)
تقرير docs/round96-closure-report.md + worklog محدث + ملخص للمستخدم.

## معايير القبول
- [ ] منيو al-waha-cafe-demo: 5 فئات، 24 صنفًا بصور حية، مجموعات خيارات تعمل، featured بتاج، أسعار واقعية
- [ ] صفر «اعرف المزيد» في كل src/ و الإنتاج
- [ ] الرموز المفقودة حاضرة + background-radial مرئي + dietary SVG
- [ ] owner/loyalty داكن متسق
- [ ] جذر المستودع 3 ملفات md فقط + docs/rounds/ منظم + فهرس حي
- [ ] tsc=0، lint=0، unit خضراء، e2e محلية، CI خضراء، الإنتاج عند الالتزام الجديد
- [ ] Neon: كل المسارات العامة 200 + halsC صحة DB + كتابة مثبتة (طلب محاكاة)
