-- r137 (الميزة 1 — ساعات الدوام المهيكلة): جدول OpeningHours.
--
-- القرارات الموثّقة (من دفتر r136: «التالي الموصى به: ساعات دوام مهيكلة…
-- لم تُستعجل في r136 عمدًا»):
--   * نافذة واحدة يوميًا (لا وردية ثانية) — قرار صفر-انتفاخ. الدوام
--     الليلي العابر لمنتصف الليل يُمثَّل بـ closesAt < opensAt
--     (مثل 20:00 → 02:00) وتفكّه computeOpenStatus على العميل.
--   * dayOfWeek باتفاقية JS getDay (0=الأحد..6=السبت). المحرّرات تعرض
--     الأسبوع الليبي (السبت أولًا) لكن التخزين يبقى بهذه الاتفاقية —
--     عرضٌ فقط، لا تخزين.
--   * القيد المركّب الفريد (restaurantId, dayOfWeek) هو شكل الحقيقة:
--     يوم واحد = صف واحد كحد أقصى؛ يوما بلا صف = غير مفتوح ذلك اليوم؛
--     لا صفوف إطلاقًا = الميزة نائمة (لا شارة في صفحة المنيو — الحالة
--     الفارغة غير مرئية، وworkingHours النصي الحر يبقى كما هو).
--
-- الإضافة على مطاعم قائمة = صفر صفوف = الميزة تبقى نائمة حتى يعبّئ
-- المالك محرّر الأسبوع (لا بذر وهمي، لا هجرة بيانات خلفية).
-- CHECK NOT VALID على صيغة HH:MM مثل قيود r121: مطبّق على الكتابات
-- الجديدة فورًا (لا صفوف قائمة هنا أصلاً — الصيغة تُتحقق تطبيقياً
-- أيضًا في parseOpeningHoursPayload قبل أي كتابة).
--
-- SQL مستقيم قابل للتشغيل على PostgreSQL الإنتاج/التطوير وعلى أي إعادة
-- تشغيل ظلّي (نفس أسلوب هجرات zz_round119/121/122): لا امتدادات، لا
-- DO$$، لا طلبات قفل حصرية.

-- CreateTable
CREATE TABLE "OpeningHours" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpeningHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHours_restaurantId_dayOfWeek_key" ON "OpeningHours"("restaurantId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "OpeningHours_restaurantId_idx" ON "OpeningHours"("restaurantId");

-- AddForeignKey
ALTER TABLE "OpeningHours" ADD CONSTRAINT "OpeningHours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NotValid CHECK (r121 pattern): dayOfWeek داخل 0-6 و HH:MM على الكتابات الجديدة.
ALTER TABLE "OpeningHours" ADD CONSTRAINT "zz_round137_openinghours_dayofweek_check" CHECK ("dayOfWeek" >= 0 AND "dayOfWeek" <= 6) NOT VALID;
ALTER TABLE "OpeningHours" ADD CONSTRAINT "zz_round137_openinghours_opensat_check" CHECK ("opensAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') NOT VALID;
ALTER TABLE "OpeningHours" ADD CONSTRAINT "zz_round137_openinghours_closesat_check" CHECK ("closesAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') NOT VALID;
