# r121 — Auditor G: Performance (READ-ONLY, measured-first audit)

**Scope:** client bundle (`.next/static/chunks` + live production chunk lists), document weight
(5 key routes live), rendering path of the r120 deferred perf items, image pipeline, font loading,
Prisma/query discipline on hot paths, client-JS discipline (polling, zustand, 'use client').
**HEAD audited:** `74ef578f` (= live production, script/chunk composition live-verified).
**Local build:** `.next/` from this session's round build (BUILD_ID `DkVVmorxzwxdxYxX9-NWi`, 118
chunks — same composition as live; every local claim cross-checked against live HTML script tags).
**Method:** live `curl` timing/size (`-w`, identity + gzip), live chunk downloads summed per route,
`.next` client-reference-manifest parsing (module→chunk mapping), module-graph liveness scan
(regex over all 118 chunks), `node scripts/bundle-report.mjs` (read + run, stdout-only), file reads.
**Out of scope / not re-measurable here:** browser paint metrics (LCP/TBT/CLS) — no browser in
this sandbox; the r117 benchmark baseline numbers are treated as the standing UX baseline.

---

## Measurements (everything below measured this session, live on `74ef578f` unless noted)

### Document weight + first-load JS per route (live)

| Route | Doc raw | Doc gzip¹ | TTFB (sample²) | Scripts | First-load JS raw | First-load JS gz |
|---|---|---|---|---|---|---|
| `/` (ISR 1m) | 113,882 B | 19,795 B | 256 ms | 19 | 959 KB | **305 KB** |
| `/menu/al-waha-cafe-demo` (ISR 60s) | 292,010 B | 27,338 B | 91 ms | 26 | 1,527 KB | **480 KB** |
| `/pricing` (ISR 5m) | 93,043 B | 15,235 B | 261 ms | 18 | 925 KB | **295 KB** |
| `/subscribe` (ƒ Dynamic) | 34,235 B | 6,840 B | 484 ms | 21 | 1,388 KB | **433 KB** |
| `/login` (ƒ Dynamic) | 47,638 B | 10,067 B | 327 ms | 22 | 1,422 KB | **446 KB** |
| `/cart` (ƒ Dynamic) | — | 9,174 B | — | — | — | — |
| `/terms` (ISR 1h) | 56,334 B | 11,247 B | 279 ms | — | — | — |
| `/menu/[slug]/print` (ƒ Dynamic) | 87,459 B | — | — | — | — | — |

¹ `curl --compressed` transfer size. ² single sample from this sandbox (Vercel edge RTT included;
ISR-HIT pages vary 89–386 ms run-to-run). The r117 in-browser baseline (TTFB 16 ms local,
home LCP 488 ms, menu 644 ms, pricing 268 ms, login 796 ms) remains the UX reference.

### Menu doc (292,010 B) decomposition — B-5 quantified (live HTML parsed)

| Component | Size | Notes |
|---|---|---|
| SSR DOM (all `<script>` stripped) | 205,899 B (70.5%) | 25 item cards; **74,523 B of `class="…"` attrs** across 925 attrs; item name appears up to 8× per card (h2 + img alt + 3 aria-labels «تقييم/خيارات/إضافة» + description substrings) |
| Inline scripts total | 83,733 B | RSC flight (`self.__next_f`) **75.9 KB** + JSON-LD 4,486 B + boot scripts |
| RSC flight contents | 75.9 KB | `serializedItems` JSON 15,961 B (25 items; `name===nameAr` **25/25**, `description` empty **25/25**) + `serializedCategories` + restaurant + **the JSON-LD `__html` string embedded a 2nd time** (escaped, verified at flight offset 16,712) |
| JSON-LD `<script type="application/ld+json">` | 4,486 B | Restaurant + `hasMenu` 5 sections × 25 items (`hasMenuItem` ×25, incl. name+description+offers) |
| Repetition factor | — | item name «إسبريسو» appears **14×** in one doc: 8 DOM + 5 flight (name+nameAr+descriptions) + 1 JSON-LD (×2 copies of the block) |
| Wire cost | 27,338 B gz | gzip absorbs the duplication (9.4% ratio) — the 292 KB is a parse/CPU cost, not a transfer cost |

### Top client chunks (local build, `node scripts/bundle-report.mjs`; total **118 chunks / 3.12 MB raw / 1.01 MB gz**)

| Chunk | raw | gzip | Attribution (evidence) | Loads on (live HTML / manifests) |
|---|---|---|---|---|
| `45b08jpy-zb6l.js` (live `22h-0s9vlekd5.js`) | 429.0 KB | **128.0 KB** (127.4 KB live) | **~80% orphaned Node-polyfill code** (bn.js «red works only», crypto-browserify asn1/aes/public-encrypt, Buffer `fromByteArray`, stream `writableHighWaterMark` — all fingerprinted) + shared app modules (chunk tail exports `csrfFetch`/`csrfJson` = `src/lib/csrf-client.ts`; manifest maps `MenuClientSection`, `MenuIslands`, `OptimizedImage`, lucide `Icon.mjs`, `LoginForm`, `subscribe/page`, owner+admin layouts into it) | **28 routes**: `/menu/[slug]`, `/login`, `/subscribe`, `/cart`, `/order-confirmed`, owner ×10, admin ×13 — **NOT** `/`, `/pricing`, `/terms`, `/privacy` (live-verified all) |
| `0k05i9a-1gudz.js` | 228.7 KB | 71.4 KB | react-dom client runtime («Minified React error» + react-dom signatures) | all pages (framework floor) |
| `0wwudhkzjqvi0.js` | 138.5 KB | 45.0 KB | **motion engine** (bundle-report motion-flag; LEDGER floor re-verified at HEAD) | all pages |
| `12teadxwgu6-i.js` | 151.8 KB | 41.6 KB | RSC/next client runtime (`callServer`, dispatch) | all pages (framework floor) |
| `0cz1d0mv5g_q7.js` | 110.0 KB | 38.6 KB | shared lib chunk, UMD-style prelude — attribution UNVERIFIED (no surviving lib strings) | home+pricing+menu+… |
| `268kqgz2df4pu.js` | 76.4 KB | 26.1 KB | shared component chunk (16 `getComputedStyle`; base-ui-ish) — UNVERIFIED | most pages |
| `0am28hukexmlk.js` | 65.2 KB | 17.9 KB | shared (Icon signatures) — UNVERIFIED | — |
| `03gwfk6vn1mgg.js` | 48.1 KB | 15.6 KB | shared — UNVERIFIED | — |
| `2g_46auagttlh.js` | 46.1 KB | 14.6 KB | pricing-page group (present in pricing.html, absent home) | /pricing |
| `4443zbop_3s7d.js` | 46.6 KB | 13.8 KB | home-page group (present in index.html, absent pricing) | / |
| (next 5: 43–46 KB raw, 12.4–13.3 KB gz each) | | | per-route/page groups | — |

Fixed framework floor (react-dom 71.4 + RSC 41.6 + motion 45.0 + shared 38.6 ≈ **197 KB gz**)
before any app code — the only chunk above 100 KB gzip is the polyfill chunk (G-1).

### Misc measured

- AVIF optimizer live: `/demo/espresso.webp` source 31,552 B → `/_next/image …w=256` **3,050 B AVIF**, w=384 **5,634 B** (negotiation + `content-type: image/avif` verified).
- **`cache-control: public, max-age=0, must-revalidate`** (live, `age: 0`, `x-vercel-cache: MISS`) on BOTH `/demo/espresso.webp` AND its `/_next/image` derivative.
- Menu page: 27 `<img>`, 23 lazy, 2 `fetchPriority="high"` (hero logo + one), 4 image preloads (eager first rows), 2 font preloads (cairo-arabic 30.7 KB + readex-pro 22.9 KB), `fonts.css` preloaded as style, zero preconnects needed.
- `public/demo/*`: 23 webp files, 1.4 MB total (avg ~50 KB). `public/fonts/*`: 402 KB woff2 across 4 variable families.
- Polling cadences (code-read): owner orders 15 s probe-then-refetch (`use-orders-polling.ts:8`), admin orders 5 s probe (`admin/orders/page.tsx:167`), subscribe events 15 s post-submit only (`subscribe/page.tsx:174-176`) — all via visibility-gated `usePollWhenVisible`.

---

## Findings

### G-1 [P1] A 429 KB raw / ~127 KB gzip chunk that is ~80% ORPHANED Node-polyfill code (crypto-browserify + bn.js + Buffer + stream) ships on 28 routes — including the flagship customer menu, /login and /subscribe — because Turbopack coalesced it with shared app modules
- Type: FACT (measured live + local manifests + module-graph liveness scan); root-cause mechanism partially UNVERIFIED
- Evidence:
  - Live: `GET /menu/al-waha-cafe-demo` HTML loads `/_next/static/immutable/chunks/22h-0s9vlekd5.js` = **438,335 B raw / 127.4 KB gz** (downloaded + fingerprinted this session: contains bn.js «red works only with positives», base64-js «fromByteArray», Buffer «utf16le», asn1 «utctime/gentime», browserify-aes «invalid suite type» — i.e. next/dist/compiled crypto-browserify+buffer+stream shims, NOT any app library). Also loaded by `/login`, `/subscribe`, `/cart`, `/order-confirmed` (live-verified); **not** by `/`, `/pricing`, `/terms`, `/privacy` (live-verified).
  - Local manifests agree: `.next/server/app/**/page_client-reference-manifest.js` maps the polyfill chunk `45b08jpy-zb6l.js` (429,315 B raw / 128.0 KB gz per `scripts/bundle-report.mjs`) into the client module groups of `(public)/menu/[slug]` (MenuClientSection, MenuIslands, OptimizedImage, lucide Icon.mjs), `(protected)/login` (LoginForm), `(protected)/subscribe`, `cart`, `order-confirmed`, and all 10 owner + 13 admin routes. The chunk tail contains `src/lib/csrf-client.ts` (`csrfFetch`/`csrfJson`, Arabic «فشل الطلب» string) — the app-level reason those pages load the chunk; the polyfill cluster rides along.
  - **The polyfill cluster is dead code**: chunk-internal module graph analysis (235 modules) shows the cluster roots (Buffer=230, base64=872, stream=686/854, bn.js=5944) are referenced by **zero** modules in any of the 118 chunks (regex scan for every call-arg reference `[.(](id)` across all chunks). It is registered but can never execute — pure transfer + parse cost.
  - Why it exists (mechanism, UNVERIFIED): the only client-graph package with Node-builtin `require`s is `qrcode` (statically imported at `src/components/shared/SelfHostedQR.tsx:4`, consumed by `owner/qr/page.tsx:19` + `admin/qr/page.tsx:20`). Its `package.json` browser field (`{'./lib/index.js':'./lib/browser.js','fs':false}`) IS honored for the executed path — the actual qrcode core is a self-contained 23.7 KB/8.7 KB-gz chunk (`35s8_gp--zjmt.js`, owner/qr-only, zero cross-chunk imports) with no polyfill deps. The most plausible mechanism: Turbopack resolves the CJS main (`lib/index.js` → `lib/server.js:3-5` → `renderer/png.js:1-2` → `fs`+`pngjs` → `pngjs/lib/png.js:3-4` → `util`+`stream`) during chunk-group assignment and includes the polyfill bundle in the shared chunk even though the browser-field substitution means nothing executes it.
  - **Supersedes F-1's chunk math**: F-1 (correctly) flagged the static import but priced it at «~45 KB gz on /owner/qr + /admin/qr» (round86's number). The measured 2026 build: the polyfill payload is ~127 KB gz and its blast radius is 28 routes including every customer-facing menu page and the login form. `/login` — a form — transfers **446 KB gz** of JS, of which 127 KB is this chunk.
- Impact: user-facing — every fresh QR scan of every restaurant menu (and /login, /subscribe, /cart, order-confirmed, all dashboards) downloads ~127 KB gz (~429 KB raw parse) of code that never runs. On the flagship menu that is **26% of first-load JS (480 KB gz)**. Repeat visits are cached (immutable chunks) but every new visitor and every deployed-chunk rotation pays it.
- Fix (minimal, root-cause): apply the repo's own `ReferralQR.tsx:4-17` precedent inside `SelfHostedQR` — `import('qrcode')` inside its render effect and make `qrPngDataUrl` (:82-88) dynamic too (it is only called from download handlers). Expected: the polyfill modules leave the sync chunk group → the shared chunk keeps only the ~80 KB raw app/library part; **menu/login/subscribe first-load JS drops ~100–127 KB gz (−21–26%)**. If a rebuild shows the polyfills still assigned to the shared chunk, fall back to `turbopack.resolveAlias` mapping `qrcode` → `qrcode/lib/browser.js` (bypasses the server entry entirely). VERIFY with `node scripts/bundle-report.mjs --compare` (the script currently only flags motion — add the polyfill fingerprints `'red works only'`/`'fromByteArray'` to its signature list so this can never silently regress).
- Risk: of fixing — low (rendering already post-mount async; `data-testid="qr-code"` and e2e hooks unchanged — same surface as the r106-N2 and round86-B8 precedents). Of not fixing — the single largest byte regression on the money path stays.
- Tests required: existing QR e2e (r93+round79 specs) + a bundle-report snapshot assertion for max-chunk-size / polyfill-signature absence.

### G-2 [P3] No first-load-JS budget exists anywhere in the repo — menu is 480 KB gz / 26 scripts and /login 446 KB gz (a form page); only ~197 KB gz of that is the fixed framework floor
- Type: FACT (measurement) + SUGGESTION (budget)
- Evidence: measurements table above. The repo tracks LCP/TTFB (r117 benchmark) and total bundle size (`scripts/bundle-report.mjs`, 1.01 MB gz / 118 chunks at HEAD) but has no per-route first-load-JS number; nothing caught the G-1 regression (the polyfill chunk has no motion signature, so `bundle-report.mjs` prints it unflagged). `/login` additionally loads the full motion engine (45 KB gz) for one `MotionArrowRight` button icon (`LoginForm.tsx:38-41`) — inside the accepted site-wide motion floor, but the heaviest possible price for that icon.
- Impact: technical — perf regressions of the G-1 class are invisible until a browser metric moves; the r117 ledger items (menu TBT 621–688 ms) correlate with 1.5 MB raw JS parse on the menu page.
- Fix (minimal): record a per-route first-load-JS baseline next to the r117 benchmark entry in `docs/ENGINEERING_STATE.md` (the 5-row table above can be pasted) + one line in `scripts/bundle-report.mjs` warning on any single chunk >100 KB gz (currently only G-1's chunk qualifies; motion at 45 KB stays under).
- Risk: none (documentation + a console warning).
- Tests required: none (optional: a unit test over the bundle-report snapshot JSON pinning the top chunk).

### G-3 [P3] Menu images revalidate on every visit: `/demo/*` statics have no cache rule and uploaded Vercel-Blob images are stored without `cacheControl` — live header is `max-age=0, must-revalidate` on both the source and the `/_next/image` derivative
- Type: FACT
- Evidence:
  - Live: `curl -I https://menu.smart-link.ly/demo/espresso.webp` → `cache-control: public, max-age=0, must-revalidate`, `age: 0`, `x-vercel-cache: MISS`; identical policy on `/_next/image?url=%2Fdemo%2Fespresso.webp&w=384&q=75` (the derivative inherits the upstream TTL).
  - `next.config.ts:103-114,162-171` — the round85-B7 immutable rules cover `/fonts/*`, `/video/*`, `main21.webp`, `hero-phone.webp`, `brand-icon.png` but **not `/demo/:path*`** (23 files, 1.4 MB — the flagship demo menu's every item image; these files change only via repo commits).
  - `src/app/api/upload/route.ts:77-81` — `put(filename, buffer, { access: 'public', contentType })` with **no `cacheControl`**; Vercel Blob's default is no browser caching. Filenames are already unique per upload (`${Date.now()}-${random8}`), so a replacement image is always a NEW URL — immutable caching is safe by construction.
  - Mitigation already present: `public/sw.js:5-10,52-60` serves `/_next/image` cache-first from a bounded LRU (60) — SW-active repeat visitors skip the revalidations; first visits, LRU evictions (>60 images) and pre-SW navigations pay 16–23 conditional round-trips per menu view (r117 counted menu at 67 requests vs budget 50 — this is the repeat-visit half of that P4).
- Impact: user-facing on repeat QR scans (Libya mobile networks): every item image costs a 304 RTT before the SW cache or `max-age` would have served it from disk; also keeps Vercel image-optimizer/CDN MISS pressure higher than necessary.
- Fix (minimal): (a) add a `next.config.ts` headers rule `source: '/demo/:path*'` → `public, max-age=86400, stale-while-revalidate=604800` (og-default-style policy — demo images are replaced in place on repo updates); (b) add `cacheControl: 'public, max-age=31536000, immutable'` to the `put()` options in `upload/route.ts:78-81`.
- Risk: low — worst case a visitor sees a ≤1-day-old demo image after an in-place swap; uploaded images are never swapped in place (unique URLs).
- Tests required: extend the existing headers e2e/unit sweep with the `/demo/*` assertion; a note that already-uploaded blobs keep the old policy (new uploads only).

### G-4 [P3] B-5's «292 KB menu doc, items ship 3×» confirmed but re-quantified: the JSON-LD `hasMenu` copy is the SMALLEST piece (4.4 KB) and itself ships twice (script tag + embedded in the RSC flight); the bulk is SSR DOM (201 KB, 74.5 KB of it Tailwind class strings)
- Type: FACT (decomposition) + SUGGESTION (verdict on B-5's trim)
- Evidence: decomposition table above; `src/app/(public)/menu/[slug]/page.tsx:220-263` (serializer ships `name`+`nameAr` — identical for 25/25 items — and empty `description` alongside `descriptionAr`), `:288-319` (jsonLd builder), `:337-340` (script tag; its `__html` string is ALSO serialized into the flight payload because the `<script>` element is part of the RSC tree — measured: full escaped JSON-LD inside `self.__next_f`, offset 16,712).
- Impact: technical/user-facing-minor — 292 KB raw is a parse cost (27.3 KB gz on the wire); the biggest honest trims are small: dropping `hasMenu` from JSON-LD saves 2×4.1 KB raw (~1 KB gz), dropping `name`/`description` when identical/empty saves 1.3 KB of the 16 KB `serializedItems`. Google has never served a Menu rich result on this domain (B-5's UNVERIFIED note) so `hasMenu` is speculative weight, but it is also the cheapest SEO hedge on the page.
- Fix (judgment, aligned with B-5): if trimming, prefer keeping `hasMenu` but only `name`+`offers` per item (drop `description` — the heaviest per-item field after names); the serializer's redundant bilingual fields are only worth touching if a round already opens `page.tsx` (−8% of `serializedItems`). The 201 KB SSR DOM should NOT be fought (class-string verbosity is inherent to Tailwind SSR and gzip-crushed).
- Risk: rich-result eligibility if `hasMenu` dropped entirely (reversible).
- Tests required: JSON-LD unit test if one pins `hasMenu` (update it); r117 benchmark before/after per B-5's own suggestion.

### G-5 [P2] /subscribe is the smallest doc on the site (34.2 KB raw / 6.8 KB gz — less than a third of home) yet the worst LCP (4.47 s): 100% of content is gated on client fetch chains + a 433 KB gz JS parse that includes G-1's 127 KB dead chunk
- Type: FACT (LEDGER-VERIFIED with new measurements) + fix assessment
- Evidence: `src/app/(protected)/subscribe/page.tsx:344-351` — `if (loading) return <spinner>` is the entire SSR HTML; H1 at `:363` renders only after the `/api/plans` client fetch (`:73-100`, with a 1 s auto-retry) resolves; a parallel `/api/auth/me` probe (`:120-139`) gates upgrade-mode. Contrast: `/pricing` server-bakes the same plans data (ISR 5 m) and r117 measured its LCP at **268 ms** — the same content served server-first is ~16× faster to largest contentful paint. Doc/JS numbers in the measurements table.
- Impact: user-facing on the conversion funnel (subscribe = revenue entry) — the worst-performing page on the site is the one that sells the product; on 3G the H1 waits for 433 KB gz JS + 2 API round-trips.
- Fix (minimal, ledger's own plan, pricing precedent): split the page into a server component that fetches plans server-side (direct DB or the same `/api/plans` data with `revalidate`) and passes `initialPlans` into a `SubscribeClient` (mirror of `PricingClient initialPlans`); render H1 + step chrome + plan cards in the SSR shell, keep only the wizard state client-side. Expected gain ≈ the ledger's −2.1 s estimate (LCP becomes doc+CSS+font bound); compounding with G-1 removes ~127 KB gz from the same page's hydration path.
- Risk: low-moderate — the page's auth-dependent upgrade mode must keep its client probe; SSR shell must not leak plan internals that the API masks (plans are public — `/api/plans` is anonymous-whitelisted per r113 matrix).
- Tests required: existing subscribe e2e (plan selection, ?plan= dead-end escape from r120) + one assertion that the H1 appears in the SSR HTML.

### G-6 [P3] r120-deferred orb-float viewport-gating + offscreen shimmer — still fully unaddressed (zero `IntersectionObserver`/`content-visibility` in any menu component), now quantified: 2 infinite blur-orbs (120/140 px gaussian on 288/384 px elements), 2 more infinite SVG orbs, and up to 23 infinite background-position shimmer overlays
- Type: LEDGER-VERIFIED + SUGGESTION (fix assessment)
- Evidence: `src/components/menu/MenuHero.tsx:48-49` (orbs: `blur-[120px]`/`blur-[140px]`, `animate-orb-float` 14 s / `animate-orb-float-delayed` 16 s infinite; the code's own comment at :45-46 admits «blur layers are expensive on mobile GPUs»; `motion-reduce:hidden` correctly disables them for reduced-motion); `HeroDecor.tsx:31,57` (two more infinite orb-float SVGs); `globals.css:1035-1040,1092-1093` (keyframes/classes); `OptimizedImage.tsx:72-77` + `globals.css:1151-1157` (`.shimmer` animates `background-position` — a PAINT-driven property — 2 s infinite, one overlay per not-yet-loaded image, including below-the-fold lazy images); grep confirms no `content-visibility` and no `IntersectionObserver` anywhere in `src/components/menu/` or `OptimizedImage`. TBT attribution note: the deferred item's «TBT 621-688 ms (motion+react-dom co-drivers)» is hydration-bound — `MenuItemCard.tsx:108-115` wraps each of the 25 cards in a motion `m.div` with hover/tap springs; CSS gating cannot fix TBT, only scroll/paint jank.
- Impact: user-facing on low-end Android during menu scroll (GPU raster for the blurred orbs stays resident after the hero leaves the viewport; offscreen shimmers keep invalidating paint until their images load) — polish-tier, not a blocker (r115 already measured menu-demo TBT 380 ms / LCP 1.0 s as acceptable).
- Fix (ponytail, two independent CSS-first pieces): (a) `content-visibility: auto` + `contain-intrinsic-size: auto 480px` (match the card aspect box) on the menu grid items — skips offscreen layout+paint+animation entirely, CLS-safe because every card reserves its aspect box already; (b) orbs: gate `animation-play-state` with a ~10-line `IntersectionObserver` on the hero container (or progressive-enhancement `@supports (animation-timeline: view())` scrubbing). Expected gain: scroll-jank/GPU-memory relief on low-end devices — NOT a TBT fix; unmeasurable in this sandbox, so recommend a gstack FPS/trace A-B before spending the round.
- Risk: low — `content-visibility` is Chrome/Edge/Safari 18+ (Firefox behind flag; degrades to no-op, no layout change because aspect boxes are fixed).
- Tests required: existing 390 px no-overflow + gallery/CLS e2e; reduced-motion spot check (orbs already hidden).

### G-7 [P3] StickyMenuHeader SSR (r120-deferred, LEDGER-VERIFIED): the mount-gate is over-broad — the header's initial state is deterministic and SSR-safe; only LoyaltyWidget needs the gate
- Type: LEDGER-VERIFIED + SUGGESTION (fix assessment)
- Evidence: `src/components/menu/MenuClientSection.tsx:78-83` — `mounted` gate hides `StickyMenuHeader` from SSR HTML (ledger: 2.6 s header-less under throttle); `StickyMenuHeader.tsx:16-22` — initial state is `scrolled=false` + `mobileOpen=false`, both deterministic (no `Date`/`Math.random`/localStorage in render path; motion `useScroll` + `useMotionValueEvent` are subscription-side effects), so SSR-rendering the header reproduces the exact pre-hydration DOM. The r97-W6d gate replaced `dynamic(ssr:false)` BAILOUT templates — a plain unconditional import has neither the hidden-copy race nor the bailout template. `LoyaltyWidget` (`MenuClientSection.tsx:102-109`) reads loyalty/localStorage state and should KEEP its gate.
- Impact: user-facing on slow networks — the sticky glass header (name + logo + theme/high-contrast toggles + global links) is absent from first paint for the entire hydration window on every menu page.
- Fix (minimal): render `<StickyMenuHeader/>` unconditionally, keep `{mounted && <LoyaltyWidget/>}`; verify no hydration warning (initial `scrolled=false` on both sides).
- Risk: low — visual only; if a mismatch surfaces in CI, revert the one line.
- Tests required: existing menu e2e render checks + one SSR assertion that the header name appears in the raw HTML.

---

## r120/r117 ledger items in this domain — verification status

| Ledger item | Status at HEAD | Evidence |
|---|---|---|
| /subscribe SSR shell (LCP 4.47 s) | **LEDGER-VERIFIED, still open** — new numbers + fix assessment → **G-5** | smallest doc on site (34.2 KB raw) yet worst LCP; 100% client-gated |
| orb-float viewport-gating + offscreen shimmer (menu TBT 621-688 ms) | **LEDGER-VERIFIED, still open** — quantified + CSS-first fix → **G-6** | 0 IntersectionObserver/content-visibility in menu components; TBT is hydration-bound (25× `m.div` cards) — CSS gating ≠ TBT fix |
| StickyMenuHeader SSR mount (2.6 s header-less) | **LEDGER-VERIFIED, still open** — fix assessment → **G-7** | deterministic initial state → gate over-broad |
| menu warm-nav freeze (useLinkStatus/toploader) | **LEDGER-VERIFIED by B** (0 `useLinkStatus`/toploader matches) — not re-measured here (browser-bound) | B-nextjs.md verification table |
| motion 45 KB gzip floor (r88-A1) | **LEDGER-VERIFIED holding at HEAD** | `scripts/bundle-report.mjs`: 1 motion chunk, 138.5 KB raw / **45.0 KB gz** (motion 12.43.0 pin per F) |
| r117 benchmark baseline (home 488/16, menu 644/16, pricing 268/16, login 796/316; JSON container-lost) | **NUMBERS STAND, NOT RE-MEASURABLE here** (no browser in sandbox) — live curl TTFB (91–484 ms incl. sandbox→edge RTT) consistent with ISR-HIT reality | measurements table |
| r117 P4a request counts home 52 / menu 67 vs 50 | **LEDGER-STILL-OPEN** — G-3 supplies the repeat-visit lever (16–23 image revalidations per visit) | G-3 |
| F-1 (qrcode ~45 KB static import, 2 dashboard pages) | **SUPERSEDED/EXPANDED by G-1** — real cost ~127 KB gz across 28 routes; the 45 KB figure is round86's webpack-era number | G-1 |
| r118-B3 public menu API Data Cache (60 s, per-restaurant tag) | **VERIFIED SOUND by B** (route read + purge call sites) — not re-verified | B-nextjs.md |
| r113-F116 hero preload / priority hygiene | **VERIFIED HOLDING by B** + live preload list re-checked this session (2 fonts + 4 images, correct) | measurements table |

---

## Solid areas (evidence-checked, no action)

1. **Polling discipline** — `usePollWhenVisible` (visibility-gated, no interval stacking, in-flight guard, immediate/immediate:false options); owner orders 15 s probe-then-refetch (`use-orders-polling.ts:36-75`: pageSize=1 probe ≈0.6 KB vs 8.2 KB full page, ~92% cut, honest cadence shown in UI); admin orders 5 s probe; subscribe polls 15 s only after submission. No unbackoff'd or hidden polling found.
2. **Cart store rehydration** — `src/store/cart.ts:238-257`: `skipHydration: true` + `CartHydrator` post-mount rehydrate (never clobbers quick-adds) + cross-tab `storage` event sync; partialized persist. (Nit, not a finding: web still persists `lastRemoved` — mobile dropped it in r120-M1; one small object.)
3. **Fonts** — 4 local variable families (Cairo 400-800 / Noto Naskh 400-700 / Noto Sans Arabic 300-700 / Readex Pro 300-700), `font-display: swap`, unicode-range subsets, exactly 2 preloads live-verified on the menu page (cairo-arabic 30.7 KB + readex-pro 22.9 KB — the round94-W3 dedup holds), `/fonts/*` immutable 1 y. Noto Sans Arabic (165.9 KB) sits 3rd in every fallback stack after Cairo → never fetched in practice (dead repo weight only, not a transfer cost).
4. **Menu Prisma path** — ~5 queries per ISR render: 1 `getRestaurantBySlug` deduped with `generateMetadata` via React `cache()` (page.tsx:134-136), then 4 in one `Promise.all` (categories, items with hierarchical modifierGroups select — no N+1, page.tsx:163-174; popular groupBy; failure-tolerant showcase raw query with `.catch(() => [])`); `avgRating`/`ratingCount` denormalized columns (no rating joins); amortized by ISR 60 s. Orders API GET: 2-3 queries (findMany+count+optional link check).
5. **Serialization hygiene** — zero `JSON.parse(JSON.stringify)` clones repo-wide; `JSON.stringify(jsonLd)` once per ISR render (page.tsx:339).
6. **Image optimizer usage** — live AVIF negotiation (31.5 KB source → 3.05 KB @256w), per-breakpoint `calc()` `sizes` on menu cards (round88-A2, MenuItemCard.tsx:103-105), 2 `fetchPriority="high"` + eager-row preloads only, lazy elsewhere; raw `<img>` only at 4 documented ponytail exceptions (print page, data-URL QR, lightbox object-contain, MenuToolbar comment).
7. **`scripts/bundle-report.mjs`** — correct, zero-dep, stdout-only (safe to run; run this session: 118 chunks / 1.01 MB gz / motion 45.0 KB). Gap = single-chunk/polyfill warning (G-1/G-2).
8. **Service worker** — `sw.js` v6: bounded LRU(60) cache-first for `/_next/image`, SWR only for `/api/public/*`, network-only elsewhere (round79 Stage C + r110 lessons encoded) — the mitigation half of G-3.

---

## Counts

- **New findings: 7** — 0×P0, **1×P1** (G-1), **1×P2** (G-5), **5×P3** (G-2, G-3, G-4, G-6, G-7)
- **Ledger verification: 10 items** — 3 LEDGER-VERIFIED still-open with new measurements/fix assessments (subscribe shell, orb/shimmer, StickyMenuHeader), 1 still-open with a new lever (request-count P4 → G-3), 1 holding (motion floor 45.0 KB re-measured), 1 numbers-stand-not-remeasurable (r117 benchmark baseline), 1 superseded by G-1 (F-1 qrcode math), 1 verified-sound by B (r118-B3 Data Cache), 1 holding by B + live preload recheck (r113-F116), 1 verified by B (warm-nav freeze, browser-bound)
- **Cross-references:** F-1 (expanded by G-1), B-5 (re-quantified by G-4), B-2 (dashboard empty SSR shell — perf surface of the same null-gate pattern G-7 fixes for the menu header)
- **Solid areas: 8** with evidence
