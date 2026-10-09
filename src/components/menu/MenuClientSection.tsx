'use client';

import { useEffect, useState } from 'react';
// r97-W6c: استيراد ثابت بدل dynamic(ssr:true). الحدود البثية لـnext/dynamic
// (محتوى مخفي في S:1 + $RC reveal) كانت تتسابق مع رندر React للعميل بعد
// الماء — على أجهزة أبطأ يفوز رندر العميل فلا يُعتمَد المحتوى المبثّ وتبقى
// نسخة مخفية + نسخة مرئية (بطاقتا عرض مميز — team8 في CI). مكوّنات المنيو
// مطلوبة فورًا في هذه الصفحة أصلًا فلا مكسب من التحميل الكسول — بل جولة
// شبكة أقل وSSR مباشر داخل صدفة الصفحة بلا حدود بث إطلاقًا.
import { MenuPageClient } from './MenuPageClient';
// r97-W6d: StickyMenuHeader و LoyaltyWidget كانا dynamic(ssr:false) — قوالب
// BAILOUT_TO_CLIENT_SIDE_RENDERING التي تتركها next/dynamic بجوار محتوى
// المنيو المُخبز أصبحت المشتبه الرئيسي المتبقي في سباق النسخة المخفية
// ببطء CI. حارس التركيب (mounted) يعطي نفس السلوك العميلي-فقط بلا أي
// قوالب انسحاب أو حدود بث.
// r121-G-7: الحارس ضاق إلى LoyaltyWidget فقط — رأس المنيو اللاصق نفسه
// (StickyMenuHeader) حالته الابتدائية حتمية (scrolled=false وmobileOpen=false
// في الطرفين؛ useScroll/useMotionValueEvent اشتراكات أثر-لا-عرض) فيُرندر في
// SSR الآن: كان الرأس غائبًا عن أول رسم طوال نافذة الإيدراج (2.6s تحت
// الخنق — r120 مؤجل). LoyaltyWidget يقرأ حالة ولاء/localStorage فيبقى
// خلف الحارس.
import { StickyMenuHeader } from './StickyMenuHeader';
import { LoyaltyWidget } from '../loyalty/LoyaltyWidget';
// w3-f1: the public menu payload now carries modifier groups (available options
// only — filtered server-side in menu/[slug]/page.tsx). Shared type with the
// pure selection logic so OrderDialog/MenuItemCard speak the same shape.
import type { ModifierGroupProp } from './menu-types';

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
    // r135-SOLD-OUT: availability crosses the wire — false renders the card
    // greyed-out with «غير متوفر حالياً» instead of the item vanishing.
    isAvailable: boolean;
    // r135: present in the payload since w3-f1 but never TYPED here — now the
    // dietary filter chips + OrderDialog allergen block consume them typed.
    dietaryTags: string[];
    allergens: string[];
    // w3-f1: live modifier groups (empty array = no choices).
    modifierGroups: ModifierGroupProp[];
};

export function MenuClientSection(props: {
    restaurant: Restaurant;
    categories: SerializedCategory[];
    serializedItems: SerializedItem[];
}) {
    const { restaurant, categories, serializedItems } = props;

    /* r97-W6d + r121-G-7: العميل فقط لودجت الولاء (كان dynamic ssr:false مع
            الرأس) — الرأس اللاصق صار يُرندر في SSR (حالة ابتدائية حتمية)،
            وودجت الولاء يقرأ localStorage فيبقى خلف حارس التركيب. */
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <>
            {/* r121-G-7: بلا حارس — الرأس يظهر في أول رسم (SSR-safe) */}
            <StickyMenuHeader name={restaurant.name} logo={restaurant.logo} />

            {/* r120 (U9-P3): الحاوية كانت تُغلق عند 4xl (864px) من 1024 حتى 1920+
                مع شبكة 3 أعمدة فقط — هوامش ميتة 288-562px على الشاشات الكبيرة. */}
            <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 relative z-10">
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

            {mounted && (
                <LoyaltyWidget
                    restaurantId={restaurant.id}
                    restaurantName={restaurant.name}
                    whatsapp={restaurant.whatsapp ?? undefined}
                    restaurantSlug={restaurant.slug}
                />
            )}
        </>
    );
}
