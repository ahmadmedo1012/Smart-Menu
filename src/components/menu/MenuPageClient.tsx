"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import MenuItemCard, { type MenuItemProp } from "./MenuItemCard";
import CartFloatingButton from "./CartFloatingButton";

type CategoryProp = {
  id: number;
  name: string;
  nameAr: string | null;
  icon: string;
};

export default function MenuPageClient({
  categories,
  items,
}: {
  categories: CategoryProp[];
  items: (MenuItemProp & { category: CategoryProp })[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        search === "" ||
        (item.nameAr || item.name).includes(search) ||
        (item.descriptionAr || item.description).includes(search);
      const matchesCategory =
        activeCategory === null || item.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">القائمة</h1>
        <p className="text-muted-foreground">تصفح أصنافنا واختر ما تريد</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث في القائمة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pr-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          الكل
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {cat.nameAr || cat.name}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <p className="text-muted-foreground">
            {search
              ? "لا توجد نتائج للبحث"
              : "لا توجد أصناف في هذه الفئة"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Floating Cart Button */}
      <CartFloatingButton />
    </div>
  );
}
