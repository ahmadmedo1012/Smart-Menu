"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Store, Users, Shield, UtensilsCrossed,
  ScrollText, QrCode, DollarSign, MessageCircle,
  Activity, Settings, ChevronRight, PanelLeftClose, PanelLeft, Store as StoreIcon,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/restaurants", label: "المطاعم", icon: Store },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/admins", label: "المسؤولون", icon: Shield },
  { href: "/admin/menu", label: "المينيو", icon: UtensilsCrossed },
  { href: "/admin/orders", label: "الطلبات", icon: ScrollText },
  { href: "/admin/qr", label: "رمز QR", icon: QrCode },
  { href: "/admin/subscriptions", label: "المدفوعات", icon: DollarSign },
  { href: "/admin/telegram", label: "التليجرام", icon: MessageCircle },
  { href: "/admin/audit-logs", label: "سجل التدقيق", icon: Activity },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
]

export function CompactSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href)

  return (
    <aside
      dir="ltr"
      className={cn(
        "hidden lg:flex flex-col h-screen shrink-0 border-s border-border/10 bg-background/20 backdrop-blur-3xl transition-all duration-300 ease-out-quart relative",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center border-b border-border/10 min-h-[64px] transition-all duration-300",
        collapsed ? "justify-center px-0" : "gap-3 px-5"
      )}>
        <div className="relative shrink-0">
          <div className="size-9 rounded-xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/20">
            <StoreIcon className="size-5 text-white" />
          </div>
          <div className="absolute -inset-1.5 rounded-xl bg-orange/10 blur-lg -z-10" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold leading-tight whitespace-nowrap">الربط الذكي</p>
            <p className="text-[11px] text-muted-foreground whitespace-nowrap">لوحة التحكم</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-4 overflow-y-auto scrollbar-none">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl transition-all duration-200 group",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                active
                  ? "bg-orange/10 text-orange"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange/15 to-transparent pointer-events-none" />
              )}
              <Icon className={cn("size-5 shrink-0 relative z-10", active && "drop-shadow-glow")} />
              {!collapsed && (
                <span className="text-sm font-medium relative z-10 whitespace-nowrap">{item.label}</span>
              )}
              {active && (
                <span className="absolute end-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-orange shadow-glow" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border/10 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-200"
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && <span>طي القائمة</span>}
        </button>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-border/10 px-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-200 group"
          >
            <ChevronRight className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180" />
            العودة للموقع
          </Link>
        </div>
      )}
    </aside>
  )
}
