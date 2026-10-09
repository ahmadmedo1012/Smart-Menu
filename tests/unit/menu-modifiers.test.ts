/**
 * Modifier min/max validation + selection logic (UpMenu pattern).
 * Pure functions from src/components/menu/menu-types.ts.
 * w3-f1 (F1-7): extended with the cumulative price, payload-shape and
 * edge-case coverage for the customer UI helpers added this round.
 */
import { describe, it, expect } from "vitest";
import {
        toggleModifierOption,
        validateModifierGroups,
        modifierDelta,
        buildModifierSummary,
        modifierGroupHint,
        visibleModifierGroups,
        isOptionDisabled,
        unitPriceWithModifiers,
        selectedCount,
        buildModifierPayload,
        defaultModifierSelection,
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

/* ─────────────────────────────────────────────────────────────────────────────
 * w3-f1 (F1-7) — cumulative pricing, payload shape, UI-state derivations and
 * the F1-6 edge cases (empty group, unavailable options, maxSelect ceiling,
 * discounted price stacking).
 * ───────────────────────────────────────────────────────────────────────────── */

describe("modifierDelta (cumulative price)", () => {
        it("sums deltas across every selected option in every group", () => {
                const delta = modifierDelta([size, extras], { 1: [12], 2: [21, 23] });
                // كبير (+2) + كريمة (+1.5) + ثلج (0) = 3.5
                expect(delta).toBe(3.5);
        });

        it("is 0 with an empty selection", () => {
                expect(modifierDelta([size, extras], {})).toBe(0);
        });

        it("counts negative deltas (price reductions)", () => {
                const cheese: ModifierGroupProp = {
                        id: 3,
                        name: "Cheese",
                        nameAr: "الجبن",
                        minSelect: 0,
                        maxSelect: 1,
                        required: false,
                        options: [{ id: 31, name: "No cheese", nameAr: "بدون جبن", priceDelta: -1, isAvailable: true }],
                };
                expect(modifierDelta([cheese], { 3: [31] })).toBe(-1);
        });
});

describe("unitPriceWithModifiers (server-math mirror)", () => {
        it("stacks modifiers ON TOP of the discounted price (server behaviour)", () => {
                // orders/route.ts: eff = discountedPrice ?? price; + modTotal
                expect(unitPriceWithModifiers(25, 20, 2)).toBe(22);
        });

        it("falls back to the base price when no discount exists", () => {
                expect(unitPriceWithModifiers(25, null, 2)).toBe(27);
        });

        it("treats undefined discount as no discount", () => {
                expect(unitPriceWithModifiers(25, undefined, 0)).toBe(25);
        });
});

describe("visibleModifierGroups (F1-6 edge: no bookable options)", () => {
        const ghost: ModifierGroupProp = {
                id: 9,
                name: "Gone",
                nameAr: "مجموعة معطلة",
                minSelect: 1,
                maxSelect: 1,
                required: true,
                options: [{ id: 91, name: "X", nameAr: "س", priceDelta: 1, isAvailable: false }],
        };

        it("drops a group whose every option is unavailable", () => {
                expect(visibleModifierGroups([size, ghost])).toEqual([size]);
        });

        it("keeps a group with at least one available option", () => {
                expect(visibleModifierGroups([size])).toHaveLength(1);
        });

        it("tolerates null/undefined input (plain items)", () => {
                expect(visibleModifierGroups(undefined)).toEqual([]);
                expect(visibleModifierGroups(null)).toEqual([]);
        });

        it("a dropped required group no longer blocks validation", () => {
                // the serializer drops it client-side too — the belt-and-braces check
                expect(validateModifierGroups(visibleModifierGroups([ghost]), {})).toEqual({ ok: true });
        });
});

describe("isOptionDisabled (gentle maxSelect ceiling)", () => {
        it("disables not-selected options when a multi-select group is at capacity", () => {
                const sel = toggleModifierOption([extras], {}, 2, 21);
                const atCap = toggleModifierOption([extras], sel, 2, 22);
                expect(isOptionDisabled(extras, atCap, 23)).toBe(true);
                // already-selected options stay enabled (deselect path)
                expect(isOptionDisabled(extras, atCap, 21)).toBe(false);
        });

        it("never disables in a single-select group (radio replace)", () => {
                const sel = toggleModifierOption([size], {}, 1, 11);
                expect(isOptionDisabled(size, sel, 12)).toBe(false);
        });

        it("disables nothing below capacity", () => {
                expect(isOptionDisabled(extras, {}, 21)).toBe(false);
        });
});

describe("selectedCount + modifierGroupHint (counter + labels)", () => {
        it("counts selections per group", () => {
                expect(selectedCount({ 2: [21, 22] }, 2)).toBe(2);
                expect(selectedCount({}, 2)).toBe(0);
        });

        it("renders required + cap hints, or «اختياري»", () => {
                expect(modifierGroupHint(size)).toBe("اختر على الأقل 1");
                expect(modifierGroupHint(extras)).toBe("اختر حتى 2");
                const optional: ModifierGroupProp = { ...size, minSelect: 0, maxSelect: 1 };
                expect(modifierGroupHint(optional)).toBe("اختياري");
        });
});

describe("buildModifierSummary (receipt line)", () => {
        it("formats positive deltas with +, negatives bare, zeros without a price", () => {
                const out = buildModifierSummary([size, extras], { 1: [12], 2: [21, 23] });
                // r121 (H-1): smart-default display — «+2.0» → «+2» (integer prices
                // lose the bare .0; real fractions like 1.5 are kept verbatim).
                expect(out).toBe("كبير (+2 د.ل)، كريمة (+1.5 د.ل)، ثلج");
        });

        it("returns an empty string for an empty selection", () => {
                expect(buildModifierSummary([size], {})).toBe("");
        });
});

describe("buildModifierPayload (POST /api/orders item shape)", () => {
        it("flattens ids in selection order and pairs them with the human summary", () => {
                const p = buildModifierPayload([size, extras], { 1: [12], 2: [23, 21] });
                expect(p.modifierOptionIds).toEqual([12, 23, 21]);
                expect(p.modifiersSummary).toBe("كبير (+2 د.ل)، ثلج، كريمة (+1.5 د.ل)");
        });

        it("is an empty ids array for a plain item (zod-optional field stays unset)", () => {
                const p = buildModifierPayload([size], {});
                expect(p.modifierOptionIds).toEqual([]);
                expect(p.modifiersSummary).toBe("");
        });
});

describe("F1-6 edge cases combined (required blocks, radio replace, cap reject)", () => {
        it("an under-filled required group blocks with a group-scoped Arabic reason", () => {
                const res = validateModifierGroups([size, extras], { 2: [21] });
                expect(res).toMatchObject({ ok: false, groupId: 1 });
        });

        it("selecting a second option in a radio group REPLACES the first", () => {
                let sel = toggleModifierOption([size], {}, 1, 11);
                sel = toggleModifierOption([size], sel, 1, 12);
                expect(sel[1]).toEqual([12]);
                expect(validateModifierGroups([size], sel)).toEqual({ ok: true });
        });

        it("a cap-rejected toggle returns the SAME reference (no state change)", () => {
                let sel = toggleModifierOption([extras], {}, 2, 21);
                sel = toggleModifierOption([extras], sel, 2, 22);
                expect(toggleModifierOption([extras], sel, 2, 23)).toBe(sel);
        });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * r135-B — defaultModifierSelection (نمط Starbucks): القيم الافتراضية الذكية
 * عند فتح نافذة الصنف. القاعدة: كل مجموعة minSelect>0 تُملأ بأرخص الخيارات
 * المتاحة؛ الاختيارية تبقى فارغة؛ غير المتاح يُتخطى.
 * ───────────────────────────────────────────────────────────────────────────── */

describe("defaultModifierSelection (r135-B smart defaults)", () => {
        it("required radio group (minSelect=1, maxSelect=1) → exactly the CHEAPEST option", () => {
                // الحجم: صغير (0) أرخص من كبير (+2) → يُختار صغير فقط
                const sel = defaultModifierSelection([size]);
                expect(sel).toEqual({ 1: [11] });
        });

        it("required multi group (minSelect=2) → the TWO cheapest available options", () => {
                const group: ModifierGroupProp = {
                        id: 5,
                        name: "Toppings",
                        nameAr: "إضافات البيتزا",
                        minSelect: 2,
                        maxSelect: 4,
                        required: true,
                        options: [
                                { id: 51, name: "Cheese", nameAr: "جبن", priceDelta: 3, isAvailable: true },
                                { id: 52, name: "Mushroom", nameAr: "مشروم", priceDelta: 1, isAvailable: true },
                                { id: 53, name: "Olive", nameAr: "زيتون", priceDelta: 2, isAvailable: true },
                        ],
                };
                // مشروم (1) ثم زيتون (2) — الجبن (3) يُستبعد
                const sel = defaultModifierSelection([group]);
                expect(sel).toEqual({ 5: [52, 53] });
                // الافتراضي يرضي التحقق فورًا (نقرة واحدة تكفي للإضافة)
                expect(validateModifierGroups([group], sel)).toEqual({ ok: true });
        });

        it("optional groups (minSelect=0) get NO default — stay empty", () => {
                const sel = defaultModifierSelection([extras]);
                expect(sel).toEqual({});
        });

        it("skips unavailable options even when they are the cheapest", () => {
                const group: ModifierGroupProp = {
                        id: 6,
                        name: "Milk",
                        nameAr: "الحليب",
                        minSelect: 1,
                        maxSelect: 1,
                        required: true,
                        options: [
                                // أرخص خيار لكنه نافذ — لا يجوز بناء الافتراضي عليه
                                { id: 61, name: "Oat", nameAr: "شوفان", priceDelta: 0, isAvailable: false },
                                { id: 62, name: "Almond", nameAr: "لوز", priceDelta: 1.5, isAvailable: true },
                                { id: 63, name: "Regular", nameAr: "عادي", priceDelta: 0.5, isAvailable: true },
                        ],
                };
                const sel = defaultModifierSelection([group]);
                expect(sel).toEqual({ 6: [63] });
        });

        it("zero required groups → empty selection", () => {
                const optionalOnly: ModifierGroupProp[] = [
                        { ...extras },
                        { ...size, minSelect: 0, required: false },
                ];
                expect(defaultModifierSelection(optionalOnly)).toEqual({});
                expect(defaultModifierSelection([])).toEqual({});
        });

        it("mixed: required groups pre-filled with cheapest, optional untouched", () => {
                const sel = defaultModifierSelection([size, extras]);
                expect(sel).toEqual({ 1: [11] });
                // extras (minSelect=0) لا مفتاح لها إطلاقًا — لا إضافة مدفوعة بلا طلب
                expect(sel[2]).toBeUndefined();
                // المجموعة كاملة تمرّ من التحقق بلا تدخل العميل
                expect(validateModifierGroups([size, extras], sel)).toEqual({ ok: true });
        });

        it("ties in price keep the original option order (stable sort)", () => {
                const group: ModifierGroupProp = {
                        id: 7,
                        name: "Sides",
                        nameAr: "مقبلات",
                        minSelect: 2,
                        maxSelect: 2,
                        required: true,
                        options: [
                                { id: 71, name: "Fries", nameAr: "بطاطس", priceDelta: 1, isAvailable: true },
                                { id: 72, name: "Coleslaw", nameAr: "سلطة كولسلو", priceDelta: 1, isAvailable: true },
                                { id: 73, name: "Rice", nameAr: "أرز", priceDelta: 1, isAvailable: true },
                        ],
                };
                const sel = defaultModifierSelection([group]);
                // أول خيارين بترتيب القائمة الأصلي عند تساوي السعر
                expect(sel).toEqual({ 7: [71, 72] });
        });

        it("a required group with fewer available options than minSelect takes what exists", () => {
                const group: ModifierGroupProp = {
                        id: 8,
                        name: "Sauces",
                        nameAr: "الصوصات",
                        minSelect: 2,
                        maxSelect: 3,
                        required: true,
                        options: [
                                { id: 81, name: "Garlic", nameAr: "ثومية", priceDelta: 0, isAvailable: true },
                                { id: 82, name: "BBQ", nameAr: "باربكيو", priceDelta: 1, isAvailable: false },
                                { id: 83, name: "Spicy", nameAr: "حار", priceDelta: 2, isAvailable: false },
                        ],
                };
                const sel = defaultModifierSelection([group]);
                expect(sel).toEqual({ 8: [81] });
                // النقص يبقى مرئيًا للتحقق — العميل يرى سبب المنع بوضوح
                expect(validateModifierGroups([group], sel).ok).toBe(false);
        });
});
