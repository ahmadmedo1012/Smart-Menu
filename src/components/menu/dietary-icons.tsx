'use client';

/**
 * r96-W4b — lucide SVG icons for the customer-facing dietary pills.
 *
 * SmartBot rule «لا إيموجي كأيقونات»: the old emoji map in lib/dietary.ts
 * (DIETARY_ICONS) renders platform emoji on visitor menu cards. lib/dietary.ts
 * is a server-environment module (no React imports) and its emoji export stays
 * untouched because the owner editor (owner/item-dialog/DietaryAllergensSection)
 * still consumes it. This module is the client twin: same keys, crisp SVG.
 */
import {
	Leaf,
	Sprout,
	WheatOff,
	MilkOff,
	BadgeCheck,
	Egg,
	CircleSlash,
	Globe,
	Flame,
	Gauge,
	type LucideIcon,
} from 'lucide-react';

/** dietary key → semantic lucide icon (keys mirror DIETARY_OPTIONS in lib/dietary.ts). */
export const DIETARY_LUCIDE: Record<string, LucideIcon> = {
	vegetarian: Leaf,
	vegan: Sprout,
	gluten_free: WheatOff,
	dairy_free: MilkOff,
	halal: BadgeCheck,
	keto: Egg,
	sugar_free: CircleSlash,
	organic: Globe,
	spicy: Flame,
	sugarconscious: Gauge,
};

/** Unplanned keys render a generic leaf — never an emoji. */
export const FALLBACK_DIETARY_ICON: LucideIcon = Leaf;

/** Icon for a dietary tag with a no-emoji fallback for unknown keys. */
export function DietaryIcon({ tag, className }: { tag: string; className?: string }) {
	const Icon = DIETARY_LUCIDE[tag] ?? FALLBACK_DIETARY_ICON;
	return <Icon className={className} aria-hidden="true" />;
}
