"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, Star, Store, LayoutDashboard } from "lucide-react"
import { useState } from "react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface HeaderProps {
  className?: string
}

const PARTNER_SLUG = "al-waha-cafe"

const landingLinks = [
  { href: "/pricing", label: "الخطط والأسعار" },
  { href: `/menu/${PARTNER_SLUG}`, label: "منيو تجريبي" },
  { href: "/login", label: "لوحة التحكم" },
]

function MobileNav({ onNavClick }: { onNavClick: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-border/30 px-4 pb-4 pt-5">
        <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-8 w-auto" priority />
      </div>
      <nav className="space-y-2 px-3 py-4">
        {landingLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavClick}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[oklch(0.62_0.08_75_/_0.12)] transition-colors text-sm font-medium"
          >
            {link.href === "/pricing" && <Star className="size-4 text-primary" />}
            {link.href.includes("/menu/") && <Store className="size-4 text-primary" />}
            {link.href === "/login" && <LayoutDashboard className="size-4 text-primary" />}
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  )
}

export function Header({ className }: HeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header
      className={cn(
        "fixed top-4 inset-x-4 z-30 h-14 rounded-2xl glass-strong supports-backdrop-filter:bg-background/60",
        className
      )}
    >
      {/* Subtle bottom border gradient */}
      <div className="absolute bottom-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-[var(--warm)]/20 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              render={
                <button className="lg:hidden size-8 rounded-xl border border-border/40 flex items-center justify-center hover:bg-[oklch(0.62_0.08_75_/_0.12)] transition-colors" aria-label="فتح القائمة">
                  <Menu className="size-4" />
                </button>
              }
            />
            <SheetContent side="right" className="w-72 border-0 bg-card">
              <MobileNav onNavClick={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-7 w-auto" priority />
          </Link>
          <nav className="hidden lg:flex items-center gap-0.5">
            {landingLinks.map((link) => {
              const isActive = link.href === "/login" ? pathname === "/login" : pathname.startsWith(link.href.replace(/:.*/, ""))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors duration-200",
                    isActive
                      ? "bg-[var(--warm)]/10 text-[var(--warm)] font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-[oklch(0.62_0.08_75_/_0.12)]"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/subscribe">
            <Button variant="gradient" size="sm" className="rounded-xl text-xs h-8 px-3 bg-warm text-warm-foreground">
              ابدأ الآن مجاناً
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
