# S7 — Data/DB Deep Audit (r119)

Agent S7 · READ-ONLY (no repo files modified, no production data touched, no commits).
Repo: `/home/z/my-project/repos/Smart-Menu` @ HEAD `92611477`.
Scope: indexes vs query reality, constraint completeness, migration drift, git-history secrets, LIVE data integrity (public API only), Decimal handling, rate-limit/session growth, connection management, QA-purge tooling.
Prior r118-B1 (modifiersJson snapshot) / B2 (restaurant delete guard) / IDOR matrix — NOT re-reported; DB-level implications of B2 are new analysis.

Verification environment note: all benchmarks run on a LOCAL scratch Postgres 16 (`scripts/pg-local-start.sh` stack, port 5434) seeded with synthetic data — never production. `prisma migrate diff` used a local shadow DB.

---

## P1 — Destructive QA-cleanup tooling (dormant, prod-targeted)

**P1-1. `scripts/qa-cleanup-check.mjs` will delete REAL restaurants + their order history on false-positive substring matches.**
- Evidence: `scripts/qa-cleanup-check.mjs:17-30` — matchers are `username ILIKE '%qa%'` / `slug ILIKE '%qa%' OR name ILIKE '%qa%'` (needles `['qa','bank','wallet','p3-cafe','p1-']`), and lines 53-64 delete `UserRestaurant` → **`Order` (all orders of the matched restaurant)** → `Restaurant` → `User`, in one transaction, no dry-run, no confirmation, no backup, no audit rows, no protected-slug allowlist.
- Why `%qa%` is dangerous on THIS platform: Arabic transliteration `qahwa` (قهوة = coffee — the most common Libyan café name stem, cf. live `al-waha-cafe` "مقهى الواحة") contains `qa`; any `al-qahwa-*` restaurant would be matched and its **financial order history wiped** — exactly what r118-B2's 409 ("يُحتفظ بسجل الطلبات لأغراض المحاسبة", `src/app/api/restaurants/[id]/route.ts:279`) exists to prevent. The script also bypasses the B2 guard and its audit rows entirely (direct SQL).
- Also: line 29 builds SQL by string interpolation (needles are constants today, but the pattern invites injection the moment a CLI arg feeds it).
- Fix: do not run as-is; replace with the safe design in §QA-purge (below) — dry-run default, anchored regex prefixes (`^(sim\d+-|qa-|p\d+-|test-|e2e-)`), protected-slug allowlist (`al-waha-cafe-demo`), row caps, JSONL backup, post-purge AuditLog row.

No other P1 found in the data layer.

---

## P2 — Constraint / integrity risks

**P2-1. `Order.restaurant` is `onDelete: Cascade` — DB level contradicts the accounting-retention stance.**
- `prisma/schema.prisma:197` — `restaurant Restaurant @relation(..., onDelete: Cascade)`. The API 409 (B2, `src/app/api/restaurants/[id]/route.ts:277-280`) only guards non-super_admin callers; the super_admin path (and ANY direct SQL delete, incl. P1-1's script) silently cascade-deletes orders → order items → (Referral/RewardTransaction `orderId` SetNull) → loyalty cards → categories → items. Financial history destroyed in one statement.
- Fix (schema): `onDelete: Restrict` on `Order.restaurant` (keeps `MenuItem→OrderItem Restrict`, `schema.prisma:251`, `Review Restrict`, :514, consistent). Super_admin tenant-purge then becomes an explicit, audited two-step (orders exported/archived, then restaurant deleted) instead of an implicit cascade. Pair with an `archivedAt DateTime?` soft-delete column if hard delete must remain one-click.
- Note (verified, no action): the dual cascade paths (Order→OrderItem **and** Category→MenuItem with OrderItem Restrict) currently resolve without orphans — measured in r93 (`restaurants/[id]/route.ts:282-288` comment) — but the resolution order is not contractual across PG versions; the explicit `review.deleteMany` there was needed precisely because of this class.

**P2-2. User DELETE can orphan a restaurant (zero managing users) — no last-owner guard.**
- `src/app/api/users/[id]/route.ts:114-148`: `prisma.user.delete` runs after only a super_admin-target check. `UserRestaurant` rows cascade (`schema.prisma:56-57`), `User.restaurantId` SetNull (:37). If the deleted user was the sole owner/manager of a restaurant, that restaurant becomes unmanageable (no login path to it) while still public/active.
- Sessions cascade (`schema.prisma:438`), `AuditLog.actor` SetNull (optional default, :424), `SubscriptionPayment.user` SetNull (:463) — audit + financial rows correctly survive. Orders are anonymous by design (no userId FK) — no orphan risk there.
- Fix: in the DELETE handler, count `UserRestaurant` per owned restaurant; block (409) or require `transferTo` reassignment when the user is the last manager. App-level guard; not expressible as a DB constraint.

**P2-3. Known-password QA accounts are committed in the repo and were registered on production.**
- `scripts/archive/r95-prod-sim-owner.mjs:22-24` — `OWNER = 'sim95-<ts>'`, `PASSWORD = 'Sim95#Pass95'`, `BASE = 'https://menu.smart-link.ly'` (prod). Also `scripts/archive/r92-team8-probe.cjs:15` (`waha123456`), `scripts/r97-admin-pass.mjs:2` (`SEED_ADMIN_PASS=smart123`). Any residual `sim95-*` / probe accounts on prod have public, git-history passwords.
- Fix: fold into the QA-purge tooling (§below) — delete `sim\d+-*` users + their restaurants; rotate `smart123`-seeded admin creds if any prod admin still uses them; stop hardcoding passwords in committed prod-sim scripts (use env + print-once).

---

## P3 — Measured index gaps (with benchmark evidence)

**P3-1. `AuditLog` lacks a composite `[action, createdAt]` for the admin audit-log list (filter + sort).**
- Query: `src/app/api/admin/audit-logs/route.ts:54-65` — `findMany({ where: { action }, orderBy: { createdAt: 'desc' }, skip/take })` + `count({ where: { action } })`.
- Schema has `[actorId]`, `[action]`, `[targetType, targetId]`, `[createdAt]` separately (`prisma/schema.prisma:426-429`) — no action+createdAt composite.
- Measured (local PG16, 200k AuditLog rows ≈ realistic 90-day volume for 742 users with every login audited): worst case (rare action, old rows) **28.3 ms / 70,289 buffers** — backward scan of `AuditLog_createdAt_idx` filtering 199,499 rows — vs **0.05 ms / 10 buffers** with `CREATE INDEX (action, "createdAt" DESC)` → **566× faster, 7,000× fewer buffer reads**. On Neon autosuspend this exact shape is a cold-start + seq-scan amplification.
- Fix: `@@index([action, createdAt])` on AuditLog (btree backward scan covers DESC; no need for a DESC-decorated SQL index).

**P3-2. QA debris scale on production (285 restaurants, 5 public).**
- Curl evidence (2026-09-21): `GET /api/public/stats` → `{"totalRestaurants":285,"totalUsers":742}` while the sitemap lists only 5 menu slugs (al-aseel, pizza-roma, al-waha-cafeewewe, al-waha-cafe, al-waha-cafe-demo). ~280 restaurants are inactive/not shown — a large fraction is expected to be e2e/sim debris (`sim\d+-`, `p1_`, `p3-`, `qa-` families) per the historical BEFORE-output of `qa-cleanup-check.mjs` and the r95/r96/r93 prod-sim scripts.
- Fix: run the (fixed) purge tool in dry-run to quantify, then execute (§QA-purge). No action taken in this audit.

**P3-3. `MenuItem` lacks `[categoryId, sortOrder]` — global item lists sort on every page.**
- Queries: staff cross-restaurant list `src/app/api/items/route.ts:157-174` (`where {}`, `orderBy: { sortOrder: 'asc' }`, skip/take → full sort each page) and the public/owner per-restaurant list (:127 relation filter + `orderBy sortOrder`); public menu `src/app/api/public/menu/[slug]/route.ts:76-78` (same, but cached 60s).
- Measured (local, 100k items, 10 categories/restaurant): **135.6 ms / 17,361 buffers + 11.6 MB external-merge sort** for the relation-filtered ordered scan. Real-world impact is bounded by plan caps (`maxItems` default 50, `schema.prisma:105`) — per-restaurant sorts are trivial today; the unbounded one is the staff list.
- Fix: `@@index([categoryId, sortOrder])` on MenuItem (cheap, future-proofs the staff list and gives the public menu an ordered index scan per category). Lower urgency than P3-1.

---

## P4 — Minor / informational

- **P4-1. `User` filters without composite support**: users list (`src/app/api/users/route.ts:33-64`) filters `role` + optional `restaurantId`, orders by `createdAt desc` — only single-column `[role]`, `[createdAt]` exist (`schema.prisma:40-45`). 742 rows → negligible; add `@@index([role, createdAt])` only if the users table grows 100×.
- **P4-2. `telegramChatId` has no index** — but grep shows it is only used in `not: null` filters (`src/lib/telegram-broadcast.ts:63`, `telegram/diagnose/route.ts:66`) and relation includes, never as a lookup key; 742-row seq scan is free. No fix needed (documented to prevent a future "missing index" false alarm).
- **P4-3. `AuditLog` search (`ip`/`targetType` `contains`, audit-logs:47-52) is a seq scan** — btree can't serve `ILIKE %x%`; a pg_trgm GIN index would, but the table is 90-day-bounded and the route is super_admin + 30/min rate-limited. Accept as-is.
- **P4-4. `Restaurant.planEnd` unindexed** — used only by the daily 01:00 expiry cron (`src/app/api/cron/subscription-expiry/route.ts:26-34`) against 285 rows. Fine.
- **P4-5. Live data anomaly — `al-waha-cafe` contact mismatch**: phone `+218911111111` but whatsapp `218910089975` (curl `/api/public/menu/al-waha-cafe`) — the whatsapp value looks like a digit-mash of the demo number `0910089975` (+`1`). Content fix by the owner; no schema issue.
- **P4-6. `/api/public/stats` discloses platform totals** (285 restaurants / 742 users) anonymously. Business-info disclosure, low severity; consider gating or rounding.
- **P4-7. `TelegramConfig` singleton is enforced by convention only** (no constraint preventing a second row) — `schema.prisma:271-279`. All readers take `findFirst`; harmless today.
- **P4-8. `Session.token` stores SHA-256(token)** not the raw token (`src/lib/session.ts:19-38`) — good practice, kept as a positive finding. `maxDuration`/cron coverage in `vercel.json:2-10` (cleanup weekly 03:00 Sun, expiry daily 01:00) is valid on both Vercel plans.

---

## Verified-clean (explicit non-findings, with evidence)

1. **Hot-query ↔ index matrix — all covered except P3-1/P3-3 above:**
   - Orders by restaurant+status+date: `@@index([restaurantId, status, createdAt])` + `[restaurantId, createdAt]` (`schema.prisma:202-208`) ↔ `orders/route.ts:118-152`; revenue aggregate (`stats-queries.ts:186-213`) hits `[restaurantId, createdAt]`.
   - Categories by restaurant: `[restaurantId, isActive, sortOrder]` (`schema.prisma:139`).
   - Users by username: `@unique` (:12) ↔ login. **Email is never a WHERE key** (display-only) — no index warranted (and `@default("")` makes uniqueness impossible).
   - Sessions: `token @unique` + `[userId]` + `[expiresAt]` (:435-443) ↔ `session.ts` validate/cleanup (per-user trim sorts ≤5 rows — free).
   - RateLimitEntry: `@@unique([key, windowEnd])` + `[windowEnd]` (:502-503) ↔ upsert + sweep.
   - Loyalty: `@@unique([customerPhone, restaurantId])`, `referralCode @unique` (:332-323) ↔ `loyalty/route.ts:58-67,119-123`.
   - Referral/RewardTransaction/SubscriptionPayment money-path lookups: all composites present incl. round89 `[orderId]` idempotency gates (:360,:408) and the round93 partial unique (SQL-only, `zz_round93_pending_payment_scope/migration.sql:41`).
   - SystemEvent: `[eventType]`, `[createdAt]`, `[read]` + the SQL-only expression index `SystemEvent_userId_idx` (`20260906043248_add_round88_indexes/migration.sql:28`) serving the 15s `/api/user/events` poll.
   - List `_count` aggregates already replaced by grouped index-only counts (`src/lib/list-counts.ts:28-64`).
2. **Migration drift: NONE.** `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma` (Prisma 7.8, shadow DB via `prisma.config.ts`) → **"No difference detected"**; and `prisma migrate deploy` onto a fresh local PG16 → **"All migrations have been successfully applied"** (full chain replays — no P3009). History is genuine and incremental (`0_init` → 30 dirs incl. `0_zz_replayability_prereq` + `11_replay_parity`), NOT squashed. The only "drift" is the two documented, deliberate non-datamodel indexes (round88 expression idx, round93 partial unique) which `migrate diff` provably ignores.
3. **Git-history secrets: nothing NEW beyond the known Neon URL.** Commit `2f40b35d` (2026-06-29) added `.env`, `.env.local`, `.env.development`, `.env.prod` — verified by length/shape analysis (values never printed): `.env` DATABASE_URL is a `user:pass@host:5432/db` **template** (host literally `host`); `.env.prod` DATABASE_URL = `""`; AUTH_SECRET = `""`; VERCEL_OIDC_TOKEN = `""` in both files. Files untracked at `6696ac6b` (2026-07-04) but harmless in history. Whole-history scan for `postgres://…@…` found only: localhost/127.0.0.1 dev DBs, doc placeholders (`ep-xxx.neon.tech`, `ep-host.region…`), and the ONE known `neondb_owner@ep-…-pooler.…neon.tech` URL (known class, user-rotating — MASKED here). `docker-compose.yml` (history) contains no credentials (sqlite placeholder). Hex-looking `CRON_SECRET`/`JWT_SECRET` values in history are `.env.example` documentation values with matching length floors (commit `c1c9d9e2`), not real secrets. 92 bcrypt/PBKDF2 mentions are test fixtures. ⚠ Caveat: QA passwords (P2-3) ARE real and committed.
4. **LIVE data integrity (curl https://menu.smart-link.ly, 2026-09-21):** all 5 public menus HTTP 200 (0.31–0.46s). **Zero** zero/negative prices, **zero** >1000 LYD outliers, **zero** `discountedPrice > price`, **zero** empty categories across al-aseel(5 items), pizza-roma(5), al-waha-cafe(16), al-waha-cafeewewe(6), al-waha-cafe-demo(25). Image HEAD-check of all 57 unique URLs: **only the 3 KNOWN dead unsplash images on al-aseel return 404; every other image is alive** (pizza-roma 5/5, al-waha-cafe 14/14, cafeewewe 1/1, all `/demo/*.webp` 200). Duplicate scan: only the KNOWN `al-waha-cafeewewe` (same name «مقهى الواحة», same phone as demo); **no other duplicate pairs**.
5. **Decimal handling: correct.** All money is `Decimal(10,2)` (MenuItem.price/discountedPrice, Order.subtotal/discount/total, OrderItem.price, SubscriptionPlan.price, SubscriptionPayment.amount, LoyaltyCard.totalSpent, ModifierOption.priceDelta) — 2-dp LYD exact, max 99,999,999.99. `avgRating Decimal(3,2)` covers 0–9.99 (ratings 0–5). `quantity Int` + `z.number().int().positive().max(99)` (`orders/route.ts:32`, `MAX_ITEM_QUANTITY=99` in `src/lib/constants.ts:8`) — **fractional qty rejected at API and schema level**. Adapter returns Decimal as string; `db.ts:7-23` `$extends` converts via `Number()` with a MAX_SAFE_INTEGER guard + warn — lossless for these precisions.
6. **modifiersJson typed as String: correct as-is.** It is an order-time snapshot (r118-B1); `parseStoredModifiers` (`src/lib/order-modifiers.ts:139-169`) is defensive (try/catch, array check, dual legacy-id/snapshot format). TEXT is fine for an immutable blob that is never queried; JSONB would add validation but no query benefit. No change.
7. **Retention coverage — all operational tables bounded:** Session 7d-past-expiry (`cron/cleanup/route.ts:22-26`) + absolute 7d cap + 5/user cap (`session.ts:14-15`); AuditLog 90d (:36-40); SystemEvent 180d (:55-64); RateLimitEntry 1h-threshold weekly net (:82-93) + probabilistic sweep 1/32, 512/batch (`rate-limit.ts:17-21`). Order/OrderItem/SubscriptionPayment unbounded **by design** (financial) — acceptable, but see P2-1 for the delete-side risk.
8. **Rate-limit + session growth model (1k active users/month):** key spaces are per-IP (public limiters) and per-session/user (authenticated limiters) — no unbounded single-user key (idempotency keys cap at 40 chars in orderNo, `orders/route.ts:322-324`). Steady-state rows ≈ distinct-keys-active-per-hour × windows/hour; for 1k users ≈ 300 concurrently-active/hr × ~10–50 limiter rows each ≈ 3k–15k live rows at any moment (sweep + 1h retention keep it flat; churn ~10⁵–10⁶ rows/month is delete-heavy but batched). Sessions: hard-capped at 5 rows/user → ≤5k rows for 1k users. **No bloat risk.**
9. **Connection management: optimal for this stack — no change.** Prisma 7.8 **driver-adapter mode** (`@prisma/adapter-pg` + `pg.Pool`, `db.ts:29-58`), not Accelerate (correct: Accelerate adds a hop/cost and the app needs interactive `$transaction`, which HTTP adapters don't support). Neon **-pooler** endpoint (PgBouncer) confirmed in the known URL's host; `pg` uses unnamed prepared statements → transaction-mode-pooler-safe. Pool: max 5 on Vercel/remote-Neon (vs Neon's pooled-endpoint capacity), `connectionTimeoutMillis 10s`, `idleTimeoutMillis 30s`, `maxUses 1000`, `statement_timeout 15s` (:42-48) — all good serverless hygiene. Cold-start: Neon autosuspend handled by the r97 hourly keep-alive + `migrate-deploy.mjs` transient-retry wrapper (P1001-class). `withRetry` (:133-148) covers 40001/40P01/57014/connection-class errors. Only suggestion (optional): set `DATABASE_POOL_MAX` awareness note in README — already documented in-code.

---

## QA-order purge tooling — proposed design (NOT executed)

Replaces `scripts/qa-cleanup-check.mjs` (P1-1). Name: `scripts/qa-purge.mjs`.

1. **Dry-run default.** `node scripts/qa-purge.mjs` only prints candidates + counts. `--execute` required, plus interactive confirmation typing the exact number of restaurants to be deleted.
2. **Anchored allowlist patterns, never substrings:** restaurant slug / username must fully match `^(sim\d{2,}-|qa[-_]|p\d+[-_]|test-|e2e-|round\d+-)`. A protected-slug allowlist (`al-waha-cafe-demo`, the 4 real public slugs) is checked BEFORE matching and aborts if any pattern would touch it.
3. **QA-order identification** (order creation writes NO audit rows — verified `orders/route.ts` has no `logAudit`; so audit-log-based identification is impossible by design — use): (a) orders whose `restaurantId` ∈ matched QA restaurants; (b) otherwise-real restaurants: `customerName`/`customerPhone` ∈ e2e fixture sets (`QA `, `اختبار`, `09100000000`-style) OR `orderNo` derived from idempotency keys matching the QA prefixes (`ORD-<KEY>` uppercased, `orders/route.ts:322-324`) — listed for human review, deleted only with `--orders-too`.
4. **Backup before delete:** full JSONL export (order + items incl. `modifiersJson` snapshots + referral/reward rows referencing them) to `audit/qa-purge/<ISO-timestamp>.jsonl`.
5. **FK-safe order of operations (relies on existing constraints):** export → `DELETE FROM "Order" WHERE …` (cascades OrderItem; SetNulls Referral.orderId / RewardTransaction.orderId) → delete QA restaurants (categories/items/loyalty cascade; explicit `Review` deleteMany first, mirroring `restaurants/[id]/route.ts:289-293` since Review is Restrict) → delete QA users (sessions cascade; AuditLog/SubscriptionPayment SetNull) → re-count and assert delta == deleted, else rollback.
6. **Safety caps:** refuse > 500 rows of any table without `--force`; refuse any restaurant with `planId IS NOT NULL AND planEnd > now()` (a paying customer is never QA debris).
7. **Post-purge audit trail:** insert an `AuditLog` row (action `delete`, targetType `qa-purge`, metadata {counts, backupPath, patterns, dryRun:false}) — the current script leaves none.
8. **User cleanup ordering:** delete users AFTER restaurants so `UserRestaurant` cascades don't leave dangling links; also sweep `sim\d+-` sessions implicitly (cascade) and any `Setting`/`WhatsappTemplate` rows die with the restaurant cascade.

---

## Top-3 schema changes (concrete)

1. `model AuditLog { @@index([action, createdAt]) }` — P3-1, measured 566× worst-case win on the super-admin audit list.
2. `model Order { restaurant Restaurant @relation(..., onDelete: Restrict) }` — P2-1, makes the DB agree with the API's "orders are accounting records" stance; super_admin purge becomes explicit + audited.
3. `model MenuItem { @@index([categoryId, sortOrder]) }` — P3-3, ordered index scans for public menu + owner editor + staff cross-restaurant list (future-proofing; 11.6 MB sort eliminated at 100k items).

(+ app-level: last-owner guard in `users/[id]` DELETE — P2-2.)

## Priority summary

| ID | Finding | Sev | Effort |
|----|---------|-----|--------|
| P1-1 | qa-cleanup-check.mjs substring-match mass delete | P1 (dormant tool) | S |
| P2-1 | Order→Restaurant DB cascade vs accounting stance | P2 | M |
| P2-2 | User DELETE can orphan restaurants | P2 | S |
| P2-3 | Committed prod QA passwords (sim95-*/waha123456/smart123) | P2 | S |
| P3-1 | AuditLog [action, createdAt] composite | P3 (measured) | XS |
| P3-2 | ~280 non-public restaurants on prod — quantify via dry-run | P3 | M |
| P3-3 | MenuItem [categoryId, sortOrder] | P3 | XS |
| P4-1..8 | minor/informational | P4 | — |

**Live-data verdict: production data is clean** — sane prices, no empty categories, no new dead images, no new duplicates; only the 3 known al-aseel unsplash 404s and the known cafeewewe duplicate (both previously reported).
