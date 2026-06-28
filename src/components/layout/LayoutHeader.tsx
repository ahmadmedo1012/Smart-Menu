"use client"

import { useState, useEffect } from "react"
import { ActionSearchBar } from "@/components/ui/action-search-bar"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Menu } from "lucide-react"

interface LayoutHeaderProps {
  title?: string
  onMenuClick: () => void
  role?: "admin" | "owner"
}

export function LayoutHeader({ title = "لوحة التحكم", onMenuClick, role = "admin" }: LayoutHeaderProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let lastScrollY = window.scrollY
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setVisible(false)
      } else {
        setVisible(true)
      }
      lastScrollY = currentScrollY
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/30 bg-background/70 backdrop-blur-2xl transition-transform duration-300"
      style={{ transform: visible ? "translateY(0)" : "translateY(-100%)" }}
    >
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="flex rounded-lg p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
            onClick={onMenuClick}
            aria-label="فتح القائمة"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <h1 className="hidden text-sm font-semibold text-muted-foreground sm:block">{title}</h1>
        </div>
        <ActionSearchBar role={role} className="max-w-sm flex-1" />
        <ThemeToggle />
      </div>
    </header>
  )
}
