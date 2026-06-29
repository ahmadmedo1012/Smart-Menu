"use client"

import { useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AdminSidebar, navItems } from "@/components/layout/AdminSidebar"
import { LayoutHeader } from "@/components/layout/LayoutHeader"
import { NavLink } from "@/components/shared/NavLink"
import { Store } from "lucide-react"
import PageFade from "@/components/shared/PageFade"

function MobileNav({ onNavClick }: { onNavClick: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-4 pb-4 pt-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange to-orange/80 shadow-lg shadow-orange/25" aria-hidden="true">
          <Store className="size-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <span className="block text-base font-bold tracking-tight">الربط الذكي</span>
          <span className="block text-[11px] text-muted-foreground">لوحة الأدمن</span>
        </div>
      </div>
      <nav aria-label="القائمة المتنقلة" className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} onClick={onNavClick} />
        ))}
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
      <div className="flex flex-1 flex-col animate-fade-in overflow-x-hidden">
        <LayoutHeader onMenuClick={() => setSheetOpen(true)} role="admin" />
        <main aria-live="polite" aria-label="محتوى الصفحة" className="flex-1 bg-[radial-gradient(ellipse_at_top,_var(--color-border)_0%,_transparent_70%)] p-4 md:p-6 lg:p-8">
          <PageFade>{children}</PageFade>
        </main>
      </div>
    </div>
  )
}
