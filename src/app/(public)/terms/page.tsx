import type { Metadata } from "next"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

// r118-A9-P3: this legal-content page sat under the (protected) layout's
// per-request CSP-nonce flow → served no-store at ~0.4s TTFB on every visit.
// Moved to the (public) group (same layout minus the nonce) + hourly ISR.
export const revalidate = 3600

export const metadata: Metadata = {
        title: "شروط الاستخدام",
        // round93 (W2-b / تقرير 1-a §3): وصف مميز بدل وصف الهبوط الافتراضي + canonical
        // بنفس نمط menu/[slug] (مسار نسبي يُحلّ ضد metadataBase المعرف في التخطيط الجذر).
        description: "شروط استخدام منصة الربط الذكي | Smart Menu: مسؤوليتك عن حسابك ومحتوى قائمتك، وطبيعة خدمة المنيو الرقمي والطلبات عبر واتساب، وأحكام الدفع والاسترداد وتعديل الشروط.",
        alternates: { canonical: "/terms" },
        // r110-F6: og:url كانت ترث "/" من الجذر — انظر privacy/page.tsx.
        openGraph: {
                title: "شروط الاستخدام | الربط الذكي",
                description: "مسؤوليتك عن حسابك ومحتوى قائمتك، وأحكام الدفع والاسترداد وتعديل الشروط.",
                url: "/terms",
                siteName: "الربط الذكي",
                images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "الربط الذكي — منيو رقمي ذكي للمطاعم والمقاهي" }],
                locale: 'ar_AR',
                type: "website",
        },
}

export default function TermsPage() {
        return (
                <div className="min-h-screen bg-background">
                        <Header />
                        <div className="max-w-3xl mx-auto px-4 py-20">
                                {/* r128-F5 (§4): حاجب بنمط ln-label — تسمية فصل mono
                                   مسطّحة فوق العنوان (المحتوى القانوني بلا تغيير).
                                   r151 (LIVE-AUDIT-SM1 P1-2): tracking-[0.08em] أُزيل —
                                   السطر مختلط (رقم + شرطة + عربي) والتتبع يكسر اتصال
                                   الحروف العربية (قانون الأسطول: لا تتبع على العربي). */}
                                <p className="mb-3 font-mono text-xs font-medium text-accent-foreground tabular-nums">
                                        01 — الشروط
                                </p>
                                <h1 className="text-3xl font-bold mb-8">شروط الاستخدام</h1>
                                {/* r128-F5 (§4): ظهور النص مرة واحدة عند الدخول (تلاشٍ هادئ) */}
                                <ScrollReveal once y={16} className="prose prose-invert space-y-6 text-foreground/80">
                                        <p>باستخدامك لمنصة الربط الذكي | Smart Menu، فإنك توافق على هذه الشروط. إذا كنت لا توافق، يرجى عدم استخدام الخدمة.</p>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">المستخدم</h2>
                                        <p>عند إنشاء حساب في المنصة، أنت مسؤول عن الحفاظ على سرية معلومات الدخول الخاصة بك وعن جميع الأنشطة التي تتم تحت حسابك.</p>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">الخدمة</h2>
                                        <p>توفر المنصة خدمة إدارة المنيو الرقمي واستقبال الطلبات عبر واتساب. نحن نبذل قصارى جهدنا لضمان استمرارية الخدمة، لكن لا نضمن عدم حدوث انقطاعات.</p>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">المحتوى</h2>
                                        <p>أنت المسؤول الوحيد عن محتوى قائمتك (المنيو) وبيانات مطعمك. نحن لا نتحقق من دقة أو قانونية المحتوى المضاف.</p>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">الدفع</h2>
                                        <p>المدفوعات تتم عبر بوابات دفع آمنة. نحن لا نخزن معلومات بطاقات الائتمان. جميع المبالغ غير قابلة للاسترداد إلا في حالات محدودة.</p>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">تعديل الشروط</h2>
                                        <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنقوم بإشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني المسجل لدينا.</p>
                                        <p className="text-sm mt-12">آخر تحديث: يونيو 2026</p>
                                </ScrollReveal>
                        </div>
                        <Footer />
                </div>
        )
}
