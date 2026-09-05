'use client';

/**
 * round86-B6 — tiny client islands for the server-rendered menu hero.
 *
 * `next/dynamic` with `ssr: false` is only legal inside client components, so
 * the interactive hero widgets (share button, gallery carousel) are exposed
 * through these wrappers. The hero markup itself now renders on the server
 * (MenuHero.tsx) instead of being compiled into the client bundle.
 */
import dynamic from 'next/dynamic';

const ShareButton = dynamic(
    () => import('@/components/shared/ShareButton').then((m) => ({ default: m.ShareButton })),
    { ssr: false }
);

const GalleryCarousel = dynamic(
    () => import('@/components/menu/GalleryCarousel').then((m) => ({ default: m.GalleryCarousel })),
    { ssr: false }
);

export function ShareButtonIsland({ url, title }: { url: string; title: string }) {
    return <ShareButton url={url} title={title} />;
}

export function GalleryIsland({ images, restaurantName }: { images: string[]; restaurantName: string }) {
    return <GalleryCarousel images={images} restaurantName={restaurantName} />;
}
