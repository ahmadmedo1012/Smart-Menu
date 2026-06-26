"use client"

import { csrfFetch } from "@/lib/csrf-client";

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Trash2, Package, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

interface Restaurant {
  id: number; name: string; slug: string
}

interface Category {
  id: number; name: string; nameAr: string | null; icon: string; sortOrder: number
  restaurant: { id: number; name: string; slug: string }
}

interface Item {
  id: number; name: string; nameAr: string | null; description: string; descriptionAr: string
  price: number; discountedPrice: number | null; image: string; status: string; sortOrder: number
  categoryId: number; category?: { name: string; restaurant: { name: string } }
  // UI state
  _expanded?: boolean
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [restaurantFilter, setRestaurantFilter] = useState<number | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemEditing, setItemEditing] = useState<Item | null>(null)
  const [itemForm, setItemForm] = useState({ name: "", nameAr: "", description: "", descriptionAr: "", price: 0, discountedPrice: "", status: "available", categoryId: 0, image: "" })
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: number; name: string; parentRestaurant?: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [itemRes, restRes] = await Promise.all([
        fetch("/api/items?pageSize=100"),
        fetch("/api/restaurants"),
      ])
      const itemJson = await itemRes.json()
      const restJson = await restRes.json()
      setItems(itemJson.data ?? itemJson ?? [])
      const restaurantList = restJson.data?.restaurants ?? restJson.data ?? []
      setRestaurants(restaurantList)

      // Load categories per restaurant
      const catPromises = restaurantList.map((r: Restaurant) =>
        fetch(`/api/categories?restaurantId=${r.id}`).then(r => r.json())
      )
      const catResults = await Promise.all(catPromises)
      const allCats = catResults.flatMap(j => j.data ?? j ?? [])
      setCategories(allCats)
    } catch { toast.error("فشل تحميل البيانات") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Filter
  const filteredItems = items.filter(item => {
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = (item.nameAr || item.name).includes(q)
      const catMatch = item.category?.name.includes(q)
      if (!nameMatch && !catMatch) return false
    }
    // Restaurant filter not available via items API directly
    // Filter by known restaurant items if needed
    return true
  })

  // Group items by category name
  const groupedByCategory: Record<string, typeof filteredItems> = {}
  filteredItems.forEach(item => {
    const key = item.category?.name || "أخرى"
    if (!groupedByCategory[key]) groupedByCategory[key] = []
    groupedByCategory[key].push(item)
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
      toast.success(ns === "available" ? "متوفر" : "غير متوفر")
    } catch { toast.error("فشل التحديث") }
  }

  const deleteItem = async () => {
    if (!deleteTarget || deleteTarget.type !== "item") return
    try {
      await csrfFetch(`/api/items/${deleteTarget.id}`, { method: "DELETE" })
      toast.success("تم حذف الصنف")
      setDeleteTarget(null)
      fetchData()
    } catch { toast.error("فشل الحذف") }
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-breath" />)}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المنيو</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(items.length)} صنف في {toArabicNumber(categories.length)} قسم</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن صنف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pr-11 rounded-2xl border border-border/30 bg-card/50 px-4 text-sm outline-none transition-all focus-visible:border-gold focus-visible:ring-4 focus-visible:ring-gold/20"
          />
        </div>
        {<select
            value={restaurantFilter ?? ""}
            onChange={e => setRestaurantFilter(e.target.value ? Number(e.target.value) : null)}
            className="h-11 rounded-2xl border border-border/30 bg-card/50 px-4 text-sm outline-none focus-visible:border-gold"
          >
            <option value="">كل المطاعم</option>
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4 text-center">
          <p className="text-2xl font-bold">{toArabicNumber(items.length)}</p>
          <p className="text-xs text-muted-foreground">إجمالي الأصناف</p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{toArabicNumber(items.filter(i => i.status === "available").length)}</p>
          <p className="text-xs text-muted-foreground">متوفر</p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{toArabicNumber(items.filter(i => i.status !== "available").length)}</p>
          <p className="text-xs text-muted-foreground">غير متوفر</p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4 text-center">
          <p className="text-2xl font-bold">{toArabicNumber(restaurants.length)}</p>
          <p className="text-xs text-muted-foreground">مطاعم</p>
        </div>
      </div>

      {/* Items by restaurant */}
      {Object.keys(groupedByCategory).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Package className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">{search ? "لا توجد نتائج" : "لا توجد أصناف"}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([catName, catItems]) => (
            <div key={catName} className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-primary" />
                <h3 className="font-bold text-lg">{catName}</h3>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {toArabicNumber(catItems.length)} صنف
                </span>
              </div>
              <div className="rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/10">
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors group">
                    {/* Status indicator */}
                    <div className={cn(
                      "size-2 rounded-full shrink-0",
                      item.status === "available" ? "bg-emerald-500" : "bg-red-400"
                    )} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium text-sm",
                          item.status !== "available" && "text-muted-foreground/50 line-through"
                        )}>
                          {item.nameAr || item.name}
                        </span>
                        {item.category && (
                          <span className="text-xs text-muted-foreground/50 hidden sm:inline">
                            {item.category.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-left shrink-0">
                      <span className={cn(
                        "font-bold text-sm tabular-nums",
                        item.discountedPrice ? "text-destructive" : ""
                      )}>
                        {toArabicNumber((item.discountedPrice ?? item.price).toFixed(1))}
                      </span>
                      <span className="text-xs text-muted-foreground mr-0.5">د.ل</span>
                    </div>

                    {/* Toggle */}
                    <Switch
                      size="sm"
                      checked={item.status === "available"}
                      onCheckedChange={() => toggleStatus(item)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف &ldquo;{deleteTarget?.name}&rdquo;؟
              {deleteTarget?.parentRestaurant && ` من مطعم ${deleteTarget.parentRestaurant}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl">إلغاء</Button>
            <Button variant="destructive" onClick={deleteItem} className="rounded-xl">حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
