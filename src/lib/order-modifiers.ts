import { prisma } from '@/lib/db';

/**
 * r118-A3-P1 + r118-A7-P2 (deepest-round audit): order POST validated
 * modifier-option OWNERSHIP (option belongs to the ordered item + is
 * available) but never the GROUP CONTRACT — required/minSelect could be
 * skipped entirely and maxSelect could be exceeded by a hand-crafted
 * payload, and duplicated option ids stacked the same priceDelta N times
 * (a −1 option ×15 made line totals negative). The public menu serializers
 * (web page + mobile API) only render groups that still have at least one
 * available option — this module enforces EXACTLY that surface, so the
 * server never demands a modifier the UI never offered (e.g. a required
 * group whose options were all switched off is invisible to the customer
 * and therefore skipped here too).
 */

/** Max raw option ids accepted per order line BEFORE dedupe (DoS bound for
 *  the IN() lists — legit ceiling is 6 groups × maxSelect 10 = 60). */
export const MAX_MODIFIER_OPTIONS_PER_ITEM = 100;

export interface ModifierGroupRules {
        id: number;
        nameAr: string;
        name: string;
        minSelect: number;
        maxSelect: number;
        menuItemId: number;
        /** ids of the AVAILABLE options in this group (the offered surface). */
        optionIds: number[];
}

export interface ModifierSnapshotOption {
        id: number;
        nameAr: string;
        name: string;
        priceDelta: number;
}

export type StoredModifierOption =
        | { id: number; nameAr: string; name: string; priceDelta: number };

/**
 * Fetch the SERVICEABLE modifier groups (≥1 available option) for the given
 * item ids, grouped per item. Mirrors the public menu serializers' filter
 * (unavailable options dropped, groups left empty are omitted entirely).
 */
export async function fetchServiceableModifierGroups(
        itemIds: number[]
): Promise<Map<number, ModifierGroupRules[]>> {
        if (itemIds.length === 0) return new Map();
        const groups = await prisma.modifierGroup.findMany({
                where: {
                        menuItemId: { in: itemIds },
                        options: { some: { isAvailable: true } },
                },
                select: {
                        id: true,
                        nameAr: true,
                        name: true,
                        minSelect: true,
                        maxSelect: true,
                        menuItemId: true,
                        options: {
                                where: { isAvailable: true },
                                select: { id: true },
                        },
                },
        });
        const byItem = new Map<number, ModifierGroupRules[]>();
        for (const g of groups) {
                const list = byItem.get(g.menuItemId) ?? [];
                list.push({
                        id: g.id,
                        nameAr: g.nameAr,
                        name: g.name,
                        minSelect: g.minSelect,
                        maxSelect: g.maxSelect,
                        menuItemId: g.menuItemId,
                        optionIds: g.options.map((o) => o.id),
                });
                byItem.set(g.menuItemId, list);
        }
        return byItem;
}

/**
 * Validate one item's (deduped) selection against its serviceable groups.
 * Returns the FIRST violation as a ready-to-render Arabic message, or null.
 * Semantics mirror the client (menu-types.validateModifierGroups — minSelect
 * only; maxSelect is enforced interactively there via toggleModifierOption).
 */
export function validateItemModifierSelection(
        groups: ModifierGroupRules[],
        selectedIds: number[]
): string | null {
        const selected = new Set(selectedIds);
        for (const g of groups) {
                let count = 0;
                for (const id of g.optionIds) if (selected.has(id)) count++;
                if (g.minSelect > 0 && count < g.minSelect) {
                        const label = g.nameAr || g.name;
                        return `اختر على الأقل ${g.minSelect} من «${label}»`;
                }
                if (count > g.maxSelect) {
                        const label = g.nameAr || g.name;
                        return `الحد الأقصى ${g.maxSelect} خيارات من «${label}»`;
                }
        }
        return null;
}

/**
 * Build the persisted snapshot for OrderItem.modifiersJson: the selected
 * options with their display names + priceDeltas AT ORDER TIME (r118-A7-P3:
 * the bare-id format dangles the moment the owner edits/replaces a group —
 * items/[id] PUT full-replaces groups — leaving historical orders
 * unreconstructable). The create path stores this richer shape; readers
 * (whatsapp/generate) accept BOTH formats.
 */
export function buildModifierSnapshot(
        selectedIds: number[],
        optionsById: Map<number, StoredModifierOption>
): ModifierSnapshotOption[] {
        const out: ModifierSnapshotOption[] = [];
        for (const id of selectedIds) {
                const o = optionsById.get(id);
                if (o) out.push({ id: o.id, nameAr: o.nameAr, name: o.name, priceDelta: o.priceDelta });
        }
        return out;
}

/**
 * Parse a stored modifiersJson into renderable options. Accepts BOTH the
 * legacy format (bare id array — dangling ids after a group replacement are
 * resolved best-effort and skipped) and the r118 snapshot format
 * (array of {id,nameAr,name,priceDelta} — authoritative, no lookup needed).
 * `lookup` is only consulted for legacy rows.
 */
export async function parseStoredModifiers(
        json: string,
        lookup: (ids: number[]) => Promise<Map<number, StoredModifierOption>>
): Promise<ModifierSnapshotOption[]> {
        let raw: unknown;
        try {
                raw = JSON.parse(json || '[]');
        } catch {
                return [];
        }
        if (!Array.isArray(raw)) return [];
        const objectForm = raw.filter(
                (v): v is StoredModifierOption =>
                        typeof v === 'object' && v !== null && typeof (v as StoredModifierOption).id === 'number'
        );
        if (objectForm.length === raw.length) {
                return objectForm.map((o) => ({
                        id: o.id,
                        nameAr: typeof o.nameAr === 'string' ? o.nameAr : '',
                        name: typeof o.name === 'string' ? o.name : '',
                        priceDelta: Number(o.priceDelta ?? 0),
                }));
        }
        const legacyIds = raw.filter((v): v is number => typeof v === 'number');
        if (legacyIds.length === 0) return [];
        const found = await lookup(legacyIds);
        return legacyIds
                .map((id) => found.get(id))
                .filter((o): o is StoredModifierOption => Boolean(o))
                .map((o) => ({ id: o.id, nameAr: o.nameAr, name: o.name, priceDelta: o.priceDelta }));
}
