'use client';

/**
 * 17-DEBT-SM (r147): شاشة تأكيد «تمت الإضافة إلى السلة» — فُصلت عن
 * OrderDialog.tsx كما هي حرفيًا (لا حالة، لا خصائص سلوكية).
 */
import { MotionCheck } from '@/components/ui/motion-icons';

/* r135-B: role=status + aria-live=polite — قارئات الشاشة
 * تسمع «تمت الإضافة إلى السلة» في فترة الانتظار (~800ms)
 * قبل التحويل إلى السلة. الحركة كانت animate-scale-in
 * (520ms) — طُبّعت إلى 240ms (سقف الحركة 380ms). */
export function ConfirmedBlock() {
        return (
                <div
                        role="status"
                        aria-live="polite"
                        className="p-10 text-center animate-[scale-in_240ms_var(--ease-out-quart)_both]"
                >
                        <div className="size-20 rounded-2xl bg-glass-bg/60 backdrop-blur-sm border border-glass-border flex items-center justify-center mx-auto mb-4">
                                {/* decorative backdrop — checkmark lives in the orange circle only */}
                        </div>
                        <div className="size-16 rounded-full bg-orange flex items-center justify-center mx-auto -mt-24 mb-6 shadow-[var(--shadow-card-premium)]">
                                <MotionCheck className="size-10 text-orange-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">تمت الإضافة إلى السلة!</h3>
                        {/* r120 (U5-F-3): الكذبة القديمة «تم إرسال الطلب! جاري تحويلك
                            إلى واتساب…» كانت توحي بإتمام الطلب بينما الحقيقة إضافة
                            للسلة → مراجعة → إرسال. الصدق يمنع مغادرة العميل مبكرًا. */}
                        <p className="text-sm text-muted-foreground">جارٍ فتح السلة لمراجعة الطلب وإرساله عبر واتساب…</p>
                </div>
        );
}
