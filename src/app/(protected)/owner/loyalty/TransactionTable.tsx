"use client"

import AnimatedClock from "@/components/ui/clock-icon"
import { cn } from "@/lib/utils"
import { toArabicNumber, formatDate } from '@/lib/format';

interface Transaction {
  id: number; type: string; points: number; description: string; createdAt: string
}

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-muted/50">
          <AnimatedClock className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">لا توجد معاملات بعد</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
      {transactions.map((tx) => {
        const isEarn = tx.type === "earn"
        return (
          <div key={tx.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
            <div className="flex items-center gap-3">
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
            <span className={cn("text-sm font-semibold tabular-nums", isEarn ? "text-success" : "text-destructive")}>
              {isEarn ? "+" : "-"}{toArabicNumber(tx.points)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
