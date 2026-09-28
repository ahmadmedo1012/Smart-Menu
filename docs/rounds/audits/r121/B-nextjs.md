# r121 — Auditor B: Next.js / Web Platform (READ-ONLY audit)

**Scope:** `src/app/**` route tree, `src/proxy.ts`, `next.config.ts`, `vercel.json`, rendering
strategy (vs `/tmp/build.log`, fresh production build), caching semantics, loading/error/not-found
coverage, metadata/robots, Suspense/hydration, fonts/images, `public/sw.js` interplay.
**HEAD audited:** `74ef578f` (= live production, verified via `/api/health` commitSha).
**Method:** file reads + greps only; live production probes (read-only GETs) where cheap to
verify behavior claims; Next.js behavior checked against `node_modules/next/dist/docs/` (Next 16.3.4).

---

## Rendering strategy per route (build.log truth + correctness verdict)

From `/tmp/build.log` (85/85 static pages generated, 119 routes):

| Route | Build mark | Verdict |
|---|---|---|
| `/` | ○ Static, revalidate 1m | ✅ correct — landing data server-baked (round85-B2), ISR 60s |
| `/menu/[slug]` | ● SSG (on-demand ISR) | ✅ correct — `generateStaticParams(){return []}` + `dynamicParams` + `revalidate=60` (round92-A2); no build-time DB dependency, per-slug on-demand cache. Live: `x-nextjs-prerender: 1`, `x-vercel-cache: HIT/STALE` |
| `/menu/[slug]/print` | ƒ Dynamic | ✅ deliberate — `force-dynamic` (per-request QR data-URL, r93-W2a architecture note) |
| `/menu` | ƒ Dynamic | ✅ correct — force-dynamic DB lookup → 307 demo menu (r120-U3); live-verified 307 |
| `/pricing` | ○ Static, 5m | ✅ correct — plans server-baked (round86-B5) |
| `/terms`, `/privacy` | ○ Static, 1h | ✅ correct (r118-A9) — but see B-1 (browser cache header regression) |
| `/login` | ƒ Dynamic | ✅ correct by design (r113-F114 requireAuth + cookies()) |
| `/subscribe`, `/cart`, `/order-confirmed` | ƒ Dynamic | ✅ acceptable — under `(protected)` layout's `connection()` nonce flow; content is per-user |
| `owner/*` (10), `admin/*` (13) | ƒ Dynamic | ✅ correct — auth-gated dashboards; but see B-2 (empty SSR shell) |
| `/api/public/featured`, `/api/public/stats` | ○ Static, 1m | ✅ correct — public read-only JSON via `export const revalidate` |
| `/api/public/menu/[slug]` | ƒ Dynamic | ✅ correct — heavy payload in Data Cache (r118-B3, verified below) |
| `/[...notfound]` | ƒ Dynamic | ✅ correct — themed catch-all must run `notFound()` per URL (r112-F12) |
| `/robots.txt`, `/sitemap.xml` | ○ Static | ✅ correct |

No route is mis-classified. `generateStaticParams` opportunities beyond the current design were
considered (pre-rendering top restaurants at build) and rejected — the on-demand ISR pattern
exists precisely to avoid build-time DB coupling (round92-A2 Neon-timeout history); agreed.

---

## 'use client' audit

**125 client components** in `src/components/**`; **24 of 35 `page.tsx`** are client components
(all `owner/*`, `admin/*`, `cart`, `order-confirmed`, `subscribe`). The public surface is
server-first and correctly so: home/pricing/menu pages are server components that bake data
and pass it into a single client tree (`HomePage initialStats/initialFeatured`,
`PricingClient initialPlans`, `MenuClientSection serializedItems`).

- The dashboard client-page pattern is the deliberate API-first architecture (REST surface shared
  with mobile; server enforcement in routes + proxy cookie gate). Converting to RSC would be an
  architecture rewrite, not a ponytail fix. NOT a finding.
- MenuHero is a genuine server component (round86-B6 verified — no hooks, islands via
  `MenuIslands`); menu `loading.tsx` covers cross-page transitions (r97-W6c comment accurate).
- All landing sections legitimately use framer-motion (`m.div`) / hooks; the tree is animation-
  driven, home LCP is 488ms (r117 benchmark) — no server-conversion win worth the churn. NOT a finding.
- One real client-shell gap found on the dashboards → **B-2** (null-until-auth SSR shell).
- `/subscribe` remains a full client page with hydration-gated H1 → **LEDGER-VERIFIED LV-1**.

---

## Findings

### B-1 [P3] r120 CSP fix silently reverted the /terms + /privacy browser-cache win (r119-B3): live header is back to 60s; vercel.json rule is now dead config
- Type: FACT
- Evidence:
  - `src/proxy.ts:47-56` — r120-W1 added `/terms` + `/privacy` to `isCacheablePage` (the CSP fix).
  - `src/proxy.ts:156-159` — every `isCacheablePage` response gets `Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=86400`.
  - `vercel.json:23-42` — r119-B3's `max-age=3600, stale-while-revalidate=86400` for exactly those two paths.
  - Live (production `74ef578f`, this session): `curl -I /terms` and `curl -I /privacy` → both answer `cache-control: public, max-age=60, s-maxage=60, stale-while-revalidate=86400`. The middleware header wins over the vercel.json rule on Vercel — the r119 ledger claim ("LIVE: max-age=3600") no longer matches reality.
- Impact: user-facing (minor) — browsers revalidate both pages every 60s instead of 1h (small pages + conditional requests, so cost is tiny). Technical (main): documented-state drift — ENGINEERING_STATE and vercel.json describe a behavior that no longer occurs; the vercel.json rules are dead config that will mislead the next round.
- Fix (minimal): inside the `isCacheablePage` branch, set the browser max-age per path: `pathname === '/terms' || pathname === '/privacy'` → `public, max-age=3600, stale-while-revalidate=86400`, else the current 60s value (or delete the two vercel.json rules and update the ledger if 60s is the accepted value).
- Risk: of fixing — low (header-only, ISR revalidate stays 3600 either way). Of not fixing — config truth keeps drifting.
- Tests required: extend an existing headers e2e/unit assertion for `/terms` cache-control (the r119 verification was manual).

### B-2 [P3] owner + admin layouts render `null` until `/api/auth/me` resolves — SSR HTML is an empty shell on all 23 dashboard routes; their 23 loading.tsx skeletons never display on initial load
- Type: FACT (impact) / SUGGESTION (fix direction)
- Evidence: `src/app/(protected)/owner/layout.tsx:95,98,120` and `src/app/(protected)/admin/layout.tsx:82,98,107` — `const [authLoaded, setAuthLoaded] = useState(false)` → `useEffect(fetch('/api/auth/me'))` → `if (!authLoaded) return null;`. Because the layout substitutes `null` for `{children}`, the server-rendered document for every `/owner/*` and `/admin/*` URL contains only the group shell (background + grid + hidden floating controls): no sidebar, no header, no page skeleton. The per-route `loading.tsx` files (10 owner + 13 admin) are unreachable on initial navigation — they only work for post-auth client-side transitions.
- Impact: user-facing for internal users (owners/admins, the paying operators): blank screen from first paint until hydration + one `/me` round-trip completes (~200-500ms warm, multi-second on throttled mobile — the same class as the r113-F114 login CLS fix and the r120 StickyMenuHeader deferral, but for dashboards).
- Fix (minimal, root-cause): render a real skeleton instead of `null` while `!authLoaded` (the sidebar chrome is static markup; only nav permission filtering needs the role). Larger option: resolve the session server-side in the layout (like `login/page.tsx`'s `requireAuth`) and pass role/permissions down — removes the client `/me` probe entirely.
- Risk: low — visual-only change; keep the client role gate as defense-in-depth (API routes remain the enforcement layer).
- Tests required: existing owner/admin e2e render checks still pass; add one asserting the sidebar appears in the SSR HTML (or at least a skeleton div).

### B-3 [P3] Print page is meta-indexable with inherited og:url — robots.txt covers crawl but the page itself says `index, follow`
- Type: FACT
- Evidence: `src/app/(public)/menu/[slug]/print/page.tsx:20-27` — `generateMetadata` returns only `title`; no `robots`, no `alternates.canonical`, no own `openGraph`. Live: `/menu/al-waha-cafe-demo/print` → `<meta name="robots" content="index, follow"/>` (inherited from `(public)/layout.tsx:55-58`), og:url inherits `/`. `src/app/robots.ts:8` disallows `/menu/*/print` — crawl-blocked, but a robots.txt disallow does not de-index an already-known URL (it can surface as "Indexed, though blocked"); and the og:url mismatch is the same defect class r110-F6 fixed for /pricing, /terms, /privacy.
- Impact: SEO hygiene — duplicate-content surface of the full menu under a second URL pattern; wrong og:url if shared.
- Fix (minimal): in print's `generateMetadata` add `robots: { index: false, follow: false }` and `alternates: { canonical: `/menu/${slug}` }` (+ own og block or none).
- Risk: none.
- Tests required: extend the r110-F6-style metadata assertions if present; manual curl check.

### B-4 [P3] Dead `/landing` entry in `isCacheablePage` — no `/landing` route exists; a future one would silently get the cacheable CSP + no-CSRF-mint + public 60s cache
- Type: FACT
- Evidence: `src/proxy.ts:56` — `pathname.startsWith('/landing')`. No route matches: no `src/app/**/landing*`, no `public/landing`, absent from the 119-route build table. The r120-W1 comment documents the /terms+/privacy entries but not this one.
- Impact: technical — latent mis-policy (nonce-less CSP + skipped CSRF cookie mint + `Cache-Control: public, max-age=60` on a route that doesn't exist and might be interactive if ever created).
- Fix: delete the line (or comment it as intentionally-reserved with a reason).
- Risk: none.
- Tests required: none beyond build (matcher list unchanged).

### B-5 [P3] Menu page HTML document is 292 KB (largest on the site) — full menu duplicated three ways (SSR cards + RSC flight + JSON-LD `hasMenu`)
- Type: SUGGESTION
- Evidence: live `GET /menu/al-waha-cafe-demo` → `content-length: 292010` (raw; ~25 items with modifiers + gallery). `src/app/(public)/menu/[slug]/page.tsx:288-319` — the JSON-LD embeds a `hasMenu.hasMenuSection[].hasMenuItem[]` copy of every item (name+description+price) in addition to the SSR-rendered card list and the RSC flight payload (menu data crosses the boundary once via `serializedItems`). Home is 114 KB by comparison.
- Impact: user-facing on slow networks — the document alone is seconds on 3G before CSS/JS/images; every QR scan downloads it. (Mitigated by ISR + CDN + compression; r117 measured LCP 644ms warm local.)
- Fix (minimal, judgment): keep `Restaurant` + `priceRange` + `image`/`address` (the r115-F123 fields Google actually rewards) and drop the deep `hasMenu` tree, or emit it only for the print route where the duplication serves the page. Ponytail: measure before/after with the r117 benchmark script.
- Risk: losing Menu rich-result eligibility (currently unverified in Search Console — no evidence of Menu-type rich results); reversible.
- Tests required: none functional; JSON-LD unit test if one pins `hasMenu` (update it).

### B-6 [P3] Stale justification: next.config.ts claims /menu/[slug] "deliberately has no loading boundary" — `menu/[slug]/loading.tsx` exists; the real invariant is "no boundary ABOVE the existence gate"
- Type: FACT (doc/config accuracy)
- Evidence: `next.config.ts:25-27` — "the /menu/[slug] route keeps REAL 404s for bots because it deliberately has no loading boundary (nothing flushes before the existence gate resolves)". But `src/app/(public)/menu/[slug]/loading.tsx` EXISTS (re-added in round97 `4c04a3e1` "r97-X1", after `35924222` deleted it, and NOT removed by r119-B1 which deleted only the parent `(public)/menu/loading.tsx`). The 404 contract still holds — live-verified this session: `/menu/<unknown>` → **404** on production — because the boundary sits *inside* `[slug]/layout.tsx` (the existence gate, `src/app/(public)/menu/[slug]/layout.tsx:22-23`), so `notFound()` resolves before anything flushes; the parent-level boundary that caused the r119 soft-404s is gone.
- Impact: technical — this exact file has ping-ponged twice already (delete → re-add → delete-parent); a comment that misstates the invariant invites a third cycle (someone "restoring consistency" could delete the [slug] boundary and regress cold-nav UX, or re-add the parent and resurrect soft-404s).
- Fix: rewrite the comment to state the true invariant: "no loading.tsx may sit ABOVE `[slug]/layout` (the existence gate); the `[slug]/loading.tsx` inside the gate is safe and covers transitions". Optionally pin with a unit/e2e comment reference to the existing full-sweep 404 test (`tests/e2e/full-sweep.test.ts:349-352`).
- Risk: none (comment-only).
- Tests required: none.

### B-7 [P4] `isCacheablePage` prefix `/menu/` also matches the force-dynamic print route — self-hosted servers would publicly cache it 60s (Vercel overrides, live-verified safe)
- Type: FACT (documented trade-off, new instance)
- Evidence: `src/proxy.ts:49` (`pathname.startsWith('/menu/')`) matches `/menu/[slug]/print` which is `force-dynamic` (`print/page.tsx:2`). Proxy comments (`src/proxy.ts:149-155`) already document that on Vercel the platform overrides this header for dynamic renders, while self-hosted `sendRenderResult` keeps it. Live check: `/menu/al-waha-cafe-demo/print` → `cache-control: private, no-cache, no-store` ✅ (Vercel). The standalone output (used for local e2e, per r98-deploy-fix) would serve the print page with `public, max-age=60` — an owner editing a menu then printing within 60s locally could see the stale sheet in tests; production unaffected.
- Impact: technical, local/self-hosted only.
- Fix (optional): exclude paths ending in `/print` from the Cache-Control set (keep the CSP branch — it works, live-verified).
- Risk: none.
- Tests required: local e2e print flow already exists (full-sweep).

---

## r120 deferred items in this domain — verification (LEDGER-VERIFIED, do NOT re-report as new)

| Deferred item | Status at HEAD | Evidence |
|---|---|---|
| /subscribe SSR shell (LCP 4.47s, H1 hydration-gated) | **LEDGER-VERIFIED — still open** | `(protected)/subscribe/page.tsx:1` ('use client'), `:345-351` — `if (loading)` spinner is the entire SSR HTML; H1 at `:363` renders only after the client `/api/plans` fetch resolves. Server-rendering the shell + plans (as pricing does) remains the fix. |
| Menu warm-nav freeze (needs useLinkStatus/toploader + loading-shape work) | **LEDGER-VERIFIED — still open** | `rg useLinkStatus|toploader` over `src/` → 0 matches. `[slug]/loading.tsx` (DefaultLoading) covers cross-page transitions only; ISR RSC still arrives all-at-once. |
| StickyMenuHeader SSR mount (2.6s header-less under throttle) | **LEDGER-VERIFIED — still open** | `MenuClientSection.tsx:78-83` — `{mounted && <StickyMenuHeader/>}` mount-gate (deliberate r97-W6d replacement for dynamic ssr:false; header absent from SSR HTML). |
| Title-template unification («…\| Smart Menu \| المنيو الذكي») | **LEDGER-VERIFIED — still open, live-proven** | Live titles: `/login` «تسجيل الدخول \| الربط الذكي \| المنيو الذكي» (triple — page title `login/page.tsx:30` + template `(protected)/layout.tsx:26`), `/subscribe` «اشترك الآن \| Smart Menu \| المنيو الذكي», `/cart` «سلة الطلبات \| Smart Menu \| المنيو الذكي», `/pricing` «الباقات والأسعار \| Smart Menu \| المنيو الذكي». Clean: menu pages, order-confirmed. |
| r120-W1 CSP fix in `isCacheablePage` (/terms + /privacy dead-on-skeleton) | **VERIFIED SOUND** | `proxy.ts:42-56,104-159` — both pages render live (200, themed, `x-vercel-cache: PRERENDER`); nonce-less CSP + no set-cookie consistent with cached HTML. One side effect → B-1. |
| r118-B3 public menu API Data Cache (60s, per-restaurant tag) | **VERIFIED SOUND** | `api/public/menu/[slug]/route.ts:68-151` — `unstable_cache(..., { revalidate: 60, tags: ['public-menu', 'public-menu-<id>'] })`; restaurant lookup + limiter outside the cache (no negative-caching of 404s). Purge: `lib/menu-cache.ts:42` `revalidateTag(tag, { expire: 60 })` — second-arg form verified valid against bundled Next 16 docs (`revalidateTag.md`: object with `expire` sets the SWR window). Call sites verified on items/categories/settings/reviews/restaurants mutations (8 files, awaited — r92-A2 synchronous-publish contract kept). |
| r120 font-weight token removal (.font-bold emitted font-family:700) | **VERIFIED HOLDING** | `globals.css:129-135` — tokens removed with the explanatory comment; no `--font-{light,regular,medium,semibold,bold}` tokens remain. |
| r119-B1 menu soft-404 (unknown slug must 404) | **VERIFIED HOLDING (live)** | Live `GET /menu/definitely-not-a-real-menu-xyz987-auditb` → 404 on `74ef578f`. Mechanism + stale comment → B-6. |
| r119-B3 terms/privacy browser cache 3600 | **LEDGER-STALE** | Live value is 60s (proxy whitelist branch overrides vercel.json) → reported as B-1. |
| r113-F116 hero preload / priority hygiene | **VERIFIED HOLDING** | `(public)/page.tsx:39` preload hero-phone; `ShowcaseSection.tsx:44`, `FeaturedRestaurantsSection.tsx:133` priority-removal comments present; `OptimizedImage` carries per-site `sizes`. |

---

## Solid areas (evidence-checked, no action)

1. **proxy.ts matcher** — round89-B1 negative-lookahead form verified against the bundled docs
   (`proxy.md` → Matcher, `.*\.ext$` anchoring); static assets skip, pages/API/RSC run. No app
   route collides with the excluded extensions (`/fonts/fonts.css` covered by `.css`).
2. **CSP architecture** — three-branch design (API strict / cacheable nonce-less+no-strict-dynamic /
   dynamic nonce+strict-dynamic) is internally consistent and matches Next 16's documented nonce
   flow; the r120 /terms+/privacy fix is the correct branch for ISR pages; verified live headers
   on `/`, `/menu/<slug>`, `/terms`, `/pricing`, print, `/login`.
3. **Auth gating in proxy** — cookie-presence-only check documented as edge-filter with
   `requireAuth()` as the authority (ponytail comment); session redirect carries security headers;
   `assertSameOrigin` correctly skips GET/HEAD, honors Bearer + the two documented mobile-unauth
   paths (r102-A1 scoping intact).
4. **revalidateMenu contract** — awaited on every owner/admin mutation surface found (items,
   categories, settings, reviews, restaurant update/delete); best-effort try/catch; both web
   (`revalidatePath`) and mobile (`revalidateTag`) legs covered.
5. **loading.tsx / error.tsx / not-found coverage** — 32 loading.tsx + 34 error.tsx across 35
   pages; the only gaps are deliberate: `(public)/menu` (r119-B1, 404 integrity — see B-6),
   `[...notfound]` (instant `notFound()`), `(public)` group root (home is ISR with
   failure-tolerant catch-all data fetches; root `app/error.tsx` is the boundary). Root
   `error.tsx`/`global-error.tsx`/`not-found.tsx` tri-layer from r111/r112 intact, including
   `global-error.tsx` importing `globals.css` (r111-F13) and `ErrorShellLangFix`.
6. **Suspense/hydration discipline** — all 3 `useSearchParams` call sites are Suspense-gated
   (`subscribe/page.tsx:448-460`, `order-confirmed/page.tsx:188-200`, `ScrollToTop.tsx:60-67`);
   no `Intl.DateTimeFormat`/date rendering in components; every `Math.random` is inside
   handlers/effects or `ssr:false` chunks; `prefersReducedMotion` module constant in
   GalleryCarousel is only consumed post-mount (GalleryIsland skeleton gate, r113-F115) — no
   mismatch path.
7. **Fonts** — local-first subsets (Cairo arabic/latin/latin-ext, Readex Pro, Noto Naskh) with
   `font-display: swap`, unicode-range splitting; exactly ONE preload hint per critical font via
   the `preload()` API in both layouts (round94-W3 dedup fix intact); all referenced `.woff2`
   files exist in `public/fonts/`; immutable 1y cache rule on `/fonts/*`.
8. **Images** — single `OptimizedImage` wrapper (fill + aspect box + per-call-site `sizes` +
   skeleton + error fallback); no raw `<img>` in app code (only doc comments); remotePatterns
   list matches actual image sources; `deviceSizes`/`imageSizes` tuned; r113-F116 corrections
   verified in place.
9. **next.config.ts** — standalone-vs-Vercel output split (r98 #96646 workaround, still needed on
   16.3.4), immutable asset rules with per-asset lifetimes reasoned from git history (round92-D3),
   redirects for legacy entry points (308), COOP/CORP duplicated deliberately for
   proxy-skipped assets. All inline claims re-checked against code — one stale comment (B-6).
10. **service worker** — `sw.js` v6: network-first navigations, cache-first only for
    content-addressed assets, bounded LRU image cache (60), SWR JSON only for `/api/public/*`
    with content-type validation (anti-HTML-poisoning), network-only for everything else —
    the round79 Stage C and r110 lessons are encoded in the code and comments.
11. **Live ISR behavior sanity** — verified STALE→HIT transition on `/`, `/pricing`, `/terms`,
    `/menu/<slug>` (first request after idle serves stale + background revalidate, next is fresh
    HIT — standard Vercel ISR-SWR semantics, matches the documented design; owner mutations are
    covered by the instant revalidateMenu purge, r110-F8).

---

## Counts

- **New findings: 7** — 0×P0, 0×P1, 0×P2, 6×P3 (B-1..B-6), 1×P4 (B-7)
- **Ledger verification: 10 items** — 6 LEDGER-VERIFIED still-open (subscribe shell, warm-nav
  freeze, StickyMenuHeader SSR, title-template, + 2 verified-sound fixes), 1 LEDGER-STALE
  (r119-B3 terms/privacy cache → B-1), 3 verified-holding (r118-B3 Data Cache, r120 font tokens,
  r119-B1 soft-404)
- **Solid areas: 11** with evidence
