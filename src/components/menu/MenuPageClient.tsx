"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Sparkles } from "lucide-react"
import { useCart } from "@/store/cart"
import { premiumToast } from "@/lib/premium-toast"
import MenuItemCard, { type MenuItemProp } from "./MenuItemCard"
import { CategoryTabs } from "./CategoryTabs"
import { MenuToolbar } from "./MenuToolbar"
import OrderDialog from "./OrderDialog"
import { toArabicNumber } from "@/lib/format"

type CategoryProp = { id: number; name: string; nameAr: string | null; icon: string }

export default function MenuPageClient({
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
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [orderItem, setOrderItem] = useState<MenuItemProp | null>(null)
  const [sort, setSort] = useState<string>("default")
  const cartItems = useCart((s) => s.items)
  const addItem = useCart((s) => s.addItem)
  const updateQuantity = useCart((s) => s.updateQuantity)
  const setRestaurantDetails = useCart((s) => s.setRestaurantDetails)

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

  /* ── Popular items (rendered separately, filtered out of normal grid) ── */
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

  const handleScroll = useCallback(() => {}, [])

  useEffect(() => {
    globalThis.addEventListener("scroll", handleScroll, { passive: true })
    return () => globalThis.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const hasActiveFilter = search !== "" || activeCategory !== null

  return (
    <>
      <MenuToolbar search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} />

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
              onClick={() => setActiveCategory(null)}
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
        onSelect={setActiveCategory}
        itemCounts={itemCounts}
      />

      {/* ── Featured popular grid ── */}
      {popularItems.length >= 2 && (
        <section id="menu-popular" className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-orange animate-pulse" />
            <span className="text-sm font-semibold text-foreground">الأكثر طلباً</span>
          </div>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {popularItems.slice(0, 4).map((item) => (
              <div key={item.id} className="sm:col-span-2 animate-reveal">
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

      {/* ── Normal grid ── */}
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
              onClick={() => { setSearch(""); setActiveCategory(null) }}
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
        restaurantSlug={restaurantSlug}
      />
    </>
  )
}
