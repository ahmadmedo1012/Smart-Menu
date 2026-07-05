"use client"

import { csrfFetch } from "@/lib/csrf-client";
import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { SearchInput } from "@/components/ui/search-input"
import { premiumToast } from "@/lib/premium-toast"
import { Package, Store, Activity, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import { Badge } from "@/components/ui/badge"

interface Item {
  id: number; name: string; nameAr: string | null; description: string; descriptionAr: string
  price: number; discountedPrice: number | null; image: string; status: string; sortOrder: number
  categoryId: number; category?: { name: string; restaurant: { name: string; id: number } }
  restaurant?: { name: string; id: number }
}

export default function AdminMenuPage() {
  const [accessDenied, setAccessDenied] = useState(false)
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { setAccessDenied(true); return }
        const { role, permissions } = d.data
        if (role !== "super_admin" && role !== "admin" && !(permissions ?? []).includes("MANAGE_RESTAURANTS")) {
          setAccessDenied(true)
        }
      })
      .catch(() => setAccessDenied(true))
  }, [])

  const [items, setItems] = useState<Item[]>([])
  const [restaurants, setRestaurants] = useState<{ id: number; name: string; slug: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [restaurantFilter, setRestaurantFilter] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: number; name: string; parentRestaurant?: string } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dataRef = useRef("")

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
      setRestaurants(restaurantList)
    } catch { /* silent retry */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-poll every 5s
  useEffect(() => {
    intervalRef.current = setInterval(fetchData, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

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
      await csrfFetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ns }),
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: ns } : i))
      premiumToast(ns === "available" ? "success" : "error", ns === "available" ? "متوفر" : "غير متوفر")
    } catch { premiumToast("error", "فشل التحديث") }
  }

  const deleteItem = async () => {
    if (!deleteTarget || deleteTarget.type !== "item") return
    try {
      await csrfFetch(`/api/items/${deleteTarget.id}`, { method: "DELETE" })
      premiumToast("success", "تم حذف الصنف")
      setDeleteTarget(null)
      fetchData()
    } catch { premiumToast("error", "فشل الحذف") }
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )

  const totalRestaurants = Object.keys(grouped).length

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
      <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
      <p className="text-sm text-muted-foreground max-w-xs">لا تملك الصلاحية للوصول إلى هذه الصفحة.</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المنيو</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(items.length)} صنف في {toArabicNumber(totalRestaurants)} مطعم</p>
        </div>
        <Badge variant="outline" className="gap-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 self-start">
          <Activity className="size-3.5 text-success animate-pulse" />
          تحديث تلقائي
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث عن صنف أو مطعم..." className="flex-1 min-w-[200px]" />
        <select
          value={restaurantFilter}
          onChange={e => setRestaurantFilter(e.target.value)}
          className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange min-w-[160px]"
          aria-label="فلتر المطعم"
        >
          <option value="">كل المطاعم</option>
          {restaurants.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-card/50 border border-border/30 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">{toArabicNumber(items.length)}</p>
          <p className="text-xs text-muted-foreground">إجمالي الأصناف</p>
        </div>
        <div className="rounded-md bg-card/50 border border-border/30 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-success">{toArabicNumber(items.filter(i => i.status === "available").length)}</p>
          <p className="text-xs text-muted-foreground">متوفر</p>
        </div>
        <div className="rounded-md bg-card/50 border border-border/30 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-500">{toArabicNumber(items.filter(i => i.status !== "available").length)}</p>
          <p className="text-xs text-muted-foreground">غير متوفر</p>
        </div>
        <div className="rounded-md bg-card/50 border border-border/30 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">{toArabicNumber(restaurants.length)}</p>
          <p className="text-xs text-muted-foreground">مطاعم</p>
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
            <div key={restName} className="rounded-md border border-border/30 overflow-hidden shadow-sm">
              <div className="bg-muted/30 px-5 py-3 border-b border-border/20 flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <h3 className="font-bold text-base">{restName}</h3>
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
                      <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors group">
                        <div className={cn("size-2 rounded-full shrink-0", item.status === "available" ? "bg-success" : "bg-red-400")} />
                        <div className="flex-1 min-w-0">
                          <span className={cn("font-medium text-sm", item.status !== "available" && "text-muted-foreground/50 line-through")}>
                            {item.nameAr || item.name}
                          </span>
                        </div>
                        <div className="text-left shrink-0">
                          <span className={cn("font-bold text-sm tabular-nums", item.discountedPrice ? "text-destructive" : "")}>
                            {toArabicNumber((item.discountedPrice ?? item.price).toFixed(1))}
                          </span>
                          <span className="text-xs text-muted-foreground ms-1">د.ل</span>
                        </div>
                        <Switch size="sm" checked={item.status === "available"} onCheckedChange={() => toggleStatus(item)} />
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
        <DialogContent className="rounded-md">
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
