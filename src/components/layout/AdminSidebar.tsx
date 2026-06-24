"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, UtensilsCrossed, ScrollText,
  Settings, QrCode, Store, Users, ChevronRight, Sparkles,
  Activity, DollarSign, MessageCircle,
} from "lucide-react"
import { NavLink } from "@/components/shared/NavLink"

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
  { href: "/admin/subscriptions", label: "المدفوعات", icon: DollarSign },
  { href: "/admin/telegram", label: "التليجرام", icon: MessageCircle },
  { href: "/admin/audit-logs", label: "سجل التدقيق", icon: Activity },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
]

export function AdminSidebar() {
  return (
    <aside aria-label="شريط التنقل الجانبي" className="hidden h-screen w-60 shrink-0 border-s border-border/40 bg-card backdrop-blur-lg lg:flex lg:flex-col shadow-sm">
      {/* Brand */}
      <div className="flex items-center border-b border-border/20 px-4 py-4 min-h-[72px]">
        <Image src="/logo.png" alt="الربط الذكي" width={1989} height={791} className="max-h-9 w-auto" priority />
      </div>

      {/* Navigation */}
      <nav aria-label="القائمة الرئيسية" className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/20 px-4 py-3">
        <Link 
          href="/" 
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
        >
          <ChevronRight className="size-3" />
          العودة للموقع
        </Link>
      </div>
    </aside>
  )
}
