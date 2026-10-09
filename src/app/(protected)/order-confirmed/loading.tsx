/**
 * r131 (A11 states — fleet ruling: loading.tsx = shape skeletons): هيكل تحميل
 * على شكل صفحة تأكيد الطلب (بئر 56px + رقم الطلب + الأزرار) بدل الغزل
 * المجرّد. بلا-JS بالكامل.
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

                        {/* بئر النجاح — 56px (عيار بلاطات الحالة الموحّد) */}
                        <div className="size-14 rounded-xl skeleton animate-rise-in" aria-hidden="true" />

                        <div className="space-y-3" aria-hidden="true">
                                <div className="h-7 w-48 mx-auto rounded-md skeleton animate-rise-in" style={{ animationDelay: '60ms' }} />
                                <div className="h-4 w-24 mx-auto rounded-sm skeleton animate-rise-in" style={{ animationDelay: '120ms' }} />
                                <div className="h-9 w-36 mx-auto rounded-md skeleton animate-rise-in" style={{ animationDelay: '180ms' }} />
                        </div>

                        <div className="flex flex-col gap-3 w-full max-w-xs" aria-hidden="true">
                                <div className="h-10 rounded-md skeleton animate-rise-in" style={{ animationDelay: '240ms' }} />
                                <div className="h-10 rounded-md skeleton animate-rise-in" style={{ animationDelay: '300ms' }} />
                        </div>
                </div>
        );
}
