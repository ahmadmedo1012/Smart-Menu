/**
 * r125 (11-b): هيكل تحميل على شكل المنيو — بديل الغزل المجرّد (DefaultLoading)
 * في مسار صفحة المال ‎/menu/[slug]‎. البنية تحاكي رأس المطعم + صفيحة اللافتة +
 * شريط المعرض + شريط الأدوات + مُشغّل فئات الدرج + شبكة البطاقات، فتُخفض المدة
 * المُدرَكة ويحافظ الإطار على الإيقاع البصري بين الرسم الأول والبيانات (نمط
 * skeleton-of-the-page). W7-G (P1, A2 audit): الهندسة مطابقة للصفحة الحقيقية
 * بعد P16-4b — لا قفزة شبكة عند أول زيارة (كان بند CLS-loading-shape في دفتر W7-F).
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
                        <span className="sr-only">جارٍ تحميل المنيو…</span>

                        {/* رأس لاصق مؤقت — يمنع قفزة التخطيط عند ظهور StickyMenuHeader */}
                        <div className="fixed inset-x-0 top-0 z-30 h-14" aria-hidden="true" />

                        {/* r133 (A3 S6): البطل المضغوط السابق (‎~150px‎ مسافة يسارية) لم يكن
                            يحاكي بطل MenuHero الحقيقي (شعار ‎size-28‎ + عنوان
                            ضخم + وصف + فاصل + صف أزرار)‎ — فكانت أول زيارة بمسح QR تقفز صفحة
                            كاملة عند استبدال الهيكل. الكتلة الأولى الآن تعكس هندسة البطل
                            الحقيقية (نفس ‎min-h‎/التوسيط/البنية) فالاستبدال مرئيًا محايد.
                            P18-W2-c (W2-c2 أكمل الإرساء): MenuHero صار مضغوطًا على الجوال
                            (‎min-h-0‎ + ‎pt-16 pb-6‎ — قانون الطية ≤1.2 شاشة) — الهيكل يطابق
                            الهندسة الجديدة وإلا عاد قفز الاستبدال. */}
                        <header className="relative min-h-0 md:min-h-[70vh] overflow-hidden bg-gradient-to-b from-orange/25 via-background to-background animate-rise-in" aria-hidden="true">
                                <div className="relative z-10 max-w-4xl mx-auto px-4 pt-16 pb-6 md:pt-28 md:pb-16 text-center">
                                        {/* الشعار الزجاجي — نفس ‎size-28 md:size-32‎ + ‎mb-4 md:mb-6‎ للحاوية الحقيقية */}
                                        <div className="mx-auto mb-4 md:mb-6 size-28 md:size-32 rounded-2xl skeleton" />
                                        {/* العنوان (‎text-3xl→7xl بـleading-[1.3]‎) — W7-G (P1, A2 audit):
                                            الارتفاعات الحقيقية 39px موبايل / 78px md / 94px lg
                                            (كانت h-9/md:h-14 فكانت الشبكة كلها تقفز عند التحميل). */}
                                        <div className="h-[39px] md:h-[78px] lg:h-[94px] w-72 max-w-full mx-auto rounded-lg skeleton mb-2 md:mb-3" />
                                        {/* الوصف — ‎text-base/lg × leading-relaxed (26/30px)؛ بلا
                                            هامش علوي (الحقيقي يركب mb-2 md:mb-3 للعنوان) */}
                                        <div className="h-[26px] md:h-[30px] w-56 max-w-full mx-auto rounded-md skeleton" />
                                        {/* الفاصل الزخرفي — نفس ‎mt-3 mb-3 md:mt-5 md:mb-5‎ */}
                                        <div className="mx-auto mt-3 mb-3 md:mt-5 md:mb-5 flex items-center justify-center gap-3">
                                                <div className="w-12 h-px bg-border/60" />
                                                <div className="size-1.5 rounded-full bg-border" />
                                                <div className="w-12 h-px bg-border/60" />
                                        </div>
                                        {/* صف الأزرار الزجاجي المركزي — أقراص ‎min-h-11‎.
                                            W7-G (P1): قرصان فقط (مشاركة + طباعة) كما في البطل
                                            الحقيقي، وبنفس ‎mt-3 md:mt-4‎. */}
                                        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 md:mt-4">
                                                <div className="h-11 w-36 rounded-full skeleton" />
                                                <div className="h-11 w-28 rounded-full skeleton" />
                                        </div>
                                        {/* W7-G (P1, A2 audit): صفيحة اللافتة (MenuHero P16-4b) —
                                            لوحة التواصل المعلّقة (إطار مزدوج + ‎min-h-11‎ لكل صف)
                                            كانت غائبة عن الهيكل فكانت أول زيارة تقفز أكثر من
                                            150px عند التحميل. أربعة صفوف = الصفوف الحقيقية
                                            الشائعة (دوام + هاتف + واتساب + عنوان). */}
                                        <div className="mx-auto mt-4 md:mt-6 w-fit max-w-full rounded-xl border-2 border-border/40 px-4 py-2">
                                                <div className="flex flex-col divide-y divide-border/40">
                                                        {[0, 1, 2, 3].map((r) => (
                                                                <div key={r} className="flex min-h-11 items-center gap-2.5 px-1.5 py-1">
                                                                        <div className="size-3.5 rounded-full skeleton" />
                                                                        <div className="h-3.5 w-44 max-w-[50vw] rounded-md skeleton" />
                                                                </div>
                                                        ))}
                                                </div>
                                        </div>
                                </div>
                        </header>

                        {/* W7-G (P1, A2 audit): شريط معرض الصور — يحجز نفس نسبة
                            الغلاف الحقيقي (‎21/9‎ موبايل / ‎3/1‎ ديسكتوب تحت
                            ‎max-w-4xl px-4 mt-2‎) فلا تقفز الشبكة عند ظهوره. */}
                        <section className="max-w-4xl mx-auto px-4 mt-2" aria-hidden="true">
                                <div
                                        className="aspect-[21/9] md:aspect-[3/1] skeleton"
                                        /* ‎.skeleton‎ (غير طبقي) يفرض نصف قطره — نثبّت زاوية
                                            الغلاف الزجاجي الحقيقية ‎rounded-xl (20px)‎ */
                                        style={{ borderRadius: 'var(--r-xl, 20px)' }}
                                />
                        </section>

                        <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 relative z-10 pt-6">
                                {/* W7-G (P1, A2 audit): شريط الأدوات بنفس هندسة الحقيقي —
                                    بحث ‎h-12 sm:h-14‎ + مُشغّل ترتيب ‎w-12 sm:w-14 sm:h-14‎
                                    (كان الهيكل يفتقد ‎sm:h-14‎ فقفز 8px عند التحميل) */}
                                <div className="flex gap-2 items-start mb-4 animate-rise-in" style={{ animationDelay: '60ms' }} aria-hidden="true">
                                        <div className="flex-1 h-12 sm:h-14 rounded-lg skeleton" />
                                        <div className="h-12 sm:h-14 w-12 sm:w-14 rounded-lg skeleton" />
                                </div>

                                {/* W7-G (P1, A2 audit): مُشغّل فئات الدرج — أربع شرائح
                                    مستديرة (‎h-11 rounded-full‎) تقاعدت؛ الصفحة الحقيقية
                                    (P16-4b) تعرض مُشغّلاً واحداً بعرض كامل ‎h-12 sm:h-14 rounded-lg‎. */}
                                <div className="mb-6 animate-rise-in" style={{ animationDelay: '120ms' }} aria-hidden="true">
                                        <div className="h-12 sm:h-14 w-full rounded-lg skeleton" />
                                </div>

                                {/* شبكة البطاقات — بنية MenuItemCard: صورة 4:3 + اسم + وصف + سعر + صف أزرار
                                   r145 (15-SM P1): grid-cols-1 صريحة — نفس إصلاح شبكتي MenuPageClient:
                                   العمود الضمني تحت sm بحجم auto كان يلتقط أوسع max-content فيفيض. */}
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
