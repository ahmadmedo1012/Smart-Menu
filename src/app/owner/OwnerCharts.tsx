"use client"

import { useMemo } from "react"
import { DollarSign, ShoppingCart, TrendingUp, Activity, Clock, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import AreaChart from "@/components/shared/AreaChart"
import HorizontalBar from "@/components/shared/HorizontalBar"
import KpiCard from "@/components/admin/KpiCard"

interface AdvancedStats {
  revenue7d: { date: string; revenue: number }[]
  orders7d: { date: string; count: number }[]
  topItems: { itemId: number; name: string; totalSold: number; growth: number }[]
  hourlyDistribution: { hour: number; count: number }[]
  aovTrend: { date: string; aov: number }[]
  growthPct: number
}

export function AnalyticsTab({ advancedStats }: { advancedStats: AdvancedStats }) {
  const revenueSparkline = useMemo(() => advancedStats.revenue7d.map(r => r.revenue), [advancedStats.revenue7d])
  const ordersSparkline = useMemo(() => advancedStats.orders7d.map(o => o.count), [advancedStats.orders7d])
  const chartData = useMemo(() => advancedStats.revenue7d.map(d => ({ label: d.date.slice(5), value: d.revenue })), [advancedStats.revenue7d])
  const hourlyData = useMemo(() => advancedStats.hourlyDistribution.map(h => ({ label: `${h.hour}:00`, value: h.count })), [advancedStats.hourlyDistribution])
  const revenue7dTotal = useMemo(() => advancedStats.revenue7d.reduce((s, r) => s + r.revenue, 0), [advancedStats.revenue7d])
  const orders7dTotal = useMemo(() => advancedStats.orders7d.reduce((s, o) => s + o.count, 0), [advancedStats.orders7d])
  const aovAvg = useMemo(() => Math.round(advancedStats.aovTrend.reduce((s, a) => s + a.aov, 0) / Math.max(advancedStats.aovTrend.length, 1)), [advancedStats.aovTrend])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="إيرادات 7 أيام"
          value={revenue7dTotal}
          icon={DollarSign}
          iconBg="bg-success/10"
          iconColor="text-success"
          suffix=" د.ل"
          trend={advancedStats.growthPct}
          sparklineData={revenueSparkline}
        />
        <KpiCard
          label="طلبات 7 أيام"
          value={orders7dTotal}
          icon={ShoppingCart}
          iconBg="bg-orange-muted"
          iconColor="text-orange"
          sparklineData={ordersSparkline}
        />
        <KpiCard
          label="متوسط قيمة الطلب"
          value={aovAvg}
          icon={TrendingUp}
          iconBg="bg-purple-50/80 dark:bg-purple-950/20"
          iconColor="text-purple-600"
          suffix=" د.ل"
        />
        <KpiCard
          label="النمو"
          value={advancedStats.growthPct}
          icon={Activity}
          iconBg="bg-orange-muted/80"
          iconColor="text-orange"
          suffix="%"
        />
      </div>

      {/* Revenue chart */}
      <div className="rounded-md bg-card/50 border border-border/30 p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4">اتجاه الإيرادات (7 أيام)</h3>
        {chartData.length > 0 ? (
          <AreaChart data={chartData} height={200} />
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground/50">
            <DollarSign className="size-8" />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hourly distribution */}
        <div className="rounded-md bg-card/50 border border-border/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">توزيع الطلبات حسب الساعة</h3>
          </div>
          {hourlyData.length > 0 ? (
            <HorizontalBar data={hourlyData} barHeight={20} />
          ) : (
            <div className="flex items-center justify-center h-[150px] text-muted-foreground/50">
              <Clock className="size-8" />
            </div>
          )}
        </div>

        {/* Top items with growth */}
        <div className="rounded-md bg-card/50 border border-border/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">الأكثر طلباً (نمو)</h3>
          </div>
          {advancedStats.topItems.length > 0 ? (
            <div className="space-y-2">
              {advancedStats.topItems.slice(0, 8).map((item, idx) => (
                <div key={item.itemId} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-bold",
                      idx === 0 ? "bg-orange text-white" :
                      idx < 3 ? "bg-orange-muted text-orange" :
                      "bg-muted text-muted-foreground"
                    )}>{toArabicNumber(idx + 1)}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{toArabicNumber(item.totalSold)}</span>
                    {item.growth !== 0 && (
                      <span className={cn("text-[11px] font-medium", item.growth > 0 ? "text-success" : "text-red-500")}>
                        {item.growth > 0 ? "↑" : "↓"}{toArabicNumber(Math.abs(item.growth))}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-muted-foreground/50">
              <BarChart3 className="size-8" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
