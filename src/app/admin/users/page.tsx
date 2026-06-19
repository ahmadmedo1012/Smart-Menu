"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Users, Trash2, Key, AlertCircle, UserPlus, Store, Shield, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

interface OwnerUser {
  id: number; username: string; name: string; role: string
  restaurantId: number | null
  restaurant: { id: number; name: string; slug: string } | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<OwnerUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<OwnerUser | null>(null)
  const [resetTarget, setResetTarget] = useState<OwnerUser | null>(null)
  const [newPassword, setNewPassword] = useState("")

  const fetchUsers = async () => {
    try {
      setLoading(true); setError(null)
      const res = await fetch("/api/users")
      if (!res.ok) throw Error()
      const json = await res.json()
      setUsers(json.data ?? json ?? [])
    } catch { setError("فشل تحميل المستخدمين") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const deleteUser = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" })
      toast.success("تم حذف المستخدم")
      setDeleteTarget(null); fetchUsers()
    } catch { toast.error("فشل الحذف") }
  }

  const resetPassword = async () => {
    if (!resetTarget || !newPassword.trim() || newPassword.length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل"); return
    }
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetTarget.id, newPassword }),
      })
      if (!res.ok) throw Error()
      toast.success("تم إعادة تعيين كلمة المرور")
      setResetTarget(null); setNewPassword("")
    } catch { toast.error("فشل إعادة التعيين") }
  }

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.includes(q) || u.username.includes(q) || (u.restaurant?.name || "").includes(q)
  })

  if (loading) return (
    <div className="space-y-3 animate-fade-in">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-breath" />)}
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <AlertCircle className="size-10 text-destructive" />
      <p className="text-lg font-medium">{error}</p>
      <Button variant="outline" onClick={fetchUsers}>إعادة المحاولة</Button>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المستخدمين</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(users.length)} مستخدم</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">إجمالي</p>
          <p className="text-2xl font-bold mt-1">{toArabicNumber(users.length)}</p>
        </div>
        <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/30 p-4">
          <p className="text-xs text-purple-600">مديرون</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{toArabicNumber(users.filter(u => u.role === "admin").length)}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/30 p-4">
          <p className="text-xs text-amber-600">أصحاب مطاعم</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{toArabicNumber(users.filter(u => u.role === "owner").length)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30 p-4">
          <p className="text-xs text-emerald-600">مرتبط بمطعم</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{toArabicNumber(users.filter(u => u.restaurantId).length)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث باسم المستخدم أو المطعم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 pr-11 rounded-2xl border border-border/30 bg-card/50 px-4 text-sm outline-none transition-all focus-visible:border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/20"
        />
      </div>

      {/* Users */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Users className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">{search ? "لا توجد نتائج" : "لا توجد مستخدمين"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(user => (
            <div key={user.id} className="rounded-2xl border border-border/30 bg-card/50 p-5 hover:border-amber-200/30 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-11 rounded-xl flex items-center justify-center shrink-0",
                    user.role === "admin" ? "bg-purple-50 dark:bg-purple-950/30" : "bg-amber-50 dark:bg-amber-950/30"
                  )}>
                    {user.role === "admin"
                      ? <Shield className="size-5 text-purple-600 dark:text-purple-400" />
                      : <UserPlus className="size-5 text-amber-600 dark:text-amber-400" />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{user.name}</p>
                      <Badge className={cn(
                        "text-[10px]",
                        user.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}>
                        {user.role === "admin" ? "مدير" : "مالك"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      @{user.username}
                      {user.restaurant && (
                        <span className="flex items-center gap-1 mt-0.5">
                          <Store className="size-3" />
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
                    className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
                    title="إعادة تعيين كلمة المرور"
                  >
                    <Key className="size-4" />
                  </button>
                  {user.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(user)}
                      className="size-9 rounded-xl border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={resetTarget !== null} onOpenChange={o => !o && setResetTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
            <DialogDescription>أدخل كلمة مرور جديدة للمستخدم {resetTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetTarget(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={resetPassword} disabled={newPassword.length < 4} className="rounded-xl">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المستخدم &ldquo;{deleteTarget?.name}&rdquo;؟
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl">إلغاء</Button>
            <Button variant="destructive" onClick={deleteUser} className="rounded-xl">حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
