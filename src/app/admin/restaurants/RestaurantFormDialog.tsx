"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { premiumToast } from "@/lib/premium-toast"
import { csrfFetch } from "@/lib/csrf-client"

interface Plan {
  id: number; name: string; nameAr: string; price: number;
}

interface Restaurant {
  id: number; name: string; slug: string; description: string;
  phone: string; whatsapp: string; email: string; address: string;
  workingHours: string; planId: number | null;
  plan: Plan | null;
  _count: { orders: number; categories: number };
}

interface FormState {
  name: string; slug: string; description: string; phone: string; whatsapp: string;
  email: string; address: string; workingHours: string; planId: string;
  city: string; showOnLanding: boolean; featuredRank: string;
}

export function RestaurantFormDialog({
  open, onOpenChange, editing, plans, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: Restaurant | null
  plans: Plan[]
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>({ name: "", slug: "", description: "", phone: "", whatsapp: "", email: "", address: "", workingHours: "", planId: "", city: "", showOnLanding: false, featuredRank: "" })
  const [saving, setSaving] = useState(false)

  // Sync form when dialog opens with editing data
  // ponytail: direct mutation on open is fine for this dialog pattern
  const handleOpen = (o: boolean) => {
    if (o && editing) {
      setForm({
        name: editing.name, slug: editing.slug, description: editing.description,
        phone: editing.phone, whatsapp: editing.whatsapp, email: editing.email || "",
        address: editing.address || "", workingHours: editing.workingHours || "",
        planId: editing.planId ? String(editing.planId) : "",
        city: (editing as any).city || "", showOnLanding: (editing as any).showOnLanding ?? false,
        featuredRank: (editing as any).featuredRank != null ? String((editing as any).featuredRank) : "",
      })
    } else if (o && !editing) {
      setForm({ name: "", slug: "", description: "", phone: "", whatsapp: "", email: "", address: "", workingHours: "", planId: "", city: "", showOnLanding: false, featuredRank: "" })
    }
    onOpenChange(o)
  }

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      premiumToast("error", "يرجى إدخال الاسم والرابط المختصر"); return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description: form.description.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        workingHours: form.workingHours.trim(),
        city: form.city.trim(),
        showOnLanding: form.showOnLanding,
        featuredRank: form.featuredRank ? Number(form.featuredRank) : null,
      }
      if (form.planId) body.planId = Number(form.planId)
      if (editing) {
        const res = await csrfFetch(`/api/restaurants/${editing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "فشل تحديث المطعم")
        premiumToast("save", "تم تحديث المطعم")
      } else {
        const res = await csrfFetch("/api/restaurants", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, username: form.slug, password: `${form.slug}@${Date.now() % 1000}` }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "فشل إنشاء المطعم")
        premiumToast("save", "تمت إضافة المطعم")
      }
      onOpenChange(false)
      onSaved()
    } catch { premiumToast("error", "فشل الحفظ") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg rounded-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل مطعم" : "إضافة مطعم"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="restaurant-name">اسم المطعم *</Label>
              <Input id="restaurant-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl mt-1.5" />
            </div>
            <div>
              <Label htmlFor="restaurant-slug">الرابط المختصر *</Label>
              <Input id="restaurant-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, "").toLowerCase() })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
            </div>
          </div>
          <div>
            <Label htmlFor="restaurant-desc">الوصف</Label>
            <Input id="restaurant-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-11 rounded-xl mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="restaurant-phone">الهاتف</Label>
              <Input id="restaurant-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
            </div>
            <div>
              <Label htmlFor="restaurant-whatsapp">واتساب</Label>
              <Input id="restaurant-whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="restaurant-email">البريد</Label>
              <Input id="restaurant-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
            </div>
            <div>
              <Label htmlFor="restaurant-plan">الخطة</Label>
              <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v ?? "" })}>
                <SelectTrigger className="h-11 rounded-xl mt-1.5"><SelectValue placeholder="اختر خطة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون خطة</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nameAr} {Number(p.price) > 0 ? `- ${p.price} د.ل` : "- مجاني"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="restaurant-address">العنوان</Label>
            <Input id="restaurant-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-11 rounded-xl mt-1.5" />
          </div>
          <div>
            <Label htmlFor="restaurant-hours">ساعات العمل</Label>
            <Input id="restaurant-hours" value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} className="h-11 rounded-xl mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="restaurant-city">المدينة</Label>
              <Input id="restaurant-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-11 rounded-xl mt-1.5" />
            </div>
            <div>
              <Label htmlFor="restaurant-rank">ترتيب الظهور</Label>
              <Input id="restaurant-rank" type="number" value={form.featuredRank} onChange={(e) => setForm({ ...form, featuredRank: e.target.value })} className="h-11 rounded-xl mt-1.5" placeholder="1-999" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border/20 cursor-pointer hover:bg-accent/30 transition-colors">
              <input type="checkbox" checked={form.showOnLanding}
                onChange={(e) => setForm({ ...form, showOnLanding: e.target.checked })}
                className="size-4 accent-orange" />
              <div>
                <p className="text-sm font-medium">عرض في الصفحة الرئيسية</p>
                <p className="text-xs text-muted-foreground">ظهور المطعم في قائمة المطاعم المميزة بالصفحة الرئيسية</p>
              </div>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button variant="orange" onClick={save} disabled={saving}>{saving ? "جارٍ..." : editing ? "تحديث" : "إضافة"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
