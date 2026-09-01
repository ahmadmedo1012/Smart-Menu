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
      className="sticky top-0 z-30 border-b border-border/60 bg-background/92 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex rounded-lg p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
            onClick={onMenuClick}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-sheet"
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            <MotionMenu className="size-5" aria-hidden="true" />
          </button>
          <h1 className="hidden text-sm font-semibold text-muted-foreground sm:block">{title}</h1>
        </div>
        <ActionSearchBar role={role} className="max-w-sm flex-1" />
        <ThemeToggle />
      </div>
    </header>
  )
}
