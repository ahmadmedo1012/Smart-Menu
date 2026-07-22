"use client";

import { useState, memo, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";
import { Plus, Minus, Star } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import ReviewSheet from "./ReviewSheet";

/* ponytail: shared spring config — deduped from 3 inline copies */
const CARD_SPRING = { type: "spring" as const, stiffness: 500, damping: 25 };
const HOVER_SPRING = { type: "spring" as const, stiffness: 300, damping: 20 };

/* ponytail: 3D-tilt spring */
const TILT_SPRING = { stiffness: 200, damping: 30 };

const DIETARY_ICONS: Record<string, string> = {
  vegetarian: "🌿", vegan: "🌱", gluten_free: "🌾", dairy_free: "🧀",
  halal: "☪️", keto: "🥑", sugar_free: "🚫", organic: "🌍",
  spicy: "🌶️", sugarconscious: "🍃",
};

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
  avgRating?: number | null;
  ratingCount?: number;
  dietaryTags?: string[];
  allergens?: string[];
};

const MenuItemCard = memo(function MenuItemCard({
  item,
  onOrder,
  onAddToCart,
  onDecrementCart,
  cartQty = 0,
  variant,
}: {
  item: MenuItemProp;
  onOrder: (item: MenuItemProp) => void;
  onAddToCart: (item: MenuItemProp) => void;
  onDecrementCart?: (item: MenuItemProp) => void;
  cartQty?: number;
  variant?: "default" | "featured";
}) {
  const displayName = item.nameAr || item.name;
  const displayDesc = item.descriptionAr || item.description;
  const currentPrice = item.discountedPrice ?? item.price;
  const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;
  const hasRating = item.avgRating != null && item.ratingCount != null && item.ratingCount > 0;
  const [imageError, setImageError] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewSheetItem, setReviewSheetItem] = useState<{id: number; name: string} | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /* ponytail: 3D tilt via mouse position */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), TILT_SPRING);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), TILT_SPRING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => { mx.set(0); my.set(0); };

  const isFeatured = variant === "featured";

  return (
    <motion.div
      ref={cardRef}
      /* tiltIn entrance */
      initial={{ opacity: 0, y: 40, rotateX: -5 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      style={{ perspective: 1000, rotateX, rotateY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -10, scale: 1.02, transition: HOVER_SPRING }}
      whileTap={{ scale: 0.97, transition: HOVER_SPRING }}
      className={cn(
        "group relative flex w-full cursor-pointer overflow-hidden rounded-xl flex-col",
        /* glassmorphism base */
        "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
        "border border-white/40 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20",
        /* hover glow */
        "hover:border-orange-400/50 dark:hover:border-orange-500/40",
        "hover:shadow-orange-400/15 dark:hover:shadow-orange-500/20 hover:shadow-2xl",
        "transition-shadow duration-500",
        /* shimmer sweep — slides across on hover */
        "after:absolute after:inset-0 after:pointer-events-none",
        "after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300",
        "after:bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.15)_50%,transparent_65%)]",
        "after:-translate-x-full group-hover:after:translate-x-full after:transition-transform after:duration-700 after:ease-in-out",
        isFeatured && "md:col-span-2",
      )}
      onClick={() => onOrder(item)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOrder(item); } }}
    >
      {/* Image — aspect-4/3 with zoom */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-125">
          {item.image && !imageError ? (
            <OptimizedImage
              src={item.image}
              alt={displayName}
              aspectRatio="square"
              skeleton
              fallback={<span className="text-2xl text-orange/40">🍽️</span>}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-muted/30 via-orange-muted/10 to-transparent">
              <div className="text-3xl opacity-40">🍽️</div>
            </div>
          )}
        </div>

        {/* Gradient overlay — fades into glass below */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Badges — top-start with glass backdrop */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5 z-10">
          {item.isPopular && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={CARD_SPRING}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-orange/85 dark:bg-orange/90 backdrop-blur-sm text-white shadow-lg flex items-center gap-1"
            >
              <Star className="size-2.5 fill-current" />
              الأكثر طلباً
            </motion.span>
          )}
          {item.isNew && !item.isPopular && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...CARD_SPRING, delay: 0.1 }}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/85 dark:bg-emerald-500/90 backdrop-blur-sm text-white shadow-lg"
            >
              🆕 جديد
            </motion.span>
          )}
        </div>

        {/* Discount badge — top-end */}
        {hasDiscount && (
          <div className="absolute top-3 end-3 z-10 bg-destructive/85 backdrop-blur-sm text-destructive-foreground text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg">
            -{toArabicNumber(Math.round((1 - item.discountedPrice! / item.price) * 100))}%
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="relative z-10 p-4 flex flex-col gap-2">
        {/* Name + Rating glass-pill */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg leading-snug line-clamp-1">
            {displayName}
          </h3>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setReviewSheetItem({ id: item.id, name: displayName }); setReviewSheetOpen(true); }}
            aria-label={`تقييم ${displayName}`}
            className={cn(
              "shrink-0 flex items-center gap-1 text-xs font-bold rounded-xl px-2.5 py-1 border transition-all duration-300",
              "bg-white/20 dark:bg-white/10 backdrop-blur-md border-white/30 dark:border-white/10 shadow-sm",
              hasRating
                ? "text-amber-600 dark:text-amber-400 hover:bg-white/30 dark:hover:bg-white/20"
                : "text-muted-foreground/60 hover:text-amber-500 hover:bg-white/20",
            )}
          >
            <Star className={cn("size-3", hasRating && "fill-amber-500 dark:fill-amber-400")} aria-hidden="true" />
            {hasRating ? toArabicNumber(item.avgRating!.toFixed(1)) : "قيّم"}
          </button>
        </div>

        {/* Description */}
        {displayDesc ? (
          <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
            {displayDesc}
          </p>
        ) : null}

        {/* Dietary tags + allergens — glass pills */}
        {((item.dietaryTags && item.dietaryTags.length > 0) || (item.allergens && item.allergens.length > 0)) && (
          <div className="flex flex-wrap gap-1.5">
            {item.dietaryTags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              >
                {DIETARY_ICONS[tag] || "🌿"} {tag}
              </span>
            ))}
            {item.allergens?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 backdrop-blur-sm text-amber-600 dark:text-amber-400 border border-amber-500/20"
              >
                ⚠️ {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-bold text-primary group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-300 tabular-nums">
            {toArabicNumber(currentPrice.toFixed(1))}
          </span>
          <span className="text-xs text-muted-foreground">د.ل</span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground/40 line-through">
              {toArabicNumber(item.price.toFixed(1))} د.ل
            </span>
          )}
        </div>

        {/* Animated CTA / Quantity counter */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {cartQty === 0 ? (
              <motion.button
                key="cta"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={CARD_SPRING}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(item);
                }}
                aria-label={`إضافة ${displayName} إلى السلة`}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange text-white shadow-lg hover:shadow-orange/30 hover:brightness-110 active:scale-95 transition-all duration-200"
              >
                <Plus className="size-4" />
                أضف
              </motion.button>
            ) : (
              <motion.div
                key="counter"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={CARD_SPRING}
                className="flex items-center rounded-xl overflow-hidden border border-orange bg-orange shadow-lg"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecrementCart?.(item);
                  }}
                  aria-label={`إنقاص كمية ${displayName}`}
                  className="flex items-center justify-center size-11 text-white hover:brightness-110 transition-colors active:brightness-90"
                >
                  <Minus className="size-4" />
                </button>
                <span className="flex-1 min-w-[2ch] text-center text-sm font-bold text-white bg-orange tabular-nums leading-none py-1.5">
                  {toArabicNumber(cartQty)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(item);
                  }}
                  aria-label={`زيادة كمية ${displayName}`}
                  className="flex items-center justify-center size-11 text-white hover:brightness-110 transition-colors active:brightness-90"
                >
                  <Plus className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ReviewSheet
        menuItemId={reviewSheetItem?.id ?? 0}
        menuItemName={reviewSheetItem?.name ?? ""}
        open={reviewSheetOpen}
        onOpenChange={(o) => { if (!o) { setReviewSheetOpen(false); setReviewSheetItem(null); } }}
      />
    </motion.div>
  );
});

export default MenuItemCard;
