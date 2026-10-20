"use client"

import { useEffect, useState } from "react"
import { ActionSearchBar } from "@/components/ui/action-search-bar"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { MotionMenu } from '@/components/ui/motion-icons';
import { cn } from "@/lib/utils"

interface LayoutHeaderProps {
  title?: string
  onMenuClick: () => void
  role?: "admin" | "owner"
  menuOpen?: boolean
}

/* r130 (W2-3, P2): canonical .topbar chrome recipe (Madarek base.css:193-204) —
 * ground at 86% + blur(var(--glass-blur)=16px) saturate(140%), and the bottom
 * hairline starts TRANSPARENT, deepening to the --border hairline only after
 * 6px of scroll (border-color rides the 240ms standard ease). The old recipe
 * was 85% + blur-2xl(40px) saturate(150%) + an always-on border-border/40. */
export function LayoutHeader({ title = "لوحة التحكم", onMenuClick, role = "admin", menuOpen = false }: LayoutHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        /* W7-G (P1, A2 audit): يستهلك إزاحة شريط الاتصال — أثناء الانقطاع
           ينزل الرأس تحت الشريط بدل أن يغطيه (globals.css ‎--conn-banner-h‎). */
        "sticky top-[var(--conn-banner-h,0px)] z-30 border-b bg-background/86 backdrop-blur-lg backdrop-saturate-[140%] transition-[border-color,background-color] duration-base ease-[var(--ease,cubic-bezier(0.4,0,0.2,1))]",
        scrolled ? "border-border" : "border-transparent"
      )}
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
