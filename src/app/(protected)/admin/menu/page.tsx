"use client"

import { csrfJson } from "@/lib/csrf-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useEffect, useState, useCallback, useRef } from "react"
import { usePollWhenVisible } from "@/hooks/usePollWhenVisible"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { SearchInput } from "@/components/ui/search-input"
import { premiumToast } from "@/lib/premium-toast"
import { Package, Store, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber, formatPrice } from "@/lib/format"
import { LoadingAnnouncer } from "@/components/ui/loading-announcer"
import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { useAccessGate, allowRolesOrPermission } from '@/hooks/useAccessGate';
import { AccessDenied } from '@/components/shared/AccessDenied';

interface Item {
  id: number; name: string; nameAr: string | null; description: string; descriptionAr: string
  price: number; discountedPrice: number | null; image: string; status: string; sortOrder: number
  categoryId: number; category?: { name: string; restaurant: { name: string; id: number } }
  restaurant?: { name: string; id: number }
}

export default function AdminMenuPage() {
  const access = useAccessGate(allowRolesOrPermission(['super_admin', 'admin'], 'MANAGE_RESTAURANTS'));


  const [items, setItems] = useState<Item[]>([])
  const [restaurants, setRestaurants] = useState<{ id: number; name: string; slug: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [restaurantFilter, setRestaurantFilter] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: number; name: string; parentRestaurant?: string } | null>(null)
  const dataRef = useRef("")
  const restRef = useRef("")
  const probeRef = useRef<string | null>(null)
  const tickRef = useRef(0)

  const fetchData = useCallback(async () => {
    try {
      const [itemRes, restRes] = await Promise.all([
        fetch("/api/items?pageSize=100"),
        fetch("/api/restaurants"),
      ])
      const itemJson = await itemRes.json()
      const restJson = await restRes.json()
      const newItems: Item[] = Array.isArray(itemJson.data) ? itemJson.data : []
      const restaurantList = restJson.data?.restaurants ?? restJson.data ?? []
      const hash = JSON.stringify(newItems)
      if (hash !== dataRef.current) {
        dataRef.current = hash
        setItems(newItems)
      }
      // round87-B1: restaurants were re-set on EVERY tick (constant re-render of
      // the table) — now only when the list actually changed
      const restHash = JSON.stringify(restaurantList)
      if (restHash !== restRef.current) {
        restRef.current = restHash
        setRestaurants(restaurantList)
      }
    } catch { /* silent retry */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // round87-B1: probe-then-refetch. The old 12s poll pulled ~100KB
  // (pageSize=100 full rows + the restaurants list) on every tick while the
  // steady-state diff is "nothing changed". The probe fetches ONE row and
  // compares (total, top id, top updatedAt) — ~0.6KB, ≈97% payload cut.
  // Trade-off (documented): an external edit to a NON-top item with unchanged
  // totals surfaces on the next structural change or manual refresh; local
  // mutations already trigger an immediate refetch. Restaurants get a light
  // refresh every 5th tick (~60s) for the filter dropdown.
  const probe = useCallback(async () => {
    tickRef.current++
    try {
      const res = await fetch("/api/items?pageSize=1")
      if (res.ok) {
        const json = await res.json()
        const top = Array.isArray(json.data) ? json.data[0] : undefined
        const sig = `${json.meta?.total ?? "?"}:${top?.id ?? "-"}:${top?.updatedAt ?? "-"}`
        if (probeRef.current === null || sig !== probeRef.current) {
          probeRef.current = sig
          await fetchData()
        }
      }
      if (tickRef.current % 5 === 0) {
        const restRes = await fetch("/api/restaurants")
        if (restRes.ok) {
          const restJson = await restRes.json()
          const restaurantList = restJson.data?.restaurants ?? restJson.data ?? []
          const restHash = JSON.stringify(restaurantList)
          if (restHash !== restRef.current) {
            restRef.current = restHash
            setRestaurants(restaurantList)
          }
        }
      }
    } catch { /* transient — next tick retries */ }
  }, [fetchData])

  usePollWhenVisible(probe, 12_000, [probe])

  // Filter
  const filteredItems = items.filter(item => {
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = (item.nameAr || item.name).includes(q)
      const catMatch = item.category?.name.includes(q)
      const restMatch = item.category?.restaurant?.name.toLowerCase().includes(q)
      if (!nameMatch && !catMatch && !restMatch) return false
    }
    if (restaurantFilter) {
      const restName = item.category?.restaurant?.name || ""
      if (restName !== restaurantFilter) return false
    }
    return true
  })

  // Group by restaurant then category
  const grouped: Record<string, Record<string, typeof filteredItems>> = {}
  filteredItems.forEach(item => {
    const restName = item.category?.restaurant?.name || "غير معروف"
    const catName = item.category?.name || "أخرى"
    if (!grouped[restName]) grouped[restName] = {}
    if (!grouped[restName][catName]) grouped[restName][catName] = []
    grouped[restName][catName].push(item)
  })

  const toggleStatus = async (item: Item) => {
    const ns = item.status === "available" ? "unavailable" : "available"
    try {
      await csrfJson(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ns }),
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: ns } : i))
      premiumToast(ns === "available" ? "success" : "error", ns === "available" ? "متوفر" : "غير متوفر")
    } catch (e) { premiumToast("error", getErrorMessage(e, "تعذّر التحديث")) }
  }

  const deleteItem = async () => {
    if (!deleteTarget || deleteTarget.type !== "item") return
    try {
      await csrfJson(`/api/items/${deleteTarget.id}`, { method: "DELETE" })
      premiumToast("success", "تم حذف الصنف")
      setDeleteTarget(null)
      fetchData()
    } catch (e) { premiumToast("error", getErrorMessage(e, "تعذّر الحذف")) }
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <LoadingAnnouncer loading message="جارٍ تحميل المنيو…" />
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )

  const totalRestaurants = Object.keys(grouped).length

    if (access === 'denied') return <AccessDenied />

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 animate-fade-in">
      {/* r131-F5 (A1 P0-8): canonical page header. */}
      <PageHeader
        title="إدارة المنيو"
        subtitle={`${toArabicNumber(items.length)} صنف في ${toArabicNumber(totalRestaurants)} مطعم`}
        actions={
          <Badge variant="outline" className="gap-1.5 bg-success/10 dark:bg-success/15">
            <Activity className="size-3.5 text-success-ink animate-pulse" />
            تحديث تلقائي
          </Badge>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث عن صنف أو مطعم…" className="flex-1 min-w-[200px]" />
        <select
          value={restaurantFilter}
          onChange={e => setRestaurantFilter(e.target.value)}
          className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-ring min-w-[160px]"
          aria-label="فلتر المطعم"
        >
          <option value="">كل المطاعم</option>
          {restaurants.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>

      {/* Stats — Phase 6 (r154): plate-round tiles + Baloo labels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-card/50 border border-border/30 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold tabular-nums">{toArabicNumber(items.length)}</p>
          <p className="font-heading text-xs font-semibold text-muted-foreground">إجمالي الأصناف</p>
        </div>
        <div className="rounded-lg bg-card/50 border border-border/30 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-success-ink tabular-nums">{toArabicNumber(items.filter(i => i.status === "available").length)}</p>
          <p className="font-heading text-xs font-semibold text-muted-foreground">متوفر</p>
        </div>
        <div className="rounded-lg bg-card/50 border border-border/30 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-destructive tabular-nums">{toArabicNumber(items.filter(i => i.status !== "available").length)}</p>
          <p className="font-heading text-xs font-semibold text-muted-foreground">غير متوفر</p>
        </div>
        <div className="rounded-lg bg-card/50 border border-border/30 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold tabular-nums">{toArabicNumber(restaurants.length)}</p>
          <p className="font-heading text-xs font-semibold text-muted-foreground">مطاعم</p>
        </div>
      </div>

      {/* Items by restaurant */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Package className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">{search || restaurantFilter ? "لا توجد نتائج" : "لا توجد أصناف"}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([restName, cats]) => (
            <div key={restName} className="rounded-lg border border-border/30 overflow-hidden shadow-sm">
              <div className="bg-muted/30 px-5 py-3 border-b border-border/20 flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <h2 className="font-heading font-bold text-base">{restName}</h2>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full me-auto">
                  {toArabicNumber(Object.values(cats).reduce((s, c) => s + c.length, 0))} صنف
                </span>
              </div>
              <div className="divide-y divide-border/10">
                {Object.entries(cats).map(([catName, catItems]) => (
                  <div key={catName}>
                    <div className="px-5 py-2 bg-muted/10 flex items-center gap-2">
                      <Package className="size-3.5 text-muted-foreground/60" />
                      <span className="text-sm font-medium text-muted-foreground">{catName}</span>
                      <span className="text-xs text-muted-foreground/50">({toArabicNumber(catItems.length)})</span>
                    </div>
                    {catItems.map(item => (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-orange/5 transition-colors group">
                        <div className={cn("size-2 rounded-full shrink-0", item.status === "available" ? "bg-success" : "bg-destructive")} />
                        {/* Phase 6 (r154): قائد النقاط — سعر الصنف
                            على طراز المنيو المطبوع (نفس بصمة أقسام المالك):
                            الاسم ثم القائد المرن ثم السعر، والقاعدة تمط. */}
                        <div className="flex-1 min-w-0 menu-leader">
                          <span className={cn("font-medium text-sm min-w-0", item.status !== "available" && "text-muted-foreground/50 line-through")}>
                            {item.nameAr || item.name}
                          </span>
                          <i className="menu-leader-rule" aria-hidden="true" />
                          <span className={cn("font-bold text-sm tabular-nums shrink-0", item.discountedPrice ? "text-destructive" : "")}>
                            {formatPrice(item.discountedPrice ?? item.price, { suffix: "" })}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">د.ل</span>
                        </div>
                        <Switch
                          size="sm"
                          checked={item.status === "available"}
                          onCheckedChange={() => toggleStatus(item)}
                          aria-label={`تغيير حالة توفر ${item.name}`}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف &ldquo;{deleteTarget?.name}&rdquo;؟
              {deleteTarget?.parentRestaurant && ` من مطعم ${deleteTarget.parentRestaurant}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={deleteItem}>حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
