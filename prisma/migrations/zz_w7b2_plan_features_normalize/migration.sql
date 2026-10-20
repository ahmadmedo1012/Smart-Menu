-- W7-B2 — محاولة الترميم الخادمية الثانية + فك الفساد المزدوج
--
-- الحادثة الموثقة (P0 من W7-F للمنسق): هجرة zz_w7b_plan_feature_texts لم
-- تُطبّق على قاعدة الإنتاج رغم نشر أخضر وتقرير صحة على SHA الجديد —
-- «تقرير شهري» (بايت-نظيف، حروس name+sortOrder+@> كلها كانت ستطابق)
-- ما زال حيًا في الإنتاج بعد النشر. فوق ذلك: عمود Pro في الإنتاج يحمل
-- فساد ترميز مزدوج موثقًا (عنصر نصي = مصفوفة JSON كاملة) فكل حراس
-- الاحتواء على العمود الخارجي تفشل بصمت حتى لو طُبّقت الهجرة.
--
-- هذه الهجرة (بترتيب مختلف: الفك أولًا ثم الشفاء) تحاول ترميم العمود
-- نفسه؛ طبقة القراءة (lib/plan-features-heal.ts) تغطي كل الأحواض إن
-- تكرر فشل مسار الهجرات الغامض — الطبقتان idempotent فلا تنازع أبدًا.

-- (0) فك الترميز المزدوج — أي صف يحوي عنصره الأول نصًا يبدأ بـ'['
--     يُفكّ إلى مصفوفته الداخلية وتُلحق بقية العناصر الخارجية بعده.
UPDATE "SubscriptionPlan"
SET "features" = ((("features" -> 0) #>> '{}')::jsonb) || ("features" - 0),
    "updatedAt" = now()
WHERE jsonb_array_length("features") >= 1
  AND jsonb_typeof("features" -> 0) = 'string'
  AND left(("features" -> 0) #>> '{}', 1) = '[';

-- (1..10) نفس شفاء zz_w7b (الحروس كلها idempotent — no-op على قاعدة شفية)
UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'تقرير شهري'), "updatedAt" = now()
WHERE name = 'Basic' AND "sortOrder" = 2 AND "features" @> '["تقرير شهري"]'::jsonb;

UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'برنامج ولاء متكامل'), "updatedAt" = now()
WHERE name = 'Premium' AND "sortOrder" = 3 AND "features" @> '["برنامج ولاء متكامل"]'::jsonb;

UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'QR كود مخصص'), "updatedAt" = now()
WHERE name = 'Premium' AND "sortOrder" = 3 AND "features" @> '["QR كود مخصص"]'::jsonb;

UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'تخصيص كامل'), "updatedAt" = now()
WHERE name = 'Premium' AND "sortOrder" = 3 AND "features" @> '["تخصيص كامل"]'::jsonb;

UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'QR كود مخصص'), "updatedAt" = now()
WHERE name = 'Pro' AND "sortOrder" = 4 AND "features" @> '["QR كود مخصص"]'::jsonb;

UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'تخصيص كامل'), "updatedAt" = now()
WHERE name = 'Pro' AND "sortOrder" = 4 AND "features" @> '["تخصيص كامل"]'::jsonb;

UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'ولاء متقدم', 'برنامج إحالات')::jsonb, "updatedAt" = now()
WHERE name = 'Pro' AND "sortOrder" = 4 AND "features"::text LIKE '%ولاء متقدم%';

-- (8-PRO) «تصدير CSV» لا تُضاف هنا: عنصر Pro الخارجي حملها أصلًا في
-- الإنتاج («تصدير CSV» ظاهرة في استجابة /api/plans الحية) — خطوة
-- الإضافة من zz_w7b ستبقى no-op بحارس NOT @>، تُعاد هنا كما هي للأمان:
UPDATE "SubscriptionPlan"
SET "features" = ("features" || '["تصدير CSV"]'::jsonb), "updatedAt" = now()
WHERE name = 'Pro' AND "sortOrder" = 4
  AND NOT ("features" @> '["تصدير CSV"]'::jsonb);

UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'API مخصص'), "updatedAt" = now()
WHERE name = 'Enterprise' AND "sortOrder" = 5 AND "features" @> '["API مخصص"]'::jsonb;

UPDATE "SubscriptionPlan"
SET "features" = ("features" - 'ولاء كامل'), "updatedAt" = now()
WHERE name = 'Enterprise' AND "sortOrder" = 5 AND "features" @> '["ولاء كامل"]'::jsonb;

-- (11) «دعم 24/7» — ما فاتت تدقيق W7-B: لا روتة دعم 24/7 في المنظومة
--      (قانون r144 في smart-link: تواصل واتساب خلال أوقات العمل) —
--      استبدال بصياغة البذرة نفسها.
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'دعم 24/7', 'دعم فني فوري')::jsonb, "updatedAt" = now()
WHERE name = 'Enterprise' AND "sortOrder" = 5 AND "features"::text LIKE '%دعم 24/7%';
