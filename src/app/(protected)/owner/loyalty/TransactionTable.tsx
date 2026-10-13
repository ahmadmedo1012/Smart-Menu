"use client"

import AnimatedClock from "@/components/ui/clock-icon"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { toArabicNumber, formatDate } from '@/lib/format';

interface Transaction {
  id: number; type: string; points: number; description: string; createdAt: string
}

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    // Phase 6 (r154): the hand-rolled inline empty joins the warm plate
    // family (sage well — the calm "nothing here yet" tint).
    return (
      <EmptyState
        icon={AnimatedClock}
        title="لا توجد معاملات بعد"
        tone="sage"
        className="py-8"
      />
    )
  }

  return (
    <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
      {transactions.map((tx) => {
        const isEarn = tx.type === "earn"
        return (
          <div key={tx.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-orange/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("size-2 rounded-full shrink-0", isEarn ? "bg-success" : "bg-destructive")} />
              <div>
                <p className="text-sm font-medium">{tx.description || (isEarn ? "نقاط مكتسبة" : "نقاط مستردة")}</p>
                {/* round90-F4 (L1): toLocaleDateString("ar-LY") rendered ICU-dependent
                    (often Arabic-Indic ٠١٢) digits — inconsistent with the Western-digit
                    convention every other surface uses (toArabicNumber). The canonical
                    formatDate (round87-C8) is deterministic: Western digits + Arabic
                    month names. */}
                <p className="text-xs text-muted-foreground">
                  {formatDate(new Date(tx.createdAt))}
                </p>
              </div>
            </div>
            {/* Phase 6 (r154): قائد النقاط — النقاط على طراز المنيو المطبوع. */}
            <i className="menu-leader-rule" aria-hidden="true" />
            <span className={cn("text-sm font-semibold tabular-nums shrink-0", isEarn ? "text-success-ink" : "text-destructive")}>
              {isEarn ? "+" : "-"}{toArabicNumber(tx.points)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
