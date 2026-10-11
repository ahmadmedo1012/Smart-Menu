/**
 * r137 — رسوم التوصيل والحد الأدنى للطلب (الميزة 2، ليبي أولاً).
 *
 * الحقيقة المالية الواحدة لرسوم التوصيل/الحد الأدنى، مشتركة بين الخادم
 * (فرض POST /api/orders + مسارات المطاعم/الإعدادات) والعميل (زر التوصيل،
 * سطر الرسوم، بوابة الحد الأدنى). NULL = الميزة مطفأة — سياسة
 * الصفر-انتفاخ: الحالة الفارغة غير مرئية إطلاقًا في واجهة الزبون.
 * (رسوم 0 مخزنة تعامل معاملة الإطفاء: لا تسمية ولا سطر — «التوصيل
 * (0 د.ل رسومًا)» ضجيج بلا معلومة.)
 *
 * لا بوابة خطة عمداً (قرار موثّق r137): هذه أمانة منيو جوهرية — كل
 * الباقات تحصل عليها.
 *
 * العرض: كل المبالغ عبر formatPrice (أرقام غربية + تجميع ar-LY +
 * «د.ل») — سياسة أرقام المنصة (درس r135: «4 من 5» بأرقام غربية).
 */
import { formatPrice } from '@/lib/format';

/** وصفا التوصيل للمطعم — null = الميزة مطفأة. */
export type DeliveryMeta = {
        fee: number | null;
        minOrder: number | null;
};

/** هل تُعرض رسوم التوصيل أصلًا؟ (قيمة سالبة/صفرية = لا شيء يُعرض) */
export function hasDeliveryFee(meta: Partial<DeliveryMeta> | null | undefined): boolean {
        return meta != null && meta.fee != null && meta.fee > 0;
}

/** الرسوم المستحقة لهذا الطلب: رسوم التوصيل فقط عند اختيار التوصيل. */
export function deliveryFeeFor(
        pickupType: 'inside' | 'takeaway' | 'delivery',
        meta: Partial<DeliveryMeta> | null | undefined,
): number {
        if (pickupType !== 'delivery' || !meta || meta.fee == null || meta.fee <= 0) return 0;
        return meta.fee;
}

/** هل السلة دون الحد الأدنى لطلب التوصيل؟ (يُفعَّل فقط مع التوصيل) */
export function isBelowMinOrder(
        subtotal: number,
        pickupType: 'inside' | 'takeaway' | 'delivery',
        meta: Partial<DeliveryMeta> | null | undefined,
): boolean {
        if (pickupType !== 'delivery' || !meta || meta.minOrder == null || meta.minOrder <= 0) return false;
        return subtotal < meta.minOrder;
}

/** «الحد الأدنى لطلب التوصيل 20 د.ل» — نفس النص في الواجهة ورسالة 422. */
export function minOrderMessage(minOrder: number): string {
        return `الحد الأدنى لطلب التوصيل ${formatPrice(minOrder)}`;
}

/* r139 (J7 + anti-bloat): التسمية الكاملة «التوصيل (5 د.ل رسومًا)» حُذفت —
   بعد اعتماد الصيغة المضغوطة في المقسّمين لم يبقَ لها مستخدم إنتاجي (الملخص
   وحوار المراجعة يرسمان سطر «رسوم التوصيل» مستقلًا بلا دالة تسمية).
   الصيغة المضغوطة أدناه هي التسمية الوحيدة الحية. */

/**
 * r139 (J7) — التسمية المضغوطة داخل المقسّمات الضيقة: «توصيل +5 د.ل».
 *
 * التسمية الكاملة كانت تكسر تخطيط 360px في المقسّمين (OrderDialog
 * radiogroup يلتف 2-3 أسطر بأزرار غير متساوية الارتفاع، وحبة
 * PickupTypeSelector تتجاوز ~106px) — الصيغة المضغوطة تحافظ على
 * الإعلان الصريح للرسوم (لا مفاجآت عند الدفع) بنصف العرض.
 */
export function deliveryFeeLabelCompact(fee: number): string {
        return `توصيل +${formatPrice(fee)}`;
}

/**
 * تحويل قيمة رسوم/حد-أدنى واردة من محرّر المالك أو الأدمن إلى رقم
 * Decimal(10,2) أو null (إطفاء). متسامح مع الأرقام الشرقية والفاصلة
 * العربية (نفس عائلة تطبيع r133/r136) لأن القيمة تعبر مسار الإعدادات
 * كسلسلة نصية خام.
 */
export function parseDeliveryAmount(
        value: unknown,
): { ok: true; value: number | null } | { ok: false; error: string } {
        // الفراغ = إطفاء الميزة (الحقل الفارغ عند المالك حجة صادقة)
        if (value === null || value === undefined || value === '') return { ok: true, value: null };
        let num: number;
        if (typeof value === 'number') {
                num = value;
        } else if (typeof value === 'string') {
                const normalized = value
                        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                        .replace(/,/g, '.')
                        .replace(/\s+/g, '')
                        .trim();
                if (normalized === '') return { ok: true, value: null };
                num = Number(normalized);
        } else {
                return { ok: false, error: 'قيمة غير صالحة' };
        }
        if (!Number.isFinite(num)) return { ok: false, error: 'قيمة غير صالحة — أدخل رقمًا مثل 5 أو 5.5' };
        if (num < 0) return { ok: false, error: 'القيمة لا يمكن أن تكون سالبة' };
        if (num > 99_999_999.99) return { ok: false, error: 'القيمة كبيرة جداً — الحد الأقصى 99999999.99 د.ل' };
        return { ok: true, value: Math.round(num * 100) / 100 };
}
