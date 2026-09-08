'use client';
/*
 * item-dialog/use-item-form.ts — round94 W2-b (inspection-c §2.5):
 * the form slice lifted from ItemDialog.tsx — initForm (142–157), form state
 * (177), badgeDraft (180), addBadge (184–193 verbatim) plus three handlers
 * extracted from the JSX chip bodies (884–898 / 911–935 / 943–967).
 *
 * `patch` is the ONLY sanctioned behavior change of the split (inspection-c
 * خطر 4-أ): setForm({ ...form, ...p }) became a FUNCTIONAL update
 * setForm(prev => ...) so the async image-upload callback (use-image-upload)
 * can no longer clobber fields the owner typed DURING the upload (stale
 * closure race at old line 569). Every synchronous write path is unaffected.
 */

import { useState } from 'react';
import type { Item, ItemFormState } from './types';

const initForm = (catId: number): ItemFormState => ({
	name: '',
	nameAr: '',
	description: '',
	descriptionAr: '',
	price: 0,
	discountedPrice: '',
	status: 'available',
	categoryId: catId,
	image: '',
	dietaryTags: [] as string[],
	allergens: [] as string[],
	isFeatured: false,
	featuredRank: '',
	showcaseTags: [] as string[],
});

export function useItemForm(): {
	form: ItemFormState;
	/** setForm({ ...form, ...p }) — but functional (stale-closure fix, old line 569). */
	patch: (p: Partial<ItemFormState>) => void;
	badgeDraft: string;
	setBadgeDraft: (v: string) => void;
	/** Round83 §2.3 — add a badge chip (deduped, trimmed, max 3). Verbatim from 184–193. */
	addBadge: () => void;
	/** chip onClick body moved from JSX 884–898. */
	removeBadge: (tag: string) => void;
	/** dietary chip onClick body moved from JSX 911–935. */
	toggleDietaryTag: (t: string) => void;
	/** allergen chip onClick body moved from JSX 943–967. */
	toggleAllergen: (t: string) => void;
	/** from the reset effect (337–356): setForm(editing ? {...14 fields} : initForm(categoryId)). */
	reset: (editing: Item | null, categoryId: number) => void;
} {
	const [form, setForm] = useState<ItemFormState>(initForm(0));
	const [badgeDraft, setBadgeDraft] = useState('');

	const patch = (p: Partial<ItemFormState>) => {
		setForm((prev) => ({ ...prev, ...p }));
	};

	// Round83 §2.3 — add a badge chip (deduped, trimmed, max 3).
	const addBadge = () => {
		const tag = badgeDraft.trim().slice(0, 40);
		if (!tag || form.showcaseTags.length >= 3 || form.showcaseTags.includes(tag)) {
			setBadgeDraft('');
			return;
		}
		setForm({ ...form, showcaseTags: [...form.showcaseTags, tag] });
		setBadgeDraft('');
	};

	const removeBadge = (tag: string) => {
		setForm((prev) => ({ ...prev, showcaseTags: prev.showcaseTags.filter((t) => t !== tag) }));
	};

	const toggleDietaryTag = (t: string) => {
		setForm((prev) => ({
			...prev,
			dietaryTags: prev.dietaryTags?.includes(t)
				? (prev.dietaryTags ?? []).filter((x) => x !== t)
				: [...(prev.dietaryTags ?? []), t],
		}));
	};

	const toggleAllergen = (t: string) => {
		setForm((prev) => ({
			...prev,
			allergens: prev.allergens?.includes(t)
				? (prev.allergens ?? []).filter((x) => x !== t)
				: [...(prev.allergens ?? []), t],
		}));
	};

	const reset = (editing: Item | null, categoryId: number) => {
		setForm(
			editing
				? {
						name: editing.name,
						nameAr: editing.nameAr || '',
						description: editing.description,
						descriptionAr: editing.descriptionAr || '',
						price: editing.price,
						discountedPrice: editing.discountedPrice ? String(editing.discountedPrice) : '',
						status: editing.status,
						categoryId: editing.categoryId,
						image: editing.image,
						dietaryTags: editing.dietaryTags ?? [],
						allergens: editing.allergens ?? [],
						isFeatured: editing.isFeatured ?? false,
						featuredRank: editing.featuredRank != null ? String(editing.featuredRank) : '',
						showcaseTags: editing.showcaseTags ?? [],
					}
				: initForm(categoryId)
		);
	};

	return {
		form,
		patch,
		badgeDraft,
		setBadgeDraft,
		addBadge,
		removeBadge,
		toggleDietaryTag,
		toggleAllergen,
		reset,
	};
}
