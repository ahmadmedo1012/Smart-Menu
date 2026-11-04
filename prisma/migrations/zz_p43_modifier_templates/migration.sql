-- P43 SM-1b: جدول ModifierTemplate — قوالب الإضافات القابلة لإعادة
-- الاستخدام (لقطة groupsJson لكل مطعم؛ الإدراج ينسخ ولا يربط).
--
-- الإضافة على مطاعم قائمة = صفر صفوف (لا قوالب بعد — القائمة فارغة حتى
-- يحفظ المالك أول قالب من محرر الصنف). لا قيود CHECK: البنية الدقيقة
-- لـ groupsJson تُتحقق تطبيقياً بنفس modifierGroupSchema وسقوفه
-- (≤6 مجموعات · ≤20 خيارًا · min/max ≤10) في /api/modifier-templates —
-- المصدر الوحيد للكتابة.
-- SQL مستقيم بنمط zz_round137_opening_hours: لا امتدادات، لا DO$$.

-- CreateTable
CREATE TABLE "ModifierTemplate" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "groupsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModifierTemplate_restaurantId_idx" ON "ModifierTemplate"("restaurantId");

-- AddForeignKey
ALTER TABLE "ModifierTemplate" ADD CONSTRAINT "ModifierTemplate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
