# Smart-Menu — API Route Inventory

> **Hand-maintained inventory, not a spec.** One row per `route.ts` under
> `src/app/api/` (66 routes · 99 exported handlers), grouped by domain.
> Request/response shapes live in the route files as inline Zod schemas — this
> table answers "which methods exist, who may call them, are they throttled".
>
> **Generated:** r119 (commit `b1a1a1a0`, agent B5-D). **Regenerate/verify:**
> ```bash
> find src/app/api -name route.ts | sort          # the route list (66 expected)
> node scripts/check-api-auth.mjs                  # CI-enforced auth classification (PASS = every handler gated)
> rg -n "export (async )?function (GET|POST|PUT|PATCH|DELETE)|requireAuth|requirePermission|createDbRateLimiter" src/app/api/<domain>/...
> ```
> When you add/change a route, update its row in the same commit. Auth classes
> are gate-enforced by `scripts/check-api-auth.mjs` (CI + `verify`); methods
> and limiters are not — this file is the human cross-check.
>
> **Auth ladder:** `public` (no session; each has its own protection) ·
> `session` (cookie OR mobile Bearer; owner routes tenant-scoped) ·
> `permission:NAME` (sub_admin check; super_admin bypasses) ·
> `admin` (super_admin/sub_admin via requireAdmin) ·
> `secret` (CRON_SECRET Bearer, timing-safe, or TELEGRAM_WEBHOOK_SECRET).
> **Responses:** `success`/`error` envelopes from `src/lib/api-helpers.ts`;
> pagination via a `meta{page,totalPages}` object on list endpoints.

## auth (4)

| Method(s) | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| POST | `/api/auth/login` | public | 10/min/IP (exempt from relax) + account throttle + 20/15min username-only backstop | Sets httpOnly session cookie (web) **and** returns Bearer token (mobile); PBKDF2-SHA512 600k |
| POST | `/api/auth/logout` | public | — | Destroys the session **cookie** only — mobile Bearer sessions are not server-revoked (known gap, r119-B2-M) |
| GET | `/api/auth/me` | session | — | Current user + role/permissions/restaurantId |
| POST | `/api/auth/register` | public | 5/min/IP | Public self-registration (owner accounts) |

## orders (3)

| Method(s) | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| GET · POST | `/api/orders` | GET session · POST **public** | POST 30/min/IP + 150/min per-restaurant ceiling (r119 order-flood backstop) · GET 60/min | POST = customer order placement: server-side re-pricing, modifier-group contract, `idempotencyKey`, Arabic 422s. GET = owner/staff tenant-scoped list |
| GET · PUT | `/api/orders/[id]` | session (PUT status change needs `APPROVE_ORDERS`) | 30/min | Order detail + status transitions |
| GET | `/api/orders/count` | session | 120/min | Single COUNT for the owner 5s polling notifier |

## public (9)

| Method(s) | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| GET | `/api/health` | public | 30/min/IP in-memory throttle (r118) | Liveness + DB latency + commitSha; 429 carries no DB signal |
| GET | `/api/plans` | public | — (cached) | Subscription plan catalog |
| GET | `/api/public/featured` | public | — (revalidate 60) | Featured-restaurants showcase |
| GET | `/api/public/menu/[slug]` | public | 60/min/IP before any query (incl. 404 path) | Single round-trip menu payload for the RN app; Next 16 Data Cache 60s + tag purge on owner mutations (r118-B3) |
| GET | `/api/public/stats` | public | — (revalidate 60) | Public aggregates |
| POST | `/api/referrals/claim` | public | 10/min/IP | Referral-code claim |
| POST · GET | `/api/loyalty` | public | 20/min keyed + 60/min IP | Loyalty-card lookup/create by phone; PII stripped for anonymous (r85-A2) |
| GET · POST | `/api/loyalty/referral` | GET public · POST session | GET 20/min · POST 10/min | GET = public referral-code lookup; POST = generate own referral code |
| GET · POST · DELETE | `/api/items/[id]/reviews` | GET/POST public · DELETE owner/staff | POST 5/min/IP + 30/hr per item | Public reviews with a PII ladder (customerName/phone excluded for anonymous); DELETE = owner/staff moderation (r103-F5) |

## owner & menu (18)

| Method(s) | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| GET · POST | `/api/categories` | session (unscoped GET is staff-only, r103-F1; POST needs `MANAGE_RESTAURANTS`) | — | Category CRUD (owner tenant-scoped) |
| PUT · DELETE | `/api/categories/[id]` | session + `MANAGE_RESTAURANTS` | — | Tenant-checked category edit/delete |
| GET · POST | `/api/items` | session (POST needs `MANAGE_RESTAURANTS`) | GET 60/min | Item CRUD; icon/nameAr bounded (r103-F7) |
| GET · PUT · DELETE | `/api/items/[id]` | GET public-read for **available** items (hidden/draft = staff-only, r87-A8) · PUT/DELETE session + `MANAGE_RESTAURANTS` | PUT 20/min | Modifier groups/options cascade with the item |
| GET · POST | `/api/restaurants` | GET session (staff `VIEW_ANALYTICS`) · POST public self-registration (with username+password) or `MANAGE_RESTAURANTS` | POST 5/min/IP | r92-B3 verb split: only POST is public; reserved-slug 409s |
| GET · PUT · DELETE | `/api/restaurants/[id]` | session (owner-of-record / staff; sub_admin needs `VIEW_ANALYTICS` for the full-detail branch) | GET 60/min | Full detail vs public projection PII ladder (r87-A5); DELETE has-orders guard 409 (r118-B2) |
| GET · POST | `/api/owner/restaurants` | session | — | The owner's own multi-menu list/create (`UserRestaurant` links, r118) |
| PATCH · DELETE | `/api/owner/restaurants/[id]` | session | — | Manage a linked restaurant (multi-menu) |
| GET | `/api/owner/reviews` | session (`requireRestaurant`) | — | Reviews across the owner's restaurants |
| GET · PUT | `/api/settings` | session + `MANAGE_RESTAURANTS` branch | — | Restaurant settings (whatsapp, branding) |
| GET | `/api/stats` | session (tenant-scoped) | 120/min | Owner dashboard KPIs |
| GET | `/api/stats/advanced` | session | 120/min | 7-day revenue, top items, hourly distribution |
| POST | `/api/loyalty/redeem` | session | 20/min | Counter-side points redemption |
| GET | `/api/loyalty/stats` | session | 20/min | Owner loyalty-program stats |
| GET | `/api/user/events` | session | 120/min | 15s user-banner polling events |
| POST | `/api/upload` | session | 5/min | Vercel Blob upload: 5MB pre-guard, AVIF/type bounds, no path traversal |
| POST | `/api/whatsapp/generate` | session | 20/min (exempt from relax) | Server-side WhatsApp order link/invoice text |
| POST | `/api/demo/fix-images` | session | — | Demo-data image repair utility (r96) |

## subscriptions (4)

| Method(s) | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| POST | `/api/subscriptions` | session | 5/min | Subscribe request (plan + restaurant) → Telegram approval flow |
| GET | `/api/subscriptions/status` | session | — | Current subscription state |
| POST | `/api/subscriptions/upgrade` | session | 5/min | Plan upgrade request |
| POST | `/api/subscriptions/validate` | public (optional session for own-username check, r103-F3) | 10/min | Wizard availability check (username/slug) |

## admin (16)

| Method(s) | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| GET · POST | `/api/admin/admins` | `MANAGE_USERS` | — | Sub_admin management |
| PUT · DELETE · POST | `/api/admin/admins/[id]` | `MANAGE_USERS` (POST = super_admin only) | — | PUT/DELETE edit/remove a sub_admin; POST force-logout (wipe sessions) |
| GET | `/api/admin/audit-logs` | admin (requireAdmin) | 30/min | Audit-trail reader |
| GET · PUT · DELETE | `/api/admin/config` | `EDIT_SETTINGS` | — | Encrypted SystemConfig (bot token AES-GCM at rest) |
| POST | `/api/admin/create-owner` | `MANAGE_RESTAURANTS` | — | Admin-side owner + restaurant provisioning |
| POST | `/api/admin/events/trigger` | `EDIT_SETTINGS` | — | Manual SystemEvent trigger (test tooling) |
| GET · PUT | `/api/admin/notification-preferences` | `EDIT_SETTINGS` | — | Admin notification matrix |
| GET · PUT | `/api/admin/profile` | `EDIT_SETTINGS` | — | Own admin profile |
| POST | `/api/admin/reset-password` | `MANAGE_USERS` | 5/min | Admin password reset |
| GET | `/api/admin/stats` | `VIEW_ANALYTICS` | — | Platform-wide statistics |
| GET · POST | `/api/admin/subscriptions` | `MANAGE_SUBSCRIPTIONS` | — | Subscription management |
| GET · POST · PUT · DELETE | `/api/admin/system-events` | `VIEW_ANALYTICS` (r86-A8, was requireAdmin) | — | System-event console |
| GET | `/api/users` | session (staff only; sub_admin needs `MANAGE_USERS`, r103-F6) | — | User list (401 unauth / 403 non-staff) |
| PATCH · DELETE | `/api/users/[id]` | `MANAGE_USERS` | — | PATCH super_admin-target guard (r118-B2); DELETE last-owner concerns (S7 r119) |
| GET | `/api/config` | `EDIT_SETTINGS` | — | Config read for the admin UI (tokens masked, r118-B4 tests) |
| POST | `/api/seed` | admin + `ALLOW_SEED=true` in production | — | Dev seeding only; 404 in production unless allowed |

## telegram (10)

| Method(s) | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| POST | `/api/telegram/webhook` | secret (TELEGRAM_WEBHOOK_SECRET, timing-safe) | 120/30s **fail-open** (r119-B1: DB outage must not 429 Telegram into redelivery storms) | The bot itself: payment approvals, `/start verify_`, broadcasts; `maxDuration: 15` |
| GET · POST | `/api/telegram/config` | `EDIT_SETTINGS` | — | Bot config CRUD |
| POST | `/api/telegram/test` | `EDIT_SETTINGS` | — | Send a test message |
| GET | `/api/telegram/diagnose` | `EDIT_SETTINGS` | — | Bot health diagnostics (GET has mild side effects — S8 r119) |
| GET · POST | `/api/telegram/broadcast-targets` | `EDIT_SETTINGS` | — | Broadcast group targets |
| PATCH · DELETE | `/api/telegram/broadcast-targets/[id]` | `EDIT_SETTINGS` | — | Target management |
| GET · POST | `/api/admin/telegram/approvers` | GET `EDIT_SETTINGS` · POST `MANAGE_SUBSCRIPTIONS` (r118-B1) | — | Approver list; webhook self-approval guard |
| DELETE | `/api/admin/telegram/approvers/[id]` | `MANAGE_SUBSCRIPTIONS` (r118-B1) | — | Remove an approver |
| POST | `/api/admin/telegram/link` | `EDIT_SETTINGS` | — | Generate the bot link for an approver |
| POST | `/api/admin/telegram/verify` | `EDIT_SETTINGS` | — | Verify an approver chat |

## cron (2)

| Method(s) | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| GET | `/api/cron/cleanup` | secret (CRON_SECRET Bearer, timing-safe) | — | Vercel cron Sun 03:00 UTC — retention purge (sessions 7d / audit 90d / events 180d / rate-limit 1h) |
| GET | `/api/cron/subscription-expiry` | secret (CRON_SECRET Bearer) | — | Vercel cron daily 01:00 UTC — expire subscriptions |
