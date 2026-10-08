"use client"

import { ActionSearchBar } from "@/components/ui/action-search-bar"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { MotionMenu } from '@/components/ui/motion-icons';

interface LayoutHeaderProps {
  title?: string
  onMenuClick: () => void
  role?: "admin" | "owner"
  menuOpen?: boolean
}

export function LayoutHeader({ title = "لوحة التحكم", onMenuClick, role = "admin", menuOpen = false }: LayoutHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-2xl backdrop-saturate-150"
    >
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-xl p-1.5 text-muted-foreground hover:bg-orange/10 hover:text-foreground lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            onClick={onMenuClick}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-sheet"
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            <MotionMenu className="size-5" aria-hidden="true" />
          </button>
          {/* r121-K-1 (K-audit §12 note): this was a heading element — a static
              "لوحة التحكم" that duplicated every page's real (sr-only) h1 on
              desktop; a span keeps the visual chrome without breaking the
              one-h1-per-page rule. */}
          <span className="hidden text-sm font-semibold text-muted-foreground sm:block">{title}</span>
        </div>
        <ActionSearchBar role={role} className="max-w-sm flex-1" />
        <ThemeToggle />
      </div>
    </header>
  )
}
