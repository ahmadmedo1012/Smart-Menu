-- W7-B (G-4 من تدقيق W6-A3 — القرار المؤجل في W6-B6): سطور «الميزات»
-- النوعية في صفوف الخطط تتبع ما يُنفَّذ فعلًا (قانون r92: TEXT follows
-- ENFORCEMENT — والامتداد الطبيعي: لا وعد بميزة لا تفتحها خطة صاحبها).
--
-- دليل الإنتاج الحي (menu.smart-link.ly/api/plans عند W7-B — انحراف موثّق
-- عن بذرة default-plans.json شكلاً وجوهرًا):
--   Basic      «تقرير شهري»          → لا يوجد أي تقرير مجدول في المنتج
--                                      (نفس صنف كذب W6-B7 في Smart-Order:
--                                      «تقارير عند الطلب» لا مجدولة أبدًا)
--   Premium    «QR كود مخصص»          → تخصيص QR لم يُشحن قط (حكم W6-A3/
--                                      W6-B3 على صفحة الهبوط: «رمز لكل
--                                      طاولة» هو المشحون — عالمي)
--   Premium    «برنامج ولاء متكامل»    → الولاء عالمي لكل الخطط (وجه الزبون
--                                      الذي يقود الطلبات — قرار منتج W7-B)
--   Premium    «تخصيص كامل»            → التخصيص (الثيم/الشعار/المعرض) عالمي
--   Pro        «QR كود مخصص» + «تخصيص كامل» → نفس الكذبتين
--   Pro        «ولاء متقدم»            → الغموض يخفي الميزة الحقيقية؛
--                                      المُنفَّذ فعليًا (W7-B) هو «برنامج
--                                      الإحالات» (بوابة الاحترافية+)
--   Enterprise «API مخصص»              → لا يوجد أي API مخصص
--   Enterprise «ولاء كامل»              → عالمي (غير متمايز)
--
-- العقد الآمن (نمط 20260907_round92_plan_texts حرفيًا):
--   * مفاتيح الاسم المحمول (Basic/Premium/Pro/Enterprise) لا المعرّفات
--     الرقمية (معرّفات الإنتاج 86-90 ≠ معرّفات المحلي 1-2)؛
--   * حارس sortOrder (رتبة السلّم) — تعديل سلّم مستقبلي يجعل العبارة
--     no-op بدل الكتابة على صف هُيّئ له دور آخر؛
--   * الحذف بحارس احتواء jsonb (@>) — إزالة عنصر غير موجود أصلًا no-op،
--     فالعبارة IDEMPOTENT تمامًا: إعادة التشغيل على قاعدة مصلّحة (أو
--     migrate deploy فوق بذرة جديدة تحمل النصوص الصحيحة) تمسّ 0 صفوف؛
--   * الاستبدال النصي (Pro: «ولاء متقدم») بحارس LIKE — نفس أسلوب r92؛
--     السلسلة العربية لا تحوي محارف JSON خاصة فدورة ::text → replace →
--     ::jsonb آمنة؛
--   * الإضافة (Pro: «تصدير CSV») بحارس NOT @> — لا تكرار أبدًا. «تصدير
--     CSV» وعد صادق الآن: بوابة الاحترافية+ في /api/orders/export (W7-B).

-- (1) Basic — «تقرير شهري»: لا توجد ميزة تقارير مجدولة في المنتج
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'تقرير شهري'),
    "updatedAt" = now()
WHERE name = 'Basic'
  AND "sortOrder" = 2
  AND "features" @> '["تقرير شهري"]'::jsonb;

-- (2) Premium — «برنامج ولاء متكامل»: الولاء عالمي لكل الخطط
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'برنامج ولاء متكامل'),
    "updatedAt" = now()
WHERE name = 'Premium'
  AND "sortOrder" = 3
  AND "features" @> '["برنامج ولاء متكامل"]'::jsonb;

-- (3) Premium — «QR كود مخصص»: التخصيص لم يُشحن (حكم W6-B3)
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'QR كود مخصص'),
    "updatedAt" = now()
WHERE name = 'Premium'
  AND "sortOrder" = 3
  AND "features" @> '["QR كود مخصص"]'::jsonb;

-- (4) Premium — «تخصيص كامل»: التخصيص عالمي (ثيم/شعار/معرض/دوام)
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'تخصيص كامل'),
    "updatedAt" = now()
WHERE name = 'Premium'
  AND "sortOrder" = 3
  AND "features" @> '["تخصيص كامل"]'::jsonb;

-- (5) Pro — «QR كود مخصص»: نفس حكم (3)
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'QR كود مخصص'),
    "updatedAt" = now()
WHERE name = 'Pro'
  AND "sortOrder" = 4
  AND "features" @> '["QR كود مخصص"]'::jsonb;

-- (6) Pro — «تخصيص كامل»: نفس حكم (4)
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'تخصيص كامل'),
    "updatedAt" = now()
WHERE name = 'Pro'
  AND "sortOrder" = 4
  AND "features" @> '["تخصيص كامل"]'::jsonb;

-- (7) Pro — «ولاء متقدم» → «برنامج الإحالات»: اسم الميزة الحقيقية التي
--     تفتحها بوابة الاحترافية+ (loyalty/referral + referrals/claim)
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'ولاء متقدم', 'برنامج إحالات')::jsonb,
    "updatedAt" = now()
WHERE name = 'Pro'
  AND "sortOrder" = 4
  AND "features"::text LIKE '%ولاء متقدم%';

-- (8) Pro — «تصدير CSV»: الميزة الحقيقية (بوابة الاحترافية+ في
--     /api/orders/export) تدخل الوعد — لم يكن الإنتاج يذكرها أصلًا
UPDATE "SubscriptionPlan"
SET "features" = ("features" || '["تصدير CSV"]'::jsonb),
    "updatedAt" = now()
WHERE name = 'Pro'
  AND "sortOrder" = 4
  AND NOT ("features" @> '["تصدير CSV"]'::jsonb);

-- (9) Enterprise — «API مخصص»: لا يوجد API مخصص في المنتج
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'API مخصص'),
    "updatedAt" = now()
WHERE name = 'Enterprise'
  AND "sortOrder" = 5
  AND "features" @> '["API مخصص"]'::jsonb;

-- (10) Enterprise — «ولاء كامل»: عالمي لكل الخطط (نفس حكم 2)
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'ولاء كامل'),
    "updatedAt" = now()
WHERE name = 'Enterprise'
  AND "sortOrder" = 5
  AND "features" @> '["ولاء كامل"]'::jsonb;
