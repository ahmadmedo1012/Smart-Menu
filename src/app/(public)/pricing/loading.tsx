/**
 * r131 (A11 states — fleet ruling: loading.tsx = shape skeletons): هيكل تحميل
 * على شكل شبكة بطاقات الباقات (نفس هندسة PricingClient — ٤ بطاقات على
 * الحاوية 1280px) بدل الغزل المجرّد. بلا-JS بالكامل.
 */
export default function PricingLoading() {
        return (
                <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        className="min-h-dvh"
                >
                        <span className="sr-only">جارٍ تحميل الباقات...</span>

                        <div className="max-w-7xl mx-auto px-4 py-10">
                                {/* رأس القسم */}
                                <div className="text-center mb-10 animate-rise-in" aria-hidden="true">
                                        <div className="h-9 w-64 mx-auto rounded-md skeleton mb-3" />
                                        <div className="h-4 w-80 mx-auto rounded-sm skeleton" />
                                </div>

                                {/* بطاقات الباقات */}
                                <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                        {[...Array(4)].map((_, i) => (
                                                <div
                                                        key={i}
                                                        className="rounded-2xl border border-border/50 p-5 sm:p-6 animate-rise-in"
                                                        style={{ animationDelay: `${i * 60}ms` }}
                                                        aria-hidden="true"
                                                >
                                                        <div className="flex items-center gap-3 mb-4">
                                                                <div className="size-11 rounded-xl skeleton" />
                                                                <div className="space-y-2 flex-1">
                                                                        <div className="h-4 w-3/4 skeleton rounded-sm" />
                                                                        <div className="h-3 w-1/2 skeleton rounded-sm" />
                                                                </div>
                                                        </div>
                                                        <div className="h-8 w-1/2 skeleton rounded-sm mb-6" />
                                                        <div className="space-y-2 mb-6">
                                                                {[...Array(3)].map((_, j) => (
                                                                        <div key={j} className="h-7 skeleton rounded-sm" />
                                                                ))}
                                                        </div>
                                                        <div className="space-y-2 mb-8">
                                                                {[...Array(4)].map((_, j) => (
                                                                        <div key={j} className="h-4 w-4/5 skeleton rounded-sm" />
                                                                ))}
                                                        </div>
                                                        <div className="h-12 skeleton rounded-sm" />
                                                </div>
                                        ))}
                                </div>
                        </div>
                </div>
        );
}
