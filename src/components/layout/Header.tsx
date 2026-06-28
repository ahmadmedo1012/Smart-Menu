"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { springDefault } from "@/lib/motion"

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
      className="lg:hidden relative size-9 rounded-lg border border-border flex items-center justify-center hover:bg-orange/20 transition-all duration-200 active:scale-90"
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

const mobileLinkVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...springDefault, delay: 0.06 + i * 0.06 },
  }),
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
}

function MobileMenu({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={springDefault}
            className="fixed inset-x-0 top-0 z-50 mx-4 mt-4 rounded-2xl bg-background border border-border/10 shadow-2xl overflow-hidden"
            style={{ transformOrigin: "top center" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-9 w-auto" priority />
              <span className="text-sm font-medium tracking-tight text-foreground/80">Smart Menu</span>
              <button onClick={onClose} className="size-8 rounded-lg border border-border/10 flex items-center justify-center hover:bg-orange/20 transition-colors active:scale-90" aria-label="إغلاق"><X className="size-4" /></button>
            </div>
            <nav className="px-4 py-4 space-y-1">
              {landingLinks.map((link, i) => {
                const isActive = link.href === "/login" ? pathname === "/login" : pathname.startsWith(link.href)
                return (
                  <motion.div
                    key={link.href}
                    custom={i}
                    variants={mobileLinkVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <Link href={link.href} onClick={onClose}
                      className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200", isActive ? "bg-orange/15 text-orange" : "text-muted-foreground hover:bg-orange/10 hover:text-foreground")}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                )
              })}
              <motion.div
                custom={landingLinks.length}
                variants={mobileLinkVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="pt-3 px-4"
              >
                <Link href="/subscribe" onClick={onClose}>
                  <Button variant="orange" size="lg" className="w-full text-sm">ابدأ الآن مجاناً</Button>
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
        scrolled ? "bg-background/80 backdrop-blur-2xl border-b border-border/30 shadow-md" : "bg-background/0",
        className
      )}>
        <nav className="max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-10 h-full flex items-center justify-between" aria-label="الرئيسية">
          {/* Logo & Hamburger */}
          <div className="flex items-center gap-3">
            <HamburgerButton open={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} />
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-9 w-auto" priority />
              <span className="text-base font-medium tracking-tight text-foreground/90 group-hover:text-orange transition-colors duration-200">Smart Menu</span>
            </Link>
          </div>

          {/* Tubelight Nav (Desktop) */}
          <div className="hidden lg:flex items-center">
            <div className="relative flex items-center rounded-full bg-card/40 backdrop-blur-sm border border-border/40 p-1 shadow-sm">
              {landingLinks.map((link, i) => {
                const linkActive = isActive(link.href)
                return (
                  <div key={link.href} className="relative flex items-center">
                    {i > 0 && <div className="w-px h-5 bg-border" />}
                    <Link
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
                  </div>
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
