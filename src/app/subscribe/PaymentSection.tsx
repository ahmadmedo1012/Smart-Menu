"use client"

import { Button } from "@/components/ui/button"
import { Check, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import PaymentDialog from "@/components/shared/PaymentDialog"

type Plan = {
  id: number; name: string; nameAr: string; price: number
  periodDays: number; features: string[]; maxMenus: number
  maxItems: number; maxOrders: number; sortOrder: number
}

export function UpgradePlanSummary({
  currentPlan, onBack, onPay,
}: {
  currentPlan: Plan
  onBack: () => void
  onPay: () => void
}) {
  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <div className="rounded-md p-5 mb-8 border-2 border-orange/30 bg-gradient-to-r from-orange-muted/80 to-white dark:from-orange-muted/20 dark:to-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">{currentPlan.nameAr}</p>
            <p className="text-sm text-muted-foreground">{currentPlan.price} د.ل/شهر</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>تغيير</Button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {currentPlan.features.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="size-3.5 text-primary shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        بيانات مطعمك الحالية ستبقى كما هي — فقط سيتم ترقية خطتك.
      </p>
      <Button className="w-full h-14 text-base font-semibold rounded-sm" size="lg" onClick={onPay}>
        <CreditCard className="size-5 ml-2" />
        ادفع الآن {`(${currentPlan.price} د.ل)`}
      </Button>
    </div>
  )
}

export function PaymentDialogWrapper({
  open, onOpenChange, currentPlan, upgradeMode, user,
  form, onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  currentPlan: Plan
  upgradeMode: boolean
  user: { role: string; subscriptionStatus: string; restaurantId: number | null } | null
  form: { name: string; slug: string }
  onSuccess: () => void
}) {
  return (
    <PaymentDialog
      open={open}
      onOpenChange={onOpenChange}
      planId={currentPlan.id}
      planName={currentPlan.name}
      planNameAr={currentPlan.nameAr}
      price={Number(currentPlan.price)}
      onSuccess={onSuccess}
      upgradeRestaurantId={upgradeMode && user?.restaurantId ? user.restaurantId : undefined}
      tempRestaurantName={form.name}
      tempRestaurantSlug={form.slug}
    />
  )
}
