"use client"

import dynamic from "next/dynamic"
import { Store, Clock } from "lucide-react"
import { OptimizedImage } from "@/components/ui/OptimizedImage"

const StickyMenuHeader = dynamic(() => import("./StickyMenuHeader"), { ssr: false })
const MenuPageClient = dynamic(() => import("./MenuPageClient"), { ssr: false })
const LoyaltyWidget = dynamic(() => import("../loyalty/LoyaltyWidget"), { ssr: false })
const LottieAnimation = dynamic(() => import("@/components/shared/LottieAnimation").then(m => ({ default: m.LottieAnimation })), { ssr: false })
const ShareButton = dynamic(() => import("@/components/shared/ShareButton"), { ssr: false })
const GalleryCarousel = dynamic(() => import("@/components/menu/GalleryCarousel"), { ssr: false })

type Restaurant = {
  name: string; logo: string; description: string | null; phone: string | null
  whatsapp: string | null; email: string | null; address: string | null
  workingHours: string | null; gallery: string[]; id: number
}

export function MenuClientSection(props: {
  restaurant: Restaurant
  slug: string
  origin: string
  categories: any[]
  serializedItems: any[]
  hasContact: boolean
}) {


  const { restaurant, slug, origin, categories, serializedItems, hasContact } = props

  return (
    <>
      <StickyMenuHeader name={restaurant.name} logo={restaurant.logo} />

      <header className="relative overflow-hidden bg-gradient-to-b from-orange/8 via-background to-background">

        <div className="absolute top-8 end-8 size-24 md:size-32 opacity-30 dark:opacity-20 pointer-events-none select-none">
          <LottieAnimation src="/animations/food-choice.lottie" loop autoplay speed={0.6} />
        </div>
        <div className="absolute bottom-4 start-4 size-20 md:size-28 opacity-25 dark:opacity-15 pointer-events-none select-none">
          <LottieAnimation src="/animations/cooking.lottie" loop autoplay speed={0.5} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/0 to-background/40 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-16 pb-8 md:pt-14 md:pb-12 text-center animate-page-enter">
          {restaurant.logo ? (
            <div className="relative mx-auto mb-5 size-24 md:size-28 rounded-md overflow-hidden shadow-xl shadow-orange/15 ring-2 ring-orange/20 dark:ring-orange/15 animate-magnetic-float">
              <OptimizedImage src={restaurant.logo} alt={restaurant.name} imageClassName="size-full object-cover" skeleton />
            </div>
          ) : (
            <div className="relative mx-auto mb-5 size-20 rounded-md bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/20 animate-magnetic-float">
              <Store className="size-10 text-white" />
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">{restaurant.name}</h1>

          {restaurant.description && (
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">{restaurant.description}</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            {restaurant.workingHours && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-border/30">
                <Clock className="size-3.5" />
                {restaurant.workingHours}
              </span>
            )}
            <ShareButton url={`${origin}/menu/${slug}`} title={`منيو ${restaurant.name}`} />
            <a href={`/menu/${slug}/print`} target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-all duration-300">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6M6 18h12v3H6v-3z"/></svg>
              طباعة
            </a>
          </div>

          {hasContact && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} dir="ltr"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-all duration-300">
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {restaurant.phone}
                </a>
              )}
              {restaurant.whatsapp && (
                <a href={`https://wa.me/${restaurant.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 glass-card hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-300"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  {restaurant.whatsapp}
                </a>
              )}
              {restaurant.email && (
                <a href={`mailto:${restaurant.email}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-all duration-300">
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {restaurant.email}
                </a>
              )}
            </div>
          )}

          {restaurant.address && (
            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground bg-muted/30 backdrop-blur-sm px-3.5 py-2 rounded-full border border-border/20 mx-auto w-fit">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {restaurant.address}
            </div>
          )}
        </div>
      </header>

      {restaurant.gallery?.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 mt-6">
          <GalleryCarousel images={restaurant.gallery} restaurantName={restaurant.name} />
        </section>
      )}

      <div className="max-w-4xl mx-auto px-4 -mt-1 relative z-20">
        <MenuPageClient
          categories={categories}
          items={serializedItems}
          restaurantWhatsapp={restaurant.whatsapp ?? undefined}
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
        whatsapp={restaurant.whatsapp ?? undefined}
      />
    </>
  )
}
