"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { premiumToast } from "@/lib/premium-toast";
import MenuItemCard, { type MenuItemProp } from "./MenuItemCard";
import OrderDialog from "./OrderDialog";
import { toArabicNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type CategoryProp = {
  id: number;
  name: string;
  nameAr: string | null;
  icon: string;
};

const SORT_OPTIONS = [
  { value: "default", label: "ترتيب افتراضي" },
  { value: "price-asc", label: "السعر: من الأقل للأعلى" },
  { value: "price-desc", label: "السعر: من الأعلى للأقل" },
  { value: "name", label: "الاسم" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export default function MenuPageClient({
  categories,
  items,
  restaurantWhatsapp,
  restaurantName,
  restaurantSlug,
  restaurantId,
  restaurantLogo,
}: {
  categories: CategoryProp[];
  items: (MenuItemProp & { category: CategoryProp })[];
  restaurantWhatsapp?: string;
  restaurantName?: string;
  restaurantId: number;
  restaurantLogo?: string
  restaurantSlug?: string;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [orderItem, setOrderItem] = useState<MenuItemProp | null>(null);
  const [sort, setSort] = useState<SortKey>("default");
  const [showSort, setShowSort] = useState(false);
  const cart = useCart();

  const handleQuickAdd = (item: MenuItemProp) => {
    cart.addItem({
      itemId: item.id,
      name: item.nameAr || item.name,
      price: item.discountedPrice ?? item.price,
      image: item.image || undefined,
    });
    premiumToast("cart", "تمت الإضافة!", item.nameAr || item.name, { duration: 2000, anim: true });
  };

  const handleDecrement = (item: MenuItemProp) => {
    const existing = cart.items.find((i) => i.itemId === item.id);
    if (existing) {
      cart.updateQuantity(existing.id, existing.quantity - 1);
    }
  };

  const getCartQty = (itemId: number) => {
    return cart.items.find((i) => i.itemId === itemId)?.quantity ?? 0;
  };

  const handleScroll = useCallback(() => {
    // reserved for future scroll effects
  }, []);

  useEffect(() => {
    if (restaurantId) cart.setRestaurantDetails(restaurantId, restaurantWhatsapp || "", restaurantName || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      const matchesSearch =
        search === "" ||
        (item.nameAr || item.name).includes(search) ||
        (item.descriptionAr || item.description).includes(search);
      const matchesCategory =
        activeCategory === null || item.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });

    switch (sort) {
      case "price-asc":
        result.sort((a, b) => (a.discountedPrice ?? a.price) - (b.discountedPrice ?? b.price));
        break;
      case "price-desc":
        result.sort((a, b) => (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price));
        break;
      case "name":
        result.sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name));
        break;
    }
    return result;
  }, [items, search, activeCategory, sort]);

  const itemCounts = useMemo(() => {
    const counts = new Map<number | null, number>();
    counts.set(null, items.length);
    for (const cat of categories) {
      counts.set(cat.id, items.filter((i) => i.categoryId === cat.id).length);
    }
    return counts;
  }, [items, categories]);

  const hasActiveFilter = search !== "" || activeCategory !== null;

  return (
    <>
      <div className="relative mb-4 flex gap-2 items-start">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث في القائمة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 sm:h-12 pr-10 rounded-sm border border-border/30 bg-card/70 backdrop-blur-sm px-4 text-sm outline-none transition-all duration-300 focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20 shadow-sm"
          />
          {search && (
            <button
              type="button"
              aria-label="مسح البحث"
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-5 rounded-sm bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="ترتيب"
            aria-haspopup="listbox"
            aria-expanded={showSort}
            onClick={() => setShowSort(!showSort)}
            onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowSort(true); } }}
            className="h-11 sm:h-12 px-3 sm:px-4 rounded-sm border border-border/30 bg-card/70 backdrop-blur-sm text-sm font-medium hover:bg-accent transition-all flex items-center gap-2"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 7h18M6 12h12M10 17h4" strokeLinecap="round" />
            </svg>
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-48 sm:w-52 rounded-sm border border-border/30 bg-card shadow-xl animate-scale-in origin-top-right"
                role="listbox"
                aria-label="خيارات الترتيب"
                onKeyDown={(e) => {
                  const opts = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role='option']");
                  const cur = Array.from(opts).findIndex((o) => o === document.activeElement);
                  if (e.key === "ArrowDown") { e.preventDefault(); opts[(cur + 1) % opts.length]?.focus(); }
                  if (e.key === "ArrowUp") { e.preventDefault(); opts[(cur - 1 + opts.length) % opts.length]?.focus(); }
                  if (e.key === "Escape") { setShowSort(false); }
                }}>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    role="option"
                    type="button"
                    aria-selected={sort === opt.value}
                    onClick={() => { setSort(opt.value); setShowSort(false); }}
                    className={cn(
                      "w-full text-start px-4 py-3 text-sm transition-colors first:rounded-t-sm last:rounded-b-sm hover:bg-accent",
                      sort === opt.value && "bg-accent font-medium text-primary",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none snap-x snap-mandatory -mx-4 sm:mx-0 px-4 sm:px-0 relative">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={cn(
            "relative snap-start shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-sm text-xs sm:text-sm font-medium transition-colors duration-200",
            activeCategory === null ? "text-orange-foreground" : "bg-card/50 border border-border/30 hover:bg-orange-muted hover:border-orange/30",
          )}
        >
          {activeCategory === null && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 rounded-sm bg-orange"
              style={{ boxShadow: "0 4px 14px rgba(246,109,15,0.35)" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
            الكل
            <span className={cn(
              "inline-flex items-center justify-center size-4 sm:size-5 rounded-sm text-[10px] sm:text-[11px] font-bold",
              activeCategory === null ? "bg-background/20 text-foreground" : "bg-orange-muted text-orange dark:text-orange",
            )}>
              {toArabicNumber(itemCounts.get(null) ?? 0)}
            </span>
          </span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "relative snap-start shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-sm text-xs sm:text-sm font-medium transition-colors duration-200",
              activeCategory === cat.id ? "text-orange-foreground" : "bg-card/50 border border-border/30 hover:bg-orange-muted hover:border-orange/30",
            )}
          >
            {activeCategory === cat.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 rounded-sm bg-orange"
                style={{ boxShadow: "0 4px 14px rgba(246,109,15,0.35)" }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              {cat.nameAr || cat.name}
              <span className={cn(
                "inline-flex items-center justify-center size-4 sm:size-5 rounded-sm text-[10px] sm:text-[11px] font-bold",
                activeCategory === cat.id ? "bg-background/20 text-foreground" : "bg-orange-muted text-orange dark:text-orange",
              )}>
                {toArabicNumber(itemCounts.get(cat.id) ?? 0)}
              </span>
            </span>
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-16 sm:py-20 animate-fade-in">
          <div className="empty-state-icon">
            <Search />
          </div>
          <p className="text-muted-foreground text-base sm:text-lg font-medium mb-1">
            {search ? "لا توجد أصناف تطابق بحثك" : "لا توجد أصناف في هذه الفئة"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground/60">
            {search ? "جرب كلمات بحث أخرى" : "اختر فئة أخرى"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="animate-reveal"
              style={{ animationDelay: `${(index % 6) * 60}ms` }}
            >
              <MenuItemCard item={item} onOrder={setOrderItem} onAddToCart={handleQuickAdd} onDecrementCart={handleDecrement} cartQty={getCartQty(item.id)} />
            </div>
          ))}
        </div>
      )}

      <OrderDialog
        item={orderItem}
        open={orderItem !== null}
        onOpenChange={(open) => { if (!open) setOrderItem(null); }}
        restaurantWhatsapp={restaurantWhatsapp}
        restaurantName={restaurantName}
        restaurantId={restaurantId}
        restaurantLogo={restaurantLogo}
        restaurantSlug={restaurantSlug}
      />

      {/* ponytail: Reviews now handled via ReviewSheet in MenuItemCard */}
    </>
  );
}
