"use client"

import { motion, LayoutGroup } from "motion/react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import {
  Coffee, CupSoda, Pizza, Beef, Milk, Apple, Cookie, Soup, Package,
  type LucideIcon,
} from "lucide-react"

type CategoryProp = { id: number; name: string; nameAr: string | null; icon: string }

// Map stored icon strings to lucide icons + known emoji
const ICON_MAP: Record<string, { icon: LucideIcon; fallback: string }> = {
  coffee: { icon: Coffee, fallback: "☕" },
  "soft-drink": { icon: CupSoda, fallback: "🥤" },
  cup: { icon: CupSoda, fallback: "🥤" },
  cupsoda: { icon: CupSoda, fallback: "🥤" },
  pizza: { icon: Pizza, fallback: "🍕" },
  beef: { icon: Beef, fallback: "🥩" },
  milk: { icon: Milk, fallback: "🥛" },
  apple: { icon: Apple, fallback: "🍎" },
  cake: { icon: Cookie, fallback: "🍰" },
  bread: { icon: Cookie, fallback: "🍞" },
  soup: { icon: Soup, fallback: "🍲" },
  package: { icon: Package, fallback: "📦" },
}

// Map common emoji category icons to lucide icons so tabs render crisp SVG
// instead of platform emoji (matches Open Design emoji-slop rule).
const EMOJI_MAP: Record<string, LucideIcon> = {
  "☕": Coffee,
  "🧃": CupSoda,
  "🥤": CupSoda,
  "🍰": Cookie,
  "🍕": Pizza,
  "🍔": Beef,
  "🥩": Beef,
  "🍞": Cookie,
  "🍎": Apple,
  "🍲": Soup,
  "🥛": Milk,
  "📦": Package,
  "🍟": Soup,
  "🍝": Soup,
  "🥗": Soup,
  "🍦": Cookie,
  "🍧": Cookie,
  "🧁": Cookie,
  "🍪": Cookie,
  "🥧": Cookie,
}

function TabIcon({ icon }: { icon: string }) {
  if (!icon) return null
  // Prefer a crisp lucide SVG for known emoji icon values (Open Design)
  if (/^\p{Emoji}/u.test(icon)) {
    const mapped = EMOJI_MAP[icon]
    if (mapped) {
      const Icon = mapped
      return <Icon className="size-3.5 sm:size-4" strokeWidth={2.4} />
    }
    return <span className="size-3.5 sm:size-4 flex items-center justify-center text-sm">{icon}</span>
  }
  const mapped = ICON_MAP[icon.toLowerCase().replace(/[-_\s]/g, "")]
  if (mapped) {
    const Icon = mapped.icon
    return <Icon className="size-3.5 sm:size-4" strokeWidth={2.4} />
  }
  return <span className="text-[10px] sm:text-xs">{icon.slice(0, 2)}</span>
}

interface CategoryTabsProps {
  categories: CategoryProp[]
  activeCategory: number | null
  onSelect: (id: number | null) => void
  itemCounts: Map<number | null, number>
  className?: string
}

export function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
  itemCounts,
  className,
}: CategoryTabsProps) {
  return (
    <LayoutGroup>
      <div
        className={cn(
          /* glass pill strip */
          "flex gap-1.5 overflow-x-auto pb-3 mb-6 scrollbar-none snap-x snap-mandatory -mx-4 sm:mx-0 px-4 sm:px-0",
          /* sticky below StickyMenuHeader (z-30). glass background */
          "md:sticky md:top-14 md:z-20 md:bg-background/80 md:backdrop-blur-xl md:pt-3 md:-mx-6 md:px-6",
          className,
        )}
      >
        <TabButton
          label="الكل"
          count={itemCounts.get(null) ?? 0}
          isActive={activeCategory === null}
          onClick={() => onSelect(null)}
        />
        {categories.map((cat) => (
          <TabButton
            key={cat.id}
            label={cat.nameAr || cat.name}
            icon={cat.icon}
            count={itemCounts.get(cat.id) ?? 0}
            isActive={activeCategory === cat.id}
            onClick={() => onSelect(cat.id)}
          />
        ))}
      </div>
    </LayoutGroup>
  )
}

function TabButton({
  label,
  icon,
  count,
  isActive,
  onClick,
}: {
  label: string
  icon?: string
  count: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative snap-start shrink-0",
        /* premium glass pill */
        "px-4 sm:px-5 py-2.5 sm:py-3 min-h-11 rounded-full",
        "text-xs sm:text-sm font-medium transition-all duration-200",
        /* hover + active with scale */
        isActive
          ? "bg-orange text-white shadow-lg shadow-orange/30 scale-105"
          : "bg-background/60 hover:bg-orange/10 hover:scale-[1.03]",
      )}
    >
      {isActive && (
        <motion.div
          layoutId="active-tab"
          className="absolute inset-0 rounded-full bg-orange"
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
        {icon && <TabIcon icon={icon} />}
        {label}
        <span
          className={cn(
            "inline-flex items-center justify-center size-4 sm:size-5 rounded-sm text-[10px] sm:text-[11px] font-bold transition-colors duration-200",
            isActive
              ? "bg-white/20 text-white"
              : "bg-muted/50 text-orange dark:text-orange",
          )}
        >
          {toArabicNumber(count)}
        </span>
      </span>
    </button>
  )
}
