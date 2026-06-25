"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { LayoutHeader } from "@/components/layout/LayoutHeader"
import { Store, LayoutDashboard, ClipboardList, Settings, LogOut, Menu, QrCode, Gift } from "lucide-react"
import { csrfFetch } from "@/lib/csrf-client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { NavLink } from "@/components/shared/NavLink"

const navItems = [
  { href: "/owner", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/owner/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/owner/menu", label: "المنيو", icon: Store },
  { href: "/owner/qr", label: "رمز QR", icon: QrCode },
  { href: "/owner/loyalty", label: "الولاء", icon: Gift },
  { href: "/owner/settings", label: "الإعدادات", icon: Settings },
]

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      {/* Brand */}
      <div className="relative z-10 flex items-center border-b border-border/20 px-4 py-4 min-h-[72px]">
        <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="max-h-9 w-auto" priority />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} onClick={onNavClick} />
        ))}
      </nav>

      {/* Logout */}
      <div className="relative z-10 border-t border-border/20 px-3 py-3">
        <LogoutButton />
      </div>

      {/* Glass overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/30" />
    </>
  )
}

function LogoutButton() {
  const router = useRouter()

  return (
    <button
      onClick={async () => {
        try {
          const res = await csrfFetch("/api/auth/logout", { method: "POST" })
          if (res.ok) {
            toast.success("تم تسجيل الخروج")
            router.push("/login")
            router.refresh()
          }
        } catch {
          toast.error("فشل تسجيل الخروج")
        }
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive"
    >
      <LogOut className="size-4" />
      تسجيل الخروج
    </button>
  )
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — premium glass card */}
      <aside
        className={cn(
          "relative hidden w-60 shrink-0 flex-col lg:flex",
          "border-s border-border/20 bg-card/80 backdrop-blur-lg",
          "dark:border-white/5",
          "shadow-[4px_0_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-8px_rgba(0,0,0,0.3)]",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed right-3 top-3 z-[60] flex lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent
          side="right"
          className="w-60 border-0 bg-card dark:bg-card"
        >
          <SidebarContent onNavClick={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col animate-fade-in">
        <LayoutHeader onMenuClick={() => setSheetOpen(true)} />
        <main aria-live="polite" aria-label="محتوى الصفحة" className="flex-1 bg-subtle-pattern p-4 md:p-6 lg:p-8 animate-page-enter">{children}</main>
      </div>
    </div>
  )
}
