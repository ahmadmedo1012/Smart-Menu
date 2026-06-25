"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, MessageCircle, Sparkles, X, ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";
import { toast } from "sonner";
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
  const [showFloatingWa, setShowFloatingWa] = useState(false);
  const [sort, setSort] = useState<SortKey>("default");
  const [showSort, setShowSort] = useState(false);
  const cart = useCart();
  const setRestaurantDetails = cart.setRestaurantDetails;

  const handleQuickAdd = (item: MenuItemProp) => {
    cart.addItem({
      itemId: item.id,
      name: item.nameAr || item.name,
      price: item.discountedPrice ?? item.price,
      image: item.image || undefined,
    });
    toast.success(
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-gradient-to-br from-gold to-gold/80 flex items-center justify-center shrink-0">
          <ShoppingCart className="size-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm">تمت الإضافة!</p>
          <p className="text-xs text-muted-foreground">{item.nameAr || item.name}</p>
        </div>
      </div>,
      { duration: 2000 }
    );
  };

  const handleScroll = useCallback(() => {
    setShowFloatingWa(window.scrollY > 300);
  }, []);

  useEffect(() => {
    if (restaurantId) setRestaurantDetails(restaurantId, restaurantWhatsapp || "", restaurantName || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Sort & filter
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

  const waNumber = restaurantWhatsapp?.replace(/^\+/, "");
  const hasActiveFilter = search !== "" || activeCategory !== null;

  return (
    <>
      {/* Search + Sort bar — sticky */}
      <div className="relative mb-4 flex gap-2 items-start">
        <div className="flex-1 relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث في القائمة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pr-11 rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl px-4 text-sm outline-none transition-all duration-300 focus-visible:border-gold focus-visible:ring-4 focus-visible:ring-blue-500/20 shadow-sm"
          />
          {search && (
            <button
              type="button"
              aria-label="مسح البحث"
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label="ترتيب"
            aria-haspopup="listbox"
            aria-expanded={showSort}
            onClick={() => setShowSort(!showSort)}
            onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowSort(true); } }}
            className="h-12 px-4 rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl text-sm font-medium hover:bg-accent transition-all flex items-center gap-2"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 7h18M6 12h12M10 17h4" strokeLinecap="round" />
            </svg>
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl border border-border/30 bg-card shadow-xl animate-scale-in origin-top-right"
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
                      "w-full text-start px-4 py-3 text-sm transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-accent",
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

      {/* Active filters indicator */}
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
              className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              إعادة تعيين
            </button>
          )}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none snap-x snap-mandatory">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={cn(
            "snap-start shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
            activeCategory === null
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105"
              : "glass-card hover:bg-gold-muted",
          )}
        >
          <span className="flex items-center gap-2">
            الكل
            <span
              className={cn(
                "inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold",
                activeCategory === null
                  ? "bg-background/20 text-foreground"
                  : "bg-gold-muted text-gold dark:text-gold",
              )}
            >
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
              "snap-start shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
              activeCategory === cat.id
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105"
                : "glass-card hover:bg-gold-muted",
            )}
          >
            <span className="flex items-center gap-2">
              {cat.nameAr || cat.name}
              <span
                className={cn(
                  "inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold",
                  activeCategory === cat.id
                    ? "bg-background/20 text-foreground"
                    : "bg-gold-muted text-gold dark:text-gold",
                )}
              >
                {toArabicNumber(itemCounts.get(cat.id) ?? 0)}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="empty-state-icon">
            <Search />
          </div>
          <p className="text-muted-foreground text-lg font-medium mb-1">
            {search ? "لا توجد أصناف تطابق بحثك" : "لا توجد أصناف في هذه الفئة"}
          </p>
          <p className="text-sm text-muted-foreground/60">
            {search ? "جرب كلمات بحث أخرى" : "اختر فئة أخرى"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="animate-reveal"
              style={{ animationDelay: `${(index % 6) * 80}ms` }}
            >
              <MenuItemCard item={item} onOrder={setOrderItem} onAddToCart={handleQuickAdd} />
            </div>
          ))}
        </div>
      )}

      {/* Order Dialog */}
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

      {/* Floating WhatsApp */}
      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent("مرحباً، أود الاستفسار عن القائمة")}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] end-6 z-[59] size-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white flex items-center justify-center shadow-xl shadow-green-500/30 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-green-500/40 active:scale-95",
            showFloatingWa
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8 pointer-events-none",
          )}
          aria-label="واتساب"
        >
          <MessageCircle className="size-7" />
        </a>
      )}
    </>
  );
}
