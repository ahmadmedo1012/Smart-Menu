/**
 * r131 (A11 states — fleet ruling: loading.tsx = shape skeletons): هيكل تحميل
 * على شكل بطاقة الدخول (عرض 440px — نفس auth-card القانوني: شعار + عنوان +
 * حقلان + زر الإرسال) بدل الغزل المجرّد. بلا-JS بالكامل.
 */
export default function LoginLoading() {
        return (
                <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        className="relative flex min-h-dvh items-center justify-center px-4 py-20 sm:px-6"
                >
                        <span className="sr-only">جارٍ تحميل صفحة تسجيل الدخول…</span>

                        {/* بطاقة الدخول — 440px */}
                        <div className="relative z-10 w-full max-w-[27.5rem] rounded-2xl border border-border/50 bg-card p-0 animate-rise-in" aria-hidden="true">
                                {/* الشعار + العنوان */}
                                <div className="px-[clamp(2rem,4vw,3rem)] pb-2 pt-[clamp(2rem,4vw,3rem)] text-center">
                                        <div className="mx-auto mb-4 size-16 rounded-2xl skeleton" />
                                        <div className="h-7 w-36 mx-auto rounded-md skeleton mb-2" />
                                        <div className="h-4 w-28 mx-auto rounded-sm skeleton" />
                                </div>

                                {/* الحقول */}
                                <div className="px-[clamp(2rem,4vw,3rem)] pb-[clamp(2rem,4vw,3rem)] pt-4 space-y-5">
                                        <div className="space-y-2">
                                                <div className="h-4 w-24 rounded-sm skeleton" />
                                                <div className="h-12 rounded-xl skeleton" />
                                        </div>
                                        <div className="space-y-2">
                                                <div className="h-4 w-24 rounded-sm skeleton" />
                                                <div className="h-12 rounded-xl skeleton" />
                                        </div>
                                        <div className="h-12 rounded-md skeleton" />
                                        <div className="h-4 w-32 mx-auto rounded-sm skeleton" />
                                </div>
                        </div>
                </div>
        );
}
