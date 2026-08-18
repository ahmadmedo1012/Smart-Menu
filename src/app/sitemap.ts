import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || 'https://smart-link.ly';

// Slug patterns of test/debug restaurants that must never be indexed
const TEST_SLUG_RE =
	/(^|-)(test|admin-test|demo|debug|bug|dev|cafe-t|restaurant-\d|178\d{10,}|^s?asas|^qq+|^-+|^sjj|^ede|^nigga|^sex)/i;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Count menu items via categories (MenuItem belongs to a category, not the restaurant)
	const restaurants = await prisma.restaurant.findMany({
		where: { isActive: true },
		select: {
			slug: true,
			updatedAt: true,
			categories: { select: { _count: { select: { items: true } } } },
		},
	});

	const menuPages: MetadataRoute.Sitemap = restaurants
		.filter(
			(r) =>
				r.categories.reduce((sum, c) => sum + c._count.items, 0) > 0 && !TEST_SLUG_RE.test(r.slug)
		)
		.map((r) => ({
			url: `${BASE_URL}/menu/${r.slug}`,
			lastModified: r.updatedAt,
			changeFrequency: 'daily',
			priority: 0.8,
		}));

	return [
		{ url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
		{
			url: `${BASE_URL}/pricing`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.8,
		},
		{
			url: `${BASE_URL}/login`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.3,
		},
		{
			url: `${BASE_URL}/terms`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.4,
		},
		{
			url: `${BASE_URL}/privacy`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.4,
		},
		{
			url: `${BASE_URL}/subscribe`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.5,
		},
		...menuPages,
];
}
