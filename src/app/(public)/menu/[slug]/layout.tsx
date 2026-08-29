import { notFound } from 'next/navigation';
import { getRestaurantBySlug } from '@/lib/menu-queries';

/**
 * Existence gate for the menu segment.
 *
 * The page below this layout has a loading.tsx boundary, so its own
 * notFound() call streams a 200 + noindex (the response headers are already
 * flushed by the time the slug check runs). Performing the existence check
 * HERE — in the segment layout, which renders before the loading boundary
 * wraps the children — lets Next.js set the real 404 status code.
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
