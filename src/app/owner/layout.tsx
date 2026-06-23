"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Store, LayoutDashboard, ClipboardList, Settings, LogOut, Menu, Award } from "lucide-react"
import { csrfFetch } from "@/lib/csrf-client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/owner", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/owner/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/owner/menu", label: "المنيو", icon: Store },
  { href: "/owner/qr", label: "رمز QR", icon: Award },
  { href: "/owner/loyalty", label: "الولاء", icon: Award },
  { href: "/owner/settings", label: "الإعدادات", icon: Settings },
]

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/owner" && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
        isActive
          ? "bg-gradient-to-r from-amber-500/15 to-amber-600/10 text-foreground shadow-sm dark:from-amber-400/15 dark:to-amber-500/10"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500" />
      )}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-transform duration-300 group-hover:scale-110",
          isActive && "text-amber-600 dark:text-amber-400",
        )}
      />
      {label}
    </Link>
  )
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      {/* Brand */}
      <div className="relative z-10 flex items-center gap-3 border-b border-white/10 px-4 pb-4 pt-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 dark:from-amber-400 dark:to-amber-500">
          <Store className="size-5 text-white" />
        </div>
        <div>
          <span className="block text-base font-bold tracking-tight">الربط الذكي</span>
          <span className="block text-[11px] text-muted-foreground">لوحة المالك</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} onClick={onNavClick} />
        ))}
      </nav>

      {/* Logout */}
      <div className="relative z-10 border-t border-white/10 px-3 py-3">
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
          "border-s border-white/10 bg-white/40 backdrop-blur-xl",
          "dark:border-white/5 dark:bg-black/30",
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
          <SidebarContent onNavClick={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                className="flex lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
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
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-subtle-pattern content-area">{children}</main>
      </div>
    </div>
  )
}
