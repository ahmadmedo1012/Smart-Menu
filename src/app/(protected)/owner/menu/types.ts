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
        sortOrder: number;
        categoryId: number;
        isFeatured?: boolean;
        featuredRank?: number | null;
        // round88-C: legacy single showcaseTag dropped — array only.
        showcaseTags?: string[] | null;
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
