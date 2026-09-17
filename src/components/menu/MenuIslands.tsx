'use client';

/**
 * round86-B6 — tiny client islands for the server-rendered menu hero.
 *
 * `next/dynamic` with `ssr: false` is only legal inside client components, so
 * the interactive hero widgets (share button, gallery carousel) are exposed
 * through these wrappers. The hero markup itself now renders on the server
 * (MenuHero.tsx) instead of being compiled into the client bundle.
 *
 * r97-W6d: الاستيراد الثابت + حارس التركيب بدل dynamic(ssr:false) — قوالب
 * BAILOUT_TO_CLIENT_SIDE_RENDERING التي تتركها next/dynamic حول محتوى المنيو
 * المُخبز كانت آخر مشتبه في سباق «النسخة المخفية» ببطء CI. نفس دلالات
 * عدم الـSSR، بلا أي قوالب انسحاب. (الحوارات الكبيرة في MenuPageClient
 * تبقى dynamic — كسل حقيقي لملفات 400+ سطر تُحمّل عند الفتح فقط.)
 */
import { useEffect, useState } from 'react';
import { ShareButton } from '@/components/shared/ShareButton';
import { GalleryCarousel } from '@/components/menu/GalleryCarousel';

function useMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted;
}

export function ShareButtonIsland({ url, title }: { url: string; title: string }) {
    if (!useMounted()) return null;
    return <ShareButton url={url} title={title} />;
}

/**
 * r113-F115: قبل الإيدراج كان هذا الجزء يرجع null ثم يرسم الكاروسيل
 * (155px على 390px) بعد اكتمال الإيدراج — إزاحة كاملة للمنيو تحت المعرض
 * (CLS مقيس 0.06-0.155 على 3G). الحجز هنا بنفس غلاف الكاروسيل ونفس
 * نسبة العرض-الارتفاع (21/9 موبايل / 3/1 ديسكتوب) + حدود glass-card نفسها،
 * فلا يتغير الارتفاع إطلاقاً عند التبديل، مع لمعة تحميل خفيفة للمظهر.
 */
export function GalleryIsland({ images, restaurantName }: { images: string[]; restaurantName: string }) {
    const mounted = useMounted();
    if (!mounted) {
        return (
            <div className="group glass-card rounded-xl overflow-hidden" aria-hidden="true">
                <div className="relative aspect-[21/9] md:aspect-[3/1] overflow-hidden">
                    <div className="absolute inset-0 shimmer" style={{ background: 'linear-gradient(90deg, transparent 0%, var(--image-shimmer) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
                </div>
            </div>
        );
    }
    return <GalleryCarousel images={images} restaurantName={restaurantName} />;
}
