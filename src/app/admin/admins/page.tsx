"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { premiumToast } from "@/lib/premium-toast"
import { csrfFetch } from "@/lib/csrf-client"
import {
  Shield, UserPlus, Key, Trash2, LogOut, RefreshCw, AlertCircle,
  CheckCheck, Users, Store, DollarSign, Settings as SettingsIcon,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber, formatDate } from "@/lib/format"

interface AdminUser {
  id: number; username: string; name: string; role: string
  permissions: string[]; createdAt: string; lastLoginAt: string | null
}

const PERMISSION_OPTIONS = [
  { value: "APPROVE_ORDERS", label: "الموافقة على الطلبات", icon: CheckCheck, desc: "الموافقة على طلبات العملاء" },
  { value: "MANAGE_SUBSCRIPTIONS", label: "إدارة الاشتراكات", icon: DollarSign, desc: "إدارة خطط الاشتراك والمدفوعات" },
  { value: "EDIT_SETTINGS", label: "تعديل الإعدادات", icon: SettingsIcon, desc: "تعديل إعدادات النظام" },
  { value: "VIEW_ANALYTICS", label: "مشاهدة الإحصائيات", icon: BarChart3, desc: "عرض التقارير والإحصائيات" },
  { value: "MANAGE_RESTAURANTS", label: "إدارة المطاعم", icon: Store, desc: "إضافة وتعديل المطاعم" },
  { value: "MANAGE_USERS", label: "إدارة المستخدمين", icon: Users, desc: "إدارة حسابات المستخدمين" },
]

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite form
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ username: "", name: "", password: "" })
  const [invitePerms, setInvitePerms] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)

  // Edit sheet
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [editPerms, setEditPerms] = useState<string[]>([])
  const [editing, setEditing] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [todayMs] = useState(() => Date.now())

  const fetchAdmins = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/admin/admins")
      if (!res.ok) throw Error()
      const json = await res.json()
      setAdmins(json.data ?? [])
    } catch {
      setError("فشل تحميل المسؤولين")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAdmins() }, [fetchAdmins])

  const toggleInvitePerm = (perm: string) => {
    setInvitePerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
  }

  const handleInvite = async () => {
    if (!inviteForm.username.trim() || !inviteForm.name.trim() || !inviteForm.password.trim()) {
      premiumToast("error", "يرجى ملء جميع الحقول"); return
    }
    setInviting(true)
    try {
      const res = await csrfFetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inviteForm, permissions: invitePerms }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "فشل إنشاء المسؤول")
      }
      premiumToast("success", "تم إنشاء المسؤول بنجاح")
      setInviteOpen(false)
      setInviteForm({ username: "", name: "", password: "" })
      setInvitePerms([])
      fetchAdmins()
    } catch (e: any) {
      premiumToast("error", e.message || "فشل إنشاء المسؤول")
    } finally {
      setInviting(false)
    }
  }

  const openEdit = (admin: AdminUser) => {
    setEditTarget(admin)
    setEditPerms([...admin.permissions])
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setEditing(true)
    try {
      const res = await csrfFetch(`/api/admin/admins/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editPerms }),
      })
      if (!res.ok) throw Error()
      premiumToast("save", "تم تحديث الصلاحيات")
      setEditTarget(null)
      fetchAdmins()
    } catch {
      premiumToast("error", "فشل تحديث الصلاحيات")
    } finally {
      setEditing(false)
    }
  }

  const handleRevokeSessions = async (admin: AdminUser) => {
    try {
      const res = await csrfFetch(`/api/admin/admins/${admin.id}/revoke-sessions`, { method: "POST" })
      if (!res.ok) throw Error()
      premiumToast("refresh", "تم إلغاء جميع الجلسات")
      fetchAdmins()
    } catch {
      premiumToast("error", "فشل إلغاء الجلسات")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await csrfFetch(`/api/admin/admins/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "فشل الحذف")
      premiumToast("trash", "تم حذف المسؤول")
      setDeleteTarget(null)
      fetchAdmins()
    } catch (e: any) {
      premiumToast("error", e.message || "فشل حذف المسؤول")
    } finally {
      setDeleting(false)
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in" aria-live="polite">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-md bg-muted/50 animate-breath" />)}
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in" aria-live="assertive">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" onClick={fetchAdmins} className="gap-2">
          <RefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    )
  }

  const superAdmins = admins.filter(a => a.role === "super_admin")
  const subAdmins = admins.filter(a => a.role === "sub_admin")

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المسؤولين</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(admins.length)} مسؤول</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="size-4" /> إضافة مسؤول
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">إجمالي</p>
          <p className="text-2xl font-bold mt-1">{toArabicNumber(admins.length)}</p>
        </div>
        <div className="rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200/30 p-4">
          <p className="text-xs text-purple-600">مدير عام</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{toArabicNumber(superAdmins.length)}</p>
        </div>
        <div className="rounded-md bg-orange-muted dark:bg-orange-muted border border-orange/20 p-4">
          <p className="text-xs text-orange">مسؤول</p>
          <p className="text-2xl font-bold mt-1 text-orange">{toArabicNumber(subAdmins.length)}</p>
        </div>
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30 p-4">
          <p className="text-xs text-emerald-600">نشط اليوم</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{toArabicNumber(admins.filter(a => {
            if (!a.lastLoginAt) return false
            return new Date(a.lastLoginAt).getTime() > todayMs - 86400000
          }).length)}</p>
        </div>
      </div>

      {/* Super Admins Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="size-5 text-purple-500" />
          المدراء العامون
        </h3>
        {superAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Shield className="size-10 text-muted-foreground/50" />
            <p className="text-sm">لا يوجد مدراء عامون</p>
          </div>
        ) : (
          <div className="space-y-2">
            {superAdmins.map(admin => (
              <div key={admin.id} className="rounded-md bg-card/50 border border-border/30 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                      <Shield className="size-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold">{admin.name}</p>
                      <p className="text-xs text-muted-foreground">@{admin.username}</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px]">
                    مدير عام
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sub Admins Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="size-5 text-orange" />
          المسؤولون
        </h3>
        {subAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <UserPlus className="size-10 text-muted-foreground/50" />
            <p className="text-sm">لا يوجد مسؤولون. أضف أول مسؤول الآن</p>
            <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
              <UserPlus className="size-4" /> إضافة مسؤول
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {subAdmins.map(admin => (
              <div key={admin.id} className="rounded-md bg-card/50 border border-border/30 p-5 hover:border-orange/20 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-orange-muted flex items-center justify-center">
                      <Shield className="size-5 text-orange" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{admin.name}</p>
                        <span className="text-xs text-muted-foreground">@{admin.username}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {PERMISSION_OPTIONS.filter(p => admin.permissions.includes(p.value)).map(p => (
                          <Badge key={p.value} variant="outline" className="text-[10px] px-1.5 py-0 border-orange/20 text-orange/80">
                            {p.label}
                          </Badge>
                        ))}
                        {admin.permissions.length === 0 && (
                          <span className="text-xs text-muted-foreground">لا توجد صلاحيات</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        أنشئ {formatDate(new Date(admin.createdAt))}
                        {admin.lastLoginAt && ` • آخر دخول ${formatDate(new Date(admin.lastLoginAt))}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(admin)}
                      className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
                      title="تعديل الصلاحيات"
                    >
                      <Key className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeSessions(admin)}
                      className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
                      title="إلغاء الجلسات"
                    >
                      <LogOut className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(admin)}
                      className="size-9 rounded-xl border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invite Sheet */}
      <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>إضافة مسؤول جديد</SheetTitle>
            <SheetDescription>أنشئ حساب مسؤول بصلاحيات محددة</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div>
              <Label htmlFor="inv-name">الاسم</Label>
              <Input id="inv-name" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl mt-1.5" placeholder="اسم المسؤول" />
            </div>
            <div>
              <Label htmlFor="inv-username">اسم المستخدم</Label>
              <Input id="inv-username" value={inviteForm.username} onChange={e => setInviteForm(f => ({ ...f, username: e.target.value }))} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" placeholder="admin_username" />
            </div>
            <div>
              <Label htmlFor="inv-password">كلمة المرور المؤقتة</Label>
              <Input id="inv-password" type="password" value={inviteForm.password} onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))} className="h-11 rounded-xl mt-1.5" placeholder="******" />
            </div>

            <div>
              <Label className="block mb-3">الصلاحيات</Label>
              <div className="space-y-2">
                {PERMISSION_OPTIONS.map(p => {
                  const Icon = p.icon
                  const enabled = invitePerms.includes(p.value)
                  return (
                    <label key={p.value} className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                      enabled ? "border-orange/30 bg-orange-muted/30 dark:bg-orange-muted" : "border-border/30 hover:border-orange/20"
                    )}>
                      <Switch checked={enabled} onCheckedChange={() => toggleInvitePerm(p.value)} />
                      <Icon className={cn("size-5 shrink-0", enabled ? "text-orange" : "text-muted-foreground")} />
                      <div>
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <Button onClick={handleInvite} disabled={inviting} className="w-full gap-2 h-11 rounded-xl">
              {inviting ? "جارٍ..." : <><UserPlus className="size-4" /> إضافة المسؤول</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={editTarget !== null} onOpenChange={o => !o && setEditTarget(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>تعديل صلاحيات المسؤول</SheetTitle>
            <SheetDescription>{editTarget?.name} — @{editTarget?.username}</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 mt-6">
            {PERMISSION_OPTIONS.map(p => {
              const Icon = p.icon
              const enabled = editPerms.includes(p.value)
              return (
                <label key={p.value} className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                  enabled ? "border-orange/30 bg-orange-muted/30 dark:bg-orange-muted" : "border-border/30 hover:border-orange/20"
                )}>
                  <Switch checked={enabled} onCheckedChange={() => {
                    setEditPerms(prev => prev.includes(p.value) ? prev.filter(x => x !== p.value) : [...prev, p.value])
                  }} />
                  <Icon className={cn("size-5 shrink-0", enabled ? "text-orange" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                </label>
              )
            })}
          </div>

          <Button onClick={handleEdit} disabled={editing} className="w-full gap-2 h-11 rounded-xl mt-6">
            {editing ? "جارٍ..." : "حفظ التغييرات"}
          </Button>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Sheet open={deleteTarget !== null} onOpenChange={o => !o && setDeleteTarget(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>تأكيد الحذف</SheetTitle>
            <SheetDescription>
              هل أنت متأكد من حذف المسؤول <strong>{deleteTarget?.name}</strong>؟ هذا الإجراء لا يمكن التراجع عنه.
            </SheetDescription>
          </SheetHeader>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 h-11">إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1 h-11">
              {deleting ? "جارٍ..." : "حذف"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
