"use client"

import { useEffect, useRef, useState, memo } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, TrendingUp, Clock, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

/* ---------- Animated Counter ---------- */

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const start = performance.now()
    const from = display
    const to = value
    const duration = 800

    function tick(now: number) {
      if (!mounted.current) return
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { mounted.current = false; if (ref.current) cancelAnimationFrame(ref.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span>{toArabicNumber(display)}{suffix}</span>
}

/* ---------- Stat Card ---------- */

const StatCard = memo(function StatCard({ label, value, icon: Icon, subtitle, color, bg, onClick }: {
  label: string; value: number; icon: typeof ShoppingCart; subtitle?: string
  color: string; bg: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-md bg-card/60 backdrop-blur-sm border border-border/30 p-5 shadow-sm transition-all duration-300",
        onClick && "cursor-pointer hover:border-orange/30 hover:shadow-lg hover:-translate-y-0.5",
      )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight"><AnimatedCounter value={value} /></p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("rounded-md p-3 ring-1 ring-border/30", bg)}>
          <Icon className={cn("size-5", color)} />
        </div>
      </div>
    </div>
  )
})

interface StatsData {
  totalOrders: number; todayOrders: number; todayRevenue?: number; totalItems: number
  popularItems: { itemId: number; name: string; totalSold: number }[]
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[]
  statusBreakdown: Record<string, number>
}

export function OwnerKpiGrid({ stats }: { stats: StatsData | null }) {
  const router = useRouter()
  const pendingOrders = stats ? (stats.statusBreakdown["new"] ?? 0) + (stats.statusBreakdown["preparing"] ?? 0) : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="إجمالي الطلبات" value={stats?.totalOrders ?? 0} icon={ShoppingCart} subtitle="كل الوقت"
        color="text-orange dark:text-orange" bg="bg-orange-muted dark:bg-orange-muted"
        onClick={() => router.push("/owner/orders")} />
      <StatCard label="طلبات اليوم" value={stats?.todayOrders ?? 0} icon={TrendingUp}
        subtitle={stats?.todayRevenue ? `${toArabicNumber(stats.todayRevenue.toFixed(1))} د.ل` : undefined}
        color="text-success" bg="bg-success/10" />
      <StatCard label="قيد الانتظار" value={pendingOrders} icon={Clock}
        subtitle={stats ? `${toArabicNumber(stats.statusBreakdown["new"] ?? 0)} جديد • ${toArabicNumber(stats.statusBreakdown["preparing"] ?? 0)} تحضير` : ""}
        color="text-orange dark:text-orange" bg="bg-orange-muted dark:bg-orange-muted"
        onClick={() => router.push("/owner/orders")} />
      <StatCard label="الأصناف" value={stats?.totalItems ?? 0} icon={ClipboardList}
        color="text-orange dark:text-orange" bg="bg-orange-muted dark:bg-orange-muted"
        onClick={() => router.push("/owner/menu")} />
    </div>
  )
}
