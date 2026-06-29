"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { premiumToast } from "@/lib/premium-toast"
import { csrfFetch } from "@/lib/csrf-client"
import { Save, Crown, ShoppingCart, Package, Sparkles, Upload, X, ImageIcon, Loader2 } from "lucide-react"
import BackButton from "@/components/shared/BackButton"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

interface Plan {
  id: number; name: string; nameAr: string; price: number;
  maxItems: number; maxOrders: number; features: string[];
}

interface RestaurantData {
  id: number; name: string; description: string; phone: string;
  whatsapp: string; email: string; address: string; workingHours: string;
  logo: string; gallery: string[];
  plan: Plan | null; planId: number | null; maxItems: number; maxOrders: number;
  _count: { orders: number; categories: number };
}

export default function OwnerSettingsPage() {
  const __router = useRouter()
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null)
  const [, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState({ name: "", description: "", phone: "", whatsapp: "", email: "", address: "", workingHours: "" })
  const [logo, setLogo] = useState("")
  const [gallery, setGallery] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState({ logo: false, gallery: false })
  const logoInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then(r => r.json()),
      fetch("/api/plans").then(r => r.json()),
    ]).then(([settingsData, plansData]) => {
      const r = settingsData.data?.restaurant ?? settingsData.data ?? settingsData
      if (r) {
        setRestaurant(r)
        setForm({
          name: r.name ?? "", description: r.description ?? "", phone: r.phone ?? "",
          whatsapp: r.whatsapp ?? "", email: r.email ?? "", address: r.address ?? "",
          workingHours: r.workingHours ?? "",
        })
        setLogo(r.logo ?? "")
        setGallery(r.gallery ?? [])
      }
      setPlans(plansData.data ?? [])
    }).catch(() => premiumToast("error", "فشل تحميل الإعدادات"))
    .finally(() => setLoading(false))
  }, [])

  const uploadImage = async (file: File, type: "logo" | "gallery") => {
    setUploading((prev) => ({ ...prev, [type]: true }))
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await csrfFetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error()
      const data = await res.json()
      return data.data?.url ?? data.url
    } catch {
      premiumToast("error", "فشل رفع الصورة")
      return null
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }))
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file, "logo")
    if (url) setLogo(url)
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const uploads: string[] = []
    for (const file of Array.from(files)) {
      const url = await uploadImage(file, "gallery")
      if (url) uploads.push(url)
    }
    if (uploads.length > 0) setGallery((prev) => [...prev, ...uploads])
    if (galleryInputRef.current) galleryInputRef.current.value = ""
  }

  const removeGalleryImage = (index: number) => setGallery((prev) => prev.filter((_, i) => i !== index))

  const moveGalleryImage = (from: number, to: number) => {
    if (to < 0 || to >= gallery.length) return
    setGallery((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const save = async () => {
    setSubmitted(true)
    if (!form.name.trim()) { premiumToast("error", "يرجى إدخال اسم المطعم"); return }
    setSaving(true)
    try {
      const items = [
        ...Object.entries(form).map(([key, value]) => ({ key: "restaurant_" + key, value })),
        { key: "restaurant_logo", value: logo },
        { key: "restaurant_gallery", value: JSON.stringify(gallery) },
      ]
      const res = await csrfFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "فشل الحفظ") }
      premiumToast("save", "تم حفظ الإعدادات")
      const settingsRes = await fetch("/api/settings")
      const settingsData = await settingsRes.json()
      const r = settingsData.data?.restaurant
      if (r) setRestaurant(r)
    } catch (e) {
      premiumToast("error", e instanceof Error ? e.message : "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const currentPlan = restaurant?.plan
  const itemUsage = restaurant?._count?.categories ?? 0
  const maxItems = restaurant?.maxItems ?? 50
  const usagePercent = Math.min(100, Math.round((itemUsage / maxItems) * 100))

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <div className="h-36 skeleton rounded-md" />
      <div className="h-80 skeleton rounded-md" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5 animate-page-enter">

      <BackButton href="/owner" />

      {/* Plan card */}
      <div className="rounded-md bg-gradient-to-br from-orange-muted/70 to-white dark:from-orange-muted dark:to-card border border-orange/20 dark:border-orange/15 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-12 rounded-md bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0",
                currentPlan?.name === "Pro" ? "from-orange to-orange/80" :
                currentPlan?.name === "Enterprise" ? "from-orange to-orange/80" :
                "from-orange to-orange/80"
              )}>
                <Crown className="size-6 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">الخطة الحالية</p>
                <p className="text-lg font-bold">{currentPlan?.nameAr || "مجاني"}</p>
                {currentPlan?.price ? <p className="text-xs text-muted-foreground">{currentPlan.price} د.ل/شهر</p> : null}
              </div>
            </div>
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8">
                <Sparkles className="size-3" /> ترقية
              </Button>
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">استخدام الأصناف</span>
              <span className="font-medium">{toArabicNumber(itemUsage)} / {maxItems === 9999 ? "غير محدود" : toArabicNumber(maxItems)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", usagePercent > 80 ? "bg-destructive" : "bg-orange")}
                style={{ width: `${Math.min(usagePercent, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Logo section */}
      <div className="rounded-md bg-card/40 border border-border/20 p-5">
        <h2 className="text-sm font-bold mb-4">الشعار</h2>
        <div className="flex items-center gap-5">
          <div className="size-24 rounded-md overflow-hidden bg-muted/40 border border-border/20 flex items-center justify-center shrink-0 relative group">
            {logo ? (
              <>
                <img src={logo} alt="Logo" className="w-full h-full object-cover" loading="lazy" />
                <button type="button" onClick={() => setLogo("")}
                  className="absolute top-1.5 right-1.5 size-6 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="size-3" />
                </button>
              </>
            ) : (
              <ImageIcon className="size-8 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2">يظهر في رأس صفحة المنيو. يفضل صورة مربعة 512×512</p>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-8"
              onClick={() => logoInputRef.current?.click()} disabled={uploading.logo}>
              {uploading.logo ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
              {uploading.logo ? "جاري الرفع..." : "اختيار صورة"}
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery section */}
      <div className="rounded-md bg-card/40 border border-border/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">معرض الصور</h2>
          <input ref={galleryInputRef} type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" />
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-8"
            onClick={() => galleryInputRef.current?.click()} disabled={uploading.gallery}>
            {uploading.gallery ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
            إضافة صور
          </Button>
        </div>
        {gallery.length === 0 ? (
          <div className="text-center py-10">
            <div className="empty-state-icon"><ImageIcon /></div>
            <p className="text-xs text-muted-foreground">لم يتم إضافة صور بعد</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">أضف صوراً للمطعم لتظهر في صفحة المنيو</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {gallery.map((url, i) => (
              <div key={i} className="group relative aspect-square rounded-xl overflow-hidden bg-muted/20 border border-border/20">
                <img src={url} alt={`صورة ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => removeGalleryImage(i)}
                    className="size-11 rounded-full bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive transition-colors">
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {i > 0 && <button type="button" onClick={() => moveGalleryImage(i, i - 1)}
                    className="size-10 rounded-full bg-background/70 text-foreground flex items-center justify-center hover:bg-background text-sm">→</button>}
                  {i < gallery.length - 1 && <button type="button" onClick={() => moveGalleryImage(i, i + 1)}
                    className="size-10 rounded-full bg-background/70 text-foreground flex items-center justify-center hover:bg-background text-sm">←</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings form */}
      <div className="rounded-md bg-card/40 border border-border/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">بيانات المطعم</h2>
          <Button onClick={save} disabled={saving} className="gap-1.5 text-xs h-8">
            <Save className="size-3.5" />
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs">اسم المطعم</Label>
            <Input
              value={form.name}
              onChange={e => { setForm({ ...form, name: e.target.value }); setSubmitted(false) }}
              className={cn("h-10 rounded-xl mt-1 text-sm", submitted && !form.name.trim() && "border-destructive ring-1 ring-destructive/30")}
              aria-invalid={submitted && !form.name.trim() || undefined}
            />
            {submitted && !form.name.trim() && <p className="text-xs text-destructive mt-1">هذا الحقل مطلوب</p>}
          </div>
          <div>
            <Label className="text-xs">الوصف</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 rounded-xl text-sm" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">الهاتف</Label>
              <Input dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-10 rounded-xl mt-1 text-sm text-left" />
            </div>
            <div>
              <Label className="text-xs">واتساب</Label>
              <Input dir="ltr" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="h-10 rounded-xl mt-1 text-sm text-left" />
            </div>
          </div>
          <div>
            <Label className="text-xs">البريد</Label>
            <Input type="email" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-10 rounded-xl mt-1 text-sm text-left" />
          </div>
          <div>
            <Label className="text-xs">العنوان</Label>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="h-10 rounded-xl mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">ساعات العمل</Label>
            <Input value={form.workingHours} onChange={e => setForm({ ...form, workingHours: e.target.value })} placeholder="8:00 صباحاً - 12:00 منتصف الليل" className="h-10 rounded-xl mt-1 text-sm" />
          </div>
        </div>
      </div>

      {/* Stats */}
      {restaurant && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-card/40 border border-border/20 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <ShoppingCart className="size-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground">إجمالي الطلبات</span>
            </div>
            <p className="text-xl font-bold">{toArabicNumber(restaurant._count?.orders ?? 0)}</p>
          </div>
          <div className="rounded-md bg-card/40 border border-border/20 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Package className="size-3.5 text-orange" />
              <span className="text-[11px] text-muted-foreground">الأقسام</span>
            </div>
            <p className="text-xl font-bold">{toArabicNumber(restaurant._count?.categories ?? 0)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
