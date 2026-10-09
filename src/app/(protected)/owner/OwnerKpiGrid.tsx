"use client"

import { ShoppingCart, TrendingUp, Clock, ClipboardList } from "lucide-react"
import { formatPrice, toArabicNumber } from "@/lib/format"
import { KpiCard } from "@/components/shared/KpiCard"

/* r133 (A3 N6): the in-file OwnerKpiGridSkeleton + the isLoading/error/
   onRetry props were dead — the sole caller (owner/page.tsx) passes `stats`
   only and owns loading (KpiGridSkeleton from shared/DashboardSkeletons)
   and error states itself. Deleted (deletion beats addition). */

interface StatsData {
  totalOrders: number; todayOrders: number; todayRevenue?: number; totalItems: number
  popularItems: { itemId: number; name: string; totalSold: number }[]
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[]
  statusBreakdown: Record<string, number>
}

interface OwnerKpiGridProps {
  stats: StatsData | null
}

export function OwnerKpiGrid({ stats }: OwnerKpiGridProps) {
  const pendingOrders = stats ? (stats.statusBreakdown["new"] ?? 0) + (stats.statusBreakdown["preparing"] ?? 0) : 0

  return (
    /* r131-F5 (A1 P1-4): canonical collapse ladder — 2 cols from phone up,
       4 cols only ≥1101px (Madarek .grid-4), gap 20px. */
    <div className="grid grid-cols-2 gap-5 min-[1101px]:grid-cols-4">
      <KpiCard index={0} label="إجمالي الطلبات" value={stats?.totalOrders ?? 0} icon={ShoppingCart} subtitle="كل الوقت"
        iconColor="text-[var(--accent-ink)]" iconBg="bg-[var(--accent-soft)]" href="/owner/orders" animated />
      <KpiCard index={1} label="طلبات اليوم" value={stats?.todayOrders ?? 0} icon={TrendingUp}
        /* r121-H-1: smart formatPrice default — was forced decimals:1 («12.0») */
        subtitle={stats?.todayRevenue ? `${formatPrice(stats.todayRevenue)}` : undefined}
        iconColor="text-[var(--success-ink)]" iconBg="bg-[var(--success-soft)]" href="/owner/orders" animated />
      <KpiCard index={2} label="قيد الانتظار" value={pendingOrders} icon={Clock}
        subtitle={stats ? `${toArabicNumber(stats.statusBreakdown["new"] ?? 0)} جديد • ${toArabicNumber(stats.statusBreakdown["preparing"] ?? 0)} تحضير` : ""}
        iconColor="text-[var(--warning-ink)]" iconBg="bg-[var(--warning-soft)]" href="/owner/orders" animated />
      <KpiCard index={3} label="الأصناف" value={stats?.totalItems ?? 0} icon={ClipboardList}
        iconColor="text-[var(--info-ink)]" iconBg="bg-[var(--info-soft)]" href="/owner/menu" animated />
    </div>
  )
}
