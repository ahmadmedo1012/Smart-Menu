"use client"

import { ShoppingCart, TrendingUp, Clock, ClipboardList, AlertCircle } from "lucide-react"
import { toArabicNumber } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/shared/KpiCard"

/* ---------- Loading skeleton (matches KpiCard shape exactly) ---------- */

export function OwnerKpiGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="size-11 rounded-md" />
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
      <div className="rounded-md border border-border/30 bg-card/50 shadow-sm">
        <EmptyState
          icon={AlertCircle}
          title={error}
          description="تعذّر تحميل مؤشرات لوحة التحكم. تحقق من الاتصال ثم أعد المحاولة."
          className="py-8"
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              إعادة المحاولة
            </Button>
          }
        />
      </div>
    )
  }

  const pendingOrders = stats ? (stats.statusBreakdown["new"] ?? 0) + (stats.statusBreakdown["preparing"] ?? 0) : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard index={0} label="إجمالي الطلبات" value={stats?.totalOrders ?? 0} icon={ShoppingCart} subtitle="كل الوقت"
        iconColor="text-orange" iconBg="bg-orange/10" href="/owner/orders" animated />
      <KpiCard index={1} label="طلبات اليوم" value={stats?.todayOrders ?? 0} icon={TrendingUp}
        subtitle={stats?.todayRevenue ? `${toArabicNumber(stats.todayRevenue.toFixed(1))} د.ل` : undefined}
        iconColor="text-success" iconBg="bg-success/10" href="/owner/orders" animated />
      <KpiCard index={2} label="قيد الانتظار" value={pendingOrders} icon={Clock}
        subtitle={stats ? `${toArabicNumber(stats.statusBreakdown["new"] ?? 0)} جديد • ${toArabicNumber(stats.statusBreakdown["preparing"] ?? 0)} تحضير` : ""}
        iconColor="text-flame dark:text-saffron" iconBg="bg-orange-muted dark:bg-orange-muted" href="/owner/orders" animated />
      <KpiCard index={3} label="الأصناف" value={stats?.totalItems ?? 0} icon={ClipboardList}
        iconColor="text-ember" iconBg="bg-orange-muted dark:bg-orange-muted" href="/owner/menu" animated />
    </div>
  )
}
