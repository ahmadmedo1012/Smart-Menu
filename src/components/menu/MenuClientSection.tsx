"use client"

import dynamic from "next/dynamic"
import type { MenuItemProp } from "./MenuItemCard"

const MenuPageClient = dynamic(() => import("./MenuPageClient"), { ssr: false })
const LoyaltyWidget = dynamic(() => import("../loyalty/LoyaltyWidget"), { ssr: false })

type CategoryProp = { id: number; name: string; nameAr: string | null; icon: string }

export function MenuClientSection({
  categories,
  items,
  restaurantWhatsapp,
  restaurantName,
  restaurantSlug,
  restaurantId,
  restaurantLogo,
}: {
  categories: CategoryProp[]
  items: (MenuItemProp & { category: CategoryProp })[]
  restaurantWhatsapp?: string
  restaurantName?: string
  restaurantId: number
  restaurantLogo?: string
  restaurantSlug?: string
}) {
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 -mt-1 relative z-20">
        <MenuPageClient
          categories={categories}
          items={items}
          restaurantWhatsapp={restaurantWhatsapp}
          restaurantName={restaurantName}
          restaurantId={restaurantId}
          restaurantSlug={restaurantSlug}
          restaurantLogo={restaurantLogo}
        />
      </div>
      <LoyaltyWidget
        restaurantId={restaurantId}
        restaurantName={restaurantName ?? ""}
        restaurantSlug={restaurantSlug ?? ""}
        whatsapp={restaurantWhatsapp}
      />
    </>
  )
}
