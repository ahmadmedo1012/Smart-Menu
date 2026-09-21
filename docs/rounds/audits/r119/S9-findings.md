# S9 — Test Coverage Gap Analysis (r119)

Agent: S9 · Scope: READ-ONLY test-debt analysis · Repo: `/home/z/my-project/repos/Smart-Menu` @ 92611477

## 0. Verified state (fresh runs in this container)

- Deps reinstalled via `pnpm@10 install --frozen-lockfile --ignore-scripts` (node_modules was absent — fresh container).
- `vitest run`: **139 files / 1991 tests, 1991 passed, 0 failed, 0 skipped — 63.9s** (`Duration 63.91s (tests 22.95s)`).
- `vitest run --coverage` (v8, include `src/lib/**` + `src/app/api/**`): **85.21% stmts / 79.34% branch / 78.19% funcs / 87.30% lines** vs ratchet thresholds 80/74/75/83 (vitest.config.ts:60-64) — comfortably green.
- Playwright: 41 e2e spec files (295 `test(` titles) + 2 security files (16 titles) across 9 configured projects.
- Mobile: **zero test infrastructure** — no test script in `mobile/package.json`, no test files, no `__tests__`, no runner deps (details §5).

**Answering the mandate's spot-checks up front:**

| Question | Verdict | Evidence |
|---|---|---|
| Negative-total rejection tested? | **YES** | `tests/unit/r118-order-modifier-contract.test.ts:181` ("negative line total (stacked negative deltas…) → 400, zero writes") + `orders-create.test.ts:392` |
| Modifier snapshot (names+deltas) tested? | **YES** | `orders-create.test.ts:138` (delta priced + persisted in modifiersJson), `r118-order-modifier-contract.test.ts:144` (dedupe), `:220` (discountedPrice=0) |
| Cancel-race friendly path (r117) tested? | **YES** | `subscription-decisions.test.ts:479-529` (r117-F1 concurrent-race losers ×4), `order-lifecycle.test.ts:332` (updateMany count 0), `payment-rejection.test.ts:101-126` (r118-A1-F2) |
| Health throttle tested? | **NO — ZERO tests** | `src/app/api/health/route.ts:18-47` (allow(), 429, retry-after, 10k sweep) — `r92-health-commits.test.ts` (6 tests, commitSha only) + `polling-probes.test.ts:149-164` (envelope only) never trip the limiter |
| Data Cache tag purge tested? | **NO — logic never runs** | `src/lib/menu-cache.ts` `revalidateMenu` is `vi.mock`-ed in ≥9 suites (items-contract:52, items-featured:44, plan-limit:61, r92-categories-route:47, …) — its own body (slug lookup → `revalidatePath` + `revalidateTag('public-menu-<id>', {expire:60})`, error swallowing) has **no direct test** |

---

## 1. Critical-path coverage matrix

Coverage figures = v8 line coverage from this run (lcov). "Tests" = named `it()` cases verified by reading the files.

| Critical path | Verdict | Coverage | Tests (evidence) |
|---|---|---|---|
| **Money — order create** (POST /api/orders: reprice, tenant guards, caps, idempotency, races) | COVERED (deep) | 98.0% | `orders-create` (25), `orders-atomic-cap` (15: FOR UPDATE, P2002×3 shapes, qty cap 99), `r118-order-modifier-contract` (9), `orders-items-throttle` |
| **Money — order list/count probes** | COVERED | 100/98% | `orders-list` (24: RBAC matrix, date filters, slim projection, no-store) |
| **Money — order status/loyalty accrual** (PUT /api/orders/[id]) | COVERED | 94.7% | `order-lifecycle` (19: accrual, double-completion, races, RBAC) |
| **Money — loyalty redeem** | PARTIAL | 72.9% | `resource-ownership` (redeem tenant), `loyalty-redeem.spec` (e2e) — race re-check arms (`loyalty/redeem/route.ts:105-107`) uncovered |
| **Money — loyalty card creation** (POST /api/loyalty new-card branch) | **ZERO-branch** | 73.3% | `loyalty/route.ts:65-73` (referral-code collision loop, >10 attempts → 500) — no test enters the `!card` branch |
| **Money — subscription create/upgrade/validate/status** | COVERED | 88-96% | `subscriptions-family` (25), `subscriptions-upgrade` (24), `subscriptions-bank`, `pending-payment-unique` |
| **Money — subscription decisions (approve/reject + races)** | COVERED (deep) | 98.5% | `subscription-decisions` (20+, incl r116 replays + r117 race losers), `payment-rejection` (7), `admin-subscriptions-status` |
| **Money — cron expiry downgrade** | COVERED | 100% | `cron-subscription-expiry` (7: bearer fail-closed, one updateMany, no-op, 500) |
| **Auth — login/register/session/CSRF/lockout** | COVERED | 91-100% | `auth` (59), `r92-register-route` (33), `session`, `csrf`, `csrf-timing-safe`, `login-lockout`, `login-backstop`, `login-timing-equalization`, `session-cap`, `session-absolute-cap`, `round94-session-cap` |
| **Auth — logout** (route + `performLogout` lib) | **ZERO** | 0% | `api/auth/logout/route.ts` (LF 7), `lib/logout.ts` (LF 8) — nothing imports them in tests |
| **Auth — /api/auth/me (mobile boot endpoint)** | **ZERO** | 0% | `api/auth/me/route.ts` (LF 12) — r102-M13 identity hydration untested |
| **Auth — telegram link-token issuance** | **ZERO** | 0% | `api/admin/telegram/link/route.ts` (LF 13) — HMAC token + 5-min exp + t.me URL contract |
| **Telegram — webhook gates/callbacks/replays** | COVERED (deep) | 96.9% | `r92-telegram-webhook-gate` (50: Gate0 fail-closed ×7, /start verify_ ×13, callback gates), `telegram-webhook` (15), `round94-telegram-verify-binding`, `telegram-verify-anti-replay` (8), `telegram-payment-sync` (6), `telegram-broadcast`, `telegram-api` |
| **Telegram — self-approval guard (`isPaymentSelfApproval`, r118-A2-P2)** | **BRANCH ZERO** | mocked false | Only reference: `r92-telegram-webhook-gate.test.ts:73` `isPaymentSelfApproval: vi.fn(async () => false)` — the true/blocked path **never fires in any test**; no direct test of the comparator (`subscription-decisions.ts:70-80`) |
| **Telegram — bot token config POST** (save/rotate/masked-save/webhook register) | **NEAR-ZERO** | 17.6% | `r118-config-masking-and-caps` tests only the GET masking (2 tests); POST body `telegram/config/route.ts:35-112` (encrypt, masked-save preserve, 422, setWebhook, r118-A1-P3 trim, partial-failure 400/500) all uncovered |
| **Telegram — approvers [id] DELETE (r118-A2-P2 hardening)** | **ZERO** | 0% | `api/admin/telegram/approvers/[id]/route.ts` (LF 10) — MANAGE_SUBSCRIPTIONS gate + audit; collection GET/POST IS covered (`regression-sweep.test.ts:498-530`) |
| **Telegram — diagnose + test routes** | **ZERO** | 0% | LF 24 + 6 — token-adjacent, must never leak |
| **Public menu — API (mobile data path)** | COVERED | 100% | `r118-public-menu-route` (7: 429-before-DB, slug regex, isActive, active-category filter, Decimal→Number, empty-group drop, discountedPrice=0) |
| **Public menu — cache purge (`revalidateMenu`)** | **ZERO (always mocked)** | — | See spot-check table above |
| **Public menu — web page queries/ISR** | COVERED | — | `menu-queries`, `r92-menu-isr-config`, `menu-showcase-fallback`, `public-featured` |
| **Health route** | PARTIAL | 82.6% | envelope + commitSha + degraded covered; **throttle (r118-A4-P3) zero** |
| **Owner flows** (restaurants PATCH/DELETE, reviews, gates) | COVERED | 96%+ | `r92-owner-restaurant-id` (26), `owner-restaurants-gate`, `r92-owner-reviews`, `r93-coverage-owner-restaurants` |
| **Admin routes** (admins, users, config, stats, events) | COVERED | 88-100% | `admin-routes`, `r92-admin-admins-id`, `r93-coverage-admin-admins`, `r92-subadmin-pii`, `stats-permission`, `chart-stats` |
| **Restaurants [id] PUT (admin)** | PARTIAL | 71.0% | RBAC matrix covered (`rbac-matrix.test.ts:476`); **`restaurantMediaError` cross-tenant logo/gallery guard (`restaurants/[id]/route.ts:75-80`) never fires in any test**; sub_admin VIEW_ANALYTICS GET branch (104-109) uncovered |
| **Upload / WhatsApp generate / referrals** | COVERED | 97/84/100% | `upload-route`, `blob-guard`, `whatsapp-generate`+auth+ratelimit, `r92-referrals-claim`, `referral-cap-atomic`, `referral-conversion` |
| **Mobile app (4932 LOC, 43 screens, hooks/stores/services)** | **ZERO** | — | §5 |

**Zero-covered critical paths: 5 hard-zero (auth/logout, auth/me, admin/telegram/link, telegram/approvers/[id], mobile app) + 4 zero-branches inside covered files (loyalty card-create, health throttle, revalidateMenu, isPaymentSelfApproval-true) + 2 near-zero (telegram/config POST 17.6%, telegram/diagnose 0%).**

## 2. P1 — Untested money/auth (implement first)

1. **`/api/auth/me` (0%)** — the mobile app *boots* from this (r102-M13). A regression in the 401-vs-200 envelope or identity shape silently breaks every APK session-restore. `src/app/api/auth/me/route.ts:6-41`.
2. **`/api/auth/logout` + `lib/logout.ts` `performLogout` (0%)** — session destruction + the `X-Just-Logged-Out` anti-resurrection header (`route.ts:18-21`) and the `just-logged-out` sessionStorage flag (`lib/logout.ts:19-23`). Auth-critical; zero tests.
3. **`isPaymentSelfApproval` true-path (r118-A2-P2)** — escalation fix (approver == payer). Every webhook test mocks it `false` (`r92-telegram-webhook-gate.test.ts:73`). An inverted regression reopens self-approve-for-own-payment and **no test fails**.
4. **`POST /api/telegram/config` (17.6%)** — the platform's most sensitive secret lifecycle: encrypt→upsert, masked-save preserve, 422-no-token, setWebhook with **trimmed** secret (r118-A1-P3 — a padded env re-broke every update 403 before that fix), partial-failure 400/500. Only the GET masking contract is tested.
5. **`POST /api/loyalty` card-creation branch (`route.ts:65-73`)** — referral-code collision loop, `attempts > 10 → 500` Arabic, and the PII-strip projection (`route.ts:76-79`) on the create path.

## 3. P2 — Untested critical branches (money-adjacent/security)

- **Health throttle r118-A4-P3** (`health/route.ts:18-47`): 30/min/IP in-memory allow(), 429 `{status:"rate-limited"}` + `retry-after:10`, opportunistic >10_000-bucket sweep. Zero tests.
- **`revalidateMenu`** (`lib/menu-cache.ts`): the instant-purge hook for BOTH web ISR and the mobile Data Cache tag (r118-A9-P3). Mocked in 9+ suites; its real body (slug lookup, `revalidateTag('public-menu-<id>', {expire:60})`, all-swallowing catch) never executes under test.
- **`restaurantMediaError`** (`restaurants/[id]/route.ts:75-80`): round87-A2 cross-tenant logo/gallery guard on the admin PUT — never fired in any test (cross-tenant media URL injection would regress silently).
- **`GET /api/restaurants/[id]` sub_admin `VIEW_ANALYTICS` branch** (`:104-109`) — the PII-ladder gate for full-detail reads.
- **`DELETE /api/admin/telegram/approvers/[id]` (0%)** — r118-A2-P2 hardened route (MANAGE_SUBSCRIPTIONS + audit row).
- **`/api/telegram/diagnose` (0%, LF 24)** + **`/api/telegram/test` (0%)** — token-adjacent; must never leak the secret.
- **`loyalty/redeem` race re-check arms** (`:105-107`): count-0 → INSUFFICIENT vs INSUFFICIENT_POINTS vs NOT_FOUND reporting.
- **`stats/advanced` 69.8%** (140-211: range fallbacks), **`settings` 73.8%**, **`demo/fix-images` 44.8%**, **`lib/db.ts` 50%** (init paths), **`lib/csrf-client.ts` 46.7%**, **`lib/chime.ts` 2.6%**.
- **`admin/events/trigger` (0%)** — debug route, **no caller anywhere in src/ or mobile/src/** (dead-or-curl-only), writes fake events with `currency: "EGP"` on a LYD platform (`route.ts:24`) — flag for deletion or test.
- **`api/plans` (0%, LF 11) + `api/public/stats` (0%, LF 5)** — small public routes, cheap wins.

## 4. P3 — Test quality & flaky-risk inventory (very clean suite)

**Clean bill:** no `expect(true)`; no assertion-free files (checked it-count vs expect-count across all 139 — zero suspects); **no snapshot tests at all**; **no `it.skip`/`todo`/`only` in unit tests**; 0 failed / 0 skipped out of 1991; mock hygiene good (98/139 files `clearAllMocks`/`restoreAllMocks`); no accidental real-network (all `globalThis.fetch` references are mock assertions; `core.test.ts:157-166` shims+restores).

**Skips that exist (all e2e, all conditional):** 16 `test.skip` sites — 429-rate-limit-guards (rbac-negative:55, loyalty-redeem:130, round86-security:38), env-dependent (webhook-security ×3), fixture-dependent (round87-journeys:112 *unconditional in prod* "no gallery fixture", ui-smoke:87, ui-sweep:84, full-sweep:221, team10:188 prod-admin-creds, round80:78, r93-sim-abuser ×2). Not debt-blocking, but round87:112 + team10:188 mean those journeys silently don't run against production.

**Flaky-risk inventory (low overall):**
- Time-dependent: rate-limit suites use `vi.useFakeTimers` (rate-limit, rate-limit-sweep, rate-limit-race, session, session-absolute-cap, cron-cleanup, telegram-api, telegram-broadcast, fetch-json, debounced-callback — 11 files). `chart-stats` injects `now` explicitly (deterministic). `session.test.ts:143-155` uses *scoped* fake timers with try/finally — exemplary.
- **One real-timer sleep**: `lib.test.ts:108` `await new Promise(r => setTimeout(r, 50))` for a 1ms limiter window — 50:1 margin, acceptable but the only non-deterministic wait in unit tests.
- `db-withretry.test.ts:125` relies on real setTimeout minimum-bound assertion — mild.
- **Health-route module-state footgun**: the in-memory `hits` Map persists per test file (vitest isolate=true saves us per-file); the two health test files make 8 bare `GET()` calls against the shared `"unknown"` bucket (cap 30) — adding >22 more health tests in those files will start tripping 429s mysteriously. Worth a comment/reset hook when health-throttle tests are added.
- e2e: CI `retries: 2` masks flakes, but `PW_RETRIES=0` nightly flake-detection exists (playwright.config.ts:7-16, round90-F2) — good practice; qa-teams serialized by design (login rate-limit budget, documented).

## 5. Mobile test reality

**The mobile app has ZERO tests of its own.** The "7 mobile data-path tests (r118-B4)" are *web-suite* tests of the API the app consumes (`tests/unit/r118-public-menu-route.test.ts` — 7 tests on `/api/public/menu/[slug]`). Nothing in `mobile/` imports a test runner; `mobile/package.json` has no `test` script.

- 4932 LOC across 43 screen files, 2 hooks, 2 stores, 2 services, 15 lib modules (several are *duplicated* web code: `arabic-plural`, `get-error-message`, `modifier-schema`, `payment-schema`, `order-status`, `receipt`, `validation` — web versions tested, mobile copies not).
- No jest-expo/vitest config, no @testing-library/react-native, no detox/maestro.

**Top-10 highest-value missing mobile tests** (in value order):
1. `store/cart.ts` — cross-restaurant add wipes the cart AND adopts the NEW restaurant's id/whatsapp/name (r103-N3) — wrong-restaurant WhatsApp handoff is a money-adjacent UX bug class.
2. `store/cart.ts` — modifier-signature line-merge (same item + different modifierOptionIds = separate lines, same = quantity+1 clamped at 99) + `partialize` persist shape.
3. `services/api/client.ts` — 401 → stored token cleared once + auth store flipped (r102-M1) so RootNavigator lands on public stack; envelope error parsing; AbortController timeout path.
4. `hooks/usePollWhenVisible.ts` — AppState active→start / background→stop; `inFlightGuard` prevents overlapping polls; `enabled:false` stops the interval.
5. `hooks/useAccessGate.ts` + `allowRolesOrPermission` — truth table (no user / role match / permission match / deny) for admin + owner gates.
6. `store/auth.ts` — hydration from `/api/auth/me` (r102-M13 identity: id/username/name), login/logout transitions, SecureStore persistence.
7. `lib/receipt.ts` — WhatsApp receipt format parity with the web (`receipt-whatsapp-format` exists for web only).
8. `lib/modifier-schema.ts` + required-group validation before add-to-cart (r109-F9 parity) — a bypass here means server-400s on submit.
9. `screens/subscribe/SubscribePaymentScreen` — rejected-payment retry latch (r110 web parity) + wallet ≤99 LYD cap.
10. `lib/plan-limit-error.ts` + `lib/loyalty-tiers.ts` — copy-parity with web behavior (map + tier math).

**Recommendation**: add `vitest` (or jest-expo) to mobile/package.json with a `test` script; items 1-6 are pure TS (no RN imports beyond AsyncStorage/SecureStore mocks) and runnable in CI alongside web tests.

## 6. e2e coverage map

Covered journeys (295 titles): customer order → owner sees it (round79-phaseC, team2, r93-sim-owner incl **UI accept "قيد التحضير" + cancel "ملغي" with confirm dialog** — r93-sim-owner.spec.ts:238-267), checkout + subscribe **rejected-payment retry** (r110), bank/wallet/madar validation + plan caps (team4-payments, round6), loyalty redeem, referral claim, modifiers journey end-to-end (team11), owner multi-menu switching + tenant isolation (team3, persona-4), a11y (team6), perf smoke (team9), cross-browser firefox/webkit smoke (qa-cross-browser), 401/403 negative matrices (team7, persona-7, round80/86/87 security), print/QR/themes (round87, round94).

**e2e gaps:**
- **Admin subscription approval via the web panel UI** (`/admin/subscriptions` click-through) — only API-level today (r110:117, round79-phaseC:258 call POST /api/admin/subscriptions directly; team5-admin only tests access redirects).
- Telegram journey — N/A by design (external bot); covered at webhook unit level + security e2e.
- Refund — feature does not exist; cancel covered (r93-sim-owner).
- Logout e2e exists (team1-auth:168+, auth-fix-verification) but the API it drives is unit-untested (§2.2).
- Mobile app — no automated journey (manual APK QA only, per r114 ledger).

## 7. TOP 15 test specs to implement (money/telegram first)

| # | File (proposed) | describe | Scenario | Why it matters |
|---|---|---|---|---|
| 1 | `tests/unit/telegram-config-post.test.ts` | `POST /api/telegram/config — bot token lifecycle` | new token → encryptValue+upsert+setWebhook(Trimmed secret); masked-save preserves stored token (no re-encrypt); no token stored + none sent → 422; setWebhook `ok:false` → 400 «تم الحفظ لكن فشل تسجيل…»; transport throw → 500; response NEVER contains ciphertext/token | Most sensitive secret in the platform; 17.6% route coverage; r118-A1-P3 trim regression would 403 every update again |
| 2 | `tests/unit/self-approval-guard.test.ts` | `isPaymentSelfApproval — payer==approver escalation block` | direct: payer.telegramChatId == approverId (number AND string forms) → true; different/null → false; then webhook-level: self-approval → alert «لا يمكنك البت…», resolveSubscriptionPayment NEVER called | r118-A2-P2 security fix whose true path is mocked out in every existing test (r92-telegram-webhook-gate.test.ts:73) |
| 3 | `tests/unit/auth-me-route.test.ts` | `GET /api/auth/me — session probe (mobile boot)` | anonymous → 401 envelope; valid → {id, username, name, role, restaurantId, subscriptionStatus, permissions, roleLabel}; all 5 roleLabel mappings; user row vanished → identity nulls but still 200 | Mobile APK boots from this (r102-M13); zero coverage today |
| 4 | `tests/unit/auth-logout.test.ts` | `POST /api/auth/logout + performLogout` | destroySession called + `X-Just-Logged-Out:1` header; destroySession throw → 500; performLogout: ok → sessionStorage flag + location.replace('/login'), network throw → error toast (owner mode) | Auth-critical, zero coverage incl. the anti-resurrection race header |
| 5 | `tests/unit/health-throttle.test.ts` | `GET /api/health — r118-A4-P3 in-memory throttle` | 30 calls/min/IP ok → 31st 429 `{status:"rate-limited"}` + `retry-after:10` and **dbHealth never called**; fake-timer window reset re-allows; distinct IPs isolated; >10_000 stale-bucket sweep | The DoS/cost guard added in r118 has zero tests; also add a reset/clearExports note for the module-level Map footgun (§4) |
| 6 | `tests/unit/loyalty-card-create.test.ts` | `POST /api/loyalty — new-card creation branch` | first lookup miss → create with generated referralCode; collision loop (findUnique true then false); >10 collisions → 500 «تعذر توليد كود إحالة فريد»; response card has NO customerName/phone (PII strip) | Money/loyalty branch `loyalty/route.ts:65-73` + PII projection never executed under test |
| 7 | `tests/unit/loyalty-redeem-race.test.ts` | `POST /api/loyalty/redeem — race re-check reporting` | updateMany count 0 → fresh re-read: totalOrders<cost → INSUFFICIENT; points<needed → INSUFFICIENT_POINTS; row vanished → NOT_FOUND; each maps to the correct Arabic user message | Money race reporting (`redeem/route.ts:105-107` uncovered) |
| 8 | `tests/unit/menu-cache-purge.test.ts` | `revalidateMenu — ISR + Data Cache purge (r118-A9-P3)` | slug found → `revalidatePath('/menu/<slug>')` + `revalidateTag('public-menu-<id>', {expire:60})`; null/unknown id → no-op; revalidateTag throws → swallowed (TTL bounds staleness); prisma reject → logged, never throws | The instant-purge hook for web+mobile cache is mocked in 9 suites but never tested itself |
| 9 | `tests/unit/restaurants-media-guard.test.ts` | `PUT /api/restaurants/[id] — cross-tenant media guard` | logo/gallery URL pointing at another tenant's blob path → 422 (restaurantMediaError fires); same-tenant URLs pass; guard runs on owner schema AND admin schema AND restricted-fallback schema | round87-A2 guard never fires in any test — cross-tenant media injection would regress silently |
| 10 | `tests/unit/admin-telegram-link.test.ts` | `POST /api/admin/telegram/link — verify token issuance` | EDIT_SETTINGS gate; token = base64url(payload.hmac) decodable, exp = now+300; getHmacKey throw → 500 «AUTH_SECRET غير مضبوط»; url = `t.me/<bot>?start=verify_` | Zero-coverage route feeding the account-linking flow the webhook tests assume |
| 11 | `tests/unit/admin-telegram-approvers-id.test.ts` | `DELETE /api/admin/telegram/approvers/[id]` | MANAGE_SUBSCRIPTIONS gate (r118-A2-P2); non-numeric id → 400; delete + audit row (telegramId/label); P2025 → handleError 404 | Zero-coverage hardened route (collection route IS covered by regression-sweep:498) |
| 12 | `tests/unit/restaurants-get-pii.test.ts` | `GET /api/restaurants/[id] — sub_admin VIEW_ANALYTICS ladder` | sub_admin with VIEW_ANALYTICS → full detail; without → public projection (no contact/billing PII); USER/anon → public/404 | PII ladder branch `:104-109` uncovered |
| 13 | `tests/unit/telegram-diagnose-masking.test.ts` | `GET /api/telegram/diagnose + /test — no token leakage` | diagnose 24 lines / test 6 lines: assert raw botToken/decrypted values NEVER appear in any response body, even for super_admin; failure paths degrade gracefully | Token-adjacent routes at 0% — the masking contract is only tested for config GET today |
| 14 | `tests/unit/plans-and-public-stats.test.ts` | `GET /api/plans + /api/public/stats — public contracts` | plans: active-only, price coercion, stable order; public/stats: counts only, no PII/tenant internals | Cheap wins on two 0% public routes (LF 11+5) |
| 15 | `mobile/` (new runner) | `cart-store / api-client / usePollWhenVisible` | the 3 highest-value mobile specs from §5 items 1-4 (cross-restaurant wipe r103-N3, 401-flip r102-M1, AppState poll lifecycle) | The entire 4932-LOC app has zero tests; these are pure-TS and CI-runnable with a vitest+jsdom setup |

Honorable mentions (next in line): `stats/advanced` fallback branches (140-211), `settings/route.ts` uncovered guards (129-132, 216-233), `csrf-client.ts` 46.7%, `demo/fix-images` 44.8%, e2e admin-panel subscription approval UI journey, delete-or-test `admin/events/trigger` (dead route writing EGP-currency fake events).

## 8. Method notes / evidence

- Test enumeration: `find . \( -name '*.test.*' -o -name '*.spec.*' \) -not -path '*/node_modules/*'` → 139 unit + 41 e2e + 2 security files.
- Coverage: `vitest run --coverage` → parsed `coverage/lcov.info` (SF/LF/LH + DA records) for per-file/per-line data; summary from text reporter.
- Branch verification: read `src/app/api/orders/route.ts` (467 ln), `telegram/webhook/route.ts` (342 ln), `health/route.ts` (78 ln), `public/menu/[slug]/route.ts` (174 ln), `restaurants/[id]/route.ts` (290 ln), `loyalty/redeem`, `telegram/config`, `auth/logout|me`, `admin/telegram/link|approvers/[id]`, `lib/menu-cache.ts`, `lib/subscription-decisions.ts` side-by-side with their test files (test-case names cited inline above).
- Skips/flakes: `grep -rn 'it.skip|describe.skip|it.todo|it.only|test.skip|test.only' tests/` and `grep -rn 'expect(true)|toMatchSnapshot' tests/` — results in §4.
