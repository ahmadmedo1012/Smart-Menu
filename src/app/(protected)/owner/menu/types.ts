'use client';

import {
        Package,
        Coffee,
        Pizza,
        CupSoda,
        IceCream,
        Apple,
        Beef,
        Fish,
        UtensilsCrossed,
        Milk,
        type LucideIcon,
} from 'lucide-react';
import type { ItemModifierGroup } from '@/components/owner/ItemDialog';

export interface Category {
        id: number;
        name: string;
        nameAr?: string;
        icon: string;
        sortOrder: number;
        isActive: boolean;
        items: Item[];
        _count?: { items: number };
        /* W6-B6 (G-2): القائمة المحمّلة مقصوصة بسقف 500 (fetchItems) —
           أزرار النقل تُعطّل بصراحة لأن التطبيع على قائمة ناقصة كاذب. */
        itemsTruncated?: boolean;
}
export interface Item {
        id: number;
        name: string;
        nameAr?: string;
        description: string;
        descriptionAr?: string;
        price: number;
        discountedPrice: number | null;
        image: string;
        status: string;
        // P42-W3 (الأرشفة الحقيقية): ISO timestamp = مؤرشف (غائب عن كل عرض
        // عام، سجله سليم) · null/undefined = صنف حي.
        archivedAt?: string | null;
        sortOrder: number;
        categoryId: number;
        isFeatured?: boolean;
        featuredRank?: number | null;
        // round88-C: legacy single showcaseTag dropped — array only.
        showcaseTags?: string[] | null;
        /* P43 SM-1 (توافر مجدول): كما تصل من GET /api/items — null = متاح
         * دائمًا؛ availableDays نص JSON "[0,1,4]" باتفاقية getDay. */
        availableFrom?: string | null;
        availableTo?: string | null;
        availableDays?: string | null;
        // w3-f1 (F1-3): groups ride the /api/items rows now — typed for the
        // ItemDialog editing prop (GET includes them since w3-f1).
        modifierGroups?: ItemModifierGroup[];
}

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
        Package,
        Coffee,
        Pizza,
        CupSoda,
        IceCream,
        Apple,
        Beef,
        Fish,
        Milk,
        UtensilsCrossed,
};

export const CATEGORY_ICONS = [
        'Package',
        'Coffee',
        'Pizza',
        'CupSoda',
        'IceCream',
        'Apple',
        'Beef',
        'UtensilsCrossed',
        'Fish',
        'Milk',
];
