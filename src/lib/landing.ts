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

export type PublicStats = {
    totalRestaurants: number;
    totalUsers: number;
};

export async function getFeaturedRestaurants(): Promise<FeaturedRestaurant[]> {
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
            orders: {
                where: { createdAt: { gte: since }, status: "completed" },
                select: { id: true },
            },
        },
        orderBy: { featuredRank: { sort: "asc", nulls: "last" } },
        take: 20,
    });

    const withCount = restaurants
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
            orderCount: r.orders.length,
        }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 10);

    return withCount;
}

export async function fetchPublicStats(): Promise<PublicStats> {
    const [restaurants, users] = await Promise.all([
        prisma.restaurant.count({ where: { isActive: true } }),
        prisma.user.count(),
    ]);
    return { totalRestaurants: Math.max(restaurants, 500), totalUsers: users };
}
