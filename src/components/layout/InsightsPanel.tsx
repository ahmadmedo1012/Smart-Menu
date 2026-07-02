"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Activity, Bell, X, TrendingUp, Users, ShoppingCart, DollarSign, Clock } from "lucide-react"

interface InsightsPanelProps {
  open: boolean
  onToggle: () => void
}

export function InsightsPanel({ open, onToggle }: InsightsPanelProps) {
  const [alerts] = useState([
    { id: 1, text: "مطعم جديد: مطعم الأندلس", severity: "info" as const, time: "منذ 5 د" },
    { id: 2, text: "طلب جديد #3421 بقيمة 145 د.ل", severity: "success" as const, time: "منذ 12 د" },
    { id: 3, text: "انتهاء اشتراك: مطعم الشرق", severity: "warning" as const, time: "منذ 1 س" },
  ])

  // Close panel on route change via manual close
  // On mobile, panel renders as overlay with backdrop
  // On desktop, panel slides in from right

  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "h-screen shrink-0 border-s border-border/10 bg-background/20 backdrop-blur-3xl transition-all duration-300 ease-out-quart flex flex-col overflow-hidden",
          open ? "w-72" : "w-0 lg:w-0 border-0"
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 min-h-[64px] border-b border-border/10">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-orange" />
            <span className="text-sm font-semibold">النظرة السريعة</span>
          </div>
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
            aria-label="إغلاق اللوحة"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none space-y-4 p-4">
          {/* Mini live KPI */}
          <div className="rounded-2xl bg-glass-bg backdrop-blur-2xl border border-glass-border p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              الأداء المباشر
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "الطلبات اليوم", value: "47", icon: ShoppingCart, color: "text-orange" },
                { label: "الإيراد", value: "2,340", icon: DollarSign, color: "text-success" },
                { label: "المستخدمون", value: "18", icon: Users, color: "text-sky-400" },
                { label: "النمو", value: "+12%", icon: TrendingUp, color: "text-emerald-400" },
              ].map((m) => {
                const Icon = m.icon
                return (
                  <div key={m.label} className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Icon className={cn("size-3", m.color)} />
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    </div>
                    <p className="text-lg font-bold tracking-tight">{m.value}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent alerts */}
          <div className="rounded-2xl bg-glass-bg backdrop-blur-2xl border border-glass-border p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Bell className="size-3.5" />
              آخر التنبيهات
            </p>
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] p-2.5"
                >
                  <span className={cn(
                    "mt-1 size-2 rounded-full shrink-0",
                    a.severity === "info" && "bg-sky-400",
                    a.severity === "success" && "bg-success",
                    a.severity === "warning" && "bg-warning",
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground/90 leading-relaxed">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="size-2.5" />
                      {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System status */}
          <div className="rounded-2xl bg-glass-bg backdrop-blur-2xl border border-glass-border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">حالة النظام</p>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs">جميع الأنظمة تعمل</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success/60" />
              قاعدة البيانات: متصلة
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success/60" />
              WebSocket: نشط
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
