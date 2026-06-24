import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Store, Phone, MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import dynamicNext from "next/dynamic";
import MenuPageClient from "@/components/menu/MenuPageClient";
import LoyaltyWidget from "@/components/loyalty/LoyaltyWidget";
import StickyMenuHeader from "@/components/menu/StickyMenuHeader";
import ShareButton from "@/components/shared/ShareButton";

const GalleryCarousel = dynamicNext(() => import("@/components/menu/GalleryCarousel"));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const origin = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return { title: "المطعم غير موجود" };
  return {
    title: `${restaurant.name} | المنيو الذكي`,
    description: restaurant.description || `اطلع على قائمة ${restaurant.name} واطلب عبر واتساب`,
    openGraph: {
      title: `${restaurant.name} | المنيو الذكي`,
      description: restaurant.description || `اطلع على قائمة ${restaurant.name} واطلب عبر واتساب`,
      url: `${origin}/menu/${slug}`,
      siteName: "الربط الذكي",
      images: restaurant.logo ? [{ url: restaurant.logo, width: 512, height: 512 }] : [],
      locale: "ar_LY",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${restaurant.name} | المنيو الذكي`,
      description: restaurant.description || `اطلع على قائمة ${restaurant.name} واطلب عبر واتساب`,
      images: restaurant.logo ? [restaurant.logo] : [],
    },
  };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const origin = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';

  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { isActive: true, restaurantId: restaurant.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { status: "available", category: { restaurantId: restaurant.id } },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const serializedItems = items.map(({ price, discountedPrice, ...rest }) => ({
    ...rest, price: Number(price), discountedPrice: discountedPrice !== null ? Number(discountedPrice) : null,
  }));

  const hasContact = restaurant.phone || restaurant.whatsapp || restaurant.email || restaurant.address;
  const mapQuery = restaurant.address ? encodeURIComponent(restaurant.address) : null;
  const hasGallery = restaurant.gallery && restaurant.gallery.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <StickyMenuHeader name={restaurant.name} logo={restaurant.logo} />

      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-b from-amber-500/8 via-background to-background">
        <div className="absolute inset-0 hero-mesh">
          <div className="blob" style={{ width: "500px", height: "500px", top: "-20%", left: "-10%", animationDuration: "22s" }} />
          <div className="blob" style={{ width: "400px", height: "400px", bottom: "-30%", right: "-15%", animationDuration: "26s" }} />
          <div className="blob" style={{ width: "350px", height: "350px", top: "40%", left: "60%", animationDuration: "19s" }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/0 to-background/40 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-16 pb-8 md:pt-14 md:pb-12 text-center animate-page-enter">
          {restaurant.logo ? (
            <div className="relative mx-auto mb-5 size-24 md:size-28 rounded-2xl overflow-hidden shadow-xl shadow-amber-500/15 ring-2 ring-amber-200/20 dark:ring-amber-500/15 animate-magnetic-float">
              <img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ) : (
            <div className="relative mx-auto mb-5 size-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-magnetic-float" aria-hidden="true">
              <Store className="size-10 text-white" aria-hidden="true" />
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-gradient-amber">{restaurant.name}</h1>

          {restaurant.description && (
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {restaurant.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            {restaurant.workingHours && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-border/30">
                <Clock className="size-3.5" aria-hidden="true" />
                {restaurant.workingHours}
              </span>
            )}

            <ShareButton url={`${origin}/menu/${slug}`} title={`منيو ${restaurant.name}`} />

            <a href={`/menu/${slug}/print`} target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium glass-card hover:bg-amber-500/10 transition-all duration-300">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6M6 18h12v3H6v-3z"/>
              </svg>
              طباعة
            </a>
          </div>

          {(restaurant.phone || restaurant.whatsapp || restaurant.email) && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} dir="ltr"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium glass-card hover:bg-amber-500/10 transition-all duration-300">
                  <Phone className="size-3.5 text-primary" aria-hidden="true" />
                  {restaurant.phone}
                </a>
              )}
              {restaurant.whatsapp && (
                <a href={`https://wa.me/${restaurant.whatsapp.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" dir="ltr"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium glass-card hover:bg-green-500/10 transition-all duration-300">
                  <MessageCircle className="size-3.5 text-green-500" aria-hidden="true" />
                  {restaurant.whatsapp}
                </a>
              )}
              {restaurant.email && (
                <a href={`mailto:${restaurant.email}`} dir="ltr"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium glass-card hover:bg-amber-500/10 transition-all duration-300">
                  <Mail className="size-3.5 text-primary" aria-hidden="true" />
                  {restaurant.email}
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Gallery */}
      {hasGallery && (
        <div className="max-w-4xl mx-auto px-4 -mt-2 relative z-20 mb-6">
          <Suspense fallback={<div className="h-64 rounded-2xl skeleton" />}>
            <GalleryCarousel images={restaurant.gallery} restaurantName={restaurant.name} />
          </Suspense>
        </div>
      )}

      {/* Menu */}
      <div className="max-w-4xl mx-auto px-4 -mt-1 relative z-20">
        <MenuPageClient
          categories={categories}
          items={serializedItems}
          restaurantWhatsapp={restaurant.whatsapp}
          restaurantName={restaurant.name}
          restaurantId={restaurant.id}
          restaurantSlug={slug}
          restaurantLogo={restaurant.logo}
        />
      </div>

      <LoyaltyWidget
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        restaurantSlug={slug}
        whatsapp={restaurant.whatsapp}
      />

      {/* Contact */}
      {hasContact && (
        <section className="max-w-4xl mx-auto px-4 pb-10 mt-6">
          <div className="rounded-2xl bg-card/40 border border-border/20 overflow-hidden shadow-sm">
            <div className="p-5 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <MessageCircle className="size-4 text-primary" aria-hidden="true" />
                تواصل معنا
              </h2>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {restaurant.phone && (
                  <a href={`tel:${restaurant.phone}`} dir="ltr"
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:bg-amber-500/5 hover:border-amber-300/20 transition-all duration-300 group">
                    <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Phone className="size-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.phone}</p>
                      <p className="text-[11px] text-muted-foreground">اتصال</p>
                    </div>
                  </a>
                )}
                {restaurant.whatsapp && (
                  <a href={`https://wa.me/${restaurant.whatsapp.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" dir="ltr"
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:bg-green-500/5 hover:border-green-300/20 transition-all duration-300 group">
                    <div className="size-10 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageCircle className="size-4 text-green-500" aria-hidden="true" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.whatsapp}</p>
                      <p className="text-[11px] text-muted-foreground">واتساب</p>
                    </div>
                  </a>
                )}
                {restaurant.email && (
                  <a href={`mailto:${restaurant.email}`} dir="ltr"
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:bg-amber-500/5 hover:border-amber-300/20 transition-all duration-300 group">
                    <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Mail className="size-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.email}</p>
                      <p className="text-[11px] text-muted-foreground">بريد إلكتروني</p>
                    </div>
                  </a>
                )}
                {restaurant.address && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30">
                    <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center shrink-0">
                      <MapPin className="size-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.address}</p>
                      <p className="text-[11px] text-muted-foreground">العنوان</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {mapQuery && (
              <div className="relative w-full h-48 overflow-hidden">
                <iframe src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${restaurant.name} - ${restaurant.address}`} />
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-border/20 py-6 text-center text-xs text-muted-foreground">
        <p>مدعوم من <Link href="/" className="text-primary hover:text-amber-600 transition-colors font-medium">الربط الذكي</Link></p>
      </footer>
    </div>
  );
}
