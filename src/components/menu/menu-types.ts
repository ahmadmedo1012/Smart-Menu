/**
 * Shared menu-domain types + PURE modifier-selection logic.
 *
 * Kept free of React/DOM so vitest can exercise the validation rules
 * (UpMenu-style min/max enforcement) without rendering anything.
 */

export type ModifierOptionProp = {
	id: number;
	name: string;
	nameAr: string | null;
	/** Price added to the item's unit price when selected (serialized number). */
	priceDelta: number;
	isAvailable: boolean;
};

export type ModifierGroupProp = {
	id: number;
	name: string;
	nameAr: string | null;
	minSelect: number;
	maxSelect: number;
	required: boolean;
	options: ModifierOptionProp[];
};

/** Selection state: groupId -> list of selected optionIds (insertion order). */
export type ModifierSelection = Record<number, number[]>;

export type ModifierValidation =
	| { ok: true }
	| { ok: false; groupId: number | null; message: string };

function groupDisplayName(g: ModifierGroupProp): string {
	return g.nameAr || g.name;
}

/**
 * Toggle an option inside a group honouring maxSelect:
 * - selecting an already-selected option always removes it;
 * - at capacity with maxSelect === 1 → replace (radio behaviour);
 * - at capacity with maxSelect > 1 → reject (return the SAME state object,
 *   immutable — callers can detect rejection by reference equality).
 */
export function toggleModifierOption(
	groups: ModifierGroupProp[],
	selection: ModifierSelection,
	groupId: number,
	optionId: number
): ModifierSelection {
	const group = groups.find((g) => g.id === groupId);
	if (!group) return selection;
	const option = group.options.find((o) => o.id === optionId);
	if (!option || !option.isAvailable) return selection;

	const current = selection[group.id] ?? [];
	if (current.includes(optionId)) {
		return { ...selection, [group.id]: current.filter((id) => id !== optionId) };
	}
	if (current.length >= group.maxSelect) {
		if (group.maxSelect === 1) {
			return { ...selection, [group.id]: [optionId] };
		}
		return selection;
	}
	return { ...selection, [group.id]: [...current, optionId] };
}

/**
 * UpMenu-style validation: every group whose minSelect > 0 must have at
 * least minSelect options chosen. Returns the FIRST unmet group with a
 * ready-to-render Arabic reason string.
 */
export function validateModifierGroups(
	groups: ModifierGroupProp[],
	selection: ModifierSelection
): ModifierValidation {
	for (const g of groups) {
		if (g.minSelect <= 0) continue;
		const count = selection[g.id]?.length ?? 0;
		if (count < g.minSelect) {
			return {
				ok: false,
				groupId: g.id,
				message: `اختر على الأقل ${g.minSelect} من ${groupDisplayName(g)}`,
			};
		}
	}
	return { ok: true };
}

/** Sum of priceDeltas for the current selection (per one unit of the item). */
export function modifierDelta(
	groups: ModifierGroupProp[],
	selection: ModifierSelection
): number {
	let delta = 0;
	for (const g of groups) {
		for (const optionId of selection[g.id] ?? []) {
			const opt = g.options.find((o) => o.id === optionId);
			if (opt) delta += opt.priceDelta;
		}
	}
	return delta;
}

/**
 * Human-readable priced-modifier lines for the WhatsApp receipt
 * (GloriaFood pattern): "اسم الإضافة (+2 د.ل)، أخرى".
 * Zero-delta options render without a price suffix.
 */
export function buildModifierSummary(
	groups: ModifierGroupProp[],
	selection: ModifierSelection
): string {
	const parts: string[] = [];
	for (const g of groups) {
		for (const optionId of selection[g.id] ?? []) {
			const opt = g.options.find((o) => o.id === optionId);
			if (!opt) continue;
			const name = opt.nameAr || opt.name;
			if (opt.priceDelta === 0) {
				parts.push(name);
			} else if (opt.priceDelta > 0) {
				parts.push(`${name} (+${opt.priceDelta.toFixed(1)} د.ل)`);
			} else {
				parts.push(`${name} (${opt.priceDelta.toFixed(1)} د.ل)`);
			}
		}
	}
	return parts.join("، ");
}

/** Header hint per UpMenu: «اختر على الأقل M» / «اختر حتى N» / اختياري. */
export function modifierGroupHint(g: ModifierGroupProp): string {
	const parts: string[] = [];
	if (g.minSelect > 0) parts.push(`اختر على الأقل ${g.minSelect}`);
	if (g.maxSelect > 1) parts.push(`اختر حتى ${g.maxSelect}`);
	if (parts.length === 0) parts.push("اختياري");
	return parts.join(" · ");
}
