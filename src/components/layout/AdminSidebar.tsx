"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, UtensilsCrossed, ScrollText, 
  Settings, QrCode, Store, Users, ChevronLeft 
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

export const navItems: NavItem[] = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/restaurants", label: "المطاعم", icon: Store },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/menu", label: "المينيو", icon: UtensilsCrossed },
  { href: "/admin/orders", label: "الطلبات", icon: ScrollText },
  { href: "/admin/qr", label: "رمز QR", icon: QrCode },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
]

function NavItem({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
        isActive 
          ? "bg-gradient-to-r from-amber-500/15 to-amber-600/10 text-foreground shadow-sm dark:from-amber-400/15 dark:to-amber-500/10" 
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500" />
      )}
      <Icon className={cn(
        "size-4 shrink-0 transition-transform duration-300",
        isActive && "text-amber-600 dark:text-amber-400",
        "group-hover:scale-110"
      )} />
      <span>{label}</span>
    </Link>
  )
}

export function AdminSidebar() {
  return (
    <aside className="hidden h-screen w-60 shrink-0 border-l border-border/40 bg-card/40 backdrop-blur-2xl lg:flex lg:flex-col shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-border/20 px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 dark:from-amber-400 dark:to-amber-500">
          <Store className="size-5 text-white" />
        </div>
        <div>
          <span className="block text-base font-bold tracking-tight">الربط الذكي</span>
          <span className="block text-[11px] text-muted-foreground">لوحة الأدمن</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/20 px-4 py-3">
        <Link 
          href="/" 
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
        >
          <ChevronLeft className="size-3" />
          العودة للموقع
        </Link>
      </div>
    </aside>
  )
}
