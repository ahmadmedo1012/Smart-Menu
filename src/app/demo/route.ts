import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session';
import { hashPassword } from '@/lib/hash';

export async function GET() {
	// Block demo route in production — always. The demo session is a real PAID owner
	// session that can POST /api/subscriptions and mint real pending payments in the
	// production approval queue (verified live). If a demo is needed, build a
	// read-only sandbox tenant instead — never a writable production session.
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
	}
	// Upsert demo owner user so it works on any DB (production or local)
	let user = await prisma.user.upsert({
		where: { username: 'waha' },
		update: {},
		create: {
			username: 'waha',
			password: hashPassword('waha123'),
			name: 'مقهى الواحة',
			role: 'owner',
			subscriptionStatus: 'PAID',
		},
	});

	// Upsert demo restaurant if not linked
	if (!user.restaurantId) {
		const restaurant = await prisma.restaurant.upsert({
			where: { slug: 'al-waha-cafe' },
			update: {},
			create: {
				name: 'مقهى الواحة',
				slug: 'al-waha-cafe',
				phone: '0910089975',
				whatsapp: '0910089975',
				isActive: true,
			},
		});
		user = await prisma.user.update({
			where: { id: user.id },
			data: { restaurantId: restaurant.id },
		});
	}

	// Self-healing: ensure demo restaurant has categories and menu items
	const cats = await prisma.menuCategory.findMany({
		where: { restaurantId: user.restaurantId! },
	});
	if (cats.length === 0) {
		const [hot, cold, sweets, snacks] = await prisma.$transaction([
			prisma.menuCategory.create({
				data: { name: 'مشروبات ساخنة', icon: '☕', sortOrder: 1, restaurantId: user.restaurantId! },
			}),
			prisma.menuCategory.create({
				data: { name: 'مشروبات باردة', icon: '🧃', sortOrder: 2, restaurantId: user.restaurantId! },
			}),
			prisma.menuCategory.create({
				data: { name: 'حلويات', icon: '🍰', sortOrder: 3, restaurantId: user.restaurantId! },
			}),
			prisma.menuCategory.create({
				data: { name: 'وجبات خفيفة', icon: '🍔', sortOrder: 4, restaurantId: user.restaurantId! },
			}),
		]);
		await prisma.menuItem.createMany({
			data: [
				{
					name: 'قهوة تركي',
					price: 3,
					categoryId: hot.id,
					sortOrder: 1,
					image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=85',
				},
				{
					name: 'إسبريسو',
					price: 4,
					categoryId: hot.id,
					sortOrder: 2,
					image: 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=400&q=85',
				},
				{
					name: 'كابتشينو',
					price: 5,
					categoryId: hot.id,
					sortOrder: 3,
					image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=85',
				},
				{
					name: 'شاي',
					price: 2,
					categoryId: hot.id,
					sortOrder: 4,
					image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=85',
				},
				{
					name: 'ليموناضة',
					price: 4,
					categoryId: cold.id,
					sortOrder: 1,
					image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=85',
				},
				{
					name: 'سموثي',
					price: 6,
					categoryId: cold.id,
					sortOrder: 2,
					image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&q=85',
				},
				{
					name: 'موهيتو',
					price: 5,
					categoryId: cold.id,
					sortOrder: 3,
					image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&q=85',
				},
				{
					name: 'آيس كوفي',
					price: 5,
					categoryId: cold.id,
					sortOrder: 4,
					image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=85',
				},
				{
					name: 'تشيز كيك',
					price: 7,
					categoryId: sweets.id,
					sortOrder: 1,
					image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=85',
				},
				{
					name: 'كنافة',
					price: 6,
					categoryId: sweets.id,
					sortOrder: 2,
					image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=85',
				},
				{
					name: 'كريب',
					price: 5,
					categoryId: sweets.id,
					sortOrder: 3,
					image: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&q=85',
				},
				{
					name: 'بسبوسة',
					price: 4,
					categoryId: sweets.id,
					sortOrder: 4,
					image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=85',
				},
				{
					name: 'ساندويتش',
					price: 5,
					categoryId: snacks.id,
					sortOrder: 1,
					image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=85',
				},
				{
					name: 'بطاطس مقلية',
					price: 3,
					categoryId: snacks.id,
					sortOrder: 2,
					image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=85',
				},
				{
					name: 'سلطة',
					price: 4,
					categoryId: snacks.id,
					sortOrder: 3,
					image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=85',
				},
				{
					name: 'برجر',
					price: 7,
					categoryId: snacks.id,
					sortOrder: 4,
					image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=85',
				},
			],
		});
	}

	// Self-healing: add default image to items that lack one
	const itemsNoImg = await prisma.menuItem.findMany({
		where: { category: { restaurantId: user.restaurantId! }, image: '' },
	});
	if (itemsNoImg.length > 0) {
		// ponytail: named map covers the 16 known demo items; default fallback for any extras
		const DEFAULT_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=85';
		const imageMap: Record<string, string> = {
			'قهوة تركي': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=85',
			إسبريسو: 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=400&q=85',
			كابتشينو: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=85',
			شاي: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=85',
			ليموناضة: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=85',
			سموثي: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&q=85',
			موهيتو: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&q=85',
			'آيس كوفي': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=85',
			'تشيز كيك': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=85',
			كنافة: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=85',
			كريب: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&q=85',
			بسبوسة: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=85',
			ساندويتش: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=85',
			'بطاطس مقلية': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=85',
			سلطة: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=85',
			برجر: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=85',
		};
		await prisma.$transaction(
			itemsNoImg.map((item) =>
				prisma.menuItem.update({
					where: { id: item.id },
					data: { image: imageMap[item.name] || DEFAULT_IMG },
				})
			)
		);
	}

	const redirectUrl = new URL('/owner', process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000');
	const response = NextResponse.redirect(redirectUrl);

	// Create server-side session (primary auth)
	await createSession(user.id);

	if (user.restaurantId) {
		response.cookies.set('smart-menu-restaurant', String(user.restaurantId), {
			httpOnly: true,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 2,
		});
	}

	return response;
}
