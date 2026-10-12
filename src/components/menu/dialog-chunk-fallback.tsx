'use client';

/**
 * 17-SM: حالة تحميل شرائح الحوارات الثقيلة (next/dynamic `loading`).
 *
 * الخلفية: حوارات المنيو الكبيرة (OrderDialog ‎~871 سطرًا / ReviewSheet ‎~649
 * سطرًا) مقسّمة كسل شبكي منذ round86-B8، لكنها كانت تُرندر دائمًا (مغلقة =
 * بلا شيء) فتُجلب شرائحها عند الترطيب مع بقية الصفحة. 17-SM حوّل التركيب
 * إلى «عند الفتح أول مرة» (mount-on-open) — فأصبح زبون QR الذي يتصفح فقط
 * لا يجلب كود الحوار إطلاقًا، وأول فتح على شبكة باردة يحتاج جولة شرائح.
 *
 * هذا المكوّن هو ما يظهر في نافذة الجلب تلك: نفس وصفة الغطاء في ui/dialog
 * (‎z-40 + تمويه 4px + ‎--overlay‎)، وبطاقة ‎glass-strong‎ بنفس قشرة
 * SheetContent/DialogContent في OrderDialog، والمُدوّر المشترك للمنصة
 * (border-t-orange — نمط «عرض المزيد» في ReviewSheet)، وإعلان بثّ عربي
 * بعقيدة MenuSkeleton (role=status + aria-busy + sr-only).
 *
 * الحدود العمدية (لا تُخفَق):
 *  - بلا حجز تمرير وبلا مصادرة تركيز — الحالة عابرة (<ثانية عادةً) والتركيز
 *    يبقى على زر الإطلاق؛ حوار base-ui يتولّى الاثنين فور وصوله.
 *  - بلا تخطيط: الغطاء fixed فلا يزاح محتوى الصفحة أبدًا (صفر CLS).
 *  - الحركة تُصفَّر بالحزام العام المخفّض الحركة (نفس سلوك .skeleton).
 */
export function DialogChunkFallback() {
        return (
                <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        /* نفس وصفة DialogOverlay في ui/dialog.tsx (r131-F4) */
                        className="fixed inset-0 isolate z-40 backdrop-blur-[4px]"
                        style={{ backgroundColor: 'var(--overlay)' }}
                >
                        <span className="sr-only">جارٍ فتح الحوار…</span>
                        <div className="absolute inset-0 flex items-center justify-center p-4" aria-hidden="true">
                                {/* نفس قشرة الحوار: glass-strong + rounded-2xl + hairline + --shadow-modal */}
                                <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-border/70 p-6 glass-strong shadow-[var(--shadow-modal)]">
                                        <span className="size-6 rounded-full border-2 border-border border-t-orange animate-spin" />
                                        <span className="text-xs font-medium text-muted-foreground">جارٍ الفتح…</span>
                                </div>
                        </div>
                </div>
        );
}
