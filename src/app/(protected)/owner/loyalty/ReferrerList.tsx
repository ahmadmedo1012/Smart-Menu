"use client"

import { useState } from "react"
import { SearchInput } from "@/components/ui/search-input"
import { EmptyState } from "@/components/ui/empty-state"
import { FilterTabs } from "@/components/ui/filter-tabs"
import { Gift, FilterX } from "lucide-react"
/* W7-H (repetition audit): كتلة الفراغ المُصفّى (أسفل الفلاتر داخل القائمة)
                           تركب القطعة المضغوطة من بدائية EmptyState — نفس
                           درجة العنبر التي يركبها الفراغ غير المُصفّى أعلاه. */
import { cn } from "@/lib/utils"
import { toArabicNumber, formatDateShort } from '@/lib/format';

interface ReferralRow {
  id: number
  referredName: string
  referredPhone: string
  status: string
  discountPercent: number
  createdAt: string
  convertedAt: string | null
  referrer: { customerName: string }
}

function ReferralStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    pending: { label: "معلق", classes: "bg-orange/10 text-accent-foreground dark:bg-orange/10 dark:text-accent-foreground" },
    converted: { label: "تم التحويل", classes: "bg-success/15 text-success-ink" },
    expired: { label: "منتهي", classes: "bg-muted text-muted-foreground" },
  }
  const m = map[status] ?? { label: status, classes: "bg-muted text-muted-foreground" }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", m.classes)}>
      <span className={cn("size-1.5 rounded-full", status === "pending" && "bg-orange", status === "converted" && "bg-success", status === "expired" && "bg-muted-foreground/60")} />
      {m.label}
    </span>
  )
}

export function ReferrerList({ referrals }: { referrals: ReferralRow[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = referrals.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return r.referredName.toLowerCase().includes(q) || r.referredPhone.includes(q)
  })

  if (referrals.length === 0) {
    // Phase 6 (r154): the hand-rolled inline empty joins the warm plate
    // family (amber well — the reward-adjacent tint).
    return (
      <EmptyState
        icon={Gift}
        title="لا توجد إحالات بعد"
        description="شارك رابط الإحالة للبدء"
        tone="amber"
        className="py-10"
      />
    )
  }

  return (
    <div>
      {/* W21-G (critic F8): the toolbar wraps — the search keeps a usable floor
          (min-w-[200px], the admin/orders toolbar convention) so the status row
          drops to its own line on narrow viewports instead of squeezing the
          input to a sliver; the pills then scroll per the primitive's own
          overflow-x-auto design. Wide viewports stay one dense line. */}
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3 border-b border-border/20">
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الهاتف…" className="min-w-[200px]" />
        {/* W21-D (FilterTabs sweep): the hand-rolled status pills join the
            segmented FilterTabs cut — one active treatment (solid terracotta,
            r154) + the group/pressed contract the row already tried to speak. */}
        <FilterTabs
          items={[
            { value: "all", label: "الكل" },
            { value: "pending", label: "معلق" },
            { value: "converted", label: "تم التحويل" },
            { value: "expired", label: "منتهي" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          variant="segmented"
          aria-label="تصفية الإحالات حسب الحالة"
          className="pb-0"
        />
      </div>
      <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState
            size="compact"
            tone="amber"
            icon={FilterX}
            title="لا توجد إحالات مطابقة"
            description="جرّب كلمة بحث أو حالة أخرى"
          />
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-orange/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.referredName || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{r.referredPhone}</p>
                </div>
              </div>
              {/* Phase 6 (r154): قائد النقاط يربط الإحالة بحالتها. */}
              <i className="menu-leader-rule" aria-hidden="true" />
              <div className="flex items-center gap-3 shrink-0">
                <ReferralStatusBadge status={r.status} />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDateShort(new Date(r.createdAt))}
                </span>
                {r.status === "converted" && (
                  <span className="text-xs font-medium text-success-ink tabular-nums">+{r.discountPercent}%</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {filtered.length > 0 && filtered.length < referrals.length && (
        <div className="px-5 py-2 text-center text-xs tabular-nums text-muted-foreground border-t border-border/20">
          عرض {toArabicNumber(filtered.length)} من {toArabicNumber(referrals.length)}
        </div>
      )}
    </div>
  )
}
