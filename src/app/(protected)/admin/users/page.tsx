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
import {Users, Key, AlertCircle, UserPlus, Store, Shield, FilterX} from 'lucide-react';
import { MotionChevronLeft } from '@/components/ui/motion-icons';
import { MotionChevronRight } from '@/components/ui/motion-icons';
import AnimatedTrash2 from '@/components/ui/trash-icon';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import { LoadingAnnouncer } from "@/components/ui/loading-announcer"
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
    } catch (e) { setError(getErrorMessage(e, "فشل تحميل المستخدمين")) }
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
    } catch (e) { premiumToast("error", getErrorMessage(e, "فشل الحذف")) }
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
    } catch (e) { premiumToast("error", getErrorMessage(e, "فشل إعادة التعيين")) }
  }

  // ---------- Loading ----------
  if (loading && users.length === 0) {
    return (
      <div className="space-y-3 animate-fade-in" aria-live="polite" aria-label="جارٍ التحميل">
        <LoadingAnnouncer loading message="جارٍ تحميل المستخدمين..." />
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />)}
      </div>
    )
  }

  // ---------- Error ----------
  if (error && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in" aria-live="assertive">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" onClick={fetchUsers} className="gap-2">
          <AnimatedRefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    )
  }

  // ---------- Access denied ----------
    if (access === 'denied') return <AccessDenied />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">إدارة المستخدمين</h1>
          <p className="text-sm text-muted-foreground">{toArabicNumber(total)} مستخدم</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">إجمالي</p>
          <p className="text-2xl font-bold mt-1">{toArabicNumber(total)}</p>
        </div>
        <div className="rounded-xl bg-info/10 dark:bg-info/15 border border-info/20 p-4">
          <p className="text-xs text-info">مديرون</p>
          <p className="text-2xl font-bold mt-1 text-info">{toArabicNumber(users.filter(u => u.role === "admin").length)}</p>
        </div>
        <div className="rounded-xl bg-orange-muted border border-orange/20 p-4">
          <p className="text-xs text-accent-foreground">أصحاب مطاعم</p>
          <p className="text-2xl font-bold mt-1 text-accent-foreground">{toArabicNumber(users.filter(u => u.role === "owner").length)}</p>
        </div>
        <div className="rounded-xl bg-success/10 dark:bg-success/15 border border-success/20 p-4">
          <p className="text-xs text-success">مرتبط بمطعم</p>
          <p className="text-2xl font-bold mt-1 text-success">{toArabicNumber(users.filter(u => u.restaurantId).length)}</p>
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
          <SelectTrigger className="h-11 w-40 rounded-md" aria-label="فلتر الدور">
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
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <div className="empty-state-icon">
            <Users />
          </div>
          <p className="text-lg font-medium">{search || roleFilter !== "all" ? "لا توجد نتائج" : "لا يوجد مستخدمين"}</p>
          {(search || roleFilter !== "all") && (
            <Button variant="ghost" onClick={() => { setSearchInput(""); setSearch(""); setRoleFilter("all") }} className="gap-2">
              <FilterX className="size-4" /> إزالة الفلتر
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="rounded-xl border border-border/30 bg-card/50 p-5 hover:border-orange/20 hover:shadow-md transition-[border-color,box-shadow]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-11 rounded-xl flex items-center justify-center shrink-0",
                      user.role === "admin" ? "bg-info/10 dark:bg-info/15" : "bg-orange-muted"
                    )} aria-hidden="true">
                      {user.role === "admin"
                        ? <Shield className="size-5 text-info" />
                        : <UserPlus className="size-5 text-orange" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{user.name}</p>
                        <Badge className={cn(
                          "text-[10px]",
                          user.role === "admin" ? "bg-info/15 text-info dark:bg-info/25" : "bg-orange-muted text-accent-foreground/80 dark:bg-orange-muted dark:text-accent-foreground"
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
                      className="size-11 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="إعادة تعيين كلمة المرور"
                      aria-label={`إعادة تعيين كلمة مرور ${user.name}`}
                    >
                      <Key className="size-4" aria-hidden="true" />
                    </button>
                    {user.role !== "admin" && user.role !== "super_admin" && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        className="size-11 rounded-xl border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="الصفحة السابقة"
              >
                <MotionChevronRight className="size-4" />
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
                    variant={pn === page ? "orange" : "outline"}
                    size="icon"
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
                size="icon"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="الصفحة التالية"
              >
                <MotionChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground ms-2">
                الصفحة {toArabicNumber(page)} من {toArabicNumber(totalPages)}
              </span>
            </div>
          )}
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
                className="h-11 rounded-xl mt-1.5"
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
