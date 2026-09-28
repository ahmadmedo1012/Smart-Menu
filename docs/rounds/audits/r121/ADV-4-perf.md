# r121 — ADV-4: Final Adversarial Performance Review (fresh eyes, measured-first)

**Task ID:** 15-ADV-4 · **HEAD:** `77407604` · **Build audited:** `.next/standalone` (BUILD_ID
`rUyFhu32wcaHk1Ej4pLVm`, 123 JS chunks + 1 CSS = 124 files) · **DB:** local PG :5434 (seed
`al-waha-cafe-demo`, 77 OrderItems / 77 Orders).
**Method:** every number below is MY OWN measurement (curl `-w` one-session standalone server
per M-6 pattern; Playwright chromium-1243 real browser at 375×667 RTL; python/gzip chunk
analysis; live psql queries via node `pg`). The round's numbers were NOT trusted — where my
measurement matches a round claim I say VERIFIED; where it doesn't, I say so with the raw data.
**Zero product code written.** Throwaway probes: `test-screenshots/r121/adv4/*.cjs` (gitignored).
**Server discipline note:** the standalone server renames itself to `next-server (v16.3.4)` at
runtime — `pkill -f standalone/server.js` does NOT match it (M-6's lesson is incomplete; one
leftover process caused an EADDRINUSE mid-review; every session below ended with a
verified port-free check).

---

## 1. Chunk audit (G-1) — the orphan polyfill chunk is DEAD; the guard against its return is NOT installed

**Build totals (measured):** 123 JS chunks, 3,318,035 B raw, 1,069,661 B gz
(`node scripts/bundle-report.mjs` agrees: 123 chunks / 3.16 MB / 1.02 MB).
Pre-round baseline (G audit, BUILD `DkVVmorxzwxdxYxX9-NWi` @ `74ef578f`): 118 chunks / 3.12 MB /
1.01 MB. **The "116 chunks" figure handed to this review is NOT confirmed — I count 123**
(+5 vs pre-round: r121's SSR islands, landing QR mount, and splits added more chunks than the
dead orphan removed, and the total grew +200 KB raw / +60 KB gz despite −429 KB raw of polyfill
leaving — first-load JS per route is what improved, see §2).

**Crypto-polyfill signatures: ZERO (grep over all 123 chunks).**
`createCipheriv` / `createDecipheriv` / `createECDH` / `keyFromPrivate` / `getPublic` / `miller`
(ripemd) / `secp256k1` / `browserify` / `HmacDRBG` / `pseudoRandomBytes` → all NONE.
bn.js telltales (`redN`, `Montgomery`, `prime256v1`) → only false positives (`sharedNodes`,
`referredName`). The only `sha512`/`sha384` hits are Zod **format-validator regex strings**
(`"sha512_base64url"` etc. in `452lx1m2e4tg9.js`, the zod chunk) — not crypto code.
Also verified gone: `red works only` / `fromByteArray` / `writableHighWaterMark` /
`public-encrypt` → NONE. **G-1 core claim VERIFIED.**

**qrcode async chunk: VERIFIED.** `2ploxkbz2-0sw.js` = 23,826 B raw / 8,783 B gz, loaded only
via dynamic `Promise.all(["static/chunks/2ploxkbz2-0sw.js"].map(...))` inlined in 3 loader
chunks. `SelfHostedQR.tsx:41,92` uses `import('qrcode')` (r121 comment present); the print page
keeps its server-side static import (`print/page.tsx:3`) — browser-condition scope respected.

**Top 10 chunks by gzip (raw / gz, attribution fingerprinted):**

| # | chunk | raw | gz | attribution |
|---|---|---|---|---|
| 1 | `1fbke9t5e9uwf.js` | 234,295 | 73,306 | react-dom («Minified React error») — framework floor |
| 2 | `452lx1m2e4tg9.js` | 287,550 | 67,644 | **zod** (ZodAny/ZodArray/… export table) |
| 3 | `2hr9xj1mg4sxo.js` | 142,326 | 46,390 | motion engine (bundle-report `motion` flag; LEDGER floor 45.3 KB — holds) |
| 4 | `2gseq33hftjc1.js` | 155,742 | 42,800 | next/RSC client runtime (`callServer`) |
| 5 | `0cz1d0mv5g_q7.js` | 112,594 | 39,496 | shared lib (same hash as pre-round build — unchanged) |
| 6 | `2pa61otouswgb.js` | 78,313 | 26,718 | shared component chunk |
| 7 | `2tztpr0azm05e.js` | 65,457 | 19,891 | @base-ui/react (`createChangeEventDetails`) + subscribe page |
| 8 | `18gp_2c4mtlqe.js` | 68,050 | 18,743 | shared app chunk (OrbField + StickyMenuHeader + csrfFetch factory) |
| 9 | `2r77ekknvho1c.js` | 48,635 | 16,508 | app chunk |
| 10 | `2ul6kv48bxqz_.js` | 49,409 | 16,002 | app chunk |

No chunk exceeds 74 KB gz (pre-round the polyfill chunk was 128 KB gz).

**Orphan check: no new orphans.** File-level liveness scan over all 123 chunks (referenced by
prerendered HTML / server JS / peer chunk loaders): **0 unreferenced chunk files** (the 10
dynamic-only suspects each resolve to ≥1 runtime loader reference). r121 module spot-checks all
resolve: OrbField → `18gp_2c4mtlqe`, StickyMenuHeader strings across menu chunks, subscribe H1 →
`2tztpr0azm05e`, HeroQR → `384svfgsiawwq`; `plans-server` correctly absent from client chunks.

**Gaps found (see Findings):** `bundle-report.mjs` was NOT given the polyfill fingerprints
promised by G-1's fix («add 'red works only'/'fromByteArray' to its signature list so this can
never silently regress») — the script flags only `motion`. And the csrfFetch module factory
(module 349241) is duplicated into 6 route chunks rather than one shared chunk (Turbopack
duplication; ~2 KB raw each — the constants-only `csrf-shared` split worked, the helper module
itself is copied).

## 2. First-load JS per route — G-1's headline promise delivers −120 KB gz on the 3 worst routes

Sum of `<script src>` chunk files in served HTML (one-session standalone, warm):

| route | scripts | FL raw | FL gz | pre-round FL gz¹ | Δ gz |
|---|---|---|---|---|---|
| `/` | 19 | 969,054 | 308,806 | 305 KB | +3.8 KB (landing QR + honest cards; polyfill was never on `/`) |
| `/menu/al-waha-cafe-demo` | 25 | 1,120,421 | **360,008** | 480 KB | **−120 KB (−25%)** |
| `/subscribe` | 19 | 977,497 | **311,341** | 433 KB | **−121.7 KB (−28%)** |
| `/pricing` | 18 | 945,061 | 302,227 | 295 KB | +7.2 KB (impl-5 pricing refactor; polyfill was never on `/pricing`) |
| `/login` | 20 | 1,010,669 | **323,663** | 446 KB | **−122.3 KB (−27%)** |
| `/cart` | 20 | 1,025,182 | 326,797 | — | — |

¹ G audit live measurement @ `74ef578f`. G-1 predicted «drops ~100–127 KB gz (−21–26%)» on
menu/login/subscribe → **VERIFIED at −25…−28%** (upper end).

## 3. Document weight (one-session curl, pass-2 warm; local build vs pre-round live)

| route | doc raw | doc gz | TTFB | pre-round (G audit live) | verdict |
|---|---|---|---|---|---|
| `/` | 103,353 | 19,439 | 6.3 ms | 113,882 / 19,795 | smaller (landing trims) |
| `/menu/al-waha-cafe-demo` | **318,395** | **31,388** | 8.0 ms | 292,010 / 27,338 | **+26.4 KB raw (+9%) / +4.0 KB gz (+15%) — see ADV4-3** |
| `/subscribe` | 62,709 | 12,008 | 43.3 ms | 34,235 / 6,840 | +30.5 KB raw — the SSR trade, visible (below) |
| `/pricing` | 86,399 | 15,167 | 5.3 ms | 93,043 / 15,235 | smaller |
| `/login` | 45,574 | 10,518 | 47.1 ms | 47,638 / 10,067 | ≈same |
| `/cart` | 35,540 | 8,242 | 10.4 ms | (9,174 gz) | ≈same |

**/subscribe trade (G-5): visible and favorable.** Doc nearly doubles raw (32.5→62.7 KB) but the
spinner-only shell is gone: H1 «انضم إلى الربط الذكي» + 5 plan h3 cards + د.ل/شهر prices are in
the first paint. Measured LCP (Playwright, 375×667, real chromium): **316–836 ms unthrottled /
1,136–2,676 ms @6× CPU throttle, LCP element = the SSR H1** — vs the r120 ledger 4.47 s →
**−1.8 to −3.3 s** (round claimed ≈−2.1 s: within my measured range). VERIFIED.
(Residue, informational: one inert full-screen spinner fallback div still ships in the raw HTML
between closed suspense markers — `offsetParent` false at DOMContentLoaded, never visible.)

**/menu doc (B-5): the "still ~292 KB, no regression" framing does NOT hold.** Decomposition of
my 318,395-B doc vs G's 292,010-B baseline: SSR DOM 235,720 B (74%) vs 205,899 (70.5%) →
**+29.8 KB**, of which the G-7 SSR'd `<header>` element = **10,080 B** (measured in the raw
HTML) and class-attr weight 90,371 B across 1,013 attrs vs 74,523/925 → **+15.8 KB**; RSC flight
74,613 B (slightly DOWN from 75.9 KB); JSON-LD 4,451 B vs 4,486 — **unchanged: B-5's "small
wins" (hasMenu JSON-LD trim) did NOT land**. Net: the growth is the G-7 first-paint header trade
plus attr growth; wire cost is only +4.0 KB gz, parse cost +26 KB. Defensible trade, but the
ledger's B-5 baseline must be re-based to ~318 KB (see ADV4-3).

## 4. Live behavior (Playwright, production build, 375×667, RTL)

| claim | probe | result |
|---|---|---|
| **G-7** StickyMenuHeader first paint | `[aria-label="القائمة"]` at DOMContentLoaded | **VERIFIED** — BUTTON present at top=6, h=44 before hydration (also ×1 in raw curl HTML) |
| **G-6** orbs pause offscreen | computed `animation-play-state` | **VERIFIED** — in view: `running`; hero scrolled out (scrollY=1400, orb-container rect −1400…−718): hero orbs `paused`; a lower-page OrbField still in view correctly stays `running`; scroll back → `running`. Per-instance gating works exactly as the OrbField comment claims |
| **H-3** cart skeleton until hydration | seeded `cart-storage` (real persisted shape), poll DOM | **VERIFIED** — `[role=status]` skeleton at +245 ms → cart list at +591 ms; **«السلة فارغة» flash: NONE**; final empty-state false. Skeleton window ≈350 ms unthrottled |
| **J-1** float z-band tap-hijack | computed z-index + `elementFromPoint` | **VERIFIED FIXED** — float is now z-30 (was z-[60]); with OrderDialog open, hit-test over the float's center returns a dialog BUTTON («سفري»), not the WhatsApp link |
| **Q-3** dialog CTA above fold | CTA rect after full spring settle (2.5 s), 3 different items | **NOT VERIFIED — see ADV4-1.** CTA bottom = 711 vs viewport 667 → still **44 px below the fold** on all 3 items tested (ليموناضة بالنعناع، فطور الواحة، إسبريسو) |

LCP cross-check (same method): `/menu` 804 ms / 1,776 ms @6×CPU; `/` 660 ms / 888 ms — no
regression vs the r117 baseline ballpark (menu 644 ms, home 488 ms local-era).

## 5. Server cost

**plans caching (G-5):** `src/lib/plans-server.ts:24-28` — module-level in-memory TTL
`CACHE_TTL = 300_000` (5 min), shared by /pricing (build-time) and /subscribe (runtime);
`/api/plans/route.ts:7` carries the same in-process TTL. **Nuance the claim glosses:** this is
NOT the Next.js Data Cache — it is per-process memoization (per-lambda on Vercel). Timing
evidence (fresh process): /subscribe **cold 106.7 ms → warm 21.8–53.9 ms** TTFB (the delta is
the plans query + first-render). `/pricing` is ISR static (`x-nextjs-prerender: 1`,
`revalidate = 300`; proxy serves `max-age=60, s-maxage=60, SWR=86400`). VERIFIED with the
in-memory characterization.

**requireAuth layouts (was: client /me per page):** honest numbers, local standalone, warm,
admin session cookie:

| probe | TTFB (3–5 hits) | notes |
|---|---|---|
| `/admin` authed ×5 | 13.5 / 18.1 / 19.2 / 26.7 / 49.0 ms | doc 52,094 B |
| `/admin/users` authed ×3 | 14.2 / 14.5 / 32.5 ms | doc 53,472 B |
| `/admin` anon ×3 | 1.6–3.1 ms | 307 redirect, **no DB hit** |
| `/api/auth/me` ×3 (the OLD per-page client cost) | 5.8–10.1 ms | 200 |
| `/owner` as admin | 22.9 ms | 307 role-gate redirect |

Net reading: the DB session lookup costs ≈10–16 ms local (authed page − anon redirect). Total DB
work per authenticated pageview is **unchanged** (1 session lookup — old path paid it in /me, new
path pays it in SSR); what changed is ordering: the lookup now precedes the HTML (single
round-trip, no shell-then-gate flash, unauthorized users never receive protected HTML — ADV-2
verified the gate is genuinely DB-backed). **Verdict: roughly equivalent server cost, better
time-to-content, small TTFB add on the doc itself; on Neon the session-query RT replaces the
/me RT 1:1.**

**Image/upload cache rules (G-3):** `/demo/espresso.webp` → `Cache-Control: public,
max-age=604800, stale-while-revalidate=86400` — **week+SWR VERIFIED live**. Upload route
`cacheControlMaxAge: 31536000` — **VERIFIED in code** (`src/app/api/upload/route.ts:88`, SDK v2
spelling).

## 6. Backfill migration `zz_round121_orderitem_effective_price_backfill` — cost & lock analysis

**The UPDATE's join is indexed (verified against the live DB's `pg_indexes`):**
`OrderItem_orderId_idx` ✓ and a standalone `Order_createdAt_idx` btree ✓ (schema
`@@index([createdAt])`, prisma/schema.prisma:206 — the cutoff filter is indexable; the composite
`[status, createdAt]` is not needed). Plan shape: pre-cutoff Orders via createdAt index → items
via orderId index → per-row filters.

**Cost at prod scale (10k–100k OrderItem rows):** per scanned row the statement evaluates
`jsonb_array_elements` **twice** (once in `EXISTS`, once in the `SET` subquery) plus the
`LIKE '[%'` filter — which matches `[]` and bare-id `[1,2]` arrays too, so it prunes almost
nothing; the real filter is the EXISTS. 100k rows ≈ 200k small-array JSONB parses → a few
seconds CPU on Neon's smallest compute; the write set is only pre-cutoff snapshot-object rows.
10k rows → sub-second. **Lock profile: LOW risk** — single-statement UPDATE takes ROW locks only
(no DDL, no ACCESS EXCLUSIVE); concurrent order creation inserts NEW rows (no conflict with
locked historical rows); nothing else writes historical OrderItems. Honest flags: (a) **no
batching** — one transaction; if the Neon pre-flight COUNT shows tens of thousands of matching
rows, expect one multi-second transaction, a WAL burst, and equal dead tuples (consider a
LIMIT-loop DO block above ~10–20k matches); (b) the 2× JSONB evaluation doubles CPU (a single
lateral/CTE would halve it). **Local DB: verified no-op** (77 OrderItems, 0 pre-cutoff rows —
matches the migration's own pre-flight claim). **Idempotency:** the relative `SET price = price +
Σdeltas` double-adds on manual re-run — **already flagged by ADV-2 (ADV2-2, P3, empirically
proven)**; I confirm the SQL semantics; not re-reported as new.

---

## Findings (only what I verified myself)

### ADV4-1 [P2] Q-3 fix is insufficient — the OrderDialog money CTA is STILL below the fold at initial open; the round's "dialog CTA above fold" claim fails measurement
- Type: FACT (browser-measured, production build)
- Evidence: 375×667, RTL, 3 different options-items (ليموناضة بالنعناع / فطور الواحة / إسبريسو),
  CTA rect after the sheet spring fully settles: `ctaTop=663, ctaBottom=711` vs `vh=667` →
  **44 px under the fold, 3/3 items** (only a 4-px sliver of the button visible). The 94dvh sheet
  cap IS in effect (measured `max-height: 626.98px`, sheet client 625 px) and the h-28 mobile
  image header landed (`OrderDialog.tsx:225-232, 619-623`), but the content stack (name card +
  name/phone inputs + option groups + notes + qty row) scrolls to 716 px — taller than the
  visible sheet. Conservative measurement: the lazy image header measured h=0 in headless; with
  the image loaded the content is ~112 px taller, i.e. worse. MASTER-BACKLOG #13's goal («bring
  CTA above initial fold») is NOT achieved.
- Impact: user-facing — the add-to-cart button is effectively invisible at first open on the
  most common mobile viewport; users must know to scroll inside the sheet.
- Fix (minimal): pin the qty+CTA row as a non-scrolling footer inside the sheet
  (`pb-safe` footer + scrollable content region), or shrink the in-sheet name/phone block
  (it duplicates cart-page fields).
- Risk: low — footer-pinning is a standard bottom-sheet pattern; e2e specs interact by role/name.
- Tests required: extend the Q-visual-style DOM probe (CTA bottom ≤ viewport height at open)
  into a pinned e2e assertion at 375×667.

### ADV4-2 [P3] G-1's promised regression guard was never installed — `bundle-report.mjs` has no polyfill fingerprints
- Type: FACT
- Evidence: `scripts/bundle-report.mjs` signature list flags only `motion`; G-1's fix
  (G-performance.md:87) explicitly said to add `'red works only'`/`'fromByteArray'` so the
  crypto chunk «can never silently regress». A static qrcode import reintroduced today would
  ship 127 KB-gz dead code again with zero CI signal.
- Impact: technical — silent-regression risk on the round's biggest perf win.
- Fix (minimal): add the fingerprint strings to the script's signature list + one unit test
  running it against `.next/static/chunks` (stdout parse) in CI.
- Risk: none.

### ADV4-3 [P3] Menu doc grew to 318.4 KB raw / 31.4 KB gz (+9% / +15%) — the "still ~292 KB, no regression" framing is false; re-base the B-5 ledger entry
- Type: FACT
- Evidence: §3 decomposition — SSR DOM +29.8 KB (G-7 header 10,080 B measured + class-attr
  growth +15.8 KB); JSON-LD unchanged at 4,451 B (B-5 "small wins" NOT landed); flight slightly
  down. Wire cost +4.0 KB gz; parse/CPU cost +26 KB.
- Impact: technical — B-5's diet target is stale; honest reporting requires the new baseline.
- Fix (minimal): re-base B-5 to 318 KB in the ledger; the JSON-LD hasMenu trim remains the
  cheapest next win if B-5 is ever picked up.
- Risk: none (documentation).

### ADV4-4 [P3 — informational] Chunk-count arithmetic in the round's handoff (116) is wrong; csrfFetch factory duplicated ×6
- Type: FACT
- Evidence: 123 JS chunks measured (bundle-report.mjs concurs), +5 vs the pre-round 118, total
  3.32 MB raw / 1.07 MB gz — the orphan's −429 KB raw was offset by +580 KB of r121 additions
  (SSR subscribe islands, landing QR, splits). First-load JS per route still improved everywhere
  it mattered (§2). Separately, the csrfFetch module factory (module 349241) is duplicated into
  6 route chunks (~24–33 KB raw each contain the ~2 KB factory) — the constants-only
  `csrf-shared` split worked; the helper module itself was not deduped by Turbopack.
- Impact: technical, minor (~4 KB gz total duplication; count drift misleads future audits).
- Fix (minimal): none required for ship; note in the ledger that chunk-count claims must come
  from `bundle-report.mjs`, not hand tallying.

### Clean — verified with my own measurements (no defects found)
- **G-1** orphan polyfill chunk DEAD: zero crypto signatures across all 123 chunks; qrcode is a
  23.8 KB-raw / 8.8 KB-gz async chunk; −120…−122 KB-gz first-load JS on /menu, /subscribe,
  /login (−25…−28%); print-page server QR preserved; no new orphan chunk files.
- **G-5** /subscribe SSR shell: H1 + 5 plan cards at DOMContentLoaded, no visible spinner; LCP
  1.1–2.7 s @6×CPU vs 4.47 s ledger; plans-server 5-min TTL verified in code + cold/warm timing
  (106.7 → 21.8–53.9 ms), with the honest nuance that it is in-process memoization, not Data
  Cache; /pricing ISR 300 s + proxy 60 s/SWR.
- **G-6** orbs: pause offscreen / resume on re-entry, per-instance, SSR byte-identical.
- **G-7** StickyMenuHeader: in first paint (raw HTML + DOMContentLoaded probe).
- **H-3** cart: skeleton 245→591 ms, zero false-empty flash.
- **J-1** float z-30: dialog hit-test no longer hijacked.
- **G-3** cache rules: /demo/* `max-age=604800, SWR=86400` live-verified; upload
  `cacheControlMaxAge=31536000` code-verified.
- **Backfill**: join fully indexed (OrderItem.orderId + Order.createdAt btree), row-locks only,
  low Neon lock risk at 10k–100k rows; local no-op verified; non-idempotency already ADV2-2.

---

## Recommended next actions (ordered)

1. **ADV4-1**: pin the OrderDialog qty+CTA row as a sheet footer (P2, money path) — or explicitly
   re-scope backlog #13 as "partial" with the 44-px-under measurement on record.
2. **ADV4-2**: add polyfill fingerprints to `bundle-report.mjs` + CI guard (one hour of work,
   protects the round's flagship win).
3. **ADV4-3**: re-base B-5's menu-doc baseline to 318 KB in the ledger (and correct any round
   summary still saying 116 chunks / "~292 KB menu doc").
4. Before the Neon deploy: run the migration's own pre-flight COUNT; if matches > ~10–20k,
   batch the backfill (LIMIT-loop) and expect a WAL burst either way.
