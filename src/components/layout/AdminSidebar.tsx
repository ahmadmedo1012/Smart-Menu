"use client"

import { useEffect, useState } from "react";
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard, UtensilsCrossed, ScrollText,
  Settings, QrCode, Store, Users, ChevronRight,
  Activity, DollarSign, MessageCircle, Shield, LogOut,
} from "lucide-react"
import { NavLink } from "@/components/shared/NavLink"

export interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  permission?: string
}

export const allNavItems: NavItem[] = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, permission: "VIEW_ANALYTICS" },
  { href: "/admin/restaurants", label: "المطاعم", icon: Store, permission: "MANAGE_RESTAURANTS" },
  { href: "/admin/users", label: "المستخدمون", icon: Users, permission: "MANAGE_USERS" },
  { href: "/admin/admins", label: "المسؤولون", icon: Shield, permission: "MANAGE_USERS" },
  { href: "/admin/menu", label: "المينيو", icon: UtensilsCrossed, permission: "MANAGE_RESTAURANTS" },
  { href: "/admin/orders", label: "الطلبات", icon: ScrollText, permission: "APPROVE_ORDERS" },
  { href: "/admin/qr", label: "رمز QR", icon: QrCode, permission: "MANAGE_RESTAURANTS" },
  { href: "/admin/subscriptions", label: "المدفوعات", icon: DollarSign, permission: "MANAGE_SUBSCRIPTIONS" },
  { href: "/admin/telegram", label: "التليجرام", icon: MessageCircle, permission: "EDIT_SETTINGS" },
  { href: "/admin/audit-logs", label: "سجل التدقيق", icon: Activity, permission: "VIEW_ANALYTICS" },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings, permission: "EDIT_SETTINGS" },
];

export function hasItemPermission(
  item: NavItem,
  role: string | null,
  permissions: string[]
): boolean {
  if (!item.permission) return true;
  if (role === "super_admin" || role === "admin") return true;
  return permissions.includes(item.permission);
}

function LogoutButton() {
  const router = useRouter()

  return (
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
  )
}

export function AdminSidebar() {
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRole(d.data.role);
          setPermissions(d.data.permissions ?? []);
        }
      })
      .catch(() => {});
  }, []);

  const visible = role === "super_admin" || role === "admin"
    ? allNavItems
    : allNavItems.filter((item) => hasItemPermission(item, role, permissions));

  return (
    <aside aria-label="شريط التنقل الجانبي" className="hidden h-screen w-60 shrink-0 border-s border-border/20 bg-card/80 backdrop-blur-2xl lg:flex lg:flex-col shadow-md">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-border/20 px-5 py-5 min-h-[72px]">
        <div className="size-8 rounded-xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-sm">
          <Store className="size-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">الربط الذكي</p>
          <p className="text-[11px] text-muted-foreground">لوحة التحكم</p>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="القائمة الرئيسية" className="flex-1 space-y-0.5 px-3 py-5 overflow-y-auto">
        {visible.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/20 px-3 py-3 space-y-1">
        <LogoutButton />
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 group"
        >
          <ChevronRight className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5 rtl:rotate-180" />
          العودة للموقع
        </Link>
      </div>
    </aside>
  )
}
