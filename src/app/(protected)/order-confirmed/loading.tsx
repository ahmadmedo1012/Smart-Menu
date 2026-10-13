/**
 * r131 (A11 states — fleet ruling: loading.tsx = shape skeletons): هيكل تحميل
 * على شكل صفحة تأكيد الطلب (بئر 56px + رقم الطلب + الأزرار) بدل الغزل
 * المجرّد. بلا-JS بالكامل.
 * Phase 6 (r154): هيكل على شكل البطاقة المؤلَّفة — طبق 16 + بطل
 * الحبيب + بئر دائري (تنعكس قواعد page.tsx نفسها هنا).
 */
export default function OrderConfirmedLoading() {
        return (
                <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        className="min-h-dvh flex flex-col items-center justify-center gap-6 px-4 text-center"
                >
                        <span className="sr-only">جارٍ تحميل صفحة تأكيد الطلب…</span>

                        {/* البطاقة المؤلَّفة — طبق 16 ببطل الحبيب */}
                        <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-border/50 bg-card" aria-hidden="true">
                                {/* بطل الحبيب الدافئ */}
                                <div className="h-28 skeleton" />
                                <div className="px-6 pb-8 pt-6 space-y-5">
                                        {/* بئر 56px الدائري + السطور */}
                                        <div className="size-14 rounded-full skeleton animate-rise-in mx-auto" />
                                        <div className="h-9 w-36 mx-auto rounded-md skeleton animate-rise-in" style={{ animationDelay: '60ms' }} />
                                        <div className="h-4 w-48 mx-auto rounded-sm skeleton animate-rise-in" style={{ animationDelay: '120ms' }} />
                                        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto pt-2">
                                                <div className="h-10 rounded-md skeleton animate-rise-in" style={{ animationDelay: '240ms' }} />
                                                <div className="h-10 rounded-md skeleton animate-rise-in" style={{ animationDelay: '300ms' }} />
                                        </div>
                                </div>
                        </div>
                </div>
        );
}
