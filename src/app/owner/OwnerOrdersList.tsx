"use client"

import { memo } from "react"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; indicator: string }> = {
  new:        { label: "جديد",       color: "text-orange dark:text-orange",       bg: "bg-orange-muted dark:bg-orange-muted",      indicator: "bg-orange" },
  preparing:  { label: "قيد التحضير", color: "text-orange dark:text-orange",    bg: "bg-orange-muted dark:bg-orange-muted",   indicator: "bg-orange" },
  ready:      { label: "جاهز",       color: "text-success",     bg: "bg-success/10",   indicator: "bg-success" },
  completed:  { label: "مكتمل",      color: "text-muted-foreground",       bg: "bg-muted",     indicator: "bg-muted-foreground" },
  cancelled:  { label: "ملغي",       color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/20",        indicator: "bg-red-500" },
}

interface StatsData {
  totalOrders: number; todayOrders: number; todayRevenue?: number; totalItems: number
  popularItems: { itemId: number; name: string; totalSold: number }[]
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[]
  statusBreakdown: Record<string, number>
}

const OrderRow = memo(function OrderRow({ order }: { order: StatsData["recentOrders"][0] }) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.new
  return (
    <Link href={`/owner/orders/${order.id}`}
      className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30 group rounded-sm -mx-1">
      <div className="flex items-center gap-2.5">
        <div className={cn("size-2 rounded-full shrink-0", config.indicator)} />
        <div>
          <p className="text-sm font-medium">{order.orderNo}</p>
          <p className="text-xs text-muted-foreground">{order.customerName || "دون اسم"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold tabular-nums">{toArabicNumber(order.total.toFixed(1))} د.ل</span>
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
          {config.label}
        </span>
      </div>
    </Link>
  )
})

interface StatusSectionProps {
  stats: StatsData | null
  statusTotal: number
}

export function StatusBreakdown({ stats, statusTotal }: StatusSectionProps) {
  return (
    <div className="rounded-md bg-card/50 border border-border/30 p-4 shadow-sm h-full">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3">حالة الطلبات</h3>
      {stats && Object.keys(stats.statusBreakdown).length > 0 ? (
        <>
          <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden flex ring-1 ring-inset ring-black/5">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats.statusBreakdown[status] ?? 0
              if (count === 0) return null
              const pct = statusTotal > 0 ? (count / statusTotal) * 100 : 0
              return <div key={status} className={cn("h-full first:rounded-r-full last:rounded-l-full transition-all duration-500", config.bg)}
                style={{ width: `${pct}%` }} title={`${config.label}: ${count}`} />
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats.statusBreakdown[status] ?? 0
              if (count === 0 && status !== "new") return null
              return (
                <div key={status} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("size-2.5 rounded-full ring-1 ring-inset ring-black/5", config.indicator)} />
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="font-bold">{toArabicNumber(count)}</span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground/60 py-4 text-center">لا توجد طلبات بعد</p>
      )}
    </div>
  )
}

export function PopularItems({ items }: { items: StatsData["popularItems"] }) {
  return (
    <div className="rounded-md bg-card/50 border border-border/30 p-4 shadow-sm h-full">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3">الأكثر طلباً</h3>
      {items && items.length > 0 ? (
        <div className="space-y-1">
          {items.slice(0, 8).map((item, idx) => (
            <div key={item.itemId} className="flex items-center justify-between py-1.5 px-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                  idx === 0 ? "bg-gradient-to-br from-orange to-orange/80 text-white" :
                  idx < 3 ? "bg-orange-muted text-orange" :
                  "bg-muted text-muted-foreground"
                )}>{toArabicNumber(idx + 1)}</span>
                <span className="text-sm">{item.name}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{toArabicNumber(item.totalSold)} طلب</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="empty-state-icon"><ShoppingCart /></div>
          <p className="text-xs font-medium text-muted-foreground">لا توجد بيانات بعد</p>
        </div>
      )}
    </div>
  )
}

export function RecentOrders({ orders }: { orders: StatsData["recentOrders"] }) {
  return (
    <div className="rounded-md bg-card/50 border border-border/30 p-4 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground">آخر الطلبات</h3>
        <Link href="/owner/orders"><span className="text-xs text-primary font-medium">عرض الكل</span></Link>
      </div>
      {orders && orders.length > 0 ? (
        <div className="space-y-0.5">
          {orders.slice(0, 6).map((order) => <OrderRow key={order.id} order={order} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="empty-state-icon"><ShoppingCart /></div>
          <p className="text-xs font-medium text-muted-foreground">لا توجد طلبات بعد</p>
        </div>
      )}
    </div>
  )
}
