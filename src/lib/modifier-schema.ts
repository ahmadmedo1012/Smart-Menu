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
export const modifierOptionSchema = z.object({
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

/** Maps a validated group to the Prisma nested-create input. */
export function modifierGroupCreateInput(
	g: z.infer<typeof modifierGroupSchema>
) {
	return {
		nameAr: g.nameAr,
		name: g.name ?? '',
		minSelect: g.minSelect ?? 0,
		maxSelect: g.maxSelect ?? 1,
		required: g.required ?? false,
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
