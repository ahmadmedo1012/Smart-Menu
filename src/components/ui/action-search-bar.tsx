"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Search, LayoutDashboard, Store, Users, UtensilsCrossed, ScrollText, QrCode, Settings, Activity, DollarSign, MessageCircle, ClipboardList, Gift, Package } from "lucide-react"

interface Action {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  keywords: string[]
}

const adminActions: Action[] = [
  { id: "admin-dash", label: "لوحة التحكم", icon: <LayoutDashboard className="size-4 text-orange" />, href: "/admin", keywords: ["admin", "dashboard", "رئيسية"] },
  { id: "admin-restaurants", label: "المطاعم", icon: <Store className="size-4 text-orange" />, href: "/admin/restaurants", keywords: ["restaurants", "مطاعم"] },
  { id: "admin-users", label: "المستخدمون", icon: <Users className="size-4 text-orange" />, href: "/admin/users", keywords: ["users", "مستخدمين"] },
  { id: "admin-menu", label: "المينيو", icon: <UtensilsCrossed className="size-4 text-orange" />, href: "/admin/menu", keywords: ["menu", "منيو", "items"] },
  { id: "admin-orders", label: "الطلبات", icon: <ScrollText className="size-4 text-orange" />, href: "/admin/orders", keywords: ["orders", "طلبات"] },
  { id: "admin-qr", label: "رمز QR", icon: <QrCode className="size-4 text-orange" />, href: "/admin/qr", keywords: ["qr", "كيو آر"] },
  { id: "admin-subscriptions", label: "المدفوعات", icon: <DollarSign className="size-4 text-orange" />, href: "/admin/subscriptions", keywords: ["payments", "مدفوعات", "اشتراكات"] },
  { id: "admin-telegram", label: "التليجرام", icon: <MessageCircle className="size-4 text-orange" />, href: "/admin/telegram", keywords: ["telegram", "تلجرام"] },
  { id: "admin-audit", label: "سجل التدقيق", icon: <Activity className="size-4 text-orange" />, href: "/admin/audit-logs", keywords: ["audit", "تدقيق"] },
  { id: "admin-settings", label: "الإعدادات", icon: <Settings className="size-4 text-orange" />, href: "/admin/settings", keywords: ["settings", "إعدادات"] },
]

const ownerActions: Action[] = [
  { id: "owner-dash", label: "لوحة التحكم", icon: <LayoutDashboard className="size-4 text-orange" />, href: "/owner", keywords: ["dashboard", "owner", "رئيسية"] },
  { id: "owner-orders", label: "الطلبات", icon: <ClipboardList className="size-4 text-orange" />, href: "/owner/orders", keywords: ["orders", "owner", "طلبات"] },
  { id: "owner-menu", label: "المنيو", icon: <Package className="size-4 text-orange" />, href: "/owner/menu", keywords: ["menu", "owner", "منيو"] },
  { id: "owner-qr", label: "رمز QR", icon: <QrCode className="size-4 text-orange" />, href: "/owner/qr", keywords: ["qr", "owner", "كيو آر"] },
  { id: "owner-loyalty", label: "الولاء", icon: <Gift className="size-4 text-orange" />, href: "/owner/loyalty", keywords: ["loyalty", "ولاء", "نقاط"] },
  { id: "owner-settings", label: "الإعدادات", icon: <Settings className="size-4 text-orange" />, href: "/owner/settings", keywords: ["settings", "owner", "إعدادات"] },
]

// All actions merged, deduped by href
const allActions = [...adminActions, ...ownerActions].filter((a, i, arr) => arr.findIndex(x => x.href === a.href) === i)

interface ActionSearchBarProps {
  role?: "admin" | "owner" | "all"
  className?: string
}

export function ActionSearchBar({ role = "all", className }: ActionSearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const actions = role === "admin" ? adminActions : role === "owner" ? ownerActions : allActions

  const filtered = query.trim()
    ? actions.filter(a => {
        const q = query.toLowerCase()
        return a.label.includes(q) || a.keywords.some(k => k.includes(q))
      })
    : actions

  // Keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(p => !p)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const navigate = useCallback((href: string) => {
    setOpen(false)
    setQuery("")
    router.push(href)
  }, [router])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIdx(p => Math.min(p + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIdx(p => Math.max(p - 1, 0))
    } else if (e.key === "Enter" && filtered[selectedIdx]) {
      navigate(filtered[selectedIdx].href)
    } else if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    }
  }

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current || !open) return
    const el = listRef.current.children[selectedIdx] as HTMLElement
    el?.scrollIntoView?.({ block: "nearest" })
  }, [selectedIdx, open])

  // Reset selection when filter changes
  useEffect(() => { setSelectedIdx(0) }, [query])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen(true); setQuery("") }}
        className={cn(
          "group flex h-9 w-full max-w-xs items-center gap-2 rounded-md border border-border/30 bg-card/40 px-3 text-sm text-muted-foreground/60 transition-all hover:border-orange/30 hover:text-muted-foreground hover:bg-card/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/20",
          className,
        )}
        aria-label="بحث سريع (⌘K)"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-right">بحث سريع...</span>
        <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 sm:flex">
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Overlay + Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery("") }} />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative z-10 w-full max-w-lg rounded-xl border border-border/40 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-xl overflow-hidden"
              dir="rtl"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border/20 px-4">
                <Search className="size-5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="ابحث عن صفحة..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                  autoFocus
                  dir="rtl"
                />
                <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border/30 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 sm:flex">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-72 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-muted-foreground/60">
                    <Search className="size-8 mb-2 opacity-30" />
                    <p className="text-sm">لا توجد نتائج</p>
                    <p className="text-xs">جرب كلمات بحث أخرى</p>
                  </div>
                ) : (
                  filtered.map((action, i) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => navigate(action.href)}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all text-right",
                        i === selectedIdx
                          ? "bg-orange/15 text-orange dark:bg-orange/15 dark:text-orange"
                          : "text-foreground/80 hover:bg-muted/50",
                      )}
                    >
                      <span className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-md",
                        i === selectedIdx ? "bg-orange/20" : "bg-muted/50",
                      )}>
                        {action.icon}
                      </span>
                      <span className="font-medium">{action.label}</span>
                      {pathname === action.href && (
                        <span className="mr-auto text-[10px] text-muted-foreground/40">الحالية</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
