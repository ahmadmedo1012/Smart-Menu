"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  Search, Activity, FilterX, History,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber, formatDate } from "@/lib/format"

interface AuditLogEntry {
  id: number
  action: string
  actorId: number | null
  actor: { id: number; name: string; username: string } | null
  targetType: string
  targetId: number | null
  metadata: Record<string, unknown>
  ip: string
  createdAt: string
}

const ACTION_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  create: { label: "إنشاء", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  update: { label: "تحديث", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  delete: { label: "حذف", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  login: { label: "دخول", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  other: { label: "أخرى", color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-800/30" },
}

const ACTION_OPTIONS = [
  { value: "", label: "كل الإجراءات" },
  { value: "create", label: "إنشاء" },
  { value: "update", label: "تحديث" },
  { value: "delete", label: "حذف" },
  { value: "login", label: "دخول" },
  { value: "other", label: "أخرى" },
]

const TARGET_TYPE_OPTIONS = [
  { value: "", label: "كل الأنواع" },
  { value: "restaurant", label: "مطعم" },
  { value: "user", label: "مستخدم" },
  { value: "order", label: "طلب" },
  { value: "plan", label: "خطة" },
  { value: "category", label: "قسم" },
  { value: "item", label: "صنف" },
]

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState("")
  const [targetType, setTargetType] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const pageSize = 20

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (actionFilter) params.set("action", actionFilter)
      if (targetType) params.set("targetType", targetType)

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (!res.ok) throw new Error("فشل تحميل سجل التدقيق")
      const json = await res.json()
      setLogs(json.data?.data ?? json.data ?? [])
      setTotal(json.data?.total ?? json.meta?.total ?? 0)
    } catch {
      setError("فشل تحميل سجل التدقيق")
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, targetType])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / pageSize)

  const getActionStyle = (action: string) => ACTION_STYLES[action] || ACTION_STYLES.other

  // ---------- Loading ----------
  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in" aria-live="polite" aria-label="جارٍ التحميل">
        <div className="h-10 w-48 skeleton rounded-lg" />
        <div className="h-64 rounded-2xl bg-muted/50 animate-breath" />
      </div>
    )
  }

  // ---------- Error ----------
  if (error && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in" aria-live="assertive">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" onClick={fetchLogs} className="gap-2 rounded-xl">
          <RefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg" aria-hidden="true">
          <Activity className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">سجل التدقيق</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(total)} سجل</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v ?? ""); setPage(1) }}>
          <SelectTrigger className="h-11 w-40 rounded-2xl" aria-label="فلتر الإجراء">
            <SelectValue placeholder="كل الإجراءات" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={targetType} onValueChange={(v) => { setTargetType(v ?? ""); setPage(1) }}>
          <SelectTrigger className="h-11 w-40 rounded-2xl" aria-label="فلتر نوع الهدف">
            <SelectValue placeholder="كل الأنواع" />
          </SelectTrigger>
          <SelectContent>
            {TARGET_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(actionFilter || targetType) && (
          <Button variant="ghost" onClick={() => { setActionFilter(""); setTargetType(""); setPage(1) }} className="gap-2 rounded-xl">
            <FilterX className="size-4" /> إزالة الفلتر
          </Button>
        )}
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <History className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">
            {actionFilter || targetType ? "لا توجد نتائج" : "لا توجد سجلات تدقيق"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">الهدف</TableHead>
                  <TableHead className="text-right">الجهة الفاعلة</TableHead>
                  <TableHead className="text-right hidden md:table-cell">التفاصيل</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => {
                  const as = getActionStyle(log.action)
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className={cn("font-medium", as.bg, as.color)}>
                          {as.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">{log.targetType || "—"}</span>
                        {log.targetId && (
                          <span className="text-muted-foreground mr-1">#{log.targetId}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.actor ? (
                          <span>{log.actor.name} <span className="text-muted-foreground">@{log.actor.username}</span></span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                        {log.metadata && Object.keys(log.metadata).length > 0
                          ? JSON.stringify(log.metadata).slice(0, 60)
                          : "—"
                        }
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {formatDate(new Date(log.createdAt))}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="الصفحة السابقة"
              >
                <ChevronRight className="size-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pn: number
                if (totalPages <= 5) {
                  pn = i + 1
                } else if (page <= 3) {
                  pn = i + 1
                } else if (page >= totalPages - 2) {
                  pn = totalPages - 4 + i
                } else {
                  pn = page - 2 + i
                }
                return (
                  <Button
                    key={pn}
                    variant={pn === page ? "gradient" : "outline"}
                    size="icon-sm"
                    onClick={() => setPage(pn)}
                    className="w-9"
                    aria-label={`الصفحة ${pn}`}
                    aria-current={pn === page ? "page" : undefined}
                  >
                    {toArabicNumber(pn)}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="الصفحة التالية"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground mr-2">
                الصفحة {toArabicNumber(page)} من {toArabicNumber(totalPages)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
