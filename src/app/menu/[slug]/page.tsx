import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { MenuClientSection } from "@/components/menu/MenuClientSection";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const origin = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
  const restaurant = await prisma.restaurant.findUnique({ where: { slug }, select: { id: true, name: true, description: true, logo: true } });
  if (!restaurant) notFound();
  return {
    title: restaurant.name,
    openGraph: {
      title: restaurant.name,
      description: restaurant.description || `اطلع على قائمة ${restaurant.name} واطلب عبر واتساب`,
      url: `${origin}/menu/${slug}`,
      siteName: "الربط الذكي",
      images: restaurant.logo ? [{ url: restaurant.logo, width: 512, height: 512 }] : [],
      locale: "ar_LY",
      type: "website",
    },
  };
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true, name: true, description: true, logo: true, phone: true, whatsapp: true,
      slug: true, address: true, workingHours: true, gallery: true, email: true,
    },
  });
  if (!restaurant) notFound();

  // Server component, runs once per request — Date.now is safe here
  // eslint-disable-next-line react-hooks/purity
  const SEVEN_DAYS_MS = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_AGO = new Date(SEVEN_DAYS_MS);

  const [categories, items, popularData] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { isActive: true, restaurantId: restaurant.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { status: "available", category: { restaurantId: restaurant.id } },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      where: {
        order: { restaurantId: restaurant.id, createdAt: { gte: SEVEN_DAYS_AGO }, status: { not: "cancelled" } },
      },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
  ]);

  const popularIds = new Set(popularData.map((o) => o.itemId));
  const serializedItems = items.map(({ price, discountedPrice, avgRating, ratingCount, ...rest }) => ({
    ...rest,
    price: Number(price),
    discountedPrice: discountedPrice !== null ? Number(discountedPrice) : null,
    avgRating: avgRating !== null ? Number(avgRating) : null,
    ratingCount,
    isPopular: popularIds.has(rest.id),
    isNew: !popularIds.has(rest.id) && rest.createdAt.getTime() > SEVEN_DAYS_MS,
    createdAt: rest.createdAt.toISOString(),
  }));

  const hasContact = !!(restaurant.phone || restaurant.whatsapp || restaurant.email || restaurant.address);
  const hasGallery = restaurant.gallery && restaurant.gallery.length > 0;

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.55_0.19_45/0.06),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.55_0.19_45/0.08),transparent_70%)] pointer-events-none" />

      {/* Hero + Menu + Loyalty — fully client-rendered to avoid hydration mismatch */}
      <MenuClientSection
        restaurant={restaurant}
        slug={slug}
        origin={origin}
        categories={categories}
        serializedItems={serializedItems}
        hasContact={hasContact}
      />

    </div>
  );
}
