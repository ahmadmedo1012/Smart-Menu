import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import MenuPageClient from "@/components/menu/MenuPageClient";
import Link from "next/link";
import { Store, Phone, MessageCircle, Mail, MapPin, Clock, Star } from "lucide-react";
import LoyaltyWidget from "@/components/loyalty/LoyaltyWidget";
import StickyMenuHeader from "@/components/menu/StickyMenuHeader";
import ShareButton from "@/components/shared/ShareButton";

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

  const hasContact =
    restaurant.phone || restaurant.whatsapp || restaurant.email || restaurant.address;

  const mapQuery = restaurant.address
    ? encodeURIComponent(restaurant.address)
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header on mobile */}
      <StickyMenuHeader name={restaurant.name} />

      {/* Premium header */}
      <header className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-background to-background">
        {/* Mesh gradient blobs */}
        <div className="absolute inset-0 hero-mesh">
          <div className="blob" style={{ width: '500px', height: '500px', top: '-20%', left: '-10%', animationDuration: '22s' }} />
          <div className="blob" style={{ width: '400px', height: '400px', bottom: '-30%', right: '-15%', animationDuration: '26s' }} />
          <div className="blob" style={{ width: '350px', height: '350px', top: '40%', left: '60%', animationDuration: '19s' }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/0 to-background/50 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-16 pb-6 md:pt-14 md:pb-10 text-center">
          {/* Store icon */}
          <div className="relative mx-auto mb-6 size-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 animate-float">
            <Store className="size-10 text-white" />
          </div>

          {/* Name */}
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-gradient-amber">
            {restaurant.name}
          </h1>

          {/* Description */}
          {restaurant.description && (
            <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
              {restaurant.description}
            </p>
          )}

          {/* Working hours */}
          {restaurant.workingHours && (
            <div className="inline-flex items-center gap-2 mt-4 text-sm text-muted-foreground bg-muted/60 backdrop-blur-sm px-5 py-2 rounded-full border border-border/40">
              <Clock className="size-4" />
              <span>{restaurant.workingHours}</span>
            </div>
          )}

          {/* Share button */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <ShareButton url={`${origin}/menu/${slug}`} title={`منيو ${restaurant.name}`} />
            <a
              href={`/menu/${slug}/print`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-card text-sm font-medium hover:bg-amber-500/10 transition-all duration-300"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6M6 18h12v3H6v-3z"/>
              </svg>
              طباعة
            </a>
          </div>

          {/* Contact pills */}
          {(restaurant.phone || restaurant.whatsapp || restaurant.email) && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-card text-sm font-medium hover:bg-amber-500/10 transition-all duration-300"
                  dir="ltr"
                >
                  <Phone className="size-4 text-primary" />
                  {restaurant.phone}
                </a>
              )}
              {restaurant.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.whatsapp.replace(/^\+/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-card text-sm font-medium hover:bg-green-500/10 transition-all duration-300"
                  dir="ltr"
                >
                  <MessageCircle className="size-4 text-green-500" />
                  {restaurant.whatsapp}
                </a>
              )}
              {restaurant.email && (
                <a
                  href={`mailto:${restaurant.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-card text-sm font-medium hover:bg-amber-500/10 transition-all duration-300"
                  dir="ltr"
                >
                  <Mail className="size-4 text-primary" />
                  {restaurant.email}
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Menu content */}
      <div className="max-w-4xl mx-auto px-4 -mt-4 relative z-20">
        <MenuPageClient
          categories={categories}
          items={items}
          restaurantWhatsapp={restaurant.whatsapp}
          restaurantName={restaurant.name}
          restaurantId={restaurant.id}
        />
      </div>

      {/* Loyalty Widget */}
      <LoyaltyWidget
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        restaurantSlug={slug}
        whatsapp={restaurant.whatsapp}
      />

      {/* Contact section */}
      {hasContact && (
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="size-5 text-primary" />
                تواصل معنا
              </h2>

              {/* Contact items */}
              <div className="grid gap-3 sm:grid-cols-2">
                {restaurant.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/40 hover:bg-amber-500/5 hover:border-amber-300/30 transition-all duration-300 group"
                    dir="ltr"
                  >
                    <div className="size-11 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Phone className="size-5 text-primary" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.phone}</p>
                      <p className="text-xs text-muted-foreground">اتصال</p>
                    </div>
                  </a>
                )}
                {restaurant.whatsapp && (
                  <a
                    href={`https://wa.me/${restaurant.whatsapp.replace(/^\+/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/40 hover:bg-green-500/5 hover:border-green-300/30 transition-all duration-300 group"
                    dir="ltr"
                  >
                    <div className="size-11 rounded-xl bg-gradient-to-br from-green-400/20 to-green-600/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <MessageCircle className="size-5 text-green-500" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.whatsapp}</p>
                      <p className="text-xs text-muted-foreground">واتساب</p>
                    </div>
                  </a>
                )}
                {restaurant.email && (
                  <a
                    href={`mailto:${restaurant.email}`}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/40 hover:bg-amber-500/5 hover:border-amber-300/30 transition-all duration-300 group"
                    dir="ltr"
                  >
                    <div className="size-11 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Mail className="size-5 text-primary" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.email}</p>
                      <p className="text-xs text-muted-foreground">بريد إلكتروني</p>
                    </div>
                  </a>
                )}
                {restaurant.address && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border/40" dir="ltr">
                    <div className="size-11 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center shrink-0">
                      <MapPin className="size-5 text-primary" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.address}</p>
                      <p className="text-xs text-muted-foreground">العنوان</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            {mapQuery && (
              <div className="relative w-full h-52 overflow-hidden">
                <iframe
                  src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${restaurant.name} - ${restaurant.address}`}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <p>مدعوم من <Link href="/" className="text-primary hover:text-amber-600 transition-colors font-medium">الربط الذكي</Link></p>
      </footer>
    </div>
  );
}
