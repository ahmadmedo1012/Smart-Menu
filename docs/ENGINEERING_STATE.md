# Smart-Menu — Engineering State

> **This file is the cross-session source of truth.** Conversation memory may
> disappear between sessions; this document, Git history, and
> `docs/rounds/` are what persists. Update it after every meaningful batch:
> at minimum — completed work, discovered/remaining issues, tests executed,
> deployment state, last verified commit, and the next recommended actions.

---

## Current snapshot

| Field | Value |
|---|---|
| Last verified commit | **see "Verification log" below for the newest entry** |
| Production | https://menu.smart-link.ly (Vercel, git-integration; `/api/health` reports `commitSha`) |
| Web/API status | PRODUCTION READY (live, CI-gated since r102) |
| Mobile status | Code-complete; **READY FOR REAL DEVICE TESTING** (EAS preview APK per round; no real-device run available in the sandbox) |
| Unit tests | 1930/1930 (132 files — r103: 1908 → 1930, +22 for this round's fixes) |
| CI | 3 jobs: `lint-build-test` (blocking), `mobile` (blocking, added r103-D6), `prod-qa` (advisory artifacts on main pushes) |

## Architecture (stable reference)

- **Stack**: Next.js 16 (App Router, standalone output) · React 19.2.8 · Prisma 7.8 + PostgreSQL (Neon) · Tailwind 4 · shadcn/ui base-nova · Zustand (cart) · pnpm 11.9.0 (web) / Expo SDK 53 + RN 0.79.6 + pnpm 10.34.5 (mobile, hoisted node-linker).
- **Full architecture/API/conventions**: `PROJECT.md` (authoritative). Agent rules: `CLAUDE.md`.
- **Auth**: session cookie (SHA-256 at rest, 24h sliding) + optional Bearer (mobile) · PBKDF2-SHA512 600k · CSRF double-submit + origin allowlist (mobile unauth exemptions: `/api/auth/login`, `/api/orders` ONLY) · DB-backed rate limits (fail-closed).
- **Data**: 25 models (see `prisma/schema.prisma`); tenant isolation via `restaurantId` + `UserRestaurant` multi-menu links.
- **Ops**: `docs/ops-runbook.md` (PITR/rollback/incidents).

## Round history (recent, newest first)

- **r103 (2026-09-12)** — fresh-clone full audit + 24 fixes. See "r103 fix batch" below.
- **r102 (2026-09-11)** — ultimate audit: 20 fixes (web W1-W5, API A1-A5, mobile M1-M13), deployed `174719b4`, live regression green, CI SUCCESS, EAS APK (90.4MB). Report: `docs/rounds/closures/` + session worklog.
- **r100-r101** — EAS-ready mobile build, public menu API for unauthenticated flow, mobile zero-warning pass.
- **r97-r99** — docs reorganization, measured baselines, deploy determinism.
- Full history: `docs/rounds/` (110 files) — golden rule: *archive is a decision log — move, never delete*.

## r103 fix batch (this round — details in code comments tagged `r103-*`)

**Web/API**
- F1 (P1): `/admin/menu` was permanently empty — `GET /api/items` 400'd every unscoped request since round88-wave4 hardening; staff-only unscoped listing restored (round87-B9 console contract; owners/USER/anonymous still need scope).
- F3 (P2): rejected PAID subscription retry dead-end — `/api/subscriptions/validate` now accepts the authenticated user's own username; the subscribe page skips register when already that user.
- F4 (P2): free self-registration could snipe a slug reserved by a PENDING paid payment → payer permanently locked; the restaurants POST path now 409s reserved slugs (same semantics as the subscriptions path).
- F5 (P2): reviews had no moderation — added owner/staff `DELETE /api/items/[id]/reviews?reviewId=` (set-based counter recompute + revalidate) + owner UI delete; rating is now `.int()` (4.5 → clean 422).
- F2 (P2): loyalty redeem had NO UI — added the counter-side RedeemPanel (phone lookup → POST `/api/loyalty/redeem`) on the owner loyalty page; the stamp-card promise is now redeemable.
- F6 (P3): `/api/users` was role-gated only — zero-permission sub_admins could enumerate every owner; now requires MANAGE_USERS for sub_admins (API + UI gate).
- F7 (P3): categories `icon`/`nameAr` unbounded → capped (200/100) on create + update.
- F8 (P3): `wa.me/null` link on invalid stored whatsapp (MenuHero) — normalize-first render guard.
- F12 (P3): customer-facing order errors leaked raw DB ids → actionable Arabic copy.
- N3 (P2): cross-restaurant cart mixing dead-ended checkout (web+mobile) — store keeps the cart's own restaurant authoritative; addItem reset lands on a FULLY consistent state (new whatsapp/name); toast on switch.
- N5 (P3): cron/cleanup 4th block still leaked `String(e)` → A4 contract.
- N9 (P3): `/cart` stopped sending dead client money fields (companion to r102-A5).

**Mobile**
- N1 (P1): cold launch on flaky network wiped the stored session (meRequest swallowed errors → bootstrap treated it as logged-out) — token now destroyed ONLY on definitive 401.
- N2 (P2): OwnerQr retry dead-ended into an eternal spinner (deps `[]` effect) — hoisted `load` callback.
- N4 (P2): checkout WhatsApp-open failure showed a misleading error and a retry created a DUPLICATE order — idempotencyKey + non-fatal wa-open + retry button on OrderConfirmed.
- N6 (P3): toast/success/saffron surfaces aligned to the web palette (#23a136/#e62b34/#348dcf/#f0a646).
- N7 (P3): authed overlay no longer replays the launch URL after a login stack-swap.
- N10 (P3): fallback items path mapped `isAvailable: true` (was: every card grayed out).
- N11 (P3): `order-confirmed?orderNo=X` deep links match the linking config now (screen reads orderNo).
- F9 (P3): FloatingWhatsApp strips `00` prefix + validates 8-15 digits.

**Infra**
- D1: mobile `pnpm-workspace.yaml` now carries the root's security overrides (postcss 8.5.26, decode-uri-component ^0.5.0) — mobile advisories 8 → 3 (remaining: image-size ×2 high build-time NO PATCH EXISTS, uuid moderate build-time iOS-only).
- D2: vitest ≥4.1.11 (dev advisory cleared).
- D5: `dotenv` added as devDep — `prisma.config.ts`'s `import "dotenv/config"` was unresolvable under pnpm isolation (masked on Vercel/CI where env vars are injected).
- D6: **new `mobile` CI job** (typecheck + lint + Metro export blocking, expo-doctor advisory) — mobile regressions can no longer land silently.

## Known issues / deferred work (honest ledger)

1. **Mobile: no real-device test** in the sandbox — all mobile verification is static+bundle-level; the EAS preview APK is the vehicle for manual device testing (install → browse → item detail w/ modifiers → order → WhatsApp → owner login → QR).
2. `idempotencyKey` shares a GLOBAL namespace (theoretical squat) — no client sent one before r103-N4; the mobile app does now (random 14-char). Web `/cart` still doesn't send one (double-click guard is client-side only). **Next step**: web checkout idempotencyKey + namespacing decision.
3. Web QR page still renders via `api.qrserver.com` (third-party) — self-host option documented since r102-W6; changing it without visual-preview ability was judged riskier than the benefit. Mobile already renders QR locally (`react-native-qrcode-svg`).
4. Remaining mobile advisories: `image-size` (2 high, metro build-time, **no patched version exists** — unfixable until metro bumps), `uuid` 7.0.3 (moderate, iOS xcode build-time only; overriding broadly risks breaking metro consumers).
5. Mobile full menu CRUD / branches / reviews management / loyalty detail / admin screens remain web-first by design (documented parity gap, not a defect).
6. `text-[10px]` micro-typography (×92 sites) + container-token polish — unclaimed.
7. Dep upgrades deliberately deferred: TS 7 (native rewrite), eslint 10 (flat-only), motion 13, knip 6 (documented pins), expo SDK 53→54+ migration, coordinated zod 4.3.6→4.6 web+mobile.
8. owner/reviews caps at `pageSize=100` with no pagination UI (comment claims it covers the tenant set; >100 reviews would truncate — fine for current data volumes).
9. `/api/upload` chunked-body bypass (no content-length) — Vercel's ~4.5MB platform cap covers production; a self-hosted Docker deployment would need a stream limit.

## Environment / verification recipes

- **Local PG**: `bash scripts/pg-local-start.sh` (embedded-postgres binaries at `/home/z/pg-native`, port 5434, DB `smartmenu`).
- **Local .env**: set `DATABASE_URL` to the URL `scripts/pg-local-start.sh` prints on its final line (local-only trust auth; the exact string is intentionally not duplicated here — the secrets gate flags credentialed PG URLs) + `AUTH_SECRET`/`JWT_SECRET`/`NEXT_PUBLIC_DOMAIN`/`NEXT_PUBLIC_WHATSAPP_NUMBER`/`SKIP_ENV_CHECK=true`. Note: the sandbox exports a container-level `DATABASE_URL` (file:…) that dotenv will NOT override — prefix commands explicitly.
- **Gates**: `pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL=… pnpm build`; mobile: `pnpm typecheck && pnpm lint && npx expo-doctor && npx expo export --platform android`.
- **Local e2e sweep**: `bash scripts/r92-e2e-local.sh "<playwright args>"` (server+tests in ONE session — the sandbox reaps node between commands).
- **EAS APK**: `eas build --platform android --profile preview --non-interactive` (EXPO_TOKEN in env; never in repo).
- **Deploy**: push to `main` → Vercel git-integration. If the build stays BLOCKED (stale concurrency entry — happened r102): create a deployment via the Vercel API with the VERCEL_TOKEN, then cancel the stale one.

## Verification log (append newest first)

- **r103 (2026-09-12) — DEPLOYED**: commit `cb8e781f` (fix batch `ff97a777` + CI fix) LIVE on production via API deployment `dpl_DjJnUDSnDAsoFx9yRqMvEGgL` (git-integration BLOCKED by the stale-concurrency entry again — cancelled, per the documented runbook). `/api/health`: sha cb8e781f, db connected. Gates: TS 0 · lint 0 errors · 1930/1930 unit · build OK · mobile TS/lint/doctor 18/18 + Metro export 7.56MB · secrets PASS · api-auth PASS. CI: mobile job **SUCCESS**, prod-qa **SUCCESS**. LIVE REGRESSION: pages 200, security negatives intact (401/403), anonymous items still 400 (F1 scope preserved), F12 new copy live, full order journey 201 (`ORD-MTXCK5X4-8EB096DE`, برجر الواحة ×2 + الحجم modifier, server-priced, notes carried). EAS preview APK build `6691ae92` on cb8e781f.
- **r103 (2026-09-12) — pre-deploy**: fresh clone @ `174719b4` — TS 0 / lint 0 (10 legacy warnings) / 1930-1930 unit / production build OK (local PG) / mobile TS+lint+doctor 18/18 + Metro export 7.56MB. Live repros: F1 (400 on the admin probe), F8 (wa.me/null in code; ISR made the live grep stale). F13 (print/isActive) REFUTED live — parent layout gate 404s correctly (agent false positive). 24 fixes applied + 22 new unit tests + 3 test-contract updates (rbac-matrix, r92-cleanup-ratelimit, regression-sweep/restaurants-create mocks).

---

## Next recommended engineering actions

1. Deploy r103 (push → CI green → verify `/api/health` serves the new SHA) + live regression sweep of the fixed flows (admin/menu list, subscribe retry, review delete, loyalty redeem, cart switch).
2. Rebuild the EAS preview APK on the r103 commit and run the manual real-device pass (see the mobile checklist in item 1 of the ledger).
3. Web checkout `idempotencyKey` (mirror mobile N4) + namespacing decision for the key.
4. Self-hosted QR render on the web owner QR page (retire `api.qrserver.com` — the `qrcode` dep is already installed).
5. Consider a subscribe-page e2e spec for the rejected-payment retry path (currently unit-covered only).
