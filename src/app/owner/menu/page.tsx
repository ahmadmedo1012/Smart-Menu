"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, ChevronDown, Package, ArrowRight, Search, Sparkles, GripVertical, Eye, EyeOff , AlertTriangle, Crown} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import Link from "next/link"

function PlanUsageBadge({ restaurantId }: { restaurantId: number }) {
  const [usage, setUsage] = useState<{ current: number; max: number; planName: string } | null>(null)

  useEffect(() => {
    if (!restaurantId) return
    fetch(`/api/stats?restaurantId=${restaurantId}`).then(r => r.json()).then(d => {
      const data = d.data ?? d
      // We need plan limits from settings or restaurant
      fetch(`/api/restaurants/${restaurantId}`).then(r => r.json()).then(rd => {
        const rest = rd.data ?? rd
        const planName = rest.plan?.nameAr || "مجاني"
        const maxItems = rest.maxItemsLimit || 50
        const currentItems = data.totalItems || 0
        setUsage({ current: currentItems, max: maxItems, planName })
      }).catch(() => {})
    }).catch(() => {})
  }, [restaurantId])

  if (!usage) return null

  const pct = Math.min(100, Math.round((usage.current / usage.max) * 100))
  const isNearLimit = usage.current >= usage.max * 0.8
  const isAtLimit = usage.current >= usage.max

  return (
    <div className={cn(
      "rounded-2xl p-4 border transition-all",
      isAtLimit ? "bg-red-50 dark:bg-red-950/20 border-red-200/30" :
      isNearLimit ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200/30" :
      "bg-card/50 border-border/30"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{usage.planName}</span>
          <span className="text-muted-foreground">ـ</span>
          <span className={cn(
            "tabular-nums",
            isAtLimit ? "text-destructive font-bold" : isNearLimit ? "text-amber-600" : ""
          )}>
            {toArabicNumber(usage.current)} / {usage.max === 9999 ? "∞" : toArabicNumber(usage.max)}
          </span>
          <span className="text-muted-foreground text-xs">صنف</span>
        </div>
        {isAtLimit && (
          <Link href="/pricing">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-medium shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 transition-all">
              <Crown className="size-3" />
              ترقية
            </button>
          </Link>
        )}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            isAtLimit ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-gradient-to-r from-amber-500 to-amber-600"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-destructive mt-2 flex items-center gap-1">
          <AlertTriangle className="size-3" />
          لقد وصلت للحد الأقصى. قم بترقية خطتك لإضافة أصناف جديدة.
        </p>
      )}
    </div>
  )
}

interface Category { id: number; name: string; nameAr?: string; icon: string; sortOrder: number; isActive: boolean; items: Item[]; _count?: { items: number } }
interface Item { id: number; name: string; nameAr?: string; description: string; descriptionAr?: string; price: number; discountedPrice: number | null; image: string; status: string; sortOrder: number; categoryId: number }

const CATEGORY_ICONS = ["📦", "☕", "🍕", "🥤", "🍰", "🥗", "🍔", "🍝", "🥩", "🍣", "🌮", "🥨"];

export default function OwnerMenuPage() {
  const router = useRouter()
  const [restaurantId, setRestaurantId] = useState<number>(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCat, setExpandedCat] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Category form
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [catEditing, setCatEditing] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState({ name: "", nameAr: "", icon: "📦" })

  // Item form
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemEditing, setItemEditing] = useState<Item | null>(null)
  const [itemForm, setItemForm] = useState({ name: "", nameAr: "", description: "", descriptionAr: "", price: 0, discountedPrice: "", status: "available", categoryId: 0, image: "" })

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: number; name: string } | null>(null)
  const [usageKey, setUsageKey] = useState(0)

  useEffect(() => {
    const match = document.cookie.match(/smart-menu-restaurant=(\d+)/)
    if (match) setRestaurantId(Number(match[1]))
  }, [])

  const fetchCats = useCallback(async () => {
    if (!restaurantId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/categories?restaurantId=${restaurantId}`)
      const json = await res.json()
      const list = json.data ?? json ?? []
      setCategories(Array.isArray(list) ? list : [])
    } catch { toast.error("فشل تحميل التصنيفات") }
    finally { setLoading(false) }
  }, [restaurantId])

  const fetchItems = useCallback(async (catId: number) => {
    try {
      const res = await fetch(`/api/items?categoryId=${catId}`)
      const json = await res.json()
      const list = json.data ?? json ?? []
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, items: Array.isArray(list) ? list : [] } : c))
    } catch {}
  }, [])

  useEffect(() => { if (restaurantId) fetchCats() }, [restaurantId, fetchCats])

  const toggleCat = (id: number) => { setExpandedCat(prev => prev === id ? null : id); if (expandedCat !== id) fetchItems(id) }

  // Category CRUD
  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error("يرجى إدخال اسم التصنيف"); return }
    try {
      const body = { name: catForm.name.trim(), nameAr: catForm.nameAr.trim() || undefined, icon: catForm.icon.trim(), restaurantId }
      if (catEditing) {
        await fetch(`/api/categories/${catEditing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      } else {
        await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      }
      toast.success(catEditing ? "تم تحديث التصنيف" : "تمت إضافة التصنيف")
      setCatDialogOpen(false); fetchCats(); setUsageKey(k => k + 1)
    } catch (e: any) { toast.error(e.message) }
  }

  const delCat = async () => {
    if (!deleteTarget || deleteTarget.type !== "category") return
    try { await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" }); toast.success("تم حذف التصنيف"); setDeleteTarget(null); fetchCats() }
    catch (e: any) { toast.error(e.message) }
  }

  // Item CRUD
  const saveItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price) { toast.error("يرجى إدخال الاسم والسعر"); return }
    try {
      const body = {
        name: itemForm.name.trim(),
        nameAr: itemForm.nameAr.trim() || undefined,
        description: itemForm.description.trim() || undefined,
        descriptionAr: itemForm.descriptionAr.trim() || undefined,
        price: Number(itemForm.price),
        discountedPrice: itemForm.discountedPrice ? Number(itemForm.discountedPrice) : undefined,
        status: itemForm.status,
        categoryId: itemForm.categoryId,
        restaurantId,
      }
      if (itemEditing) {
        await fetch(`/api/items/${itemEditing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      } else {
        await fetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      }
      toast.success(itemEditing ? "تم تحديث الصنف" : "تمت إضافة الصنف")
      setItemDialogOpen(false); if (expandedCat) fetchItems(expandedCat); setUsageKey(k => k + 1)
    } catch (e: any) { toast.error(e.message) }
  }

  const delItem = async () => {
    if (!deleteTarget || deleteTarget.type !== "item") return
    try { await fetch(`/api/items/${deleteTarget.id}`, { method: "DELETE" }); toast.success("تم حذف الصنف"); setDeleteTarget(null); if (expandedCat) fetchItems(expandedCat) }
    catch (e: any) { toast.error(e.message) }
  }

  const toggleStatus = async (item: Item) => {
    const ns = item.status === "available" ? "unavailable" : "available"
    try { await fetch(`/api/items/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) }); toast.success(ns === "available" ? "متوفر" : "غير متوفر"); if (expandedCat) fetchItems(expandedCat) }
    catch (e: any) { toast.error(e.message) }
  }

  const openNewItem = (catId: number) => {
    setItemEditing(null)
    setItemForm({ name: "", nameAr: "", description: "", descriptionAr: "", price: 0, discountedPrice: "", status: "available", categoryId: catId, image: "" })
    setItemDialogOpen(true)
  }

  const openEditItem = (item: Item) => {
    setItemEditing(item)
    setItemForm({
      name: item.name,
      nameAr: item.nameAr || "",
      description: item.description,
      descriptionAr: item.descriptionAr || "",
      price: item.price,
      discountedPrice: item.discountedPrice ? String(item.discountedPrice) : "",
      status: item.status,
      categoryId: item.categoryId,
      image: item.image,
    })
    setItemDialogOpen(true)
  }

  // Filter categories by search
  const filteredCategories = categories.filter(cat => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return cat.name.includes(q) || (cat.nameAr?.includes(q)) ||
      cat.items?.some(i => i.name.includes(q) || i.nameAr?.includes(q))
  })

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      {[1,2,3].map(i => (
        <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-breath" />
      ))}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/owner")} className="mb-2 -mr-2 text-muted-foreground">
            <ArrowRight className="ml-1 h-4 w-4" />
            العودة
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المنيو</h2>
          <p className="text-sm text-muted-foreground">أضف وعدل الأصناف والفئات في قائمة مطعمك</p>
        </div>
        <Button onClick={() => { setCatEditing(null); setCatForm({ name: "", nameAr: "", icon: CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)] }); setCatDialogOpen(true) }} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          تصنيف جديد
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث في القائمة..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-11 pr-11 rounded-2xl border border-border/30 bg-card/50 px-4 text-sm outline-none transition-all focus-visible:border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/20"
        />
      </div>

      {/* Plan usage */}
      {restaurantId > 0 && (
        <PlanUsageBadge key={usageKey} restaurantId={restaurantId} />
      )}

      {/* Categories */}
      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 animate-fade-in">
          <div className="size-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium">{searchTerm ? "لا توجد نتائج" : "لا توجد تصنيفات"}</p>
          <p className="text-sm text-muted-foreground/60">{searchTerm ? "جرب كلمات بحث أخرى" : "أضف تصنيفاً جديداً لبدء بناء المنيو"}</p>
          {!searchTerm && (
            <Button onClick={() => { setCatEditing(null); setCatForm({ name: "", nameAr: "", icon: "📦" }); setCatDialogOpen(true) }} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              إضافة تصنيف
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((cat, idx) => (
            <div key={cat.id} className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden transition-all hover:border-amber-200/30 hover:shadow-md">
              {/* Category header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => toggleCat(cat.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon || "📦"}</span>
                  <div>
                    <span className="font-bold">{cat.name}</span>
                    {cat.nameAr && <span className="text-xs text-muted-foreground mr-2">{cat.nameAr}</span>}
                    <span className="text-xs text-muted-foreground mr-2 bg-muted/50 px-2 py-0.5 rounded-full">
                      {toArabicNumber(cat._count?.items ?? cat.items?.length ?? 0)} صنف
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={e => { e.stopPropagation(); openNewItem(cat.id) }} title="إضافة صنف">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={e => { e.stopPropagation(); setCatEditing(cat); setCatForm({ name: cat.name, nameAr: cat.nameAr || "", icon: cat.icon }); setCatDialogOpen(true) }} title="تعديل التصنيف">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: "category", id: cat.id, name: cat.name }) }} title="حذف التصنيف">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300 mr-1", expandedCat === cat.id && "rotate-180")} />
                </div>
              </div>

              {/* Expanded category items */}
              {expandedCat === cat.id && (
                <div className="border-t border-border/20">
                  {cat.items?.length > 0 ? (
                    <div className="divide-y divide-border/10">
                      {cat.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/10 transition-colors group">
                          <GripVertical className="size-4 text-muted-foreground/30 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

                          {/* Item info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-medium text-sm",
                                item.status !== "available" && "text-muted-foreground/50 line-through"
                              )}>
                                {item.name}
                              </span>
                              {item.nameAr && <span className="text-xs text-muted-foreground/60 hidden sm:inline">{item.nameAr}</span>}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground/50 truncate max-w-md">{item.description}</p>
                            )}
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
                            {item.discountedPrice && (
                              <span className="text-xs text-muted-foreground/50 line-through block text-left">
                                {toArabicNumber(item.price.toFixed(1))}
                              </span>
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-2">
                            <Switch
                              size="sm"
                              checked={item.status === "available"}
                              onCheckedChange={() => toggleStatus(item)}
                            />
                            <span className={cn(
                              "text-xs w-14",
                              item.status === "available" ? "text-emerald-600" : "text-red-500"
                            )}>
                              {item.status === "available" ? "متوفر" : "غير متوفر"}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditItem(item)} title="تعديل">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => setDeleteTarget({ type: "item", id: item.id, name: item.name })} title="حذف">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground mb-3">لا توجد أصناف في هذا التصنيف</p>
                      <Button variant="outline" size="sm" onClick={() => openNewItem(cat.id)} className="rounded-xl gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        إضافة صنف
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{catEditing ? "تعديل تصنيف" : "إضافة تصنيف"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم</Label>
              <Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="مشروبات ساخنة" className="h-11 rounded-xl mt-1.5" />
            </div>
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input value={catForm.nameAr} onChange={e => setCatForm({ ...catForm, nameAr: e.target.value })} placeholder="Hot Drinks" className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
            </div>
            <div>
              <Label>أيقونة</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {CATEGORY_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setCatForm({ ...catForm, icon })}
                    className={cn(
                      "size-10 rounded-xl text-xl flex items-center justify-center border transition-all",
                      catForm.icon === icon ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 scale-110" : "border-border/30 hover:border-amber-200/30"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setCatDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={saveCat} className="rounded-xl">{catEditing ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{itemEditing ? "تعديل صنف" : "إضافة صنف"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاسم</Label>
                <Input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="كابتشينو" className="h-11 rounded-xl mt-1.5" />
              </div>
              <div>
                <Label>الاسم بالإنجليزية</Label>
                <Input value={itemForm.nameAr} onChange={e => setItemForm({ ...itemForm, nameAr: e.target.value })} placeholder="Cappuccino" className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الوصف</Label>
                <Textarea value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} className="mt-1.5 rounded-xl" rows={2} />
              </div>
              <div>
                <Label>الوصف بالإنجليزية</Label>
                <Textarea value={itemForm.descriptionAr} onChange={e => setItemForm({ ...itemForm, descriptionAr: e.target.value })} className="mt-1.5 rounded-xl text-left" rows={2} dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>السعر (د.ل)</Label>
                <Input type="number" value={itemForm.price || ""} onChange={e => setItemForm({ ...itemForm, price: Number(e.target.value) })} className="h-11 rounded-xl mt-1.5" min="0" step="0.5" />
              </div>
              <div>
                <Label>سعر الخصم</Label>
                <Input type="number" value={itemForm.discountedPrice} onChange={e => setItemForm({ ...itemForm, discountedPrice: e.target.value })} className="h-11 rounded-xl mt-1.5" min="0" step="0.5" placeholder="اختياري" />
              </div>
            </div>
            <div>
              <Label>الصورة</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={itemForm.image} onChange={e => setItemForm({ ...itemForm, image: e.target.value })} className="h-11 rounded-xl text-left flex-1" dir="ltr" placeholder="https://..." />
                <label className="size-11 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent cursor-pointer transition-colors shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const fd = new FormData()
                      fd.append("file", file)
                      try {
                        const res = await fetch("/api/upload", { method: "POST", body: fd })
                        const d = await res.json()
                        if (d.data?.url) setItemForm({ ...itemForm, image: d.data.url })
                        else toast.error("فشل رفع الصورة")
                      } catch { toast.error("فشل رفع الصورة") }
                    }}
                  />
                  <svg className="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </label>
              </div>
              {itemForm.image && (
                <div className="mt-2 relative rounded-xl overflow-hidden size-20 border border-border/30">
                  <img src={itemForm.image} alt="Preview" className="size-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <Label>الحالة</Label>
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, status: "available" })}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    itemForm.status === "available" ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-700 dark:text-emerald-300" : "border-border/30 hover:border-amber-200/30"
                  )}
                >
                  متوفر
                </button>
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, status: "unavailable" })}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    itemForm.status === "unavailable" ? "bg-red-500/10 border-red-400/30 text-red-700 dark:text-red-300" : "border-border/30 hover:border-amber-200/30"
                  )}
                >
                  غير متوفر
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setItemDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={saveItem} className="rounded-xl">{itemEditing ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف &ldquo;{deleteTarget?.name}&rdquo;؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl">إلغاء</Button>
            <Button variant="destructive" onClick={deleteTarget?.type === "category" ? delCat : delItem} className="rounded-xl">حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
