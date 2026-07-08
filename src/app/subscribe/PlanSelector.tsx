"use client"

import { Check, Sparkles, Star, Crown, Building2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

type Plan = {
  id: number; name: string; nameAr: string; price: number
  periodDays: number; features: string[]; maxMenus: number
  maxItems: number; maxOrders: number; sortOrder: number
}

const PLAN_ICONS = [Sparkles, Star, Crown, Building2]
const PLAN_GRADIENTS = [
  "from-gray-400 to-gray-500",
  "from-orange to-orange/80",
  "from-orange to-orange/80",
  "from-orange to-orange/80",
]

export function PlanSelector({
  plans, selectedPlan, upgradeMode, onSelect, onContinue,
}: {
  plans: Plan[]
  selectedPlan: number | null
  upgradeMode: boolean
  onSelect: (id: number) => void
  onContinue: () => void
}) {
  const visiblePlans = plans.filter(p => !upgradeMode ? true : Number(p.price) > 0).slice(0, 2)

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-8">
        {upgradeMode ? "اختر خطة للترقية إليها" : "اختر خطة تناسب مطعمك"}
      </h2>
      <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
        {visiblePlans.map((plan, i) => {
          const Icon = PLAN_ICONS[i] || Sparkles
          const isSelected = selectedPlan === plan.id
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id)}
              className={cn(
                "relative flex flex-col rounded-md border-2 p-5 text-start transition-all duration-300 hover:scale-[1.02]",
                isSelected
                  ? "border-orange bg-orange-muted/50 dark:bg-orange-muted shadow-lg shadow-orange/10"
                  : "border-border/30 hover:border-orange/30 bg-card/50"
              )}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 size-6 rounded-full bg-orange flex items-center justify-center shadow-lg">
                  <Check className="size-3.5 text-white" />
                </div>
              )}
              <div className={cn("size-10 rounded-sm bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg", PLAN_GRADIENTS[i])}>
                <Icon className="size-5 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-1">{plan.nameAr}</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold">{Number(plan.price) === 0 ? "مجاني" : toArabicNumber(plan.price)}</span>
                {Number(plan.price) > 0 && <span className="text-xs text-muted-foreground">د.ل/شهر</span>}
              </div>
              <div className="space-y-1.5 mb-4 flex-1">
                {plan.features.slice(0, 4).map((f, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs">
                    <Check className="size-3 text-primary shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
                {plan.features.length > 4 && (
                  <p className="text-xs text-primary font-medium">+{plan.features.length - 4} ميزات أخرى</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <div className="text-center">
        <Button size="lg" className="px-10 h-14 text-lg rounded-sm" disabled={!selectedPlan} onClick={onContinue}>
          {selectedPlan ? `اخترت ${plans.find(p => p.id === selectedPlan)?.nameAr}` : "اختر خطة أولاً"}
          <ArrowLeft className="ms-2 size-5" />
        </Button>
      </div>
    </div>
  )
}
