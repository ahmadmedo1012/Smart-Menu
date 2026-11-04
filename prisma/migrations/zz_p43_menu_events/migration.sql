-- P43 SM-2: جدول MenuEvent — أحداث تفاعل القائمة العامة (تحليلات الطرف
-- الأول: view/item_open/search/qr_scan). بلا PII إطلاقًا (لا IP، لا هاتف،
-- لا اسم زبون — itemKey اسم الصنف نفسه كما يُعرض).
--
-- الاحتفاظ 90 يومًا (cron cleanup — نفس عائلة AuditLog)؛ الجدول مُشتق
-- بالكامل: حذف المطعم يمسح أحداثه (Cascade).
-- الفهارس الثلاثة من المخطط مباشرة:
--   * (restaurantId) — العدّادات حسب المطعم.
--   * (restaurantId, eventType, day) — لوحة التفاعل: counts/series
--     (المطعم + النوع + اليوم) — نمط round86-B13 للمسارات الساخنة.
--   * (createdAt) — purge الاحتفاظ.
-- SQL مستقيم بنمط zz_round137_opening_hours.

-- CreateTable
CREATE TABLE "MenuEvent" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "itemKey" TEXT,
    "searchTerm" TEXT,
    "tableNumber" INTEGER,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuEvent_restaurantId_idx" ON "MenuEvent"("restaurantId");

-- CreateIndex
CREATE INDEX "MenuEvent_restaurantId_eventType_day_idx" ON "MenuEvent"("restaurantId", "eventType", "day");

-- CreateIndex
CREATE INDEX "MenuEvent_createdAt_idx" ON "MenuEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "MenuEvent" ADD CONSTRAINT "MenuEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
