/**
 * r136 (ليبي أولاً): تطبيع هاتف الزبون قبل التحقق أو التخزين.
 *
 * المشكلة: الزبون الليبي يكتب رقمه بالأرقام الشرقية (٠٩١٢…) أو بفواصل
 * (مسافات/شرطات/أقواس) — وكان الرقم يصل خاماً إلى:
 *  - إيصال واتساب المالك (تُقرأ «٠٩١٢…» بلا اتصال مباشر)
 *  - رابط tel: لدى المالك (يفشل على معظم الأجهزة مع الفواصل)
 *  - بوابة الولاء التي ترفض الأرقام الشرقية أصلاً (PHONE_RE أرقام ASCII فقط)
 *
 * الحل: طيّ الأرقام الشرقية إلى غربية أولاً (نفس درس r133-A12 M1 في
 * normalizeWaNumber) ثم شدّ كل ما ليس رقماً (الـ + البادئة تُحفظ).
 *
 * الشكل يبقى كما أدخله الزبون عمداً — لا إضافة 218 ولا قصّ جذع 0 —
 * حتى يبقى التطبيع محايداً بايتياً لكل البيانات المخزنة سابقاً
 * (09XXXXXXXX و+218XXXXXXXXXX يخرجان كما دخلا).
 *
 * التوأم العائلي: Smart-Order lib/phone.ts وSmartBot phone.ts
 * (كلاهما يطوي الشرقية أولاً — نفس العائلة، نفس الدرس).
 */

/**
 * Returns the cleaned phone (Eastern digits folded to Western, separators
 * stripped, leading "+" preserved) or undefined when nothing digits-like
 * remains. Deliberately no format coercion beyond cleaning.
 */
export function normalizeCustomerPhone(input: string | null | undefined): string | undefined {
        if (!input) return undefined;
        const western = input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
        const plus = western.trimStart().startsWith("+");
        const digits = western.replace(/[^\d]/g, "");
        if (!digits) return undefined;
        return (plus ? "+" : "") + digits;
}

/**
 * نفس عقد بوابة الولاء القديم (7-15 رقماً مع + اختيارية) — مستخرج هنا
 * ليستخدمه مسارا الطلبات والولاء معاً بدل نسختين منفصلتين تنجرفان.
 */
export const CUSTOMER_PHONE_RE = /^\+?[0-9]{7,15}$/;
