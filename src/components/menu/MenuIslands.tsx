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

export function GalleryIsland({ images, restaurantName }: { images: string[]; restaurantName: string }) {
    if (!useMounted()) return null;
    return <GalleryCarousel images={images} restaurantName={restaurantName} />;
}
