# RBAC & Dynamic Settings Overhaul — Design Spec

> **Status:** Approved  
> **Date:** 2026-07-02

## Overview

Upgrade Smart Menu admin dashboard with hierarchical RBAC (super_admin/sub_admin),
permission-based API guards, sub-admin invitation/management UI, and extended SystemConfig
categories for balance transfer numbers and payment configuration.

## Prisma Schema

### Role Enum
```prisma
enum Role {
  super_admin
  sub_admin
  owner
}
```

### Permission Enum
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

### User Model — Added Field
```prisma
permissions  Permission[] @default([])
```
Postgres native TEXT[] array. Simple, readable, no bitwise needed.

## Authorization Architecture

Two-layer protection:

1. **Middleware** — route-level role check on `/admin/*` (super_admin or sub_admin allowed)
2. **Server Action/API** — `requirePermission(perm)` checks per endpoint

### requirePermission() Logic
- `super_admin` → bypass all permission checks
- `sub_admin` → check `user.permissions.includes(perm)`
- others → 401/403

## API Endpoints

| Method | Path | Required Permission |
|--------|------|-------------------|
| GET | /api/admin/config | super_admin |
| PUT | /api/admin/config | EDIT_SETTINGS |
| DELETE | /api/admin/config | EDIT_SETTINGS |
| GET | /api/admin/stats | VIEW_ANALYTICS |
| POST | /api/admin/admins | super_admin only |
| PUT | /api/admin/admins/:id | super_admin only |
| DELETE | /api/admin/admins/:id | super_admin only |
| POST | /api/orders/:id/approve | APPROVE_ORDERS |
| POST | /api/admin/subscriptions/* | MANAGE_SUBSCRIPTIONS |
| POST | /api/admin/create-owner | MANAGE_RESTAURANTS |
| DELETE | /api/users/:id | MANAGE_USERS |
| POST | /api/admin/reset-password | MANAGE_USERS |

## UI Pages

### /admin/admins — Sub-Admin Management
- Invite form: username, temp password, permission toggle cards
- Active sub-admins list with permission badges
- Edit permissions sheet (same toggle cards)
- Revoke sessions + delete actions

### Updated /admin/users
- Hide delete button for admins (owner-only or super_admin)
- Show permission column for sub-admin accounts

### Extended /admin/settings → ConfigEditor
- New categories: `balance`, `payment_config`
- Balance transfer number fields (multiple phone numbers)
- System fee ratio, support contacts, threshold params

## Data Flow

Sub-admin invite:
1. Super admin fills form with username + permissions
2. POST /api/admin/admins creates User with role=sub_admin
3. AuditLog entry created
4. UI refreshes list

Permission check:
1. Client calls API
2. requirePermission() runs in route handler
3. If denied → 403 JSON response
4. Client shows toast "لا تملك الصلاحية"

Settings update:
1. Super admin or sub_admin with EDIT_SETTINGS changes value
2. PUT /api/admin/config upserts SystemConfig row
3. revalidateTag("system-config") invalidates cache
4. All client instances pick up new value on next fetch
