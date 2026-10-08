"use client"

import { csrfJson } from "@/lib/csrf-client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchInput } from "@/components/ui/search-input"
import { premiumToast } from "@/lib/premium-toast"
import {Users, Key, UserPlus, Store, Shield, FilterX} from 'lucide-react';
import AnimatedTrash2 from '@/components/ui/trash-icon';
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import { PageHeader } from "@/components/shared/PageHeader"
import { ErrorState } from "@/components/shared/ErrorState"
import { EmptyState } from "@/components/ui/empty-state"
import { TablePagination } from "@/components/shared/TablePagination"
import { TablePageSkeleton } from "@/components/shared/DashboardSkeletons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAccessGate } from '@/hooks/useAccessGate';
import { AccessDenied } from '@/components/shared/AccessDenied';
// users gate: super_admin always; sub_admin needs MANAGE_USERS (r103-F6 —
// mirrors the API gate); legacy admin needs MANAGE_USERS.
const allowUsersGate = (me: { role: string | null; permissions: string[] }) =>
        me.role === 'super_admin' ||
        me.role === 'sub_admin' && me.permissions.includes('MANAGE_USERS') ||
        me.role === 'admin' && me.permissions.includes('MANAGE_USERS');

interface OwnerUser {
  id: number; username: string; name: string; role: string
  restaurantId: number | null
  restaurant: { id: number; name: string; slug: string } | null
}

export default function AdminUsersPage() {
  const access = useAccessGate(allowUsersGate);
  const [users, setUsers] = useState<OwnerUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<OwnerUser | null>(null)
  const [resetTarget, setResetTarget] = useState<OwnerUser | null>(null)
  const [newPassword, setNewPassword] = useState("")

  const pageSize = 15

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (search.trim()) params.set("search", search.trim())
      if (roleFilter !== "all") params.set("role", roleFilter)

      const res = await fetch(`/api/users?${params.toString()}`)
      const json = await res.json().catch(() => null)
      // round87-C3: surface the server's Arabic error (was: empty throw -> generic message)
      if (!res.ok || !json?.success) throw new Error(json?.error ?? `فشل الطلب (${res.status})`)
      // Array.isArray guard: error bodies are objects, not lists.
      setUsers(Array.isArray(json.data?.users) ? json.data.users : []);
      setTotal(json.data?.total ?? json.meta?.total ?? 0)
    } catch (e) { setError(getErrorMessage(e, "تعذر تحميل المستخدمين")) }
    finally { setLoading(false) }
  }, [page, search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])



  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])
  useEffect(() => { setPage(1) }, [search, roleFilter])

  const totalPages = Math.ceil(total / pageSize)

  const deleteUser = async () => {
    if (!deleteTarget) return
    try {
      await csrfJson(`/api/users/${deleteTarget.id}`, { method: "DELETE" })
      premiumToast("success", "تم حذف المستخدم")
      setDeleteTarget(null); fetchUsers()
    } catch (e) { premiumToast("error", getErrorMessage(e, "تعذر الحذف")) }
  }

  const resetPassword = async () => {
    if (!resetTarget || !newPassword.trim() || newPassword.length < 4) {
      premiumToast("error", "كلمة المرور يجب أن تكون 4 أحرف على الأقل"); return
    }
    try {
      await csrfJson("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetTarget.id, newPassword }),
      })
      premiumToast("refresh", "تم إعادة تعيين كلمة المرور")
      setResetTarget(null); setNewPassword("")
    } catch (e) { premiumToast("error", getErrorMessage(e, "تعذر إعادة التعيين")) }
  }

  // ---------- Loading ----------
  if (loading && users.length === 0) {
    // r131-F5 (A11 SM-2): table-shaped skeleton (was three animate-breath rows).
    return <TablePageSkeleton rows={6} label="جارٍ تحميل المستخدمين..." />
  }

  // ---------- Error ----------
  if (error && users.length === 0) {
    // r131-F5 (A1 P1-12): canonical error family.
    return <ErrorState title="تعذر تحميل المستخدمين" error={error} onRetry={fetchUsers} />
  }

  // ---------- Access denied ----------
    if (access === 'denied') return <AccessDenied />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* r131-F5 (A1 P0-8): canonical page-header chrome. */}
      <PageHeader
        title="إدارة المستخدمين"
        subtitle={`${toArabicNumber(total)} مستخدم — الملاك والمديرون وربطهم بالمطاعم`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">إجمالي</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{toArabicNumber(total)}</p>
        </div>
        <div className="rounded-xl bg-[var(--info-soft)] border border-transparent p-4">
          <p className="text-xs text-[var(--info-ink)]">مديرون</p>
          <p className="text-2xl font-bold mt-1 text-[var(--info-ink)] tabular-nums">{toArabicNumber(users.filter(u => u.role === "admin").length)}</p>
        </div>
        <div className="rounded-xl bg-[var(--accent-soft)] border border-transparent p-4">
          <p className="text-xs text-[var(--accent-ink)]">أصحاب مطاعم</p>
          <p className="text-2xl font-bold mt-1 text-[var(--accent-ink)] tabular-nums">{toArabicNumber(users.filter(u => u.role === "owner").length)}</p>
        </div>
        <div className="rounded-xl bg-[var(--success-soft)] border border-transparent p-4">
          <p className="text-xs text-[var(--success-ink)]">مرتبط بمطعم</p>
          <p className="text-2xl font-bold mt-1 text-[var(--success-ink)] tabular-nums">{toArabicNumber(users.filter(u => u.restaurantId).length)}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="ابحث باسم المستخدم أو المطعم..."
          aria-label="ابحث عن مستخدم"
        />
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className="w-40" aria-label="فلتر الدور">
            <SelectValue placeholder="كل الأدوار">
              {roleFilter === "all" ? "كل الأدوار" : roleFilter === "admin" ? "مدير" : roleFilter === "owner" ? "مالك" : roleFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأدوار</SelectItem>
            <SelectItem value="admin">مدير</SelectItem>
            <SelectItem value="owner">مالك</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users list */}
      {users.length === 0 ? (
        /* r131-F5 (A1 P0-3): the legacy .empty-state-icon hand-roll joins the
                shared primitive. */
        <EmptyState
          icon={Users}
          title={search || roleFilter !== "all" ? "لا توجد نتائج" : "لا يوجد مستخدمين"}
          description={search || roleFilter !== "all" ? "جرّب مسح الفلتر لعرض كل المستخدمين" : "سيظهر الملاك والمديرون هنا مع أول تسجيل"}
          action={(search || roleFilter !== "all") ? (
            <Button variant="outline" size="sm" onClick={() => { setSearchInput(""); setSearch(""); setRoleFilter("all") }} className="gap-2">
              <FilterX className="size-4" /> إزالة الفلتر
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* md+ — canonical data table (r131-F5, A1 P1-1/P1-2): 11px surface-2
                      headers, 13px cells, quiet hover wash + 3px accent bar, actions
                      revealed on hover/focus (always on touch). */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border/60 bg-card">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="h-11 bg-muted/60 px-4 text-start align-middle text-2xs font-semibold whitespace-nowrap text-muted-foreground border-b border-border">المستخدم</TableHead>
                  <TableHead className="h-11 bg-muted/60 px-4 text-start align-middle text-2xs font-semibold whitespace-nowrap text-muted-foreground border-b border-border">الدور</TableHead>
                  <TableHead className="h-11 bg-muted/60 px-4 text-start align-middle text-2xs font-semibold whitespace-nowrap text-muted-foreground border-b border-border">المطعم</TableHead>
                  <TableHead className="h-11 bg-muted/60 px-4 text-end align-middle text-2xs font-semibold whitespace-nowrap text-muted-foreground border-b border-border">
                    <span className="sr-only">إجراءات</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => {
                  const isAdmin = user.role === "admin" || user.role === "super_admin"
                  return (
                    <TableRow key={user.id} className="group relative border-b border-border/40 transition-colors duration-fast hover:bg-muted">
                      <TableCell className="relative px-4 py-3 align-middle text-sm font-semibold after:absolute after:inset-y-3 after:start-0 after:w-[3px] after:rounded-e-[2px] after:origin-bottom after:scale-y-0 after:bg-[var(--accent-solid)] after:transition-transform after:duration-base group-hover:after:scale-y-100">
                        <span className="block">{user.name}</span>
                        <span className="block text-xs font-normal text-muted-foreground" dir="ltr">@{user.username}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-middle text-sm">
                        <Badge className={cn(
                          "text-2xs font-semibold tabular-nums",
                          isAdmin ? "bg-[var(--info-soft)] text-[var(--info-ink)]" : "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                        )}>
                          {isAdmin ? "مدير" : "مالك"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground">
                        {user.restaurant ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Store className="size-3.5" aria-hidden="true" />
                            {user.restaurant.name}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-middle text-sm text-end">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setResetTarget(user); setNewPassword("") }}
                            aria-label={`إعادة تعيين كلمة مرور ${user.name}`}
                          >
                            <Key className="size-3.5" aria-hidden="true" />
                            كلمة المرور
                          </Button>
                          {user.role !== "admin" && user.role !== "super_admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(user)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`حذف ${user.name}`}
                            >
                              <AnimatedTrash2 className="size-3.5" aria-hidden="true" />
                              حذف
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {/* r131-F5 (A1 P2-7): the shared numbered pagination (36px visual,
                            44px touch floor, accent-soft active page). */}
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              meta={`${toArabicNumber(total)} مستخدم — الصفحة ${toArabicNumber(page)} من ${toArabicNumber(totalPages)}`}
            />
          </div>

          {/* <md — the card feed (tbl-stack equivalent) */}
          <div className="md:hidden space-y-3">
            {users.map(user => (
              <div key={user.id} className="rounded-xl border border-border/30 bg-card/50 p-5 hover:border-orange/20 hover:shadow-md transition-[border-color,box-shadow]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-11 rounded-lg flex items-center justify-center shrink-0",
                      user.role === "admin" ? "bg-[var(--info-soft)]" : "bg-[var(--accent-soft)]"
                    )} aria-hidden="true">
                      {user.role === "admin"
                        ? <Shield className="size-5 text-[var(--info-ink)]" />
                        : <UserPlus className="size-5 text-[var(--accent-ink)]" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{user.name}</p>
                        <Badge className={cn(
                          "text-2xs font-semibold tabular-nums",
                          user.role === "admin" ? "bg-[var(--info-soft)] text-[var(--info-ink)]" : "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                        )}>
                          {user.role === "admin" ? "مدير" : "مالك"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        @{user.username}
                        {user.restaurant && (
                          <span className="flex items-center gap-1 mt-0.5">
                            <Store className="size-3" aria-hidden="true" />
                            {user.restaurant.name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setResetTarget(user); setNewPassword("") }}
                      className="size-11 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="إعادة تعيين كلمة المرور"
                      aria-label={`إعادة تعيين كلمة مرور ${user.name}`}
                    >
                      <Key className="size-4" aria-hidden="true" />
                    </button>
                    {user.role !== "admin" && user.role !== "super_admin" && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        className="size-11 rounded-lg border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
                        title="حذف"
                        aria-label={`حذف ${user.name}`}
                      >
                        <AnimatedTrash2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              meta={`${toArabicNumber(total)} مستخدم — الصفحة ${toArabicNumber(page)} من ${toArabicNumber(totalPages)}`}
            />
          </div>
        </>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={resetTarget !== null} onOpenChange={o => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
            <DialogDescription>أدخل كلمة مرور جديدة للمستخدم {resetTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dlg-password">كلمة المرور الجديدة</Label>
              <Input
                id="dlg-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetTarget(null)}>إلغاء</Button>
            <Button onClick={resetPassword} disabled={newPassword.length < 4}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المستخدم &ldquo;{deleteTarget?.name}&rdquo;؟
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={deleteUser}>حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
