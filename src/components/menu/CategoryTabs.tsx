"use client"

import { motion, LayoutGroup } from "framer-motion"
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

function TabIcon({ icon }: { icon: string }) {
  if (!icon) return null
  // Direct emoji render
  if (/^\p{Emoji}/u.test(icon)) {
    return <span className="size-3.5 sm:size-4 flex items-center justify-center text-sm">{icon}</span>
  }
  // Try lucide icon map
  const mapped = ICON_MAP[icon.toLowerCase().replace(/[-_\s]/g, "")]
  if (mapped) {
    const Icon = mapped.icon
    return <Icon className="size-3.5 sm:size-4" />
  }
  // Fallback to rendering the raw string as text
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
          "flex gap-1 overflow-x-auto pb-3 mb-6 scrollbar-none snap-x snap-mandatory -mx-4 sm:mx-0 px-4 sm:px-0",
          /* sticky on desktop only (below StickyMenuHeader), normal on mobile */
          "md:sticky md:top-14 md:z-20 md:bg-background/85 md:backdrop-blur-sm md:pt-3 md:-mx-6 md:px-6",
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
        "relative snap-start shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors duration-200",
        isActive
          ? "text-orange-foreground"
          : "hover:bg-orange-muted/40",
      )}
    >
      {isActive && (
        <motion.div
          layoutId="active-tab"
          className="absolute inset-1 rounded-full bg-orange"
          style={{ boxShadow: "0 4px 18px rgba(246,109,15,0.4)" }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
        {icon && <TabIcon icon={icon} />}
        {label}
        <span
          className={cn(
            "inline-flex items-center justify-center size-4 sm:size-5 rounded-sm text-[10px] sm:text-[11px] font-bold",
            isActive
              ? "bg-background/20 text-foreground"
              : "bg-orange-muted text-orange dark:text-orange",
          )}
        >
          {toArabicNumber(count)}
        </span>
      </span>
    </button>
  )
}
