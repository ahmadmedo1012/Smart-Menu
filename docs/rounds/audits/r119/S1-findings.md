# S1 — r119 LIVE verification of the r118 batch (first-ever production exposure)

- **Agent:** S1 (r119 fleet) · **Date:** 2026-09-21 11:11–11:25 UTC
- **Production:** https://menu.smart-link.ly · `/api/health` → `commitSha: 92611477…` (r118 batch B1–B5 LIVE for the first time), uptime ≈206s at probe start (fresh deploy)
- **Scope:** unauthenticated/negative probes only — **zero orders created, zero production data touched** (all order POSTs violate the contract and return BEFORE any write — validation precedes the transaction, `route.ts:237–243` < `:353`)
- **Method:** curl `-m 20`, evidence files in this directory (`*.log`, `*.json`, `*.txt`)

---

## 1. VERIFIED LIVE — OK (with evidence)

### 1.1 B1 — server-side modifier contract (money-path) ✅
Demo restaurant 312 (`al-waha-cafe-demo`) items used: 790 «برجر الواحة» (group 4 «الحجم» min=1/max=1, group 5 «إضافات» max=3), 818 «لاتيه كراميل» (group 2 min=1/max=1, group 3 «إضافات» max=2) — discovered via the public menu API (no DB access needed).

| Probe (POST /api/orders, `X-Client-Type: mobile`) | Result | Evidence |
|---|---|---|
| empty body | **400** `بيانات غير صالحة — خطأ في صيغة JSON` | `b1-zod-probes.log` B1-1 |
| `{` invalid JSON | **400** same Arabic msg | B1-2 |
| `{}` | **422** `Invalid input: expected number, received undefined` | B1-3 |
| `items: []` | **422** `Too small: expected array to have >=1 items` | B1-4 |
| `quantity: 100` | **422** `الحد الأقصى 99 وحدة لكل صنف في الطلب` | B1-5 |
| **101 raw modifier ids** (r118 raw cap) | **422** `عدد الخيارات المختارة كبيرة جداً` | B1-6 |
| item 790, **no options** (minSelect=1 group) | **400** `اختر على الأقل 1 من «الحجم»` | `b1-contract-probes.log` B1-7/8 |
| item 818, valid size + **3 addons into max=2** | **400** `الحد الأقصى 2 خيارات من «إضافات»` | B1-9 |

- Pre-r118, the minSelect probe would have been **accepted** (no group-contract check existed) — this is the **first-ever live proof of the r118-A3-P1/A7-P2 contract on production**.
- Note: contract violations return **400** (business rule), zod shape violations **422** — matches shipped unit contract `tests/unit/r118-order-modifier-contract.test.ts:98-141`. The mandate's "expect 422" for the modifier case was approximate; **400 is the designed behavior, live-confirmed**.
- `X-Client-Type: mobile` CSRF bypass worked exactly as scoped (`csrf.ts:84-87` — only `/api/auth/login` + `/api/orders`).
- No data debt: every payload violates validation before the write path (`orders/route.ts:237–243` precedes the transaction at `:353`); NO 2xx was ever received from /api/orders.

### 1.2 B1 — /api/health throttle (30/min/IP in-memory) ✅ (functional; see P3-1 for the dilution nuance)
- Run 1 (11:15:59–11:16:11): **36 rapid hits → 36× 200, no 429** (`health-throttle.log`).
- Run 2 (11:16:31–11:16:51, concurrent with other fleet agents' health checks): **45 hits → 43× 429, 2× 200** (`health-throttle-2.log`). First observed 429 = 37th cumulative rapid hit (~32s into the burst).
- **Recovery:** 200s resumed at 11:16:54+ (≤60s after last 429) — window reset confirmed; later bursts (20+15+38 hits at 11:17–11:24) all 200 again.
- 429 shape per code: `{"status":"rate-limited"}` + `retry-after: 10` (`health/route.ts:43-46`); the live storm matched the timing but a body capture landed on a 200 (multi-instance dilution — see P3-1).
- Health itself: `db: connected`, latency 3ms warm / 499ms first hit.

### 1.3 B1 — safeRedirect (open redirect) ✅
`safeRedirect-probes.log` — all four variants, unauthenticated:

| URL | Result |
|---|---|
| `/login?redirect=https://evil.example` | **200**, no `Location` header |
| `/login?redirect=%2F%5Cevil.com` (i.e. `/\evil.com`) | **200**, no `Location` |
| `/login?redirect=/\evil.com` (raw backslash) | **200**, no `Location` |
| `/login?redirect=//evil.com` | **200**, no `Location` |

The `/\evil.com` value reaches the client only as the `redirectParam` RSC prop (verified in HTML/RSC payload) and is rejected post-login by the r118-hardened guard `value[1] === '\\'` (`login/LoginForm.tsx:56-61`, `login/page.tsx:34-40`). The authenticated redirect branch is code-verified only (needs a session; `page.tsx:50-64` — safe/`startsWith('/owner')` defaults).

### 1.4 B3 — terms/privacy ISR (was no-store behind (protected) nonce flow) ✅
`b3-cache-probes.log` + `terms-headers.txt` / `privacy-headers.txt`:
- `/terms` → **200**, `x-vercel-cache: HIT`, `age: 305`, 84ms
- `/privacy` → **200**, `x-vercel-cache: HIT`, `age: 304`, 93ms

CDN-cached ISR with the 3600s ceiling (`revalidate = 3600` at `(public)/terms/page.tsx:8`, `(public)/privacy/page.tsx:8`), no longer `no-store`. Live-proven.

### 1.5 B3 — public menu API Data Cache (60s + tags) ✅ code-verified / externally invisible
- Endpoint is `force-dynamic` → `x-vercel-cache: MISS`, `age: 0` on every hit (expected — the CDN does not cache it; the **Data Cache is internal**).
- Timing probe across the 61s expiry boundary (`menu-cache-timing.log`): cycle A 0.379/0.472/0.323/0.315s vs cycle B 0.380/0.322/0.332/0.314s — **no externally observable delta** (warm Neon 3ms + network RTT dominate). Honest conclusion: the Data Cache cannot be black-box confirmed from outside; verification rests on code (`api/public/menu/[slug]/route.ts:68-151` — `unstable_cache(..., { revalidate: 60, tags: ['public-menu', 'public-menu-<id>'] })`) + tag purge on owner mutations (`lib/menu-cache.ts:38-44` `revalidateTag`) + the 7-case unit suite `tests/unit/r118-public-menu-route.test.ts`.
- Functional spot-check: demo payload complete (25 items, groups/options with `minSelect/maxSelect`, `discountedPrice` numbers) — matches the r114 parity baseline.

### 1.6 Canary sweep + security headers ✅ (except the /menu/[slug] soft-404 → P2-1)
`canary-sweep.log`:

| Route | Status | Cache | Notes |
|---|---|---|---|
| `/` | 200 | HIT | headers ✓ |
| `/menu/al-waha-cafe-demo` | 200 | STALE (age 340) | ISR SWR — expected |
| `/pricing` | 200 | HIT | ✓ |
| `/login` | 200 | MISS | dynamic + per-request CSP nonce ✓ |
| `/register` | 308 → `/subscribe` | — | long-standing intentional wizard redirect ✓ |
| `/subscribe` | 200 | MISS | dynamic + nonce ✓ |
| `/terms`, `/privacy` | 200 | HIT | see 1.4 ✓ |

Security headers present on every page: **CSP** (nonce+strict-dynamic on dynamic pages; static CSP on ISR pages), **HSTS** `max-age=31536000; includeSubDomains`, **X-Frame-Options: DENY** (+ `frame-ancestors 'none'` in CSP), **X-Content-Type-Options: nosniff**, **Referrer-Policy: strict-origin-when-cross-origin**, Permissions-Policy, `upgrade-insecure-requests`.

### 1.7 Negative security re-checks ✅
`negative-probes.log`:
- POST `/api/orders` no headers → **403** `CSRF validation failed` (proxy.ts:194)
- POST `/api/orders` with `Origin: https://evil.example`, no token → **403**
- POST `/api/auth/login` (`X-Client-Type: mobile`) bad creds → **401** `اسم المستخدم أو كلمة المرور غير صحيحة`
- GET `/api/public/menu/audit-no-such-restaurant-9x7q` → **404** `المطعم غير موجود` (slug regex/lookup intact)
- GET `/xyz-catchall-test-9x7q` → **404** (r111-F12 catch-all intact)
- GET `/terms/extra-segment-9x7q` → **404**
- GET `/admin` (no session) → **307** → `/login?redirect=%2Fadmin` ✓

---

## 2. FINDINGS

### P2-1 (r118 REGRESSION, live-proven) — `/menu/<unknown-slug>` serves the themed 404 page with **HTTP 200** (soft-404)
**Evidence (4 distinct fresh slugs, first-hit AND cached):**
```
GET /menu/audit-no-such-place-9x7q  → 200  x-vercel-cache: HIT  age:10  cache-control: public, max-age=60, s-maxage=60, stale-while-revalidate=86400
GET /menu/fresh-slug-test-aa1       → 200 (first hit) then 200
GET /menu/fresh-slug-test-bb2       → 200 (first hit) then 200
GET /menu/unknown-restaurant-zz9    → 200
```
Body = themed 404 UI («غير موجود», 4 suggestions) + `<meta robots content="noindex">` (mitigation present), but status 200. Contrast the same deployment: `/xyz…` → 404, `/terms/x` → 404. Only the menu route is soft.

**Root cause — r118-B3 (f06ac87a) re-added a deliberately-deleted file:**
- Commit **35924222** («fix(seo): preserve real 404 status for unknown menus», Sep 1) **deleted BOTH** `src/app/(public)/menu/loading.tsx` and `menu/[slug]/loading.tsx` precisely because a loading Suspense boundary flushes a 200 shell before `notFound()` runs (its next.config.ts comment: «The dynamic public /menu/[slug] route intentionally has no loading boundary»). It also moved the existence gate into `menu/[slug]/layout.tsx` (renders before the child boundary → real 404).
- Round97 (4c04a3e1) re-added `[slug]/loading.tsx` only — harmless: the layout gate still renders **outside** that boundary (r112 verified `/menu/n` → 404 locally).
- **r118-B3 A5-F7 (f06ac87a) re-added the PARENT `menu/loading.tsx`** («the /menu directory is the ONLY sibling without one» — unaware of the deliberate deletion). A parent-segment boundary wraps the `[slug]` **layout** too → the gate's `notFound()` now streams after headers commit → **200**; ISR then caches the soft-404 for 60s + SWR 86400.
- Blast radius: `/menu` itself changed **307→200** (redirect now streamed client-side; `menu/page.tsx:16` redirect() executes inside the boundary) — same root cause, P4-2.

**Impact:** menu URLs are the product's SEO/QR surface; garbage slugs return 200 (crawl-budget + analytics pollution; the r112 route-sweep contract «/menu/zzz → 404» now fails; monitoring/uptime checks probing menu slugs see false 200s). Noindex meta + Google soft-404 heuristics partially mitigate.

**Fix proposal (one line):** delete `src/app/(public)/menu/loading.tsx` (restore the 35924222 invariant). If the /menu directory truly needs a loading state, give `/menu` its own segment boundary that does NOT wrap `[slug]` (e.g. move the directory page to `menu/(dir)/page.tsx`-style nesting) — but the 35924222 decision was «no boundary here»; respect it. Add a regression test: `GET /menu/nonexistent → 404` (none exists today — the r112 sweep script asserted it ad-hoc but isn't in CI).

### P3-1 — Health throttle: per-instance dilution makes the real-world bound ≫ 30/min/IP (live-quantified, matches documented design)
Single-client-only bursts of **36 and 38 rapid hits → zero 429s** (twice), because the in-memory bucket is per-lambda-instance (`health/route.ts:10-13` explicitly accepts this: «per-instance only, which is an acceptable bound»). With ≥2 warm instances (observed via differing `uptime` fingerprints: boot 11:07:41 vs 11:07:31), an abuser gets ~30×N free pings; the 43×429 storm only appeared under **concurrent fleet load** (multiple agents sharing the egress IP). Effective bound observed ≈ 30×(2–3) ≈ 60–90/min/IP in practice.
**Fix proposal (optional, if a firm bound is wanted):** Vercel WAF rate-limit rule for `/api/health` (edge-level, no app code), or accept + document. Do NOT move to the DB limiter (fail-closed on DB outage — correctly rejected in code comment). Given it's a documented tradeoff, P3-informational.

### P4-1 — zod default messages leak English on two order-POST shape errors
`{}` → 422 `Invalid input: expected number, received undefined`; `items: []` → 422 `Too small: expected array to have >=1 items` (vs Arabic elsewhere — `orders/route.ts:57,61` lack custom messages on `restaurantId` required + `items.min(1)`). Customer-facing consistency nit, pre-existing pattern (not r118).
**Fix:** add Arabic messages to those two zod rules (e.g. `.min(1, 'أضف صنفاً واحداً على الأقل')`).

### P4-2 — `/menu` now 200 + streamed client redirect instead of 307 (same root cause as P2-1)
r112 documented `/menu → 307 → /menu/al-waha-cafe-demo`. Now 200 (`private, no-cache, no-store`) with the redirect executed via streamed RSC. Browsers still land correctly; link-preview/canonical semantics change slightly. Resolves automatically with the P2-1 fix.

### P4-3 — Mandate-expectation mismatches (documented, no action)
- Empty/invalid-JSON body → **400** (not 422): `request.json()` throws before zod (`orders/route.ts:199`, `api-helpers.ts:107-110`). Sensible.
- Modifier contract violations → **400** (not 422) — the shipped unit contract (`r118-order-modifier-contract.test.ts:106,124,140`). Sensible (business-rule vs shape).
- `POST /api/auth/login` without `X-Client-Type` → 403 CSRF (not 401) — expected (login is only mobile-exempt; browsers must send Origin+token).

---

## 3. r118 behaviors NOT verifiable without auth — verified via CODE (file:line at 92611477)

| r118 item | Code evidence |
|---|---|
| A1-F3 admin bot-token actually saved (masked-value freeze) | `admin/telegram/page.tsx:50-76` — `hasStoredToken` state + typed-token-wins; `botToken: typedToken ? typedToken : undefined` (was frozen `isMasked ? undefined : …`) |
| A1-F1 telegram transport 10s-bounded, never-throwing | `lib/telegram-api.ts:41-49` `telegramApiCall` (10s AbortController, synthetic non-ok Response on failure); broadcast/config/diagnose migrated |
| A1-F2 cancel-race loser no false rejection | `lib/subscription-decisions.ts:47-57,201-205` — reread returns the full already-processed shape (`alreadyStatus`) instead of broadcasting a rejection |
| A2-P2 approver guards | `api/admin/telegram/approvers/route.ts:34,60` + `[id]/route.ts:11` — `requirePermission("MANAGE_SUBSCRIPTIONS")` (was EDIT_SETTINGS) + `logAudit`; self-approval guard `subscription-decisions.ts:66` |
| A2-P3 super_admin PATCH lockout guard | `api/users/[id]/route.ts:50-53` — `target.role === "super_admin" && auth.role !== "super_admin"` → 403 |
| A7-P3 restaurant DELETE has-orders guard + audit (both paths) | `api/restaurants/[id]/route.ts:274-279,304` (409 + logAudit) and `api/owner/restaurants/[id]/route.ts:111-116,145` |
| A7-P3 modifier order-time snapshot | `orders/route.ts:248-254` optionsById map → `buildModifierSnapshot` (`lib/order-modifiers.ts:120-130`); reader accepts both formats (`order-modifiers.ts:139-169`) |
| A3-P2-1 whatsapp invoice modifier deltas | `api/whatsapp/generate/route.ts:76-102` — `parseStoredModifiers` + الإضافات lines |
| A3-P2-3 inactive-category items not orderable | `orders/route.ts:211-215` (`category: { is: { restaurantId, isActive: true } }`), same filter in `api/public/menu/[slug]/route.ts:77` + menu page r118 diff |
| A1-P3 webhook secret trim at registration source | `api/telegram/config/route.ts:81` (`?.trim()`) matching the trimmed compare (`webhook/route.ts:199`) |
| A8-P1 CI triage + no self-cancel | `.github/workflows/ci.yml:34-79` (always-run triage job, heavy jobs `needs: triage` + `if: needs.triage.outputs.code == 'true'`, job-level concurrency) + `scripts/ci-triage.mjs` |
| B2 cart undo lifecycle / notes budget | `store/cart.ts:181-198` (undoRemove restaurant guard), `:100/178` (lastRemoved reset in clearCart), `cart/DeliveryAddressField.tsx:22` (`maxLength={360}`), per-item notes 500 |
| B3 chime singleton / qr states / item-form caps | `lib/chime.ts:19-26` (`getSharedAudioContext`), `admin/qr/page.tsx:34-37,104` (loading/error/empty), owner item form maxLengths (100/100/1000) |
| B5 zustand persist v1 + migrate | `store/cart.ts:239-244` (`version: 1, migrate: …`) |
| Dedupe of duplicate modifier ids | `orders/route.ts:224-228` (`[...new Set(...)]`) — deliberately NOT live-probed (a valid selection would create a real order) |

Not verifiable even by code here (runtime/CI-only): the CI behavioral change (Actions API 404 on this PAT — documented r114/r117), Telegram 429 `retry_after` surface, and the admin UI save UX.

---

## 4. Bottom line
- **r118 batch is LIVE and behaving as designed** on every unauthenticated surface probed: modifier contract (money-path) enforced with Arabic errors, CSRF negative paths intact, health throttle deployed (429s observed), terms/privacy ISR cached, safeRedirect closed, security headers complete.
- **One live regression found: P2-1 soft-404 on `/menu/[slug]`** caused by r118-B3 re-adding `menu/loading.tsx` (a file commit 35924222 had deleted precisely to keep real 404s). One-line fix + missing regression test.
- No P1. No production data created. No secrets printed.
