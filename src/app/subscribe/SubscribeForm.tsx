"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import { Check, Sparkles, Crown, Building2, Star, Loader2, Store } from "lucide-react"

type Plan = {
  id: number; name: string; nameAr: string; price: number
  periodDays: number; features: string[]; maxMenus: number
  maxItems: number; maxOrders: number; sortOrder: number
}

const PLAN_GRADIENTS = [
  "from-gray-400 to-gray-500",
  "from-orange to-orange/80",
  "from-orange to-orange/80",
  "from-orange to-orange/80",
]
const PLAN_ICONS = [Sparkles, Star, Crown, Building2]

interface FormState {
  name: string; slug: string; description: string
  phone: string; whatsapp: string; username: string; password: string
}

export function SubscribeForm({
  plans, selectedPlan, form, step, onStepChange, onFormChange,
}: {
  plans: Plan[]
  selectedPlan: number | null
  form: FormState
  step: "plan" | "form"
  onStepChange: (s: "plan" | "form") => void
  onFormChange: (f: FormState) => void
}) {
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  const touchField = (field: string) => setFieldTouched(prev => ({ ...prev, [field]: true }))
  const fieldError = (field: string) => {
    const touched = fieldTouched[field] || submitted
    if (!touched) return false
    switch (field) {
      case "name": return form.name.trim().length < 2
      case "slug": return form.slug.trim().length < 2
      case "username": return form.username.trim().length < 3
      case "password": return form.password.trim().length < 4
      default: return false
    }
  }

  const currentPlan = plans.find((p) => p.id === selectedPlan)

  if (!currentPlan) return null

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      {/* Selected plan summary */}
      <div className={cn(
        "rounded-md p-5 mb-8 border-2 border-orange/30 bg-gradient-to-r from-orange-muted/80 to-white dark:from-orange-muted/20 dark:to-card",
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "size-10 rounded-[4px] bg-gradient-to-br flex items-center justify-center",
              PLAN_GRADIENTS[plans.findIndex(p => p.id === currentPlan.id)]
            )}>
              {(() => { const Icon = PLAN_ICONS[plans.findIndex(p => p.id === currentPlan.id)] || Sparkles; return <Icon className="size-5 text-white" />; })()}
            </div>
            <div>
              <p className="font-bold">{currentPlan.nameAr}</p>
              <p className="text-xs text-muted-foreground">
                {Number(currentPlan.price) === 0 ? "مجاني" : `${currentPlan.price} د.ل/شهر`}
                {" • "}
                {currentPlan.maxItems === 9999 ? "أصناف غير محدودة" : `حتى ${toArabicNumber(currentPlan.maxItems)} صنف`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onStepChange("plan")}>تغيير</Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Restaurant name + slug */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>اسم المطعم *</Label>
            <Input value={form.name}
              onChange={(e) => { onFormChange({ ...form, name: e.target.value }); setSubmitted(false) }}
              onBlur={() => touchField("name")} placeholder="اسم المطعم (مثال: مقهى الواحة)"
              className={cn("h-11 mt-1.5", fieldError("name") && "border-destructive ring-1 ring-destructive/30")}
              aria-invalid={fieldError("name") || undefined} required />
            {fieldError("name") && <p className="text-xs text-destructive mt-1">اسم المطعم مطلوب (حرفان على الأقل)</p>}
          </div>
          <div>
            <Label>الرابط المختصر *</Label>
            <div className="flex items-center mt-1.5">
              <span className="text-xs text-muted-foreground bg-muted/50 h-11 px-3 rounded-sm border-e-0 border-input flex items-center shrink-0">/menu/</span>
              <Input value={form.slug}
                onChange={(e) => { onFormChange({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() }); setSubmitted(false) }}
                onBlur={() => touchField("slug")} placeholder="الرابط المختصر (مثال: al-waha-cafe)"
                className={cn("h-11 rounded-[4px] -me-[2px] text-left", fieldError("slug") && "border-destructive ring-1 ring-destructive/30")}
                dir="ltr" aria-invalid={fieldError("slug") || undefined} required />
            </div>
            {fieldError("slug") && <p className="text-xs text-destructive mt-1">الرابط مطلوب (حرفان على الأقل)</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label>الوصف</Label>
          <Input value={form.description} onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            placeholder="وصف المطعم (اختياري)" className="h-11 mt-1.5" />
        </div>

        {/* Phone + WhatsApp */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>رقم الهاتف</Label>
            <Input value={form.phone} onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
              placeholder="رقم الهاتف (مثال: 0912345678)" className="h-11 mt-1.5 text-left" dir="ltr" />
          </div>
          <div>
            <Label>رقم واتساب</Label>
            <Input value={form.whatsapp} onChange={(e) => onFormChange({ ...form, whatsapp: e.target.value })}
              placeholder="رقم الواتساب (مثال: 0912345678)" className="h-11 mt-1.5 text-left" dir="ltr" />
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/30" /></div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">بيانات تسجيل الدخول</span>
          </div>
        </div>

        {/* Username + Password */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>اسم المستخدم *</Label>
            <Input value={form.username}
              onChange={(e) => { onFormChange({ ...form, username: e.target.value }); setSubmitted(false) }}
              onBlur={() => touchField("username")} placeholder="اسم المستخدم (3 أحرف على الأقل)"
              className={cn("h-11 mt-1.5 text-left", fieldError("username") && "border-destructive ring-1 ring-destructive/30")}
              dir="ltr" aria-invalid={fieldError("username") || undefined} required />
            {fieldError("username") && <p className="text-xs text-destructive mt-1">اسم المستخدم مطلوب (3 أحرف على الأقل)</p>}
          </div>
          <div>
            <Label>كلمة المرور *</Label>
            <Input type="password" value={form.password}
              onChange={(e) => { onFormChange({ ...form, password: e.target.value }); setSubmitted(false) }}
              onBlur={() => touchField("password")} placeholder="كلمة المرور (4 أحرف على الأقل)"
              className={cn("h-11 mt-1.5", fieldError("password") && "border-destructive ring-1 ring-destructive/30")}
              aria-invalid={fieldError("password") || undefined} required />
            {fieldError("password") && <p className="text-xs text-destructive mt-1">كلمة المرور مطلوبة (4 أحرف على الأقل)</p>}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-md bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20 p-5 mt-6">
          <h4 className="font-bold mb-3">ملخص الاشتراك</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الخطة</span>
              <span className="font-medium">{currentPlan.nameAr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">السعر</span>
              <span className="font-medium">{Number(currentPlan.price) === 0 ? "مجاني" : `${currentPlan.price} د.ل/شهر`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحد الأقصى للأصناف</span>
              <span className="font-medium">{currentPlan.maxItems === 9999 ? "غير محدود" : toArabicNumber(currentPlan.maxItems)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الطلبات</span>
              <span className="font-medium">{currentPlan.maxOrders === 99999 ? "غير محدودة" : `حتى ${toArabicNumber(currentPlan.maxOrders)}`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
