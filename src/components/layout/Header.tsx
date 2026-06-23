"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X, Star, Store, LayoutDashboard } from "lucide-react"
import { useState } from "react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"

interface HeaderProps {
  className?: string
}

const PARTNER_SLUG = "pizza-roma"

const landingLinks = [
  { href: "/pricing", label: "الخطط والأسعار" },
  { href: `/menu/${PARTNER_SLUG}`, label: "منيو تجريبي" },
]

export function Header({ className }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 h-16 bg-background/60 backdrop-blur-2xl border-b border-border/30 shadow-sm supports-backdrop-filter:bg-background/40",
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden size-9 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="فتح القائمة"
          >
            <Menu className="size-4" />
          </button>
          <span className="text-lg font-bold">
            <span className="text-gradient-amber">الربط الذكي</span>
          </span>
          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {landingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex">
            <ThemeToggle />
          </div>
          <Link href="/subscribe">
            <Button variant="gradient" size="sm" className="rounded-xl">
              ابدأ الآن مجاناً
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-72 bg-background border-l shadow-2xl transition-transform duration-400 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-8">
            <span className="text-lg font-bold text-gradient">الربط الذكي</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="size-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-2">
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
            >
              <Star className="size-4 text-amber-500" /> الخطط والأسعار
            </Link>
            <Link
              href={`/menu/${PARTNER_SLUG}`}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
            >
              <Store className="size-4 text-amber-500" /> منيو تجريبي
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
            >
              <LayoutDashboard className="size-4 text-amber-500" /> لوحة التحكم
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
