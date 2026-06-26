"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Star, Store, LayoutDashboard, X } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"

interface HeaderProps {
  className?: string
}

const PARTNER_SLUG = "al-waha-cafe"

const landingLinks = [
  { href: "/pricing", label: "الخطط والأسعار" },
  { href: `/menu/${PARTNER_SLUG}`, label: "منيو تجريبي" },
  { href: "/login", label: "لوحة التحكم" },
]

/* ── Hamburger → X morph ── */
interface HamburgerProps {
  open: boolean
  onClick: () => void
}

function HamburgerButton({ open, onClick }: HamburgerProps) {
  const line = "absolute inset-x-0 h-[2px] rounded-full bg-foreground transition-all duration-300 origin-center"

  return (
    <button
      onClick={onClick}
      className="lg:hidden relative size-9 rounded-xl border border-border/40 flex items-center justify-center hover:bg-gold-muted transition-colors"
      aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
    >
      <span className="relative size-4">
        {/* Top line → X top stroke */}
        <span className={cn(line, "top-[2px]", open && "top-[7px] rotate-45")} />
        {/* Middle line → fade out */}
        <span className={cn(line, "top-[7px]", open && "opacity-0 scale-x-0")} />
        {/* Bottom line → X bottom stroke */}
        <span className={cn(line, "top-[12px]", open && "top-[7px] -rotate-45")} />
      </span>
    </button>
  )
}

/* ── Mobile Fluid Island ── */
interface MobileMenuProps {
  open: boolean
  onClose: () => void
  pathname: string
}

function MobileMenu({ open, onClose, pathname }: MobileMenuProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      document.body.style.overflow = "hidden"
    } else {
      const timer = setTimeout(() => setMounted(false), 500)
      document.body.style.overflow = ""
      return () => clearTimeout(timer)
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!mounted) return null

  return (
    <>
      {/* Full-screen backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ease-smooth-out",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating glass pill */}
      <div
        className={cn(
          "fixed top-4 inset-x-4 z-50 transition-all duration-500 ease-smooth-out",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
        )}
      >
        <div className="rounded-3xl glass-strong overflow-hidden shadow-xl">
          {/* Island header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-7 w-auto" priority />
            <button
              onClick={onClose}
              className="size-8 rounded-xl border border-border/40 flex items-center justify-center hover:bg-gold-muted transition-colors"
              aria-label="إغلاق القائمة"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Staggered nav links */}
          <nav className="px-3 py-4 space-y-1">
            {landingLinks.map((link, i) => {
              const isActive = link.href === "/login" ? pathname === "/login" : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300",
                    "opacity-0 animate-fade-in-left",
                    isActive
                      ? "bg-gold-muted text-gold"
                      : "text-foreground/80 hover:bg-gold-muted hover:text-foreground"
                  )}
                  style={{ animationDelay: `${80 + i * 80}ms`, animationFillMode: "forwards" }}
                >
                  {link.href === "/pricing" && <Star className="size-4 text-gold shrink-0" />}
                  {link.href.includes("/menu/") && <Store className="size-4 text-gold shrink-0" />}
                  {link.href === "/login" && <LayoutDashboard className="size-4 text-gold shrink-0" />}
                  <span>{link.label}</span>
                </Link>
              )
            })}
            {/* CTA inside menu */}
            <div className="pt-2 px-4 opacity-0 animate-fade-in" style={{ animationDelay: "320ms", animationFillMode: "forwards" }}>
              <Link href="/subscribe" onClick={onClose}>
                <Button variant="gradient" size="lg" className="w-full rounded-2xl text-sm">
                  ابدأ الآن مجاناً
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}

/* ── Desktop active indicator ── */
function ActiveUnderline({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "absolute -bottom-px inset-x-2 h-[2px] rounded-full bg-gold transition-all duration-300 ease-smooth-out",
        active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
      )}
    />
  )
}

/* ── Main header ── */
export function Header({ className }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  return (
    <>
      <header
        className={cn(
          "fixed top-4 inset-x-4 z-30 h-14 rounded-2xl glass-strong supports-backdrop-filter:bg-background/60 opacity-0 animate-fade-in [animation-delay:100ms] [animation-fill-mode:forwards]",
          className
        )}
      >
        {/* Bottom gold accent */}
        <div className="absolute bottom-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Left side: hamburger + logo */}
          <div className="flex items-center gap-3">
            <HamburgerButton open={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} />
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-7 w-auto" priority />
            </Link>
          </div>

          {/* Center: desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {landingLinks.map((link) => {
              const isActive =
                link.href === "/login"
                  ? pathname === "/login"
                  : pathname.startsWith(link.href.replace(/:.*/, ""))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-1.5 rounded-lg text-sm transition-colors duration-200",
                    isActive
                      ? "text-gold font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-gold-muted"
                  )}
                >
                  {link.label}
                  <ActiveUnderline active={isActive} />
                </Link>
              )
            })}
          </nav>

          {/* Right side: theme toggle + CTA */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/subscribe">
              <Button variant="gradient" size="sm" className="rounded-xl text-xs h-8 px-3">
                ابدأ الآن مجاناً
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Fluid Island Overlay */}
      <MobileMenu open={mobileMenuOpen} onClose={closeMobileMenu} pathname={pathname} />
    </>
  )
}
