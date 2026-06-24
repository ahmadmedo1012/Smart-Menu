"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, Star, Store, LayoutDashboard } from "lucide-react"
import { useState } from "react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface HeaderProps {
  className?: string
}

const PARTNER_SLUG = "pizza-roma"

const landingLinks = [
  { href: "/pricing", label: "الخطط والأسعار" },
  { href: `/menu/${PARTNER_SLUG}`, label: "منيو تجريبي" },
]

function MobileNav({ onNavClick }: { onNavClick: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-border/20 px-4 pb-4 pt-5">
        <Image src="/logo.png" alt="الربط الذكي" width={1989} height={791} className="h-8 w-auto" priority />
      </div>
      <nav className="space-y-2 px-3 py-4">
        <Link
          href="/pricing"
          onClick={onNavClick}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
        >
          <Star className="size-4 text-amber-500" /> الخطط والأسعار
        </Link>
        <Link
          href={`/menu/${PARTNER_SLUG}`}
          onClick={onNavClick}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
        >
          <Store className="size-4 text-amber-500" /> منيو تجريبي
        </Link>
        <Link
          href="/login"
          onClick={onNavClick}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
        >
          <LayoutDashboard className="size-4 text-amber-500" /> لوحة التحكم
        </Link>
      </nav>
    </>
  )
}

export function Header({ className }: HeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-30 h-16 bg-background/60 backdrop-blur-2xl border-b border-border/30 shadow-sm supports-backdrop-filter:bg-background/40",
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Mobile hamburger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              render={
                <button
                  className="lg:hidden size-9 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="فتح القائمة"
                >
                  <Menu className="size-4" />
                </button>
              }
            />
            <SheetContent side="right" className="w-72 border-0 bg-card">
              <MobileNav onNavClick={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="الربط الذكي" width={1989} height={791} className="h-8 w-auto" priority />
          </Link>
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
          <ThemeToggle />
          <Link href="/subscribe">
            <Button variant="gradient" size="sm" className="rounded-xl">
              ابدأ الآن مجاناً
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
