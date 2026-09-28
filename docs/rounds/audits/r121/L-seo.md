# r121 — L: SEO / Metadata Audit (READ-ONLY)

**Auditor:** L (SEO/Metadata) · **Date:** 2026-09-28 · **HEAD at audit:** `74ef578f` (live `/api/health` commitSha match, verified)
**Method:** full read of all 18 metadata-bearing files in `src/app/` + `sitemap.ts` + `robots.ts` + `next.config.ts` + `proxy.ts` metadata-relevant lines, PLUS live production fetches (curl) of every page type in the matrix below at `https://menu.smart-link.ly` (home, pricing, terms, privacy, login, subscribe, cart, order-confirmed, /menu, 5 real menu slugs, print, 404s ×2, /owner, /admin, /register, /dashboard, robots.txt, sitemap.xml, all og:image URLs). No code modified.
**Overlap discipline:** B-3 (print page meta-indexable) and B-5 (hasMenu size) are verified/extended here, not re-reported. The `/landing` dead whitelist (B-4), owner/admin empty SSR shell (B-2) are B's.

---

## 1. Page-Meta Matrix (all values live-verified 2026-09-28)

| Page | HTTP | Rendered `<title>` | robots | canonical | og:url | og:image (type/dims) | JSON-LD |
|---|---|---|---|---|---|---|---|
| `/` | 200 | الربط الذكي \| Smart Menu — منيو رقمي للمطاعم والمقاهي | index, follow | ✓ self | ✓ self | og-default.png (1200×630 declared+actual) | SoftwareApplication |
| `/pricing` | 200 | الباقات والأسعار \| Smart Menu \| المنيو الذكي ⚠️double-brand | index, follow | ✓ `/pricing` | ✓ `/pricing` (r110-F6 ✓) | og-default.png (1200×630) | SoftwareApplication |
| `/terms` | 200 | شروط الاستخدام \| المنيو الذكي | index, follow | ✓ self | ✓ self (r110-F6 ✓) | og-default.png (1200×630) | SoftwareApplication |
| `/privacy` | 200 | سياسة الخصوصية \| المنيو الذكي | index, follow | ✓ self | ✓ self (r110-F6 ✓) | og-default.png (1200×630) | SoftwareApplication |
| `/login` | 200 | تسجيل الدخول \| الربط الذكي \| المنيو الذكي ⚠️double-brand + dead layout title (L-4) | **noindex, nofollow** ✓ BY DESIGN | — (noindex) | ✗ `/` inherited (harmless) | og-default.png | — |
| `/subscribe` | 200 | اشترك الآن \| Smart Menu \| المنيو الذكي ⚠️double-brand | noindex, follow ✓ | — | ✗ `/` inherited (harmless) | og-default.png | — |
| `/cart` | 200 | سلة الطلبات \| Smart Menu \| المنيو الذكي | noindex, nofollow ✓ | — | ✗ `/` | og-default.png | — |
| `/order-confirmed` | 200 | تم تأكيد الطلب \| المنيو الذكي | noindex, nofollow ✓ | — | ✗ `/` | og-default.png | — |
| `/menu` | **307** → `/menu/al-waha-cafe-demo` | — | — | — | — | — | — |
| `/menu/al-waha-cafe-demo` | 200 | مقهى الواحة - تجريبي \| المنيو الذكي | index, follow | ✓ self | ✓ self | `/demo/logo.webp` — **declared 512×512, actual 400×400** (L-9) | SoftwareApplication + **Restaurant** (priceRange «4-18 د.ل», image, address, hasMenu 25 items — r115 ✓) |
| `/menu/al-aseel` | 200 | مطعم الأصيل \| المنيو الذكي | index, follow | ✓ self | ✓ self | og-default.png (no logo) — **JSON-LD image absent** (L-7) | + Restaurant (priceRange «3-12 د.ل», no image/address) |
| `/menu/pizza-roma` | 200 | بيتزا روما \| المنيو الذكي | index, follow | ✓ self | ✓ self | og-default.png | + Restaurant — **`servesCuisine: "Libyan"` on an Italian pizzeria** (L-3) |
| `/menu/al-waha-cafe` | 200 | مقهى الواحة \| المنيو الذكي | index, follow | ✓ self | ✓ self | og-default.png | + Restaurant (address ✓) |
| `/menu/al-waha-cafeewewe` | 200 | **مقهى الواحة \| المنيو الذكي — IDENTICAL title to al-waha-cafe** (L-7, ledger duplicate) | index, follow | ✓ self | ✓ self | external unsplash 1200px (declared 512×512 ✗) | + Restaurant |
| `/menu/[slug]/print` | 200 | مقهى الواحة - تجريبي — نسخة للطباعة \| المنيو الذكي | **index, follow** ✗ (B-3, extended L-2) | **NONE** ✗ | ✗ `/` inherited | og-default.png (inherited) | SoftwareApplication (inherited) |
| 404 (`/xyz`, `/menu/zzz`) | **404** | homepage default title (catch-all title NOT applied — L-5) | **DUAL: `noindex` + `index, follow` both emitted** (L-5) | — | ✗ `/` | og-default.png | — |
| `/owner`, `/owner/*` | **307** → `/login?redirect=…` (proxy cookie gate) | — | would inherit **index, follow** with a session (L-1) | — | — | — | — |
| `/admin`, `/admin/*` | **307** → `/login` | — | same as owner (L-1) | — | — | — | — |

**hreflang/alternates:** absent on every page (grep `languages|hreflang|alternates.*media` across `src/app` → 0 hits). **Correct** for an Arabic-only single-locale product — `og:locale: ar_LY` + `<html lang="ar">` carry locale; fabricating `x-default` alternates would be invented markup. No action.
**lang/dir:** `<html lang="ar" dir="rtl">` live on every renderable public page (home, pricing, terms, privacy, all menus, print) — r119 root-layout aftermath **holding**. 404s render in the Next `__next_error__` shell (raw HTML has no lang/dir, live-confirmed `<html id="__next_error__">`) — known r111, hydration-fixed by `ErrorShellLangFix`, and 404s are noindex so no SEO impact.
**Twitter cards:** present everywhere; `summary_large_image` for 1200×630 og-default, `summary` for square logos (demo) — matches the round84/88-E9 design. ✓

---

## 2. Findings

### L-1 [P2] (protected) group layout defaults `robots: index,follow` — all 23 owner/* and admin/* routes inherit an indexable default that contradicts the noindex-by-design intent (B-3 is the public-tree twin; this is the missed protected-tree half)
- Type: FACT (code) / SUGGESTION (fix)
- Evidence: `src/app/(protected)/layout.tsx:57-60` — `robots: { index: true, follow: true }` is the shared default for the WHOLE protected group. `src/app/(protected)/owner/layout.tsx:1` and `src/app/(protected)/admin/layout.tsx:1` are `'use client'` (cannot export metadata) and define none; `src/app/(protected)/admin/system-events/page.tsx:4-6` exports a title but no robots. So every owner/admin route serves `index, follow` to any request that carries a session cookie. Only `/login`, `/subscribe`, `/cart`, `/order-confirmed` ship their own robots overrides (login/layout.tsx:6, subscribe/layout.tsx:6, cart/layout.tsx:6, order-confirmed/layout.tsx:6). Live mitigation: `src/proxy.ts:10` (`PROTECTED_ROOTS = ['/admin', '/owner']`) 307s cookieless crawlers to `/login` (live: `/owner`, `/admin` → 307), and `robots.ts:8` disallows both prefixes — so Google never sees the meta today.
- Impact: latent, not live — but it is the exact unsafe-default pattern that already shipped the live print-page defect (B-3): any future protected route (or any change to the proxy gate / matcher) instantly serves `index,follow` on dashboard URLs. Contradicts the audited design intent "auth pages should be noindex".
- Fix (minimal, root-cause): one line in `src/app/(protected)/layout.tsx` — `robots: { index: false, follow: true }`. Every protected page is either noindex-by-design (all four sub-layout overrides keep winning — they are page/segment-level and take precedence) or auth-gated; the default should be safe, not opt-in.
- Risk: of fixing ≈ none (no indexable page lives in the group); of not fixing: a future route forgets the override and ships indexable — same class as B-3.
- Tests required: render `/owner` and `/admin/system-events` HTML (with a session) and assert `noindex` meta; existing metadata snapshot tests for login/subscribe/cart/order-confirmed unchanged.

### L-2 [P3] B-3 (print page) verified live — scope extension: no canonical AT ALL + inherited site-level description/og:title + still double-qualified title + crawlable links from every menu page
- Type: FACT (verification + delta)
- Evidence: `src/app/(public)/menu/[slug]/print/page.tsx:20-27` — `generateMetadata` returns only `title`. Live `/menu/al-waha-cafe-demo/print`: `robots: index, follow` (inherited from `(public)/layout.tsx:55-58`), **no `<link rel=canonical>`** (so the print URL is an un-canonicalized duplicate of `/menu/[slug]`), `og:url = https://menu.smart-link.ly` (apex, r110-F6 class), `og:title = الربط الذكي | Smart Menu` and `description` = the site-wide landing description (duplicated verbatim on every print URL of every restaurant), title `مقهى الواحة - تجريبي — نسخة للطباعة | المنيو الذكي` (page qualifier + template brand). `src/components/menu/MenuHero.tsx:132` links `/menu/${slug}/print` from every indexable menu page → Googlebot discovers print URLs via crawlable links but `robots.ts:8` disallows `/menu/*/print` → classic "Indexed, though blocked" recipe with zero on-page noindex signal.
- Impact: low-probability but real: an externally-linked print URL can be indexed without content (blocked + index,follow + no canonical is the worst combination); duplicated description/og across N print URLs.
- Fix (minimal): as B-3 proposed — add `robots: { index: false, follow: false }` + `alternates: { canonical: `/menu/${slug}` }` to print's `generateMetadata` (title-only is already correct post-r112); THEN also drop `/menu/*/print` from the `robots.ts:8` disallow so the noindex is actually crawlable/visible (see L-6 for the interplay rule).
- Risk: none — print is an auxiliary view.
- Tests required: metadata unit test for print route (robots + canonical asserted); live re-fetch.

### L-3 [P3] `servesCuisine: 'Libyan'` is hardcoded for EVERY restaurant — factually wrong structured data (invented data, which the repo explicitly bans)
- Type: FACT
- Evidence: `src/app/(public)/menu/[slug]/page.tsx:295` — `servesCuisine: 'Libyan'` unconditional. Live: `/menu/pizza-roma` Restaurant JSON-LD says `servesCuisine: "Libyan"` while the restaurant's own name («بيتزا روما») and description («بيتزا إيطالية طازجة بالمكونات الليبية» — Italian pizza) say otherwise. Same hardcode applies to all 5 indexed menus.
- Impact: machine-readable falsehood about the flagship SEO entity on every menu page; `servesCuisine` is an optional schema.org field — omitting it costs nothing, asserting a wrong value pollutes any knowledge-graph consumer. Violates the no-invented-data rule.
- Fix (minimal): delete the line (no cuisine source exists in the DB — do NOT invent one). Optionally keep it only if/when a real cuisine field is added to Restaurant.
- Risk: none.
- Tests required: JSON-LD contract test update (drop `servesCuisine` assertion, if any).

### L-4 [P3] Title-template ledger item QUANTIFIED: 3 brand tokens in rotation, 5 double-brand titles, 1 dead+contradicting title config, og:title suffix inconsistent with `<title>` suffix — unified proposal below
- Type: FACT (quantification) + SUGGESTION (proposal)
- Evidence (all live-verified):
  - Template suffix = `%s | المنيو الذكي` (`(public)/layout.tsx:24`, `(protected)/layout.tsx:26`).
  - **Double-brand titles** (page hardcodes a brand, template appends a second): `/pricing` «الباقات والأسعار | Smart Menu | المنيو الذكي» (pricing/layout.tsx:4), `/login` «تسجيل الدخول | الربط الذكي | المنيو الذكي» (login/page.tsx:30), `/subscribe` «اشترك الآن | Smart Menu | المنيو الذكي» (subscribe/layout.tsx:4), `/cart` «سلة الطلبات | Smart Menu | المنيو الذكي» (cart/layout.tsx:4), `/menu` «المنيو الرقمي | Smart Menu | المنيو الذكي» (menu/page.tsx:8 — dead in practice, page always redirects while any restaurant exists).
  - **Dead + contradicting config**: `login/layout.tsx:4` declares `تسجيل الدخول | Smart Menu` but `login/page.tsx:30` (`تسجيل الدخول | الربط الذكي`) always overrides it — two files, two brands, one loser.
  - **Clean single-brand titles**: terms, privacy, order-confirmed, all menu/[slug], print, admin/system-events.
  - **og:title suffix alternates between brands**: pricing og:title «…| Smart Menu» vs terms/privacy og:title «…| الربط الذكي» — same site, two suffixes.
  - Three brand tokens in rotation for one product: «الربط الذكي» (og:site_name), «المنيو الذكي» (template suffix), «Smart Menu» (EN). Home default title carries two of them.
- Impact: SERP/tab display noise on `/pricing` (the only indexable double-brand page); brand-signal dilution; maintenance drift (login already drifted).
- Fix (minimal, 5 one-line edits + 1 deletion): keep the template `'%s | المنيو الذكي'` (menu pages — the highest-traffic indexed surface — keep their titles byte-identical) and strip the hardcoded brand from the double-brand page titles: pricing → «الباقات والأسعار», login → «تسجيل الدخول», subscribe → «اشترك الآن», cart → «سلة الطلبات», menu → «المنيو الرقمي»; delete the dead `title` in `login/layout.tsx:4`. Alternative (also 1-line): change the template suffix to `'%s | الربط الذكي'` to match og:site_name — but that rewrites every menu title; the first option is the smaller blast radius.
- Risk: titles change on noindex pages + /pricing — monitor nothing; no canonical/OG impact.
- Tests required: title snapshot tests for the 5 touched routes.

### L-5 [P3] Live 404s emit TWO conflicting robots metas (`noindex` + `index, follow`); the catch-all page's metadata (title + robots noindex,nofollow) is dead config; the served 404 title is the homepage title
- Type: FACT
- Evidence: live `/xyz-audit-l` and `/menu/zzz-does-not-exist` (both HTTP 404) emit BOTH `<meta name="robots" content="noindex"/>` (hand-hoisted in `(public)/not-found.tsx:52-54` — the r111-F12 layer-2 belt-and-suspenders that SAVES this) AND `<meta name="robots" content="index, follow"/>` (inherited from `(public)/layout.tsx:55-58` — when `notFound()` throws, the page's own metadata `[...notfound]/page.tsx:20-26` is discarded and the boundary+layout metadata wins; same reason the served title is the layout default «الربط الذكي | Smart Menu — …», not «404 - الصفحة غير موجودة»).
- Impact: Google's documented conflict resolution takes the MOST restrictive directive → noindex wins, and the 404 status itself already excludes the page — so **no live indexing risk** (verified live the 404 noindex still holds — LEDGER r112 intact). But: the `robots` field in `[...notfound]/page.tsx` is dead config that misleads maintainers, the dual emission is fragile (any consumer applying "first tag wins" semantics would index), and the 404 title/description never render.
- Fix (minimal, root-cause): remove the `robots` field from `(public)/layout.tsx:55-58` — `index,follow` is the crawler default when NO robots meta is emitted, so every public page behaves identically, and 404s then emit exactly ONE robots meta (the hoisted `noindex`). Optionally hoist the intended 404 title via the same not-found boundary.
- Risk: near-zero — verify no test asserts `index, follow` meta text on public pages (behavior is identical by default).
- Tests required: metadata snapshot for home/pricing/menu (no robots meta emitted = default) + 404 (single `noindex`).

### L-6 [P3] robots.txt disallows `/cart` + `/order-confirmed` which already serve noindex — a blocked noindex can never be seen; after fixing L-2, `/menu/*/print` joins this class
- Type: FACT + SUGGESTION
- Evidence: `src/app/robots.ts:8` disallows `/cart`, `/order-confirmed`, `/menu/*/print`; live robots.txt confirms. `/cart` and `/order-confirmed` also serve `noindex, nofollow` (cart/layout.tsx:6, order-confirmed/layout.tsx:6). Google's guidance: a robots.txt-blocked URL can still appear "Indexed, though blocked" (URL-only) because the crawler never sees the noindex; the noindex works only when crawlable.
- Impact: near-zero today (no public links to /cart or /order-confirmed from indexable pages) — but the disallow is dead weight that weakens the operative signal (the meta) and will do the same to print pages if B-3/L-2's noindex is added without touching robots.ts.
- Fix (minimal): drop `/cart`, `/order-confirmed` (and `/menu/*/print` once L-2 lands) from the disallow list; keep `/admin/`, `/owner/`, `/api/` (those are gate/307 surfaces where blocking crawl is the operative control). Sitemap-directive + host stay as-is.
- Risk: negligible crawl-budget cost (3 tiny route families).
- Tests required: robots.txt snapshot update; live re-fetch of robots.txt.

### L-7 [P3] Sitemap cross-check (live = 9 URLs = 4 static + 5 menus): the KNOWN duplicate `al-waha-cafeewewe` is still advertised with a title identical to `al-waha-cafe`; 4/5 indexed restaurants lack a JSON-LD `image`; static lastmod is always "now"
- Type: FACT (cross-check) — ledger owner-action items confirmed, not re-reported as new
- Evidence: live `sitemap.xml` (fetched) = `/`, `/pricing`, `/terms`, `/privacy` + `/menu/{al-aseel, pizza-roma, al-waha-cafeewewe, al-waha-cafe, al-waha-cafe-demo}`. Code `src/app/sitemap.ts:95-111` (gates: isActive + ≥3 items/showOnLanding + junk-name regex + 90-day activity; demo whitelisted past name-patterns only). The gates work — 208+ DB restaurants collapse to 5 quality URLs, QA restaurant and keyboard-mash rows excluded (round92-A5/round97-X3 holding). Two residual facts: (1) `al-waha-cafeewewe` — the ledger's pending owner-purge duplicate — passes every gate (vowel-rich name, 3 sections, updated 2026-09-08) and its live title «مقهى الواحة | المنيو الذكي» is byte-identical to `/menu/al-waha-cafe` → Google must pick a canonical inside a duplicate cluster the sitemap itself advertises; (2) `Restaurant.image` is absent on 4/5 menus (al-aseel, pizza-roma, al-waha-cafe, al-waha-cafeewewe have no logo and empty/no gallery → code `page.tsx:282-286` correctly omits rather than invent) — Google marks Restaurant `image` as RECOMMENDED, so the r115-F123 win currently lands on the demo only. Minor: `sitemap.ts:114-132` stamps static pages with `lastModified: new Date()` (deploy-time, not content-change time) — Google tolerates; menu `lastModified: r.updatedAt` is correct (any restaurant-row touch counts — acceptable).
- Impact: duplicate-cluster noise between two sitemap URLs until the owner purges (USER ACTION, ledger); rich-result eligibility weaker on 4/5 real restaurants for lack of any image (data, not code).
- Fix: (a) none in code for cafeewewe — the purge is the logged owner action; optionally add a title-disambiguation guard is NOT recommended (inventing suffixes). (b) owner-side: upload a logo/gallery image (data entry, not code). (c) optional: static lastmod could pin to a real content date — P4 polish, skip unless free.
- Risk: none.
- Tests required: none (cross-check only).

### L-8 [P3] Three different URL-origin fallbacks and two env vars for the same production origin — apex-domain fallback is a landmine if `NEXT_PUBLIC_DOMAIN` ever goes unset; print QR uses an env var that isn't even declared in env.ts
- Type: FACT (hygiene)
- Evidence: `sitemap.ts:4`, `robots.ts:10`, `(public)/layout.tsx:39`, `(protected)/layout.tsx:41` → `NEXT_PUBLIC_DOMAIN || 'https://smart-link.ly'` (APEX, not the app host `menu.smart-link.ly`); `(public)/menu/[slug]/page.tsx:51,131` → `|| 'http://localhost:3000'` (dev default); `(public)/menu/[slug]/print/page.tsx:66` → `process.env.NEXT_PUBLIC_APP_URL ?? 'https://menu.smart-link.ly'` — a DIFFERENT var name with the CORRECT prod fallback. `src/lib/env.ts:23` zod-requires `NEXT_PUBLIC_DOMAIN` (so the apex fallback is unreachable in a validated env — production live-verified correct: all canonicals/og:urls/sitemap/robots point at `menu.smart-link.ly`), but `NEXT_PUBLIC_APP_URL` is not in env.ts at all → the print QR relies on its hardcoded fallback being right.
- Impact: latent config-hygiene hazard (wrong-host canonicals for the whole site if the env gate is ever bypassed at build; silent divergence risk between QR links and canonicals).
- Fix (minimal): single constant (e.g. extend `lib/env.ts` or a `SITE_URL`) consumed by all six call sites; retire `NEXT_PUBLIC_APP_URL` in favor of `NEXT_PUBLIC_DOMAIN`.
- Risk: none (pure consolidation).
- Tests required: existing env-validation tests; grep for removed var.

### L-9 [P3] og:image declared-vs-actual dims: logo case declares 512×512 while the real logo is 400×400 (r112 P4 — LEDGER-VERIFIED STILL OPEN); JSON-LD MenuItem descriptions ship as empty strings
- Type: FACT (ledger verification) + FACT (minor)
- Evidence: live `/menu/al-waha-cafe-demo` → `<meta property="og:image:width" content="512"/><meta property="og:image:height" content="512"/>` (code `page.tsx:75`) while the fetched `/demo/logo.webp` measures **400×400** (RIFF/VP8 header, `file` output). Same for `al-waha-cafeewewe` (declared 512×512, actual unsplash `w=1200`). og-default.png verified exactly 1200×630, 38,396 bytes, `image/png`, HTTP 200; demo logo 200 `image/webp` 21KB; favicon.png + manifest.json 200. Harmless per r112 (scrapers re-measure) — still open, no code change mandated. Secondary nit in the same payload: JSON-LD `MenuItem.description: ""` for every description-less item (`page.tsx:310` emits the DB default `''` unconditionally — live al-aseel items all show `"description": ""`) — valid but noisy; the priceRange/image/address fields already use omit-when-empty conditional spreads (page.tsx:296-300), so `description` should too.
- Impact: none user-visible; scrapers re-measure images; empty-string descriptions are schema-valid.
- Fix (optional): conditionally omit empty `description` in both MenuItem and Restaurant (2-line change mirroring the existing conditional pattern); leave og dims as-is or drop width/height for the logo branch.
- Risk: none.
- Tests required: JSON-LD snapshot update.

---

## 3. Solid areas (evidence-backed, no action needed)

1. **Per-restaurant meta is UNIQUE and real** — all 5 live menus: distinct titles, distinct descriptions (from `restaurant.description` or the name-interpolated fallback), self-canonical, self og:url, og:image = logo-or-fallback, twitter card correctly flips `summary_large_image`↔`summary` by image shape. No template-duplicated meta across restaurants.
2. **Home/pricing/terms/privacy meta complete** — unique Arabic descriptions (not cut off), canonicals, full OG blocks; r110-F6 og:url fix verified holding on all three.
3. **Canonical handles query params** — `/?plan=pro` and `/menu/[slug]?ref=x&utm_source=qr` both emit clean canonicals/og:urls (live-verified); category filters use buttons + `window.location` state (MenuPageClient.tsx:46-58 documents no param-bearing internal links) → no crawlable param surface; `#anchor` sections are same-URL.
4. **Trailing slashes 308-normalize consistently** (`/menu/` → `/menu`, `/pricing/` → `/pricing`); **/register + /dashboard are 308 equity-carrying redirects** to /subscribe and /owner (next.config.ts:63-68, live-verified) — round97-X3 holding.
5. **hreflang correctly ABSENT** (single-locale ar_LY; zero `alternates.languages` in the codebase) — no fake alternates.
6. **lang="ar" dir="rtl" on every public render path** (r119 aftermath verified live); 404 error-shell exception is known + hydration-fixed + noindex.
7. **Sitemap gates effective and principled** — 208+ rows → 5 URLs via junk-name + 90-day-activity + ≥3-items/showOnLanding gates (round92-A5/round97-X3 holding live); print/owner/admin/cart/order-confirmed correctly excluded; changefreq/priority discipline sane (weekly/1 home, monthly 0.8-0.4 statics, daily 0.8 menus); sitemap.xml + robots.txt served 200 with correct content-types and Vercel caching.
8. **robots.txt correct** — allow /, disallow admin/owner/api (+cart/order-confirmed/print, see L-6), sitemap directive with correct host (live).
9. **Structured data honest and structurally valid** — Restaurant schema (r115 priceRange/image/address) live with real discount-aware price ranges; `hasMenu` full payload mirrors visible content (no cloaking; size concern is B-5's, validity is not); SoftwareApplication JSON-LD states a real free plan; BreadcrumbList/WebSite/SearchAction correctly absent (flat IA, no site search — nothing real to mark up; Organization schema could be added from real data but nothing requires it).
10. **Expired-subscription menus staying indexable is INTENTIONAL** (subscription-guard.ts lazy enforcement: owner blocked from editing, customer menu stays live) — sitemap inclusion is consistent with the product decision; not a defect.
11. **Empty-restaurant menus render an honest empty state** (MenuPageClient.tsx:435-458, real 200 + restaurant identity — no soft-404 cloaking; sitemap already de-prioritizes them via the content gate).
12. **No X-Robots-Tag header/meta duplication** anywhere (grep clean) — meta robots is the single mechanism (modulo the L-5 dual case).

## 4. Ledger verifications (r121 status)

| Ledger/prior item | Status |
|---|---|
| r115 Restaurant JSON-LD priceRange/image/address | **LEDGER-VERIFIED live** (demo: «4-18 د.ل» + image + address; image absent on 4/5 for lack of data — L-7) |
| r110-F6 og:url per-page on /pricing /terms /privacy | **LEDGER-VERIFIED holding** (live self-path og:urls) |
| r112 404 noindex | **LEDGER-VERIFIED holding with new nuance** — dual conflicting robots metas + dead catch-all metadata (L-5) |
| login noindex BY DESIGN (Lighthouse seo-66 false positive) | **LEDGER-VERIFIED** (live noindex,nofollow) |
| sitemap.ts + robots.ts exist | **LEDGER-VERIFIED** + live cross-checked (9 URLs; directives live) |
| r112 P4 logo dims 512-declared vs 400-actual | **LEDGER-VERIFIED STILL OPEN** (live re-measured, L-9) — harmless |
| r120-deferred title-template triple | **LEDGER-VERIFIED still-open + QUANTIFIED + proposal delivered** (L-4) |
| r115 uppercase-slug 404 (P4 idea) | **VERIFIED still 404** (`/menu/AL-WAHA-CAFE-DEMO` → 404 live) |
| duplicate restaurant cafeewewe purge (USER ACTION) | **STILL PENDING** — sitemap/title-duplication side confirmed (L-7) |

**Counts: 9 findings — 0 P0 · 0 P1 · 1 P2 (L-1) · 8 P3 · 9 ledger items verified · 12 solid areas.**
