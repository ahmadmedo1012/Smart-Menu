# Database Schema Report

Generated: 2026-06-22

## Overview

Smart Menu uses Prisma ORM with PostgreSQL. Schema located at `prisma/schema.prisma`.
Generated client output: `src/generated/prisma/`.

**15 models**, **8 enums**, **28 indexes** (including unique constraints).

---

## Models

| Model | Table | Key Fields | Relations |
|-------|-------|-----------|-----------|
| User | admin/system users | id, username (unique), role, restaurantId, planId | ->Restaurant, ->SubscriptionPlan, ->AuditLog[] |
| SubscriptionPlan | plan definitions | id, name (unique), price, periodDays, maxMenus/Items/Orders | ->Restaurant[], ->User[] |
| Restaurant | restaurants | id, slug (unique), planId | ->User[], ->MenuCategory[], ->Order[], ->Setting[], ->LoyaltyCard[], ->Referral[], ->RewardTransaction[], ->WhatsappTemplate[] |
| MenuCategory | menu sections | id, restaurantId | ->MenuItem[], ->Restaurant |
| MenuItem | menu items | id, categoryId | ->OrderItem[], ->MenuCategory |
| Order | customer orders | id, orderNo (unique), restaurantId, status | ->OrderItem[], ->Referral[], ->RewardTransaction[], ->Restaurant |
| OrderItem | order line items | id, orderId, itemId | ->Order, ->MenuItem |
| Setting | config key-value pairs | id, @@unique(restaurantId, key) | ->Restaurant |
| TelegramConfig | Telegram bot config | id, botToken, chatId, events (JSON), isActive | (standalone — no relations) |
| WhatsappTemplate | WhatsApp msg templates | id, @@unique(restaurantId, name) | ->Restaurant |
| LoyaltyCard | loyalty program cards | id, referralCode (unique), @@unique(customerPhone, restaurantId) | ->Referral[], ->RewardTransaction[], ->Restaurant |
| Referral | referral tracking | id, referralCode, referrerId, status, orderId | ->LoyaltyCard (referrer), ->Order, ->Restaurant |
| RewardTransaction | loyalty points ledger | id, cardId, type (earn/redeem), points, orderId | ->LoyaltyCard, ->Order, ->Restaurant |
| AuditLog | admin action audit trail | id, action, actorId, targetType, targetId, metadata (JSON), ip | ->User |
| SystemEvent | platform events | id, eventType, title, message, severity, read | (standalone — no relations) |

## Enums

Role, ItemStatus, OrderStatus, PickupType, LoyaltyTier, ReferralStatus, RewardType, AuditAction

---

## New Models — Validation

### AuditLog (OK)
- `actorId: Int?` + `actor: User?` with `onDelete: SetNull` — correct nullable foreign key
- `targetType: String` / `targetId: Int?` — generic polymorphic reference pattern
- Indexes on actorId, action, targetType+targetId, createdAt — all appropriate for admin audit queries

### SystemEvent (OK)
- `severity: String` (not enum) — flexible, allows custom severity levels without migration
- Indexes on eventType, createdAt, read — good coverage for common query patterns
- No relations needed — standalone platform event log

### TelegramConfig (Issues — see below)

---

## Findings

### 1. TelegramConfig — Missing foreign key / scoping

TelegramConfig has no `restaurantId` column — it is a singleton config. If per-restaurant Telegram
bot configuration is needed, add:

```
restaurantId Int?
restaurant   Restaurant? @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
@@unique([restaurantId])
```

If singleton is intended, document in code that only row id=1 is read.

### 2. TelegramConfig — Missing indexes

No indexes defined. If querying by `isActive`, add:
```
@@index([isActive])
```

### 3. Redundant indexes (duplicate btree)

The following cascading indexes are redundant because the leading column already has an index
(via unique constraint or standalone index):

| Model | Redundant Index | Covered By |
|-------|----------------|------------|
| WhatsappTemplate | `@@index([restaurantId])` | `@@unique([restaurantId, name])` |
| LoyaltyCard | `@@index([restaurantId])` | `@@unique([customerPhone, restaurantId])` |
| Referral | `@@index([referrerId])` | `@@index([referrerId, status])` |

These are minor (Postgres deduplicates btree indexes at storage level), but a `npx prisma db push`
will attempt to create redundant indexes. Consider removing the standalone indexes for tidiness.

### 4. Suggested additional indexes

| Model | Suggested Index | Rationale |
|-------|----------------|-----------|
| AuditLog | `@@index([actorId, createdAt])` | Admin views "user's recent actions" |
| SystemEvent | `@@index([eventType, severity])` | Filtering by event type + severity |
| SystemEvent | `@@index([severity])` | High-severity alert queries |

### 5. Seed.ts compatibility

`prisma/seed.ts` uses all existing models (pre-dating AuditLog/SystemEvent/TelegramConfig) and
does not reference the three new models. It compiles against the generated client. All reported
compilation errors originate from `node_modules/@prisma/adapter-pg` and
`node_modules/@prisma/client-runtime-utils` (private identifiers, ES module default export),
not from seed code or schema changes.

---

## Summary

- **15 models** defined — schema is well-structured
- **3 new models** (AuditLog, SystemEvent, TelegramConfig) present in schema and generated client
- **2 minor issues**: TelegramConfig missing restaurantId scope + indexes; 3 redundant indexes
- **Suggested indexes**: 3 additional for audit log and system event query performance
