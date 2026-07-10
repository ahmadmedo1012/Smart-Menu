"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AdminSidebar, allNavItems, hasItemPermission } from "@/components/layout/AdminSidebar"
import { LayoutHeader } from "@/components/layout/LayoutHeader"
import { NavLink } from "@/components/shared/NavLink"
import { Store, LogOut, X } from "lucide-react"
import PageFade from "@/components/shared/PageFade"
import { AdminEventNotifier } from "@/components/admin/AdminEventNotifier"

function MobileNav({ onNavClick, role, permissions }: { onNavClick: () => void; role: string | null; permissions: string[] }) {
  const router = useRouter()
  const visible = role === "super_admin" || role === "admin"
    ? allNavItems
    : allNavItems.filter((item) => hasItemPermission(item, role, permissions));

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-4 pb-4 pt-5">
        {onNavClick && (
          <button onClick={onNavClick} className="flex size-8 items-center justify-center rounded-lg hover:bg-accent" aria-label="إغلاق">
            <X className="size-4" />
          </button>
        )}
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange to-orange/80 shadow-lg shadow-orange/25" aria-hidden="true">
          <Store className="size-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <span className="block text-base font-bold tracking-tight">الربط الذكي</span>
          <span className="block text-[11px] text-muted-foreground">لوحة الأدمن</span>
        </div>
      </div>
      <nav aria-label="القائمة المتنقلة" className="flex-1 space-y-1 px-3 py-4">
        {visible.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} onClick={onNavClick} />
        ))}
      </nav>
      <div className="border-t border-border/20 px-3 py-3">
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/auth/logout", { method: "POST" })
              if (res.ok) {
                router.push("/login")
                router.refresh()
              }
            } catch { /* ignore */ }
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" />
          تسجيل الخروج
        </button>
      </div>
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRole(d.data.role)
          setPermissions(d.data.permissions ?? [])
          setAuthLoaded(true)
        } else {
          router.push("/login")
        }
      })
      .catch(() => { router.push("/login") })
  }, [router])

  if (!authLoaded) return null

  return (
    <div className="flex min-h-screen">
      <AdminEventNotifier />

      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="left"
          className="w-60 border-0 bg-card"
          showCloseButton={false}
        >
          <MobileNav onNavClick={() => setSheetOpen(false)} role={role} permissions={permissions} />
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
