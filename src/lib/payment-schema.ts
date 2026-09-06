/**
 * Subscription payment creation schema (round88-A2 — moved out of
 * src/app/api/subscriptions/route.ts).
 *
 * Why a lib module and not a route export: Next.js builds a typed route
 * manifest from every export of an api route file. A non-handler export
 * (this Zod schema) is legal under Turbopack but breaks the Webpack
 * route-type generation outright ("createPaymentSchema is not a valid Route
 * export field") — and even where it compiles, importing a route module for
 * its schema pulls the whole route (auth/db/telegram deps) into the importer
 * (e.g. the unit test) instead of a ~40-line pure module. The schema itself
 * is byte-identical to the one that lived in the route since round8x.
 */
import { z } from 'zod';
import { usernameOptional } from '@/lib/validation';

/** Normalize Arabic-Indic digits (٠-٩) to Western (0-9) before validation. */
export function normalizeDigits(s: string): string {
	return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export const createPaymentSchema = z
	.object({
		phone: z
			.string()
			.regex(/^09\d{8}$/, 'رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 09')
			.optional()
			.transform((v) => (v ? normalizeDigits(v) : v)),
		amount: z.number().positive(),
		provider: z.enum(['libyana', 'madar', 'bank']),
		planId: z.number().int().positive(),
		tempUsername: usernameOptional,
		tempRestaurants: z
			.array(
				z.object({
					name: z.string().min(1),
					slug: z.string().min(3),
				})
			)
			.optional(),
		// Bank transfer fields — only valid when provider === "bank"
		senderAccountName: z.string().min(1).max(100).optional(),
		senderAccountNumber: z.string().min(1).max(50).optional(),
		receiptImageUrl: z
			.string()
			.url()
			.refine((u) => u.startsWith('https://'), { message: 'رابط الإيصال يجب أن يكون https' })
			.optional(),
	})
	.refine((d) => d.provider !== 'bank' || (d.senderAccountName && d.senderAccountNumber), {
		message: 'اسم صاحب الحساب ورقم الحساب إجباريان للتحويل البنكي',
		path: ['senderAccountName'],
	});

// The 99 LYD cap is a libyana/madar network constraint — bank transfers have no cap.
