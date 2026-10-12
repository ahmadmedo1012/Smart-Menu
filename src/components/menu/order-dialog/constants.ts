/**
 * 17-DEBT-SM (r147): ثوابت نافذة الطلب المشتركة بين الأب (OrderDialog.tsx)
 * ووحداتها المفصولة تحت order-dialog/ — نفس القيم حرفيًا، مصدر واحد فقط.
 */

/* ملاحظات سريعة — شرائح متعددة الاختيار داخل نافذة الطلب. */
export const QUICK_NOTES = ['بدون سكر', 'سكر زيادة', 'بدون ثلج', 'حار', 'بارد', 'بدون بصل'];
/* r135-B: سقف الملاحظات — مصدر واحد للعداد وmaxLength (500 أصلاً) */
export const NOTES_MAX = 500;

/* r131 (A2 P1-3): أرضية 16px (منع تكبير iOS) + هالة التركيز القانونية
   3px/22% (‏--state-input-focus-halo) بدل ring-2/25؛ زجاج الحبّة كما هو. */
export const glassPillInput =
        'h-11 rounded-xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border px-4 text-[16px] placeholder:text-placeholder-text outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)]';
export const glassPillCard = 'rounded-xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border';
