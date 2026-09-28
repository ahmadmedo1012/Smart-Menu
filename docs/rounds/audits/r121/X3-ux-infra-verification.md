# r121 — CROSS-CHECKER X3: UX/Perf/Infra P2 Verification + Full Dedupe

**Agent:** X3 (adversarial cross-checker) · **HEAD:** `74ef578f` · **Mode:** READ-ONLY (only this file written).
**Method:** independent re-read of every cited line + live production probes (curl GETs) + git-log
forensics + full-codebase sweeps (formatPrice decimals inventory, MotionArrow* inventory, main-landmark
inventory, Docker doc-reference sweep). Sibling claims were NOT trusted — each verdict below was
re-derived from source. Q-auditor's browser verdicts (J-1/H-3/G-1) were treated as evidence, not
re-run (no owner credentials seeded; browser work already done this round).

---

## PART 1 — THE 10 VERDICTS

### V1. G-5 — /subscribe worst LCP, all content client-gated → **CONFIRMED**

- **Structure (re-verified):** `src/app/(protected)/subscribe/page.tsx:1` is `'use client'`;
  `:345-351` — `if (loading) return <spinner + LoadingAnnouncer>` is the ENTIRE SSR body;
  H1 at `:363` renders only after the `/api/plans` client fetch (`:73-100`, incl. 1s auto-retry)
  resolves; a parallel `/api/auth/me` probe (`:120-139`) gates upgrade mode. **Live-proved by me
  this session:** `GET https://menu.smart-link.ly/subscribe` → 34,235 B doc (exactly G's number);
  the H1 text «انضم إلى» appears **0×** in the raw HTML; `animate-spin` + «جاري التحميل...»
  present; «اشترك الآن» appears only as the `<title>` meta.
- **/api/plans is public + cacheable:** `src/app/api/plans/route.ts` — no auth import at all,
  GET-only, in-memory 5-min TTL cache (`:4-7`); anonymous-whitelisted (E's r113-matrix cross-ref
  holds). A server-side fetch of the same data leaks nothing the API masks.
- **Pricing twin (re-verified):** `src/app/(public)/pricing/page.tsx` — server component,
  `export const revalidate = 300`, direct `prisma.subscriptionPlan.findMany`, **explicit
  plain-object mapping** (`:23-36`, the round91 RSC contract — spreading Prisma rows across the
  boundary throws console warnings), passes `initialPlans` into `PricingClient`; the client fetch
  survives only as a fallback (`:37-39`). r117 measured pricing LCP 268 ms.
- **Copyable to subscribe? YES, with one adjustment:** subscribe sits under `(protected)` whose
  layout runs the per-request `connection()` nonce flow → the page stays **ƒ Dynamic** (no
  `revalidate`). The fix is a server wrapper that fetches plans per request (tiny indexed
  `isActive` table; reuse `/api/plans`'s 5-min in-memory cache or a shared helper) and passes
  `initialPlans` into the client component (which keeps the `/api/auth/me` upgrade-mode probe and
  the existing fetch as fallback). Copy pricing's explicit field mapping verbatim.
- **Fix approach:** split `page.tsx` → server page (fetch + map) + `SubscribeContent` client with
  `initialPlans` prop; render H1 + StepIndicator + PlanSelector in the SSR shell. **Ride-along:**
  H-5 (upgrade-mode blank `?plan=` step) is the same file — fix it in the same refactor.
- **Risk:** low-moderate (auth-dependent branch must stay client-probed; plans are public so the
  SSR shell leaks nothing). Expected ≈ the ledger's −2.1 s LCP estimate; compounding with G-1
  removes ~127 KB gz from the same page's hydration path.

### V2. H-2 — checkout brick (latch before guard) → **CONFIRMED**

- **Exact code path (re-verified):** `src/app/(protected)/cart/page.tsx:169-170` —
  `submittingRef.current = true; setIsSubmitting(true);` latched BEFORE the try;
  `:215-221` — the r118-A5-F2 composed-notes guard `if (composedNotes.length > 500) { toast; return; }`
  exits inside the try **with no reset**; the only release points are the catch (`:269-276`) and
  the success tail (`:358-360`). Consequence chain verified: `ReviewDialog.tsx:162`
  (`disabled={isSubmitting}` + spinner «جاري...» at `:165`) is permanently disabled and the
  double-click guard (`:148`) blocks every future attempt — **recovery only via reload**, which
  first trips the `beforeunload` nag (`:85-92`, active because `items.length > 0`).
- **Precedent (re-verified):** `PaymentDialog.tsx:121-139` — the r120 fix carries the exact
  in-repo pattern with the comment «Validate BEFORE latching the guard — a failed validation must
  leave the button usable (previously the latch ran first and any validation failure bricked
  submission until full page reload». The two sibling guards in `handleCheckout` itself
  (delivery address `:153-161`, missing WhatsApp `:162-168`) already run pre-latch and are safe —
  the >500 guard is simply on the wrong side.
- **Fix approach:** move the `composedNotes` computation + guard up to sit with the
  delivery-address guard (before `:169`). Guard semantics unchanged; only the stuck state is
  released. **Risk ≈ 0.** Pair with M-5's e2e (>500 → toast → shorten → retry POST fires).

### V3. H-3 — /cart false-empty flash → **CONFIRMED** (Q browser-proved 0.39 s → 2.34 s)

- **Re-verified:** `src/store/cart.ts:246` `skipHydration: true`; `CartHydrator.tsx:6-12` —
  `rehydrate()` in a `useEffect` (post-paint) and only when in-memory items are empty (the
  deliberate never-clobber-quick-adds constraint), + cross-tab `storage` sync. CartHydrator is
  mounted in **both** group layouts (`(public)/layout.tsx:157`, `(protected)/layout.tsx:137`) —
  i.e. it already runs as early as any React effect can. `cart/page.tsx:371` — empty-state is the
  page's first branch; the server HTML itself contains «السلة فارغة» (Q proved on the real build;
  zero `hasHydrated`/`onFinishHydration` usage exists repo-wide).
- **Fix (a) hasHydrated gate + skeleton — assessed:** `/cart` is `noindex, nofollow`
  (`cart/layout.tsx:6`) → **zero SEO cost** in swapping the SSR'd false-empty-state for a
  skeleton. The `beforeunload` guard keys on `items.length` (store state), not on the render
  branch → **unaffected**. Genuinely-empty carts: brief skeleton → empty state (honest, no
  regression). Client-side navigations unaffected (store already in memory).
- **Fix (b) mount CartHydrator earlier — assessed and REJECTED as insufficient:** the hydrator is
  already in the earliest mountable position (root layouts); the false paint comes from the SSR
  HTML + pre-hydration window, which only a render gate covers. Calling `rehydrate()`
  synchronously at module scope would violate the never-clobber constraint the r76/r118-A5-F10
  design documents.
- **Smallest correct fix = (a):** a ~10-line `useCartHydrated()` hook
  (`useCart.persist.hasHydrated()` + `onFinishHydration` → safe `useSyncExternalStore`-style
  subscribe) + render the page's existing loading skeleton while `!hydrated && items.length === 0`.
  **Risk low.** Pair with M-5's e2e (seed localStorage cart, hard-load, assert «السلة فارغة»
  never paints).

### V4. H-1 — /cart money display forces `decimals: 1` → **CONFIRMED** (full inventory attached)

- **Every cited line re-verified:** `CartSummaryCard.tsx:29,41`; `CartLineItem.tsx:54`;
  `OrderDialog.tsx:377-378,438`; `menu-types.ts:127-129`; ReviewDialog `:139,148` smart-default
  (no opts) — same page, two formats, one pixel apart. `format.ts:68-81` — r120 smart trim is the
  default; explicit decimals remains authoritative **for documents** (invoice/share text).
- **Complete `formatPrice(…, {decimals})` inventory (23 sites, grep-verified):**
  - **Wrong (cart/menu display — voids the r120 invariant «12 → 12, 7.25 → 7.25»):**
    CartSummaryCard ×2, CartLineItem ×1, OrderDialog ×3, menu-types ×2 = **8 sites** (the fix).
  - **Drift (owner/admin display; optional second sweep for cross-surface consistency):**
    `owner/orders/[id]` ×3, `OrdersTable:192`, `OwnerOrdersList:49`, `OwnerKpiGrid:75`,
    `CategoriesList:211,216`, `admin/orders/[id]` ×3, `admin/page.tsx:314` (decimals:2 KPI —
    deliberate precision, defensible to keep) = 11 sites.
  - **Justified (documents, test-pinned):** `receipt.ts:57,58,68` decimals:2 — the WhatsApp
    receipt; H is right to leave untouched.
  - **MISSED BY H (found in my sweep):** `receipt.ts:108` — `buildOrderShareText` (owner/admin
    clipboard share text) uses `decimals: 1`. Per the `format.ts:71-74` contract share-text is a
    *document* (explicit decimals sanctioned), so this is NOT a display bug — but it disagrees
    with `buildReceiptMessage`'s `decimals: 2` (owner shares «23.0» where the customer receipt
    says «23.00», and 7.25 → «7.3» in the share text). **Flag: align to 2 (or explicitly keep
    with a comment + test pin).**
- **Fix approach:** drop `{decimals: 1}` at the 8 cart-family sites (keep `suffix: ''` pairings);
  optionally the 10 owner/admin display sites; align `receipt.ts:108` to `decimals: 2`.
  **Risk near zero** (pure display; formatter itself is unit-pinned, not these call sites).
  Add one composed-cart render pin (integer → no «.0»; 7.25 → «7.25»).

### V5. J-2 — back arrows wrong direction → **CONFIRMED** (5 sites; sweep: 0 missed violations, 1 borderline)

- **All 5 sites re-verified:** `CartPageHeader.tsx:21`, `CartEmptyState.tsx:31`,
  `order-confirmed/page.tsx:116` («العودة للرئيسية») + `:169` («العودة إلى القائمة»),
  `owner/orders/[id]/page.tsx:134` (MotionChevronLeft back-to-orders).
- **Convention re-verified as documented + dominant:** `print/page.tsx:150-151` («سهم العودة في
  RTL يشير يميناً»), `BackButton.tsx:20,29` («عودة» + MotionArrowRight), `LoginForm.tsx:132`,
  `admin/orders/[id]:98`, `owner/loyalty:407,471`, `owner/qr:108`, `owner/reviews:101`,
  `SubscribeForm.tsx:577` (رجوع=ArrowRight) vs `:590` (التالي=ArrowLeft — forward, correct).
- **Full sweep of all 27 `MotionArrowLeft`/`MotionChevronLeft` usages:** every non-flagged site is
  a **forward** affordance (PlanSelector:137 «متابعة», owner/page:461 «إدارة», SubscribeForm:590
  «التالي», pagination ×3, landing/carousel CTAs ×3) or a deliberate mirror
  (`rtl:-scale-x-100` in GalleryCarousel/FeaturedShowcase ×4). **One borderline J did not name:**
  `CartSlideOver.tsx:122` — the sheet **close** button («إغلاق») renders MotionArrowLeft.
  Close ≠ back, so not a counted violation — but while fixing J-2, consider an X icon (or
  ArrowRight) there for one consistent dismissal language.
- **Fix:** swap the 5 call sites to `MotionArrowRight`/`MotionChevronRight` (both exist,
  `motion-icons.tsx:74-79`). **Risk trivial.**

### V6. J-3 — owner menu rows collapse ≤390px → **CONFIRMED** (arithmetic; my numbers slightly worse than J's)

- **Math re-derived from code:** row children (`CategoriesList.tsx:155-257`, `flex gap-3 px-5`):
  grip `size-4` 16 + thumb `size-10` 40 + price block (`shrink-0 whitespace-nowrap`, number +
  «د.ل» + optional strike line) ≈ 55-65 + switch cluster (Switch sm = `w-[24px]` — verified
  `switch.tsx:19` — + `gap-2` 8 + `w-14` label 56 = 88) + buttons (2×`h-10 w-10` + `gap-0.5` =
  82) + 5×`gap-3` 60 + `px-5` 40 ⇒ **fixed ≈ 381-391 px**. Available: 390 − 32
  (`owner/layout.tsx:150` `main p-4` below md) = **358 px** → name column gets ≤ 0
  (deficit ~25-35 px; J's "fixed ≈330-340, deficit ≥20" is directionally right, mine is worse).
  `flex-1 min-w-0` converts the deficit into name collapse, not overflow — why every
  "no-overflow" QA pass (r113/r120-U7) held. Visual effect itself UNVERIFIED (Q had no owner
  credentials) — arithmetic is a FACT.
- **Smallest responsive fix (J's, endorsed):** `hidden sm:inline` on the `w-14` status word
  (Switch + `aria-label` already carry state) + `hidden md:block` on the grip (HTML5 drag is a
  pointer affordance; on touch it never worked anyway) ⇒ returns **~92 px** to the name at 390 px.
  Pure class additions, no JS, no layout refactor (wrap/grid rejected as bigger diffs).
  **Risk low.** gstack check at 375/390: name readable on one line.

### V7. K-1/K-2 — nested `<main>` + `aria-live` on dashboard main → **CONFIRMED** (blast radius 24 routes, not 21)

- **All sites re-verified:** `(protected)/layout.tsx:142` `<main id="main-content">` (group-wide);
  nested inside it: `owner/layout.tsx:147-150` and `admin/layout.tsx:126-130` — both
  `<main aria-live="polite" aria-label="محتوى الصفحة">` — and
  `order-confirmed/page.tsx:95` + `:133` `<main className="min-h-screen …">`.
- **Blast radius (glob-counted):** 10 owner pages + 13 admin pages + order-confirmed = **24
  routes** render two `<main>` landmarks (K said ~21; B said 23 dashboards — actual 23 + 1).
- **Styling keyed on `<main>`: NONE** — grep of `globals.css` finds zero `main` element selectors
  (only a comment containing the word "main-thread"); zero `querySelector('main')` /
  `closest('main')` in `src/`. All styling is class-based ⇒ the div-rename is a visual no-op.
- **Fix approach:** inner `<main>` → `<div>` (keep classes; the skip link keeps targeting the
  OUTER `#main-content`), dropping `aria-live` in the same edit (K-2). **Must pair with K-6** —
  add the proper visually-hidden `role="status"` new-order announcement on /owner/orders so the
  accidental (chatty, browser-dependent) live-main announcement is replaced by a deliberate one.
  **Risk near zero.** Note for the fix batch: B-2/A-2/E-4 (below) touch the same two layout
  files — do K-1/K-2/K-6 in the same layout batch to avoid double churn.

### V8. L-1 / L-2 / L-5 — robots metadata batch → **ALL THREE CONFIRMED**

- **L-1 (protected default index,follow):** `(protected)/layout.tsx:57-60` re-verified. The
  owner/admin layouts are `'use client'` (verified) → **they cannot export metadata**; the fix
  correctly belongs in the server `(protected)/layout.tsx`: `robots: { index: false, follow:
  true }`. The four existing segment overrides (login/subscribe/cart/order-confirmed layouts)
  are page-level and keep winning — no conflict. **Optional backstop:** `proxy.ts`'s
  PROTECTED_ROOTS branch could stamp `X-Robots-Tag: noindex` — defense-in-depth worth one line
  while someone is in the file, but the metadata one-liner is the minimal fix. Live mitigation
  (proxy 307 + robots.ts disallow) confirmed — latent, not live.
- **L-2 (print page, extends B-3):** `print/page.tsx:20-27` `generateMetadata` returns title only
  — re-verified; inherits `index, follow` from `(public)/layout.tsx:55-58`, no canonical, og:url
  = apex `/`. `robots.ts:8` disallows `/menu/*/print` while `MenuHero` links it from every
  indexed menu page (blocked-noindex recipe). **Fix:** add `robots: { index: false, follow:
  false }` + `alternates: { canonical: '/menu/${slug}' }` to print's generateMetadata, THEN drop
  `/menu/*/print` (and `/cart`, `/order-confirmed` per L-6) from the robots.ts disallow so the
  noindex is actually crawlable.
- **L-5 (404 dual robots + dead catch-all config):** `(public)/layout.tsx:55-58` emits
  `index, follow`; `(public)/not-found.tsx:46` hoists `<meta robots noindex>` ⇒ both metas on
  every 404 (L live-proved; mechanism re-verified — when `notFound()` throws, the page's own
  metadata is discarded and boundary+layout metadata wins, which is also why
  `[...notfound]/page.tsx:20-26`'s robots + title are dead config). **Fix:** remove the `robots`
  field from `(public)/layout.tsx` — no meta emitted = crawler default `index,follow`, identical
  behavior for every live public page; 404s then emit exactly one robots meta. **Check:** no test
  may pin the literal `index, follow` string (L flagged; update snapshot if so).
- All three + L-6 land as **one metadata batch** (4 small diffs + snapshot updates).

### V9. B-1/N-6 — /terms+/privacy cache-control conflict → **CONFIRMED** (live re-verified by me)

- **Code re-verified:** `src/proxy.ts:47-56` — `isCacheablePage` includes `/terms` + `/privacy`
  (r120-W1) and `:156-159` stamps every cacheable response
  `public, max-age=60, s-maxage=60, stale-while-revalidate=86400`; `vercel.json:23-42` —
  `max-age=3600` for exactly those two paths (r119-B3). **Live curl this session:** BOTH
  `/terms` and `/privacy` → `cache-control: public, max-age=60, s-maxage=60,
  stale-while-revalidate=86400` — the middleware header wins on Vercel; the vercel.json rules
  are dead config; the r119 ledger claim (`ENGINEERING_STATE.md:260`) is LEDGER-STALE.
- **Single intended policy (decision):** **proxy.ts owns browser caching for cacheable pages.**
  It is the only layer that applies on every platform and already owns the other five paths;
  vercel.json is a Vercel-only duplicate that has now silently lost once. Value: **3600** for
  /terms + /privacy — restores the documented r119-B3 intent and matches the routes' own
  `revalidate = 3600` (static legal text; 60 s forces browsers to revalidate hourly-fresh
  content every minute).
- **Every file that must change together (3 + 1 test):**
  1. `src/proxy.ts` — per-path value in the `isCacheablePage` branch:
     `/terms|/privacy` → `public, max-age=3600, stale-while-revalidate=86400`, else current 60 s
     (add one comment line naming the three header layers and who wins — N-6's doc ask);
  2. `vercel.json` — delete the entire `headers` block (:23-42; nothing else lives there);
  3. `docs/ENGINEERING_STATE.md:~260` — replace the stale r119-B3 "LIVE: max-age=3600" note with
     the r121 state (proxy-owned, per-path, vercel.json rules removed);
  4. one e2e/unit assertion on `/terms` cache-control (covers both findings; the r119
     verification was manual).
- **Risk:** low (header-only; ISR revalidate stays 3600 either way).

### V10. N-3 vs R — Dockerfile dead or alive → **VERDICT: DEAD. N-3 CONFIRMED; R's "maintained" REFUTED as deploy-relevant.**

- **Buildability chain re-verified end-to-end:** `Dockerfile:21` `RUN npx prisma generate && npm
  run build`; `package.json:7` build = `db-unstick → migrate-deploy → prisma generate → next
  build` (the r98 chain); the builder stage declares **no ARG/ENV for any variable**
  (only COREPACK/NODE_ENV/PORT exist, and NODE_ENV=production is in the *runner*); 
  `.dockerignore:15-17` excludes `.env*`; `prisma.config.ts:10` `env("DATABASE_URL")` **throws
  when absent** (the file's own comment :12-14 says so) ⇒ `migrate-deploy` exits non-zero ⇒
  `docker build` fails. Even with a DB URL, `next build` next fails `validateEnv()`
  (JWT_SECRET 64 / AUTH_SECRET 32 / NEXT_PUBLIC_DOMAIN / NEXT_PUBLIC_WHATSAPP_NUMBER — none
  plumbed).
- **Git forensics:** Dockerfile last touched `7c2dd2fb` **2026-09-06** (round87-D6); the
  build-chain change `a6ef80dd` **2026-09-11** (r98-deploy) postdates it by 5 days and broke it.
  Telling detail: round87's own plan line described the pre-D6 Dockerfile as «لا يُبنى أبداً»
  ("never built") — D6 fixed the pinning hygiene, but no round ever wired a working build.
  R's "LEDGER-VERIFIED" refers to r119-S11:116 ("exists, no doc mentions a Docker path" — a P4
  note), i.e. *unchanged*, not *buildable*. N's buildability test is the deploy-relevant one.
- **Is Docker a supported deployment anywhere? NO** — full doc sweep: zero operational docs
  describe a Docker path (r119-S11:116 logged its absence; `repair-plan.md` called the Dockerfile
  optional/"unnecessary with Vercel"; ledger #13 only *contemplates* self-host as a future
  project). The real deploy path is Vercel git-integration.
- **Decision (Ponytail): DELETE** `Dockerfile` + `.dockerignore` (both exist only for each
  other), with a one-paragraph ledger note: "self-host path removed at r121 — recoverable from
  git history; if self-host ever becomes real it is a designed project (env plumbing, upload
  stream limit per ledger #13, ALS logger per A-6, TRUST_PROXY_DEPTH per E, print-cache
  exception per B-7), not a resurrected 38-line file." Fixing instead (ARG/ENV wiring) would
  produce an **untested** escape hatch — a false sense of safety worse than none. Deletion also
  dissolves N-8's `.dockerignore:3` phantom-reference sub-item.
- **Risk of deleting:** near zero (nothing references it but docs; history preserves it).

---

## PART 2 — DEDUPE: consolidated non-redundant fix list

### 2.1 Merge map (duplicates & overlaps → single items)

| Merged item | Absorbs | Notes |
|---|---|---|
| **M-C2. Money-truth regression** | C-2 ≡ D-1 (+D-10 N+1 note) | D-1 is the superset (adds the backfill migration + receipt.ts legacy understatement). One fix: drop `+deltaSum` in whatsapp/generate + `zz_` backfill + modifier-line test. |
| **M-Status. Order-status unification** | I-1 ≡ A-3 | Same fix locus: admin pages import `ORDER_STATUS_META`, delete 2-3 local maps. |
| **M-Cache. Terms/privacy cache policy** | B-1 ≡ N-6 | V9 above — 3-file sync, one owner (proxy.ts). |
| **M-Runbook. ops-runbook refresh** | N-2 ⊃ R-3 | N-2 absorbs the uptime row + adds Prisma flag fix, deploy-block playbook, cron docs. |
| **M-Gitattrs. .gitattributes** | N-8 ≡ R-4 | One 3-line file + renormalize no-op check; `.dockerignore:3` phantom ref dissolves with V10 deletion. |
| **M-AppURL. NEXT_PUBLIC_APP_URL** | N-7 ≡ L-8 | One `.env.example` line + optional `envSchema.optional()` + origin consolidation toward `NEXT_PUBLIC_DOMAIN`. |
| **M-SettingsVal. Settings/registration validation parity** | C-4 + H-4 (UI half) (+C-13 telegram config caps) | Shared zod field schemas server-side + mirrored `maxLength` client-side. |
| **M-Price0. Free items round-trip** | C-7 (price-0 half) + H-7 (UI half) | Allow 0 on PUT + fix the UI gate/blanking. |
| **M-ErrSurface. Owner error envelopes** | H-6 + D-7 + P-5 (error-swallow half) | `getErrorMessage` on owner menu CRUD ×3 + category-delete pre-check 409 with actionable copy + expiry-403 copy surfacing. |
| **M-Polyfill. qrcode/polyfill chunk** | G-1 ⊃ F-1 | G-1 supersedes (127 KB gz × 28 routes vs F's 45 KB × 2). Fix + bundle-report signature guard (G-2's one-liner rides along). |
| **M-MenuDoc. Menu doc weight** | B-5 + G-4 | G-4's verdict governs: keep `hasMenu`, trim `description` only if page.tsx is already open; don't fight the 201 KB SSR DOM. |
| **M-DeadCode. Dead exports/CSS/tokens** | F-2 + O-2 + O-6 + O-10 + O-11 + A-5 + I-6 + I-2(option b) | One deletion batch ≈260-280 JS lines + ~100 CSS lines, typecheck-gated. |
| **M-DashAuth. Dashboard auth/shell** | B-2 + A-2 + E-4 | Same two layouts: server `requireAuth()` (login/page.tsx pattern) fixes null-shell + 2-3× `/me` + fake-cookie shell in one move. **Batch with K-1/K-2/K-6 + L-1 (same files).** |
| **M-Landmarks. main→div + live region** | K-1 + K-2 + K-6 | V7 above — one edit locus, must land together. |
| **M-Print. Print page metadata** | B-3 ≡ L-2 (+L-6 interplay) | noindex + canonical + robots.ts disallow trim. |
| **M-Brand. Titles & brand tokens** | L-4 + Q-2 + P-8 (+ dead `login/layout.tsx` title) | One brand decision → 5 title edits + /admin title + ~6 body-copy strings. |
| **M-FAB. Floating WhatsApp** | J-1 + P-6 (NOT merged — sequenced) | J-1 = z-band fix (all surfaces); P-6 = remove FAB from /menu/[slug] (brand). Complementary; if P-6 lands first, J-1's e2e must target /cart. |
| **M-TestContract. Fix-batch tests** | M-4 + M-5 | Not code — the required-test table that pairs with every P1/P2 fix below. |
| **M-Subscribe. Subscribe SSR shell** | G-5 + H-5 | Same file; H-5 rides the refactor. |
| **M-ZBand. z-index policy** | J-1 + J-9 + I-6 (z-registry slice) | Fix J-1 AND update the registry comment; I-6's token deletion must not remove the registry while J-1 re-bands it. |

### 2.2 Conflicts flagged (fix A breaks fix/pin B — must land together)

1. **C-1 fix (deleteMany) ⇄ r103-fixes F5b** — mock shape (`review.delete`) no longer matches;
   update F5b + add row-survival assertions in the same commit (M-4).
2. **D-2 broad form (reject ALL backward transitions) ⇄ order-lifecycle.test.ts:300**
   ("completed→ready allowed" pin) — use the NARROW fix (reject only `cancelled→completed`) or
   update the pin deliberately.
3. **L-5 (remove public-layout robots) ⇄ any metadata snapshot** asserting the literal
   `index, follow` string — update snapshots.
4. **M-9 ratchet raise ⇄ M-5 new tests** — raise thresholds only AFTER the fix-batch tests land.
5. **J-1 z-reband ⇄ I-6 z-token deletion** — sequence J-1 first; keep the registry comment.
6. **P-1 option (b) (make yearly real) ⇄ money path** (amount ×10, planEnd +365, Telegram payload)
   — the ponytail fix is option (a) remove; (b) is a mini-project, do not mix into the batch.
7. **I-2 option (a) (theme-aware shadows) ⇄ 197 call sites** — visual-regression risk; prefer
   (b) delete dead declarations (folds into M-DeadCode) and defer (a).
8. **M-DashAuth (async server layouts) ⇄ nonce/CSP flow** — layouts run under `connection()`;
   re-verify the nonce stamps after the rewrite (E-4's own risk note).

### 2.3 Final consolidated fix list — P1/P2 only, ordered by (user impact × inverse risk-of-fixing)

**P1 tier (ship first):**

| # | Item (merged ID) | Fix | Risk of fixing |
|---|---|---|---|
| 1 | **M-C1** C-1 (+M-4) — cross-tenant review DELETE commits then 404s | `deleteMany({where:{id, menuItemId}})` + re-read; update F5b + row-survival tests | ~0 |
| 2 | **M-E1** E-1 — cross-tenant item move via PUT categoryId | mirror POST's target-category ladder (one conditional block) | low |
| 3 | **M-M1** M-1 — 7 e2e pins expect pre-r119 400s | update 7 pins to 422 (CI gate un-reds before billing restore) | none |
| 4 | **M-ZBand** J-1 (+J-9) — floating z-band over modal band, money-CTA tap-hijack (Q-proven ×3) | z-30 the three controls or hide-on-modal (`data-modal-open`); update z-registry comment | low |
| 5 | **M-Polyfill** G-1 (⊃F-1, +G-2 guard) — 127 KB gz orphan polyfill × 28 routes | dynamic `import('qrcode')` in SelfHostedQR (ReferralQR precedent) + bundle-report signatures | low (precedent-proven) |
| 6 | **M-P2** P-2 (+P-7) — landing fabricates features + invented +32% stat | rewrite 2 feature cards to true capabilities; swap stat for a true micro-proof | none (copy) |
| 7 | **M-P1** P-1 — yearly toggle is display-only fiction (charges monthly) | remove toggle + «وفر شهرين» + displayPrice ×10 branch (option a) | none for (a) |
| 8 | **M-H2** H-2 — checkout brick: >500-notes guard returns latched | move guard pre-latch (PaymentDialog.tsx:121-139 precedent) + e2e | ~0 |
| 9 | **M-C2** C-2/D-1 — server invoice double-counts modifier deltas + mixed-era rows | drop `+deltaSum` + `zz_` backfill migration + modifier-line test | low (backfill needs dry-run) |
| 10 | **M-E2/E3** E-2 + E-3 — panel self-approval gap + admin-password reset takeover | two small guards (payment.userId ≠ caller; extend target guard to `admin` role) | low |

**P2 tier (next 20, same ordering rule):**

| # | Item (merged ID) | Fix |
|---|---|---|
| 11 | **M-D2** D-2 (narrow) — cancelled→completed grants loyalty/referral on dead revenue | one 422 guard before the accrual block (+test; watch the :300 pin) |
| 12 | **M-C3** C-3 — pending-slug reservation enforced on 1 of 3 slug paths | extract lib guard, call in restaurants/[id] PUT + owner/restaurants POST + settings slug branch |
| 13 | **M-SettingsVal** C-4+C-5+H-4(+C-13) — unbounded restaurant fields via 3 channels | shared zod field schemas + client `maxLength` mirrors + staff-branch tests (M-5) |
| 14 | **M-H1** H-1 — cart money display `decimals:1` | drop at 8 cart-family sites; align `receipt.ts:108` to 2; optional owner/admin sweep |
| 15 | **M-H3** H-3 — /cart false-empty flash (Q: up to 2.34 s) | `useCartHydrated()` gate + skeleton (V3 fix (a)) + e2e |
| 16 | **M-Subscribe** G-5 (+H-5) — /subscribe SSR shell | server wrapper + `initialPlans` (pricing twin, per-request) + upgrade-mode ?plan escape |
| 17 | **M-Landmarks** K-1+K-2+K-6 — nested main + live-main + missing new-order announcement | inner main→div ×3 + drop aria-live + `role=status` region on /owner/orders |
| 18 | **M-DashAuth** B-2+A-2+E-4 — dashboard null shell / 3× /me / fake-cookie shell | server `requireAuth()` on the two layouts (batch with #17 + L-1; re-verify nonce flow) |
| 19 | **M-L1** L-1 — protected robots default index,follow | one line in (protected)/layout.tsx (+optional proxy X-Robots-Tag backstop) |
| 20 | **M-M3** M-3 — login non-JSON body → 500 | catch parse → 400 Arabic envelope + negative tests |
| 21 | **M-P4** P-4 — post-payment approval black hole | `subscription_approved` branch in UserBannerNotifier + pending-status card + honest SLA copy |
| 22 | **M-ErrSurface** P-5+H-6+D-7 — expiry cliff + swallowed error envelopes | `getErrorMessage` ×3 + category 409 pre-check + expiry banner (planEnd in /me) |
| 23 | **M-P3** P-3 — fabricated testimonials w/ real brand names | drop carousel / DB-source the grid (owner decision required — flag to user) |
| 24 | **M-P6+J-1-seq** P-6 — platform FAB on restaurant menus | render FAB outside /menu/[slug] (or restaurant number via context); sequence with #4 |
| 25 | **M-J2** J-2 — back arrows ×5 (+CartSlideOver close borderline) | swap to MotionArrowRight/ChevronRight |
| 26 | **M-J3** J-3 — owner menu rows collapse ≤390px | `hidden sm:inline` status word + `hidden md:block` grip (~92 px back to the name) |
| 27 | **M-K3** K-3 — skip link bypasses nothing | hoist headers above main or re-target skip id to content wrapper |
| 28 | **M-K4** K-4 — gallery lightbox focus escape/no return/no arrows | querySelectorAll trap + focus return + arrow keys (ReviewSheet pattern) |
| 29 | **M-K5** K-5 — admin charts expose zero data to SR | data-bearing ariaLabel via ChartCard/summary pattern |
| 30 | **M-Status** I-1/A-3 — order-status color language split | admin imports ORDER_STATUS_META, delete local maps |

**Remaining P2s (batched, order within batch by file family):** I-2/I-3/I-4/I-5/I-6/I-13
(design-system consolidation — one batch, I-13 PRODUCT.md/DESIGN.md as the vehicle) · O-1
(pickup-label map ×7) · A-1 (telegram notify dedup, money path) · N-1 (author-email tripwire) ·
N-2+R-3 (runbook) · R-1 (r96 scripts archive) · R-2 (README counts) · M-2 (seed guards) · M-6
(playwright install doc).

**P3 backlog (grouped, non-redundant):** G-3/G-6/G-7 (perf ledger) · B-4/B-6/B-7 (proxy/config
hygiene) · C-6/C-8/C-9/C-10/C-11/C-12 (API hygiene batch) · D-3/D-4/D-5/D-6/D-8/D-9 (one
`zz_round121` migration + code follow-ups) · E-5/E-6 (documented tradeoffs + one pre-KDF IP
throttle) · H-8..H-11 (UX polish) · J-4..J-8 (RTL polish) · K-7..K-12 (a11y polish) · L-3/L-7/
L-9 (SEO data hygiene) · Q-1/Q-3 (local-noise + CTA fold) · P-9..P-12 (product polish) ·
O-3..O-9 (dead-surface deletions, fold into M-DeadCode) · F-3/F-4/F-5 (dep config) · N-4/N-5
(CI/env hardening) · R-5/R-6 (gitignore/docs-index) · M-7..M-10 (test docs/ratchet) · A-4/A-6/
A-7/A-8/A-9/A-10 (architecture residue) · **N-3 (V10): DELETE Dockerfile + .dockerignore**.

---

## Counts

- **Part 1:** 10 verdicts — 10 CONFIRMED (V10 = N-3 confirmed / R's counter-claim refuted);
  0 REFUTED findings; refinements added: V4 (receipt.ts:108 missed site + inventory), V5 (0
  missed arrow violations + 1 borderline close button), V6 (deficit re-computed 25-35px, worse
  than claimed), V7 (blast radius 24 not 21), V3 (fix (b) rejected with mechanism).
- **Part 2:** ~55 raw P1/P2 findings → **30 ordered P1/P2 fix items** (+ ~10 batched P2s + P3
  backlog); 20 merge entries; 8 conflicts flagged; Q's 3 sibling verdicts folded as evidence.
- **Live probes run this session:** /subscribe (34,235 B, H1 absent from SSR), /terms + /privacy
  (cache-control 60 s — proxy wins). Git forensics: Dockerfile vs r98 build-chain dates.
