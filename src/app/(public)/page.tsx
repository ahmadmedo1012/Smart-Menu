import type { Metadata } from 'next';
import { HomePage } from '@/components/landing/HomePage';
import type { PublicStats } from '@/components/landing/landing-data';
import { countPublicStats } from '@/lib/stats-queries';
import { FAQS } from '@/components/landing/LandingFaq';
import { SITE_ORIGIN } from '@/lib/seo';

// round85-B2: landing stats rendered SERVER-side and baked into the ISR
// page (60s — same freshness profile the /api/public routes had). Removes
// the post-hydrate fetch waterfall + skeleton flash on the SEO entry
// page; the client fallback only refetches when server data was missing.
// (r142: the featured query left with the retired «عالم المطاعم» chapter.)
export const revalidate = 60;

// round93 (W2-b / تقرير 1-a §3): canonical للصفحة الرئيسية — بلا هذا المفتاح لا
// تصدر أي صفحة عامة غير المنيو رابطًا قياسيًا. نفس نمط menu/[slug]: مسار نسبي
// يُحلّ ضد metadataBase المعرف في التخطيط الجذر. بقية الحقول ترث من التخطيط.
export const metadata: Metadata = {
        alternates: { canonical: '/' },
};

async function getPublicStats(): Promise<PublicStats | null> {
        try {
                // r143 (Phase-4 W1 D6): العدّادات الصادقة الموحدة (isActive:true +
                // role:owner عبر countPublicStats) — كانت النسخة المحلية تعدّ كل صف.
                return await countPublicStats();
        } catch {
                // keep the client-side fallback path alive
                return null;
        }
}

export default async function Home() {
        /* r142 «المائدة» + P21-W3-E: the hero paints an instant inline h1
           (LCP doctrine) + the server-rendered menu card; the window is
           authored inline SVG (NightKitchenScene) — zero image bytes, so
           no preload link and no priority image exist on this route. */

        const stats = await getPublicStats();

        return (
                <>
                        {/* r138 (F9): كيان المنصة يُصدَّر من الصفحة الرئيسية وحدها —
                            كان في (public)/layout فتراكب مع كيان المطعم في كل
                            صفحات /menu/[slug] بلا @graph. أُضيف url وinLanguage
                            (نواقص المواصفة) وبقي السعر الحقيقي 0 (الخطة المجانية). */}
                        <script
                                type="application/ld+json"
                                dangerouslySetInnerHTML={{
                                        __html: JSON.stringify({
                                                '@context': 'https://schema.org',
                                                '@type': 'SoftwareApplication',
                                                name: 'الربط الذكي | Smart Menu',
                                                description: 'منيو رقمي ذكي للمطاعم والمقاهي',
                                                applicationCategory: 'BusinessApplication',
                                                operatingSystem: 'Web',
                                                url: SITE_ORIGIN,
                                                inLanguage: 'ar',
                                                offers: { '@type': 'Offer', price: '0', priceCurrency: 'LYD' },
                                        }).replace(/</g, '\\u003c'),
                                }}
                        />
                        {/* r143 (Phase-4 W1 #9, inventory §4.7): FAQPage JSON-LD —
                            التوأم الزاحف المرئي لأسئلة details/summary المصيّرة
                            (LandingFaq FAQS — المصدر الواحد فلا يمكن أن ينفصلا). */}
                        <script
                                type="application/ld+json"
                                dangerouslySetInnerHTML={{
                                        __html: JSON.stringify({
                                                '@context': 'https://schema.org',
                                                '@type': 'FAQPage',
                                                inLanguage: 'ar',
                                                mainEntity: FAQS.map((f) => ({
                                                        '@type': 'Question',
                                                        name: f.q,
                                                        acceptedAnswer: { '@type': 'Answer', text: f.a },
                                                })),
                                        }).replace(/</g, '\\u003c'),
                                }}
                        />
                        <HomePage initialStats={stats} />
                </>
        );
}
