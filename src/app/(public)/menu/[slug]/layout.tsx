import { notFound } from 'next/navigation';
import { getRestaurantBySlug } from '@/lib/menu-queries';

/**
 * Existence gate for the menu segment.
 *
 * Performing the existence check HERE — before the page queries categories and
 * items — keeps unknown slugs out of the menu data path and lets Next.js set a
 * real 404 status code for this dynamic SEO route.
 *
 * React cache() dedupes this lookup with generateMetadata and the page,
 * so the restaurant is still fetched exactly once per request.
 */
export default async function MenuSlugLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const restaurant = await getRestaurantBySlug(slug);
	if (!restaurant) notFound();
	return <>{children}</>;
}
