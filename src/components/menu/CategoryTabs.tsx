"use client"

import { motion, LayoutGroup } from "framer-motion"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

type CategoryProp = { id: number; name: string; nameAr: string | null; icon: string }

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
  count,
  isActive,
  onClick,
}: {
  label: string
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
