import { prisma } from "@/lib/db";

export type FeaturedRestaurant = {
    id: number;
    name: string;
    slug: string;
    description: string;
    logo: string;
    city: string;
    phone: string;
    whatsapp: string;
    themeColor: string;
    orderCount: number;
};

// round89-C5 (dx-1 ج): the dead `fetchPublicStats` export + `PublicStats`
// type were removed — zero importers (the LIVE client-fetch copy lives in
// components/landing/landing-data.ts and is what the landing page uses).

export async function getFeaturedRestaurants(): Promise<FeaturedRestaurant[]> {
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const restaurants = await prisma.restaurant.findMany({
            where: { isActive: true, showOnLanding: true },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                logo: true,
                city: true,
                phone: true,
                whatsapp: true,
                themeColor: true,
                _count: {
                    select: {
                        orders: {
                            where: { createdAt: { gte: since }, status: "completed" },
                        },
                    },
                },
            },
            orderBy: { featuredRank: { sort: "asc", nulls: "last" } },
            take: 20,
        });

        return restaurants
            .map((r) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                description: r.description,
                logo: r.logo,
                city: r.city,
                phone: r.phone,
                whatsapp: r.whatsapp,
                themeColor: r.themeColor,
                orderCount: r._count.orders,
            }))
            .sort((a, b) => b.orderCount - a.orderCount)
            .slice(0, 10);
    } catch {
        return [];
    }
}
