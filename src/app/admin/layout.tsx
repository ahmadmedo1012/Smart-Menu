"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { AdminSidebar, navItems } from "@/components/layout/AdminSidebar"
import { Menu, Store } from "lucide-react"
import { cn } from "@/lib/utils"

function MobileNav({ onNavClick }: { onNavClick: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-4 pb-4 pt-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 dark:from-amber-400 dark:to-amber-500">
          <Store className="size-5 text-white" />
        </div>
        <div>
          <span className="block text-base font-bold tracking-tight">الربط الذكي</span>
          <span className="block text-[11px] text-muted-foreground">لوحة الأدمن</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-white/5 hover:text-foreground"
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
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

      {/* Mobile hamburger */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed right-3 top-3 z-50 flex lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent
          side="right"
          className="w-60 border-0 bg-white/80 backdrop-blur-2xl dark:bg-black/70"
        >
          <MobileNav onNavClick={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                className="flex rounded-lg p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
                onClick={() => setSheetOpen(true)}
                aria-label="فتح القائمة"
              >
                <Menu className="size-5" />
              </button>
              <h1 className="text-sm font-semibold text-muted-foreground">
                لوحة التحكم
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 bg-gradient-to-b from-background to-muted/30 p-4 md:p-6 lg:p-8 bg-subtle-pattern content-area">
          {children}
        </main>
      </div>
    </div>
  )
}
