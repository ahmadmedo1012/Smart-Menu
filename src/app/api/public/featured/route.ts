import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";

const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

export const dynamic = "force-dynamic";

export async function GET() {
    try {
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

        const data = restaurants
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

        return success(data);
    } catch (e) {
        return handleError(e);
    }
}
