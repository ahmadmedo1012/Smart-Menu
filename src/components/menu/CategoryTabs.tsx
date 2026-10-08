"use client"

import { m, LayoutGroup } from "motion/react"
import { LayoutMotion } from "@/components/motion/LazyMotionProvider"
import { useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import {
  Coffee, CupSoda, Pizza, Beef, Milk, Apple, Cookie, Soup, Package, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"

type CategoryProp = { id: number; name: string; nameAr: string | null; icon: string }

// Map stored icon strings to lucide icons
// r96-W4b: dead emoji `fallback` fields removed — every path renders an SVG now
const ICON_MAP: Record<string, LucideIcon> = {
  coffee: Coffee,
  "soft-drink": CupSoda,
  cup: CupSoda,
  cupsoda: CupSoda,
  pizza: Pizza,
  beef: Beef,
  milk: Milk,
  apple: Apple,
  cake: Cookie,
  bread: Cookie,
  soup: Soup,
  package: Package,
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
  "🍽": UtensilsCrossed,
  "🍽️": UtensilsCrossed, // F-D/round91: seed uses 1F37D+FE0F (المأكولات) — was falling through to the raw-emoji branch
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
    // r96-W4b: unmapped emoji → generic SVG, never raw emoji
    return <UtensilsCrossed className="size-3.5 sm:size-4" strokeWidth={2.4} />
  }
  const mapped = ICON_MAP[icon.toLowerCase().replace(/[-_\s]/g, "")]
  if (mapped) {
    const Icon = mapped
    return <Icon className="size-3.5 sm:size-4" strokeWidth={2.4} />
  }
  // r96-W4b: unrecognized string → generic SVG instead of raw text slice
  return <UtensilsCrossed className="size-3.5 sm:size-4" strokeWidth={2.4} />
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
  const tabsRef = useRef<HTMLDivElement>(null)

  const handleSelect = useCallback((id: number | null) => {
    onSelect(id)
    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, 50)
  }, [onSelect])

  return (
    <LayoutGroup>
      {/* a11y decision: these are FILTER buttons, not ARIA tabs — selecting one
          filters a single list in place instead of swapping labelled panels, so
          role="tablist"/"tab" would promise tabpanel semantics that don't exist.
          Pattern used instead: a named toolbar group + aria-pressed toggle buttons
          (APG "toggle button" filter pattern), which screen readers announce as
          "pressed/not pressed" without the tab-panel contract. */}
      <div
        ref={tabsRef}
        role="group"
        aria-label="تصفية الأصناف حسب القسم"
        aria-describedby="category-tabs-hint"
        className={cn(
          /* glass pill strip */
          "flex gap-1.5 overflow-x-auto pb-3 mb-6 scrollbar-none snap-x snap-mandatory -mx-4 sm:mx-0 px-4 sm:px-0",
          /* sticky below StickyMenuHeader (z-30). glass background */
          "md:sticky md:top-14 md:z-20 md:bg-background/80 md:backdrop-blur-xl md:pt-3 md:-mx-6 md:px-6",
          className,
        )}
      >
        {/* sr-only hint so SR users understand the group filters the list below */}
        <span id="category-tabs-hint" className="sr-only">
          اختيار قسم يعرض أصنافه فقط في القائمة أدناه
        </span>
        <TabButton
          label="الكل"
          count={itemCounts.get(null) ?? 0}
          isActive={activeCategory === null}
          onClick={() => handleSelect(null)}
        />
        {categories.map((cat) => (
          <TabButton
            key={cat.id}
            label={cat.nameAr || cat.name}
            icon={cat.icon}
            count={itemCounts.get(cat.id) ?? 0}
            isActive={activeCategory === cat.id}
            onClick={() => handleSelect(cat.id)}
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
      aria-pressed={isActive}
      className={cn(
        "relative snap-start shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
        /* premium glass pill */
        "px-4 sm:px-5 py-2.5 sm:py-3 min-h-11 rounded-full",
        "text-xs sm:text-sm font-medium transition-[color,background-color,transform,translate,scale,rotate,box-shadow] duration-fast",
        /* hover + active with scale — r97-X1: active bg-orange removed: the
           layoutId="active-tab" pill below is the ONLY background layer so its
           spring animation is no longer masked by a static bg on the button. */
        isActive
          ? "text-orange-foreground shadow-lg shadow-orange/30 scale-105"
          : "bg-background/60 hover:bg-orange/10 hover:scale-[1.03]",
      )}
    >
      {isActive && (
        <LayoutMotion>
          <m.div
            layoutId="active-tab"
            className="absolute inset-0 rounded-full bg-orange"
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        </LayoutMotion>
      )}
      <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
        {icon && <TabIcon icon={icon} />}
        {label}
        <span
          className={cn(
            "inline-flex items-center justify-center size-4 sm:size-5 rounded-sm text-3xs sm:text-2xs font-bold transition-colors duration-fast",
            /* r95: عداد التبويب غير النشط — accent-foreground الأسطع (#df5a00)
               بدل text-orange (#bc4700) الذي كان 3.9:1 بلا AA على الداكن. */
            isActive
              ? "bg-white/20 text-orange-foreground"
              : "bg-muted/50 text-accent-foreground",
          )}
        >
          {toArabicNumber(count)}
        </span>
      </span>
    </button>
  )
}
