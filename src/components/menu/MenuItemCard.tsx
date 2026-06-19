"use client";

import { useState, memo } from "react";
import { toArabicNumber } from "@/lib/format";
import { Plus, Star } from "lucide-react";

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

const COLORS = [
  "from-red-400 to-red-600",
  "from-blue-400 to-blue-600",
  "from-green-400 to-green-600",
  "from-amber-400 to-amber-600",
  "from-purple-400 to-purple-600",
  "from-teal-400 to-teal-600",
  "from-pink-400 to-pink-600",
  "from-indigo-400 to-indigo-600",
  "from-orange-400 to-orange-600",
  "from-cyan-400 to-cyan-600",
];

const BGS = [
  "bg-red-50 dark:bg-red-950/20",
  "bg-blue-50 dark:bg-blue-950/20",
  "bg-green-50 dark:bg-green-950/20",
  "bg-amber-50 dark:bg-amber-950/20",
  "bg-purple-50 dark:bg-purple-950/20",
  "bg-teal-50 dark:bg-teal-950/20",
  "bg-pink-50 dark:bg-pink-950/20",
  "bg-indigo-50 dark:bg-indigo-950/20",
  "bg-orange-50 dark:bg-orange-950/20",
  "bg-cyan-50 dark:bg-cyan-950/20",
];

const FOOD_EMOJI_MAP: [RegExp, string][] = [
  [/قهوة|coffee|إسبريسو|espresso|كابتشينو|cappuccino|نسكافيه| latte/, "☕"],
  [/شاي|tea|lipton/, "🫖"],
  [/عصير|juice|ليموناضة|lemonade|سموثي|smoothie|موهيتو|mojito/, "🧃"],
  [/مشروب|drink|كولا|cola|بيبسي|pepsi|آيس|ice/, "🥤"],
  [/بيتزا|pizza/, "🍕"],
  [/برجر|burger|ساندويتش|sandwich/, "🍔"],
  [/بطاطس|fries|potato/, "🍟"],
  [/سلطة|salad/, "🥗"],
  [/تشيز|cheese|كيك|cake|حلو|dessert/, "🍰"],
  [/كنافة|kunafa/, "🍯"],
  [/كريب|crepe/, "🥞"],
  [/بسبوسة|basbousa/, "🧁"],
  [/شربة|soup/, "🍜"],
  [/بازين|bazeen/, "🍲"],
  [/مبكبكة|mbakbaka/, "🍝"],
  [/كُسكُسي|couscous/, "🍚"],
  [/بريك|brik/, "🥟"],
  [/سوشي|sushi/, "🍣"],
  [/فطائر|pastry/, "🥐"],
  [/لحم|meat|steak/, "🥩"],
  [/دجاج|chicken/, "🍗"],
  [/سمك|fish/, "🐟"],
  [/فواكه|fruit/, "🍉"],
  [/مثلجات|ice cream|آيس كريم/, "🍦"],
  [/خبز|bread/, "🍞"],
  [/جبن|cheese/, "🧀"],
  [/بيض|egg/, "🥚"],
  [/مقبلات|appetizer/, "🥨"],
  [/وجبة|meal|plate/, "🍽️"],
];

function getFoodEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [pattern, emoji] of FOOD_EMOJI_MAP) {
    if (pattern.test(lower)) return emoji;
  }
  return "🍽️";
}

function Placeholder({ name }: { name: string }) {
  const idx = name.charCodeAt(0) % COLORS.length;
  const emoji = getFoodEmoji(name);
  return (
    <div
      className={`flex size-full items-center justify-center bg-gradient-to-br ${COLORS[idx]} text-3xl md:text-4xl`}
    >
      {emoji}
    </div>
  );
}

const MenuItemCard = memo(function MenuItemCard({
  item,
  onOrder,
  onAddToCart,
}: {
  item: MenuItemProp;
  onOrder: (item: MenuItemProp) => void;
  onAddToCart: (item: MenuItemProp) => void;
}) {
  const displayName = item.nameAr || item.name;
  const displayDesc = item.descriptionAr || item.description;
  const currentPrice = item.discountedPrice ?? item.price;
  const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const colorIdx = displayName.charCodeAt(0) % COLORS.length;

  return (
    <div
      className="group relative flex gap-4 w-full rounded-2xl bg-card p-4 text-right cursor-pointer transition-all duration-400 hover:-translate-y-2 hover:shadow-xl hover:shadow-amber-500/12 active:scale-[0.98] border border-border/30 hover:border-amber-300/40 shine-sweep"
      onClick={() => onOrder(item)}
    >
      {/* Subtle gradient overlay on hover */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${BGS[colorIdx]}`} />

      {/* Image / Placeholder */}
      <div className="relative shrink-0 size-28 md:size-32 rounded-xl overflow-hidden shadow-md ring-1 ring-foreground/5 group-hover:ring-amber-300/40 group-hover:shadow-lg group-hover:shadow-amber-500/10 transition-all duration-400">
        {item.image && !imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-breath" />
            )}
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
          <Placeholder name={displayName} />
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
            -{Math.round((1 - item.discountedPrice! / item.price) * 100)}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Name and price row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-base md:text-lg leading-snug line-clamp-2">
              {displayName}
            </h3>
          </div>

          {/* Description */}
          {displayDesc ? (
            <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed mb-2">
              {displayDesc}
            </p>
          ) : null}

          {/* Tags row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground/60 line-through">
                {toArabicNumber(item.price.toFixed(1))} د.ل
              </span>
            )}
          </div>
        </div>

        {/* Bottom row: price + order button */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-primary tabular-nums">
              {toArabicNumber(currentPrice.toFixed(1))}
            </span>
            <span className="text-xs text-muted-foreground">د.ل</span>
          </div>

          <span
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium bg-primary/5 text-primary border border-primary/10 transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/25 hover:scale-105 min-h-[44px]"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(item);
            }}
          >
            <Plus className="size-4" />
            أضف
          </span>
        </div>
      </div>
    </div>
  );
});

export default MenuItemCard;
export { MenuItemCard };
