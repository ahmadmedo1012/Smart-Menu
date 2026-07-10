"use client"

import { ExternalLink, Pencil, Trash2, ShoppingCart, Crown, Star, Sparkles, Building2, ChevronLeft, ChevronRight, Plus, Store, FilterX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

interface Plan {
  id: number; name: string; nameAr: string; price: number;
}

interface Restaurant {
  id: number; name: string; slug: string; description: string;
  phone: string; whatsapp: string; email: string; address: string;
  workingHours: string; planId: number | null;
  plan: Plan | null;
  city: string; showOnLanding: boolean;
  _count: { orders: number; categories: number };
}

interface StatsRowProps {
  total: number
  restaurants: Restaurant[]
}

export function StatsRow({ total, restaurants }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="rounded-md bg-gradient-to-br from-orange/10 to-orange/5 border border-orange/20 dark:border-orange/15 p-4">
        <p className="text-xs text-orange dark:text-orange">إجمالي المطاعم</p>
        <p className="text-2xl font-bold mt-1 text-orange dark:text-orange">{toArabicNumber(total)}</p>
      </div>
      <div className="rounded-md bg-gradient-to-br from-orange/10 to-orange/5 border border-orange/20 dark:border-orange/15 p-4">
        <p className="text-xs text-orange dark:text-orange">على الخطة المدفوعة</p>
        <p className="text-2xl font-bold mt-1 text-orange dark:text-orange">
          {toArabicNumber(restaurants.filter((r) => r.plan?.price && Number(r.plan.price) > 0).length)}
        </p>
      </div>
      <div className="rounded-md bg-gradient-to-br from-orange/10 to-orange/5 border border-orange/20 dark:border-orange/15 p-4">
        <p className="text-xs text-orange dark:text-orange">إجمالي الطلبات</p>
        <p className="text-2xl font-bold mt-1 text-orange dark:text-orange">
          {toArabicNumber(restaurants.reduce((a, r) => a + r._count.orders, 0))}
        </p>
      </div>
      <div className="rounded-md bg-gradient-to-br from-orange/10 to-orange/5 border border-orange/20 dark:border-orange/15 p-4">
        <p className="text-xs text-orange dark:text-orange">مجاني</p>
        <p className="text-2xl font-bold mt-1 text-orange dark:text-orange">
          {toArabicNumber(restaurants.filter((r) => !r.planId || Number(r.plan?.price) === 0).length)}
        </p>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  search: string
  planFilter: string
  onClear: () => void
  onAdd: () => void
}

export function EmptyState({ search, planFilter, onClear, onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <Store className="size-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">{search || planFilter !== "all" ? "لا توجد نتائج" : "لا يوجد مطاعم مسجلة"}</p>
      {(search || planFilter !== "all") ? (
        <Button variant="ghost" onClick={onClear} className="gap-2">
          <FilterX className="size-4" /> إزالة الفلتر
        </Button>
      ) : (
        <Button variant="orange" onClick={onAdd} className="gap-2">
          <Plus className="size-4" /> إضافة مطعم
        </Button>
      )}
    </div>
  )
}

interface RestaurantListItemProps {
  r: Restaurant
  isSelected: boolean
  onToggle: (id: number) => void
  onEdit: (r: Restaurant) => void
  onDelete: (r: Restaurant) => void
  onToggleShowOnLanding: (id: number, show: boolean) => void
}

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  "Free": Sparkles, "Basic": Star, "Pro": Crown, "Enterprise": Building2,
}
const PLAN_COLORS: Record<string, string> = {
  "Free": "from-gray-400 to-gray-500",
  "Basic": "from-orange to-orange/80",
  "Pro": "from-orange to-orange/80",
  "Enterprise": "from-orange to-orange/80",
}

export function RestaurantListItem({ r, isSelected, onToggle, onEdit, onDelete, onToggleShowOnLanding }: RestaurantListItemProps) {
  const PlanIcon = (r.plan?.name && PLAN_ICONS[r.plan.name]) || Sparkles
  const planGrad = (r.plan?.name && PLAN_COLORS[r.plan.name]) || "from-gray-400 to-gray-500"

  return (
    <div className={cn("rounded-md border p-5 transition-all", isSelected ? "border-orange/40 bg-orange-muted/30 dark:bg-orange-muted" : "border-border/30 bg-card/50 hover:border-orange/20 hover:shadow-md")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={isSelected} onChange={() => onToggle(r.id)}
            className="rounded border-border shrink-0 mt-1" aria-label={`تحديد ${r.name}`} />
          <div className={cn("size-12 rounded-md bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0", planGrad)} aria-hidden="true">
            <PlanIcon className="size-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg">{r.name}</h3>
              {r.plan ? (
                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r", planGrad)}>{r.plan.nameAr}</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">بدون خطة</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>/{r.slug}</span>
              {r.phone && <span dir="ltr">{r.phone}</span>}
              <span className="flex items-center gap-1">
                <ShoppingCart className="size-3" aria-hidden="true" />
                {toArabicNumber(r._count.orders)} طلب
              </span>
              <span className={cn("text-[11px] px-1.5 py-0.5 rounded", r.showOnLanding ? "text-orange bg-orange/10" : "text-muted-foreground/40")}>
                {r.city || (r.showOnLanding ? "مميز" : "")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href={`/menu/${r.slug}`} target="_blank" rel="noopener noreferrer"
            className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
            title="عرض المنيو" aria-label={`عرض منيو ${r.name}`}>
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <button type="button" onClick={() => onToggleShowOnLanding(r.id, !r.showOnLanding)}
            className={cn("size-9 rounded-xl border flex items-center justify-center transition-colors",
              r.showOnLanding
                ? "border-orange/30 bg-orange/10 text-orange hover:bg-orange/20"
                : "border-border/30 text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent"
            )}
            title={r.showOnLanding ? "إخفاء من الرئيسية" : "عرض في الرئيسية"}
            aria-label={r.showOnLanding ? `إخفاء ${r.name} من الرئيسية` : `عرض ${r.name} في الرئيسية`}>
            <Sparkles className="size-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onEdit(r)}
            className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
            title="تعديل" aria-label={`تعديل ${r.name}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onDelete(r)}
            className="size-9 rounded-xl border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors"
            title="حذف" aria-label={`حذف ${r.name}`}>
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button variant="outline" size="icon" onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1} aria-label="الصفحة السابقة">
        <ChevronRight className="size-4" />
      </Button>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        let pageNum: number
        if (totalPages <= 5) { pageNum = i + 1
        } else if (page <= 3) { pageNum = i + 1
        } else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i
        } else { pageNum = page - 2 + i }
        return (
          <Button key={pageNum} variant={pageNum === page ? "orange" : "outline"} size="icon"
            onClick={() => onPageChange(pageNum)} className="w-9"
            aria-label={`الصفحة ${pageNum}`} aria-current={pageNum === page ? "page" : undefined}>
            {toArabicNumber(pageNum)}
          </Button>
        )
      })}
      <Button variant="outline" size="icon" onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages} aria-label="الصفحة التالية">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-xs text-muted-foreground mr-2">
        الصفحة {toArabicNumber(page)} من {toArabicNumber(totalPages)}
      </span>
    </div>
  )
}
