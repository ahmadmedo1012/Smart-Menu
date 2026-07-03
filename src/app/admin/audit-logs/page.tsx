"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
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
  ChevronDown, ChevronUp, RefreshCw, AlertCircle,
  Activity, FilterX, History, Search,
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

const CATEGORY_PILLS = [
  { value: "", label: "الكل" },
  { value: "login", label: "دخول" },
  { value: "create", label: "إنشاء" },
  { value: "update", label: "تحديث" },
  { value: "delete", label: "حذف" },
  { value: "export", label: "تصدير" },
  { value: "other", label: "أخرى" },
]

const ACTION_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  create: { label: "إنشاء", color: "text-success", bg: "bg-success/10" },
  update: { label: "تحديث", color: "text-orange", bg: "bg-orange-muted dark:bg-orange-muted" },
  delete: { label: "حذف", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  login: { label: "دخول", color: "text-orange", bg: "bg-orange/10" },
  other: { label: "أخرى", color: "text-muted-foreground", bg: "bg-muted" },
}

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState("")
  const [targetType, setTargetType] = useState("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pageSize = 20

  const fetchLogs = useCallback(async (pageNum: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set("page", String(pageNum))
      params.set("pageSize", String(pageSize))
      if (actionFilter) params.set("action", actionFilter)
      if (targetType) params.set("targetType", targetType)
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (!res.ok) throw new Error("فشل تحميل سجل التدقيق")
      const json = await res.json()
      const data = json.data?.data ?? json.data ?? []
      setLogs(prev => append ? [...prev, ...data] : data)
      setTotal(json.data?.total ?? json.meta?.total ?? 0)
    } catch {
      setError("فشل تحميل سجل التدقيق")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [actionFilter, targetType, search])

  useEffect(() => {
    setPage(1)
    fetchLogs(1, false)
  }, [fetchLogs])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchLogs(nextPage, true)
  }

  const hasMore = logs.length < total
  const getActionStyle = (action: string) => ACTION_STYLES[action] || ACTION_STYLES.other

  // ---------- Loading first page ----------
  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in" aria-live="polite" aria-label="جارٍ التحميل">
        <div className="h-10 w-48 skeleton rounded-lg" />
        <div className="h-64 rounded-md bg-muted/50 animate-breath" />
      </div>
    )
  }

  // ---------- Error ----------
  if (error && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in" aria-live="assertive">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" onClick={() => fetchLogs(1, false)} className="gap-2">
          <RefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-md bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg" aria-hidden="true">
          <Activity className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">سجل التدقيق</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(total)} سجل</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="بحث في الإجراءات والأنواع وعناوين IP..."
            className="w-full h-11 pr-10 pl-4 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="بحث"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="فلتر الإجراء">
            {CATEGORY_PILLS.map(pill => (
              <button
                key={pill.value}
                onClick={() => { setActionFilter(pill.value); setPage(1) }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  actionFilter === pill.value
                    ? "bg-orange text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Target type */}
          <Select value={targetType} onValueChange={(v) => { setTargetType(v ?? ""); setPage(1) }}>
            <SelectTrigger className="h-9 w-36 rounded-md text-sm" aria-label="فلتر نوع الهدف">
              <SelectValue placeholder="كل الأنواع" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(actionFilter || targetType || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setActionFilter(""); setTargetType(""); setSearchInput(""); setSearch(""); setPage(1) }} className="gap-1">
              <FilterX className="size-3.5" /> إزالة
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <History className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">
            {actionFilter || targetType || search ? "لا توجد نتائج" : "لا توجد سجلات تدقيق"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-border/30 bg-card/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">الهدف</TableHead>
                  <TableHead className="text-right">الجهة الفاعلة</TableHead>
                  <TableHead className="text-right hidden md:table-cell">IP</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">التاريخ</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => {
                  const as = getActionStyle(log.action)
                  const isExpanded = expandedId === log.id
                  return (
                    <TableRow key={log.id} className="group">
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
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell font-mono" dir="ltr">
                        {log.ip || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {formatDate(new Date(log.createdAt))}
                      </TableCell>
                      <TableCell className="p-1">
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            aria-label={isExpanded ? "إخفاء التفاصيل" : "إظهار التفاصيل"}
                          >
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Expanded metadata rows */}
          {expandedId !== null && (
            <div className="rounded-md border border-border/30 bg-muted/30 p-4 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto" dir="ltr">
                {JSON.stringify(logs.find(l => l.id === expandedId)?.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-2 min-w-[160px]"
              >
                {loadingMore ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                تحميل المزيد ({toArabicNumber(total - logs.length)})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
