"use client"

import { ShoppingCart, TrendingUp, Clock, ClipboardList, AlertCircle } from "lucide-react"
import { formatPrice, toArabicNumber } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/shared/ErrorState"
import { KpiCard } from "@/components/shared/KpiCard"

/* ---------- Loading skeleton (matches KpiCard shape exactly) ---------- */

export function OwnerKpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 min-[1101px]:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="min-h-[132px] rounded-xl border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="size-11 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface StatsData {
  totalOrders: number; todayOrders: number; todayRevenue?: number; totalItems: number
  popularItems: { itemId: number; name: string; totalSold: number }[]
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[]
  statusBreakdown: Record<string, number>
}

interface OwnerKpiGridProps {
  stats: StatsData | null
  /** True while the dashboard fetch is in flight — shows card-shaped skeletons. */
  isLoading?: boolean
  /** Load-failure message; with no stats, renders an inline retry state. */
  error?: string | null
  onRetry?: () => void
}

export function OwnerKpiGrid({ stats, isLoading = false, error = null, onRetry }: OwnerKpiGridProps) {
  if (isLoading && !stats) return <OwnerKpiGridSkeleton />

  if (error && !stats) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/50 shadow-sm">
        <ErrorState
          icon={AlertCircle}
          title={error}
          description="تعذر تحميل مؤشرات لوحة التحكم. تحقق من الاتصال ثم أعد المحاولة."
          onRetry={onRetry}
          className="py-8"
        />
      </div>
    )
  }

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
