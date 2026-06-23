"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AdminSidebar, navItems } from "@/components/layout/AdminSidebar"
import { LayoutHeader } from "@/components/layout/LayoutHeader"
import { Store } from "lucide-react"

function MobileNav({ onNavClick }: { onNavClick: () => void }) {
  const pathname = usePathname()

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-4 pb-4 pt-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 dark:from-amber-400 dark:to-amber-500" aria-hidden="true">
          <Store className="size-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <span className="block text-base font-bold tracking-tight">الربط الذكي</span>
          <span className="block text-[11px] text-muted-foreground">لوحة الأدمن</span>
        </div>
      </div>
      <nav aria-label="القائمة المتنقلة" className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-amber-500/15 to-amber-600/10 text-foreground shadow-sm dark:from-amber-400/15 dark:to-amber-500/10"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-amber-600 shadow-sm shadow-amber-500/30 dark:from-amber-400 dark:to-amber-500" />
              )}
              {isActive && <span className="sr-only">(الصفحة الحالية)</span>}
              <Icon className={cn(
                "size-4 shrink-0 transition-all duration-300",
                isActive && "text-amber-600 dark:text-amber-400",
                !isActive && "group-hover:scale-110 group-hover:text-amber-500/70"
              )} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-60 border-0 bg-card"
        >
          <MobileNav onNavClick={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <LayoutHeader onMenuClick={() => setSheetOpen(true)} />
        <main aria-live="polite" aria-label="محتوى الصفحة" className="flex-1 bg-subtle-pattern p-4 md:p-6 lg:p-8 animate-page-enter">
          {children}
        </main>
      </div>
    </div>
  )
}
