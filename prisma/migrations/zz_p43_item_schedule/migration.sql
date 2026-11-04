-- P43 SM-1 (توافر مجدول): ثلاثة أعمدة NULL-able على MenuItem — صفر خطر
-- هجرة على الصفوف القائمة (كل الصفوف الحالية NULL = متاح دائمًا = السلوك
-- القديم حرفيًا؛ لا بذر وهمي، لا إصلاح بيانات).
--
--   * availableFrom/availableTo: HH:MM بنظام 24 ساعة، أرقام غربية (سياسة
--     r135) — نفس صيغة OpeningHours (r137). العبور الليلي يُمثَّل بـ
--     from > to (22:00→02:00) والحدود: from شامل، to حصري — تفكّه
--     isItemWithinSchedule (src/lib/item-availability.ts) على الخادم
--     (فرض POST /api/orders) وعلى العميل (ISR-safe — حُكم OpenStatusBadge).
--   * availableDays: JSON نصي لمصفوفة أيام باتفاقية getDay
--     (0=الأحد..6=السبت) — null/[] = كل الأيام. يُتحقق تطبيقياً بـ Zod
--     قبل أي كتابة (متوافقات items POST/PUT).
--
-- CHECK NOT VALID بنمط r137/r121: صيغة HH:MM وشكل مصفوفة JSON للأيام
-- على الكتابات الجديدة فورًا؛ NULL يمرّ دائمًا (الميزة نائمة للصفوف
-- القائمة). لا فهرس جديد: الاستعلام العام يقيَّد أصلًا بالفئة
-- (@@index([categoryId, sortOrder])) وهذه مرشِّحات متبقية على مجموعات
-- صغيرة؛ وفرض الطلب يقرأ صفوف الأصناف المطلوبة وحدها (IN list).
-- SQL مستقيم بلا امتدادات — قابل للتشغيل على الإنتاج وأي ظلّي.

ALTER TABLE "MenuItem" ADD COLUMN "availableFrom" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN "availableTo" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN "availableDays" TEXT;

-- NotValid CHECK (نمط r137): HH:MM على الكتابات الجديدة فقط.
ALTER TABLE "MenuItem" ADD CONSTRAINT "zz_p43_item_availablefrom_check" CHECK ("availableFrom" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') NOT VALID;
ALTER TABLE "MenuItem" ADD CONSTRAINT "zz_p43_item_availableto_check" CHECK ("availableTo" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') NOT VALID;
-- availableDays: JSON مصفوفة أعداد صحيحة 0-6 (فارغة مسموحة = كل الأيام) —
-- الشكل فقط؛ التفرد والمدى تتحققهما Zod قبل الكتابة.
ALTER TABLE "MenuItem" ADD CONSTRAINT "zz_p43_item_availabledays_check" CHECK ("availableDays" IS NULL OR ("availableDays" ~ '^\[\s*(\s*[0-6]\s*(\s*,\s*[0-6]\s*)*)?\s*\]$')) NOT VALID;
