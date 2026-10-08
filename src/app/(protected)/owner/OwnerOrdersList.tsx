"use client"

import { memo } from "react"
import Link from "next/link"
import { ClipboardList, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice, toArabicNumber } from "@/lib/format"
import { getArabicPlural } from "@/lib/arabic-plural"
import { EmptyState } from "@/components/ui/empty-state"

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; indicator: string }> = {
  new:        { label: "جديد",       color: "text-accent-foreground",       bg: "bg-orange-muted",      indicator: "bg-orange" },
  preparing:  { label: "قيد التحضير", color: "text-accent-foreground",    bg: "bg-orange-muted",   indicator: "bg-orange" },
  ready:      { label: "جاهز",       color: "text-success",     bg: "bg-success/10",   indicator: "bg-success" },
  completed:  { label: "مكتمل",      color: "text-muted-foreground",       bg: "bg-muted",     indicator: "bg-muted-foreground" },
  cancelled:  { label: "ملغي",       color: "text-destructive",             bg: "bg-destructive/10",                   indicator: "bg-destructive" },
}

interface StatsData {
  totalOrders: number; todayOrders: number; todayRevenue?: number; totalItems: number
  popularItems: { itemId: number; name: string; totalSold: number }[]
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[]
  statusBreakdown: Record<string, number>
}

/** "3 طلبات / طلب واحد / لا طلبات" — correct Arabic number-state per count. */
function ordersWithCount(count: number): string {
  return `${count === 1 ? "" : toArabicNumber(count) + " "}${getArabicPlural(count, "طلب", {
    zero: "لا طلبات",
    two: "طلبان",
    few: "طلبات",
    many: "طلب",
  })}`
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
        {/* r121-H-1: smart formatPrice default — was forced decimals:1 («12.0») */}
        <span className="text-sm font-semibold tabular-nums">{formatPrice(order.total)}</span>
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
  const hasBreakdown = !!stats && Object.keys(stats.statusBreakdown).length > 0
  return (
    <div className="h-full rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <h2 className="text-xs font-semibold text-muted-foreground mb-3">حالة الطلبات</h2>
      {hasBreakdown ? (
        <>
          <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden flex ring-1 ring-inset ring-black/5">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats!.statusBreakdown[status] ?? 0
              if (count === 0) return null
              const pct = statusTotal > 0 ? (count / statusTotal) * 100 : 0
              return <div key={status} className={cn("h-full first:rounded-s-full last:rounded-e-full transition-[width] duration-slower", config.bg)}
                style={{ width: `${pct}%` }} title={`${config.label}: ${count}`} />
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats!.statusBreakdown[status] ?? 0
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
        <EmptyState
          icon={ShoppingCart}
          title="لا توجد طلبات بعد"
          description="ستظهر حالة الطلبات هنا فور وصول أول طلب من زبائنك."
          className="py-6"
        />
      )}
    </div>
  )
}

export function PopularItems({ items }: { items: StatsData["popularItems"] }) {
  return (
    <div className="h-full rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <h2 className="text-xs font-semibold text-muted-foreground mb-3">الأكثر طلباً</h2>
      {items && items.length > 0 ? (
        <div className="space-y-1">
          {items.slice(0, 8).map((item, idx) => (
            <div key={item.itemId} className="flex items-center justify-between py-1.5 px-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                  idx === 0 ? "bg-orange text-orange-foreground" :
                  idx < 3 ? "bg-orange-muted text-accent-foreground" :
                  "bg-muted text-muted-foreground"
                )}>{toArabicNumber(idx + 1)}</span>
                <span className="text-sm">{item.name}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{ordersWithCount(item.totalSold)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد بيانات بعد"
          description="الأصناف الأكثر طلباً ستظهر هنا مع أول عملية بيع."
          className="py-6"
        />
      )}
    </div>
  )
}

export function RecentOrders({ orders }: { orders: StatsData["recentOrders"] }) {
  return (
    <div className="h-full rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground">آخر الطلبات</h2>
        <Link href="/owner/orders"><span className="text-xs text-primary font-medium">عرض الكل</span></Link>
      </div>
      {orders && orders.length > 0 ? (
        <div className="space-y-0.5">
          {orders.slice(0, 6).map((order) => <OrderRow key={order.id} order={order} />)}
        </div>
      ) : (
        <EmptyState
          icon={ShoppingCart}
          title="لا توجد طلبات بعد"
          description="شارك رابط المنيو مع زبائنك ليصل أول طلب إلى هنا مباشرة."
          className="py-6"
          action={
            <Link
              href="/owner/qr"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-sm"
            >
              احصل على رمز QR
            </Link>
          }
        />
      )}
    </div>
  )
}
