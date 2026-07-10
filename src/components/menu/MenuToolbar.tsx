"use client"

import { useState, useRef } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  suggestionItems?: { id: number; name: string; price: number; image?: string }[]
  onSuggestionClick?: (id: number) => void
  className?: string
}

const SORT_OPTIONS = [
  { value: "default", label: "ترتيب افتراضي" },
  { value: "price-asc", label: "السعر: من الأقل للأعلى" },
  { value: "price-desc", label: "السعر: من الأعلى للأقل" },
  { value: "name", label: "الاسم" },
] as const

export function MenuToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  className,
}: MenuToolbarProps) {
  const [showSort, setShowSort] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={cn("relative mb-4 flex gap-2 items-start", className)}>
      {/* Search input */}
      <div className="flex-1 relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="ابحث في القائمة..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-11 sm:h-12 pr-10 rounded-sm border border-border/30 bg-card/70 backdrop-blur-sm px-4 text-sm outline-none transition-all duration-300 focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20 shadow-sm"
        />
        {search && (
          <button
            type="button"
            aria-label="مسح البحث"
            onClick={() => { onSearchChange(""); inputRef.current?.focus() }}
            className="absolute end-3 top-1/2 -translate-y-1/2 size-5 rounded-sm bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Sort button */}
      <div className="relative">
        <button
          type="button"
          aria-label="ترتيب"
          aria-haspopup="listbox"
          aria-expanded={showSort}
          onClick={() => setShowSort(!showSort)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setShowSort(true)
            }
          }}
          className="h-11 sm:h-12 px-3 sm:px-4 rounded-sm border border-border/30 bg-card/70 backdrop-blur-sm text-sm font-medium hover:bg-accent transition-all flex items-center gap-2"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 7h18M6 12h12M10 17h4" strokeLinecap="round" />
          </svg>
        </button>
        {showSort && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
            <div
              className="absolute end-0 sm:end-auto sm:start-0 top-full mt-2 z-50 w-48 sm:w-52 rounded-sm border border-border/30 bg-card shadow-xl animate-scale-in origin-top-right"
              role="listbox"
              aria-label="خيارات الترتيب"
              onKeyDown={(e) => {
                const opts = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role='option']")
                const cur = Array.from(opts).findIndex((o) => o === document.activeElement)
                if (e.key === "ArrowDown") { e.preventDefault(); opts[(cur + 1) % opts.length]?.focus() }
                if (e.key === "ArrowUp") { e.preventDefault(); opts[(cur - 1 + opts.length) % opts.length]?.focus() }
                if (e.key === "Escape") { setShowSort(false) }
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  role="option"
                  type="button"
                  aria-selected={sort === opt.value}
                  onClick={() => { onSortChange(opt.value); setShowSort(false) }}
                  className={cn(
                    "w-full text-start px-4 py-3 text-sm transition-colors first:rounded-t-sm last:rounded-b-sm hover:bg-accent",
                    sort === opt.value && "bg-accent font-medium text-primary",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
