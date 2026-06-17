"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Package,
  AlertCircle,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Category {
  id: number
  name: string
  nameAr: string | null
  icon: string
  sortOrder: number
  isActive: boolean
  items: MenuItem[]
  _count?: { items: number }
}

interface MenuItem {
  id: number
  name: string
  nameAr: string | null
  description: string
  descriptionAr: string
  price: number
  discountedPrice: number | null
  image: string
  status: string
  sortOrder: number
  categoryId: number
}

const defaultCategoryForm = { name: "", nameAr: "", icon: "📦" }
const defaultItemForm = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  price: 0,
  discountedPrice: "",
  status: "available",
  categoryId: 0,
}

export default function MenuManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<number | null>(null)

  // Category dialogs
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [catEditing, setCatEditing] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState(defaultCategoryForm)
  const [catSaving, setCatSaving] = useState(false)

  // Item dialogs
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemEditing, setItemEditing] = useState<MenuItem | null>(null)
  const [itemForm, setItemForm] = useState(defaultItemForm)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "item"
    id: number
    name: string
  } | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/categories")
      if (!res.ok) throw new Error("فشل تحميل التصنيفات")
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchItems = useCallback(async (categoryId: number) => {
    try {
      const res = await fetch(`/api/items?categoryId=${categoryId}`)
      if (!res.ok) throw new Error("فشل تحميل الأصناف")
      const data = await res.json()
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, items: Array.isArray(data) ? data : [] }
            : c
        )
      )
    } catch {
      // Silently fail — items remain empty
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const toggleCategory = (id: number) => {
    if (expandedCat === id) {
      setExpandedCat(null)
    } else {
      setExpandedCat(id)
      const cat = categories.find((c) => c.id === id)
      if (!cat?.items) fetchItems(id)
    }
  }

  // ---- Category CRUD ----
  const openCatAdd = () => {
    setCatEditing(null)
    setCatForm(defaultCategoryForm)
    setCatDialogOpen(true)
  }

  const openCatEdit = (cat: Category) => {
    setCatEditing(cat)
    setCatForm({
      name: cat.name,
      nameAr: cat.nameAr ?? "",
      icon: cat.icon,
    })
    setCatDialogOpen(true)
  }

  const saveCategory = async () => {
    if (!catForm.name.trim()) {
      toast.error("يرجى إدخال اسم التصنيف")
      return
    }
    setCatSaving(true)
    try {
      const body = {
        name: catForm.name.trim(),
        nameAr: catForm.nameAr.trim() || undefined,
        icon: catForm.icon.trim() || undefined,
      }
      if (catEditing) {
        const res = await fetch(`/api/categories/${catEditing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("فشل التحديث")
        toast.success("تم تحديث التصنيف بنجاح")
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("فشل الإضافة")
        toast.success("تم إضافة التصنيف بنجاح")
      }
      setCatDialogOpen(false)
      fetchCategories()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCatSaving(false)
    }
  }

  const deleteCategory = async () => {
    if (!deleteTarget || deleteTarget.type !== "category") return
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("فشل الحذف")
      toast.success("تم حذف التصنيف بنجاح")
      setDeleteTarget(null)
      fetchCategories()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ---- Item CRUD ----
  const openItemAdd = (categoryId: number) => {
    setItemEditing(null)
    setItemForm({ ...defaultItemForm, categoryId })
    setItemDialogOpen(true)
  }

  const openItemEdit = (item: MenuItem) => {
    setItemEditing(item)
    setItemForm({
      name: item.name,
      nameAr: item.nameAr ?? "",
      description: item.description,
      descriptionAr: item.descriptionAr,
      price: item.price,
      discountedPrice: item.discountedPrice ? String(item.discountedPrice) : "",
      status: item.status,
      categoryId: item.categoryId,
    })
    setItemDialogOpen(true)
  }

  const saveItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price) {
      toast.error("يرجى إدخال اسم الصنف والسعر")
      return
    }
    try {
      const body = {
        name: itemForm.name.trim(),
        nameAr: itemForm.nameAr.trim() || undefined,
        description: itemForm.description.trim() || undefined,
        descriptionAr: itemForm.descriptionAr.trim() || undefined,
        price: Number(itemForm.price),
        discountedPrice: itemForm.discountedPrice
          ? Number(itemForm.discountedPrice)
          : undefined,
        status: itemForm.status,
        categoryId: itemForm.categoryId,
      }
      if (itemEditing) {
        const res = await fetch(`/api/items/${itemEditing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("فشل التحديث")
        toast.success("تم تحديث الصنف بنجاح")
      } else {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("فشل الإضافة")
        toast.success("تم إضافة الصنف بنجاح")
      }
      setItemDialogOpen(false)
      if (expandedCat) fetchItems(expandedCat)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteItem = async () => {
    if (!deleteTarget || deleteTarget.type !== "item") return
    try {
      const res = await fetch(`/api/items/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("فشل الحذف")
      toast.success("تم حذف الصنف بنجاح")
      setDeleteTarget(null)
      if (expandedCat) fetchItems(expandedCat)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const toggleItemStatus = async (item: MenuItem) => {
    const newStatus =
      item.status === "available" ? "unavailable" : "available"
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("فشل تغيير الحالة")
      toast.success(
        newStatus === "available" ? "متوفر الآن" : "تم إلغاء التوفير"
      )
      if (expandedCat) fetchItems(expandedCat)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">عذراً، حدث خطأ</p>
        <p className="text-sm">{error}</p>
        <Button variant="outline" onClick={fetchCategories}>
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">إدارة المنيو</h2>
        <Button onClick={openCatAdd}>
          <Plus className="ml-2 h-4 w-4" />
          تصنيف جديد
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Package className="h-12 w-12" />
          <p className="text-lg font-medium">لا توجد تصنيفات</p>
          <p className="text-sm">أضف تصنيفاً جديداً للبدء</p>
          <Button onClick={openCatAdd}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة تصنيف
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon || "📦"}</span>
                  <div>
                    <span className="font-medium">{cat.nameAr || cat.name}</span>
                    <span className="text-xs text-muted-foreground mr-2">
                      ({cat._count?.items ?? cat.items?.length ?? 0})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      openItemAdd(cat.id)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCatEdit(cat)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget({
                        type: "category",
                        id: cat.id,
                        name: cat.nameAr || cat.name,
                      })
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      expandedCat === cat.id && "rotate-180"
                    )}
                  />
                </div>
              </div>

              {expandedCat === cat.id && (
                <div className="border-t">
                  {cat.items && cat.items.length > 0 ? (
                    <div className="divide-y">
                      <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                        <div className="col-span-3">الاسم</div>
                        <div className="col-span-2">الاسم (عربي)</div>
                        <div className="col-span-2">السعر</div>
                        <div className="col-span-2">الحالة</div>
                        <div className="col-span-3">إجراءات</div>
                      </div>
                      {cat.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm"
                        >
                          <div className="col-span-3 font-medium truncate">
                            {item.name}
                          </div>
                          <div className="col-span-2 text-muted-foreground truncate">
                            {item.nameAr || "-"}
                          </div>
                          <div className="col-span-2">
                            <span className="font-semibold">{item.price}</span>
                            {item.discountedPrice && (
                              <span className="text-xs text-muted-foreground line-through mr-1">
                                {item.discountedPrice}
                              </span>
                            )}
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                size="sm"
                                checked={item.status === "available"}
                                onCheckedChange={() => toggleItemStatus(item)}
                              />
                              <span
                                className={cn(
                                  "text-xs",
                                  item.status === "available"
                                    ? "text-green-600"
                                    : "text-red-500"
                                )}
                              >
                                {item.status === "available"
                                  ? "متوفر"
                                  : "غير متوفر"}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-3 flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openItemEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "item",
                                  id: item.id,
                                  name: item.name,
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      لا توجد أصناف في هذا التصنيف
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {catEditing ? "تعديل تصنيف" : "إضافة تصنيف جديد"}
            </DialogTitle>
            <DialogDescription>
              {catEditing
                ? "قم بتعديل معلومات التصنيف"
                : "أدخل معلومات التصنيف الجديد"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الاسم (إنجليزي)</Label>
              <Input
                value={catForm.name}
                onChange={(e) =>
                  setCatForm({ ...catForm, name: e.target.value })
                }
                placeholder="e.g. Hot Drinks"
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم (عربي)</Label>
              <Input
                value={catForm.nameAr}
                onChange={(e) =>
                  setCatForm({ ...catForm, nameAr: e.target.value })
                }
                placeholder="مثال: مشروبات ساخنة"
              />
            </div>
            <div className="space-y-2">
              <Label>الأيقونة</Label>
              <Input
                value={catForm.icon}
                onChange={(e) =>
                  setCatForm({ ...catForm, icon: e.target.value })
                }
                placeholder="☕"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose
              render={<Button variant="outline" />}
            >
              إلغاء
            </DialogClose>
            <Button onClick={saveCategory} disabled={catSaving}>
              {catSaving ? "جارٍ الحفظ..." : catEditing ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {itemEditing ? "تعديل صنف" : "إضافة صنف جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>الاسم (إنجليزي)</Label>
                <Input
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  placeholder="Item name"
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم (عربي)</Label>
                <Input
                  value={itemForm.nameAr}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, nameAr: e.target.value })
                  }
                  placeholder="اسم الصنف"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الوصف (إنجليزي)</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm({ ...itemForm, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (عربي)</Label>
              <Textarea
                value={itemForm.descriptionAr}
                onChange={(e) =>
                  setItemForm({ ...itemForm, descriptionAr: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>السعر</Label>
                <Input
                  type="number"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>السعر بعد الخصم</Label>
                <Input
                  type="number"
                  value={itemForm.discountedPrice}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      discountedPrice: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose
              render={<Button variant="outline" />}
            >
              إلغاء
            </DialogClose>
            <Button onClick={saveItem}>
              {itemEditing ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف &quot;{deleteTarget?.name}&quot;؟ لا يمكن
              التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={
                deleteTarget?.type === "category" ? deleteCategory : deleteItem
              }
            >
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
