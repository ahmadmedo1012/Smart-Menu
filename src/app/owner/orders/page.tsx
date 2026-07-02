"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import BackButton from "@/components/shared/BackButton"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { premiumToast } from "@/lib/premium-toast"
import { csrfFetch } from "@/lib/csrf-client"
import { SearchInput } from "@/components/ui/search-input"
import { ClipboardList, Clock, CheckCircle, XCircle, ChefHat, PackageCheck, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber, formatDate } from "@/lib/format"

interface Order {
  id: number; orderNo: string; customerName: string; customerPhone?: string; status: string;
  total: number; pickupType: string; createdAt: string;
  items: { quantity: number }[]
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string; next: string | null }> = {
  new: { label: "جديد", icon: Clock, color: "text-orange dark:text-orange", bg: "bg-orange-muted dark:bg-orange-muted", next: "preparing" },
  preparing: { label: "قيد التحضير", icon: ChefHat, color: "text-orange dark:text-orange", bg: "bg-orange-muted dark:bg-orange-muted", next: "ready" },
  ready: { label: "جاهز", icon: PackageCheck, color: "text-success", bg: "bg-success/10", next: "completed" },
  completed: { label: "مكتمل", icon: CheckCircle, color: "text-muted-foreground", bg: "bg-muted", next: null },
  cancelled: { label: "ملغي", icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", next: null },
};

const TABS = [
  { value: "", label: "الكل", count: 0 },
  { value: "new", label: "جديد", count: 0 },
  { value: "preparing", label: "قيد التحضير", count: 0 },
  { value: "ready", label: "جاهز", count: 0 },
  { value: "completed", label: "مكتمل", count: 0 },
];

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const eventSourceRef = useRef<EventSource | null>(null)
  const sseErrorCountRef = useRef(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchOrdersRef = useRef<typeof fetchOrders>(null as any)

  const startPolling = useCallback((status: string) => {
    if (pollingRef.current) return
    pollingRef.current = setInterval(() => fetchOrdersRef.current?.(status, 1, false), 15000)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }, [])

  const fetchOrders = useCallback(async (status: string, pageNum = 1, append = false, dateF?: string, dateT?: string) => {
    try {
      if (pageNum === 1) setLoading(true)
      else setLoadingMore(true)
      setError(null)
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      params.set("page", String(pageNum))
      params.set("pageSize", "20")
      const from = dateF ?? dateFrom
      const to = dateT ?? dateTo
      if (from) params.set("dateFrom", from)
      if (to) params.set("dateTo", to)
      const url = `/api/orders?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const json = await res.json()
      const newOrders = json.data ?? json ?? []
      if (append) {
        setOrders(prev => [...prev, ...newOrders])
      } else {
        setOrders(newOrders)
      }
      setHasMore(newOrders.length === 20)
      setPage(pageNum)
    } catch { setError("فشل تحميل الطلبات"); premiumToast("error", "فشل تحميل الطلبات") }
    finally { if (pageNum === 1) setLoading(false); else setLoadingMore(false) }
  }, [dateFrom, dateTo])
  useEffect(() => { fetchOrdersRef.current = fetchOrders }, [fetchOrders])

  const loadMore = () => fetchOrders(filter, page + 1, true)

  useEffect(() => { fetchOrders(filter, 1, false) }, [filter, fetchOrders])

  // Auto-refresh via SSE for new orders
  useEffect(() => {
    const es = new EventSource("/api/orders/stream")
    eventSourceRef.current = es
    sseErrorCountRef.current = 0
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.newOrders && data.newOrders > 0) {
          fetchOrders(filter, 1, false)
          premiumToast("success", `📦 ${data.newOrders} طلب جديد!`, undefined, { duration: 5000 })
        }
      } catch {}
    }
    es.onerror = () => {
      sseErrorCountRef.current += 1
      // ponytail: count is implicitly visible via reconnect behavior
      if (sseErrorCountRef.current >= 3) {
        es.close()
        premiumToast("refresh", "فقدان الاتصال المباشر. جاري التحديث الدوري...")
        startPolling(filter)
      }
    }
    return () => { es.close(); stopPolling() }
  }, [filter, fetchOrders, startPolling, stopPolling])

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await csrfFetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        premiumToast("save", `تم تغيير الحالة إلى ${STATUS_CONFIG[newStatus]?.label}`)
      }
    } catch { premiumToast("error", "فشل تحديث الحالة") }
  }

  const filtered = orders.filter(o =>
    !search || o.orderNo.includes(search) || o.customerName.includes(search)
  )

  const tabsWithCounts = TABS.map(tab => ({
    ...tab,
    count: tab.value === "" ? orders.length : orders.filter(o => o.status === tab.value).length,
  }))

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      {/* Back button skeleton */}
      <div className="h-8 w-24 rounded-md bg-muted/40 animate-pulse" />
      {/* Title skeleton */}
      <div className="h-8 w-32 rounded-lg bg-muted/50 animate-pulse" />
      {/* Search skeleton */}
      <div className="h-11 rounded-md bg-muted/40 animate-pulse" />
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-9 w-20 rounded-md bg-muted/40 animate-pulse" />)}
      </div>
      {/* Orders skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 rounded-md bg-card/50 border border-border/20 p-5 space-y-3 animate-pulse">
          <div className="h-4 w-40 rounded bg-muted/60" />
          <div className="h-3 w-24 rounded bg-muted/40" />
          <div className="h-3 w-full rounded bg-muted/30" />
        </div>
      ))}
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <div className="size-20 rounded-md bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="size-10 text-destructive/60" />
      </div>
      <p className="text-lg font-medium">حدث خطأ</p>
      <p className="text-sm text-muted-foreground">{error}</p>
      <Button variant="outline" size="sm" onClick={() => fetchOrders(filter, 1, false)} className="gap-1.5">
        إعادة المحاولة
      </Button>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      <BackButton href="/owner" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الطلبات</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(orders.length)} طلب</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const headers = "رقم الطلب,العميل,الهاتف,الحالة,النوع,المجموع,التاريخ"
            const rows = orders.map(o => {
              const statusLabel = o.status === "new" ? "جديد" : o.status === "preparing" ? "تحضير" : o.status === "ready" ? "جاهز" : o.status === "completed" ? "مكتمل" : "ملغي"
              const typeLabel = o.pickupType === "delivery" ? "توصيل" : o.pickupType === "takeaway" ? "سفري" : "داخل المكان"
              return `${o.orderNo},${o.customerName},${o.customerPhone || ""},${statusLabel},${typeLabel},${o.total},${formatDate(new Date(o.createdAt))}`
            }).join("\n")
            const csv = `${headers}\n${rows}`
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const link = document.createElement("a")
            link.href = URL.createObjectURL(blob)
            link.download = `orders-${new Date().toISOString().slice(0,10)}.csv`
            link.click()
          }}
          disabled={orders.length === 0}
          className="h-11 px-5 rounded-md border border-border/30 bg-card/50 text-sm font-medium hover:bg-accent transition-all disabled:opacity-40 flex items-center gap-2"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          تصدير CSV
        </button>
      </div>

      {/* Search + Date filter */}
      <div className="flex gap-2 items-start flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ابحث برقم الطلب أو اسم العميل..."
        />
        <input
          type="date"
          value={dateFrom}
          onChange={e => { const v = e.target.value; setDateFrom(v); fetchOrders(filter, 1, false, v, dateTo) }}
          className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
          title="من تاريخ"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => { const v = e.target.value; setDateTo(v); fetchOrders(filter, 1, false, dateFrom, v) }}
          className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
          title="إلى تاريخ"
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(""); setDateTo(""); fetchOrders(filter, 1, false, "", "") }}
            className="h-11 px-4 rounded-md border border-border/30 text-sm hover:bg-accent transition-all"
          >
            إلغاء
          </button>
        )}
      </div>

      {/* Status tabs with counts */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabsWithCounts.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              "snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2",
              filter === tab.value
                ? "bg-gradient-to-r from-orange to-orange/80 text-white shadow-lg shadow-orange/25"
                : "bg-card/50 border border-border/30 hover:border-orange/30"
            )}
          >
            {tab.label}
            <span className={cn(
              "inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold",
              filter === tab.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {toArabicNumber(tab.count)}
            </span>
          </button>
        ))}
      </div>

      {/* Orders */}
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="size-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="px-8 py-3 rounded-md border border-border/30 bg-card/50 text-sm font-medium hover:bg-accent transition-all disabled:opacity-50"
          >
            {loadingMore ? "جاري التحميل..." : "تحميل المزيد ↓"}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 animate-fade-in">
          <div className="empty-state-icon">
            <ClipboardList />
          </div>
          <p className="text-lg font-medium">{search ? "لا توجد نتائج" : "لا توجد طلبات"}</p>
          <p className="text-sm text-muted-foreground/60">
            {search ? "جرب كلمات بحث أخرى" : "عندما يطلب الزبائن، ستظهر الطلبات هنا"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
            const StatusIcon = config.icon;
            const nextStatus = config.next;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-border/30 bg-card/50 p-5 hover:border-orange/30 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/owner/orders/${order.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("size-11 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                      <StatusIcon className={cn("size-5", config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{order.orderNo}</p>
                        <Badge className={cn("text-xs", config.bg, config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {toArabicNumber(order.items?.length ?? 0)} أصناف • {order.pickupType === "delivery" ? "توصيل" : order.pickupType === "takeaway" ? "سفري" : "داخل المكان"}
                      </p>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="font-bold text-lg tabular-nums">{toArabicNumber(order.total.toFixed(1))}</p>
                    <p className="text-xs text-muted-foreground">د.ل</p>
                  </div>
                </div>

                {/* Status actions */}
                {nextStatus && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); updateStatus(order.id, nextStatus) }}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                        nextStatus === "preparing" && "border-orange/30 text-orange hover:bg-orange-muted dark:hover:bg-orange-muted",
                        nextStatus === "ready" && "border-green-200/30 text-success hover:bg-success/15",
                        nextStatus === "completed" && "border-orange/30 text-orange hover:bg-orange-muted dark:hover:bg-orange-muted",
                      )}
                    >
                      ← {STATUS_CONFIG[nextStatus]?.label}
                    </button>
                    {order.status === "new" && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); if (window.confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) updateStatus(order.id, "cancelled") }}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-red-200/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
