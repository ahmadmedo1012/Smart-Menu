import { z } from 'zod';

/* w3-f1 (F1-3) — shared modifier-group write schema (create + update).
 * Caps mirror the payload-hygiene rule (A-2): bounded arrays, bounded strings,
 * bounded counts. `id` is accepted-but-ignored (replace strategy — see the
 * items PUT) so the client can echo back what it loaded.
 *
 * round97-X3: extracted verbatim from the two byte-identical copies in
 * api/items/route.ts and api/items/[id]/route.ts (~48 lines ×2 — audit
 * high finding). Schema semantics are EXACTLY identical: same constraints,
 * same Arabic messages, same defaults in modifierGroupCreateInput.
 */
/* (r138): داخلي — تستهلكه modifierGroupSchema في نفس الملف. */
const modifierOptionSchema = z.object({
        id: z.number().int().positive().optional(),
        nameAr: z.string().min(1, 'اسم الخيار مطلوب').max(60),
        name: z.string().max(60).optional(),
        priceDelta: z.number().optional(),
        isAvailable: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
});

export const modifierGroupSchema = z
        .object({
                id: z.number().int().positive().optional(),
                nameAr: z.string().min(1, 'اسم المجموعة مطلوب').max(60),
                name: z.string().max(60).optional(),
                minSelect: z.number().int().min(0, 'الحد الأدنى لا يمكن أن يكون سالبًا').max(10).optional(),
                maxSelect: z.number().int().min(1, 'الحد الأقصى يجب أن يكون 1 على الأقل').max(10).optional(),
                required: z.boolean().optional(),
                sortOrder: z.number().int().optional(),
                options: z.array(modifierOptionSchema).max(20, 'الحد الأقصى 20 خيارًا لكل مجموعة'),
        })
        .refine((v) => (v.minSelect ?? 0) <= (v.maxSelect ?? 1), {
                message: 'الحد الأدنى للاختيار لا يمكن أن يتجاوز الحد الأقصى',
        });

/**
 * Maps a validated group to the Prisma nested-create input.
 *
 * r109-F9 (required ⇄ minSelect invariant): the PUBLIC dialog enforces
 * minSelect>0 ONLY (menu-types.validateModifierGroups) — a group saved with
 * required:true but minSelect:0 rendered «اختياري» and let orders through
 * without the modifier (live-proven r108, ORD-MU31MBIC-B14E7AA1). Both write
 * paths (items POST/PUT) funnel through this mapping, so the invariant is
 * enforced server-side for every client, and the UI mirrors it live
 * (use-modifier-groups.updateGroup syncs the two controls in both directions).
 */
export function modifierGroupCreateInput(
        g: z.infer<typeof modifierGroupSchema>
) {
        const rawMin = g.minSelect ?? 0;
        const explicitRequired = g.required ?? false;
        const minSelect = explicitRequired && rawMin < 1 ? 1 : rawMin;
        const required = explicitRequired || minSelect > 0;
        return {
                nameAr: g.nameAr,
                name: g.name ?? '',
                minSelect,
                maxSelect: g.maxSelect ?? 1,
                required,
                sortOrder: g.sortOrder ?? 0,
                options: {
                        create: (g.options ?? []).map((o) => ({
                                nameAr: o.nameAr,
                                name: o.name ?? '',
                                priceDelta: o.priceDelta ?? 0,
                                isAvailable: o.isAvailable ?? true,
                                sortOrder: o.sortOrder ?? 0,
                        })),
                },
        };
}
