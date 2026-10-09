/**
 * r131 (A11 states — fleet ruling: loading.tsx = shape skeletons): هيكل تحميل
 * على شكل صفحة الاشتراك (رأس + مؤشر الخطوات + شبكة بطاقات الباقات — نفس
 * هندسة SubscribeClient) بدل الغزل المجرّد. ‎.skeleton يركب مدة 1200ms،
 * rise-in بتدرّج 60ms، بلا-JS بالكامل.
 */
export default function SubscribeLoading() {
        return (
                <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        className="min-h-dvh"
                >
                        <span className="sr-only">جارٍ تحميل صفحة الاشتراك…</span>

                        <div className="max-w-4xl mx-auto px-4 py-12">
                                {/* الرأس */}
                                <div className="text-center mb-10 animate-rise-in" aria-hidden="true">
                                        <div className="h-3.5 w-24 mx-auto rounded-md skeleton mb-4" />
                                        <div className="h-9 w-72 mx-auto rounded-md skeleton" />
                                </div>

                                {/* مؤشر الخطوات */}
                                <div className="flex items-center justify-center gap-2 mb-10 animate-rise-in" style={{ animationDelay: '60ms' }} aria-hidden="true">
                                        {[0, 1, 2, 3].map((i) => (
                                                <div key={i} className="flex items-center">
                                                        <div className="size-10 rounded-full skeleton" />
                                                        {i < 3 && <div className="w-8 sm:w-14 h-0.5 mx-1 sm:mx-2 rounded-full skeleton" />}
                                                </div>
                                        ))}
                                </div>

                                {/* بطاقات الباقات */}
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
                                        {[...Array(4)].map((_, i) => (
                                                <div
                                                        key={i}
                                                        className="rounded-2xl border border-border/50 p-5 animate-rise-in"
                                                        style={{ animationDelay: `${120 + i * 60}ms` }}
                                                >
                                                        <div className="size-10 rounded-xl skeleton mb-3" />
                                                        <div className="h-4 w-2/3 skeleton rounded-sm mb-3" />
                                                        <div className="h-7 w-1/2 skeleton rounded-sm mb-4" />
                                                        <div className="space-y-2 mb-4">
                                                                {[...Array(3)].map((_, j) => (
                                                                        <div key={j} className="h-3.5 w-4/5 skeleton rounded-sm" />
                                                                ))}
                                                        </div>
                                                        <div className="h-10 skeleton rounded-md" />
                                                </div>
                                        ))}
                                </div>
                        </div>
                </div>
        );
}
