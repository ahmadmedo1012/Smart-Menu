# RBAC & Settings Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hierarchical RBAC (super_admin/sub_admin) with permission checks, sub-admin management UI, extended SystemConfig categories for balance/payment data.

**Architecture:** Two-layer auth — middleware for route access, requirePermission() for granular API guards. Direct db push to NEON PostgreSQL. Reuse existing SystemConfig model.

**Tech Stack:** Next.js 16.2.9, Prisma 7.8, Neon PostgreSQL, shadcn/ui

## Global Constraints

- All Prisma schema changes sync'd via `npx prisma db push` (no migration files)
- Role enum: super_admin, sub_admin, owner (remove admin enum value)
- Permission enum: 6 exact values defined in spec
- Auth: existing cookie + session system unchanged, add permission check layer
- API responses: existing success/error helpers unchanged
- UI: RTL-first, Arabic labels, existing design patterns
- AuditLog entries for all sub-admin CRUD operations

---

### Task 1: Update Prisma Schema — Role/Permission enums + User.permissions

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] Change Role enum (replace admin with super_admin + sub_admin)

```prisma
enum Role {
  super_admin
  sub_admin
  owner
}
```

- [ ] Add Permission enum

```prisma
enum Permission {
  APPROVE_ORDERS
  MANAGE_SUBSCRIPTIONS
  EDIT_SETTINGS
  VIEW_ANALYTICS
  MANAGE_RESTAURANTS
  MANAGE_USERS
}
```

- [ ] Add permissions field to User model

```prisma
model User {
  // ... existing fields unchanged
  permissions  Permission[] @default([])
}
```

Place after `role` field, before `lastLoginAt`.

- [ ] Push to NEON

```bash
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] Commit

```bash
git add prisma/schema.prisma
git commit -m "feat: RBAC schema — super_admin/sub_admin roles + Permission enum + User.permissions"
```

---

### Task 2: Create requirePermission auth guard

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] Add requirePermission() function below existing requireAdmin()

```ts
import { Permission } from "@/generated/prisma/enums";

export async function requirePermission(
  permission: Permission,
  opts?: { requireRestaurant?: boolean }
):
  | { authorized: true; userId: number | null; role: string; restaurantId: number | null; permissions: string[] }
  | { authorized: false; error: string; status: number }
{
  const auth = await requireAuth(opts);
  if (!auth.authorized) return { authorized: false, error: "غير مصرح", status: 401 };
  if (auth.role === "super_admin") return { ...auth, permissions: [] };
  if (auth.role === "sub_admin" && auth.permissions?.includes(permission)) {
    return { ...auth, permissions: auth.permissions };
  }
  return { authorized: false, error: "لا تملك الصلاحية", status: 403 };
}
```

- [ ] Fix requireAdmin() to check for super_admin too

Keep requireAdmin() as-is for routes that need admin-level access but update it to check for super_admin OR sub_admin:

```ts
export async function requireAdmin() {
  const r = await requireAuth();
  if (!r.authorized || (r.role !== "super_admin" && r.role !== "sub_admin")) return { authorized: false } as const;
  return r as { authorized: true; userId: number | null; role: string; restaurantId: number | null };
}
```

- [ ] Commit

```bash
git add src/lib/auth.ts
git commit -m "feat: requirePermission() auth guard + requireAdmin() updated for new roles"
```

---

### Task 3: Update middleware for new roles

**Files:**
- Modify: `middleware.ts`

- [ ] Update admin route guard to accept super_admin | sub_admin

Current middleware line:
```ts
if (pathname.startsWith("/admin") && (!hasAuth || roleCookie !== "admin")) {
```

Change to:
```ts
if (pathname.startsWith("/admin") && (!hasAuth || (roleCookie !== "super_admin" && roleCookie !== "sub_admin" && roleCookie !== "admin"))) {
```

This keeps backward compat with existing "admin" cookie value while adding new roles.

- [ ] Commit

```bash
git add middleware.ts
git commit -m "fix: middleware allow super_admin + sub_admin on /admin routes"
```

---

### Task 4: Build sub-admin invitation API

**Files:**
- Create: `src/app/api/admin/admins/route.ts`

- [ ] Write POST handler (super_admin only — invite)

```ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { Permission, AuditAction } from "@/generated/prisma/enums";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const inviteSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(4).max(100),
  name: z.string().min(1).max(100),
  permissions: z.array(z.nativeEnum(Permission)).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_USERS" as any);
    if (!auth.authorized) return error(auth.error, auth.status);

    // super_admin only for creating admins
    if (auth.role !== "super_admin") return error("غير مصرح", 403);

    const body = inviteSchema.parse(await request.json());

    // Check duplicate username
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) return error("اسم المستخدم موجود مسبقاً", 409);

    const hashed = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: hashed,
        name: body.name,
        role: "sub_admin",
        permissions: body.permissions,
      },
      select: { id: true, username: true, name: true, role: true, permissions: true, createdAt: true },
    });

    await logAudit({
      action: AuditAction.create,
      actorId: auth.userId ?? undefined,
      targetType: "User",
      targetId: user.id,
      metadata: { role: "sub_admin", permissions: body.permissions },
    });

    return success(user);
  } catch (e) {
    return handleError(e);
  }
}

export async function GET() {
  try {
    const auth = await requirePermission("MANAGE_USERS" as any);
    if (!auth.authorized) return error(auth.error, auth.status);

    const admins = await prisma.user.findMany({
      where: { role: { in: ["super_admin", "sub_admin"] } },
      select: { id: true, username: true, name: true, role: true, permissions: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: "desc" },
    });

    return success(admins);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] Commit

```bash
git add src/app/api/admin/admins/route.ts
git commit -m "feat: POST/GET /api/admin/admins — invite & list sub-admins"
```

---

### Task 5: Build sub-admin update/delete/revoke API

**Files:**
- Create: `src/app/api/admin/admins/[id]/route.ts`

- [ ] Write PUT handler (update permissions)

```ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { Permission, AuditAction } from "@/generated/prisma/enums";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  permissions: z.array(z.nativeEnum(Permission)),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission("MANAGE_USERS" as any);
    if (!auth.authorized) return error(auth.error, auth.status);
    if (auth.role !== "super_admin") return error("غير مصرح", 403);

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) return error("Invalid ID", 400);

    const body = updateSchema.parse(await request.json());

    // Don't allow modifying super_admin
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return error("المستخدم غير موجود", 404);
    if (target.role === "super_admin") return error("لا يمكن تعديل مدير عام", 403);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { permissions: body.permissions },
      select: { id: true, username: true, name: true, role: true, permissions: true },
    });

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId ?? undefined,
      targetType: "User",
      targetId: userId,
      metadata: { action: "update_permissions", permissions: body.permissions },
    });

    return success(updated);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission("MANAGE_USERS" as any);
    if (!auth.authorized) return error(auth.error, auth.status);
    if (auth.role !== "super_admin") return error("غير مصرح", 403);

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) return error("Invalid ID", 400);

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return error("المستخدم غير موجود", 404);
    if (target.role === "super_admin") return error("لا يمكن حذف مدير عام", 403);

    await prisma.user.delete({ where: { id: userId } });

    await logAudit({
      action: AuditAction.delete,
      actorId: auth.userId ?? undefined,
      targetType: "User",
      targetId: userId,
    });

    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] Write POST /api/admin/admins/[id]/revoke-sessions handler (same file or separate)

```ts
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission("MANAGE_USERS" as any);
    if (!auth.authorized) return error(auth.error, auth.status);
    if (auth.role !== "super_admin") return error("غير مصرح", 403);

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) return error("Invalid ID", 400);

    const { count } = await prisma.session.deleteMany({ where: { userId } });

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId ?? undefined,
      targetType: "User",
      targetId: userId,
      metadata: { action: "revoke_sessions", deletedCount: count },
    });

    return success({ revokedSessions: count });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] Commit

```bash
git add src/app/api/admin/admins/
git commit -m "feat: PUT/DELETE/POST /api/admin/admins/:id — update, delete, revoke sessions"
```

---

### Task 6: Add permission guards to existing API routes

**Files:**
- Modify: `src/app/api/admin/config/route.ts`
- Modify: `src/app/api/admin/stats/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts` (approve endpoint)
- Modify: `src/app/api/admin/subscriptions/route.ts`
- Modify: `src/app/api/admin/create-owner/route.ts`
- Modify: `src/app/api/users/[id]/route.ts` (delete)
- Modify: `src/app/api/admin/reset-password/route.ts`

For each route, replace `requireAdmin()` with the appropriate `requirePermission()`.

Example for config:
```ts
// Before:
const auth = await requireAdmin();
if (!auth.authorized) return error("غير مصرح", 401);

// After:
const auth = await requirePermission("EDIT_SETTINGS");
if (!auth.authorized) return error(auth.error, auth.status);
```

For stats:
```ts
const auth = await requirePermission("VIEW_ANALYTICS");
if (!auth.authorized) return error(auth.error, auth.status);
```

For orders/approve:
```ts
const auth = await requirePermission("APPROVE_ORDERS");
if (!auth.authorized) return error(auth.error, auth.status);
```

For subscriptions:
```ts
const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
if (!auth.authorized) return error(auth.error, auth.status);
```

For create-owner (MANAGE_RESTAURANTS) and users delete + reset-password (MANAGE_USERS):
```ts
const auth = await requirePermission("MANAGE_RESTAURANTS"); // or MANAGE_USERS
if (!auth.authorized) return error(auth.error, auth.status);
```

- [ ] Commit

```bash
git add src/app/api/admin/config/route.ts src/app/api/admin/stats/route.ts src/app/api/orders/[id]/route.ts src/app/api/admin/subscriptions/route.ts src/app/api/admin/create-owner/route.ts src/app/api/users/[id]/route.ts src/app/api/admin/reset-password/route.ts
git commit -m "feat: permission guards on all sensitive API routes"
```

---

### Task 7: Build /admin/admins UI page

**Files:**
- Create: `src/app/admin/admins/page.tsx`
- Create: `src/app/admin/admins/loading.tsx`
- Create: `src/app/admin/admins/error.tsx`

- [ ] Create loading.tsx

```tsx
export default function Loading() {
  return (
    <div className="space-y-4 animate-fade-in" aria-live="polite">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )
}
```

- [ ] Create error.tsx

```tsx
"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in" aria-live="assertive">
      <AlertCircle className="size-10 text-destructive" />
      <p className="text-lg font-medium">حدث خطأ</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset} className="gap-2">
        <RefreshCw className="size-4" /> إعادة المحاولة
      </Button>
    </div>
  )
}
```

- [ ] Create page.tsx (full admin management page with invite form + admin list)

```tsx
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
  CheckCheck, X, Users, Store, Activity, DollarSign, Settings as SettingsIcon,
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
    } catch {
      premiumToast("error", "فشل إلغاء الجلسات")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await csrfFetch(`/api/admin/admins/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw Error()
      premiumToast("trash", "تم حذف المسؤول")
      setDeleteTarget(null)
      fetchAdmins()
    } catch {
      premiumToast("error", "فشل حذف المسؤول")
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
  const currentUserId = typeof document !== "undefined"
    ? Number(document.cookie.split("; ").find(c => c.startsWith("smart-menu-user-id="))?.split("=")[1])
    : 0

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
            const d = new Date(a.lastLoginAt)
            return d > new Date(Date.now() - 86400000)
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

      {/* Invite Dialog */}
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
              هل أنت متأكد من حذف المسؤول <strong>{deleteTarget?.name}</strong>؟
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
```

- [ ] Commit

```bash
git add src/app/admin/admins/
git commit -m "feat: /admin/admins page — invite, edit permissions, revoke sessions, delete"
```

---

### Task 8: Update sidebar navigation

**Files:**
- Modify: `src/components/layout/AdminSidebar.tsx`

- [ ] Add admins nav item below users

```ts
import { Shield } from "lucide-react"  // add to imports

export const navItems: NavItem[] = [
  // ... existing items
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/admins", label: "المسؤولون", icon: Shield },  // add this
  { href: "/admin/menu", label: "المينيو", icon: UtensilsCrossed },
  // ...
]
```

- [ ] Commit

```bash
git add src/components/layout/AdminSidebar.tsx
git commit -m "feat: add Admins nav item to sidebar"
```

---

### Task 9: Extend SystemConfig with balance/payment categories

**Files:**
- Modify: `src/components/admin/ConfigEditor.tsx`

- [ ] Add new categories to CATEGORIES + CATEGORY_LABELS

```ts
const CATEGORIES = ["general", "features", "limits", "payments", "notifications", "balance", "payment_config", "fees"]

const CATEGORY_LABELS: Record<string, string> = {
  general: "عام",
  features: "الميزات",
  limits: "الحدود",
  payments: "المدفوعات",
  notifications: "الإشعارات",
  balance: "أرقام التحويل",
  payment_config: "إعدادات الدفع",
  fees: "الرسوم",
}
```

- [ ] Commit

```bash
git add src/components/admin/ConfigEditor.tsx
git commit -m "feat: add balance, payment_config, fees categories to ConfigEditor"
```

---

### Task 10: E2E verification — lint + build

- [ ] Run lint

```bash
npm run lint
```

Expected: no errors.

- [ ] Run build

```bash
npm run build
```

Expected: clean build, no warnings, no errors.

- [ ] Commit any remaining fixes

```bash
git add -A
git commit -m "chore: lint + build fixes"
```
