'use client';

import dynamic from 'next/dynamic';
// r97-W6c: استيراد ثابت بدل dynamic(ssr:true). الحدود البثية لـnext/dynamic
// (محتوى مخفي في S:1 + $RC reveal) كانت تتسابق مع رندر React للعميل بعد
// الماء — على أجهزة أبطأ يفوز رندر العميل فلا يُعتمَد المحتوى المبثّ وتبقى
// نسخة مخفية + نسخة مرئية (بطاقتا عرض مميز — team8 في CI). مكوّنات المنيو
// مطلوبة فورًا في هذه الصفحة أصلًا فلا مكسب من التحميل الكسول — بل جولة
// شبكة أقل وSSR مباشر داخل صدفة الصفحة بلا حدود بث إطلاقًا.
import { MenuPageClient } from './MenuPageClient';
// w3-f1: the public menu payload now carries modifier groups (available options
// only — filtered server-side in menu/[slug]/page.tsx). Shared type with the
// pure selection logic so OrderDialog/MenuItemCard speak the same shape.
import type { ModifierGroupProp } from './menu-types';

/**
 * round86-B6: the hero markup moved to the server component MenuHero.tsx —
 * this client section now only mounts the interactive islands below it
 * (sticky header, the menu itself, loyalty widget).
 */
const StickyMenuHeader = dynamic(
    () => import('./StickyMenuHeader').then((m) => ({ default: m.StickyMenuHeader })),
    { ssr: false }
);
const LoyaltyWidget = dynamic(
    () => import('../loyalty/LoyaltyWidget').then((m) => ({ default: m.LoyaltyWidget })),
    { ssr: false }
);

type Restaurant = {
    name: string;
    slug: string;
    whatsapp: string | null;
    id: number;
    logo: string;
};

type SerializedCategory = {
    id: number;
    name: string;
    nameAr: string | null;
    icon: string;
    sortOrder: number;
    isActive: boolean;
    restaurantId: number;
    createdAt: string;
    updatedAt: string;
};

type SerializedItem = {
    id: number;
    name: string;
    nameAr: string | null;
    description: string;
    descriptionAr: string;
    price: number;
    discountedPrice: number | null;
    image: string;
    sortOrder: number;
    categoryId: number;
    avgRating: number | null;
    ratingCount: number;
    isPopular: boolean;
    isNew: boolean;
    isFeatured: boolean;
    featuredRank: number | null;
    // round88-C: legacy single showcaseTag dropped — the array is the only
    // badge storage (migration 20260906055500).
    showcaseTags: string[] | null;
    createdAt: string;
    // w3-f1: live modifier groups (empty array = no choices).
    modifierGroups: ModifierGroupProp[];
};

export function MenuClientSection(props: {
    restaurant: Restaurant;
    categories: SerializedCategory[];
    serializedItems: SerializedItem[];
}) {
    const { restaurant, categories, serializedItems } = props;

    return (
        <>
            <StickyMenuHeader name={restaurant.name} logo={restaurant.logo} />

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                {/* r97-W6c: زال حدّ الـSuspense — لم يعد شيء يعلّق: useSearchParams
                    أزيلت (W6b) وdynamic(ssr:true) صار استيرادًا ثابتًا. الحد البثي
                    هو نفسه كان مصدر سباق النسختين في CI. loading.tsx للمسار
                    يغطي الانتقالات من خارج الصفحة. */}
                <MenuPageClient
                    categories={categories}
                    items={serializedItems}
                    restaurantWhatsapp={restaurant.whatsapp ?? undefined}
                    restaurantName={restaurant.name}
                    restaurantId={restaurant.id}
                    restaurantLogo={restaurant.logo}
                />
            </div>

            <LoyaltyWidget
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                whatsapp={restaurant.whatsapp ?? undefined}
                restaurantSlug={restaurant.slug}
            />
        </>
    );
}
