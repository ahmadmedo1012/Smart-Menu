import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const menuPages = restaurants.map((r) => ({
    url: `${BASE_URL}/menu/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
  ];

  return [...staticPages, ...menuPages];
}
