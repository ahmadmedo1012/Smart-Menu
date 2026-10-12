'use client';

/**
 * 17-DEBT-SM (r147): التذييل اللاصق للمال داخل نافذة الطلب — المجموع الحيّ
 * (منطقة بثّ aria-live) + زر «أضف إلى السلة» + سطرا الصدق. فُصل عن
 * OrderDialog.tsx كما هو حرفيًا؛ معالج الإضافة (handleConfirm) وwaValid
 * يبقيان مملوكين للأب — المصدر الوحيد لبوابة الواتساب الموحّدة (r138-exec-2 J1).
 */
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { formatPrice } from '@/lib/format';

export function StickyCta({
        totalPrice,
        waValid,
        onConfirm,
}: {
        totalPrice: number;
        waValid: string | null;
        onConfirm: () => void;
}) {
        /* Total + WhatsApp — r121-ADV4-1: sticky footer. The whole
            sheet scrolls (max-h 94dvh) so a plain CTA sat 44px below
            the visible fold at 375×667 (measured). Pinning the money
            block to the sheet's bottom edge keeps «أضف إلى السلة»
            always visible; -mx/px matches the body padding. */
        return (
                <div className="sticky bottom-0 z-10 space-y-3 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-3 pb-1 glass-strong border-t border-glass-border">
                        {/* round88-E1 pattern: polite live region announces price changes
                                (modifier toggles + quantity) to screen readers */}
                        <div
                                className="flex items-center justify-between pt-0"
                                aria-live="polite"
                        >
                                <span className="font-bold text-sm">المجموع</span>
                                {/* r95: المجموع — accent-foreground الأسطع (#df5a00) 5.42:1 */}
                                <span className="font-bold text-2xl text-accent-foreground tabular-nums">
                                        {formatPrice(totalPrice, { suffix: '' })}{' '}
                                        <span className="text-sm font-normal text-muted-foreground">د.ل</span>
                                </span>
                        </div>
                        {/* r120 (U5-F-3 + U8-F-2): الزر يضيف للسلة (لا يرسل واتساب
                            مباشرة) — النص الصادق «أضف إلى السلة». والنص الأبيض على
                            أخضر واتساب كان 1.98:1 فقط؛ الأخضر الداكن يعطي 6.15:1.
                            r131 (A2 P1-1/P1-2): الظلّ الملوّن → الزوج الحيادي الممتاز
                            + رفع −2px، والضغط 0.97@80ms. */}
                        <button
                                type="button"
                                className="w-full h-12 rounded-xl bg-whatsapp hover:bg-whatsapp-deep hover:-translate-y-[2px] hover:shadow-[var(--shadow-card-premium-h)] shadow-[var(--shadow-card-premium)] text-whatsapp-ink flex items-center justify-center gap-2 text-base font-bold transition-[background-color,transform,box-shadow] active:scale-[0.97] active:duration-[var(--t-micro,80ms)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                onClick={onConfirm}
                                /* r138-exec-2 (J1): waValid — مسند موحّد، انظر التعليق عند تعريفه
                                   في OrderDialog.tsx. */
                                disabled={!waValid}
                        >
                                {/* r134-W2 (#2): the synchronous submitting spinner branch is
                                    retired (it could never render — the flag flipped within one
                                    tick); the addLockRef guard above owns double-tap protection. */}
                                <AnimatedMessageCircle className="size-5 text-whatsapp-ink" /> أضف إلى السلة
                        </button>
                        {!waValid && (
                                /* r138 (P1-1): danger-ink — كان destructive 3.06:1
                                   على كريم الفاتح. */
                                <p className="text-2xs text-center text-danger-ink">
                                        لم يتم إعداد واتساب بعد للمطعم. يُرجى التواصل مع المطعم مباشرة.
                                </p>
                        )}
                        <p className="text-2xs text-center text-muted-foreground">
                                سيتم فتح السلة لمراجعة الطلب وإرساله عبر واتساب
                        </p>
                </div>
        );
}
