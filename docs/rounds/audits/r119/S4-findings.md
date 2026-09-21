# S4 — Security Red-Team Pass 2 (round r119)

Agent: S4 · Scope: fresh attack angles NOT covered by r118's 66-route IDOR matrix · Repo @ 92611477 (deployed — /api/health commitSha match verified live) · READ-ONLY: no repo files modified, no production data created.

**Verdict: 0×P1, 0×P2, 3×P3, 5×P4.** The r118 hardening (B1–B5) holds under every fresh angle probed. The most practically exploitable issue is **P3-3 (public order-creation flood via IP rotation)**.

---

## P1 — none.

## P2 — none.

---

## P3 findings

### P3-1 · `/menu/<bogus-slug>` serves HTTP 200 soft-404 (ISR-cached, bot-visible) + unauthenticated on-demand ISR render/cache-fill per unique slug
**Evidence (live, 2026-09-21):**
```
curl -sS https://menu.smart-link.ly/menu/no-such-restaurant-xyz
→ HTTP/2 200 · x-nextjs-prerender: 1 · cache-control: public, max-age=60, s-maxage=60, swr=86400
  <title>الرببط الذكي | Smart Menu — …</title>  (site default title, body contains the 404 UI)
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1…)" …/menu/no-such-restaurant-xyz → [200]
```
**Why:** `src/app/(public)/menu/[slug]/page.tsx:53,136` calls `notFound()`, but the segment has `loading.tsx` (Suspense boundary) — the 200 shell flushes before the existence gate resolves, so the status can't change. The claim in `src/proxy.ts:111-113` ("menu/[slug] keeps REAL 404s for bots — no loading boundary") is **stale/false in production**. The API twin is correct (400 regex-guard `route.ts:30`, 404 nonexistent — both verified live).
**Impact:** (a) SEO: infinite 200-URL space indexed with the site's default title — link-farm/SEO-spam on the production domain; (b) cost: every unique bogus slug triggers a full SSR render incl. a Prisma `getRestaurantBySlug` query and lands as a CDN/ISR cache entry — unthrottled, unauthenticated, unbounded (same class as the r118-A4 health issue, but page-side).
**Fix:** remove the per-slug `loading.tsx` boundary (or restructure so the existence gate resolves before any flush, e.g. PPR with the gate outside the Suspense shell), and add the same cheap `/^[a-z0-9-]{1,100}$/` regex guard the API route uses before the DB lookup.

### P3-2 · `/api/health` throttle: raw `X-Forwarded-For[0]` read (trust-model bypass off-Vercel) + per-instance multiplication (limit × #warm lambdas)
**Code:** `src/app/api/health/route.ts:38-41` reads `x-forwarded-for` FIRST entry then `x-real-ip` directly — NOT via `getClientIp()` (src/lib/client-ip.ts), the platform's single source of truth for exactly this problem (its header comment documents the spoofing class). On **Vercel** the platform overwrites/strips client XFF, so prod is safe by accident (live-proven below); on **standalone/self-hosted** (repo ships `output:'standalone'` + reverse-proxy example, TRUST_PROXY_DEPTH default 1) a client rotates spoofed XFF[0] values → fresh 30/min buckets per request → the throttle is fully bypassable and can even burn arbitrary "victim" keys.
**Live evidence (prod):**
- 33 same-IP requests → `200 ×33`, **zero 429** → the in-memory Map is per-lambda-instance; effective cap = 30/min/IP/instance (multiplied across warm instances — answers the mandate's "multiple lambdas = limit multiplied?" with YES).
- 20 requests with rotating spoofed `X-Forwarded-For: 10.77.X.Y` → `200×14, 429, 200×5` — the 429 proves the bucket keyed on my REAL IP (Vercel stripped my header), i.e. XFF spoofing does **not** work on Vercel (but the raw read is still the wrong pattern and bites any non-Vercel deploy).
**Impact:** prod: minor (SELECT 1 cost ×N instances); self-hosted: throttle fully bypassable — unbounded `SELECT 1` compute burn.
**Fix:** one line — `const ip = getClientIp(request)` (import already trivially available; keeps fail-closed canonicalization). Per-instance multiplication is documented-accepted in the route comment (r118-A4-P3) — leave as is, or key on a tiny in-memory global + accept.

### P3-3 · Public order creation is anchored ONLY to IP (`order:${ip}`, 30/min) — rotation defeats it; no per-restaurant / per-phone ceiling
**Code:** `src/app/api/orders/route.ts:19,196` — `orderDbLimiter.check(\`order:${ip}\`)` is the ONLY limiter on the anonymous money-path POST. The login route solves this exact problem with a rotation-proof backstop (`acct:${username}`, login/route.ts:104) — orders has no analogous anchor (no per-restaurant bucket, no phone-based dedupe; `idempotencyKey` is optional and client-supplied).
**Attack:** an IPv6 client (a /64 gives 2⁶⁴ addresses) or proxy rotator creates unbounded garbage orders against any restaurant. Each accepted order = Order+OrderItem rows + Telegram `notifyEvent` fan-out + owner dashboard noise + loyalty/referral side-effects (all server-re-priced, so no money theft — but persistent data pollution + notification spam + Neon write amplification).
**Fix:** add a second DB limiter keyed per restaurant (e.g. `order-rest:${restaurantId}`, 100–200/min — real menus see single-digit order/min) and/or short-window dedupe on (restaurantId, customerPhone, items-hash) when a phone is provided.

---

## P4 findings

### P4-1 · `owner/restaurants/[id]` PATCH is the ONLY menu-mutating path missing `revalidateMenu`
`src/app/api/owner/restaurants/[id]/route.ts:69-76` updates restaurant `name/description/isActive` with no cache purge. Full coverage matrix (verified exhaustively):
| Mutation | revalidateMenu |
|---|---|
| items POST/PUT/DELETE (items/route.ts:304, items/[id]:241,293) | ✓ |
| categories POST/PUT/DELETE (categories/route.ts:139, [id]:57,102) | ✓ |
| settings batch+single incl. logo/gallery (settings/route.ts:212,222) | ✓ |
| restaurants/[id] PUT+DELETE (249, ~299) | ✓ |
| reviews POST/DELETE (225,301) | ✓ |
| **owner/restaurants/[id] PATCH** | **✗** |
| demo/fix-images (dev-only, prod 404 verified) | n/a |
Impact bounded: mobile API unaffected (restaurant row queried OUTSIDE the Data Cache, route.ts:38-56), web `/menu/[slug]` ISR stale ≤60s (the documented fallback bound). **Fix:** `await revalidateMenu(restaurantId)` after the transaction.

### P4-2 · `/api/auth/login` returns **500** on malformed JSON (register/orders correctly return 400)
Live: `POST /api/auth/login` `{bad json` (x-client-type: mobile) → `500 {"حدث خطأ في الخادم"}`; register with the same body → `400 "بيانات غير صالحة — خطأ في صيغة JSON"`. Cause: login's catch (login/route.ts:190-192) returns a generic 500 directly instead of `handleError`, which maps JSON parse errors to 400 (api-helpers.ts:108-110). Impact: alert/log-noise fatigue, 500s on trivially malformed input. **Fix:** route the parse error through `handleError` (or map to 400 like register).

### P4-3 · mobile `pnpm audit`: 2×HIGH `image-size ≤2.0.2` (dev-only transitive)
```
HIGH  image-size@1.2.1 — ICNS parser infinite-loop DoS  — GHSA-w3rx-r6r6-pgpr
HIGH  image-size@1.2.1 — JXL/HEIF parser infinite loops — GHSA-5p2g-fcmc-qvqq
```
Chain: `metro@0.82.5 → @react-native/community-cli-plugin → react-native@0.79.6 → expo@53.0.27`. **Dev/build toolchain only — not compiled into the APK**; the DoS requires feeding crafted images to the bundler at build time. Root workspace audit: **0 vulnerabilities**. **Fix:** `pnpm.overrides: { "image-size": "^2.0.3" }` in mobile/package.json (or wait for a metro bump).

### P4-4 · Upload magic-byte check accepts generic HEIF (correctness nit, not exploitable)
Replicated the exact AVIF logic (`upload/route.ts:48-71`) and ran 14 edge cases (evidence: `avif-edge-cases.txt`): fail-closed holds for out-of-box compat brands, truncated ftyp, HEIC(major `heic`), SVG, text. Two accepted quirks: a `mif1`/`miaf`-major file with NO avif brand passes (generic HEIF ≠ AVIF — some browsers won't render), and magic/declared-type mismatch within the image family is allowed (e.g. AVIF bytes declared `image/jpeg`). No security impact: both layers (magic + content-type allowlist) constrain to raster image types; SVG/HTML can never pass. Path traversal: none — filename fully server-generated `restaurants/{sessionRestaurantId}/{ts}-{uuid8}` (route.ts:76-77). Blob serving headers not live-verifiable (current live menus use Unsplash URLs only, zero blob URLs found).

### P4-5 · Accepted-by-design notes (documented, no action)
- Register 409 distinct messages = username/email enumeration (standard availability-check UX; login itself is fully equalized — identical 401 + DUMMY_HASH KDF burn, and `pbkdf2Sync` is synchronous so the `void verifyHash(...)` fire-and-forget at login/route.ts:91 still burns the ~290ms synchronously).
- `item-review:${itemId}` 30/h ceiling (reviews/route.ts:261) is GLOBAL-per-item — one IP can burn it (5/min sustained ≈ 30 in 6 min) and block all reviews on an item for the hour window (round87-A7 anti-brigading tradeoff).
- `x-client-type: mobile` CSRF skip for `/api/auth/login` + `/api/orders` (csrf.ts:84-87): not cross-site triggerable (custom header ⇒ CORS preflight fails; forms can't set headers), and both paths have no victim session to abuse.

---

## Verified clean (mandate checklist)

1. **Data Cache poisoning** — key `[public-menu-${id}, slug]` (public/menu/[slug]/route.ts:149) can't collide cross-tenant (both components jointly unique); **live 3-restaurant test: 0 id overlap, each slug served its own restaurant** (restId 102/103/104, cats/items disjoint, evidence `menu-cache-cross-tenant.json`). Tag `public-menu-${restaurantId}` (menu-cache.ts:42) matches producer id exactly; `revalidateMenu` is awaited (synchronous-publish, r92) → zero stale window on covered paths. 404/429 never cached (limiter + existence gate precede `unstable_cache`; `force-dynamic` + live-verified `cache-control: public, max-age=0, must-revalidate` ⇒ no CDN layer above the Data Cache). `admin/stats` cache: platform-wide payload, `requirePermission` strictly outside cache scope — no per-tenant data, no auth caching.
2. **Rate-limiter key composition** — all ~30 `createDbRateLimiter` call sites enumerated (see grep evidence): every key is a `scope:` prefixed composite; upload mixes ip+userId in both directions (upload/route.ts:29); login layers `ip:username` (10/min) + `acct:${ip}:${username}` (20/15min) + `acct:${username}` backstop (20/15min) — IP rotation cannot reset the account budget (the backstop exists for exactly this). `getClientIp` (client-ip.ts:101-119) on Vercel trusts platform-controlled `x-real-ip`/last-XFF only; canonicalizes `::ffff:` mapped v4 and bracketed v6 (one client can't hold two buckets); invalid literals collapse to `unknown` (no key-injection).
3. **Zod strictness / mass assignment** — **zero** `.strict()`/`.passthrough()` in the codebase (default = strip unknown keys). Every Prisma spread audited: all `data: body` sites spread the **post-zod** object (categories/[id]:48, telegram/broadcast-targets/[id]:26, orders/[id]:152/231); conditional spreads are field-whitelisted (settings RESTAURANT_FIELDS 23-36 + SLUG_RE + `mediaUrlError` tenant check, profile, system-events). `role`/`isSuperAdmin`/`price` cannot inject: register hardcodes `role:'USER'` (register/route.ts:75); users/[id] role/restaurantId changes are super_admin-only + super_admin-target guard (users/[id]:33-54); order prices are recomputed server-side (client `price` field dropped from the schema entirely, orders/route.ts:35-38,207-218).
4. **Prototype pollution** — no deep-merge/`Object.assign(body…)` anywhere; webhook uses native `request.json()` with typed field access only (no merge); upload formData reads a single File; both zustand persist stores (web cart v1+migrate+skipHydration, mobile cart) rehydrate via JSON.parse + zustand's own-property merge (spread semantics = DefineOwnProperty — a `__proto__` key in persisted JSON becomes an inert own property, never touches Object.prototype); cart prices re-priced server-side regardless.
5. **Session/auth edge** — cookie: httpOnly, Secure(prod), SameSite=lax, path=/ (session.ts:62-68); token UUIDv4 stored only as SHA-256 hash; 24h sliding renewal clamped to a 7d absolute cap, expired rows deleted on sight; logout deletes the DB row with retry + clears cookie (bearer tokens die with it); password change verifies current password + revokes all other sessions (admin/profile:86-117); PBKDF2-SHA512 600k iters / 64B key / 32B salt + timingSafeEqual + transparent rehash; login enumeration closed (identical 401 + equalized KDF timing).
6. **Timing-safe comparisons** — webhook secret (webhook/route.ts:213), verify-token HMAC sig (:293), CSRF double-submit (csrf.ts:126), cron bearer (secure-compare.ts:9), password hash (hash.ts:54) all use `timingSafeEqual`; grep for raw `===` on secrets/tokens: none.
7. **Upload route** — re-verified r91 hardening (P3-4 above for residual quirks): AVIF box-bounds scan is fail-closed (out-of-box brands rejected), WebP offset fixed at slice(16,24), content-length guard before body parse, 5MB cap (Vercel platform 413 live-verified with a real 6MB body), auth+CSRF precede parsing.
8. **Live negatives (all pass)** — 403 CSRF (no-Origin, evil-Origin, mismatched double-submit); matched cookie+header passes CSRF then correctly 401s at auth (layering proven); 401 on /api/admin/{stats,audit-logs,config}, /api/cron/* (bogus bearer included); 400 regex + 404 nonexistent on bad slug API; 405 TRACE; 204 OPTIONS with Allow header; /api/demo 404 in prod; /api/telegram/webhook 403 on bad secret, 405 on GET. Security headers complete on all 5 probed routes (/, /login, /menu/al-waha-cafe, /api/health, /.well-known/assetlinks.json): HSTS, nosniff, XFO DENY, CSP (nonce+strict-dynamic on dynamic pages, static policy on ISR pages), COOP/CORP, Referrer-Policy, Permissions-Policy. assetlinks.json = package name + 2 cert fingerprints only; /api/health = status/commitSha/latency only, no secrets.
9. **pnpm audit** — root: 0 vulnerabilities (all severities 0). mobile: P4-3 above (2 HIGH, dev-only).

## Artifacts in /home/z/my-project/audit/r119/
- `S4-findings.md` (this file)
- `menu-cache-cross-tenant.json` — 3-slug fetch + id-disjointness proof
- `avif-edge-cases.txt` — 14-case magic-byte matrix replication output
- `health-throttle-live.txt` — per-instance multiplication + XFF-spoof-fails-on-Vercel evidence
- `csrf-matrix.txt` — full CSRF positive/negative matrix
- `headers-5-routes.txt` — header capture on 5 routes
- `audit-root.json` / `audit-mobile.json` — pnpm audit raw output
