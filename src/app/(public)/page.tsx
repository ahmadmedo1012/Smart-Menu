import type { Metadata } from 'next';
import { HomePage } from '@/components/landing/HomePage';
import { prisma } from '@/lib/db';
import type { PublicStats } from '@/components/landing/landing-data';
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
                const [totalRestaurants, totalUsers] = await Promise.all([
                        prisma.restaurant.count(),
                        prisma.user.count(),
                ]);
                return { totalRestaurants, totalUsers };
        } catch {
                // keep the client-side fallback path alive
                return null;
        }
}

export default async function Home() {
        /* r142 «المائدة»: the hero paints an instant inline h1 (LCP doctrine)
           + the server-rendered menu card; the dish preload rides the
           component's priority image. No extra preload link is needed. */

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
                        <HomePage initialStats={stats} />
                </>
        );
}
