"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Save, AlertCircle, Settings as SettingsIcon } from "lucide-react"

interface SettingsForm {
  name: string
  slug: string
  description: string
  logo: string
  phone: string
  whatsapp: string
  email: string
  address: string
  workingHours: string
  themeColor: string
}

const defaultForm: SettingsForm = {
  name: "",
  slug: "",
  description: "",
  logo: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  workingHours: "",
  themeColor: "#C0392B",
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error("فشل تحميل الإعدادات")
        return r.json()
      })
      .then((data) => {
        // data can be { settings: [{key, value}], restaurant: {...} }
        // Try to populate from restaurant first
        if (data.restaurant) {
          setForm({
            name: data.restaurant.name ?? "",
            slug: data.restaurant.slug ?? "",
            description: data.restaurant.description ?? "",
            logo: data.restaurant.logo ?? "",
            phone: data.restaurant.phone ?? "",
            whatsapp: data.restaurant.whatsapp ?? "",
            email: data.restaurant.email ?? "",
            address: data.restaurant.address ?? "",
            workingHours: data.restaurant.workingHours ?? "",
            themeColor: data.restaurant.themeColor ?? "#C0392B",
          })
        } else if (Array.isArray(data.settings)) {
          const map: Record<string, string> = {}
          data.settings.forEach((s: { key: string; value: string }) => {
            map[s.key] = s.value
          })
          setForm({
            name: map["restaurant_name"] ?? "",
            slug: map["restaurant_slug"] ?? "",
            description: map["restaurant_description"] ?? "",
            logo: map["restaurant_logo"] ?? "",
            phone: map["restaurant_phone"] ?? "",
            whatsapp: map["restaurant_whatsapp"] ?? "",
            email: map["restaurant_email"] ?? "",
            address: map["restaurant_address"] ?? "",
            workingHours: map["restaurant_working_hours"] ?? "",
            themeColor: map["restaurant_theme_color"] ?? "#C0392B",
          })
        }
      })
      .catch((e) => {
        toast.error(e.message)
      })
      .finally(() => setLoading(false))
  }, [])

  const validate = (): boolean => {
    if (!form.name.trim()) {
      toast.error("يرجى إدخال اسم المطعم")
      return false
    }
    if (!form.slug.trim()) {
      toast.error("يرجى إدخال الرابط المختصر")
      return false
    }
    if (form.phone && !/^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim())) {
      toast.error("رقم الهاتف غير صحيح")
      return false
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("البريد الإلكتروني غير صحيح")
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    // Build payload — try PUT /api/settings with the restaurant body,
    // or upsert individual settings
    const payload = {
      key: "restaurant",
      value: JSON.stringify(form),
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { key: "restaurant_name", value: form.name },
          { key: "restaurant_slug", value: form.slug },
          { key: "restaurant_description", value: form.description },
          { key: "restaurant_logo", value: form.logo },
          { key: "restaurant_phone", value: form.phone },
          { key: "restaurant_whatsapp", value: form.whatsapp },
          { key: "restaurant_email", value: form.email },
          { key: "restaurant_address", value: form.address },
          { key: "restaurant_working_hours", value: form.workingHours },
          { key: "restaurant_theme_color", value: form.themeColor },
        ]),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "فشل حفظ الإعدادات")
      }

      toast.success("تم حفظ الإعدادات بنجاح")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
        <Card className="h-96 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">الإعدادات</h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="ml-2 h-4 w-4" />
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">معلومات المطعم</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المطعم</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم المطعم"
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط المختصر (Slug)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="my-restaurant"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="وصف المطعم"
            />
          </div>

          <div className="space-y-2">
            <Label>رابط الشعار (Logo URL)</Label>
            <Input
              value={form.logo}
              onChange={(e) => setForm({ ...form, logo: e.target.value })}
              placeholder="https://example.com/logo.png"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">معلومات الاتصال</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+966501234567"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم واتساب</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) =>
                  setForm({ ...form, whatsapp: e.target.value })
                }
                placeholder="+966501234567"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="info@example.com"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label>العنوان</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="عنوان المطعم"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">إعدادات إضافية</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ساعات العمل</Label>
            <Input
              value={form.workingHours}
              onChange={(e) =>
                setForm({ ...form, workingHours: e.target.value })
              }
              placeholder="يومياً 9:00 صباحاً - 11:00 مساءً"
            />
          </div>

          <div className="space-y-2">
            <Label>اللون الأساسي</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.themeColor}
                onChange={(e) =>
                  setForm({ ...form, themeColor: e.target.value })
                }
                className="h-9 w-16 rounded border border-input cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">
                {form.themeColor}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
