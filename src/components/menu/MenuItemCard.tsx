"use client";

import { useState, memo, createElement } from "react";
import { toArabicNumber } from "@/lib/format";
import { Coffee, Pizza, Beef, UtensilsCrossed, Fish, Apple, CupSoda, Milk, IceCream, Plus } from "lucide-react";

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
  "from-orange to-orange/80",
  "from-amber-500 to-amber-700",
  "from-orange to-orange/80",
  "from-rose-500 to-rose-700",
  "from-amber-600 to-amber-800",
  "from-red-500 to-red-700",
  "from-orange/80 to-orange/60",
  "from-yellow-500 to-yellow-700",
  "from-stone-500 to-stone-700",
];

const BGS = [
  "bg-red-50 dark:bg-red-950/20",
  "bg-orange/10 dark:bg-orange/10",
  "bg-green-50 dark:bg-green-950/20",
  "bg-orange/10 dark:bg-orange/10",
  "bg-purple-50 dark:bg-purple-950/20",
  "bg-teal-50 dark:bg-teal-950/20",
  "bg-pink-50 dark:bg-pink-950/20",
  "bg-indigo-50 dark:bg-indigo-950/20",
  "bg-sky-50 dark:bg-sky-950/20",
  "bg-cyan-50 dark:bg-cyan-950/20",
];

type IconComponent = typeof import("lucide-react").Coffee;

const FOOD_ICON_MAP: [RegExp, IconComponent][] = [
  [/قهوة|coffee|إسبريسو|espresso|كابتشينو|cappuccino|نسكافيه| latte/, Coffee],
  [/شاي|tea|lipton/, CupSoda],
  [/عصير|juice|ليموناضة|lemonade|سموثي|smoothie|موهيتو|mojito/, CupSoda],
  [/مشروب|drink|كولا|cola|بيبسي|pepsi|آيس|ice/, CupSoda],
  [/بيتزا|pizza/, Pizza],
  [/برجر|burger|ساندويتش|sandwich/, Beef],
  [/بطاطس|fries|potato/, UtensilsCrossed],
  [/سلطة|salad/, Apple],
  [/تشيز|cheese|كيك|cake|حلو|dessert/, IceCream],
  [/كنافة|kunafa/, IceCream],
  [/كريب|crepe/, IceCream],
  [/بسبوسة|basbousa/, IceCream],
  [/شربة|soup/, UtensilsCrossed],
  [/بازين|bazeen/, UtensilsCrossed],
  [/مبكبكة|mbakbaka/, UtensilsCrossed],
  [/كُسكُسي|couscous/, UtensilsCrossed],
  [/بريك|brik/, UtensilsCrossed],
  [/سوشي|sushi/, Fish],
  [/فطائر|pastry/, UtensilsCrossed],
  [/لحم|meat|steak/, Beef],
  [/دجاج|chicken/, Beef],
  [/سمك|fish/, Fish],
  [/فواكه|fruit/, Apple],
  [/مثلجات|ice cream|آيس كريم/, IceCream],
  [/خبز|bread/, UtensilsCrossed],
  [/جبن|cheese/, Milk],
  [/بيض|egg/, UtensilsCrossed],
  [/مقبلات|appetizer/, UtensilsCrossed],
  [/وجبة|meal|plate/, UtensilsCrossed],
];

function getFoodIcon(name: string): IconComponent {
  const lower = name.toLowerCase();
  for (const [pattern, icon] of FOOD_ICON_MAP) {
    if (pattern.test(lower)) return icon;
  }
  return UtensilsCrossed;
}

function Placeholder({ name }: { name: string }) {
  const idx = name.charCodeAt(0) % COLORS.length;
  const Icon = getFoodIcon(name);
  const el = <div className={`flex size-full items-center justify-center bg-gradient-to-br ${COLORS[idx]}`}>
    {createElement(Icon, { className: "size-8 md:size-10 text-white/80 drop-shadow-sm" })}
  </div>;
  return el;
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
      className="group relative flex gap-3.5 w-full rounded-md bg-card p-3.5 text-start cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-orange-muted active:scale-[0.98] border border-border/30 hover:border-orange/30 overflow-hidden"
      onClick={() => onOrder(item)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOrder(item); } }}
    >
      <div className={`absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${BGS[colorIdx]}`} />

      <div className="relative shrink-0 size-24 md:size-28 rounded-md overflow-hidden shadow-sm ring-1 ring-foreground/5 group-hover:ring-orange/30 group-hover:shadow-lg group-hover:shadow-orange-muted transition-all duration-300">
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
          <Placeholder name={displayName} />
        )}

        {hasDiscount && (
          <div className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-lg">
            -{Math.round((1 - item.discountedPrice! / item.price) * 100)}%
          </div>
        )}
      </div>

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

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(item);
            }}
            aria-label={`إضافة ${displayName} إلى السلة`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-[11px] sm:text-xs font-medium bg-primary/5 text-primary border border-primary/10 transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/25 active:scale-95"
          >
            <Plus className="size-3" />
            أضف
          </button>
        </div>
      </div>
    </div>
  );
});

export default MenuItemCard;
export { MenuItemCard };
