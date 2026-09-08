"use client"

import { csrfJson } from "@/lib/csrf-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import { usePollWhenVisible } from "@/hooks/usePollWhenVisible"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import { premiumToast } from "@/lib/premium-toast"
import { ClipboardList, Store, Clock, ChefHat, CheckCircle, XCircle, Activity } from 'lucide-react';
import AnimatedBarChart3 from '@/components/ui/chart-bar-icon';
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import { LoadingAnnouncer } from "@/components/ui/loading-announcer"
import { useAccessGate, allowRolesOrPermission } from '@/hooks/useAccessGate';
import { AccessDenied } from '@/components/shared/AccessDenied';

interface Order {
  id: number; orderNo: string; customerName: string; status: string
  total: number; _count: { items: number }
  restaurant: { id: number; name: string; slug: string } | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  new: { label: "جديد", icon: Clock, color: "text-orange dark:text-orange", bg: "bg-orange-muted dark:bg-orange-muted" },
  preparing: { label: "قيد التحضير", icon: ChefHat, color: "text-orange dark:text-orange", bg: "bg-orange-muted dark:bg-orange-muted" },
  ready: { label: "جاهز", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  completed: { label: "مكتمل", icon: CheckCircle, color: "text-muted-foreground", bg: "bg-muted" },
  cancelled: { label: "ملغي", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
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
  const access = useAccessGate(allowRolesOrPermission(['super_admin', 'admin'], 'APPROVE_ORDERS'));


  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const dataRef = useRef("")
  // round86-C2: the 5s poll used to call fetchOrders(1) — which REPLACED the
  // list, erasing "عرض المزيد" (page 2+) results within 5 seconds. The poll is
  // now an ID probe that refreshes all loaded pages when page 1 actually changed.
  const ordersRef = useRef<Order[]>([])
  const pageRef = useRef(1)
  const probeRef = useRef<string | null>(null)
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
      // round87-B1: paginated() puts totals under meta (flat `data.total` was
      // always undefined → totalCount silently fell back to the page length)
      setTotalCount(data.meta?.total ?? data.total ?? newOrders.length)
    } catch { premiumToast("error", "فشل تحميل الطلبات") }
    finally { setLoading(false) }
  }, [filter, dateFrom, dateTo])

  useEffect(() => { setPage(1); probeRef.current = null; fetchOrders(1) }, [fetchOrders])
  useEffect(() => { ordersRef.current = orders }, [orders])
  useEffect(() => { pageRef.current = page }, [page])

  // round90-F4 (performance P1): refresh ALL loaded pages in ONE parallel
  // batch (was a sequential `for p… await fetchOrders(p, true)` loop — N
  // serial round-trips on every changed-probe tick). Pages are fetched with
  // Promise.all, merged in page order (deduped by id against page-boundary
  // drift), and written to state ONCE. A failed batch keeps the current
  // list (the probe already advanced, matching the old semantics) and
  // surfaces one error toast.
  const refetchLoadedPages = useCallback(async () => {
    const totalPages = pageRef.current
    if (totalPages < 1) return
    const buildParams = (pageNum: number) => {
      const params = new URLSearchParams()
      if (filter) params.set("status", filter)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      params.set("page", String(pageNum))
      params.set("pageSize", "50")
      return `/api/orders?${params.toString()}`
    }
    try {
      const results = await Promise.all(
        Array.from({ length: totalPages }, (_, i) => i + 1).map(async (p) => {
          const res = await fetch(buildParams(p))
          if (!res.ok) throw new Error(`Failed to fetch orders (page ${p})`)
          return (await res.json()) as { data?: unknown; meta?: { total?: number }; total?: number }
        }),
      )
      const seen = new Set<number>()
      const merged: Order[] = []
      for (const page of results) {
        const rows: Order[] = Array.isArray(page.data) ? page.data : []
        for (const o of rows) {
          if (!seen.has(o.id)) { seen.add(o.id); merged.push(o) }
        }
      }
      dataRef.current = JSON.stringify(merged.map(o => o.id + o.status))
      setOrders(merged)
      // round87-B1: meta.total (flat data.total fallback) — same read fetchOrders uses
      setTotalCount(results[0]?.meta?.total ?? results[0]?.total ?? merged.length)
    } catch {
      // one toast per failed batch (the old serial loop toasted per page);
      // the list stays as-is — the next structural change re-triggers this.
      premiumToast("error", "فشل تحميل الطلبات")
    }
  }, [filter, dateFrom, dateTo])

  // round87-B1: probe-then-refetch (the old "ID probe" still downloaded the full
  // 50-row page every 5s ≈ 20KB/tick while the steady-state diff is "nothing
  // changed"). The probe fetches ONE row and compares (total, top id, top
  // updatedAt) ≈ 0.6KB — a 97% cut. Trade-off (documented): a status flip on a
  // NON-top order with unchanged totals surfaces on the next structural change
  // or manual refresh; new/removed orders always change the total. The first
  // tick only records the baseline (the mount effect does the initial load).
  usePollWhenVisible(async () => {
    try {
      const params = new URLSearchParams()
      if (filter) params.set("status", filter)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      params.set("page", "1")
      params.set("pageSize", "1")
      const res = await fetch(`/api/orders?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      const top = Array.isArray(data.data) ? data.data[0] : undefined
      const sig = `${data.meta?.total ?? data.total ?? "?"}:${top?.id ?? "-"}:${top?.updatedAt ?? "-"}`
      if (probeRef.current === null) {
        probeRef.current = sig
        return
      }
      if (sig === probeRef.current) return
      probeRef.current = sig
      // round90-F4: parallel refresh of every loaded page (see refetchLoadedPages)
      await refetchLoadedPages()
    } catch { /* transient — next tick retries */ }
  }, 5_000, [refetchLoadedPages, filter, dateFrom, dateTo])

  const updateStatus = async (id: number, status: string) => {
    const prev = orders.find(o => o.id === id)?.status
    // round87-C3: optimistic flip + rollback — was a silent no-op when the
    // server rejected the change (no toast, no revert), and the catch hid
    // the server's Arabic error message.
    setOrders(prevList => prevList.map(o => (o.id === id ? { ...o, status } : o)))
    try {
      await csrfJson(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      premiumToast("refresh", `تم تغيير الحالة`)
      fetchOrders(1)
    } catch (e) {
      if (prev !== undefined) setOrders(prevList => prevList.map(o => (o.id === id ? { ...o, status: prev } : o)))
      premiumToast("error", getErrorMessage(e, "فشل التحديث"))
    }
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
      <LoadingAnnouncer loading message="جارٍ تحميل الطلبات..." />
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )

    if (access === 'denied') return <AccessDenied />

  return (
    <div className="space-y-6 animate-fade-in overflow-x-clip">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">الطلبات</h1>
          <p className="text-sm text-muted-foreground">{toArabicNumber(totalCount)} طلب</p>
        </div>
        <Badge variant="outline" className="gap-1.5 bg-success/10 self-start">
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
              <AnimatedBarChart3 className="size-4 text-success" />
              <h2 className="text-sm font-semibold">المطاعم الأكثر طلبات</h2>
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
              <AnimatedBarChart3 className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">المطاعم الأقل طلبات</h2>
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
            className="h-11 px-4 rounded-md border border-border/30 text-sm hover:bg-accent transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">إلغاء</button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map(tab => (
          <button key={tab.value} type="button" onClick={() => { setFilter(tab.value); setPage(1) }}
            className={cn("snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-[background-color,color,border-color,box-shadow] duration-300",
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
              <div key={order.id} role="link" tabIndex={0} className="rounded-md border border-border/30 bg-card/50 p-5 hover:border-orange/30 hover:shadow-md transition-[border-color,box-shadow] cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => router.push(`/admin/orders/${order.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/admin/orders/${order.id}`);
                  }
                }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("size-11 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                      <config.icon className={cn("size-5", config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {/* round94 (D §5): bdi بنمط صفحة التفاصيل — عزل اتجاه رقم الطلب اللاتيني داخل RTL */}
                        <p className="font-bold"><bdi dir="ltr">{order.orderNo}</bdi></p>
                        <Badge className={cn("text-xs", config.bg, config.color)}>
                          <config.icon className="size-3" aria-hidden="true" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {order.restaurant && (
                          <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                            <Store className="size-3" />{order.restaurant.name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/60">{order._count?.items ?? 0} أصناف</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-bold text-lg tabular-nums">{toArabicNumber(order.total.toFixed(1))}</p>
                    <p className="text-xs text-muted-foreground">د.ل</p>
                  </div>
                </div>
                {next && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                    <button type="button" onClick={e => { e.stopPropagation(); updateStatus(order.id, next) }}
                      className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-colors border",
                        next === "preparing" && "border-orange/30 text-orange hover:bg-orange-muted",
                        next === "ready" && "border-success/25 text-success hover:bg-success/15",
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
            className="px-6 py-2 rounded-full border border-border/30 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            عرض المزيد ({toArabicNumber(totalCount - orders.length)})
          </button>
        </div>
      )}
    </div>
  )
}
