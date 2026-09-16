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
| Last verified commit | **`c6a065cf`** (2026-09-12 — r104 final: crash fix + assetlinks; production serves it, CI SUCCESS, EAS APK `4c872f91` FINISHED + emulator-verified) |
| Production | https://menu.smart-link.ly (Vercel, git-integration; `/api/health` reports `commitSha`) |
| Web/API status | PRODUCTION READY (live, CI-gated since r102) |
| Mobile status | **r104: STARTUP CRASH FIXED AND FULLY VERIFIED** — the official EAS APK (4c872f91, from the fix commit) installs, launches, renders, and runs on a real Android system (API 24 emulator). App Links (assetlinks.json) now served live. |
| Unit tests | 1934/1934 (132 files — r103: 1908 → 1930; r106: +4 per-item quantity-cap regression tests) |
| CI | 3 jobs: `lint-build-test` (blocking), `mobile` (blocking, added r103-D6), `prod-qa` (advisory artifacts on main pushes) |

## Architecture (stable reference)

- **Stack**: Next.js 16 (App Router, standalone output) · React 19.2.8 · Prisma 7.8 + PostgreSQL (Neon) · Tailwind 4 · shadcn/ui base-nova · Zustand (cart) · pnpm 11.9.0 (web) / Expo SDK 53 + RN 0.79.6 + pnpm 10.34.5 (mobile, hoisted node-linker).
- **Full architecture/API/conventions**: `PROJECT.md` (authoritative). Agent rules: `CLAUDE.md`.
- **Auth**: session cookie (SHA-256 at rest, 24h sliding) + optional Bearer (mobile) · PBKDF2-SHA512 600k · CSRF double-submit + origin allowlist (mobile unauth exemptions: `/api/auth/login`, `/api/orders` ONLY) · DB-backed rate limits (fail-closed).
- **Data**: 25 models (see `prisma/schema.prisma`); tenant isolation via `restaurantId` + `UserRestaurant` multi-menu links.
- **Ops**: `docs/ops-runbook.md` (PITR/rollback/incidents).

## Round history (recent, newest first)

- **r109 (2026-09-16) — THE FIX BATCH (F1+F2+F9+F10 + N1+N2), tokens re-provisioned.** Ships every open P2/P3 code fix from the r105-r108 audit lineage (commit tags inside this batch read `r106-*` — same session, round renumbered to match the audit log):
  - **F1** quantity cap 99 (see below).
  - **F2 (P2, WhatsApp delivery)**: `normalizeWaNumber` now converts Libyan LOCAL trunk format to international — a leading `0` can never start valid E.164, and `wa.me/0912345678` was rejected by WhatsApp so orders to local-number restaurants NEVER reached them (live-proven r107/r108). `0912345678 → 218912345678` (9-11-digit locals only; shorter stays null). One root fix covers all 7 callers (cart checkout, order-confirmed, money-path whatsapp/generate, MenuHero, Footer, FloatingWhatsApp, ReferralCard).
  - **F9 (P2, required-modifier bypass)**: the builder let «إلزامية» save `required:true` with `minSelect:0` while the public dialog enforces `minSelect>0` ONLY → «اختياري» + orders accepted without the required modifier (proven r108 ORD-MU31MBIC-B14E7AA1). Fixed at THREE layers: `modifierGroupCreateInput` enforces the invariant server-side (required+min<1 → 1; min>0 → required), the builder UI syncs both controls live in both directions, and migration `zz_round109_required_minselect_sync` repairs existing rows. +5 regression tests.
  - **F10 (P2, fallback invoice)**: `/cart` stashes the FULL itemized receipt in sessionStorage keyed by orderNo; the order-confirmed «إرسال عبر واتساب» fallback re-sends THAT invoice instead of a bare thank-you note.
  - **N1**: web checkout `idempotencyKey` (`W…`-namespaced; reused on ambiguous-failure retry → inert `{already:true}` instead of duplicate; retired after confirmed success).
  - **N2**: `api.qrserver.com` RETIRED — shared `<SelfHostedQR>` (data URL, same brand colors, `data-testid="qr-code"`); downloads via `qrPngDataUrl()`; r93+round79 e2e specs repointed.
  Gates: web TS 0 · lint 0 · **unit 1941/1941 (133 files)** · mobile TS 0.

- **r109 (2026-09-16) — F1 FIXED: per-item quantity cap 99.** The r105 live audit proved POST /api/orders accepted `quantity: 100000` (order `ORD-MTYRCU8K-08FC9731`, 1.8M د.ل) — `zod` had `.int().positive()` but no ceiling. Fix lands at every layer with ONE source of truth (`MAX_ITEM_QUANTITY = 99` in `src/lib/constants.ts` + mobile twin): API schema `.max(99, 'الحد الأقصى 99 وحدة لكل صنف في الطلب')`, web cart store (`updateQuantity`/`addItem` clamps — the slider/page steppers were already capped in OrderDialog but the STORE accepted anything from localStorage), web cart steppers disable at the cap (CartSlideOver + CartLineItem), mobile store clamps + MenuScreen steppers/cart-lines disable with 0.4 opacity. 4 regression tests pin 100000→422 / 100→422 / 99→201 / 0,-1,1.5→422. Gates: web TS 0 · lint 0 · **1934/1934** · mobile TS 0.

- **r104 (2026-09-12)** — **THE MOBILE STARTUP CRASH, root-caused and fixed on a real Android system.** Built an Android 7.0 (API 24) x86_64 emulator inside the sandbox (TCG software emulation; system image sparsified; ext4 data partition formatted with Android-7-compatible features — `metadata_csum`/`64bit` must be OFF, Hermes-side details below) and ran the actual EAS-built APK: it **installed fine, launched, then crashed 17s in** with `JavascriptException: [runtime not ready]: TypeError: Cannot read property 'prototype' of undefined` → symbolicated via a dev-bundle swap → **`src/lib/arabic-plural.ts:39` `new Intl.PluralRules('ar')` at module scope** (r90-F4 regression). **Hermes does not implement Intl.PluralRules** → the crash fired on EVERY Android device at startup (web unaffected — browsers/Node have Intl). Fix: pure-JS CLDR `ar` classifier (identical boundaries; the 14 test pins incl. 101→many / 103→few / 100→many all green), applied to web+mobile for parity. **Emulator re-verification with the fixed bundle: app installs, MainActivity displays in 20s (TCG), RN bridgeless/Fabric runtime healthy, landing screen renders (Arabic RTL, dark+orange), deep link `https://menu.smart-link.ly/menu/al-waha-cafe-demo` routes to the Menu screen, controlled error-state + retry renders when the API is unreachable** (emulator-specific TLS: production serves `ISRG Root YR` without the old-Android DST cross-sign — see known issues). (The 4 react-navigation 'lowercase component' warnings seen during re-verification were an artifact of the dev-bundle swap — see ledger #4.) Gates at r104: web TS 0 · lint 0 (10 legacy warnings) · 1930/1930 · mobile TS 0 · lint 0 · doctor 18/18 · bundle export OK.

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

1. **r104 (2026-09-12): the EAS r103 APK — and every APK since r90-F4 — CRASHED at startup on ALL Android devices** (`Intl.PluralRules` missing on Hermes). Fixed in r104 (see round history) — the EAS preview APK must be REBUILT from the r104 commit; the artifacts from `a4b64552` and earlier are dead-on-arrival. **All prior 'code-complete' mobile rounds were validated by static checks only — the runtime gap is why the app 'did not work'.**
2. **TLS chain vs very old Android** (r104 finding): production serves `*.smart-link.ly` via Let's Encrypt `YR2 ← ISRG Root YR` with NO old-Android (DST Root CA X3 cross-sign) fallback — Android ≤ 7.x with stale trust stores may fail TLS to the API (the emulator on API 24 showed the app's controlled error state + retry, no crash). Modern, updated devices are unaffected. Follow-up: consider Vercel/LE alternate-chain serving or accept the floor; monitor real-device errors.
3. **Android App Links `autoVerify` not effective** (r104 finding): deep links on API 24 open the chooser (no `/.well-known/assetlinks.json` served with the SHA-256 fingerprint of the app's signing key). Follow-up: publish assetlinks.json + set `expo-build-properties` androidIntentFilters assetlinks metadata.
4. ~~4 react-navigation warnings~~ **RESOLVED as a non-issue (r104 follow-up)**: the 'lowercase component' warnings were an artifact of the dev-bundle swap used for symbolication (expo's dev static-export renames local bindings — `PricingScreen` becomes local `v`); the actual source registers properly-named components, and release builds strip dev warnings entirely. No code change needed.
5. **Mobile: no real-device test** — r104 upgraded verification to a real Android system (API 24 emulator: install → launch → render → deep-link → error-state), but a physical modern device pass (browse → item w/ modifiers → order → WhatsApp → owner flows) remains the final vehicle.
6. `idempotencyKey` shares a GLOBAL namespace (theoretical squat) — no client sent one before r103-N4; the mobile app does now (random 14-char). Web `/cart` still doesn't send one (double-click guard is client-side only). **Next step**: web checkout idempotencyKey + namespacing decision.
7. Web QR page still renders via `api.qrserver.com` (third-party) — self-host option documented since r102-W6; changing it without visual-preview ability was judged riskier than the benefit. Mobile already renders QR locally (`react-native-qrcode-svg`).
8. Remaining mobile advisories: `image-size` (2 high, metro build-time, **no patched version exists** — unfixable until metro bumps), `uuid` 7.0.3 (moderate, iOS xcode build-time only; overriding broadly risks breaking metro consumers).
9. Mobile full menu CRUD / branches / reviews management / loyalty detail / admin screens remain web-first by design (documented parity gap, not a defect).
10. `text-[10px]` micro-typography (×92 sites) + container-token polish — unclaimed.
11. Dep upgrades deliberately deferred: TS 7 (native rewrite), eslint 10 (flat-only), motion 13, knip 6 (documented pins), expo SDK 53→54+ migration, coordinated zod 4.3.6→4.6 web+mobile.
12. owner/reviews caps at `pageSize=100` with no pagination UI (comment claims it covers the tenant set; >100 reviews would truncate — fine for current data volumes).
13. `/api/upload` chunked-body bypass (no content-length) — Vercel's ~4.5MB platform cap covers production; a self-hosted Docker deployment would need a stream limit.
14. **r104 sandbox emulator recipe (reusable)**: API-24 x86_64 image (sparsified `qemu-img convert -O raw` saves ~1.7GB), 6GiB sparse data partition pre-formatted `mke2fs -F -b 4096 -m 0 -O has_journal,extent,huge_file,dir_nlink,extra_isize` (modern mkfs defaults `metadata_csum`/`64bit` are REJECTED by Android-7's kernel), `-accel off -gpu swiftshader_indirect`, full cycle (fresh boot ~75-95s + APK install ~30-75s) must fit ONE 10-min command window — the sandbox reaps background processes unpredictably; adb install must never be killed in-flight (it wedges adbd; recover via `adb emu restart`); release APK swaps of `assets/index.android.bundle` (dev bundle via `expo export --dev --no-bytecode` + hermesc, or release via `expo export`) must keep `.so`/`.arsc`/`.bundle` STORED (`zip -n .so:.arsc:.bundle`) and be re-signed (build-tools zipalign+apksigner).

## Environment / verification recipes

- **Local PG**: `bash scripts/pg-local-start.sh` (embedded-postgres binaries at `/home/z/pg-native`, port 5434, DB `smartmenu`).
- **Local .env**: set `DATABASE_URL` to the URL `scripts/pg-local-start.sh` prints on its final line (local-only trust auth; the exact string is intentionally not duplicated here — the secrets gate flags credentialed PG URLs) + `AUTH_SECRET`/`JWT_SECRET`/`NEXT_PUBLIC_DOMAIN`/`NEXT_PUBLIC_WHATSAPP_NUMBER`/`SKIP_ENV_CHECK=true`. Note: the sandbox exports a container-level `DATABASE_URL` (file:…) that dotenv will NOT override — prefix commands explicitly.
- **Gates**: `pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL=… pnpm build`; mobile: `pnpm typecheck && pnpm lint && npx expo-doctor && npx expo export --platform android`.
- **Local e2e sweep**: `bash scripts/r92-e2e-local.sh "<playwright args>"` (server+tests in ONE session — the sandbox reaps node between commands).
- **EAS APK**: `eas build --platform android --profile preview --non-interactive` (EXPO_TOKEN in env; never in repo).
- **Deploy**: push to `main` → Vercel git-integration. If the build stays BLOCKED (stale concurrency entry — happened r102): create a deployment via the Vercel API with the VERCEL_TOKEN, then cancel the stale one.

## Verification log (append newest first)

- **r106 (2026-09-16) — F1 quantity cap, pre-deploy**: fresh clone @ `0370e3a1` (origin/main; one docs commit past production `c6a065cf`). Fix batch (10 files: API zod ceiling + web/mobile store clamps + 4 stepper disable states + constant twins + 4 regression tests). Gates on the fix branch: web `tsc --noEmit` 0 · eslint (changed files) 0 · **unit 1934/1934 (132 files)** incl. the new cap pins · mobile `tsc --noEmit` 0. Live verification of the deployed cap (422 on 100000/100, 201 on 99) logged below after the push deploys.

- **r104 FINAL (2026-09-12)**: production serves **`c6a065cf`** (API deployment `smart-menu-kznxfge45` after the recurring git-integration BLOCK; health: db=connected). **CI run 34701130344: SUCCESS** on the tip. **EAS build `4c872f91` FINISHED** → `smart-menu-preview-r104.apk` (90.4MB) downloaded + signer SHA-256 verified to match the published assetlinks fingerprint (`7b5dfc9c…d8c12d`) + **installed and launched on the emulator: MainActivity displayed +22s, fabric runtime, process alive, no crash**. `/.well-known/assetlinks.json` LIVE on production (HTTP 200, correct JSON). Live smoke: all pages 200, negatives 401/404 intact.

- **r104 (2026-09-12) — MOBILE STARTUP CRASH FIXED + FIRST REAL RUNTIME VERIFICATION**: fresh clone @ `086c2532` (= r103 final docs commit; production verified serving `a4b64552`, db connected). Built Android 7.0 x86_64 emulator (TCG) in-sandbox → installed the ACTUAL EAS r103 APK (`smart-menu-preview-r103.apk`, 90.4MB): install SUCCESS (pm path + dexopt x86_64 + intent-filter verification in logcat), launch → process up → **crash at 17s**: `JavascriptException: [runtime not ready]: TypeError: Cannot read property 'prototype' of undefined, js engine: hermes` (crash dialog screenshot captured). Symbolication: dev-bundle swap (`expo export --dev --no-bytecode` + hermesc v96 + `zip -n .so:.arsc:.bundle` + apksigner) → crash stack with line numbers → **`mobile/src/lib/arabic-plural.ts:39` `new Intl.PluralRules('ar')`** (r90-F4 regression; Hermes has no Intl.PluralRules; web unaffected). FIX: pure-JS CLDR `ar` classifier in web+mobile (identical files). RE-VERIFICATION on the emulator with the fixed bundle: install SUCCESS (`pm path .../ly.smartlink.smartmenu-2/base.apk`), MainActivity **displayed +20.5s**, RN `Running "main" {..., "fabric":true}`, **APP_PID alive >2min, NO FATAL**, landing screen renders (Arabic RTL dark+orange — VLM-verified screenshot), deep link `https://menu.smart-link.ly/menu/al-waha-cafe-demo` → routes to Menu screen (chooser shown — autoVerify not provisioned; explicit-component launch works), API unreachable on API-24 → **controlled error state + retry renders, no crash** (TLS: prod chain `YR2 ← ISRG Root YR`, no DST cross-sign). Gates: web TS 0 · lint 0 (10 legacy warnings) · **1930/1930** (incl. the 14 arabic-plural pins) · mobile TS 0 · lint 0 · doctor 18/18 · Metro export OK. Evidence: `download/mobile-*.png`, `download/mobile-*-logcat.txt` (in-session artifacts).

- **r103 FINAL (2026-09-12)**: HEAD `a4b64552` (mobile EAS-compat fix on top of the fix batch) — **production serves it** (API deployment after the recurring git-integration BLOCK; stale entries cancelled), `/api/health` sha=a4b64552 db=connected. **CI run 34641877469: ALL THREE JOBS SUCCESS** (lint-build-test incl. full e2e matrix · NEW mobile job · prod-qa). EAS build `a87b1ce7` **FINISHED** → APK validated (90.4MB, manifest+dex) at `smart-menu-preview-r103.apk`. The first EAS attempt (`6691ae92`) failed in seconds with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` (frozen-install overrides comparison on EAS's pnpm) → fixed with exact pins + a `pnpm.overrides` mirror in package.json (pnpm 9 reads package.json, pnpm 10 prefers the workspace yaml — identical values satisfy both). Final live sweep: all pages 200, negatives 401/403 intact, bad slug 404, F12 copy live, public menu 25 items + 2 modifier groups.
- **r103 (2026-09-12) — DEPLOYED**: commit `cb8e781f` (fix batch `ff97a777` + CI fix) LIVE via API deployment `dpl_DjJnUDSnDAsoFx9yRqMvEGgL`. Gates: TS 0 · lint 0 errors · 1930/1930 unit · build OK · mobile TS/lint/doctor 18/18 + Metro 7.56MB · secrets PASS · api-auth PASS. LIVE REGRESSION incl. full order journey 201 (`ORD-MTXCK5X4-8EB096DE`, برجر الواحة ×2 + الحجم modifier, server-priced, notes carried).
- **r103 (2026-09-12) — pre-deploy**: fresh clone @ `174719b4` — TS 0 / lint 0 (10 legacy warnings) / 1930-1930 unit / production build OK (local PG) / mobile TS+lint+doctor 18/18 + Metro export 7.56MB. Live repros: F1 (400 on the admin probe), F8 (wa.me/null in code; ISR made the live grep stale). F13 (print/isActive) REFUTED live — parent layout gate 404s correctly (agent false positive). 24 fixes applied + 22 new unit tests + 3 test-contract updates (rbac-matrix, r92-cleanup-ratelimit, regression-sweep/restaurants-create mocks).

---

## Next recommended engineering actions

1. **REBUILD the EAS preview APK from an r106+ commit** (every APK ≤ r103 is dead-on-arrival from the Intl crash; r106 adds the mobile quantity-cap UX) and run the manual real-device pass: install → browse → item detail w/ modifiers → order → WhatsApp → owner login → QR.
2. Push r104 → CI (3 jobs must stay green) — the web change is behavior-identical (pure refactor of the classifier), but the full e2e matrix is the safety net.
3. ~~App Links assetlinks.json~~ **DONE (r104)**: `public/.well-known/assetlinks.json` committed with the EAS keystore SHA-256 — verify live after deploy, then retest a deep link on the emulator.
5. TLS floor decision for Android ≤7.x (see ledger #2) — monitor or serve the LE alternate chain.
6. ~~Web checkout `idempotencyKey`~~ **DONE (r106-N1)** — `W…`-namespaced, retry-safe lifecycle (reused on ambiguous failure, retired after confirmed success).
7. ~~Self-hosted QR render~~ **DONE (r106-N2)** — both QR pages render via the local `qrcode` package (data URL); `api.qrserver.com` fully retired.
8. Consider a subscribe-page e2e spec for the rejected-payment retry path (currently unit-covered only).
