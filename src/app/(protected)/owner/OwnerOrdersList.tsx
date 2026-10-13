"use client"

import { memo } from "react"
import Link from "next/link"
import { ClipboardList, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice, toArabicNumber } from "@/lib/format"
import { getArabicPlural } from "@/lib/arabic-plural"
import { EmptyState } from "@/components/ui/empty-state"

/* r131-F5 (A1 P0-6, fleet ruling "status = solid pastel chips"): the
   segmented meter + legend paint the SOLID family inks (yellow / sky /
   mint / grey / rose) — the old 10-15% translucent washes left three of
   five segments nearly invisible on the 50%-opacity track. */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; indicator: string }> = {
  new:        { label: "جديد",        color: "text-[var(--warning-ink)]", bg: "bg-[var(--warning-soft)]",  indicator: "bg-[var(--warning)]" },
  preparing:  { label: "قيد التحضير", color: "text-[var(--info-ink)]",    bg: "bg-[var(--info-soft)]",     indicator: "bg-[var(--info)]" },
  ready:      { label: "جاهز",        color: "text-[var(--success-ink)]", bg: "bg-[var(--success-soft)]",  indicator: "bg-[var(--success)]" },
  completed:  { label: "مكتمل",       color: "text-[var(--c-grey-deep)]", bg: "bg-[var(--c-grey-bg)]",     indicator: "bg-[var(--c-grey-ink)]" },
  cancelled:  { label: "ملغي",        color: "text-[var(--danger-ink)]",  bg: "bg-[var(--danger-soft)]",   indicator: "bg-[var(--danger)]" },
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
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold tabular-nums", config.bg, config.color)}>
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
      <h2 className="text-base font-bold text-foreground mb-3">حالة الطلبات</h2>
      {hasBreakdown ? (
        <>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex ring-1 ring-inset ring-border/40">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats!.statusBreakdown[status] ?? 0
              if (count === 0) return null
              const pct = statusTotal > 0 ? (count / statusTotal) * 100 : 0
              return <div key={status} className={cn("h-full first:rounded-s-full last:rounded-e-full transition-[width] duration-slower", config.indicator)}
                style={{ width: `${pct}%` }} title={`${config.label}: ${count}`} />
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats!.statusBreakdown[status] ?? 0
              if (count === 0 && status !== "new") return null
              return (
                <div key={status} className="flex items-center gap-1.5 text-2xs font-semibold">
                  <div className={cn("size-2.5 rounded-full ring-1 ring-inset ring-border/40", config.indicator)} />
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="tabular-nums">{toArabicNumber(count)}</span>
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
      <h2 className="text-base font-bold text-foreground mb-3">الأكثر طلباً</h2>
      {items && items.length > 0 ? (
        <div className="space-y-1">
          {items.slice(0, 8).map((item, idx) => (
            <div key={item.itemId} className="flex items-center justify-between py-1.5 px-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded text-3xs font-bold",
                  idx === 0 ? "bg-orange text-orange-foreground" :
                  idx < 3 ? "bg-orange-muted text-accent-foreground" :
                  "bg-muted text-muted-foreground"
                )}>{toArabicNumber(idx + 1)}</span>
                <span className="text-sm">{item.name}</span>
              </div>
              <span className="text-2xs text-muted-foreground">{ordersWithCount(item.totalSold)}</span>
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
        <h2 className="text-base font-bold text-foreground">آخر الطلبات</h2>
        {/* r148 (CROSS R2) → Phase 5 (r152): text-primary → accent-foreground — نص 12px كان يهبط
            مع النحاس الفاتح إلى 3.8:1؛ الداكن الآن التراكوتا المضيء #E07856 (6.03:1). */}
        <Link href="/owner/orders"><span className="text-xs text-accent-foreground font-medium">عرض الكل</span></Link>
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
              className="text-xs font-medium text-accent-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-sm"
            >
              احصل على رمز QR
            </Link>
          }
        />
      )}
    </div>
  )
}
