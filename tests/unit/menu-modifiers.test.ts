/**
 * Modifier min/max validation + selection logic (UpMenu pattern).
 * Pure functions from src/components/menu/menu-types.ts.
 */
import { describe, it, expect } from "vitest";
import {
	toggleModifierOption,
	validateModifierGroups,
	modifierDelta,
	buildModifierSummary,
	modifierGroupHint,
	type ModifierGroupProp,
} from "@/components/menu/menu-types";

const size: ModifierGroupProp = {
	id: 1,
	name: "Size",
	nameAr: "الحجم",
	minSelect: 1,
	maxSelect: 1,
	required: true,
	options: [
		{ id: 11, name: "Small", nameAr: "صغير", priceDelta: 0, isAvailable: true },
		{ id: 12, name: "Large", nameAr: "كبير", priceDelta: 2, isAvailable: true },
	],
};

const extras: ModifierGroupProp = {
	id: 2,
	name: "Extras",
	nameAr: "إضافات",
	minSelect: 0,
	maxSelect: 2,
	required: false,
	options: [
		{ id: 21, name: "Cream", nameAr: "كريمة", priceDelta: 1.5, isAvailable: true },
		{ id: 22, name: "Syrup", nameAr: "شراب", priceDelta: 1, isAvailable: true },
		{ id: 23, name: "Ice", nameAr: "ثلج", priceDelta: 0, isAvailable: true },
		{ id: 24, name: "Gone", nameAr: "نافذ", priceDelta: 3, isAvailable: false },
	],
};

describe("toggleModifierOption", () => {
	it("replaces the choice in a single-select group (radio behaviour)", () => {
		let sel = toggleModifierOption([size], {}, 1, 11);
		expect(sel[1]).toEqual([11]);
		sel = toggleModifierOption([size], sel, 1, 12);
		expect(sel[1]).toEqual([12]);
	});

	it("rejects a third option when maxSelect=2 (returns same reference)", () => {
		let sel = toggleModifierOption([extras], {}, 2, 21);
		sel = toggleModifierOption([extras], sel, 2, 22);
		const rejected = toggleModifierOption([extras], sel, 2, 23);
		expect(rejected).toBe(sel); // same object → no state change
		expect(sel[2]).toEqual([21, 22]);
	});

	it("deselects an already-selected option", () => {
		const sel = toggleModifierOption([extras], {}, 2, 21);
		const after = toggleModifierOption([extras], sel, 2, 21);
		expect(after[2]).toEqual([]);
	});

	it("never selects an unavailable option", () => {
		const sel = toggleModifierOption([extras], {}, 2, 24);
		expect(sel[2]).toBeUndefined();
	});
});

describe("validateModifierGroups", () => {
	it("fails with an Arabic reason when a required group is under-filled", () => {
		const res = validateModifierGroups([size, extras], { 2: [21] });
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.groupId).toBe(1);
			expect(res.message).toContain("اختر على الأقل 1");
			expect(res.message).toContain("الحجم");
		}
	});

	it("passes once every required group meets its minimum", () => {
		const res = validateModifierGroups([size, extras], { 1: [12] });
		expect(res.ok).toBe(true);
	});

	it("ignores optional groups (minSelect=0)", () => {
		const res = validateModifierGroups([extras], {});
		expect(res.ok).toBe(true);
	});
});
