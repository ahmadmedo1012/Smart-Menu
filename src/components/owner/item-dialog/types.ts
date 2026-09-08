/*
 * item-dialog/types.ts — round94 W2-b (inspection-c §2.3/§2.4):
 * types + constants moved VERBATIM from ItemDialog.tsx lines 26–110, 90–91, 159.
 * The orchestrator (ItemDialog.tsx) re-exports the public contract so the two
 * external import sites (owner/menu/page.tsx + owner/menu/types.ts) are untouched.
 */

/** Dialog contract with the parent page (was un-exported at source line 26). */
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
	categoryId: number;
	dietaryTags?: string[];
	allergens?: string[];
	isFeatured?: boolean;
	featuredRank?: number | null;
	// round88-C: legacy single showcaseTag dropped — array only.
	showcaseTags?: string[] | null;
	// w3-f1 (F1-3): groups from GET /api/items (Decimal arrives as string
	// over JSON; the draft mapper normalizes it to a string input value).
	modifierGroups?: ItemModifierGroup[];
}

/* w3-f1 — serialized shapes returned by GET /api/items. */
export type ItemModifierOption = {
	id: number;
	nameAr: string;
	name: string;
	priceDelta: string | number;
	isAvailable: boolean;
	sortOrder: number;
};
export type ItemModifierGroup = {
	id: number;
	nameAr: string;
	name: string;
	minSelect: number;
	maxSelect: number;
	required: boolean;
	sortOrder: number;
	options: ItemModifierOption[];
};

/* w3-f1 — editor drafts (numeric fields as strings for controlled inputs). */
export type OptionDraft = {
	key: string;
	id?: number;
	nameAr: string;
	name: string;
	priceDelta: string;
	isAvailable: boolean;
	sortOrder: number;
};
export type GroupDraft = {
	key: string;
	id?: number;
	nameAr: string;
	name: string;
	minSelect: string;
	maxSelect: string;
	required: boolean;
	sortOrder: string;
	options: OptionDraft[];
};

export const MAX_MODIFIER_GROUPS = 6; // من السطر 90 — يطابق حد zod في API
export const MAX_OPTIONS_PER_GROUP = 20; // من السطر 91

/** w3-f1 — the exact JSON the items POST/PUT routes expect (zod-validated). */
export type ModifierGroupPayload = {
	id?: number;
	nameAr: string;
	name?: string;
	minSelect: number;
	maxSelect: number;
	required: boolean;
	sortOrder: number;
	options: Array<{
		id?: number;
		nameAr: string;
		name?: string;
		priceDelta: number;
		isAvailable: boolean;
		sortOrder: number;
	}>;
};

/**
 * Form state shape derived from initForm (source lines 142–157) — the five
 * useState slices of the dialog collapse into this single typed object.
 */
export type ItemFormState = {
	name: string;
	nameAr: string;
	description: string;
	descriptionAr: string;
	price: number;
	discountedPrice: string;
	status: string;
	categoryId: number;
	image: string;
	dietaryTags: string[];
	allergens: string[];
	isFeatured: boolean;
	featuredRank: string;
	showcaseTags: string[];
};

export const IMAGE_URL_RE = /^(https?:\/\/|data:image\/)/i; // من السطر 159
