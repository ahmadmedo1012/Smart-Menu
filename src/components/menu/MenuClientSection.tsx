"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Store, Clock, MapPin } from "lucide-react"
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

type SerializedCategory = { id: number; name: string; nameAr: string | null; icon: string; sortOrder: number; isActive: boolean; restaurantId: number; createdAt: string; updatedAt: string }

type SerializedItem = {
  id: number; name: string; nameAr: string | null; description: string; descriptionAr: string; price: number
  discountedPrice: number | null; image: string; sortOrder: number; categoryId: number; status: string; avgRating: number | null
  ratingCount: number; isPopular: boolean; isNew: boolean; createdAt: string; category: { id: number; name: string; nameAr: string | null; icon: string; sortOrder: number; isActive: boolean; restaurantId: number; createdAt: string; updatedAt: string }
}

export function MenuClientSection(props: {
  restaurant: Restaurant
  slug: string
  origin: string
  categories: SerializedCategory[]
  serializedItems: SerializedItem[]
  hasContact: boolean
}) {


  const { restaurant, slug, origin, categories, serializedItems, hasContact } = props

  return (
    <>
      <StickyMenuHeader name={restaurant.name} logo={restaurant.logo} />

      <header className="relative min-h-[80vh] md:min-h-[70vh] overflow-hidden bg-gradient-to-b from-orange/25 via-background to-background before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.55_0.19_45/0.15),transparent_70%)]">

        {/* ── Ambient floating orbs ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/6 w-72 h-72 rounded-full bg-orange/6 blur-[120px] animate-orb-float" />
          <div className="absolute bottom-1/3 right-1/5 w-96 h-96 rounded-full bg-orange/4 blur-[140px] animate-orb-float-delayed" />
          <div className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full bg-orange/3 blur-[100px] animate-orb-float-slow" />
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-orange/5 blur-[100px] animate-breathe" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange/3 blur-[120px] animate-breathe" style={{animationDelay:'2s'}} />
        </div>

        {/* ── Decorative corner Lottie ── */}
        <div className="absolute top-8 end-8 size-24 md:size-32 opacity-30 dark:opacity-20 pointer-events-none select-none">
          <LottieAnimation src="/animations/food-choice.lottie" loop autoplay speed={0.6} />
        </div>
        <div className="absolute bottom-4 start-4 size-20 md:size-28 opacity-25 dark:opacity-15 pointer-events-none select-none">
          <LottieAnimation src="/animations/cooking.lottie" loop autoplay speed={0.5} />
        </div>

        {/* ── Bottom gradient fade ── */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-background/30 to-background pointer-events-none" />

        {/* ── Hero content ── */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-12 md:pt-28 md:pb-16 text-center">
          {restaurant.logo ? (
            <div className="relative mx-auto mb-6 group">
              {/* Orbital glow ring */}
              <div className="absolute -inset-6 rounded-full bg-orange/5 blur-[50px] group-hover:blur-[70px] transition-all duration-700" />
              <div className="absolute -inset-3 rounded-full border border-orange/10 animate-hero-glow-pulse" />
              <div className="absolute -inset-2 rounded-full border border-orange/5 animate-hero-glow-pulse" style={{animationDelay:'0.5s'}} />
              {/* Glass orb container */}
              <div className="relative size-28 md:size-32 rounded-2xl overflow-hidden shadow-2xl shadow-orange/20 ring-2 ring-orange/20 dark:ring-orange/15 backdrop-blur-sm bg-white/5 dark:bg-white/[0.04] gpu-layer">
                <OptimizedImage src={restaurant.logo} alt={restaurant.name} imageClassName="size-full object-cover" skeleton />
              </div>
            </div>
          ) : (
            <div className="relative mx-auto mb-6">
              <div className="absolute -inset-4 rounded-full bg-orange/5 blur-[40px]" />
              <div className="relative size-20 rounded-2xl bg-gradient-to-br from-orange to-amber-500/80 flex items-center justify-center shadow-xl shadow-orange/25 ring-2 ring-white/10 gpu-layer">
                <Store className="size-10 text-white" />
              </div>
            </div>
          )}

          {/* Text-gradient hero name */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-3 text-balance leading-[1.1] bg-gradient-to-l from-orange via-orange/80 to-orange/40 bg-clip-text text-transparent drop-shadow-sm">
            {restaurant.name}
          </h1>

          {restaurant.description && (
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">{restaurant.description}</p>
          )}

          {/* Decorative divider */}
          <div className="mx-auto mt-5 mb-5 flex items-center justify-center gap-3">
            <span className="block w-12 h-[1px] bg-gradient-to-l from-orange/0 via-orange/40 to-orange/0" />
            <span className="block size-1.5 rounded-full bg-orange/40" />
            <span className="block w-12 h-[1px] bg-gradient-to-r from-orange/0 via-orange/40 to-orange/0" />
          </div>

          {/* Glass-pill action bar */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            {restaurant.workingHours && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground glass-card px-3.5 py-2 rounded-full backdrop-blur-md border border-white/5 dark:border-white/[0.04]">
                <Clock className="size-3.5" />
                {restaurant.workingHours}
              </span>
            )}
            <ShareButton url={`${origin}/menu/${slug}`} title={`منيو ${restaurant.name}`} />
            <a href={`/menu/${slug}/print`} target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-all duration-300 backdrop-blur-md border border-white/5 dark:border-white/[0.04]">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6M6 18h12v3H6v-3z"/></svg>
              طباعة
            </a>
          </div>

          {/* Glass-pill contacts row */}
          {hasContact && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} dir="ltr"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-all duration-300 backdrop-blur-md border border-white/5 dark:border-white/[0.04]">
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {restaurant.phone}
                </a>
              )}
              {restaurant.whatsapp && (
                <a href={`https://wa.me/${restaurant.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium glass-card hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-300 backdrop-blur-md border border-green-200/30 dark:border-green-800/30 text-green-700 dark:text-green-400"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  {restaurant.whatsapp}
                </a>
              )}
              {restaurant.email && (
                <a href={`mailto:${restaurant.email}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-all duration-300 backdrop-blur-md border border-white/5 dark:border-white/[0.04]">
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {restaurant.email}
                </a>
              )}
            </div>
          )}

          {restaurant.address && (
            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground glass-card px-3.5 py-2 rounded-full backdrop-blur-md border border-white/5 dark:border-white/[0.04] mx-auto w-fit">
              <MapPin className="size-3.5" />
              {restaurant.address}
            </div>
          )}
        </div>
      </header>

      {restaurant.gallery?.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 mt-2 relative z-10">
          <GalleryCarousel images={restaurant.gallery} restaurantName={restaurant.name} />
        </section>
      )}

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground animate-pulse">جاري تحميل المنيو...</div>}>
          <MenuPageClient
          categories={categories}
          items={serializedItems}
          restaurantWhatsapp={restaurant.whatsapp ?? undefined}
          restaurantName={restaurant.name}
          restaurantId={restaurant.id}
          restaurantLogo={restaurant.logo}
        />
        </Suspense>
      </div>

      <LoyaltyWidget
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        whatsapp={restaurant.whatsapp ?? undefined}
        restaurantSlug={slug}
      />
    </>
  )
}
