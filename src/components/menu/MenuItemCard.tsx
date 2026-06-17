"use client";

import { useCart } from "@/store/cart";

export type MenuItemProp = {
  id: number;
  name: string;
  nameAr: string | null;
  description: string;
  descriptionAr: string;
  price: number;
  discountedPrice: number | null;
  image: string;
  categoryId: number;
};

export default function MenuItemCard({ item }: { item: MenuItemProp }) {
  const addItem = useCart((s) => s.addItem);

  const displayName = item.nameAr || item.name;
  const displayDesc = item.descriptionAr || item.description;
  const currentPrice = item.discountedPrice ?? item.price;

  return (
    <div className="flex gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-all duration-200 hover:shadow-md">
      {item.image ? (
        <div className="size-20 shrink-0 rounded-lg bg-muted overflow-hidden">
          <img
            src={item.image}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold truncate">{displayName}</h3>
          <span className="shrink-0 font-semibold text-primary text-nowrap">
            {currentPrice} ر.س
          </span>
        </div>
        {displayDesc ? (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
            {displayDesc}
          </p>
        ) : null}
        {item.discountedPrice ? (
          <p className="text-xs text-muted-foreground line-through mb-2">
            {item.price} ر.س
          </p>
        ) : null}
        <button
          onClick={() =>
            addItem({
              itemId: item.id,
              name: displayName,
              price: currentPrice,
              image: item.image || undefined,
            })
          }
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          أضف إلى السلة +
        </button>
      </div>
    </div>
  );
}
