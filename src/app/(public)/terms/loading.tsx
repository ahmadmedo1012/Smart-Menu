/**
 * r131 (A11 states — fleet ruling: loading.tsx = shape skeletons): هيكل تحميل
 * على شكل مقال الشروط (عنوان + فقرات) بدل الغزل المجرّد — يشاركه مسار
 * سياسة الخصوصية. بلا-JS بالكامل.
 */
export default function TermsLoading() {
        return (
                <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        className="min-h-dvh"
                >
                        <span className="sr-only">جارٍ تحميل صفحة الشروط…</span>

                        <div className="max-w-2xl mx-auto px-4 py-12">
                                <div className="h-8 w-56 rounded-md skeleton mb-8 animate-rise-in" aria-hidden="true" />
                                <div className="space-y-5">
                                        {[0, 1, 2].map((i) => (
                                                <div
                                                        key={i}
                                                        className="rounded-xl border border-border/50 p-5 space-y-3 animate-rise-in"
                                                        style={{ animationDelay: `${60 + i * 60}ms` }}
                                                        aria-hidden="true"
                                                >
                                                        <div className="h-4 w-1/3 rounded-sm skeleton" />
                                                        <div className="h-3.5 w-full rounded-sm skeleton" />
                                                        <div className="h-3.5 w-5/6 rounded-sm skeleton" />
                                                        <div className="h-3.5 w-2/3 rounded-sm skeleton" />
                                                </div>
                                        ))}
                                </div>
                        </div>
                </div>
        );
}
