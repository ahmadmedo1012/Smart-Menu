"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { useCart } from "@/store/cart"
import { premiumToast } from "@/lib/premium-toast"
import MenuItemCard, { type MenuItemProp } from "./MenuItemCard"
import { CategoryTabs } from "./CategoryTabs"
import { MenuToolbar } from "./MenuToolbar"
import OrderDialog from "./OrderDialog"
import { toArabicNumber } from "@/lib/format"

type CategoryProp = { id: number; name: string; nameAr: string | null; icon: string }

const SORT_VALUES = ["default", "price-asc", "price-desc", "name"] as const
type SortValue = (typeof SORT_VALUES)[number]

function isValidSort(v: string | null): v is SortValue {
  return v !== null && (SORT_VALUES as readonly string[]).includes(v)
}

export default function MenuPageClient({
  categories,
  items,
  restaurantWhatsapp,
  restaurantName,
  restaurantId,
  restaurantLogo,
}: {
  categories: CategoryProp[]
  items: (MenuItemProp & { category: CategoryProp })[]
  restaurantWhatsapp?: string
  restaurantName?: string
  restaurantId: number
  restaurantLogo?: string
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read state from URL params
  const search = searchParams.get("q") || ""
  const activeCategory = (() => {
    const raw = searchParams.get("cat")
    if (!raw) return null
    const n = Number(raw)
    if (isNaN(n) || !categories.some((c) => c.id === n)) return null
    return n
  })()
  const sort = isValidSort(searchParams.get("sort")) ? searchParams.get("sort")! : "default"

  const [orderItem, setOrderItem] = useState<MenuItemProp | null>(null)
  const cartItems = useCart((s) => s.items)
  const addItem = useCart((s) => s.addItem)
  const updateQuantity = useCart((s) => s.updateQuantity)
  const setRestaurantDetails = useCart((s) => s.setRestaurantDetails)

  // Update URL params (replace, not push, to avoid history spam)
  const updateURL = useCallback(
    (updates: { q?: string; cat?: number | null; sort?: string }) => {
      const p = new URLSearchParams(searchParams.toString())
      if (updates.q !== undefined) {
        if (updates.q) p.set("q", updates.q)
        else p.delete("q")
      }
      if (updates.cat !== undefined) {
        if (updates.cat !== null) p.set("cat", String(updates.cat))
        else p.delete("cat")
      }
      if (updates.sort !== undefined) {
        if (updates.sort !== "default") p.set("sort", updates.sort)
        else p.delete("sort")
      }
      const qs = p.toString()
      router.replace(qs ? `?${qs}` : "", { scroll: false })
    },
    [searchParams, router],
  )

  const handleQuickAdd = useCallback(
    (item: MenuItemProp) => {
      addItem({
        itemId: item.id,
        name: item.nameAr || item.name,
        price: item.discountedPrice ?? item.price,
        image: item.image || undefined,
        restaurantId,
      })
      premiumToast("cart", "تمت الإضافة!", item.nameAr || item.name, { duration: 2000, anim: true })
    },
    [addItem, restaurantId],
  )

  const handleDecrement = useCallback(
    (item: MenuItemProp) => {
      const existing = cartItems.find((i) => i.itemId === item.id)
      if (existing) updateQuantity(existing.id, existing.quantity - 1)
    },
    [cartItems, updateQuantity],
  )

  const getCartQty = useCallback(
    (itemId: number) => cartItems.find((i) => i.itemId === itemId)?.quantity ?? 0,
    [cartItems],
  )

  useEffect(() => {
    if (restaurantId) setRestaurantDetails(restaurantId, restaurantWhatsapp || "", restaurantName || "")
  }, [restaurantId, restaurantWhatsapp, restaurantName, setRestaurantDetails])

  /* ── Filtered + sorted items ── */
  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      const q = search.trim()
      const matchesSearch =
        q === "" ||
        (item.nameAr || item.name).includes(q) ||
        (item.descriptionAr || item.description).includes(q)
      const matchesCategory = activeCategory === null || item.categoryId === activeCategory
      return matchesSearch && matchesCategory
    })

    switch (sort) {
      case "price-asc":
        result.sort((a, b) => (a.discountedPrice ?? a.price) - (b.discountedPrice ?? b.price))
        break
      case "price-desc":
        result.sort((a, b) => (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price))
        break
      case "name":
        result.sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name))
        break
    }
    return result
  }, [items, search, activeCategory, sort])

  /* ── Popular items ── */
  const popularItems = useMemo(
    () => (activeCategory === null && search === "" ? items.filter((i) => i.isPopular) : []),
    [items, activeCategory, search],
  )

  const normalItems = useMemo(
    () => (popularItems.length > 0 ? filteredItems.filter((i) => !popularItems.includes(i)) : filteredItems),
    [filteredItems, popularItems],
  )

  const itemCounts = useMemo(() => {
    const counts = new Map<number | null, number>()
    counts.set(null, items.length)
    for (const cat of categories) {
      counts.set(cat.id, items.filter((i) => i.categoryId === cat.id).length)
    }
    return counts
  }, [items, categories])

  // ponytail: dead scroll listener removed — it was an empty useCallback doing nothing

  const handleSuggestionClick = useCallback((id: number) => {
    const found = items.find((i) => i.id === id)
    if (found) setOrderItem(found)
  }, [items])

  const hasActiveFilter = search !== "" || activeCategory !== null

  return (
    <>
      <MenuToolbar
        search={search}
        onSearchChange={(v) => updateURL({ q: v })}
        sort={sort}
        onSortChange={(v) => updateURL({ sort: v })}
        items={items}
        onSuggestionClick={handleSuggestionClick}
      />

      {hasActiveFilter && (
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground animate-fade-in">
          <Sparkles className="size-3.5 text-primary" />
          <span>
            {filteredItems.length === 0
              ? "لا توجد نتائج"
              : `تم العثور على ${toArabicNumber(filteredItems.length)} صنف`}
          </span>
          {activeCategory !== null && (
            <button
              type="button"
              onClick={() => updateURL({ cat: null })}
              className="text-xs px-2.5 py-1 rounded-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              إعادة تعيين
            </button>
          )}
        </div>
      )}

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={(id) => updateURL({ cat: id })}
        itemCounts={itemCounts}
      />

      {/* Featured popular horizontal scroll */}
      {popularItems.length >= 2 && (
        <section id="menu-popular" className="mb-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="size-2 rounded-full bg-orange animate-pulse" />
            <span className="text-sm font-semibold text-foreground">الأكثر طلباً</span>
          </div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {popularItems.slice(0, 6).map((item) => (
              <div key={item.id} className="snap-start shrink-0 w-[85vw] sm:w-[420px] max-w-full animate-reveal">
                <MenuItemCard
                  item={item}
                  onOrder={setOrderItem}
                  onAddToCart={handleQuickAdd}
                  onDecrementCart={handleDecrement}
                  cartQty={getCartQty(item.id)}
                  variant="featured"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Normal grid */}
      {normalItems.length === 0 ? (
        <div className="text-center py-16 sm:py-20 animate-fade-in">
          <div className="empty-state-icon">
            <Sparkles className="size-8 text-muted-foreground/30" />
          </div>
          <p className="text-muted-foreground text-base sm:text-lg font-medium mb-1">
            {search ? "لا توجد أصناف تطابق بحثك" : "لا توجد أصناف في هذه الفئة"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground/60">
            {search ? "جرب كلمات بحث أخرى" : "اختر فئة أخرى"}
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => { updateURL({ q: "", cat: null }) }}
              className="mt-4 text-sm px-4 py-2 rounded-sm bg-orange text-white hover:brightness-110 transition-all"
            >
              عرض الكل
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {normalItems.map((item, index) => (
            <div
              key={item.id}
              className="animate-reveal"
              style={{ animationDelay: `${(index % 6) * 60}ms` }}
            >
              <MenuItemCard
                item={item}
                onOrder={setOrderItem}
                onAddToCart={handleQuickAdd}
                onDecrementCart={handleDecrement}
                cartQty={getCartQty(item.id)}
              />
            </div>
          ))}
        </div>
      )}

      <OrderDialog
        item={orderItem}
        open={orderItem !== null}
        onOpenChange={(open) => { if (!open) setOrderItem(null) }}
        restaurantWhatsapp={restaurantWhatsapp}
        restaurantName={restaurantName}
        restaurantId={restaurantId}
        restaurantLogo={restaurantLogo}
      />
    </>
  )
}
