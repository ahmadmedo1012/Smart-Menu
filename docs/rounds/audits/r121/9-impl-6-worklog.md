# 9-impl-6 — r121 worklog (PERFORMANCE WAVE + small RTL fixes)

Task ID: 9-impl-6 (IMPL-6, engineering round r121, MASTER-BACKLOG P3-perf backlog: G-5, G-6, G-7,
G-3-upload-half, J-4, J-7).
Code-writing task: the perf wave — /subscribe SSR shell (the big one), orb-float viewport gating,
StickyMenuHeader mount-gate narrowing, Vercel-Blob cacheControl, + the two RTL dvh/dir fixes.

Verification (final state): `pnpm typecheck` 0 errors · `pnpm test` **150 files / 2174 tests ALL
PASS** (baseline at task start: 148/2152 — +2 files, +22 tests, all mine) · eslint exit 0 on all
15 touched files · standalone-server SSR smoke on an isolated `git worktree` build of HEAD
e0dcc44b + exactly my 12 source files (before/after pair below, one-session pattern). NO git commit.

## What shipped (item by item)

1. **G-5 /subscribe SSR shell (−LCP on the worst page — X3-V1 CONFIRMED approach)**: the page was
   100% client-gated (spinner-only SSR, H1 0× in the raw HTML, 4.47s live LCP). Converted to the
   pricing twin (round86-B5) exactly:
   - `src/lib/plans-server.ts` (NEW): pricing's server fetch extracted VERBATIM (same query, same
     F-D/round91 explicit plain-object mapping, same null-on-failure → client fallback contract) +
     /api/plans' 5-min in-memory TTL (X3: "reuse /api/plans' 5-min in-memory cache or a shared
     helper") — /subscribe stays ƒ Dynamic under (protected)'s connection() nonce flow, so the TTL
     amortizes the per-request fetch. ONE data layer, not a second one.
   - `pricing/page.tsx`: now imports the shared helper (pure refactor — its ISR/revalidate=300
     and PricingClient contract untouched).
   - `subscribe/page.tsx`: rewritten as the server wrapper (await getActivePlans → Suspense →
     client island); build confirms the route stays ƒ Dynamic (X3's prediction — no `revalidate`
     export added).
   - `subscribe/SubscribeClient.tsx` (NEW): the old client page, seeded with `initialPlans`
     (PricingClient's exact init pattern: `useState(initialPlans ?? [])`, `loading =
     initialPlans === null`); the /api/plans client fetch survives ONLY as the fallback (skipped
     via `if (initialPlans !== null) return;`); the /api/auth/me upgrade-mode probe stays
     client-side (X3 verdict); `?plan=` deep-links now resolve against the server-baked plans in
     the useState initializer (no fetch round-trip before the wizard opens). H1 + StepIndicator +
     PlanSelector paint in the SSR shell; plan selection → register form → payment flow unchanged.
2. **H-5 ride-along (X3-V1's explicit "fix it in the same refactor")**: upgrade-mode +
   unresolvable `?plan=` used to render a BLANK step (none of the three branches matched). Added
   the r120 SubscribeForm escape mirror («تعذر تحميل الخطة المحددة» + «تصفح جميع الباقات» →
   step 1) for `step !== 'plan' && authLoaded && upgradeMode && !currentPlan`. Flagged as a
   ride-along (not in my assigned 6) in the report.
3. **G-6 orb-float viewport gating**: the 2 infinite blur-120/140px orbs now live in a tiny client
   island `src/components/menu/OrbField.tsx` (MenuHero stays a server component) that pauses them
   via `animation-play-state` when the hero leaves the viewport — the codebase's existing
   IntersectionObserver pattern (ui/scroll-reveal.tsx). `inView` starts true + the running state
   emits NO inline style → pre-hydration HTML byte-identical, orbs animate on first paint; the
   container keeps `motion-reduce:hidden` (global reduced-motion untouched — globals.css NOT
   edited, it's IMPL-4's file). HeroDecor's 2 cheap SVG orbs left as-is (no blur; the audit's cost
   driver is the gaussian blur).
4. **G-7 StickyMenuHeader mount-gate narrowing**: `{mounted && <StickyMenuHeader/>}` →
   unconditional in MenuClientSection (deterministic initial state: scrolled=false +
   mobileOpen=false; useScroll/useMotionValueEvent are subscription-side) — the sticky glass
   header now paints with the document (was 2.6s header-less under throttle). LoyaltyWidget KEEPS
   its gate (reads localStorage loyalty state). Stale "ssr:false, post-hydration" comment updated.
5. **G-3 (upload half)**: `put()` now sends `cacheControlMaxAge: 31536000` — read the installed
   @vercel/blob 2.6.1 types in node_modules: the option is **cacheControlMaxAge (seconds)**; the
   audit's suggested `cacheControl: '…immutable'` string is the v1 spelling and does not exist in
   v2's PutCommandOptions. Unique filenames (`${Date.now()}-${random8}`) = immutable-safe.
   + unit test asserting the option + the unique-filename contract.
6. **J-4 PaymentDialog bank rows**: the three rows now carry a `numeric` flag — account no./IBAN
   keep `dir="ltr"` + font-mono isolation; the Arabic bank NAME (config bank_transfer_bank_name)
   renders `dir="auto"` + `text-start` (was: forced LTR/left/mono → misaligned + reordered).
7. **J-7 vh→dvh ×2**: ReviewSheet.tsx `max-h-[85vh]` → `max-h-[85dvh]` and RestaurantFormDialog
   `max-h-[85vh]` → `max-h-[85dvh]` (aligns with the system's dvh standard — iOS Safari URL-bar
   trap on bottom sheets/dialogs).

## Subscribe before/after SSR evidence (same standalone server, same PG :5434, same machine)

Isolated worktree build of HEAD e0dcc44b (BEFORE) vs HEAD + my 12 files (AFTER); server started
per-call, curl, killed in the same call (r121 one-session pattern; ports 3131-3133 — :3000 free
this session but kept off it):

| Check (raw HTML) | BEFORE (HEAD) | AFTER (fix) |
|---|---|---|
| `GET /subscribe` | 200, 32,514 B | 200, 54,631 B |
| H1 «انضم إلى الربط الذكي» | **0×** | **1×** |
| Plan cards («اختر خطة تناسب مطعمك» + h3 «مجاني»/«المدفوعة» + «د.ل/شهر») | 0× | all present |
| Spinner (`animate-spin`) | present | **absent** |
| `?plan=Premium` step-2 SSR («الخطوة 2: بيانات المنيو (الحالية)») | 0× | **1×** (aria-current="step") |
| `/menu/al-waha-cafe-demo` header in raw HTML (`aria-label="القائمة"` — G-7) | 0× | **1×** |
| Menu orbs in raw HTML (G-6 — `animate-orb-float` ×2, `blur-[120px]`) | present | present (identical) |

Matches X3's live-production probe of the BEFORE state (34,235 B doc, H1 0×, spinner present) —
the local BEFORE build is the same shape. `/pricing` regression-checked in the same pass: 200 +
plans rendered (73,244 B local doc; smaller than live 93 KB because the local build already
carries IMPL-5's landing/testimonial trims).

## Tests (M-9/M-5: with the fixes)

- `tests/unit/r121-subscribe-ssr.test.ts` (NEW, 10 tests): renderToString SSR contract (H1 +
  plans + no spinner + no hidden-style h1), fallback path (initialPlans=null → loading state +
  fetch-only-when-missing source guard), server-wrapper wiring (page is a server component, BOTH
  pages use the one helper, /me stays client), H-5 escape branch pin.
- `tests/unit/r121-perf-rtl.test.ts` (NEW, 11 tests): OrbField renders both orbs identically with
  no paused style in SSR + observer/play-state source guards + reduced-motion kill switch;
  MenuClientSection renderToString — header markup in the raw HTML, restaurant name present,
  LoyaltyWidget still gated (source + DOM); J-4/J-7 source guards.
- `tests/unit/upload-route.test.ts` (+1 test, 18→19): cacheControlMaxAge=31536000 + unique
  filename regex.
- Subscribe e2e specs (r110 ?plan=Premium, r93-sim-owner, team4, ui-sweep/smoke/full-sweep, qa-
  helpers): READ, none pin the spinner — all behavior-based (goto + interact), no updates needed;
  SSR plans make them faster, not different.

## Deviations / judgment calls (flagged)

- **H-5 fixed as X3-V1's ride-along** — not in my assigned 6, but X3's verdict on MY approach
  explicitly says "fix it in the same refactor" and it's a 6-line additive branch in the file I
  was restructuring (owner dead-end on stale ?plan= links). Pinned by test.
- **G-3 option name differs from the audit's text** — `cacheControlMaxAge: 31536000` (SDK v2
  spelling, read from node_modules types) instead of the audit's `cacheControl: 'public,
  max-age=31536000, immutable'` (v1 spelling, would not typecheck). Same semantics (edge+browser
  cache 1y; Blob serves immutable for high max-age).
- **pricing/page.tsx touched (outside my listed scope)** — to extract the shared helper WITHOUT
  duplicating the mapping ("reuse the pricing page's exact server pattern… do not invent a new
  data layer" — one helper beats two copies). Not in IMPL-4's file list; pure refactor, pricing
  behavior unchanged (ISR 5m intact, build-verified ○ Static 5m).
- **HeroDecor SVG orbs NOT gated** — the audit's quantified cost is the 120/140px gaussian blur
  GPU raster; the 2 small SVG transforms are cheap and gating them would need a second wrapper.
  Ponytail: gated the expensive pair only.
- **G-6 via IntersectionObserver island, not CSS animation-timeline** — scroll-driven CSS would
  need globals.css (IMPL-4's file, avoided) and would SCRUB the float instead of pausing it;
  the observer matches the codebase's existing pattern (checked: scroll-reveal.tsx,
  clip-path-reveal.tsx).
- **An Edit-tool re-indent accident on RestaurantFormDialog.tsx** (tabs→spaces, ~596 lines of
  churn) was caught by diff review and reverted — the final diff is 3 lines with original tabs.

## Files (mine only — the tree also carries IMPL-4's parallel work, untouched)

New: `src/lib/plans-server.ts`, `src/app/(protected)/subscribe/SubscribeClient.tsx`,
`src/components/menu/OrbField.tsx`, `tests/unit/r121-subscribe-ssr.test.ts`,
`tests/unit/r121-perf-rtl.test.ts`.
Edited: `src/app/(protected)/subscribe/page.tsx` (rewritten as server wrapper),
`src/app/(public)/pricing/page.tsx`, `src/components/menu/MenuHero.tsx`,
`src/components/menu/MenuClientSection.tsx`, `src/components/menu/StickyMenuHeader.tsx`,
`src/app/api/upload/route.ts`, `src/components/shared/PaymentDialog.tsx`,
`src/components/menu/ReviewSheet.tsx`,
`src/app/(protected)/admin/restaurants/RestaurantFormDialog.tsx`,
`tests/unit/upload-route.test.ts`. (globals.css / configs / mobile / IMPL-4 files: untouched.)
