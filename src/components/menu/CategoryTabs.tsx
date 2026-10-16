"use client"

/*
 * P16-4b (Banzai → Smart Menu): category browsing becomes a slide-in drawer
 * OVER the menu — the horizontal pill strip is retired. The page behind stays
 * partially visible (light scrim + 38vw panel on the inline-start edge, which
 * is the physical RIGHT edge in this RTL-first app), so the menu never fully
 * disappears while navigating it — Banzai's scene-UI layering, mirrored for
 * RTL. ≤640px swaps the side panel for a bottom sheet (grabber + 78dvh cap).
 *
 * Preserved from the strip era (the filtering contract is untouched — this is
 * still the navigation UI for updateURL({ cat }) in MenuPageClient):
 *   - the APG "toggle button" filter pattern (aria-pressed, never role=tab)
 *   - the group's accessible name + sr-only hint (r134-W2 #7: فئة not قسم)
 *   - per-row counts (search/diet-aware via itemCounts) + «الكل» reset row
 * Row grammar per the Banzai reference: thumbnail tile + Arabic label +
 * count + LEFT chevron (RTL drill-down direction) + precise hover underline.
 */
import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import {
  Coffee, CupSoda, Pizza, Beef, Milk, Apple, Cookie, Soup, Package, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

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

function TabIcon({ icon, className }: { icon: string; className?: string }) {
  // Prefer a crisp lucide SVG for known emoji icon values (Open Design)
  if (/^\p{Emoji}/u.test(icon)) {
    const mapped = EMOJI_MAP[icon]
    if (mapped) {
      const Icon = mapped
      return <Icon className={className ?? "size-4"} strokeWidth={2.4} />
    }
    // r96-W4b: unmapped emoji → generic SVG, never raw emoji
    return <UtensilsCrossed className={className ?? "size-4"} strokeWidth={2.4} />
  }
  const mapped = ICON_MAP[icon.toLowerCase().replace(/[-_\s]/g, "")]
  if (mapped) {
    const Icon = mapped
    return <Icon className={className ?? "size-4"} strokeWidth={2.4} />
  }
  // r96-W4b: unrecognized string → generic SVG instead of raw text slice
  return <UtensilsCrossed className={className ?? "size-4"} strokeWidth={2.4} />
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
  const [open, setOpen] = useState(false)
  /* Same lazy CSS-media surface detection as OrderDialog (r134-W2 #12):
     ≥640px gets the side panel, below it the bottom sheet. SSR-safe guard;
     the sheet only ever renders OPEN on client interaction, so hydration
     markup never differs between the two surfaces. */
  const [isDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 640px)").matches
  )

  /* Selecting a row filters the grid (same onSelect contract as the old
     strip) and dismisses the drawer — Banzai's "hold a tool, then put it
     down" flow: pick a category, watch the menu re-filter behind the panel
     as it slides away. */
  const handleSelect = useCallback(
    (id: number | null) => {
      onSelect(id)
      setOpen(false)
    },
    [onSelect]
  )

  /* a11y (r135-C twin): Escape closes via base-ui; the keydown listener here
     is only for the trigger's expanded state staying honest when focus
     movement closes the sheet. base-ui already restores focus to the trigger
     on close. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const active = categories.find((c) => c.id === activeCategory)
  const activeLabel = active ? active.nameAr || active.name : null

  return (
    <>
      {/* Trigger row — sticky below StickyMenuHeader exactly where the pill
          strip lived (md:top-14, glass backdrop, z-20). 44px+ target
          (h-12/sm:h-14), the MenuToolbar card family. */}
      <div
        className={cn(
          "mb-6",
          "md:sticky md:top-14 md:z-20 md:bg-background/80 md:backdrop-blur-xl md:pt-3",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "flex h-12 w-full items-center gap-3 rounded-lg border border-border/70 bg-card px-4 shadow-sm",
            "text-sm font-medium transition-[background-color,border-color] duration-fast",
            "hover:bg-accent/60 hover:border-ring/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
            "sm:h-14"
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange/10 text-accent-foreground"
          >
            <LayoutGrid className="size-4" strokeWidth={2.4} />
          </span>
          <span className="shrink-0">الفئات</span>
          {activeLabel && (
            <span className="truncate text-muted-foreground">· {activeLabel}</span>
          )}
          <ChevronLeft
            className="ms-auto size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        {/* side="left" pins to inset-inline-start:0 — the physical RIGHT edge
            in RTL (the natural opening side, mirrored from Banzai's panel);
            it slides in from that edge via the rtl: translate mirror classes
            in ui/sheet (r93-W2a). ≤640px becomes the bottom sheet. */}
        <SheetContent
          side={isDesktop ? "left" : "bottom"}
          className={cn(
            "gap-0",
            /* P16-4b: ~35-40% of the desktop viewport (clamped so ultrawides
               keep a usable panel and the menu behind stays the majority —
               the scene never fully disappears). The max-w override retires
               the shell's 420px side-panel cap for this surface. */
            "data-[side=left]:w-[clamp(320px,38vw,560px)]",
            "data-[side=left]:sm:max-w-[560px]",
            "data-[side=bottom]:max-h-[78dvh]"
          )}
        >
          <SheetHeader className="border-b border-border/60 pb-3">
            <SheetTitle className="text-base font-semibold">الفئات</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain p-3">
            {/* a11y decision (unchanged from the strip): these are FILTER
                buttons, not ARIA tabs — selecting one filters a single list
                in place instead of swapping labelled panels, so
                role="tablist"/"tab" would promise tabpanel semantics that
                don't exist. Pattern used instead: a named toolbar group +
                aria-pressed toggle buttons (APG "toggle button" filter
                pattern), which screen readers announce as "pressed/not
                pressed" without the tab-panel contract. */}
            <div
              role="group"
              aria-label="تصفية الأصناف حسب الفئة"
              aria-describedby="category-tabs-hint"
              className="flex flex-col gap-1"
            >
              {/* sr-only hint so SR users understand the group filters the list
                  behind the drawer
                  r134-W2 (#7): فئة unified — the menu surface said قسم here while
                  its own empty state (MenuPageClient) + mobile said فئة; فئة wins
                  repo-wide on the customer-facing surface. */}
              <span id="category-tabs-hint" className="sr-only">
                اختيار فئة يعرض أصنافها فقط في القائمة أدناه
              </span>
              <CategoryRow
                label="الكل"
                count={itemCounts.get(null) ?? 0}
                isActive={activeCategory === null}
                onClick={() => handleSelect(null)}
              />
              {categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  label={cat.nameAr || cat.name}
                  icon={cat.icon}
                  count={itemCounts.get(cat.id) ?? 0}
                  isActive={activeCategory === cat.id}
                  onClick={() => handleSelect(cat.id)}
                />
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function CategoryRow({
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
        "group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-start",
        "min-h-11 transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
        isActive
          ? "bg-orange/10"
          : "hover:bg-accent/50"
      )}
    >
      {/* Banzai row grammar: thumbnail tile (the mascot-equivalent — lucide
          category icon, same ICON_MAP/EMOJI_MAP as the old tabs) */}
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          isActive
            ? "border-orange/40 bg-orange/15 text-accent-foreground"
            : "border-border/60 bg-muted/40 text-muted-foreground"
        )}
      >
        {icon ? (
          <TabIcon icon={icon} className="size-4" />
        ) : (
          <UtensilsCrossed className="size-4" strokeWidth={2.4} />
        )}
      </span>

      <span className="flex min-w-0 flex-1 items-center gap-2">
        {/* precise hover underline (Banzai's menu rows) — under the label
            only, never the whole row */}
        <span
          className={cn(
            "truncate text-sm font-medium decoration-orange/70 decoration-1 underline-offset-4 group-hover:underline",
            isActive && "text-accent-foreground"
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            /* r95 counter ink law: non-active counts ride accent-foreground
               (the old strip's chip ink, 3.9:1 → AA). */
            "inline-flex shrink-0 items-center justify-center size-5 rounded-sm text-2xs font-bold",
            isActive
              ? "bg-orange text-orange-foreground"
              : "bg-muted/50 text-accent-foreground"
          )}
        >
          {toArabicNumber(count)}
        </span>
      </span>

      {/* RTL drill-down chevron — points LEFT (the reading direction's
          "into the list" arrow; mirrored from Banzai's → rows) */}
      <ChevronLeft
        className={cn(
          "size-4 shrink-0",
          isActive ? "text-accent-foreground" : "text-muted-foreground/70"
        )}
        aria-hidden="true"
      />
    </button>
  )
}
