-- r137 (الميزة 2 — ليبي أولاً): رسوم التوصيل والحد الأدنى للطلب.
--
-- عمودان NULL-able على Restaurant — NULL = الميزة مطفأة (سياسة
-- الصفر-انتفاخ: الحالة الفارغة غير مرئية إطلاقًا في واجهة الزبون؛
-- فراغ الحقل عند المالك = إطفاء). نفس نوع MenuItem.price (NUMERIC(10,2))
-- عمداً — عمود واحد للحقيقة المالية، لا Int ملّيم ولا String.
--
-- لا بوابة خطة: هذه «أمانة منيو» جوهرية لا ميزة مدفوعة — كل الباقات
-- تحصل عليها (القرار الموثّق في رسالة الالتزام r137؛ maxItems/maxOrders
-- تبقى هي المقيدة بالخطة).
--
-- التطبيق:
--   * فرض الحد الأدنى + إضافة الرسوم للإجمالي على الخادم داخل POST
--     /api/orders (لا يُوثق بإجمالي العميل أبدًا — نفس مبدأ إعادة
--     التسعير r102-A5).
--   * CHECK NOT VALID (نمط r121): غير سالب وبحدود العمود على الكتابات
--     الجديدة فورًا، دون إعادة فحص أي صف قائم (العمود يولد NULL كله).

ALTER TABLE "Restaurant" ADD COLUMN "deliveryFee" DECIMAL(10,2);

ALTER TABLE "Restaurant" ADD COLUMN "minOrder" DECIMAL(10,2);

ALTER TABLE "Restaurant" ADD CONSTRAINT "zz_round137_restaurant_deliveryfee_check" CHECK ("deliveryFee" IS NULL OR ("deliveryFee" >= 0 AND "deliveryFee" <= 99999999.99)) NOT VALID;

ALTER TABLE "Restaurant" ADD CONSTRAINT "zz_round137_restaurant_minorder_check" CHECK ("minOrder" IS NULL OR ("minOrder" >= 0 AND "minOrder" <= 99999999.99)) NOT VALID;
