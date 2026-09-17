"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { m, AnimatePresence } from "motion/react"
import { LayoutMotion } from "@/components/motion/LazyMotionProvider"
import { cn } from "@/lib/utils"
import AnimatedX from "@/components/ui/x-icon";
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { springDefault } from "@/lib/motion"

interface HeaderProps { className?: string }

const PARTNER_SLUG = "al-waha-cafe-demo"

const landingLinks = [
  { href: "/pricing", label: "الخطط والأسعار" },
  { href: `/menu/${PARTNER_SLUG}`, label: "منيو تجريبي" },
  { href: "/login", label: "تسجيل الدخول" },
]

function HamburgerButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="mobile-menu"
      aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
      /* r113-F118: shrink-0 — الزر كان يُعصر بواسطة flex-shrink إلى 23px على 375px
         و116px على 320px (رابط العلامة shrink-0 يأخذ كل المساحة). هدف لمس 44px مصان. */
      className="lg:hidden relative size-11 shrink-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm flex items-center justify-center hover:bg-accent-foreground/15 hover:border-accent-foreground/30 transition-[color,background-color,border-color,transform] duration-200 active:scale-90 focus-visible:ring-2 focus-visible:ring-accent-foreground/60"
    >
      <span className="relative size-3.5">
        <span className={cn("absolute inset-x-0 top-[2px] h-[2px] rounded-full bg-foreground transition-[transform,translate,scale,rotate,top,opacity,bottom] duration-300 origin-center", open && "rotate-45 top-[6px]")} />
        <span className={cn("absolute inset-x-0 top-[6px] h-[2px] rounded-full bg-foreground transition-[transform,translate,scale,rotate,top,opacity,bottom] duration-300", open && "opacity-0")} />
        <span className={cn("absolute inset-x-0 bottom-[2px] h-[2px] rounded-full bg-foreground transition-[transform,translate,scale,rotate,top,opacity,bottom] duration-300 origin-center", open && "-rotate-45 bottom-[6px]")} />
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
  const panelRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)

  // Focus trap: on open, trap focus in panel; on close, restore to hamburger
  useEffect(() => {
    if (open) {
      // Store reference to currently active element (hamburger button)
      hamburgerRef.current = document.activeElement as HTMLButtonElement
      // Focus first focusable element inside panel after a tick for mount
      requestAnimationFrame(() => {
        const panel = panelRef.current
        if (!panel) return
        const focusable = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length) focusable[0]?.focus()
      })
    } else {
      hamburgerRef.current?.focus()
    }
  }, [open])

  // Trap Tab/Shift+Tab within panel + Escape to close
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) { e.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    panel.addEventListener("keydown", handleKeyDown)
    return () => panel.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <m.div
            key="menu"
            ref={panelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التصفح"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={springDefault}
            className="fixed inset-x-0 top-0 z-50 mx-4 mt-4 rounded-2xl bg-background/90 border border-border/40 shadow-2xl backdrop-blur-xl overflow-hidden"
            style={{ transformOrigin: "top center" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-9 w-auto" priority />
              <button onClick={onClose} className="size-11 rounded-xl border border-border/40 flex items-center justify-center hover:bg-accent-foreground/15 hover:border-accent-foreground/30 transition-[background-color,border-color,transform] duration-200 active:scale-90 focus-visible:ring-2 focus-visible:ring-accent-foreground/60" aria-label="إغلاق"><AnimatedX className="size-4" /></button>
            </div>
            <nav className="px-4 py-4 space-y-1">
              {landingLinks.map((link, i) => {
                const isActive = link.href === "/login" ? pathname === "/login" : pathname.startsWith(link.href)
                return (
                  <m.div
                    key={link.href}
                    custom={i}
                    variants={mobileLinkVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <Link href={link.href} onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-[color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-accent-foreground/60", isActive ? "bg-accent-foreground/15 text-accent-foreground shadow-sm" : "text-muted-foreground hover:bg-accent-foreground/10 hover:text-foreground")}
                    >
                      {link.label}
                    </Link>
                  </m.div>
                )
              })}
            </nav>
          </m.div>
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
        "fixed top-0 inset-x-0 z-30 h-16 transition-[transform,background-color,box-shadow,border-color] duration-500 will-change-transform backface-hidden",
        visible ? "translate-y-0" : "-translate-y-full",
        scrolled
          ? "bg-background/80 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/40 shadow-lg shadow-black/20" /* r96-W4a: رموز الظل بدل rgba المقحم */
          : "bg-background/0",
        className
      )}>
        <nav className="max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-10 h-full flex items-center justify-between" aria-label="الرئيسية">
          {/* Logo & Hamburger */}
          <div className="flex items-center gap-3 flex-1">
            <HamburgerButton open={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} />
            {/* r113-F118: النص يختفي تحت 420px (شعار فقط) — بعد تثبيت الهمبرغر 44px
               لا تتسع الصفوف (144px على 320px) للعلامة الكاملة (137px)؛ الشعار وحده
               يحفظ الهوية ويتيح مساحة تنفس للزرين. */}
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-9 w-auto shrink-0" priority />
              <span className="text-base font-bold tracking-normal text-foreground/90 group-hover:text-accent-foreground transition-colors duration-200 max-[420px]:hidden" style={{ fontFamily: "var(--font-heading)" }}>Smart Menu</span>
            </Link>
          </div>

          {/* Tubelight Nav (Desktop) — r95: حبّة SmartBot (§5.6): حاوية دائرية
              زجاجية + فواصل رأسية بين الروابط. السلوك (tubelight/الإخفاء/الدرج) كما هو. */}
          <div className="hidden lg:flex items-center">
            <div className="relative flex items-center rounded-full bg-card/40 backdrop-blur-sm border border-border/40 p-1 shadow-sm">
              {landingLinks.map((link, i) => {
                const linkActive = isActive(link.href)
                return (
                  <div key={link.href} className="relative flex items-center">
                    {i > 0 && <div aria-hidden="true" className="w-px h-5 bg-border" />}
                    <Link
                      href={link.href}
                      aria-current={linkActive ? "page" : undefined}
                      className={cn(
                        "relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-full",
                        linkActive ? "text-primary-foreground" : "text-foreground/70 hover:text-foreground"
                      )}
                    >
                      {link.label}
                      {linkActive && (
                        <LayoutMotion>
                          <m.div
                            layoutId="tubelight"
                            className="absolute inset-0 -z-10 rounded-full bg-primary shadow-lg"
                            style={{
                              boxShadow: "0 0 18px 3px color-mix(in oklab, var(--primary) 35%, transparent), 0 0 6px color-mix(in oklab, var(--primary) 15%, transparent)",
                              willChange: "transform, opacity",
                            }}
                            transition={{ type: "spring", stiffness: 420, damping: 28 }}
                          />
                        </LayoutMotion>
                      )}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 flex-1">
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <MobileMenu open={mobileMenuOpen} onClose={closeMobileMenu} pathname={pathname} />
    </>
  )
}
