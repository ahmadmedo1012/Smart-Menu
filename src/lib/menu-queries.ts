import { cache } from 'react';
import { prisma } from '@/lib/db';

// Shared restaurant lookup for the public menu route, memoized per request with
// React cache() so generateMetadata and the page render issue ONE DB query.
// (Next.js docs: fetch requests are memoized across generateMetadata/pages;
// React cache() is the sanctioned equivalent when fetch isn't used — Prisma.)
// Note: isActive:true is applied here (not just in the page) so inactive
// restaurants get neither metadata nor a page — the page 404s anyway.
export const getRestaurantBySlug = cache(async (slug: string) =>
	prisma.restaurant.findUnique({
		where: { slug, isActive: true },
		select: {
			id: true,
			name: true,
			description: true,
			logo: true,
			phone: true,
			whatsapp: true,
			slug: true,
			address: true,
			workingHours: true,
			gallery: true,
			email: true,
		},
	})
);