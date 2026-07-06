"use client"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { SearchInput } from "@/components/ui/search-input"
import { Plus, Pencil, Trash2, ChevronDown, Package, GripVertical, AlertCircle, Coffee, Pizza, CupSoda, IceCream, Apple, Beef, Fish, UtensilsCrossed, Milk, type LucideIcon } from "lucide-react"
import BackButton from "@/components/shared/BackButton"
import { csrfFetch } from "@/lib/csrf-client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import PlanUsageBadge from "@/components/owner/PlanUsageBadge"
import ItemDialog from "@/components/owner/ItemDialog"
import { premiumToast } from "@/lib/premium-toast"

interface Category { id: number; name: string; nameAr?: string; icon: string; sortOrder: number; isActive: boolean; items: Item[]; _count?: { items: number } }
interface Item { id: number; name: string; nameAr?: string; description: string; descriptionAr?: string; price: number; discountedPrice: number | null; image: string; status: string; sortOrder: number; categoryId: number }

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Package, Coffee, Pizza, CupSoda, IceCream, Apple, Beef, Fish, Milk, UtensilsCrossed,
};

const CATEGORY_ICONS = ["Package","Coffee","Pizza","CupSoda","IceCream","Apple","Beef","UtensilsCrossed","Fish","Milk"];

export default function OwnerMenuPage() {
  const router = useRouter()
  const [restaurantId, setRestaurantId] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCat, setExpandedCat] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [catDialog, setCatDialog] = useState(false)
  const [catEditing, setCatEditing] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState({ name: "", nameAr: "", icon: "Package" })
  const [itemCatId, setItemCatId] = useState(0)
  const [itemEditing, setItemEditing] = useState<Item | null>(null)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: number; name: string } | null>(null)
  const [usageKey, setUsageKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/me").then(r => { if (!r.ok) throw Error(); return r.json() })
      .then(d => { if (d.data?.restaurantId) setRestaurantId(d.data.restaurantId) })
      .catch(() => router.push("/login"))
  }, [router])

  const fetchCats = useCallback(async () => {
    if (!restaurantId) return
    try { setLoading(true); setError(null); const r = await fetch(`/api/categories?restaurantId=${restaurantId}`); const j = await r.json(); setCategories(Array.isArray(j.data ?? j) ? j.data ?? j : []) }
    catch { setError("فشل تحميل التصنيفات"); premiumToast("error", "فشل تحميل التصنيفات") } finally { setLoading(false) }
  }, [restaurantId])

  useEffect(() => { if (restaurantId) fetchCats() }, [restaurantId, fetchCats])

  const fetchItems = useCallback(async (catId: number) => {
    try { const r = await fetch(`/api/items?categoryId=${catId}`); const j = await r.json(); setCategories(p => p.map(c => c.id === catId ? { ...c, items: Array.isArray(j.data ?? j) ? j.data ?? j : [] } : c)) } catch {}
  }, [])

  const toggleCat = (id: number) => { setExpandedCat(p => p === id ? null : id); if (expandedCat !== id) fetchItems(id) }

  const saveCat = async () => {
    if (!catForm.name.trim()) { premiumToast("error", "يرجى إدخال الاسم"); return }
    try {
      const body = { name: catForm.name.trim(), nameAr: catForm.nameAr.trim() || undefined, icon: catForm.icon.trim(), restaurantId }
      if (catEditing) await csrfFetch(`/api/categories/${catEditing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      else await csrfFetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      premiumToast("save", catEditing ? "تم التحديث" : "تمت الإضافة"); setCatDialog(false); fetchCats(); setUsageKey(k => k + 1)
    } catch { premiumToast("error", "فشل الحفظ") }
  }

  const delTarget = async () => {
    if (!deleteTarget) return
    try {
      await csrfFetch(`/api/${deleteTarget.type === "category" ? "categories" : "items"}/${deleteTarget.id}`, { method: "DELETE" })
      premiumToast("trash", "تم الحذف"); setDeleteTarget(null)
      if (deleteTarget.type === "category") fetchCats(); else if (expandedCat) fetchItems(expandedCat); setUsageKey(k => k + 1)
    } catch { premiumToast("error", "فشل الحذف") }
  }

  const toggleStatus = async (item: Item) => {
    const ns = item.status === "available" ? "unavailable" : "available"
    try { await csrfFetch(`/api/items/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) }); premiumToast("save", ns === "available" ? "متوفر" : "غير متوفر"); if (expandedCat) fetchItems(expandedCat) }
    catch { premiumToast("error", "فشل التحديث") }
  }

  const filteredCategories = categories.filter(cat => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return cat.name.includes(q) || (cat.nameAr?.includes(q)) || cat.items?.some(i => i.name.includes(q) || i.nameAr?.includes(q))
  })

  if (loading) return <div className="space-y-4 animate-fade-in">{[1,2,3].map(i => <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />)}</div>

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <div className="size-16 rounded-md bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="size-8 text-destructive/60" />
      </div>
      <p className="text-lg font-medium">{error}</p>
      <Button variant="outline" size="sm" onClick={() => fetchCats()} className="gap-1.5">إعادة المحاولة</Button>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <BackButton href="/owner" />
          <h2 className="text-2xl font-bold tracking-tight">إدارة المنيو</h2>
          <p className="text-sm text-muted-foreground">أضف وعدل الأصناف والفئات في قائمة مطعمك</p>
        </div>
        <Button variant="orange" onClick={() => { setCatEditing(null); setCatForm({ name: "", nameAr: "", icon: CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)] }); setCatDialog(true) }} className="gap-2">
          <Plus className="size-4" /> تصنيف جديد
        </Button>
      </div>

      <div className="relative">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ابحث في القائمة..." />
      </div>

      {restaurantId > 0 && <PlanUsageBadge key={usageKey} restaurantId={restaurantId} />}

      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 animate-fade-in">
          <div className="size-20 rounded-md bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center">
            <Package className="size-10 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium">{searchTerm ? "لا توجد نتائج" : "لا توجد تصنيفات"}</p>
          <p className="text-sm text-muted-foreground/60">{searchTerm ? "جرب كلمات بحث أخرى" : "أضف تصنيفاً جديداً لبدء بناء المنيو"}</p>
          {!searchTerm && <Button variant="orange" onClick={() => { setCatEditing(null); setCatForm({ name: "", nameAr: "", icon: "Package" }); setCatDialog(true) }} className="gap-2"><Plus className="size-4" /> إضافة تصنيف</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="rounded-md border border-border/30 bg-card/50 overflow-hidden transition-all hover:border-orange/30 hover:shadow-md">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/20" onClick={() => toggleCat(cat.id)}>
                  <div className="flex items-center gap-3">
                    {cat.icon && cat.icon in CATEGORY_ICON_MAP ? (
                      (() => { const I = CATEGORY_ICON_MAP[cat.icon]; return <I className="size-6 text-primary" />; })()
                    ) : (
                      <span className="text-2xl">{cat.icon || "📦"}</span>
                    )}
                    <div>
                    <span className="font-bold">{cat.name}</span>
                    {cat.nameAr && <span className="text-xs text-muted-foreground mr-2">{cat.nameAr}</span>}
                    <span className="text-xs text-muted-foreground mr-2 bg-muted/50 px-2 py-0.5 rounded-full">
                      {toArabicNumber(cat._count?.items ?? cat.items?.length ?? 0)} صنف
                    </span>
                  </div>
                </div>
                  <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={e => { e.stopPropagation(); setItemCatId(cat.id); setItemEditing(null); setItemDialogOpen(true) }} title="إضافة صنف"><Plus className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={e => { e.stopPropagation(); setCatEditing(cat); setCatForm({ name: cat.name, nameAr: cat.nameAr || "", icon: cat.icon }); setCatDialog(true) }} title="تعديل"><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: "category", id: cat.id, name: cat.name }) }} title="حذف"><Trash2 className="size-4" /></Button>
                  <ChevronDown className={cn("size-5 text-muted-foreground transition-transform duration-300 mr-1", expandedCat === cat.id && "rotate-180")} />
                </div>
              </div>

              {expandedCat === cat.id && (
                <div className="border-t border-border/20">
                  {cat.items?.length > 0 ? (
                    <div className="divide-y divide-border/10">
                      {cat.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/10 transition-colors group">
                          <GripVertical className="size-4 text-muted-foreground/30 shrink-0 cursor-grab opacity-0 group-hover:opacity-100" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium text-sm", item.status !== "available" && "text-muted-foreground/50 line-through")}>{item.name}</span>
                              {item.nameAr && <span className="text-xs text-muted-foreground/60 hidden sm:inline">{item.nameAr}</span>}
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground/50 truncate max-w-md">{item.description}</p>}
                          </div>
                          <div className="text-left shrink-0">
                            <span className={cn("font-bold text-sm tabular-nums", item.discountedPrice && "text-destructive")}>{toArabicNumber((item.discountedPrice ?? item.price).toFixed(1))}</span>
                            <span className="text-xs text-muted-foreground mr-0.5">د.ل</span>
                            {item.discountedPrice && <span className="text-xs text-muted-foreground/50 line-through block">{toArabicNumber(item.price.toFixed(1))}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch size="sm" checked={item.status === "available"} onCheckedChange={() => toggleStatus(item)} />
                            <span className={cn("text-xs w-14", item.status === "available" ? "text-success" : "text-destructive")}>{item.status === "available" ? "متوفر" : "غير متوفر"}</span>
                          </div>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => { setItemEditing(item); setItemDialogOpen(true) }} title="تعديل"><Pencil className="size-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setDeleteTarget({ type: "item", id: item.id, name: item.name })} title="حذف"><Trash2 className="size-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground mb-3">لا توجد أصناف في هذا التصنيف</p>
                      <Button variant="outline" size="sm" onClick={() => { setItemCatId(cat.id); setItemEditing(null); setItemDialogOpen(true) }} className="gap-1 border-orange/30 text-orange hover:bg-orange-muted"><Plus className="size-3.5" /> إضافة صنف</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="rounded-md">
          <DialogHeader><DialogTitle>{catEditing ? "تعديل تصنيف" : "إضافة تصنيف"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">الاسم</label><input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="مشروبات ساخنة" className="w-full h-11 rounded-[4px] border border-border/30 px-4 text-sm outline-none mt-1.5 focus-visible:border-orange" /></div>
            <div><label className="text-sm font-medium">الاسم بالإنجليزية</label><input value={catForm.nameAr} onChange={e => setCatForm({...catForm, nameAr: e.target.value})} placeholder="Hot Drinks" className="w-full h-11 rounded-[4px] border border-border/30 px-4 text-sm outline-none mt-1.5 text-left" dir="ltr" /></div>
            <div><label className="text-sm font-medium">أيقونة</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {CATEGORY_ICONS.map(iconName => {
                  const IconComp = iconName in CATEGORY_ICON_MAP ? CATEGORY_ICON_MAP[iconName] : null;
                  if (!IconComp) return null;
                  return (
                    <button key={iconName} type="button" onClick={() => setCatForm({...catForm, icon: iconName})}
                      className={cn("size-10 rounded-[4px] flex items-center justify-center border transition-all", catForm.icon === iconName ? "border-orange bg-orange-muted dark:bg-orange-muted scale-110" : "border-border/30 hover:border-orange/30")}>
                      <IconComp className="size-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setCatDialog(false)}>إلغاء</Button>
            <Button variant="orange" onClick={saveCat}>{catEditing ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <ItemDialog open={itemDialogOpen} onOpenChange={setItemDialogOpen} editing={itemEditing} categoryId={itemCatId} onSaved={() => { if (expandedCat) fetchItems(expandedCat); setUsageKey(k => k + 1) }} />

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-md">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف &ldquo;{deleteTarget?.name}&rdquo;؟ هذا الإجراء لا يمكن التراجع عنه.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={delTarget}>حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
