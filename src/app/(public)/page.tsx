import type { Metadata } from 'next';
import { HomePage } from '@/components/landing/HomePage';
import { prisma } from '@/lib/db';
import { getFeaturedRestaurants, type FeaturedRestaurant } from '@/lib/landing';
import type { PublicStats } from '@/components/landing/landing-data';

// round85-B2: landing data (stats + featured) now rendered SERVER-side and
// baked into the ISR page (60s — same freshness profile the /api/public routes
// had). Removes the post-hydrate fetch waterfall + skeleton flash on the SEO
// entry page; the client fallback only refetches when server data was missing.
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
        const [stats, featured] = await Promise.all([
                getPublicStats(),
                getFeaturedRestaurants().catch(() => [] as FeaturedRestaurant[]),
        ]);

        return <HomePage initialStats={stats} initialFeatured={featured.length > 0 ? featured : null} />;
}
