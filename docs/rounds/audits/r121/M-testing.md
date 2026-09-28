# r121 — Auditor M: Testing / QA

**Scope:** test-program health — inventory, live runs, test quality, coverage-vs-r121-findings map,
flake/volatility, infra. Read-only on code; suites executed. Web scope only (`mobile/` PROTECTED).
HEAD at audit time: `74ef578f` (r120 final, per round README).

---

## 0) Run results (all executed this session)

### Unit (vitest)

```
pnpm test  →  Test Files  141 passed (141)
             Tests        2006 passed (2006)
             Duration     47.02s (transform 2.83s, import 12.34s, tests 17.63s)
```

Baseline **confirmed**: 2006/2006 green, 48.6s wall. No flakes observed on 1 run.

Coverage ratchet (`pnpm test:coverage`, 65s, thresholds 80/74/75/83 on `src/lib`+`src/app/api`):

```
All files | statements 85.44 | branches 79.58 | functions 78.71 | lines 87.57   → PASS
```

Measurable headroom grown since the r92 calibration (82.22/75.56/76.7/84.66) — see M-9.

### E2E (Playwright 1.61.1, one-session pattern: standalone server + tests in ONE bash call)

| Project (files) | Result | Duration | Failures |
|---|---|---|---|
| `security` (rbac-negative, webhook-security) | **21 passed · 1 failed · 3 skipped** | 7.0s | 1× seed-dependency (M-2); 3 skips = documented `TELEGRAM_WEBHOOK_SECRET` gate |
| `api` — api-smoke only (clean run) | **14 passed · 1 failed** | 3.4s | 1× stale 400 pin (M-1) |
| `api` — remaining 5 files (api-sweep, full-sweep, referral-claim, round86-security, loyalty-redeem) | **142 passed · 6 failed · 4 did-not-run** | 1.3m | 5× stale 400 pins (M-1) + 1× seed beforeAll fail, 4 cascade not-run (M-2) |
| `auth-verify` (auth-fix-verification) | **8 passed · 2 failed** | 23.5s | 1× stale 400 pin + 1× admin-password env drift (M-1/M-2) |
| `ui` — ui-smoke + ui-sweep subset | **25 passed · 0 failed** | 15.4s | — |
| `qa-teams` (142) · `round79-c` (6) · `ui` r93/round94-sim files (44) | **NOT RUN** | — | require round83/qa/r93-sim seeds + serial workers; out of session budget |

Totals this session: unit 2006/2006 · e2e 210 passed / 10 failed / 3 skipped / 4 not-run (of 419 listed
across all projects: security 25 · api 167 · ui 69 · auth-verify 10 · qa-teams 142 · round79-c 6).

**Flakes observed:** 1 infra flake — my first api-smoke run showed 2 spurious
`ECONNREFUSED ::1:3000` failures because a standalone server from a *previous* bash call was still
bound (EADDRINUSE for the new one) and the sandbox reaper killed it mid-run. Clean re-run after
`pkill -f standalone/server.js` → 14/1. Lesson recorded in M-6. No test-logic flakes observed; retries
were 0 (local default).

### Root cause of every failure (verified live, not guessed)

1. **Stale 400 pins — r119-B4 unified schema-validation failures to 422** (commit `c4bd21f9`,
   2026-09-21: "schema-validation failures unified to 422 on 6 routes (login/register/subscriptions/
   upgrade/telegram-verify/users)") but 7 e2e expectations were never updated:
   - `tests/e2e/api-smoke.test.ts:47` — login empty body `{}` → expects 400, server returns **422** «يرجى إدخال اسم المستخدم وكلمة المرور» (verified via curl).
   - `tests/e2e/api-sweep.test.ts:71,84,96,108` — register empty/short-username/short-password/missing-name → all 422 now (titles even say "(or 429 if rate-limited)" — 422 was never anticipated).
   - `tests/e2e/full-sweep.test.ts:298` — login empty body → 422.
   - `tests/e2e/auth-fix-verification.spec.ts:41` — register short password → 422 (route `register/route.ts:49`).
   These 7 are red in ANY environment, including CI (which runs all four projects via `pnpm test:e2e`)
   — unnoticed since r119 because **GitHub Actions is billing-blocked** (ledger).
2. **Seed-contract drift (this env, and any env without round83 seed):**
   - `tests/security/rbac-negative.test.ts:170-190` — logs in `waha_owner/waha123456`; local DB is seeded `al-waha-cafe-demo` + `admin/smart123` only → 401 → hard fail (no skip guard, unlike the register-429 skip at :55).
   - `tests/e2e/loyalty-redeem.spec.ts:52-58` — beforeAll login same creds → 1 fail + 4 did-not-run (its error message even asks «بذرة round83 مثبتة؟»).
   - `tests/e2e/auth-fix-verification.spec.ts:97` — `adminPass = SEED_ADMIN_PASS || 'admin123456'`; local contract since r97 (`scripts/r97-admin-pass.mjs`) is **smart123** → 401.
3. **Browser binaries missing** (pre-install): Playwright 1.61.1 wants `chromium_headless_shell-1228`;
   cache had only 1200/1243. Every `page`-fixture spec (auth-verify ×10, referral-claim, round86-security,
   loyalty-redeem) failed with `browserType.launch: Executable doesn't exist` until I ran
   `npx playwright install chromium` (114MB). See M-6.

---

## 1) Inventory & where coverage is thin relative to risk

**Unit — 141 files / 2006 tests**, domain buckets (filename classification):
auth/session/login/register **27** · orders/money/subscriptions/payments **24** · infra guards
(health, db, fetch, validation, hash, regression sweeps…) **18** · menu/items/cart **12** ·
rate-limit/csrf/polling **10** · rbac/admin/stats/ownership **9** · ui-logic (arabic plural, aria,
themes, charts, w2a…) **9** · loyalty/referral **8** · telegram **7** · settings/config **5** ·
reviews **3** · unclassified 9. Largest files: auth.test (59), r92-telegram-webhook-gate (52),
regression-sweep (48), core (46), regression (45), receipt-whatsapp-format (42), rbac-matrix (38).

**E2E — 43 files (41 in tests/e2e incl. teams/team11 + 2 security) / 419 listed tests** across 6
active projects (+2 cross-browser explicit-only). Project→file mapping verified against
`playwright.config.ts:34-150` — matches config (README's copy of the map does not; M-7).

**Thin-vs-risk (evidence-backed):**
- **Reviews = 3 unit files for the family that produced r121's worst API bug (C-1, P1 destructive
  cross-tenant delete).** And the one DELETE test pins the bug's surface (M-4).
- **Settings = 5 files, but the settings PUT **staff branch** (`src/app/api/settings/route.ts:126-135`,
  admin/sub_admin + `requirePermission('MANAGE_RESTAURANTS')`) has **zero** tests — settings-tenant
  tests exercise owner+user roles only; and no value-bounds tests exist anywhere (C-4's 20k-char PUT).
- **UI component logic** is deliberately outside unit coverage (`coverage.include: src/lib + src/app/api`
  only — documented in tests/README §4), so latch/hydration state machines (cart page
  `submittingRef`/`checkoutKeyRef`, `CartHydrator`) are covered by **e2e only**, and the e2e specs
  don't reach the failing paths (H-2's >500-notes guard, H-3's hydration flash). This is exactly where
  two of this round's P1/P2 UX bugs slipped through.
- **qa-teams/round79-c/r93-sim suites (192 tests)** are the deepest journeys but are seed-hostage
  (round83+qa+r93-sim seeds) — none can run in a minimal env (M-2/M-6).

---

## 2) Findings

### M-1 [P1] e2e contract suite is RED at HEAD: 7 specs pin pre-r119 400s — r119-B4's 422 unification never reached the e2e layer, and billing-blocked CI can't catch it
- Type: FACT (live-verified)
- Evidence: `tests/e2e/api-smoke.test.ts:42-47` · `tests/e2e/api-sweep.test.ts:71,84,96,108` ·
  `tests/e2e/full-sweep.test.ts:293-298` · `tests/e2e/auth-fix-verification.spec.ts:34-41` all expect
  400; `src/app/api/auth/login/route.ts:67` and `src/app/api/auth/register/route.ts:49` return 422
  since commit `c4bd21f9` (r119-B4, 2026-09-21, "API contract (S8): schema-validation failures unified
  to 422 on 6 routes"). Live curl: `POST /api/auth/login {}` → `422` «يرجى إدخال اسم المستخدم وكلمة
  المرور». All 7 verified failing this session (§0 run table).
- Impact: technical — `pnpm test:e2e` (CI's own gate) is permanently red once Actions billing is
  restored; a red suite masks real regressions and trains people to ignore it. Unit side was updated
  (r119-B6 contracts), e2e side was missed.
- Fix (minimal, root-cause): update the 7 pins to 422. api-sweep's four register titles should drop
  the stale "(or 429 if rate-limited)" phrasing or keep it alongside 422.
- Risk: of fixing — none (contract already shipped to prod r119). Of not fixing — first CI run after
  billing restore fails 7 tests, plus permanent signal loss.
- Tests required: none new — the pin update IS the fix.

### M-2 [P2] Seed-hostage e2e specs hard-fail in minimal environments — waha_owner (round83) and admin-password contract (smart123 vs admin123456) have no skip guard
- Type: FACT
- Evidence: `tests/security/rbac-negative.test.ts:170-190` (login `waha_owner/waha123456` → 401 in the
  current env, test fails hard; contrast the graceful `test.skip` on register-429 at :55);
  `tests/e2e/loyalty-redeem.spec.ts:52-58` (beforeAll login → 1 failed + 4 did-not-run, message
  «بذرة round83 مثبتة؟» asks the question but still red); `tests/e2e/auth-fix-verification.spec.ts:95-97`
  (`SEED_ADMIN_PASS || 'admin123456'` vs the local r97 contract `smart123` from
  `scripts/r97-admin-pass.mjs` — envs diverge: CI seeds admin123456, local convention smart123).
- Impact: technical — the security suite (the one suite named "security") reports red for
  environmental, not product, reasons; poisons trust in e2e signal; blocks minimal-env smoke runs.
- Fix (minimal): probe-and-skip like the existing 429 guard (a cheap authenticated ping as the seeded
  owner, `test.skip(!ok, 'round83 seed missing')`), and align test 5's default with the r97 contract
  (try smart123 then admin123456, or read `scripts/r97-admin-pass.mjs`'s contract doc).
- Risk: of fixing — skips can hide real 401 regressions; mitigate by keeping the skip message loud +
  requiring the full seeded run in CI. Of not fixing — red noise (already happening).
- Tests required: none beyond the guards themselves.

### M-3 [P2] Found-by-QA: `POST /api/auth/login` with a non-JSON body returns **500** (unhandled `request.json()` SyntaxError) — no negative test covers malformed bodies
- Type: FACT (live-verified)
- Evidence: `src/app/api/auth/login/route.ts:66` — `loginSchema.safeParse(await request.json())`:
  `safeParse` guards schema failures but not the JSON *parse*; a `Content-Length: 0` (or garbage) body
  throws into the outer catch → 500 «حدث خطأ في الخادم» (reproduced live: `status=500`). Existing
  negative tests only send valid-JSON `{}` (`api-smoke.test.ts:42-59`, `full-sweep.test.ts:293-298`).
  Not in C-auditor's findings (checked C-api.md) — routing to C for the fix.
- Impact: user-facing edge (a truncated/empty client request gets a 5xx + generic copy instead of a
  4xx) + noise in error logs; also the api-smoke "empty body" test intent was this case all along —
  it tests the wrong thing (empty *object*).
- Fix (minimal, root-cause, C-domain): catch the parse (e.g. `let body; try { body = await
  request.json(); } catch { return error('صيغة الطلب غير صالحة', 400); }` before safeParse) — or
  wrap in a small helper if other routes share the pattern.
- Risk: of fixing — negligible (only changes 5xx→4xx for malformed input). Of not fixing — 5xx on
  trivially malformed input, monitored as server errors.
- Tests required: new negative cases: empty body (no payload) and non-JSON garbage body → 4xx with
  Arabic envelope, in api-smoke (e2e) + a unit negative in the login contract file.

### M-4 [P2] r103-fixes F5b pins the C-1 reviews-DELETE bug surface and mocks away the destructive commit — the fix WILL break this test; C-1's "zero coverage" claim needs a correction
- Type: FACT
- Evidence: `tests/unit/r103-fixes.test.ts:289-299` — "review belonging to ANOTHER item → 404" mocks
  `review.delete` returning `{ menuItemId: 77 }` (mock wired at :52) and asserts 404. In production
  (`src/app/api/items/[id]/reviews/route.ts:198-219`) the delete has **already committed** when that
  404 is returned (C-1's bug): the mocked `$transaction` (:272, plain `fn(txMock)`) makes commit/rollback
  semantics invisible, so the test pins the *misleading response* without pinning row survival.
  Sibling C-1 (C-api.md:15) states "Zero test coverage exists for this handler (`rg reviewId tests/` →
  no matches)" — **inaccurate**: `rg -l reviewId tests/` → `tests/unit/r103-fixes.test.ts` (+ a direct-SQL
  cleanup in r93-sim-admin.spec.ts:74). Substance (no coverage of the commit semantics) holds.
  Also in the same describe: `:322-332` "sub_admin WITH MANAGE_RESTAURANTS → allowed" pins the
  platform-wide allow (any item, any tenant) — by design per the ladder, but it is the exact cell a
  scope-tightening fix would touch.
- Impact: technical — when C-1's fix (`deleteMany({ where: { id, menuItemId } })`) lands, F5b's mock
  shape (review.delete) no longer matches the code → 3-4 tests in the describe fail and must be
  updated; without pre-planning this looks like the fix broke tests.
- Fix (minimal): when fixing C-1, update F5b: mock `review.deleteMany`, and ADD the missing
  assertion class — cross-item `reviewId` → 404 **and** no row removed (deleteMany called with
  `{ id, menuItemId: <url item> }`), victim item's counters untouched.
- Risk: of fixing — none. Of not fixing — fix-batch churn + the destructive path stays un-asserted.
- Tests required: yes — the updated F5b is the regression test for C-1.

### M-5 [P2] Coverage map for the r121 fix batch: which sibling fixes have NO regression net today
- Type: FACT (grep-verified across tests/unit + tests/e2e + tests/security)
- Evidence & required new tests, per sibling finding:

| Sibling finding | Existing coverage | New regression test required |
|---|---|---|
| **C-1** reviews DELETE cross-item commit (P1) | r103-fixes F5b pins surface only (M-4) | update F5b + row-survival assertions |
| **E-1** cross-tenant item move — `PUT /api/items/[id]` never validates incoming `categoryId` (`items/[id]/route.ts:92` + update loop, no re-scope) | **NONE** — items-contract.test.ts covers image caps/status gates/plan caps; no categoryId cross-tenant case anywhere | unit: owner A PUTs item with `categoryId` of tenant B → 403/422, row unchanged (assert `menuItem.update` not called or called with scoped categoryId); e2e optional |
| **C-4** settings PUT unbounded values (20k name → public menu) | settings-tenant.test.ts covers tenant isolation + logo lifecycle; **no bounds tests**; **staff branch (route :126-135) zero tests** — note the file's `vi.mock('@/lib/auth')` factory provides only `requireAuth`, so adding staff tests also requires mocking `requirePermission` or it's `undefined` | unit: `restaurant_name` 300 chars → 422, invalid email → 422, ≤200 → 200 (C-api.md:43's own ask); staff branch: sub_admin without MANAGE_RESTAURANTS → 403 |
| **D-2** order-status: cancelled → completed allowed | order-lifecycle.test.ts covers double-completion, completed→ready toggle (:300), races, sub_admin perms — **no cancelled-source case**; note `:300` "completed → ready is allowed" PINS a backward transition — breaks if D-2's fix rejects all backward transitions (narrow fix survives) | unit: PUT cancelled → completed → 422 Arabic message, no loyalty grant; decide-and-update the :300 pin if the guard is broad |
| **H-2** checkout brick latch (cart/page.tsx:215-221 >500-notes guard returns without releasing `submittingRef`/`isSubmitting`) | **NONE** — cart-submit-error.test.ts pins the error COPY mapper only (submit-error.ts); round29-cart-regression covers orb + notes-form; no test drives the >500 path or asserts latch release | e2e (ui project): fill >500 notes → toast → shorten → submit succeeds without reload; unit if the latch logic is extracted |
| **H-3** cart hydration flash (no `hasHydrated` gating; CartHydrator effect-after-paint) | **NONE** — r110-cart-switch-guard tests the switch predicate only (pure fn) | unit for the new `useCartHydrated()` gate + e2e: pre-seed localStorage cart, reload /cart, assert empty-state never paints |
| **C-2** whatsapp/generate double-count (money) | whatsapp-generate tests exist (auth/ratelimit/arabic phrases) — double-count not covered per C | per C-api.md's "Tests required" |

- Impact: technical — 6 of the round's headline fixes currently land with no failing-first test; two
  of them (C-1, D-2) will instead BREAK existing pins (M-4).
- Fix: treat this table as the fix-batch test contract (pair each P1/P2 fix with its row).
- Risk: none — this is planning, not code.
- Tests required: see table.

### M-6 [P2] Local e2e infra is one missing prerequisite from total browser-test blackout — `playwright install` is undocumented, and stale servers poison one-session runs
- Type: FACT (live-verified)
- Evidence: Playwright 1.61.1 requires `chromium_headless_shell-1228`; the cache had only 1200/1243
  (other toolchains') → **every `page`-fixture spec fails** with `browserType.launch: Executable
  doesn't exist` (observed: auth-verify 10/10 red, referral-claim 11 red, round86-security 5 red,
  loyalty-redeem partially). Fixed in-session via `npx playwright install chromium` (114MB).
  `tests/README.md` §2 documents seeds, BASE_URL, RATE_LIMIT_TEST_RELAX — **no browser-install step**.
  Additionally: a standalone server survived a previous bash call (EADDRINUSE on the next start) and
  was reaped mid-run → 2 spurious `ECONNREFUSED ::1:3000` failures in my first api-smoke batch; the
  clean pattern is `pkill -f "standalone/server.js"` before starting (the sanctioned
  `scripts/r92-e2e-local.sh` one-session wrapper avoids this; ad-hoc invocations don't).
- Impact: technical — a fresh clone cannot run 268 of 419 e2e tests (all browser projects) and the
  failure mode (Executable doesn't exist) points at Playwright, not at setup.
- Fix (minimal): add one prerequisite line to tests/README §2 (`npx playwright install chromium`)
  and a `pkill -f standalone/server.js || true` pre-step in ad-hoc run docs.
- Risk: none.
- Tests required: none.

### M-7 [P3] tests/README.md is stale (r96) — counts, project map, and env advice all drifted
- Type: FACT
- Evidence: `tests/README.md:3` claims "131 unit files (1908 tests)" (actual: **141 / 2006**) and
  "40 e2e + 2 security = 42 (484 checks)" (actual: **41 + 2 = 43 files, 419 listed tests**);
  project map (lines 63-72): `api` row omits `loyalty-redeem.spec.ts` (wired r97-W6), `ui` row omits
  the six r93-sim/round94-sim files (in config lines 56-74), `qa-teams` row omits
  `r110-payment-rejection-retry.spec.ts` (in config line 115); line 5 advises keeping DATABASE_URL
  set for local vitest runs while `package.json:13` `test` runs `env -u DATABASE_URL vitest run`
  (deliberate unset — 141/141 pass without it, so the caution is obsolete but conservative).
- Impact: technical — the canonical test doc misleads on what runs where; the api/ui project rows
  understate what `pnpm test:e2e` executes.
- Fix (minimal): refresh counts + project map to match `playwright.config.ts` at 74ef578f; soften the
  DATABASE_URL note to "CI runs with it unset; new files importing real env modules must mock".
- Risk: none.
- Tests required: none.

### M-8 [P3] persona-runner.mjs: orphaned, prod-targeting by default, stale credentials — dead tooling with a footgun
- Type: FACT
- Evidence: `tests/persona-runner.mjs:6-8` — `BASE = process.argv[3] || "https://menu.smart-link.ly"`,
  `OWNER = { username: "waha", password: "waha123" }`; referenced by NO config/workflow/script
  (rg across repo → only an old report `docs/reports/TEST-REPORT-2026-08-01.md` and R-hygiene's icon
  table); the `waha` user exists in no current env (local DB: admin + al-waha-cafe-demo only;
  round83 seed uses `waha_owner`, not `waha`). Effectively dead + defaults to hammering PRODUCTION
  with credentials that no longer exist anywhere.
- Impact: technical — misleading artifact in the test tree; a future contributor running it "to see"
  hits prod with dummy creds.
- Fix (minimal): move to `scripts/archive/` (matches the repo's archive convention) or rewire to
  local BASE + current seed contract.
- Risk: none (no CI references it).
- Tests required: none.

### M-9 [P3] Coverage ratchet verified PASS with grown headroom — raise-only rule can be exercised at round close
- Type: FACT (measured) + SUGGESTION
- Evidence: measured this session at HEAD: 85.44 stmts / 79.58 branches / 78.71 functions / 87.57
  lines vs ratchet 80/74/75/83 (`vitest.config.ts:32-37`, calibrated r92 at 82.22/75.56/76.7/84.66).
  Margins: +5.44/+5.58/+3.71/+4.57. Scope is `src/lib` + `src/app/api` only (components deliberately
  excluded, documented).
- Impact: positive verification (LEDGER-consistent); the ~2pt safety-margin convention implies the
  ratchet is due a raise (e.g. 84/78/77/86) after r121's fix batch lands its new tests.
- Fix: raise thresholds at round close per the documented raise-only rule (after M-5's tests land,
  not before).
- Risk: of raising too early — red CI on the fix batch; time it last.
- Tests required: none.

### M-10 [P3] Test-quality verdict on pivotal files — the money/RBAC core is exemplary; the weak spots are mocked-auth files and the reviews family
- Type: SUGGESTION (judgment from reading 8 pivotal files end-to-end)
- Evidence (files read in full/large part):
  - **Exemplary (pin real behavior, minimal mocks):** `rbac-matrix.test.ts` — runs the REAL
    `requireAuth`/`requirePermission` ladder, only session+prisma mocked (:24-60 header documents
    why); `order-lifecycle.test.ts` — transition semantics, loyalty accrual guards, race (updateMany
    count 0), sub_admin permission passthrough; `orders-create.test.ts` — server-side total recalc
    (client totals ignored), round86-A4 tenant scoping, TOCTOU plan cap under lock; `subscription-decisions.test.ts`
    — real `src/lib/subscription-decisions.ts` via tx-mock (header documents the old inline-copy
    anti-pattern it replaced); `auth.test.ts` — real KDF (iterations/salt/hash shapes, timing
    equalization); `r119-b6-auth-health-contracts.test.ts` — the /me + logout Bearer-revocation
    contracts with envelope assertions.
  - **Mock-heavy / branch-gaps:** `settings-tenant.test.ts` — `vi.mock('@/lib/auth')` provides only
    `requireAuth`; the staff branch (route :126-135) would crash on `requirePermission` undefined if
    anyone adds staff tests without extending the mock — latent trap + the branch is untested (M-5).
  - **Pins a bug:** `r103-fixes.test.ts` F5b (M-4). **History of pinning bugs:** r120's
    `receipt-whatsapp-format.test.ts:32-38` was the money-rounding pin (7.25→«7.3») — properly updated
    with an inline rationale comment; the same discipline is needed for F5b and possibly
    order-lifecycle:300 (M-4/M-5).
  - **Churn-prone assertions (will bite future refactors, not bugs):** heavy reliance on
    exact-mock-shape assertions (`toHaveBeenCalledWith` on prisma calls — r103-fixes, settings-tenant,
    items-contract) means schema/route refactors (like C-1's deleteMany) flip many tests at once.
    Acceptable trade today, but new tests for the M-5 table should assert on *outcomes* (status +
    envelope + row survival) more than call shapes.
- Impact: technical — the patterns to copy and the traps to avoid for the fix-batch tests.
- Fix: use the exemplary files as templates; outcome-first assertions for M-5's new tests.
- Risk: none.
- Tests required: none (guidance).

---

## 3) Flake / volatility assessment (no run-order dependence found in unit)

- **Unit is order-safe by design** (tests/README §4: no module-level shared state; verified claim —
  files run standalone in CI's `test:coverage` and my single `pnpm test`).
- **Time-dependent tests are properly frozen:** 12 files use fake timers/`vi.setSystemTime`
  (e.g. `rate-limit-race.test.ts:61` pins `T0`); `telegram-verify-anti-replay.test.ts` builds
  expiries from `Date.now()` **plus** a fixed delta — monotonicity is what's asserted, no wall-clock
  sensitivity. No real sleeps in unit tests.
- **Rate-limit e2e tests are the flake epicenter (known + documented):** login 5/min/ip:username
  forces the serialized qa-teams golden rule (tests/README §2, `workers:1` CI); `PW_RETRIES`
  (playwright.config.ts:7-16) exists precisely so nightly flake-detection runs with retries=0;
  `auth-fix-verification.spec.ts:6` isolates its 22-failed-login flood behind a fresh uid +
  `X-Forwarded-For: 10.0.0.254` — good hygiene. `RATE_LIMIT_TEST_RELAX=1` (with the
  `exemptFromRelax` carve-out for lockouts) is the CI-blessed mitigation; nightly deliberately
  runs without it to catch real-budget chips.
- **Env-conditional skips:** `webhook-security.test.ts:82,118,130` skip without
  `TELEGRAM_WEBHOOK_SECRET` (3 skips in my run) — documented in-file, by design; means positive-auth
  webhook paths are dark in any env without that secret (local .env has none).
- **Observed this session:** 1 infra flake (stale server → ECONNREFUSED, M-6); 0 logic flakes across
  210 e2e + 2006 unit executions, retries=0.

## 4) Infra summary

- `vitest.config.ts` — no setupFiles (none needed), node env, alias `@`→src, coverage scoped to
  lib+api with ratchet (PASS, M-9). `package.json` test scripts deliberately `env -u DATABASE_URL`.
- `playwright.config.ts` — 8 projects, mapping verified; retries CI-only(2)/PW_RETRIES-overridable;
  workers CI:1/local:2; HTML report outside outputDir; round-comment rationales accurate.
- `tests/README.md` — valuable but stale (M-7).
- `tests/persona-runner.mjs` — orphaned (M-8).
- Helpers (`csrf-helper.ts` double-submit minting with jar fallback, `qa-helpers.ts` login-retry
  across the rate window) — sound; the CSRF helper's round88 fallback comment matches observed
  behavior.

## 5) What I did NOT run (and why)

`qa-teams` (142) + `round79-c` (6) + the six r93/round94-sim ui files (44): require
round83/qa/r93-sim seeds not present in this session's DB (seeded `al-waha-cafe-demo` + `admin/smart123`
per round context), serial workers, and would need the full browser matrix — out of the mandated
batch scope and session budget. Their health at HEAD is UNVERIFIED beyond config wiring; given M-1's
demonstrated contract drift, treat them as suspect until one serialized seeded run happens (recommend
as the first action after billing-blocked CI is restored, or via `scripts/r92-e2e-local.sh` locally).

## 6) Priority order for the fix batch

1. M-1 (update 7 pins — un-reds the CI gate) — trivial diffs.
2. M-5 table (pair every sibling P1/P2 fix with its new regression test; update M-4's F5b + watch
   order-lifecycle:300 when D-2 lands).
3. M-3 (malformed-body 4xx + negative tests; route fix belongs to C).
4. M-2 + M-6 (skip guards + `playwright install` doc — makes every env able to run the suites).
5. M-7/M-8/M-9/M-10 (docs, archive, ratchet raise, patterns).
