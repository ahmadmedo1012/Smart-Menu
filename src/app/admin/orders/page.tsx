"use client"

import { csrfFetch } from "@/lib/csrf-client";
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import { premiumToast } from "@/lib/premium-toast"
import {
  ClipboardList, Store, Clock, ChefHat,
  CheckCircle, XCircle, Activity, BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

interface Order {
  id: number; orderNo: string; customerName: string; status: string
  total: number; items: { quantity: number }[]
  restaurant: { id: number; name: string; slug: string } | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  new: { label: "جديد", icon: Clock, color: "text-orange dark:text-orange", bg: "bg-orange-muted dark:bg-orange-muted" },
  preparing: { label: "قيد التحضير", icon: ChefHat, color: "text-orange dark:text-orange", bg: "bg-orange-muted dark:bg-orange-muted" },
  ready: { label: "جاهز", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  completed: { label: "مكتمل", icon: CheckCircle, color: "text-muted-foreground", bg: "bg-muted" },
  cancelled: { label: "ملغي", icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
}

const TABS = [
  { value: "", label: "الكل" },
  { value: "new", label: "جديد" },
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const dataRef = useRef("")
  const router = useRouter()

  const fetchOrders = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true)
      const params = new URLSearchParams()
      if (filter) params.set("status", filter)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      params.set("page", String(pageNum))
      params.set("pageSize", "50")
      const res = await fetch(`/api/orders?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch orders")
      const data = await res.json()
      const newOrders: Order[] = Array.isArray(data.data) ? data.data : []
      const hash = JSON.stringify(newOrders.map(o => o.id + o.status))
      if (!append && hash === dataRef.current) return // no change
      dataRef.current = hash
      setOrders(prev => append ? [...prev, ...newOrders] : newOrders)
      setTotalCount(data.total ?? newOrders.length)
    } catch { premiumToast("error", "فشل تحميل الطلبات") }
    finally { setLoading(false) }
  }, [filter, dateFrom, dateTo])

  useEffect(() => { setPage(1); fetchOrders(1) }, [fetchOrders])

  // Auto-poll every 5s
  useEffect(() => {
    const interval = setInterval(() => fetchOrders(1), 5000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await csrfFetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        premiumToast("refresh", `تم تغيير الحالة`)
        fetchOrders(1)
      }
    } catch { premiumToast("error", "فشل التحديث") }
  }

  const nextStatus: Record<string, string> = {
    new: "preparing", preparing: "ready", ready: "completed",
  }

  const filtered = orders.filter(o => {
    if (!search) return true
    const q = search.toLowerCase()
    return o.orderNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.restaurant?.name || "").toLowerCase().includes(q)
  })

  // Restaurant stats from local data
  const restOrderCounts: Record<string, { count: number; active: boolean }> = {}
  orders.forEach(o => {
    const name = o.restaurant?.name || "غير معروف"
    if (!restOrderCounts[name]) restOrderCounts[name] = { count: 0, active: false }
    restOrderCounts[name].count++
    if (o.status === "new" || o.status === "preparing" || o.status === "ready") restOrderCounts[name].active = true
  })
  const sortedRests = Object.entries(restOrderCounts).sort((a, b) => b[1].count - a[1].count)
  const topRests = sortedRests.slice(0, 5)
  const bottomRests = sortedRests.slice(-5).reverse()

  const totalNew = orders.filter(o => o.status === "new").length
  const totalPreparing = orders.filter(o => o.status === "preparing").length
  const totalReady = orders.filter(o => o.status === "ready").length

  if (loading && orders.length === 0) return (
    <div className="space-y-4 animate-fade-in">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الطلبات</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(totalCount)} طلب</p>
        </div>
        <Badge variant="outline" className="gap-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 self-start">
          <Activity className="size-3.5 text-success animate-pulse" />
          تحديث تلقائي
        </Badge>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-card/50 border border-border/30 p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">إجمالي</p>
          <p className="text-2xl font-bold mt-1">{toArabicNumber(orders.length)}</p>
        </div>
        <div className="rounded-md bg-orange-muted border border-orange/30 p-4 shadow-sm">
          <p className="text-xs text-orange">جديد</p>
          <p className="text-2xl font-bold mt-1 text-orange">{toArabicNumber(totalNew)}</p>
        </div>
        <div className="rounded-md bg-orange-muted border border-orange/30 p-4 shadow-sm">
          <p className="text-xs text-orange">قيد التحضير</p>
          <p className="text-2xl font-bold mt-1 text-orange">{toArabicNumber(totalPreparing)}</p>
        </div>
        <div className="rounded-md bg-success/10 border border-success/20 p-4 shadow-sm">
          <p className="text-xs text-success">جاهز</p>
          <p className="text-2xl font-bold mt-1 text-success">{toArabicNumber(totalReady)}</p>
        </div>
      </div>

      {/* Top & Bottom Restaurants */}
      {sortedRests.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-md bg-card/70 border border-border/30 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="size-4 text-success" />
              <h3 className="text-sm font-semibold">المطاعم الأكثر طلبات</h3>
            </div>
            <div className="space-y-2">
              {topRests.map(([name, data], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{toArabicNumber(i + 1)}</span>
                  <div className="flex-1 h-7 rounded-md bg-muted/30 flex items-center px-3">
                    <span className="text-sm truncate flex-1">{name}</span>
                    <span className="text-sm font-bold tabular-nums">{toArabicNumber(data.count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md bg-card/70 border border-border/30 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">المطاعم الأقل طلبات</h3>
            </div>
            <div className="space-y-2">
              {bottomRests.map(([name, data], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{toArabicNumber(i + 1)}</span>
                  <div className="flex-1 h-7 rounded-md bg-muted/30 flex items-center px-3">
                    <span className="text-sm truncate flex-1">{name}</span>
                    <span className="text-sm font-bold tabular-nums">{toArabicNumber(data.count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search + filter + dates */}
      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث برقم الطلب أو العميل أو المطعم..." className="flex-1 min-w-[200px]" />
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value) }}
          className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
          title="من تاريخ" aria-label="من تاريخ" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value) }}
          className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
          title="إلى تاريخ" aria-label="إلى تاريخ" />
        {(dateFrom || dateTo) && (
          <button type="button" onClick={() => { setDateFrom(""); setDateTo("") }}
            className="h-11 px-4 rounded-md border border-border/30 text-sm hover:bg-accent transition-all shrink-0">إلغاء</button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map(tab => (
          <button key={tab.value} type="button" onClick={() => { setFilter(tab.value); setPage(1) }}
            className={cn("snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
              filter === tab.value
                ? "bg-gradient-to-r from-orange to-orange/80 text-white shadow-lg shadow-orange/25"
                : "bg-card/50 border border-border/30 hover:border-orange/30"
            )}>{tab.label}</button>
        ))}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ClipboardList className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">{search ? "لا توجد نتائج" : "لا توجد طلبات"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.new
            const next = nextStatus[order.status]
            return (
              <div key={order.id} className="rounded-md border border-border/30 bg-card/50 p-5 hover:border-orange/30 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/admin/orders/${order.id}`)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("size-11 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                      <config.icon className={cn("size-5", config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{order.orderNo}</p>
                        <Badge className={cn("text-xs", config.bg, config.color)}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {order.restaurant && (
                          <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                            <Store className="size-3" />{order.restaurant.name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/60">{order.items?.length ?? 0} أصناف</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold text-lg tabular-nums">{toArabicNumber(order.total.toFixed(1))}</p>
                    <p className="text-xs text-muted-foreground">د.ل</p>
                  </div>
                </div>
                {next && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                    <button type="button" onClick={e => { e.stopPropagation(); updateStatus(order.id, next) }}
                      className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                        next === "preparing" && "border-orange/30 text-orange hover:bg-orange-muted",
                        next === "ready" && "border-green-200/30 text-success hover:bg-success/15",
                        next === "completed" && "border-orange/30 text-orange hover:bg-orange-muted",
                      )}>
                      ← {STATUS_CONFIG[next]?.label}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {orders.length < totalCount && (
        <div className="flex justify-center pt-4">
          <button type="button" onClick={() => { const np = page + 1; setPage(np); fetchOrders(np, true) }}
            className="px-6 py-2 rounded-full border border-border/30 text-sm font-medium hover:bg-accent transition-all">
            عرض المزيد ({toArabicNumber(totalCount - orders.length)})
          </button>
        </div>
      )}
    </div>
  )
}
