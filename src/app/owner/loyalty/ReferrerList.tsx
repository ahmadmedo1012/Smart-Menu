"use client"

import { useState } from "react"
import { SearchInput } from "@/components/ui/search-input"
import { Gift, FilterX } from "lucide-react"
import { cn } from "@/lib/utils"

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
    pending: { label: "معلق", classes: "bg-orange/10 text-orange dark:bg-orange/10 dark:text-orange" },
    converted: { label: "تم التحويل", classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    expired: { label: "منتهي", classes: "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" },
  }
  const m = map[status] ?? { label: status, classes: "bg-muted text-muted-foreground" }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", m.classes)}>
      <span className={cn("size-1.5 rounded-full", status === "pending" && "bg-orange", status === "converted" && "bg-emerald-500", status === "expired" && "bg-slate-400")} />
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
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-md bg-orange/10">
          <Gift className="size-6 text-orange" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">لا توجد إحالات بعد</p>
        <p className="text-xs text-muted-foreground/60 mt-1">شارك رابط الإحالة للبدء</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-5 pb-3 border-b border-border/20">
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الهاتف..." />
        <div className="flex gap-1">
          {["all", "pending", "converted", "expired"].map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={cn("h-9 rounded-lg px-3 text-xs font-medium transition-all",
                statusFilter === s
                  ? "bg-orange/10 text-orange dark:text-orange border border-orange/20"
                  : "text-muted-foreground hover:bg-muted/50 border border-transparent")}>
              {s === "all" ? "الكل" : s === "pending" ? "معلق" : s === "converted" ? "تم التحويل" : s === "expired" ? "منتهي" : s}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <FilterX className="size-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد إحالات مطابقة</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.referredName || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{r.referredPhone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <ReferralStatusBadge status={r.status} />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(r.createdAt).toLocaleDateString("ar-LY", { month: "short", day: "numeric" })}
                </span>
                {r.status === "converted" && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">+{r.discountPercent}%</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {filtered.length > 0 && filtered.length < referrals.length && (
        <div className="px-5 py-2 text-center text-xs text-muted-foreground border-t border-border/20">
          عرض {filtered.length} من {referrals.length}
        </div>
      )}
    </div>
  )
}
