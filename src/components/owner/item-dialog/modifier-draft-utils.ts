/*
 * item-dialog/modifier-draft-utils.ts — round94 W2-b (inspection-c §2.4):
 * pure helpers moved VERBATIM from ItemDialog.tsx (no React, no state).
 *   - nextDraftKey (112–116) and groupsFromItem (118–138) verbatim.
 *   - buildModifierGroupsPayload (275–330) with the single sanctioned
 *     signature change: the closure over component `groups` state became an
 *     explicit `groups: GroupDraft[]` parameter (inspection-c step 3).
 */

import { premiumToast } from '@/lib/premium-toast';
import { toArabicNumber } from '@/lib/format';
import type { GroupDraft, ItemModifierGroup, ModifierGroupPayload } from './types';

/* draftSeq stays at MODULE level (inspection-c §2.6): keys stay unique across
 * every dialog instance exactly as before — moving it into the hook would make
 * it per-instance (still unique but a needless deviation). */
let draftSeq = 0;
export function nextDraftKey(prefix: string): string {
	draftSeq += 1;
	return `${prefix}-${Date.now().toString(36)}-${draftSeq}`;
}

export function groupsFromItem(groups: ItemModifierGroup[] | undefined): GroupDraft[] {
	return (groups ?? []).map((g) => ({
		key: nextDraftKey('g'),
		id: g.id,
		nameAr: g.nameAr,
		name: g.name,
		minSelect: String(g.minSelect),
		maxSelect: String(g.maxSelect),
		required: g.required,
		sortOrder: String(g.sortOrder),
		options: (g.options ?? []).map((o) => ({
			key: nextDraftKey('o'),
			id: o.id,
			nameAr: o.nameAr,
			name: o.name,
			priceDelta: String(o.priceDelta ?? 0),
			isAvailable: o.isAvailable,
			sortOrder: o.sortOrder,
		})),
	}));
}

/** Validates drafts and maps them to the API payload (null + toast on any bad draft). */
export function buildModifierGroupsPayload(groups: GroupDraft[]): ModifierGroupPayload[] | null {
	const out: ModifierGroupPayload[] = [];
	for (const [gi, g] of groups.entries()) {
		const nameAr = g.nameAr.trim();
		if (!nameAr) {
			premiumToast('error', `اسم المجموعة رقم ${toArabicNumber(gi + 1)} مطلوب`);
			return null;
		}
		const minSelect = g.minSelect.trim() === '' ? 0 : Number(g.minSelect);
		const maxSelect = g.maxSelect.trim() === '' ? 1 : Number(g.maxSelect);
		if (
			!Number.isInteger(minSelect) ||
			!Number.isInteger(maxSelect) ||
			minSelect < 0 ||
			maxSelect < 1 ||
			minSelect > 10 ||
			maxSelect > 10
		) {
			premiumToast('error', `حدود الاختيار في «${nameAr}» يجب أن تكون أرقامًا صحيحة (0–10)`);
			return null;
		}
		if (minSelect > maxSelect) {
			premiumToast('error', `الحد الأدنى في «${nameAr}» لا يمكن أن يتجاوز الحد الأقصى`);
			return null;
		}
		const options: ModifierGroupPayload['options'] = [];
		for (const [oi, o] of g.options.entries()) {
			const oName = o.nameAr.trim();
			if (!oName) {
				premiumToast('error', `اسم الخيار رقم ${toArabicNumber(oi + 1)} في «${nameAr}» مطلوب`);
				return null;
			}
			const delta = o.priceDelta.trim() === '' ? 0 : Number(o.priceDelta);
			if (!Number.isFinite(delta)) {
				premiumToast('error', `سعر الخيار «${oName}» غير صالح`);
				return null;
			}
			options.push({
				id: o.id,
				nameAr: oName,
				name: o.name.trim() || undefined,
				priceDelta: delta,
				isAvailable: o.isAvailable,
				sortOrder: Number.isFinite(Number(o.sortOrder)) ? o.sortOrder : oi,
			});
		}
		out.push({
			id: g.id,
			nameAr,
			name: g.name.trim() || undefined,
			minSelect,
			maxSelect,
			required: g.required,
			sortOrder: Number.isFinite(Number(g.sortOrder)) ? Number(g.sortOrder) : gi,
			options,
		});
	}
	return out;
}
