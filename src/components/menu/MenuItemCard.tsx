"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toArabicNumber } from "@/lib/format";
import { Plus, Minus, UtensilsCrossed, Star } from "lucide-react";

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
  isPopular?: boolean;
  isNew?: boolean;
  createdAt?: string;
};

const MenuItemCard = memo(function MenuItemCard({
  item,
  onOrder,
  onAddToCart,
  onDecrementCart,
  cartQty = 0,
}: {
  item: MenuItemProp;
  onOrder: (item: MenuItemProp) => void;
  onAddToCart: (item: MenuItemProp) => void;
  onDecrementCart?: (item: MenuItemProp) => void;
  cartQty?: number;
}) {
  const displayName = item.nameAr || item.name;
  const displayDesc = item.descriptionAr || item.description;
  const currentPrice = item.discountedPrice ?? item.price;
  const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="group relative flex gap-3.5 w-full rounded-sm bg-card p-3.5 text-start cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-orange-muted active:scale-[0.98] border border-border/20 hover:border-orange/30 overflow-hidden"
      onClick={() => onOrder(item)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOrder(item); } }}
    >
      {/* Image container */}
      <div className="relative shrink-0 size-24 md:size-28 rounded-[4px] overflow-hidden shadow-sm ring-1 ring-foreground/5 group-hover:ring-orange/30 group-hover:shadow-lg group-hover:shadow-orange-muted transition-all duration-300">
        {item.image && !imageError ? (
          <>
            {!imageLoaded && <div className="absolute inset-0 skeleton" />}
            <img
              src={item.image}
              alt={displayName}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            <UtensilsCrossed className="size-7 md:size-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Badges — top end (left in RTL) */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          <AnimatePresence>
            {item.isPopular && (
              <motion.span
                key="popular"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-500 text-white shadow-lg flex items-center gap-0.5"
              >
                <Star className="size-2.5 fill-current" />
                الأكثر طلباً
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {item.isNew && !item.isPopular && (
              <motion.span
                key="new"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500 text-white shadow-lg"
              >
                🆕 جديد
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Discount badge — top start (right in RTL) */}
        {hasDiscount && (
          <div className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-lg">
            -{Math.round((1 - item.discountedPrice! / item.price) * 100)}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-between gap-1">
        <div>
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="font-bold text-sm md:text-base leading-snug line-clamp-1">
              {displayName}
            </h3>
          </div>

          {displayDesc ? (
            <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed mb-1.5">
              {displayDesc}
            </p>
          ) : null}

          <div className="flex items-center gap-1.5 flex-wrap">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground/40 line-through">
                {toArabicNumber(item.price.toFixed(1))} د.ل
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-baseline gap-0.5">
            <span className="text-base md:text-lg font-bold text-primary tabular-nums">
              {toArabicNumber(currentPrice.toFixed(1))}
            </span>
            <span className="text-[11px] text-muted-foreground">د.ل</span>
          </div>

          {/* Animated CTA / Quantity counter */}
          <div className="min-w-[88px]">
            <AnimatePresence mode="wait">
              {cartQty === 0 ? (
                <motion.button
                  key="cta"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(item);
                  }}
                  aria-label={`إضافة ${displayName} إلى السلة`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-sm text-[11px] sm:text-xs font-bold bg-orange-500 text-white border border-orange-500 transition-all duration-300 hover:bg-orange-600 hover:border-orange-600 hover:shadow-lg hover:shadow-orange/25 active:scale-95"
                >
                  <Plus className="size-3.5" />
                  أضف
                </motion.button>
              ) : (
                <motion.div
                  key="counter"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-0 rounded-sm overflow-hidden border border-orange-500 bg-orange-500"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDecrementCart?.(item);
                    }}
                    aria-label={`إنقاص كمية ${displayName}`}
                    className="flex items-center justify-center size-7 md:size-8 text-white hover:bg-orange-600 transition-colors active:bg-orange-700"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="flex-1 min-w-[2ch] text-center text-xs md:text-sm font-bold text-white bg-orange-500 tabular-nums leading-none py-1.5">
                    {toArabicNumber(cartQty)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(item);
                    }}
                    aria-label={`زيادة كمية ${displayName}`}
                    className="flex items-center justify-center size-7 md:size-8 text-white hover:bg-orange-600 transition-colors active:bg-orange-700"
                  >
                    <Plus className="size-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MenuItemCard;
export { MenuItemCard };
