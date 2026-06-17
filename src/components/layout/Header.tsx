"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { ShoppingCart, Menu, X } from "lucide-react"
import { useState } from "react"

interface NavLink {
  href: string
  label: string
}

const navLinks: NavLink[] = [
  { href: "/", label: "الرئيسية" },
  { href: "/menu", label: "قائمة الطعام" },
  { href: "/contact", label: "اتصل بنا" },
]

interface HeaderProps {
  cartCount?: number
  onCartClick?: () => void
  className?: string
}

export function Header({ cartCount = 0, onCartClick, className }: HeaderProps) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        {/* Mobile hamburger */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger className="lg:hidden">
            <Button variant="ghost" size="icon" className="size-8">
              {sheetOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              <span className="sr-only">القائمة</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <div className="flex flex-col gap-1 p-4">
              <Link
                href="/"
                className="mb-2 text-lg font-bold text-primary"
                onClick={() => setSheetOpen(false)}
              >
                Smart Menu
              </Link>
              <Separator className="mb-2" />
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                      isActive
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <Separator className="my-2" />
              <ThemeToggle className="self-start" />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop logo */}
        <Link href="/" className="shrink-0 text-lg font-bold text-primary">
          Smart Menu
        </Link>

        {/* Desktop nav */}
        <nav className="me-auto hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle className="hidden lg:flex" />
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8"
            onClick={onCartClick}
            aria-label="سلة المشتريات"
          >
            <ShoppingCart className="size-4" />
            {cartCount > 0 && (
              <span className="absolute -end-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
