"use client"

import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Transaction {
  id: number; type: string; points: number; description: string; createdAt: string
}

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-muted/50">
          <Clock className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">لا توجد معاملات بعد</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-white/10 max-h-[300px] overflow-y-auto">
      {transactions.map((tx) => {
        const isEarn = tx.type === "earn"
        return (
          <div key={tx.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
            <div className="flex items-center gap-3">
              <div className={cn("size-2 rounded-full shrink-0", isEarn ? "bg-emerald-500" : "bg-red-500")} />
              <div>
                <p className="text-sm font-medium">{tx.description || (isEarn ? "نقاط مكتسبة" : "نقاط مستردة")}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleDateString("ar-LY", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <span className={cn("text-sm font-semibold tabular-nums", isEarn ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {isEarn ? "+" : "-"}{tx.points}
            </span>
          </div>
        )
      })}
    </div>
  )
}
