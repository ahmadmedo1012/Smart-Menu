"use client"

import Link from "next/link"
import {LayoutDashboard, UtensilsCrossed, ScrollText, Settings, QrCode, Store, Users, Activity, DollarSign, MessageCircle, Shield} from 'lucide-react';
import { MotionChevronRight } from '@/components/ui/motion-icons';
import AnimatedLogOut from "@/components/ui/logout-icon"
import { performLogout } from "@/lib/logout"
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
  if (role === "super_admin") return true;
  // `admin` (legacy): full access EXCEPT MANAGE_USERS (users/admins pages) —
  // matches requirePermission() in src/lib/auth.ts (privilege-escalation fix).
  if (role === "admin") return item.permission !== "MANAGE_USERS";
  return permissions.includes(item.permission);
}

function LogoutButton() {
  return (
    <button
      onClick={() => performLogout()}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-fast hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <AnimatedLogOut className="size-4" />
      تسجيل الخروج
    </button>
  )
}

export function AdminSidebar({
  role,
  permissions,
}: {
  /** r121-B-2/A-2: fed by the server admin layout (requireAuth) via AdminShell —
   * kills this component's independent /me probe (one of 2-3
   * duplicate session calls on every admin cold load). */
  role: string | null;
  permissions: string[];
}) {
  const visible = role === "super_admin" || role === "admin"
    ? allNavItems
    : allNavItems.filter((item) => hasItemPermission(item, role, permissions));

  return (
    <aside aria-label="شريط التنقل الجانبي" className="hidden min-h-dvh w-60 shrink-0 border-s border-border/50 bg-card/80 backdrop-blur-md lg:flex lg:flex-col shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-border/20 px-5 py-5 min-h-[72px]">
        <div className="flex size-8 items-center justify-center rounded-lg bg-orange">
          <Store className="size-4 text-orange-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">الربط الذكي</p>
          <p className="text-2xs text-muted-foreground">لوحة التحكم</p>
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
          className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors duration-fast hover:bg-accent/50 hover:text-foreground group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <MotionChevronRight className="size-3 transition-transform duration-fast group-hover:-translate-x-0.5 rtl:rotate-180" />
          العودة للموقع
        </Link>
      </div>
    </aside>
  )
}
