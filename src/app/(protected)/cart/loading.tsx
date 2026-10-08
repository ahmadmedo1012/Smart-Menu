/**
 * r131 (A11 states — fleet ruling: loading.tsx = shape skeletons): هيكل تحميل
 * على شكل صفحة السلة (شرائح الاستلام + أسطر الأصناف + بطاقة الملاحظات +
 * الملخص + زر الدفع) بدل الغزل المجرّد — يخفض المدة المُدرَكة ويحافظ على
 * الإيقاع البصري بين الرسم والبيانات (نمط MenuSkeleton).
 *
 * الالتزام بمدارك: ‎.skeleton يركب ‎--motion-duration-skeleton (1200ms)،
 * الدخول rise-in بتدرّج 60ms سقف 6، بلا-JS بالكامل، والحزام العام يصفّر
 * الحركة للمُفضِّل تخفيفها.
 */
export default function CartLoading() {
        return (
                <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        className="min-h-dvh pt-20"
                >
                        <span className="sr-only">جارٍ تحميل سلة الطلبات...</span>

                        <div className="max-w-2xl mx-auto px-4 py-6">
                                {/* رأس الصفحة */}
                                <div className="flex items-center gap-3 mb-6 animate-rise-in" aria-hidden="true">
                                        <div className="size-10 rounded-xl skeleton" />
                                        <div className="h-6 w-40 rounded-md skeleton" />
                                </div>

                                {/* شرائح نوع الاستلام */}
                                <div className="flex gap-2 mb-8 animate-rise-in" style={{ animationDelay: '60ms' }} aria-hidden="true">
                                        <div className="flex-1 h-11 rounded-md skeleton" />
                                        <div className="flex-1 h-11 rounded-md skeleton" />
                                        <div className="flex-1 h-11 rounded-md skeleton" />
                                </div>

                                {/* أسطر الأصناف */}
                                <div className="space-y-4 mb-8">
                                        {[0, 1, 2].map((i) => (
                                                <div
                                                        key={i}
                                                        className="rounded-md bg-card/60 border border-border/30 p-4 animate-rise-in"
                                                        style={{ animationDelay: `${120 + i * 60}ms` }}
                                                        aria-hidden="true"
                                                >
                                                        <div className="flex items-center gap-3 mb-3">
                                                                <div className="size-10 rounded-xl skeleton shrink-0" />
                                                                <div className="flex-1 space-y-2">
                                                                        <div className="h-4 w-2/3 rounded-sm skeleton" />
                                                                        <div className="h-3 w-1/3 rounded-sm skeleton" />
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                        <div className="size-11 rounded-md skeleton" />
                                                                        <div className="w-8 h-4 rounded-sm skeleton" />
                                                                        <div className="size-11 rounded-md skeleton" />
                                                                </div>
                                                        </div>
                                                        <div className="h-11 rounded-md skeleton" />
                                                </div>
                                        ))}
                                </div>

                                {/* بطاقة الملاحظات + الملخص */}
                                <div className="rounded-md bg-card/60 border border-border/30 p-5 mb-8 animate-rise-in" style={{ animationDelay: '300ms' }} aria-hidden="true">
                                        <div className="h-4 w-28 rounded-sm skeleton mb-4" />
                                        <div className="h-11 rounded-md skeleton mb-3" />
                                        <div className="h-11 rounded-md skeleton" />
                                </div>

                                {/* زر الدفع */}
                                <div className="h-14 rounded-md skeleton animate-rise-in" style={{ animationDelay: '360ms' }} aria-hidden="true" />
                        </div>
                </div>
        );
}
