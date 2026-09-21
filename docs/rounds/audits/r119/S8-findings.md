# S8 — API Contract & Error-Quality Consistency Sweep (r119)

Scope: all 66 route files under `src/app/api/**/route.ts` (99 HTTP handler methods: 42 GET / 57 mutating), shared helpers `src/lib/api-helpers.ts`, `src/lib/auth.ts`, CSRF layer `src/lib/csrf.ts` + `src/proxy.ts`, cross-checked against `mobile/src` fetch usage. READ-ONLY audit — no files modified.

Headline: **66 routes / 99 handlers; 100% of body-accepting endpoints validate input (90% via zod); envelope `{success,data}` / `{success,error}` is near-universal; the contract debt is concentrated in (1) a 3-way pagination shape split, (2) a 400-vs-422 validation split, (3) English entity names leaking into Arabic 404s, (4) one P1 mobile-breaking flow (subscribe payment).**

---

## 1. Route inventory (66 routes)

Legend — Auth: `pub`=public, `sess`=any authenticated session, `owner`, `staff`=admin/super_admin (+sub_admin w/ permission), `super`, `cron`=Bearer CRON_SECRET, `tg`=Telegram secret. Zod: `✓`=parse/safeParse, `◐`=manual validation (regex/enum/whitelist), `–`=no body/query to validate. Env: `std`=`{success,data}` / `{success,error}` via api-helpers, `pag`=`paginated()` +meta, `nest`=ad-hoc nested list shape, `raw`=non-envelope (infra).

| # | Route | Methods | Auth | Zod | Envelope |
|---|-------|---------|------|-----|----------|
| 1 | /api/admin/admins | GET,POST | super (MANAGE_USERS) | ✓ invite | std |
| 2 | /api/admin/admins/[id] | PUT,DELETE,POST | super (MANAGE_USERS) | ✓ update | std |
| 3 | /api/admin/audit-logs | GET | super | ◐ action/actorId | **nest** `{data,total,page,pageSize}` |
| 4 | /api/admin/config | GET,PUT,DELETE | staff EDIT_SETTINGS | ✓ upsert | std |
| 5 | /api/admin/create-owner | POST | staff MANAGE_RESTAURANTS | ✓ | std |
| 6 | /api/admin/events/trigger | POST | staff EDIT_SETTINGS | – (no body) | std |
| 7 | /api/admin/notification-preferences | GET,PUT | staff EDIT_SETTINGS | ✓ flat | std |
| 8 | /api/admin/profile | GET,PUT | staff EDIT_SETTINGS | ✓ (+empty-body 400 guard) | std |
| 9 | /api/admin/reset-password | POST | super-adjacent MANAGE_USERS | ✓ | std |
| 10 | /api/admin/stats | GET | staff VIEW_ANALYTICS | – (no params) | std (cached) |
| 11 | /api/admin/subscriptions | GET,POST | staff MANAGE_SUBSCRIPTIONS | ✓ verify | **nest** `{data,total,page,pageSize}` |
| 12 | /api/admin/system-events | GET,POST,PUT,DELETE | staff VIEW_ANALYTICS | ✓ create/update | **nest** `{data,total,page,pageSize}` / `{data,sinceId}` cursor |
| 13 | /api/admin/telegram/approvers | GET,POST | GET: EDIT_SETTINGS / POST: MANAGE_SUBSCRIPTIONS | ◐ regex+cap | std |
| 14 | /api/admin/telegram/approvers/[id] | DELETE | MANAGE_SUBSCRIPTIONS | – | std |
| 15 | /api/admin/telegram/link | POST | EDIT_SETTINGS | – (no body) | std |
| 16 | /api/admin/telegram/verify | POST | EDIT_SETTINGS | ✓ | std |
| 17 | /api/auth/login | POST | pub (rate-limited) | ✓ safeParse→**400** | std (+mobile sessionToken) |
| 18 | /api/auth/logout | POST | sess | – | std (**English msgs**) |
| 19 | /api/auth/me | GET | sess | – | std |
| 20 | /api/auth/register | POST | pub (rate-limited) | ✓ safeParse→**400** | std 201 |
| 21 | /api/categories | GET,POST | GET: sess+ownership / POST: owner\|MANAGE_RESTAURANTS | ✓ create; ◐ restaurantId | **pag** |
| 22 | /api/categories/[id] | PUT,DELETE | owner\|MANAGE_RESTAURANTS | ✓ update | std |
| 23 | /api/config | GET | staff EDIT_SETTINGS (key branch) | ◐ key | std (**'Not found' 404 English**) |
| 24 | /api/cron/cleanup | GET | cron | – | raw (infra) |
| 25 | /api/cron/subscription-expiry | GET | cron | – | raw (infra) |
| 26 | /api/demo/fix-images | POST | sess (dev-only, prod 404) | – | std |
| 27 | /api/health | GET | pub (throttled) | – | raw `{status}` (infra, documented) |
| 28 | /api/items | GET,POST | GET: pub/sess scoped / POST: owner\|MANAGE_RESTAURANTS | ✓ full (ids, status enum, pagination) | **pag** |
| 29 | /api/items/[id] | GET,PUT,DELETE | same ladder | ✓ update | std |
| 30 | /api/items/[id]/reviews | GET,DELETE,POST | GET: pub (PII ladder) / POST: pub / DELETE: owner ladder | ✓ create | **pag**-shaped hand-rolled `{data,stats,meta}` |
| 31 | /api/loyalty | GET,POST | pub (rate-limited) | ✓ create; ◐ phone regex | std |
| 32 | /api/loyalty/redeem | POST | sess + ownership ladder | ✓ | std |
| 33 | /api/loyalty/referral | GET,POST | sess + tenant gate | ✓ | std |
| 34 | /api/loyalty/stats | GET | sess + scope guard | ◐ scope | std |
| 35 | /api/orders | GET,POST | GET: owner/staff / POST: pub (rate-limited) | ✓ full (r118-hardened) | **pag**; POST 201 / idempotent 200 `{orderNo,already}` |
| 36 | /api/orders/[id] | GET,PUT | owner/staff ladder | ✓ update | std |
| 37 | /api/orders/count | GET | owner/staff | ◐ status enum | std + `Cache-Control:no-store` |
| 38 | /api/owner/restaurants | GET,POST | owner (+subscription guard) | ✓ create; ◐ userId param | std |
| 39 | /api/owner/restaurants/[id] | PATCH,DELETE | owner/admin ladder | ✓ patch (**unbounded name/description**) | std |
| 40 | /api/owner/reviews | GET | owner/staff (+sub guard) | ◐ minRating (silent) | **pag** + stats extras |
| 41 | /api/plans | GET | pub | – | std (unstable_cache) |
| 42 | /api/public/featured | GET | pub | – | std (`revalidate=60`) |
| 43 | /api/public/menu/[slug] | GET | pub (rate-limited) | ◐ slug regex | std (data-cache 60s) |
| 44 | /api/public/stats | GET | pub | – | std |
| 45 | /api/referrals/claim | POST | pub (rate-limited) | ◐ regex | std `{registered,already}` |
| 46 | /api/restaurants | GET,POST | GET: staff VIEW_ANALYTICS / POST: pub-self-reg\|MANAGE_RESTAURANTS | ✓ | **nest** `{restaurants,total}` (no page echo) |
| 47 | /api/restaurants/[id] | GET,PUT,DELETE | GET: pub projection / PUT: ladder / DELETE: MANAGE_RESTAURANTS | ✓ update/adminUpdate | std |
| 48 | /api/seed | POST | staff (requireAdmin) | – | std |
| 49 | /api/settings | GET,PUT | owner/staff MANAGE_RESTAURANTS | ✓ single+batch | std |
| 50 | /api/stats | GET | sess + scope guard | ◐ scope | std |
| 51 | /api/stats/advanced | GET | sess + scope guard | ✓ range/scope | std |
| 52 | /api/subscriptions | POST | **sess** (requireAuth) | ✓ safeParse→**400** | std 201 |
| 53 | /api/subscriptions/status | GET | sess | ✓ id param | std |
| 54 | /api/subscriptions/upgrade | POST | sess | ✓ safeParse→**400** | std 201 |
| 55 | /api/subscriptions/validate | POST | pub (CSRF-exempt) | ✓ | **bespoke** `{valid,errors}` (documented pre-validation) |
| 56 | /api/telegram/broadcast-targets | GET,POST | staff EDIT_SETTINGS | ✓ | std |
| 57 | /api/telegram/broadcast-targets/[id] | PATCH,DELETE | staff EDIT_SETTINGS | ✓ | std |
| 58 | /api/telegram/config | GET,POST | staff EDIT_SETTINGS | ✓ upsert | std |
| 59 | /api/telegram/diagnose | GET | staff EDIT_SETTINGS | ◐ dryRun | std (**GET w/ side effects**) |
| 60 | /api/telegram/test | POST | staff EDIT_SETTINGS | – (no body) | std |
| 61 | /api/telegram/webhook | POST | tg secret | ◐ update shape | raw `Response('OK'/'Forbidden')` (protocol) |
| 62 | /api/upload | POST | sess (rate-limited) | ◐ formData+magic-bytes | std 201 / 413 |
| 63 | /api/user/events | GET | sess | ◐ sinceId (lenient) | std |
| 64 | /api/users | GET | staff (MANAGE_USERS for sub_admin) | ◐ restaurantId; **roleFilter NOT whitelisted** | **nest** `{users,total,page,pageSize}` |
| 65 | /api/users/[id] | PATCH,DELETE | super-adjacent MANAGE_USERS | ✓ safeParse→**400 generic** | std |
| 66 | /api/whatsapp/generate | POST | owner/staff ladder | ✓ | std (hand-rolled Response.json in guards) |

Handler-level validation coverage: 40 body-accepting handlers → 36 zod + 4 manual (all 4 validate rigorously) = **100% validated, 90% zod**. GET query params: `parsePagination` (clamped 1..100, NaN→default) in 10 list routes; `parseIdSearchParam` + enum whitelists (order status ×2, item status, subscription status, audit action/actorId) cover the hot paths. Remaining query gaps listed in §4.

---

## 2. P1 findings (mobile-breaking / contract breaks)

### P1-1 · Mobile subscribe payment flow is dead at TWO layers
- `mobile/src/screens/subscribe/SubscribeScreens.tsx:144` — `api.post("/api/subscriptions", {...})` from the **AuthStack** (pre-auth: `navigation/AuthStack.tsx:7-23`).
- Layer 1 (CSRF): `src/lib/csrf.ts:83-87` bypasses Origin only for `X-Client-Type:mobile` on exactly `/api/auth/login` + `/api/orders`; the subscriptions call (a) is on `/api/subscriptions` (not in the set) and (b) doesn't even send the header (`mobileClient:true` not passed — only MenuScreen.tsx:471 and auth-service.ts:23 do). React Native sends no Origin → `src/proxy.ts:190-196` → **403 "CSRF validation failed"**.
- Layer 2 (auth): `src/app/api/subscriptions/route.ts:20-21` — `requireAuth()` → **401 'غير مصرح'** for the anonymous wizard user. The web flow registers + logs in first (`src/app/(protected)/subscribe/page.tsx:251,324`); mobile has no `/api/auth/register` call at all (grep over `mobile/src`: zero hits).
- Net effect: every mobile payment submission fails; the wizard's success state is unreachable.
- **Fix (pick one, coordinated):**
  1. Mobile: register before paying — POST `/api/auth/register` (needs CSRF-exempt-or-mobile path too!) then login, mirroring web; add `{ mobileClient: true }` to the subscriptions call; **and** server: add `/api/subscriptions` to `MOBILE_UNAUTH_PATHS` only if the route is made explicitly public (it currently requires auth — so option 1 requires the register+login steps anyway).
  2. Server: accept `X-Client-Type: mobile` + require the call to carry fresh `tempUsername` semantics and make the route public-but-rate-limited (bigger change, touches money path — not recommended this round).
  - Minimum correct fix: mobile replicates web (register → login → POST /api/subscriptions with Bearer), and `MOBILE_UNAUTH_PATHS` gains `/api/auth/register` (it is the same "password-protects-itself" class as login, see csrf.ts:70-82 rationale).

### P1-2 · `POST /api/subscriptions` pending-payment conflict: 400 pre-flight vs 409 race (same condition)
- `src/app/api/subscriptions/route.ts:80` — pre-flight `findFirst(pending)` → **400** 'لديك طلب دفع معلق بالفعل'.
- `src/app/api/subscriptions/route.ts:120-121` — P2002 race catch of the *identical* condition → **409**.
- Same split in upgrade: `src/app/api/subscriptions/upgrade/route.ts:130,136` (400) vs `:165` (409).
- A client cannot branch on "conflict" reliably: two simultaneous submissions from the same user (double-tap) can see different statuses for the same state.
- **Fix:** pre-flight returns 409 too:
  ```ts
  if (pendingPayment) return error('لديك طلب دفع معلق بالفعل', 409);
  // and upgrade/route.ts:130,136 → 409
  ```
  (r116/r118 `already:true` 200-family for *idempotent replays* stays as-is — it is a different semantic: same request vs conflicting new one.)

### P1-3 · Mobile menu fallback chain references a route that does not exist
- `mobile/src/screens/public/MenuScreen.tsx:97` — `api.get('/api/restaurants/slug/${slug}')`. No such route exists (`src/app/api/restaurants/` only has `route.ts` + `[id]/`; `[id]` does `Number(id)` → NaN → 400 `restaurants/[id]/route.ts:95`). The next fallback `GET /api/restaurants` requires `VIEW_ANALYTICS` (`restaurants/route.ts:61`) → 401/403 for anonymous → swallowed `.catch(() => [])` → "المطعم غير موجود" error screen.
- Primary path `/api/public/menu/[slug]` works, so this only bites when it fails (rate limit 429 after 60/min, transient 5xx) — then degradation is broken instead of graceful.
- **Fix:** delete the dead branch (or point it at `/api/public/menu/${slug}` retry); the `/api/restaurants` list fallback should be dropped for anonymous users — it can never succeed.

---

## 3. P2 findings (contract inconsistencies)

### P2-1 · Pagination response shape is a 4-way split
| Shape | Routes |
|---|---|
| `paginated()` → `{data:[], meta:{total,page,pageSize,totalPages}}` | orders:174, items:176, categories:72, owner/reviews:88, items/[id]/reviews:123-131 (hand-rolled identical) |
| `success({data,total,page,pageSize})` (no `meta`, no `totalPages`) | admin/audit-logs:67, admin/subscriptions:58, admin/system-events:61 |
| `success({users,total,page,pageSize})` (named array, no meta) | users:68 |
| `success({restaurants,total})` (no page echo at all) | restaurants:118 |
- `parsePagination` is uniformly used (defaults 50/max 100; restaurants 10, system-events+audit-logs 20 — documented in api-helpers.ts:48-56), so *request* params are consistent; the *response* meta is not.
- Mobile today consumes only `/api/orders` via `getPaginated` (`mobile/src/services/api/client.ts:120-127` reads `env.meta`) and OwnerScreens merge relies on `meta.page`/`meta.totalPages` (`OwnerScreens.tsx:161-235`) — currently safe. Any future mobile/admin surface reading the admin lists will need bespoke parsing.
- **Fix (non-breaking):** keep existing keys, *add* `meta` via `paginated(data,total,page,pageSize)` in the four admin/users/restaurants handlers (superset — old clients keep reading `data`/`total`/`users`/`restaurants`):
  ```ts
  // users/route.ts:68 — keep {users,total} AND add meta
  return success({ users, total, page, pageSize, meta: { total, page, pageSize, totalPages: Math.ceil(total/pageSize) } });
  ```
  or standardize on `paginated(users, total, page, pageSize)` and migrate the one web reader per route.

### P2-2 · 400 vs 422 for identical validation failures (3 patterns)
- Throwing `.parse()` → `handleError` → `validationError` → **422** `{error:'بيانات غير صالحة', details:[...]}` (categories, items, restaurants, loyalty, owner/restaurants, settings, admin/*, whatsapp, orders/[id]:77…).
- `safeParse` first-issue → **422** no details: `orders/route.ts:200`.
- `safeParse` first-issue → **400** no details: `auth/login:66` ('يرجى إدخال…' 400), `auth/register:48`, `subscriptions:28`, `subscriptions/upgrade:46`, `admin/telegram/verify:34`, and `users/[id]:22-23` (400 **generic** 'بيانات غير صالحة', details discarded).
- Also 422 is used for *business-rule* failures: items price sanity (`items/[id]:208`), media URL guard (422), settings slug format (422), admin/config value (422) — while other business rules use 400 (orders modifier violations 400).
- **Fix:** adopt one rule — *schema/shape errors → 422 with `details`* (use `validationError(parsed.error)` everywhere instead of `error(issues[0].message, 400)`), *business-rule rejections → 400*. Minimal diff: replace the six `error(parsed.error.issues[0].message, 400)` call sites with `validationError(parsed.error)` (it already returns 422 + Arabic summary + details), keeping the helpful per-field Arabic messages that zod schemas carry.

### P2-3 · Arabic/English mixed 404s — `notFound()` called with English entity names (10 sites, 5 routes)
- `orders/[id]/route.ts:37,80` → **"Order غير موجود"**
- `items/[id]/route.ts:50,62,67,134,262` → **"MenuItem غير موجود" / "Item غير موجود"**
- `whatsapp/generate/route.ts:81` → **"Order غير موجود"**
- `admin/subscriptions/route.ts:73` → **"SubscriptionPayment غير موجود"**
- `admin/system-events/route.ts:101,133` → **"SystemEvent غير موجود"**
- r90-F6 fixed exactly one instance (`categories/[id]:31` → 'القسم') and left the rest.
- Other English leaks: `config/route.ts:42` `error('Not found', 404)`; `owner/reviews/route.ts:12` `'Unauthorized'`; `auth/logout/route.ts:13,18` `'Logged out'`/`'Logout failed'`; `cron/*:16,19` `'Unauthorized'` (infra — acceptable).
- **Fix:**
  ```ts
  // orders/[id]/route.ts:37,80
  if (!data) return notFound('الطلب');
  // items/[id]/route.ts — unify to الصنف
  if (!item) return notFound('الصنف');
  // whatsapp/generate:81 → notFound('الطلب')
  // admin/subscriptions:73 → notFound('طلب الدفع')  (matches subscriptions/status:21 wording)
  // admin/system-events:101,133 → notFound('الحدث')
  // config:42 → error('غير موجود', 404); owner/reviews:12 → error('غير مصرح', 401); auth/logout → success({message:'تم تسجيل الخروج'}) / error('فشل تسجيل الخروج', 500)
  ```

### P2-4 · PATCH `owner/restaurants/[id]` validation weaker than its own POST
- `owner/restaurants/[id]/route.ts:9-14` — `name: z.string().min(1).optional()` and `description: z.string().optional()` have **no `.max()`**, while the sibling create schema bounds them (`owner/restaurants/route.ts:14-20`: max 200/1000). A partial update can store unbounded strings (DB bloat class that r87-A4/r103-F7 fixed elsewhere).
- **Fix:** mirror create bounds:
  ```ts
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  ```

### P2-5 · Empty-body PATCH/PUT relies on Prisma error mapping (only one route guards it)
- All-optional partial schemas accept `{}`: `users/[id]` PATCH (updateUserSchema), `categories/[id]` PUT, `items/[id]` PUT, `owner/restaurants/[id]` PATCH, `orders/[id]` PUT, `restaurants/[id]` PUT. The subsequent `prisma.update({data:{}})` throws PrismaClientValidationError, which `handleError` maps via the `Invalid \`` sniff (api-helpers.ts:128-130) to a generic 400/500 — untested behavior, and semantically a 422 candidate.
- `admin/profile/route.ts:78-83` already implements the correct guard (`'لا توجد بيانات للتحديث'` 400).
- **Fix:** replicate the profile guard (or a shared `assertNonEmpty(parsed)` helper) in the six partial-update handlers; alternatively a zod `.refine((v) => Object.keys(v).length > 0, { message: 'لا توجد بيانات للتحديث' })` appended to each schema.
- Unknown keys: zod default-strip removes them everywhere a schema is used — no unknown-key write path exists (verified: no `passthrough()` in `src/app/api`).

### P2-6 · Query-param validation gaps (garbage → Prisma noise or silent ignore)
- `users/route.ts:31-38` — `?role=` free string into `where.role` (enum column). `?role=foo` → PrismaClientValidationError → 400 'بيانات غير صالحة' (noise, not the clean family 400). **Fix:** whitelist `z.enum(['owner','admin','sub_admin','super_admin','USER','all'])` or a Set check like `isValidOrderStatusFilter`, message `'دور غير صالح'` 400.
- `owner/restaurants/route.ts:34` — super_admin-only `?userId=` → `Number(param)` NaN flows into `findMany({where:{userId:NaN}})` → Prisma error. **Fix:** `parseIdSearchParam(url,'userId')` + NaN → 400 'معرف المستخدم غير صالح'.
- `items/[id]/reviews/route.ts:40-45` and `owner/reviews/route.ts:48-53` — invalid `?minRating=` (e.g. `9`, `abc`) is **silently ignored** (filter dropped), unlike the r88-B4 family that 400s garbage. **Fix:** `if (minRating !== null && !(Number.isInteger(min) && min>=1 && min<=5)) return error('قيمة التقييم غير صالحة', 400);`
- `loyalty/route.ts:105-107` — `restaurantId` from cookie via `Number()`; NaN → falsy → 400 'معرف المطعم مطلوب' (accidentally OK; fine to leave, note only).
- `user/events/route.ts:29` — `sinceId` garbage → 0 (replays from beginning, bounded take 50) — acceptable, note only.
- Negative/absurd pagination: **safe** — `parsePagination` clamps (page≥1, 1≤pageSize≤100, NaN→defaults); verified no route hand-rolls skip/take arithmetic outside it (items/orders/categories/users/restaurants/audit-logs/system-events/subscriptions all route through it).

---

## 4. P3 findings (status-code semantics & message consistency)

### P3-1 · 403 message split: 'غير مصرح' vs 'لا تملك الصلاحية'
- Permission-denied 403s use `requirePermission`'s 'لا تملك الصلاحية' (auth.ts:53,73,80; orders:105; users:19) but inline role ladders use 'غير مصرح' 403 (orders/[id]:53, items:124, settings:68, restaurants/[id]:243, owner/reviews:20). Same status, two messages — pick 'لا تملك الصلاحية' for authenticated-wrong-permission everywhere ('غير مصرح' stays the 401 message).
- 401 vs 403 semantics themselves are **consistent** since R90-F3/round91-F-B: no-session→401 'غير مصرح', wrong-role→403 (verified in requireAuth/requireAdmin/requirePermission + all inline ladders; users:12-13 documents the rule).

### P3-2 · 404-before-403 on `GET /api/orders/[id]` (existence oracle for authenticated callers)
- `orders/[id]/route.ts:30-37` fetches + 404s before the ownership ladder (:40-54): any authenticated owner/staff can distinguish "order exists" (403) from "doesn't" (404) across tenants. PII stays protected; only existence leaks. The sibling PUT has the same ordering (:79-97).
- **Fix (optional, defense-in-depth):** run the role/ownership resolution first, or return 404 for both "missing" and "not-yours" when the caller is not platform staff:
  ```ts
  if (!data) return auth.role === 'owner' ? apiError('الطلب غير موجود', 404) : notFound('الطلب');
  ```
  (Simplest consistent rule: never 403-after-fetch for resources the caller can't list.)

### P3-3 · "Username taken" has 3 wordings; "category" has 2 names; tanween orthography varies
- Username taken: 'اسم المستخدم موجود مسبقاً' (auth/register:55), 'اسم المستخدم مستخدم بالفعل' (restaurants:151), 'اسم المستخدم موجود مسبقًا' (admin/create-owner:26). **Fix:** one canonical: `اسم المستخدم موجود مسبقاً` (matches handleError's unique-constraint message api-helpers.ts:114 'هذا الاسم موجود مسبقاً' family).
- Category: 'التصنيف غير موجود' (items:204) vs 'القسم' (categories/[id]:31,76) — and the UI calls them أقسام in the cap message (categories:116 'لقد وصلت للحد الأقصى للأقسام'). **Fix:** القسم everywhere user-facing (owner UI already says الأقسام).
- 'مسبقاً' vs 'مسبقًا' vs 'جدًا' vs 'جداً' tanween spelling varies route-to-route (register:55 vs create-owner:26 vs restaurants:128 'طلبات كثيرة جدًا' vs orders:197 'جداً'). Pick '…اً' (alef+tanween) as in api-helpers.
- Order terminology is consistent (طلب/طلبات everywhere — no أوردر); restaurant vs منيو: owner flows deliberately call a restaurant "منيو" (multi-menu product), keep but document (see style guide §6).

### P3-4 · 429 message variants (5+)
- 'محاولات كثيرة جداً. حاول لاحقاً.' (standard: orders:79,197; items:105; login:72; stats:23; user/events:26; admin/reset-password…)
- 'طلبات كثيرة جدًا، حاول بعد 60 ثانية' (restaurants:128, restaurants/[id]:91, public/menu:26)
- 'طلبات كثيرة، حاول لاحقاً' (loyalty/referral:28)
- 'طلبات كثيرة جدًا، حاول بعد دقيقة' (loyalty/redeem:43)
- 'طلبات كثيرة جداً، حاول بعد قليل' (upload:30, referrals/claim:34)
- 'لقد تجاوزت الحد الأقصى من التقييمات. حاول مرة أخرى لاحقاً' (reviews:239)
- All are Arabic and actionable-ish, but no canonical string. **Fix:** hoist `RATE_LIMIT_MESSAGE = 'محاولات كثيرة جداً. حاول لاحقاً.'` into api-helpers and import it; per-window hints (`بعد 60 ثانية`) may stay as informative suffixes of the same base.

### P3-5 · `GET /api/telegram/diagnose` has side effects by default
- `telegram/diagnose/route.ts:36` — `dryRun` must be explicitly `true` to avoid sending Telegram messages from a GET. **Fix (cheap):** flip the default for GET (dry-run unless `?send=true`), or move the send to POST `/api/telegram/test` (already exists for that purpose).

### P3-6 · `PATCH` vs `PUT` method semantics are split by habit, not by meaning
- True partial-update semantics on **PUT**: categories/[id], items/[id], restaurants/[id], orders/[id], admin/admins/[id], admin/system-events, admin/config, settings.
- **PATCH** (correct) on: users/[id], owner/restaurants/[id], telegram/broadcast-targets/[id].
- Both families behave identically (all-optional schemas). No correctness bug; it's a contract wart for any generated client. **Recommendation:** document the convention ("PUT on this platform = partial update; fields omitted are unchanged — verified items/[id]:151-159 comment") in the future API reference rather than break 8 routes; new routes should use PATCH.

### P3-7 · Hand-rolled envelope duplications (drift-prone)
- `items/[id]/reviews:31` and `owner/reviews:12,20,24,37` build `{success,error}` with raw NextResponse.json instead of the `error()` helper; `whatsapp/generate:53,60,91` uses `Response.json`. Same shape today, but they bypass any future helper change (e.g., adding `code`). **Fix:** swap to `error(...)`/`apiError(...)`; reviews GET can use `paginated(reviews, total, page, pageSize, { stats })` which exists for exactly this (api-helpers.ts:30-46).

---

## 5. P4 findings (polish / documentation)

- **P4-1 · No OPTIONS/CORS handlers anywhere** — fine for current clients (web same-origin; RN fetch not subject to CORS), and `assertSameOrigin` correctly exempts Bearer + the two mobile paths. If a third-party web client ever appears it will need explicit CORS. Note for the contract doc, not a change.
- **P4-2 · Cache headers:** orders/count sets `no-store` explicitly (good, orders/count:66-68); public/featured `revalidate=60`; public/menu uses data-cache(60s)+tags with `revalidateMenu` invalidation; plans uses `unstable_cache`. `/api/public/stats` and `/api/plans` responses carry no explicit `Cache-Control` (Vercel defaults apply). Optional: add `s-maxage=60, stale-while-revalidate` to public/stats.
- **P4-3 · Cron GETs mutate** (cleanup, subscription-expiry) — Vercel Cron only issues GETs; documented in csrf.ts:15-19. Keep, but the contract doc should list them as exceptions.
- **P4-4 · Mobile `Order` type overstates the LIST payload** (`mobile/src/screens/owner/OwnerScreens.tsx:127-131` declares `notes`/`items`, slim list returns neither — items only via `_count.items`, notes only on detail). Rendering never touches them in the list, so no break; fix the type to match the r86-B9 slim projection.
- **P4-5 · `admin/telegram/approvers` POST** validates by regex + slice (approvers:38-43) rather than zod — functionally equivalent (bounded, trimmed), but it's the only admin JSON route off-zod; optional `z.object({ telegramId: z.string().regex(/^\d{1,20}$/), label: z.string().max(100) })`.
- **P4-6 · No OpenAPI/AsyncAPI spec exists** (no openapi/swagger files anywhere; docs/ has engineering docs only). S11 owns docs — hand over §1 table as the seed inventory. The contract (envelopes, status map, pagination, idempotency `already:true`, PlanLimitError 403 family, CSRF/Bearer rules) is currently implicit in code comments only.

---

## 6. Mini Arabic error style guide (proposed)

1. **Language:** user-facing `error` strings are Arabic only. English tokens allowed solely for infra endpoints (health/cron/webhook) and technical identifiers (JSON, CSRF) never surfaced to end users.
2. **Canonical vocabulary:** طلب (order) · الصنف (menu item) · القسم (category — not التصنيف) · المطعم (restaurant, admin-facing) · المنيو (restaurant, owner-facing product term) · الباقة (plan) · طلب الدفع (payment request) · بطاقة الولاء (loyalty card) · كود الإحالة (referral code).
3. **Status-message pairs:**
   - 401 → `غير مصرح`
   - 403 (permission) → `لا تملك الصلاحية` · 403 (plan cap) → PlanLimitError family · 403 (subscription expired) → `اشتراكك منتهي. جدّد اشتراكك للمتابعة.`
   - 404 → `‹Entity› غير موجود` with entity ALWAYS Arabic (الطلب/الصنف/القسم/المطعم/المستخدم/طلب الدفع/كود الإحالة/التقييم/البطاقة)
   - 409 → `…موجود مسبقاً` / `…محجوز مسبقاً` / `لديك طلب دفع معلق بالفعل`
   - 422 → `بيانات غير صالحة` + `details[]`
   - 429 → `محاولات كثيرة جداً. حاول لاحقاً.`
   - 500 → `حدث خطأ داخلي. حاول مرة أخرى` (503 for DB: `خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى`)
4. **Orthography:** tanween as `اً` (مسبقاً, جداً) — matches api-helpers; hamza on أ/إ consistent; use `معرّف`/`المعرّف` consistently (currently معرف:29 orders/[id] vs معرّف:28 categories/[id] — pick معرّف).
5. **Actionability:** tell the user what to DO (gold standard already in repo: `أحد الأصناف في سلتك لم يعد متوفراً — حدّث السلة وحاول مجدداً` orders:301; `لا يمكن حذف المنيو الأساسي. عيّن منيو آخر كأساسي أولاً.` owner/restaurants/[id]:108). New messages should follow the `‹what happened› — ‹what to do›` pattern.
6. **Mixed-script rule:** never mix English nouns into Arabic sentences for entities; brand/technical names (Telegram, JSON) may stay Latin.

---

## 7. Mobile cross-check summary (all mobile calls vs contract)

| Mobile call | Server | Status |
|---|---|---|
| POST /api/auth/login (X-Client-Type) | login | ✅ CSRF bypass + token echo |
| POST /api/orders (X-Client-Type) | orders POST | ✅ in MOBILE_UNAUTH_PATHS; 201/200-idempotent handled |
| GET /api/orders?page&pageSize (Bearer) | orders GET `paginated()` | ✅ meta.page/totalPages matches getPaginated + r118 merge/dedupe |
| GET /api/orders/[id], PUT (Bearer) | orders/[id] | ✅ (edge: token-cleared retry hits CSRF 403 — P1-1 adjacent note) |
| GET /api/public/menu/[slug] | public/menu | ✅ primary path |
| GET /api/restaurants/slug/[slug] | **missing** | ❌ dead fallback (P1-3) |
| GET /api/restaurants (fallback) | restaurants GET | ❌ staff-only → anonymous fallback dead (P1-3) |
| GET /api/categories?restaurantId / /api/items?restaurantId (fallback) | categories/items | ⚠️ categories requires auth for owners… anonymous USER/anonymous: categories GET requires session (categories:29-30 `requireAuth` → 401) — the `.catch(()=>[])` swallows; degraded-empty, consistent with P1-3 |
| POST /api/subscriptions/validate | validate (CSRF-exempt) | ✅ |
| POST /api/subscriptions | subscriptions POST | ❌ **P1-1** (CSRF 403 + auth 401) |
| GET /api/plans, /api/public/featured, /api/public/stats, /api/stats, /api/auth/me, /api/auth/logout, /api/owner/restaurants, /api/restaurants (owner authed) | — | ✅ Bearer-attached reads; owner/restaurants GET returns array envelope `success(data)` — mobile reads `data` directly ✅ |

---

## 8. Verification snippets for the P1/P2 fixes (no repo changes made)

```bash
# P1-1 reproduce (from a machine, no Origin header like RN):
curl -s -X POST https://menu.smart-link.ly/api/subscriptions -H 'content-type: application/json' \
  -H 'x-client-type: mobile' -d '{"planId":1,"provider":"libyana","phone":"0913","amount":0}' 
# → expect 403 'CSRF validation failed' (proxy) — before route auth even runs

# P2-2 observe split:
curl -s -X POST .../api/orders -d '{}' → 422 {error:'بيانات غير صالحة'?} # actually first-issue msg
curl -s -X POST .../api/auth/register -d '{}' → 400 {error:'يرجى إدخال...'/first-issue}
```

## 9. What is already consistent (credit where due)

- `success`/`error`/`validationError`/`notFound`/`paginated`/`handleError` adoption: 60/66 files import the helpers; the 6 exceptions are all deliberate (health/cron/webhook raw, config, and 3 hand-rolled-but-same-shape).
- 401/403 unification (R90-F3, round91-F-B) is genuinely family-wide — no route answers 401 to an authenticated wrong-role caller anymore.
- Plan-cap errors unified through `PlanLimitError` → 403 (orders/items/owner-restaurants) since r89-E1.
- Idempotency family consistent: orders POST `{orderNo, already:true}` 200; referrals/claim `{registered:false, already:true}`.
- r118 order hardening (server re-price, modifier snapshot, inactive-restaurant 409 inside tx) is contract-clean and matches mobile's payload.
- Rate-limit posture: every public/heavy route has a DB-backed limiter keyed on non-spoofable values; 429s after auth gates.
