"use client"

import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Menu } from "lucide-react"

interface LayoutHeaderProps {
  title?: string
  onMenuClick: () => void
}

export function LayoutHeader({ title = "لوحة التحكم", onMenuClick }: LayoutHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="flex rounded-lg p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
            onClick={onMenuClick}
            aria-label="فتح القائمة"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <h1 className="text-sm font-semibold text-muted-foreground">{title}</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
