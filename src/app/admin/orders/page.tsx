"use client"

import { csrfFetch } from "@/lib/csrf-client";
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ClipboardList, Search, Store, Clock, ChefHat,
  CheckCircle, XCircle,
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
  const router = useRouter()

  const fetchOrders = useCallback(async (status: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      const url = `/api/orders?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Fell to fetch orders")
      const data = await res.json()
      setOrders(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch { toast.error("فشل تحميل الطلبات") }
    finally { setLoading(false) }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchOrders(filter) }, [filter, fetchOrders])

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await csrfFetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success(`تم تغيير الحالة`)
        fetchOrders(filter)
      }
    } catch { toast.error("فشل التحديث") }
  }

  const nextStatus: Record<string, string> = {
    new: "preparing", preparing: "ready", ready: "completed",
  }

  const filtered = orders.filter(o => {
    if (!search) return true
    const q = search.toLowerCase()
    return o.orderNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.restaurant?.name || "").includes(q)
  })

  // Stats
  const totalNew = orders.filter(o => o.status === "new").length
  const totalPreparing = orders.filter(o => o.status === "preparing").length

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الطلبات</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(orders.length)} طلب</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">إجمالي</p>
          <p className="text-2xl font-bold mt-1">{toArabicNumber(orders.length)}</p>
        </div>
        <div className="rounded-md bg-orange-muted dark:bg-orange-muted border border-orange/30 p-4">
          <p className="text-xs text-orange dark:text-orange">جديد</p>
          <p className="text-2xl font-bold mt-1 text-orange dark:text-orange">{toArabicNumber(totalNew)}</p>
        </div>
        <div className="rounded-md bg-orange-muted dark:bg-orange-muted border border-orange/30 p-4">
          <p className="text-xs text-orange dark:text-orange">قيد التحضير</p>
          <p className="text-2xl font-bold mt-1 text-orange dark:text-orange">{toArabicNumber(totalPreparing)}</p>
        </div>
        <div className="rounded-md bg-success/10 border border-success/20 p-4">
          <p className="text-xs text-success">جاهز + مكتمل</p>
          <p className="text-2xl font-bold mt-1 text-success">
            {toArabicNumber(orders.filter(o => o.status === "ready" || o.status === "completed").length)}
          </p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث برقم الطلب أو العميل أو المطعم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pr-11 rounded-md border border-border/30 bg-card/50 px-4 text-sm outline-none transition-all focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); fetchOrders(filter) }}
          className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
          title="من تاريخ"
          aria-label="من تاريخ"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); fetchOrders(filter) }}
          className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
          title="إلى تاريخ"
          aria-label="إلى تاريخ"
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(""); setDateTo(""); fetchOrders(filter) }}
            className="h-11 px-4 rounded-md border border-border/30 text-sm hover:bg-accent transition-all shrink-0"
          >
            إلغاء
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              "snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
              filter === tab.value
                ? "bg-gradient-to-r from-orange to-orange/80 text-white shadow-lg shadow-orange/25"
                : "bg-card/50 border border-border/30 hover:border-orange/30"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders */}
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
              <div
                key={order.id}
                className="rounded-md border border-border/30 bg-card/50 p-5 hover:border-orange/30 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/admin/orders/${order.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("size-11 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                      <config.icon className={cn("size-5", config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{order.orderNo}</p>
                        <Badge className={cn("text-xs", config.bg, config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {order.restaurant && (
                          <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                            <Store className="size-3" />
                            {order.restaurant.name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/60">
                          {order.items?.length ?? 0} أصناف
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="font-bold text-lg tabular-nums">{toArabicNumber(order.total.toFixed(1))}</p>
                    <p className="text-xs text-muted-foreground">د.ل</p>
                  </div>
                </div>

                {/* Quick status action */}
                {next && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); updateStatus(order.id, next) }}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                        next === "preparing" && "border-orange/30 text-orange dark:text-orange hover:bg-orange-muted dark:hover:bg-orange-muted",
                        next === "ready" && "border-green-200/30 text-success hover:bg-success/15",
                        next === "completed" && "border-orange/30 text-orange dark:text-orange hover:bg-orange-muted dark:hover:bg-orange-muted",
                      )}
                    >
                      ← {STATUS_CONFIG[next]?.label}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
