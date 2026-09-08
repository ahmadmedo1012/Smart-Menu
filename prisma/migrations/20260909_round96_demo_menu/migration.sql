-- round96-W3: منيو العرض التجريبي الواقعي — مقهى الواحة (al-waha-cafe-demo)
-- idempotent بالكامل: كل جملة محمية بـ WHERE/NOT EXISTS ومفاتيحها slug/name (لا ids رقمية).
-- سابقة معتمدة: 20260907_round92_plan_texts (هجرة بيانات محضة نفذت على الإنتاج).
-- الصور: أصول محلية public/demo/*.webp (صفر اعتماد خارجي — سقطت صور Unsplash مرتين).
-- ملاحظة توافق team2-customer (يعمل على الإنتاج): يفحص وجود فئة «مشروبات ساخنة» + «د.ل»
-- وغياب «سموثي»/«ليموناضة» عند فلترة الساخنة — البنية أدناه متوافقة (الصنفان في الباردة).

-- ═══════════ 1) المطعم التجريبي: إنشاء عند الغياب (upsert) ثم إغناء السجل ═══════════
-- على الإنتاج موجود (id 312) فتُطبق التحديثات فقط؛ على قاعدة نظيفة (CI/محلي) يُنشأ كاملًا
-- فيرى كل بيئة نفس منيو العرض الحي (تماثل إختبارات ↔ إنتاج).
INSERT INTO "Restaurant" (name, slug, description, logo, phone, whatsapp, address, "workingHours", "themeColor", currency, "isActive", city, "showOnLanding", gallery, "pickupTypes", "updatedAt")
SELECT 'مقهى الواحة - تجريبي', 'al-waha-cafe-demo',
  'قهوة مختصة وحلويات بيتية في قلب طرابلس — تجربة منيو رقمي كاملة (عرض تجريبي حي)',
  '/demo/logo.webp', '0910089975', '0910089975', 'شارع الجرابة، وسط المدينة',
  'السبت - الخميس: 8 صباحًا حتى 12 منتصف الليل', 'amber', 'LYD', true, 'طرابلس', true,
  '{"/demo/cover-interior.webp","/demo/cover-barista.webp"}', 'inside,takeaway,delivery', NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo');

UPDATE "Restaurant" SET
  description = 'قهوة مختصة وحلويات بيتية في قلب طرابلس — تجربة منيو رقمي كاملة (عرض تجريبي حي)',
  logo = '/demo/logo.webp',
  city = 'طرابلس',
  address = 'شارع الجرابة، وسط المدينة',
  "workingHours" = 'السبت - الخميس: 8 صباحًا حتى 12 منتصف الليل',
  gallery = '{"/demo/cover-interior.webp","/demo/cover-barista.webp"}',
  "updatedAt" = NOW()
WHERE slug = 'al-waha-cafe-demo';

-- إخفاء المطعم المكرر (duplicate) من صفحة الهبوط — قرار r94 MED-1 (يبقى متاحًا برابطه المباشر)
UPDATE "Restaurant" SET "showOnLanding" = false, "updatedAt" = NOW()
WHERE slug = 'al-waha-cafeewewe';

-- ═══════════ 2) الفئات (upsert الخمس — تعمل على الإنتاج والقاعدة النظيفة معًا) ═══════════
-- أيقونات نصية من ICON_MAP (CategoryTabs) → أيقونات lucide SVG حادة
INSERT INTO "MenuCategory" (name, "nameAr", icon, "sortOrder", "isActive", "restaurantId", "updatedAt")
SELECT 'مشروبات ساخنة', 'مشروبات ساخنة', 'coffee', 1, true, r.id, NOW()
FROM "Restaurant" r WHERE r.slug = 'al-waha-cafe-demo'
  AND NOT EXISTS (SELECT 1 FROM "MenuCategory" c WHERE c."restaurantId" = r.id AND c.name = 'مشروبات ساخنة');

INSERT INTO "MenuCategory" (name, "nameAr", icon, "sortOrder", "isActive", "restaurantId", "updatedAt")
SELECT 'مشروبات باردة', 'مشروبات باردة', 'soft-drink', 2, true, r.id, NOW()
FROM "Restaurant" r WHERE r.slug = 'al-waha-cafe-demo'
  AND NOT EXISTS (SELECT 1 FROM "MenuCategory" c WHERE c."restaurantId" = r.id AND c.name = 'مشروبات باردة');

INSERT INTO "MenuCategory" (name, "nameAr", icon, "sortOrder", "isActive", "restaurantId", "updatedAt")
SELECT 'حلويات', 'الحلويات', 'cake', 3, true, r.id, NOW()
FROM "Restaurant" r WHERE r.slug = 'al-waha-cafe-demo'
  AND NOT EXISTS (SELECT 1 FROM "MenuCategory" c WHERE c."restaurantId" = r.id AND c.name = 'حلويات');

INSERT INTO "MenuCategory" (name, "nameAr", icon, "sortOrder", "isActive", "restaurantId", "updatedAt")
SELECT 'وجبات خفيفة', 'وجبات خفيفة', 'beef', 4, true, r.id, NOW()
FROM "Restaurant" r WHERE r.slug = 'al-waha-cafe-demo'
  AND NOT EXISTS (SELECT 1 FROM "MenuCategory" c WHERE c."restaurantId" = r.id AND c.name = 'وجبات خفيفة');

INSERT INTO "MenuCategory" (name, "nameAr", icon, "sortOrder", "isActive", "restaurantId", "updatedAt")
SELECT 'الفطور', 'الفطور', 'bread', 5, true, r.id, NOW()
FROM "Restaurant" r WHERE r.slug = 'al-waha-cafe-demo'
  AND NOT EXISTS (SELECT 1 FROM "MenuCategory" c WHERE c."restaurantId" = r.id AND c.name = 'الفطور');

-- تطبيع الفئات القائمة على الإنتاج (أيقونة/اسم عربي/ترتيب/تنشيط)
UPDATE "MenuCategory" SET "nameAr" = 'مشروبات ساخنة', icon = 'coffee', "sortOrder" = 1, "isActive" = true, "updatedAt" = NOW()
WHERE name = 'مشروبات ساخنة' AND "restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo');

UPDATE "MenuCategory" SET "nameAr" = 'مشروبات باردة', icon = 'soft-drink', "sortOrder" = 2, "isActive" = true, "updatedAt" = NOW()
WHERE name = 'مشروبات باردة' AND "restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo');

UPDATE "MenuCategory" SET "nameAr" = 'الحلويات', icon = 'cake', "sortOrder" = 3, "isActive" = true, "updatedAt" = NOW()
WHERE name = 'حلويات' AND "restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo');

UPDATE "MenuCategory" SET "nameAr" = 'وجبات خفيفة', icon = 'beef', "sortOrder" = 4, "isActive" = true, "updatedAt" = NOW()
WHERE name = 'وجبات خفيفة' AND "restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo');

-- ═══════════ 3) الأصناف — 16 قائمة تُغنى (مع تحسين الأسماء) ═══════════

-- قهوة تركي (اسم ثابت — إغناء فقط)
UPDATE "MenuItem" SET "nameAr" = 'قهوة تركي', "descriptionAr" = 'قهوة مطبوخة على الرمل بطريقة تقليدية، تقدم مع لقمة حلوة', price = 4, image = '/demo/turkish-coffee.webp', "sortOrder" = 5, status = 'available', "updatedAt" = NOW()
WHERE name = 'قهوة تركي' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- إسبريسو
UPDATE "MenuItem" SET "nameAr" = 'إسبريسو', "descriptionAr" = 'حبوب مختصة محمصة داكنة، كريما ذهبية كثيفة', price = 5, image = '/demo/espresso.webp', "sortOrder" = 1, status = 'available', "updatedAt" = NOW()
WHERE name = 'إسبريسو' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- كابتشينو
UPDATE "MenuItem" SET "nameAr" = 'كابتشينو', "descriptionAr" = 'إسبريسو مع حليب مبخّر ورغوة حريرية بفن اللاتيه آرت', price = 7, image = '/demo/cappuccino.webp', "sortOrder" = 2, status = 'available', "updatedAt" = NOW()
WHERE name = 'كابتشينو' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- شاي ← شاي أخضر بالنعناع
UPDATE "MenuItem" SET name = 'شاي أخضر بالنعناع', "updatedAt" = NOW()
WHERE name = 'شاي' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));
UPDATE "MenuItem" SET "nameAr" = 'شاي أخضر بالنعناع', "descriptionAr" = 'شاي أخضر مغربي بالنعناع الطازج، يقدم كوبًا كاملًا', price = 4, image = '/demo/mint-tea.webp', "sortOrder" = 6, status = 'available', "updatedAt" = NOW()
WHERE name = 'شاي أخضر بالنعناع' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- ليموناضة ← ليموناضة بالنعناع (باردة)
UPDATE "MenuItem" SET name = 'ليموناضة بالنعناع', "updatedAt" = NOW()
WHERE name = 'ليموناضة' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));
UPDATE "MenuItem" SET "nameAr" = 'ليموناضة بالنعناع', "descriptionAr" = 'ليمون طازج معنعنع بالنعناع، منعشة ومثلجة', price = 5, image = '/demo/mint-lemonade.webp', "sortOrder" = 1, status = 'available', "updatedAt" = NOW()
WHERE name = 'ليموناضة بالنعناع' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- سموثي ← سموثي مانجو (باردة)
UPDATE "MenuItem" SET name = 'سموثي مانجو', "updatedAt" = NOW()
WHERE name = 'سموثي' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));
UPDATE "MenuItem" SET "nameAr" = 'سموثي مانجو', "descriptionAr" = 'مانجو طازج مخفوق بالحليب، كريمي وطبيعي 100٪', price = 8, image = '/demo/mango-smoothie.webp', "sortOrder" = 2, status = 'available', "updatedAt" = NOW()
WHERE name = 'سموثي مانجو' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- موهيتو
UPDATE "MenuItem" SET "nameAr" = 'موهيتو', "descriptionAr" = 'مشروب غازي منعش بالنعناع والليمون الأخضر', price = 6, image = '/demo/mojito.webp', "sortOrder" = 3, status = 'available', "updatedAt" = NOW()
WHERE name = 'موهيتو' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- آيس كوفي
UPDATE "MenuItem" SET "nameAr" = 'آيس كوفي', "descriptionAr" = 'قهوة مثلجة بالقشطة على مكعبات قهوة مجمدة', price = 7, image = '/demo/iced-coffee.webp', "sortOrder" = 4, status = 'available', "updatedAt" = NOW()
WHERE name = 'آيس كوفي' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- تشيز كيك
UPDATE "MenuItem" SET "nameAr" = 'تشيز كيك', "descriptionAr" = 'تشيز كيك نيويورك كلاسيك بصوص التوت الطازج', price = 10, image = '/demo/cheesecake.webp', "sortOrder" = 2, status = 'available', "updatedAt" = NOW()
WHERE name = 'تشيز كيك' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- كنافة ← كنافة بالجبن
UPDATE "MenuItem" SET name = 'كنافة بالجبن', "updatedAt" = NOW()
WHERE name = 'كنافة' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));
UPDATE "MenuItem" SET "nameAr" = 'كنافة بالجبن', "descriptionAr" = 'كنافة ذهبية مقرمشة بجبنة طازجة وشراب سكر مع الفستق، تقدم ساخنة', price = 12, image = '/demo/cheese-kunafa.webp', "sortOrder" = 1, status = 'available', "allergens" = '{milk,nuts}', "updatedAt" = NOW()
WHERE name = 'كنافة بالجبن' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- كريب ← كريب نوتيلا
UPDATE "MenuItem" SET name = 'كريب نوتيلا', "updatedAt" = NOW()
WHERE name = 'كريب' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));
UPDATE "MenuItem" SET "nameAr" = 'كريب نوتيلا', "descriptionAr" = 'كريب طري بنوتيلا وشرائح موز وسكر بودرة', price = 8, image = '/demo/nutella-crepe.webp', "sortOrder" = 3, status = 'available', "updatedAt" = NOW()
WHERE name = 'كريب نوتيلا' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- بسبوسة
UPDATE "MenuItem" SET "nameAr" = 'بسبوسة', "descriptionAr" = 'بسبوسة سمولينا بجوز الهند واللوز، مغمورة بالشربات', price = 4, image = '/demo/basbousa.webp', "sortOrder" = 4, status = 'available', "updatedAt" = NOW()
WHERE name = 'بسبوسة' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- ساندويتش ← ساندويتش تونا
UPDATE "MenuItem" SET name = 'ساندويتش تونا', "updatedAt" = NOW()
WHERE name = 'ساندويتش' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));
UPDATE "MenuItem" SET "nameAr" = 'ساندويتش تونا', "descriptionAr" = 'تونا بخليط خاص على خبز محمص مع الخضراوات الطازجة', price = 10, image = '/demo/tuna-sandwich.webp', "sortOrder" = 2, status = 'available', "updatedAt" = NOW()
WHERE name = 'ساندويتش تونا' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- بطاطس مقلية
UPDATE "MenuItem" SET "nameAr" = 'بطاطس مقلية', "descriptionAr" = 'بطاطس ذهبية مقرمشة بصوص الثوم الخاص', price = 6, image = '/demo/fries.webp', "sortOrder" = 3, status = 'available', "updatedAt" = NOW()
WHERE name = 'بطاطس مقلية' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- سلطة ← سلطة سيزر
UPDATE "MenuItem" SET name = 'سلطة سيزر', "updatedAt" = NOW()
WHERE name = 'سلطة' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));
UPDATE "MenuItem" SET "nameAr" = 'سلطة سيزر', "descriptionAr" = 'خس روماني مع شرائح دجاج مشوي وجبنة بارميزان وخبز محمص', price = 12, image = '/demo/caesar-salad.webp', "sortOrder" = 4, status = 'available', "dietaryTags" = '{high-protein}', "updatedAt" = NOW()
WHERE name = 'سلطة سيزر' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));

-- برجر ← برجر الواحة
UPDATE "MenuItem" SET name = 'برجر الواحة', "updatedAt" = NOW()
WHERE name = 'برجر' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));
UPDATE "MenuItem" SET "nameAr" = 'برجر الواحة', "descriptionAr" = 'قطعتا لحم بقري طازج مع جبنة شيدر ذائبة وبصل مكرمل وصوص الواحة السري', price = 18, image = '/demo/oasis-burger.webp', "sortOrder" = 1, status = 'available', "dietaryTags" = '{high-protein}', "updatedAt" = NOW()
WHERE name = 'برجر الواحة' AND "categoryId" IN (SELECT c.id FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo'));


-- ═══════════ 3b) INSERTs للأصناف الـ16 القائمة (قاعدة نظيفة: CI/محلي — الإنتاج تتخطاها) ═══════════
INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'إسبريسو', 'إسبريسو', '', 'حبوب مختصة محمصة داكنة، كريما ذهبية كثيفة', 5, '/demo/espresso.webp', 1, c.id, 'available', '{}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات ساخنة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'إسبريسو');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'كابتشينو', 'كابتشينو', '', 'إسبريسو مع حليب مبخّر ورغوة حريرية بفن اللاتيه آرت', 7, '/demo/cappuccino.webp', 2, c.id, 'available', '{}', '{milk}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات ساخنة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'كابتشينو');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'قهوة تركي', 'قهوة تركي', '', 'قهوة مطبوخة على الرمل بطريقة تقليدية، تقدم مع لقمة حلوة', 4, '/demo/turkish-coffee.webp', 5, c.id, 'available', '{}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات ساخنة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'قهوة تركي');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'شاي أخضر بالنعناع', 'شاي أخضر بالنعناع', '', 'شاي أخضر مغربي بالنعناع الطازج، يقدم كوبًا كاملًا', 4, '/demo/mint-tea.webp', 6, c.id, 'available', '{}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات ساخنة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'شاي أخضر بالنعناع');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'ليموناضة بالنعناع', 'ليموناضة بالنعناع', '', 'ليمون طازج معنعنع بالنعناع، منعشة ومثلجة', 5, '/demo/mint-lemonade.webp', 1, c.id, 'available', '{}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات باردة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'ليموناضة بالنعناع');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'سموثي مانجو', 'سموثي مانجو', '', 'مانجو طازج مخفوق بالحليب، كريمي وطبيعي 100٪', 8, '/demo/mango-smoothie.webp', 2, c.id, 'available', '{}', '{milk}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات باردة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'سموثي مانجو');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'موهيتو', 'موهيتو', '', 'مشروب غازي منعش بالنعناع والليمون الأخضر', 6, '/demo/mojito.webp', 3, c.id, 'available', '{}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات باردة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'موهيتو');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'آيس كوفي', 'آيس كوفي', '', 'قهوة مثلجة بالقشطة على مكعبات قهوة مجمدة', 7, '/demo/iced-coffee.webp', 4, c.id, 'available', '{}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات باردة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'آيس كوفي');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'كنافة بالجبن', 'كنافة بالجبن', '', 'كنافة ذهبية مقرمشة بجبنة طازجة وشراب سكر مع الفستق، تقدم ساخنة', 12, '/demo/cheese-kunafa.webp', 1, c.id, 'available', '{}', '{milk,nuts}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'حلويات'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'كنافة بالجبن');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'تشيز كيك', 'تشيز كيك', '', 'تشيز كيك نيويورك كلاسيك بصوص التوت الطازج', 10, '/demo/cheesecake.webp', 2, c.id, 'available', '{}', '{milk,eggs}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'حلويات'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'تشيز كيك');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'كريب نوتيلا', 'كريب نوتيلا', '', 'كريب طري بنوتيلا وشرائح موز وسكر بودرة', 8, '/demo/nutella-crepe.webp', 3, c.id, 'available', '{}', '{gluten,milk,eggs}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'حلويات'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'كريب نوتيلا');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'بسبوسة', 'بسبوسة', '', 'بسبوسة سمولينا بجوز الهند واللوز، مغمورة بالشربات', 4, '/demo/basbousa.webp', 4, c.id, 'available', '{}', '{gluten,nuts}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'حلويات'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'بسبوسة');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'برجر الواحة', 'برجر الواحة', '', 'قطعتا لحم بقري طازج مع جبنة شيدر ذائبة وبصل مكرمل وصوص الواحة السري', 18, '/demo/oasis-burger.webp', 1, c.id, 'available', '{high-protein}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'وجبات خفيفة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'برجر الواحة');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'ساندويتش تونا', 'ساندويتش تونا', '', 'تونا بخليط خاص على خبز محمص مع الخضراوات الطازجة', 10, '/demo/tuna-sandwich.webp', 2, c.id, 'available', '{}', '{gluten,fish}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'وجبات خفيفة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'ساندويتش تونا');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'بطاطس مقلية', 'بطاطس مقلية', '', 'بطاطس ذهبية مقرمشة بصوص الثوم الخاص', 6, '/demo/fries.webp', 3, c.id, 'available', '{vegetarian}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'وجبات خفيفة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'بطاطس مقلية');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'سلطة سيزر', 'سلطة سيزر', '', 'خس روماني مع شرائح دجاج مشوي وجبنة بارميزان وخبز محمص', 12, '/demo/caesar-salad.webp', 4, c.id, 'available', '{high-protein}', '{}', NOW()
FROM "MenuCategory" c WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'وجبات خفيفة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'سلطة سيزر');


-- ═══════════ 4) الأصناف الجديدة (9) ═══════════
INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'لاتيه كراميل', 'لاتيه كراميل', '', 'إسبريسو بحليب مبخّر وصوص كراميل بيتي، حلو معتدل', 9, '/demo/caramel-latte.webp', 3, c.id, 'available', '{}', '{milk}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات ساخنة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'لاتيه كراميل');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'شوكولاتة ساخنة', 'شوكولاتة ساخنة', '', 'شوكولاتة بلجيكية ساخنة بكريمة مخفوقة ورشة كاكاو', 6, '/demo/hot-chocolate.webp', 7, c.id, 'available', '{}', '{milk}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات ساخنة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'شوكولاتة ساخنة');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'عصير برتقال طازج', 'عصير برتقال طازج', '', 'برتقال ليبي معصور طازجًا عند الطلب، بلا سكر مضاف', 5, '/demo/orange-juice.webp', 5, c.id, 'available', '{vegan}', '{}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'مشروبات باردة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'عصير برتقال طازج');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'كيك الشوكولاتة', 'كيك الشوكولاتة', '', 'كيك شوكولاتة داكنة بطبقات غاناش وصوص سائل', 11, '/demo/chocolate-cake.webp', 5, c.id, 'available', '{}', '{milk,eggs}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'حلويات'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'كيك الشوكولاتة');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'شاورما دجاج', 'شاورما دجاج', '', 'شاورما دجاج على الطريقة الشامية بصوص الثوم والمخلل', 9, '/demo/chicken-shawarma.webp', 5, c.id, 'available', '{high-protein}', '{}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'وجبات خفيفة'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'شاورما دجاج');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'فطور الواحة', 'فطور الواحة', '', 'طبق فطور ليبي كامل: فول بالزيت، بيض مقلي، خبز طرابلسي، زيتون وجبنة', 14, '/demo/oasis-breakfast.webp', 1, c.id, 'available', '{high-protein}', '{eggs}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'الفطور'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'فطور الواحة');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'كرواسون بالزبدة', 'كرواسون بالزبدة', '', 'كرواسون فرنسي هش بطبقات زبدة حقيقية، يقدم دافئًا', 5, '/demo/butter-croissant.webp', 2, c.id, 'available', '{}', '{gluten,milk}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'الفطور'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'كرواسون بالزبدة');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'توست أفوكادو', 'توست أفوكادو', '', 'خبز عجين مخمر مع أفوكادو مهروس وبيض مسلوق ورشة فلفل', 9, '/demo/avocado-toast.webp', 3, c.id, 'available', '{vegetarian}', '{gluten,eggs}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'الفطور'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'توست أفوكادو');

INSERT INTO "MenuItem" (name, "nameAr", description, "descriptionAr", price, image, "sortOrder", "categoryId", status, "dietaryTags", "allergens", "updatedAt")
SELECT 'بان كيك بالعسل', 'بان كيك بالعسل', '', 'أقراص بان كيك هشة بعسل جبلي طبيعي وزبدة', 10, '/demo/honey-pancakes.webp', 4, c.id, 'available', '{vegetarian}', '{gluten,milk,eggs}', NOW()
FROM "MenuCategory" c
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND c.name = 'الفطور'
  AND NOT EXISTS (SELECT 1 FROM "MenuItem" mi WHERE mi."categoryId" = c.id AND mi.name = 'بان كيك بالعسل');

-- ═══════════ 5) مجموعات الخيارات (فقط عند غيابها — لا تدهس تعديل مالك لاحق) ═══════════

-- لاتيه كراميل: الحجم (إلزامية، واحدة)
INSERT INTO "ModifierGroup" ("nameAr", name, "minSelect", "maxSelect", "required", "sortOrder", "menuItemId", "updatedAt")
SELECT 'الحجم', 'الحجم', 1, 1, true, 1, mi.id, NOW()
FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل'
  AND NOT EXISTS (SELECT 1 FROM "ModifierGroup" g WHERE g."menuItemId" = mi.id AND g."nameAr" = 'الحجم');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'صغير', 'صغير', 0, true, 1, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل' AND g."nameAr" = 'الحجم'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'صغير');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'وسط', 'وسط', 1.5, true, 2, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل' AND g."nameAr" = 'الحجم'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'وسط');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'كبير', 'كبير', 2.5, true, 3, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل' AND g."nameAr" = 'الحجم'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'كبير');

-- لاتيه كراميل: إضافات (اختيارية حتى 2)
INSERT INTO "ModifierGroup" ("nameAr", name, "minSelect", "maxSelect", "required", "sortOrder", "menuItemId", "updatedAt")
SELECT 'إضافات', 'إضافات', 0, 2, false, 2, mi.id, NOW()
FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل'
  AND NOT EXISTS (SELECT 1 FROM "ModifierGroup" g WHERE g."menuItemId" = mi.id AND g."nameAr" = 'إضافات');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'كراميل إضافي', 'كراميل إضافي', 1, true, 1, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل' AND g."nameAr" = 'إضافات'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'كراميل إضافي');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'حليب شوفان', 'حليب شوفان', 1, true, 2, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل' AND g."nameAr" = 'إضافات'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'حليب شوفان');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'حليب جوز الهند', 'حليب جوز الهند', 2, true, 3, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل' AND g."nameAr" = 'إضافات'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'حليب جوز الهند');

-- برجر الواحة: الحجم (إلزامية، واحدة)
INSERT INTO "ModifierGroup" ("nameAr", name, "minSelect", "maxSelect", "required", "sortOrder", "menuItemId", "updatedAt")
SELECT 'الحجم', 'الحجم', 1, 1, true, 1, mi.id, NOW()
FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'برجر الواحة'
  AND NOT EXISTS (SELECT 1 FROM "ModifierGroup" g WHERE g."menuItemId" = mi.id AND g."nameAr" = 'الحجم');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'عادي', 'عادي', 0, true, 1, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'برجر الواحة' AND g."nameAr" = 'الحجم'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'عادي');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'مضاعف', 'مضاعف', 7, true, 2, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'برجر الواحة' AND g."nameAr" = 'الحجم'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'مضاعف');

-- برجر الواحة: إضافات (اختيارية حتى 3)
INSERT INTO "ModifierGroup" ("nameAr", name, "minSelect", "maxSelect", "required", "sortOrder", "menuItemId", "updatedAt")
SELECT 'إضافات', 'إضافات', 0, 3, false, 2, mi.id, NOW()
FROM "MenuItem" mi JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'برجر الواحة'
  AND NOT EXISTS (SELECT 1 FROM "ModifierGroup" g WHERE g."menuItemId" = mi.id AND g."nameAr" = 'إضافات');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'جبنة شيدر إضافية', 'جبنة شيدر إضافية', 2, true, 1, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'برجر الواحة' AND g."nameAr" = 'إضافات'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'جبنة شيدر إضافية');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'بصل مكرمل', 'بصل مكرمل', 1, true, 2, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'برجر الواحة' AND g."nameAr" = 'إضافات'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'بصل مكرمل');

INSERT INTO "ModifierOption" ("nameAr", name, "priceDelta", "isAvailable", "sortOrder", "groupId", "updatedAt")
SELECT 'صوص الواحة السري', 'صوص الواحة السري', 1, true, 3, g.id, NOW()
FROM "ModifierGroup" g JOIN "MenuItem" mi ON g."menuItemId" = mi.id JOIN "MenuCategory" c ON mi."categoryId" = c.id
WHERE c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'برجر الواحة' AND g."nameAr" = 'إضافات'
  AND NOT EXISTS (SELECT 1 FROM "ModifierOption" o WHERE o."groupId" = g.id AND o."nameAr" = 'صوص الواحة السري');

-- ═══════════ 6) Featured showcase (تصفير ثم ضبط الخمسة) ═══════════
UPDATE "MenuItem" mi SET "isFeatured" = false, "featuredRank" = NULL, "showcaseTags" = '{}', "updatedAt" = NOW()
FROM "MenuCategory" c
WHERE mi."categoryId" = c.id AND c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo');

UPDATE "MenuItem" mi SET "isFeatured" = true, "featuredRank" = 1, "showcaseTags" = '{"مميز البيت","مصنوع يدويًا"}', "updatedAt" = NOW()
FROM "MenuCategory" c
WHERE mi."categoryId" = c.id AND c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'لاتيه كراميل';

UPDATE "MenuItem" mi SET "isFeatured" = true, "featuredRank" = 2, "showcaseTags" = '{"الأكثر طلبًا","بروتين مضاعف","صوص سري"}', "updatedAt" = NOW()
FROM "MenuCategory" c
WHERE mi."categoryId" = c.id AND c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'برجر الواحة';

UPDATE "MenuItem" mi SET "isFeatured" = true, "featuredRank" = 3, "showcaseTags" = '{"تقدم ساخنة","جبنة طازجة"}', "updatedAt" = NOW()
FROM "MenuCategory" c
WHERE mi."categoryId" = c.id AND c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'كنافة بالجبن';

UPDATE "MenuItem" mi SET "isFeatured" = true, "featuredRank" = 4, "showcaseTags" = '{"مانجو طازج","بدون سكر مضاف"}', "updatedAt" = NOW()
FROM "MenuCategory" c
WHERE mi."categoryId" = c.id AND c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'سموثي مانجو';

UPDATE "MenuItem" mi SET "isFeatured" = true, "featuredRank" = 5, "showcaseTags" = '{"منعش","نعناع طازج"}', "updatedAt" = NOW()
FROM "MenuCategory" c
WHERE mi."categoryId" = c.id AND c."restaurantId" = (SELECT id FROM "Restaurant" WHERE slug = 'al-waha-cafe-demo') AND mi.name = 'موهيتو';
