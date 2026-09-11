/**
 * round85-C5 — single source of truth for dietary/allergen vocabulary.
 *
 * These maps were previously duplicated in ItemDialog (owner editor) and
 * MenuItemCard (customer menu) with drift: the customer card understood
 * 'sugarconscious' while the owner editor didn't. One module now feeds both
 * surfaces (plus the shared OPTION lists the editor chips are built from).
 */

/** Editor chip options (keys the system can set). */
export const DIETARY_OPTIONS = [
        'vegetarian',
        'vegan',
        'gluten_free',
        'dairy_free',
        'halal',
        'keto',
        'sugar_free',
        'organic',
        'spicy',
        'sugarconscious',
] as const;

export const ALLERGEN_OPTIONS = [
        'gluten',
        'dairy',
        'eggs',
        'fish',
        'shellfish',
        'tree_nuts',
        'peanuts',
        'soy',
        'sesame',
] as const;

/** Arabic labels for dietary badges (owners + customers see the same copy). */
export const DIETARY_LABELS: Record<string, string> = {
        vegetarian: 'نباتي',
        vegan: 'نباتي صرف',
        gluten_free: 'خالٍ من الغلوتين',
        dairy_free: 'خالٍ من الألبان',
        halal: 'حلال',
        keto: 'كيتو',
        sugar_free: 'بدون سكر',
        organic: 'عضوي',
        spicy: 'حار',
        sugarconscious: 'سكر معتدل',
};

export const ALLERGEN_LABELS: Record<string, string> = {
        gluten: 'غلوتين',
        dairy: 'ألبان',
        eggs: 'بيض',
        fish: 'سمك',
        shellfish: 'قشريات',
        tree_nuts: 'مكسرات',
        peanuts: 'فول سوداني',
        soy: 'صويا',
        sesame: 'سمسم',
};
