-- round90-F1 (T2): «طلب دفع معلق واحد لكل مستخدم» على مستوى قاعدة البيانات.
-- نمط findFirst-then-create في subscriptions POST وsubscriptions/upgrade POST
-- قابل للتكرار بتزامن (READ COMMITTED: كلا الطلبين يجتاز الفحص قبل أي كتابة)
-- → دفعتان pending → المستخدم قد يدفع مرتين مقابل ترقية واحدة.
-- الفهرس الفريد الجزئي يحسم السباق عند الإنشاء: الخاسر المتزامن يستلم P2002
-- والمساران يعيدان 409 «لديك طلب دفع معلق بالفعل» (التقاط P2002 في الكود).
--
-- التسمية (M-3 ordering footgun — بصمة g90-D2 محققة): البادئة الزمنية
-- 2026* كانت سترتب هذا الفهرس قبل 6_add_payment_status_enum (الترتيب
-- المعجمي: 1_* < 2026* < 2_*..9_) — فيُخلق الفهرس وعمود status لا يزال
-- text ثم تفشل هجرة 6 عند ALTER TYPE بإعادة اشتقاق الشرط (E42883) أو
-- يفشل الـcast هنا لعدم وجود النوع بعد (E42704 — جرّبنا الحالتين). البادئة
-- zz_ تجعلها آخر هجرة في السلسلة (بعد 9_*) حيث يوجد النوع حتمًا.
--
-- ملاحظة تسمية الفهرس: جدول الدفع الفعلي في schema.prisma هو
-- SubscriptionPayment (لا PaymentRequest كما ورد بالمسودة) — الاسم يتبع
-- الجدول الحقيقي. userId nullable: الفهرس الجزئي مع WHERE status='pending'
-- يتجاهل صفوف NULL-userId تلقائيًا. فحص ما قبل التطبيق: لا يوجد مستخدم
-- بأكثر من pending واحدة في قاعدة الجولة (صفر تكرارات).
-- غير قابل للتعبير في Prisma schema (فهرس جزئي) — غائب عن migrate diff
-- بنمط فهرس SystemEvent التعبيري الموثق (مستثنى مقصود).
CREATE UNIQUE INDEX "SubscriptionPayment_pending_user_unique"
  ON "SubscriptionPayment"("userId")
  WHERE status = 'pending';
