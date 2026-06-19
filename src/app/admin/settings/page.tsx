"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save, Store, Phone, Mail, MapPin, Clock, Globe, Image } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

interface Restaurant {
  id: number; name: string; slug: string; description: string
  phone: string; whatsapp: string; email: string; address: string
  workingHours: string; logo: string; planId: number | null
}

export default function AdminSettingsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: "", description: "", phone: "", whatsapp: "", email: "",
    address: "", workingHours: "", logo: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selected = restaurants.find(r => r.id === selectedId)

  useEffect(() => {
    fetch("/api/restaurants")
      .then(r => r.json())
      .then(d => {
        const list = d.data?.restaurants ?? d.data ?? []
        setRestaurants(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch(() => toast.error("فشل تحميل المطاعم"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name, description: selected.description,
        phone: selected.phone, whatsapp: selected.whatsapp,
        email: selected.email, address: selected.address,
        workingHours: selected.workingHours, logo: selected.logo,
      })
    }
  }, [selected])

  const save = async () => {
    if (!selectedId || !form.name.trim()) {
      toast.error("يرجى اختيار مطعم وإدخال الاسم"); return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/restaurants/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw Error()
      toast.success("تم حفظ إعدادات المطعم")
      // Refresh
      const r = await fetch("/api/restaurants")
      const d = await r.json()
      setRestaurants(d.data?.restaurants ?? d.data ?? [])
    } catch { toast.error("فشل الحفظ") }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-breath" />)}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-bold tracking-tight">إعدادات المطاعم</h2>

      {/* Restaurant selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {restaurants.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedId(r.id)}
            className={cn(
              "snap-start shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
              selectedId === r.id
                ? "bg-amber-500/10 border-amber-300/30 text-amber-700 dark:text-amber-300"
                : "border-border/30 hover:border-amber-200/30"
            )}
          >
            <Store className="size-4 inline ml-1.5" />
            {r.name}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4 text-center">
          <p className="text-2xl font-bold">{toArabicNumber(restaurants.length)}</p>
          <p className="text-xs text-muted-foreground">إجمالي المطاعم</p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4 text-center">
          <p className="text-2xl font-bold">{toArabicNumber(restaurants.filter(r => r.planId).length)}</p>
          <p className="text-xs text-muted-foreground">على خطة</p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4 text-center">
          <p className="text-2xl font-bold">{toArabicNumber(restaurants.filter(r => r.description).length)}</p>
          <p className="text-xs text-muted-foreground">لديه وصف</p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4 text-center">
          <p className="text-2xl font-bold">{toArabicNumber(restaurants.filter(r => r.phone).length)}</p>
          <p className="text-xs text-muted-foreground">لديه هاتف</p>
        </div>
      </div>

      {/* Settings form */}
      {selected && (
        <div className="rounded-2xl bg-card/50 border border-border/30 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/20">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center">
                <Store className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">{selected.name}</h3>
                <p className="text-xs text-muted-foreground">/{selected.slug}</p>
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="rounded-xl gap-1">
              <Save className="size-4" />
              {saving ? "جارٍ..." : "حفظ"}
            </Button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11 rounded-xl mt-1.5" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1.5 rounded-xl" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1"><Phone className="size-3" /> الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Phone className="size-3" /> واتساب</Label>
                <Input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1"><Mail className="size-3" /> البريد</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><MapPin className="size-3" /> العنوان</Label>
                <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="h-11 rounded-xl mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1"><Clock className="size-3" /> ساعات العمل</Label>
                <Input value={form.workingHours} onChange={e => setForm({...form, workingHours: e.target.value})} className="h-11 rounded-xl mt-1.5" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Image className="size-3" /> رابط الشعار</Label>
                <Input value={form.logo} onChange={e => setForm({...form, logo: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" placeholder="https://..." />
              </div>
            </div>
            {form.logo && (
              <div className="size-20 rounded-xl overflow-hidden border">
                <img src={form.logo} alt="logo" className="size-full object-cover" />
              </div>
            )}
          </div>
        </div>
      )}

      {!selected && restaurants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Store className="size-12 text-muted-foreground/50" />
          <p>لا توجد مطاعم</p>
        </div>
      )}
    </div>
  )
}
