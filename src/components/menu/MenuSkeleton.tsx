/**
 * r125 (11-b): هيكل تحميل على شكل المنيو — بديل الغزل المجرّد (DefaultLoading)
 * في مسار صفحة المال ‎/menu/[slug]‎. البنية تحاكي رأس المطعم + شريط الأدوات +
 * شرائح الفئات + شبكة البطاقات، فتُخفض المدة المُدرَكة ويحافظ الإطار على
 * الإيقاع البصري بين الرسم الأول والبيانات (نمط skeleton-of-the-page).
 *
 * الالتزام بمدارك:
 *  - ‎.skeleton يركب ‎--motion-duration-skeleton (1200ms) — الصفحة النقدية لا
 *    تستعمل حرفيات مدة (r125 10-a أصلح الطبقة المشتركة).
 *  - الدخول rise-in (تحويل فقط — مرئي من أول رسم، عقيدة r120 U2-P1-2) بتدرّج
 *    ‎60ms خطوة، سقف 6 (‎--motion-stagger-*).
 *  - الزوايا من سلم نصف القطر القائم: 2xl للبطاقات (نفس MenuItemCard)،
 *    full للشرائح، lg لشريط البحث (نفس MenuToolbar).
 *  - حركة مخفّضة: الحزام العام يصفّر المدة (0.01ms) فتظهر الكتل صامتة.
 *  - بلا-JS بالكامل: CSS خالص، يعمل في fallback التوليد الثابت/البث.
 */
export function MenuSkeleton() {
        const cards = Array.from({ length: 8 }, (_, i) => i);
        return (
                <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        className="relative min-h-dvh overflow-x-clip"
                >
                        <span className="sr-only">جارٍ تحميل المنيو...</span>

                        {/* رأس لاصق مؤقت — يمنع قفزة التخطيط عند ظهور StickyMenuHeader */}
                        <div className="fixed inset-x-0 top-0 z-30 h-14" aria-hidden="true" />

                        <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 relative z-10 pt-16">
                                {/* رأس المطعم — نطاق ترحيب */}
                                <div className="mb-6 animate-rise-in" aria-hidden="true">
                                        <div className="flex items-center gap-3 mb-4">
                                                <div className="size-12 rounded-xl skeleton" />
                                                <div className="flex-1 space-y-2">
                                                        <div className="h-5 w-40 rounded-md skeleton" />
                                                        <div className="h-3.5 w-56 rounded-md skeleton" />
                                                </div>
                                        </div>
                                        <div className="flex gap-2">
                                                <div className="h-10 w-32 rounded-full skeleton" />
                                                <div className="h-10 w-28 rounded-full skeleton" />
                                        </div>
                                </div>

                                {/* شريط الأدوات: بحث + ترتيب (نفس h-12 وradius-lg) */}
                                <div className="flex gap-2 items-start mb-4 animate-rise-in" style={{ animationDelay: '60ms' }} aria-hidden="true">
                                        <div className="flex-1 h-12 rounded-lg skeleton" />
                                        <div className="h-12 w-12 rounded-lg skeleton" />
                                </div>

                                {/* شرائح الفئات */}
                                <div className="flex gap-1.5 mb-6 animate-rise-in" style={{ animationDelay: '120ms' }} aria-hidden="true">
                                        <div className="h-11 w-20 rounded-full skeleton" />
                                        <div className="h-11 w-32 rounded-full skeleton" />
                                        <div className="h-11 w-28 rounded-full skeleton" />
                                        <div className="h-11 w-24 rounded-full skeleton" />
                                </div>

                                {/* شبكة البطاقات — بنية MenuItemCard: صورة 4:3 + اسم + وصف + سعر + صف أزرار */}
                                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {cards.map((i) => (
                                                <div key={i} className="overflow-hidden rounded-2xl border border-border/50 bg-card animate-rise-in" style={{ animationDelay: `${180 + (i % 6) * 60}ms` }} aria-hidden="true">
                                                        {/* النمط المضمّن: ‎.skeleton (غير طبقي) يغلب أدوات tailwind —
                                                           الصورة تمتد لحافة البطاقة (نفس قانون r97-X1) */}
                                                        <div className="aspect-[4/3] skeleton" style={{ borderRadius: 0 }} />
                                                        <div className="p-4 flex flex-col gap-2">
                                                                <div className="h-5 w-3/4 rounded-md skeleton" />
                                                                <div className="h-3 w-full rounded-md skeleton" />
                                                                <div className="h-3 w-2/3 rounded-md skeleton" />
                                                                <div className="flex items-center gap-2 mt-1">
                                                                        <div className="h-6 w-16 rounded-md skeleton" />
                                                                        <div className="flex-1" />
                                                                        <div className="h-11 w-11 rounded-xl skeleton" />
                                                                        <div className="h-11 flex-1 max-w-[140px] rounded-xl skeleton" />
                                                                </div>
                                                        </div>
                                                </div>
                                        ))}
                                </div>
                        </div>
                </div>
        );
}
