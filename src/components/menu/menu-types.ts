/**
 * Shared menu-domain types + PURE modifier-selection logic.
 *
 * Kept free of React/DOM so vitest can exercise the validation rules
 * (UpMenu-style min/max enforcement) without rendering anything.
 */

import { formatPrice } from '@/lib/format';

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
                        /* r121 (H-1): decimals:1 كان يخبز «(+2.0 د.ل)» في ملخص الإضافات
                           (سلة الطلب + فاتورة واتساب العميل) — الافتراضي الذكي (r120):
                           «12 → 12» و«7.25 → 7.25». */
                        if (opt.priceDelta === 0) {
                                parts.push(name);
                        } else if (opt.priceDelta > 0) {
                                parts.push(`${name} (+${formatPrice(opt.priceDelta)})`);
                        } else {
                                parts.push(`${name} (${formatPrice(opt.priceDelta)})`);
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

/* ────────────────────────────────────────────────────────────────────────────
 * w3-f1 additions — pure helpers for the customer UI (F1-4..F1-6). Same
 * module rule: no React/DOM, fully unit-testable.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Groups that can actually be interacted with: at least one AVAILABLE option.
 * The server serializer already filters unavailable options and drops empty
 * groups — this is the client-side belt-and-braces (a stale/persisted cart
 * item, or a future data source, still renders safely).
 */
export function visibleModifierGroups(groups: ModifierGroupProp[] | null | undefined): ModifierGroupProp[] {
        return (groups ?? []).filter((g) => g.options.some((o) => o.isAvailable));
}

/**
 * Gentle maxSelect enforcement for the RENDERED state: a multi-select group at
 * capacity disables buttons for NOT-yet-selected options (the pure toggle
 * above would reject them anyway — this just makes the affordance visible).
 * Single-select groups never disable: tapping another option replaces (radio).
 */
export function isOptionDisabled(
        g: ModifierGroupProp,
        selection: ModifierSelection,
        optionId: number
): boolean {
        if (g.maxSelect <= 1) return false;
        const current = selection[g.id] ?? [];
        if (current.length < g.maxSelect) return false;
        return !current.includes(optionId);
}

/**
 * Client-side unit-price ESTIMATE mirroring the server math exactly
 * (orders/route.ts: eff = discountedPrice ?? price; + Σ priceDelta).
 * ⚠ Display only — the server re-prices from its own DB rows on POST; this
 * number is never trusted for validation or persistence (F1-5).
 * Modifiers stack ON TOP of the discounted price (server behaviour, documented).
 */
export function unitPriceWithModifiers(
        price: number,
        discountedPrice: number | null | undefined,
        delta: number
): number {
        const base = discountedPrice != null ? discountedPrice : price;
        return base + delta;
}

/** Number of selected options in a group (drives the «المحدد 1/2» counter). */
export function selectedCount(selection: ModifierSelection, groupId: number): number {
        return selection[groupId]?.length ?? 0;
}

/**
 * The cart/order payload fragment for one configured item line — EXACTLY the
 * shape POST /api/orders reads (zod: number[] of positive ints) plus the
 * human summary persisted with the cart line for display/receipt.
 * Ids flatten in selection order (stable, human-predictable).
 */
export function buildModifierPayload(
        groups: ModifierGroupProp[],
        selection: ModifierSelection
): { modifierOptionIds: number[]; modifiersSummary: string } {
        const modifierOptionIds: number[] = [];
        for (const g of groups) {
                for (const optionId of selection[g.id] ?? []) {
                        modifierOptionIds.push(optionId);
                }
        }
        return {
                modifierOptionIds,
                modifiersSummary: buildModifierSummary(groups, selection),
        };
}
