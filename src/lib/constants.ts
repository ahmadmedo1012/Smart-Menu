// Shared constants — single source of truth for validation limits
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_MESSAGE = `كلمة المرور يجب أن تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل`;

// r106-F1: سقف كمية الصنف الواحد في الطلب — يُطبَّق في API zod وفي كل مخازن
// السلة (ويب وجوال) وعدّادات الواجهة حتى تتطابق حدود العميل مع حدود الخادم.
// كان API يقبل أي عدد صحيح موجب (اختُبر 100000 فمرّ طلب بقيمة 1.8M د.ل).
export const MAX_ITEM_QUANTITY = 99;
export const MAX_ITEM_QUANTITY_MESSAGE = `الحد الأقصى ${MAX_ITEM_QUANTITY} وحدة لكل صنف في الطلب`;

// r138 (W5-C3 — تدقيق W5-A3 P3): الحد الأعلى لسعر الصنف/السعر المخفَّض —
// سقف عمود Decimal(10,2) نفسه (99999999.99). القيمة الضخمة الملصوقة كانت
// تسقط كضجيج Prisma 500 عام بدل 422 العربية العائلية (نفس قانون الرسوم
// delivery-meta.ts:98). تُطبَّق في items POST/PUT zod وفي حارس حوار الصنف.
export const MAX_MENU_PRICE = 99_999_999.99;
export const MAX_MENU_PRICE_MESSAGE = 'السعر كبير جداً — الحد الأقصى 99999999.99 د.ل';
