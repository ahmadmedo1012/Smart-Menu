import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { notifyEvent } from '@/lib/telegram';
import { z } from 'zod';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';

const registrationLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

function getClientIp(request: NextRequest): string {
	return (
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip') ||
		'127.0.0.1'
	);
}

const restaurantInputSchema = z.object({
	name: z.string().min(1),
	slug: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/),
	description: z.string().optional(),
	phone: z.string().optional(),
	whatsapp: z.string().optional(),
});

const createSchema = z.object({
	// Support MULTIPLE menus: either legacy single-fields OR array form
	name: z.string().min(1).optional(),
	slug: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/)
		.optional(),
	description: z.string().optional(),
	phone: z.string().optional(),
	whatsapp: z.string().optional(),
	restaurants: z.array(restaurantInputSchema).optional(),
	email: z.string().optional(),
	address: z.string().optional(),
	workingHours: z.string().optional(),
	planId: z.number().int().optional(),
	username: z.string().min(3).optional(),
	password: z.string().min(PASSWORD_MIN_LENGTH).optional(),
	city: z.string().optional(),
	showOnLanding: z.boolean().optional(),
	featuredRank: z.number().int().optional(),
}).refine((d) => d.restaurants?.length || (d.name && d.slug), {
	message: 'يجب توفير بيانات منيو واحد على الأقل',
});

export async function GET(request: NextRequest) {
	try {
		// Admin-only: exposes plans, PII (phone/whatsapp/email), counts for every
		// restaurant. The public directory uses /api/public/featured instead.
		const auth = await requireAdmin();
		if (!auth.authorized) return error('غير مصرح', 401);

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, Number(searchParams.get('page')) || 1);
		const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 10));
		const search = searchParams.get('search')?.trim();
		const planFilter = searchParams.get('planFilter');

		const where: Record<string, unknown> = {};
		if (search) {
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ slug: { contains: search, mode: 'insensitive' } },
				{ phone: { contains: search } },
			];
		}
		if (planFilter === 'free') {
			where.planId = null;
		} else if (planFilter && planFilter !== 'all') {
			where.planId = Number(planFilter);
		}

		const [data, total] = await Promise.all([
			prisma.restaurant.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				include: {
					_count: { select: { orders: true, categories: true } },
					plan: { select: { id: true, name: true, nameAr: true, price: true } },
				},
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			prisma.restaurant.count({ where }),
		]);
		return success({ restaurants: data, total });
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(request: NextRequest) {
	try {
		const ip = getClientIp(request);
		const { success: allowed } = await registrationLimiter.check(`register:${ip}`);
		if (!allowed) return error('طلبات كثيرة جدًا، حاول بعد 60 ثانية', 429);

		const body = createSchema.parse(await request.json());
		// Allow public registration when username/password provided (new account)
		let actorId: number | undefined;
		if (!body.username || !body.password) {
			const auth = await requireAdmin();
			if (!auth.authorized) return error('غير مصرح', 401);
			actorId = auth.userId!;
		}

		// Check username uniqueness before transaction
		if (body.username && body.password) {
			const existingUser = await prisma.user.findUnique({ where: { username: body.username } });
			if (existingUser) return error('اسم المستخدم مستخدم بالفعل', 409);
		}

		const result = await prisma.$transaction(async (tx) => {
			// Normalize: array form (new) or legacy single-fields form
			const menus = body.restaurants?.length
				? body.restaurants
				: [
						{
							name: body.name!,
							slug: body.slug!,
							description: body.description,
							phone: body.phone,
							whatsapp: body.whatsapp,
						},
					];

			// Check ALL slugs unique inside transaction
			for (const m of menus) {
				const slugTaken = await tx.restaurant.findUnique({ where: { slug: m.slug } });
				if (slugTaken) throw new Error('Unique constraint failed on slug');
			}

			// Create each restaurant; first = primary
			let primary: Awaited<ReturnType<typeof tx.restaurant.create>> | null = null;
			for (let i = 0; i < menus.length; i++) {
				const m = menus[i];
				const restaurant = await tx.restaurant.create({
					data: {
						name: m.name,
						slug: m.slug,
						description: m.description ?? '',
						phone: m.phone ?? '',
						whatsapp: m.whatsapp ?? '',
						email: body.email ?? '',
						address: body.address ?? '',
						workingHours: body.workingHours ?? '',
						planId: body.planId ?? null,
					},
				});
				if (i === 0) primary = restaurant;
			}

			// Create owner user if username/password provided (linked to primary restaurant)
			if (body.username && body.password) {
				const { hashPassword } = await import('@/lib/hash');
				await tx.user.create({
					data: {
						username: body.username,
						password: hashPassword(body.password),
						name: primary!.name,
						role: 'owner',
						restaurantId: primary!.id,
						planId: body.planId ?? null,
					},
				});

				// Link ALL restaurants to the new user via UserRestaurant (many-to-many)
				const createdUser = await tx.user.findUniqueOrThrow({ where: { username: body.username } });
				for (let i = 0; i < menus.length; i++) {
					await tx.userRestaurant.create({
						data: { userId: createdUser.id, restaurantId: (i === 0 ? primary! : (await tx.restaurant.findUniqueOrThrow({ where: { slug: menus[i].slug } }))).id, isPrimary: i === 0 },
					});
				}
			}

			return primary!;
		});

		// Audit log + Telegram (best-effort, must not fail the response)
		logAudit({ action: 'create', targetType: 'restaurant', targetId: result.id, actorId }).catch(
			() => {}
		);
		notifyEvent(
			'restaurant_created',
			{ name: result.name, slug: result.slug, plan: result.planId ? 'paid' : 'free' },
			{ adminOnly: true }
		);

		return success(result, 201);
	} catch (e) {
		return handleError(e);
	}
}
