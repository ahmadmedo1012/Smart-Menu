"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"

interface HeaderProps { className?: string }

const PARTNER_SLUG = "al-waha-cafe"

const landingLinks = [
  { href: "/pricing", label: "الخطط والأسعار" },
  { href: `/menu/${PARTNER_SLUG}`, label: "منيو تجريبي" },
  { href: "/login", label: "لوحة التحكم" },
]

function HamburgerButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden relative size-9 rounded-lg border border-border flex items-center justify-center hover:bg-orange/20 transition-all duration-200"
      aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
    >
      <span className="relative size-3.5">
        <span className={cn("absolute inset-x-0 top-[2px] h-[2px] rounded-full bg-foreground transition-all duration-300 origin-center", open && "rotate-45 top-[6px]")} />
        <span className={cn("absolute inset-x-0 top-[6px] h-[2px] rounded-full bg-foreground transition-all duration-300", open && "opacity-0")} />
        <span className={cn("absolute inset-x-0 bottom-[2px] h-[2px] rounded-full bg-foreground transition-all duration-300 origin-center", open && "-rotate-45 bottom-[6px]")} />
      </span>
    </button>
  )
}

function MobileMenu({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    } else {
      const t = setTimeout(() => setMounted(false), 400)
      document.body.style.overflow = ""
      return () => clearTimeout(t)
    }
  }, [open])

  if (!mounted) return null

  return (
    <>
      <div className={cn("fixed inset-0 z-40 transition-all duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")} style={{ backgroundColor: "var(--overlay)" }} onClick={onClose} aria-hidden="true" />
      <div className={cn("fixed inset-x-0 top-0 z-50 transition-[transform,opacity] duration-500", open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none")} style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}>
        <div className="mx-4 mt-4 rounded-2xl bg-background border border-border/10 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-7 w-auto" priority />
            <button onClick={onClose} className="size-8 rounded-lg border border-border/10 flex items-center justify-center hover:bg-orange/20 transition-colors" aria-label="إغلاق"><X className="size-4" /></button>
          </div>
          <nav className="px-4 py-4 space-y-1">
            {landingLinks.map((link, i) => {
              const isActive = link.href === "/login" ? pathname === "/login" : pathname.startsWith(link.href)
              return (
                <Link key={link.href} href={link.href} onClick={onClose}
                  className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 opacity-0 translate-y-4", open && "opacity-100 translate-y-0", isActive ? "bg-orange/15 text-orange" : "text-muted-foreground hover:bg-orange/10 hover:text-foreground", i === 0 ? "delay-[60ms]" : i === 1 ? "delay-[110ms]" : "delay-[160ms]")}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="pt-3 px-4">
              <Link href="/subscribe" onClick={onClose}>
                <Button variant="orange" size="lg" className="w-full text-sm">ابدأ الآن مجاناً</Button>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}

export function Header({ className }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const lastScrollY = useRef(0)
  const pathname = usePathname()
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      if (currentY > lastScrollY.current && currentY > 80) {
        setVisible(false)
      } else {
        setVisible(true)
      }
      lastScrollY.current = currentY
      setScrolled(currentY > 20)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isActive = (href: string) =>
    href === "/login" ? pathname === "/login" : pathname.startsWith(href.replace(/:.*/, ""))

  return (
    <>
      <header className={cn(
        "fixed top-0 inset-x-0 z-30 h-16 transition-all duration-500 will-change-transform backface-hidden",
        visible ? "translate-y-0" : "-translate-y-full",
        scrolled ? "bg-background/85 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-background/0",
        className
      )}>
        <nav className="max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-10 h-full flex items-center justify-between" aria-label="الرئيسية">
          {/* Logo & Hamburger */}
          <div className="flex items-center gap-3">
            <HamburgerButton open={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} />
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-7 w-auto" priority />
            </Link>
          </div>

          {/* Tubelight Nav (Desktop) */}
          <div className="hidden lg:flex items-center">
            <div className="relative flex items-center rounded-full bg-card/40 backdrop-blur-sm border border-border/40 p-1 shadow-sm">
              {landingLinks.map((link) => {
                const linkActive = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-full",
                      linkActive ? "text-white dark:text-white" : "text-foreground/70 hover:text-foreground"
                    )}
                  >
                    {link.label}
                    {linkActive && (
                      <motion.div
                        layoutId="tubelight"
                        className="absolute inset-0 -z-10 rounded-full bg-orange shadow-lg"
                        style={{
                          boxShadow: "0 0 18px 3px rgba(251,146,60,0.35), 0 0 6px rgba(251,146,60,0.15)",
                          willChange: "transform, opacity",
                        }}
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">تسجيل الدخول</Button>
            </Link>
            <Link href="/subscribe">
              <Button variant="orange" size="sm" className="text-xs sm:text-sm px-3 sm:px-4">ابدأ الآن</Button>
            </Link>
          </div>
        </nav>
      </header>

      <MobileMenu open={mobileMenuOpen} onClose={closeMobileMenu} pathname={pathname} />
    </>
  )
}
