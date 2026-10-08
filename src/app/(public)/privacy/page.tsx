import type { Metadata } from "next"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

// r118-A9-P3: this legal-content page sat under the (protected) layout's
// per-request CSP-nonce flow → served no-store at ~0.4s TTFB on every visit.
// Moved to the (public) group (same layout minus the nonce) + hourly ISR.
export const revalidate = 3600

export const metadata: Metadata = {
        title: "سياسة الخصوصية",
        // round93 (W2-b / تقرير 1-a §3): وصف مميز بدل وصف الهبوط الافتراضي + canonical
        // بنفس نمط menu/[slug] (مسار نسبي يُحلّ ضد metadataBase المعرف في التخطيط الجذر).
        description: "سياسة خصوصية منصة الربط الذكي | Smart Menu: البيانات التي نجمعها (الحساب والمطعم والطلبات)، وكيف نستخدمها ونحميها، ومتى تُشارك مع جهات خارجية، وكيفية التواصل معنا.",
        alternates: { canonical: "/privacy" },
        // r110-F6: og:url كانت ترث "/" من التخطيط الجذر (نطاق الجذر بلا مسار)
        // بينما canonical الصفحة نفسها /privacy — محركات التقاسم تقرأ og:url.
        // openGraph يُستبدل كاملاً عند تعريفه في الصفحة (دمج ضحل)، لذا تُكرر
        // الحقول كلها بنفس قيم الجذر مع تغيير url فقط — نفس نمط menu/[slug].
        openGraph: {
                title: "سياسة الخصوصية | الربط الذكي",
                description: "البيانات التي نجمعها، وكيف نستخدمها ونحميها، ومتى تُشارك مع جهات خارجية.",
                url: "/privacy",
                siteName: "الربط الذكي",
                images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "الربط الذكي — منيو رقمي ذكي للمطاعم والمقاهي" }],
                locale: "ar_LY",
                type: "website",
        },
}

export default function PrivacyPage() {
        return (
                <div className="min-h-screen bg-background">
                        <Header />
                        <div className="max-w-3xl mx-auto px-4 py-20">
                                {/* r128-F5 (§4): حاجب بنمط ln-label — تسمية فصل mono
                                   مسطّحة فوق العنوان (المحتوى القانوني بلا تغيير). */}
                                <p className="mb-3 font-mono text-xs font-medium tracking-[0.08em] text-accent-foreground tabular-nums">
                                        01 — الخصوصية
                                </p>
                                <h1 className="text-3xl font-bold mb-8">سياسة الخصوصية</h1>
                                {/* r128-F5 (§4): ظهور النص مرة واحدة عند الدخول (تلاشٍ هادئ) */}
                                <ScrollReveal once y={16} className="space-y-6 text-foreground/80">
                                        <p>نحن في الربط الذكي | Smart Menu نلتزم بحماية خصوصيتك. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك الشخصية.</p>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">المعلومات التي نجمعها</h2>
                                        <ul className="list-disc ps-5 space-y-2">
                                                <li>معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف</li>
                                                <li>بيانات المطعم: اسم المطعم، الشعار، العنوان، ساعات العمل</li>
                                                <li>قائمة الطعام: الأصناف، الأسعار، الوصف، الصور</li>
                                                <li>بيانات الطلبات: سجل الطلبات، الإحصائيات</li>
                                        </ul>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">كيف نستخدم معلوماتك</h2>
                                        <ul className="list-disc ps-5 space-y-2">
                                                <li>تقديم وتحسين خدمة المنيو الرقمي</li>
                                                <li>معالجة الطلبات والتواصل مع العملاء</li>
                                                <li>تحليل الأداء وإرسال التقارير</li>
                                                <li>التواصل معك بخصوص حسابك وخدمتنا</li>
                                        </ul>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">حماية البيانات</h2>
                                        <p>نستخدم إجراءات أمنية متقدمة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفشاء.</p>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">جهات خارجية</h2>
                                        <p>لا نشارك معلوماتك مع أطراف ثالثة إلا للضرورة القصوى (مثل بوابات الدفع) ووفقاً لمعايير أمان صارمة.</p>
                                        <h2 className="text-foreground text-xl font-semibold mt-8">اتصل بنا</h2>
                                        <p>للاستفسارات المتعلقة بالخصوصية، يرجى التواصل عبر واتساب أو البريد الإلكتروني المسجل.</p>
                                        <p className="text-sm mt-12">آخر تحديث: يونيو 2026</p>
                                </ScrollReveal>
                        </div>
                        <Footer />
                </div>
        )
}
