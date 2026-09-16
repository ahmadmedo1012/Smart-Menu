// Shared constants — single source of truth for validation limits
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_MESSAGE = `كلمة المرور يجب أن تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل`;

// r106-F1: سقف كمية الصنف الواحد في الطلب — يُطبَّق في API zod وفي كل مخازن
// السلة (ويب وجوال) وعدّادات الواجهة حتى تتطابق حدود العميل مع حدود الخادم.
// كان API يقبل أي عدد صحيح موجب (اختُبر 100000 فمرّ طلب بقيمة 1.8M د.ل).
export const MAX_ITEM_QUANTITY = 99;
export const MAX_ITEM_QUANTITY_MESSAGE = `الحد الأقصى ${MAX_ITEM_QUANTITY} وحدة لكل صنف في الطلب`;
