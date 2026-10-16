"use client"

import Link from "next/link"
import {LayoutDashboard, UtensilsCrossed, ScrollText, Settings, QrCode, Store, Users, Activity, DollarSign, MessageCircle, Shield, Radio} from 'lucide-react';
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
  /* P18-W2-c (W1-c defect §2.7): the system-events page/route/client are
     complete but were ORPHANED from this list — discoverable only by URL.
     Same permission family as the audit trail it sits beside
     (VIEW_ANALYTICS — the API route's own gate), so the visibility rule
     matches the server's authorization exactly. */
  { href: "/admin/system-events", label: "أحداث النظام", icon: Radio, permission: "VIEW_ANALYTICS" },
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
    /* r131-F4 (A1 P2-3): night-shell rail — same SO port as OwnerShell.
       Phase 6 (r154): the dark rail joins the «مطبخ ليلي دافئ» — the retired
       night-sky gradient (gold aurora + indigo + sand constellation)
       repaints to the warm night kitchen: terracotta ember glow
       (E07856-family, NO indigo) + espresso-family constellation dots
       (the #241811-tinted warm neutral ramp); light flat card,
       border-e hairline on the content boundary, sticky full-height. */
    <aside aria-label="شريط التنقل الجانبي" className="hidden lg:flex lg:flex-col w-60 xl:w-64 shrink-0 sticky top-0 h-screen border-e border-border/60 bg-card shadow-sm dark:bg-[radial-gradient(340px_200px_at_82%_-60px,rgb(224_120_86/0.08),transparent_72%),radial-gradient(280px_220px_at_-20%_108%,rgb(194_69_45/0.05),transparent_70%),linear-gradient(180deg,var(--muted)_0%,var(--background)_34%,var(--background)_100%)]">
      {/* Constellation dots — paint-only, dark-only. Espresso-family warm
          neutrals + terracotta ember sparks (the night kitchen's specks). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden dark:block bg-no-repeat [background-image:radial-gradient(1.8px_1.8px_at_21%_12%,rgb(205_191_169/0.20),transparent_100%),radial-gradient(1px_1px_at_68%_7%,rgb(154_137_119/0.16),transparent_100%),radial-gradient(1.5px_1.5px_at_87%_21%,rgb(229_217_196/0.15),transparent_100%),radial-gradient(1px_1px_at_42%_30%,rgb(154_137_119/0.12),transparent_100%),radial-gradient(1.8px_1.8px_at_9%_44%,rgb(224_120_86/0.18),transparent_100%),radial-gradient(1px_1px_at_76%_58%,rgb(154_137_119/0.11),transparent_100%),radial-gradient(1.5px_1.5px_at_28%_74%,rgb(205_191_169/0.14),transparent_100%),radial-gradient(1.2px_1.2px_at_58%_88%,rgb(224_120_86/0.12),transparent_100%)]"
      />
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
