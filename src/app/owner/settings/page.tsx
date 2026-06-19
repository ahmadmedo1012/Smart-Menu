"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save, ArrowRight, Crown, Store, ShoppingCart, Package, Sparkles } from "lucide-react"
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
  plan: Plan | null; planId: number | null; maxItemsLimit: number; maxOrdersLimit: number;
  _count: { orders: number; categories: number };
}

export default function OwnerSettingsPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState({ name: "", description: "", phone: "", whatsapp: "", email: "", address: "", workingHours: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      }
      setPlans(plansData.data ?? [])
    }).catch(() => toast.error("فشل تحميل الإعدادات"))
    .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!form.name.trim()) { toast.error("يرجى إدخال اسم المطعم"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.entries(form).map(([key, value]) => ({ key: `restaurant_${key}`, value })))
      })
      if (!res.ok) throw Error()
      toast.success("تم حفظ الإعدادات")
    } catch {
      toast.error("فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const currentPlan = restaurant?.plan
  const itemUsage = restaurant?._count?.categories ?? 0
  const maxItems = restaurant?.maxItemsLimit ?? 50
  const maxOrders = restaurant?.maxOrdersLimit ?? 500
  const usagePercent = Math.min(100, Math.round((itemUsage / maxItems) * 100))

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-40 rounded-2xl bg-muted/50 animate-breath" />
      <div className="h-96 rounded-2xl bg-muted/50 animate-breath" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => router.push("/owner")} className="mb-2 text-muted-foreground">
        <ArrowRight className="ml-1 h-4 w-4" />
        العودة
      </Button>

      {/* Plan info card */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/20 dark:to-card border border-amber-200/30 dark:border-amber-500/20 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "size-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                currentPlan?.name === "Pro" ? "from-amber-500 via-yellow-500 to-amber-600" :
                currentPlan?.name === "Basic" ? "from-amber-500 to-amber-600" :
                currentPlan?.name === "Enterprise" ? "from-cyan-500 via-purple-500 to-pink-500" :
                "from-gray-400 to-gray-500"
              )}>
                <Crown className="size-7 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الخطة الحالية</p>
                <p className="text-xl font-bold">{currentPlan?.nameAr || "مجاني"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentPlan?.price ? `${currentPlan.price} د.ل/شهر` : "مجاني للأبد"}
                </p>
              </div>
            </div>
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="rounded-xl gap-1">
                <Sparkles className="size-3.5" />
                ترقية
              </Button>
            </Link>
          </div>

          {/* Usage bar */}
          <div className="mt-5 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">استخدام الأصناف</span>
                <span className="font-medium">{toArabicNumber(itemUsage)} / {maxItems === 9999 ? "غير محدود" : toArabicNumber(maxItems)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    usagePercent > 80 ? "bg-destructive" : "bg-gradient-to-r from-amber-500 to-amber-600"
                  )}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            </div>
            {currentPlan?.features && (
              <div className="flex flex-wrap gap-1.5">
                {(JSON.parse(JSON.stringify(currentPlan.features)) as string[]).slice(0, 4).map((f, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings form */}
      <div className="rounded-2xl bg-card/50 border border-border/30 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border/20">
          <h2 className="text-lg font-bold">إعدادات المطعم</h2>
          <Button onClick={save} disabled={saving} className="rounded-xl gap-1">
            <Save className="size-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label>اسم المطعم</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl mt-1.5" />
          </div>
          <div>
            <Label>الوصف</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الهاتف</Label>
              <Input dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" />
            </div>
            <div>
              <Label>واتساب</Label>
              <Input dir="ltr" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" />
            </div>
          </div>
          <div>
            <Label>البريد</Label>
            <Input type="email" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" />
          </div>
          <div>
            <Label>العنوان</Label>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="h-11 rounded-xl mt-1.5" />
          </div>
          <div>
            <Label>ساعات العمل</Label>
            <Input value={form.workingHours} onChange={e => setForm({ ...form, workingHours: e.target.value })} placeholder="8:00 صباحاً - 12:00 منتصف الليل" className="h-11 rounded-xl mt-1.5" />
          </div>
        </div>
      </div>

      {/* Stats card */}
      {restaurant && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card/50 border border-border/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">إجمالي الطلبات</span>
            </div>
            <p className="text-2xl font-bold">{toArabicNumber(restaurant._count.orders)}</p>
          </div>
          <div className="rounded-2xl bg-card/50 border border-border/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="size-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">الأقسام</span>
            </div>
            <p className="text-2xl font-bold">{toArabicNumber(restaurant._count.categories)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
