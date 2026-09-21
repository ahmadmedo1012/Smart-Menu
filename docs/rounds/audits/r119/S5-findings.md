# S5 — Web a11y/perf full-route matrix (round r119)

Scope: `/home/z/my-project/repos/Smart-Menu` web (src/app + src/components). READ-ONLY audit. Live probes against https://menu.smart-link.ly (GET-only, no data creation). Prior rounds' PASS items (LCP 488–796ms home/menu/pricing/login, CLS 0 login, img-alt/empty-buttons/heading-order/44px/skip-link basics) are NOT re-reported — this round goes deeper: full 36-route matrix, keyboard/SR layers on r116–r118 components, zoom/reflow, reduced-motion, forms, fonts/images, live spot-probes.

---

## 1. ROUTE MATRIX (all 36 page.tsx routes, by code reading)

### Public group (8 routes — `(public)/layout.tsx` ISR-cacheable shell)

| Route | Data-fetch | LCP risk | CLS risk | Images | Fonts |
|---|---|---|---|---|---|
| `/` home | ISR 60s + SSR stats/featured `(public)/page.tsx:12,41-44`; hero-phone.webp preloaded `:39` | LOW (fixed r113) | low | featured logos | 2 preload ✅ |
| `/menu` (list) | dynamic SSR, 2 prisma queries `(public)/menu/page.tsx` | MED (uncached DB render/visit) | low | logos | 2 preload ✅ |
| `/menu/[slug]` | on-demand ISR 60s + SWR `menu/[slug]/page.tsx:2,20-22` (live: s-maxage=60, age>0 ✅) | MED — **LCP logo gated by JS** (§6.2) | low | 27 imgs, 21 lazy, correct `sizes` | 2 preload ✅ |
| `/menu/[slug]/print` | **force-dynamic SSR, 2 DB queries every view** `print/page.tsx:2,31,46` | MED | low (fixed A4 `:89`) | 0 (slim select `:44-58` ✅) | full app shell shipped |
| `/pricing` | ISR 60 (live: s-maxage=60 ✅) | LOW (prior round) | low | — | 2 preload ✅ |
| `/terms` | ISR 3600 `terms/page.tsx:8` — edge HIT but browser `max-age=0, must-revalidate` (live) | LOW (0.09s warm) | low | 0 | 2 preload ✅ |
| `/privacy` | ISR 3600 `privacy/page.tsx:8` — same header quirk | LOW | low | 0 | 2 preload ✅ |
| `/[...notfound]`→404 | themed boundary `[...notfound]/page.tsx:28-30` + `(public)/not-found.tsx` | LOW | low | 0 | themed ✅ BUT see P1-3 |

### Protected group (28 routes — all `no-store` dynamic: `(protected)/layout.tsx:75 await connection()` for CSP nonce)

Pattern: `'use client'` page + fetch-on-mount. Routes: `/login` (server page + island — r113 CLS fix ✅), `/subscribe`, `/cart`, `/order-confirmed`, `/owner` + 11 owner subroutes, `/admin` + 13 admin subroutes (3 are thin server wrappers delegating to client components: admin/menu, admin/orders, admin/users; owner/menus is a 7-line redirect `owner/menus/page.tsx:6`).

| Route | Fetch pattern | LCP risk | CLS risk |
|---|---|---|---|
| `/subscribe` | FULL CSR: plans via `/api/plans` `subscribe/page.tsx:78` + auth via `/api/auth/me` `:121` after hydration; retry waterfall `:88-91` | **HIGH** (live TTFB 0.32–1.57s + 2 sequential fetches before plan cards) | MED (spinner→wizard swap `:345-351`) |
| `/cart` | CSR + localStorage cart hydration; pickup options fetch | MED | MED (staggered `opacity-0 translate-y-4` entrance `CartLineItem.tsx:34`) |
| `/order-confirmed` | CSR, reads query params `order-confirmed/page.tsx:19-27` | MED | low |
| `/owner` dashboard | 4 parallel fetches post-hydration `owner/page.tsx:94-99` | HIGH (nobody measured) | MED (skeleton→KPI swap) |
| `/owner/*` others | 1–3 fetches each (e.g. settings 1, loyalty 3, orders+polling) | MED | MED |
| `/admin` dashboard | `/api/admin/stats` `admin/page.tsx:80` | HIGH (unmeasured) | MED |
| `/admin/*` others | 1–2 fetches each | MED | MED |

### WORST 5 unmeasured routes (evidence)

1. **`/subscribe`** — the only public CTA target ("اشترك الآن" from home/pricing) that is (a) `no-store` dynamic (protected layout nonce, `layout.tsx:75`), (b) 100% client-rendered (`subscribe/page.tsx:1`), (c) gated on 2 post-hydrate fetches (`:78` plans, `:121` auth) with a 1s auto-retry (`:88-91`). Live: cold TTFB **1.57s**, warm 0.32s — then plan cards paint only after `/api/plans` round-trip. Worst LCP path in the funnel; also the only place where the entire business offer (plans) is invisible without JS.
2. **`/menu/[slug]/print`** — `export const dynamic = 'force-dynamic'` (`print/page.tsx:2`) = zero caching; every print view runs `prisma.restaurant.findUnique` (`:31`) + `prisma.menuCategory.findMany` (`:46`) and ships the full themed app shell (fonts, GridPattern, Toaster, Analytics) for a sheet whose print CSS hides all app chrome anyway (`globals.css:1206-1229`).
3. **`/owner` (dashboard)** — every visit: no-store HTML + JS bundle + 4 parallel API calls (`owner/page.tsx:94-99`: restaurant, stats, loyalty, advanced). The KPI grid and charts all render from empty skeletons; no route-level measurement exists. Charts use tabular data fetched on the client only.
4. **`/cart`** — no-store + client cart hydration from localStorage with staggered entrance (`CartLineItem.tsx:34` `opacity-0 translate-y-4` until `animateItems`), pickup-options fetch (`PickupTypeSelector.tsx:33-37` announces loading), and undo-banner insertion/removal (`cart/page.tsx:306,366`) — several CLS candidates never measured on the money path.
5. **404 (unmatched URL)** — content is themed and correct (live: suggestions nav ×2, status 404, 36.6KB), but Next's error shell emits `<html id="__next_error__">` **without `lang`/`dir`** and with the homepage default `<title>` — see P1-3. Perf itself is fine (0.65s).

---

## 2. Keyboard navigation completeness

**Strong baseline (verified, no action):** skip-link in both layouts targets existing `main#main-content` (`(public)/layout.tsx:139-144,167`, `(protected)/layout.tsx:123-128,150`); global `:focus-visible` outline (`globals.css:904-908`) + 183 `focus-visible:` utility usages across 88 files; Header mobile menu = full trap + Esc + restore (`Header.tsx:59-101`); Base UI Dialog/Sheet = modal + trap + Esc + restore (`ui/dialog.tsx:11`, `ui/sheet.tsx:4`); OrderDialog = proper `role="radiogroup"` with RTL-aware arrow keys (`OrderDialog.tsx:464-503`); GalleryCarousel arrows/dots/pause are real buttons, visible on focus-within (`GalleryCarousel.tsx:165-231`), slides are `role="group"` with `aria-roledescription` + `aria-hidden` inactive + Enter/Space open (`:123-141`); StepIndicator buttons carry per-step `aria-label` + `aria-current="step"` (`StepIndicator.tsx:43-57`); CategoryTabs = documented filter-button pattern with `aria-pressed` (`CategoryTabs.tsx:104-128,167`).

**Gaps:**

- **P3** Lightbox does not restore focus to the opener element on close — `closeLightbox` (`GalleryCarousel.tsx:76-79`) only resets state; after Esc, focus falls to `<body>` and keyboard users lose their place in the carousel. Fix: store `document.activeElement` on open (as `Header.tsx:63` does) and refocus on close.
- **P3** Owner QR page: while `/api/settings` is in flight there is NO loading state at all — the card renders only `{url && …}` and the empty state only `{loaded && !url}` (`owner/qr/page.tsx:123,139`), so the area between header and footer is blank (no skeleton, no `aria-busy`). Fix: add the same three-state pattern already shipped on admin/qr (r118-A5-F4).
- **P4** `OrderStepper` (`cart/OrderSte.tsx` → `OrderStepper.tsx:10-31`): decorative progress strip carries `aria-label="خطوات الطلب"` on a plain `div` (no list/progressbar role), and the highlighted step is hard-coded `i === 0` — it never advances, so the label over-promises. Either drop the aria-label or make it a real `<ol>` with `aria-current`.

## 3. Screen-reader semantics on newer components

**Verified good:** toasts have `role="alert"` + close button labeled (`premium-toast.tsx:76,90`); `LoadingAnnouncer` (`ui/loading-announcer.tsx:41-49`) used on 20 owner/admin pages + subscribe + PickupTypeSelector; search result count is `aria-live="polite"` (`MenuPageClient.tsx:368-380`); OrderDialog modifier groups are fieldsets with `aria-pressed` chips + `role="alert"` per-group errors (`OrderDialog.tsx:314-384`) and a polite live total (`:546-556`); ConnectivityBanner = `role="status"` + polite (`ConnectivityBanner.tsx:65-66`); ReviewSheet field errors `role="alert"` (`ReviewSheet.tsx:319`); admin list skeletons are `aria-live="polite"` with labels (e.g. `admin/restaurants/page.tsx:117`, `admin/users/page.tsx:120`); errors as toasts everywhere else.

**Gaps (this is where the real findings are):**

- **P1** `CartUndoBanner` is completely silent to screen readers — plain `div` + button, no `role="status"`/`aria-live` (`CartUndoBanner.tsx:13`). A blind user removing a line hears nothing ("تم حذف: X" never announced) and only discovers the undo affordance by chance while tabbing. The button itself is keyboard-reachable with a focus ring (`:17-22`) — only the announcement is missing. Fix: `role="status" aria-live="polite"` on the wrapper div (one line). Note the live region must be permanently mounted (announce by swapping text) or the whole banner mounted before the message changes — simplest: keep the wrapper always rendered with `aria-live` and toggle content.
- **P2** `PickupTypeSelector` (checkout!) — the three pickup buttons convey selection **only by color/gradient**; no `aria-pressed`, no group semantics (`PickupTypeSelector.tsx:49-58`). Contrast with the exemplary radiogroup in `OrderDialog.tsx:464-503`. Fix: `aria-pressed={value === opt.value}` on each button + `role="group" aria-label="نوع استلام الطلب"` on the row.
- **P2** `CartLineItem` stepper/delete buttons are not item-scoped: every line announces identical «إنقاص الكمية / زيادة الكمية / حذف الصنف» (`CartLineItem.tsx:63,74,82`), and the quantity value span (`:67-69`) is in no live region — SR users can't tell which line they're changing or hear the new count. Fix: `aria-label={\`حذف ${item.name}\`}` etc., wrap the trio in `role="group" aria-label={\`كمية ${item.name}\`}` and give the value span `aria-live="polite"` (or adopt `role="spinbutton"` with `aria-valuenow`).
- **P2** admin/qr three states (r118-A5-F4): the loading state is visual-only — `animate-pulse` + text, but **no `aria-busy` and no `role="status"`** (`admin/qr/page.tsx:106-113`); also the size-selector buttons lack `aria-pressed` (`:218-232`) while owner/qr HAS it (`owner/qr/page.tsx:195`) — same component family, inconsistent semantics. Fix: `role="status"` + `aria-busy={loadState === 'loading'}` on the state container; add `aria-pressed={qrSize === s.value}`.
- **P2** Owner item form status toggle (متوفر/غير متوفر) — selection conveyed only by success/destructive colors, no `aria-pressed` (`ItemCoreFields.tsx:110-126`). Fix: `aria-pressed={form.status === s}`.
- **P2** `premiumToast`: `role="alert"` (implicit **assertive**) combined with `aria-live="polite"` (`premium-toast.tsx:76-77`) — the explicit polite downgrades error toasts; validation failures (e.g. subscribe pre-flight, order submit errors via `orderSubmitErrorMessage`) are announced passively. Decide per-kind: keep `role="status"`+polite for info/success and assertive for `error`/`trash` icons, or simply drop `aria-live` and let `role="alert"` do its job.
- Arabic label quality: audited all icon-only buttons on audited components — labels are meaningful and specific («إظهار كلمة المرور», «تكبير الصورة», «الصورة السابقة», «نسخ الرابط»), no bare «زر» anywhere. ✅

## 4. Zoom / reflow (200% + 320px)

- **P3** admin/qr restaurant chips row has no `flex-wrap` (`admin/qr/page.tsx:169` `className="flex gap-2 mt-1.5"`) — with more than ~3 restaurants, chips overflow the 320px viewport and are clipped by `overflow-x-clip` on `<body>` (`(public)/layout.tsx:136`) → **unreachable restaurants at 320px/200%**. Fix: `flex-wrap` (matches owner/qr size buttons which use `flex-1` and shrink correctly).
- Tables use the correct pattern: `overflow-x-auto` wrapper + `min-w-[600px]` table (`admin/audit-logs/page.tsx:275-276`) — scrollable, not clipped. ✅
- Fixed-looking `w-[1220px]`/`w-[1060px]` hits are all `max-w-[…]` containers (`Header.tsx:199`, `FeaturedRestaurantsSection.tsx:63,92`) — safe. ✅
- Charts: SVG `viewBox` + fluid container (`ColumnChart.tsx:100`, `SplineAreaChart.tsx:128`) — reflow-safe. ✅
- StepIndicator hides step labels under `sm:` but compensates with full `aria-label` per step (`StepIndicator.tsx:53-57`). ✅
- `SelfHostedQR` style `width/height: qrSize` with only `maxWidth:'100%'` (`SelfHostedQR.tsx:58`, and call sites `owner/qr/page.tsx:170`, `admin/qr/page.tsx:203`) — at 320px with size 500/1000 the img width caps at container but height stays fixed → aspect distortion (squashed QR). Fix: add `maxHeight` guard or `height: 'auto'` under a container query, or clamp displayed size via CSS `min(qrSize, 100%)`.

## 5. prefers-reduced-motion

Global coverage is strong: `@media (prefers-reduced-motion: reduce)` blanket rule twice (`globals.css:720-729` inside layer, `:1181-1195` top-level: duration 0.2s, iteration-count 1, specific `animation:none` for glow/aurora/grain) + `MotionConfig reducedMotion="user"` (`MotionProvider.tsx:15`) + 18 files using `useReducedMotion`/`matchMedia` + `motion-reduce:` utilities in hotspots (FeaturedShowcase, MenuHero, owner/qr). Carousel autoplay starts paused for reduced-motion users (`GalleryCarousel.tsx:13-29`). ✅

- **P4** Two JS smooth-scrolls bypass the CSS media query: `CategoryTabs.tsx:100` (`scrollIntoView({behavior:'smooth'})`) and `ScrollToTop.tsx:45` (`scrollTo({behavior:'smooth'})`). Fix: read `matchMedia('(prefers-reduced-motion: reduce)')` once (pattern already exists in `GalleryCarousel.tsx:13-16`) and pass `behavior: reduce ? 'auto' : 'smooth'`.
- Note (no action needed): the blanket 0.2s rule means `animate-spin` loaders freeze after one 0.2s revolution for reduced-motion users — acceptable tradeoff, but a `motion-reduce:animate-none` + static "…" text on primary spinners would read better.

## 6. Forms (all five audited)

**login** (`LoginForm.tsx`): exemplary — `htmlFor`/`id` pairs (`:169-190`), `autoComplete="username"/"current-password"` (`:177,198`), `required` + `autoFocus`, show-password button labeled with state (`:212`), 44px hit areas, real `h1` (`:158`). Errors via toast (role=alert). ✅

**checkout/cart**: `CustomerInfoCard.tsx:22-48` labels associated ✅, phone `type="tel" dir="ltr"` ✅ but no `autoComplete="tel"` (P4, WCAG 1.3.5). `DeliveryAddressField.tsx:12-23` — **P1**: `<label>` has no `htmlFor` and the textarea has no `id`/`aria-label` → completely unassociated (placeholder-only); AND there is no required-validation: an empty address for a `delivery` order is silently submitted (`cart/page.tsx:183-185` `.filter(Boolean)` drops the empty «العنوان:» line) — the restaurant receives a delivery order with no address. Fix: `htmlFor="delivery-address"` + `id` + `aria-required={pickupType==='delivery'}` + block submit with an inline error when delivery + empty.

**subscribe** (`SubscribeForm.tsx`): required indicators use `*` in label text (`:313,331`) ✅, `aria-invalid` on name/slug/username/password (`:323,350,427,454`) ✅, `autoComplete` on username/new-password (`:414,442`) ✅ — but:
- **P1** Broken literal ids from a lost template-literal refactor: `htmlFor={"`w-w-desc`"}` / `id={"`w-w-desc`"}` (`:365-366`) and `` `w-w-phone` `` (`:377-378`) — the rendered id literally contains backticks, and `sub-wa-wa` (`:387-388`) is a fixed id. With the multi-menu feature («+ إضافة منيو» `:285`), every extra block renders **duplicate ids** → labels activate the FIRST block's inputs, axe `duplicate-id` + `duplicate-id-aria` criticals. Fix: `` htmlFor={`w-w-desc-${index}`} `` / `sub-wa-phone-${index}` / `sub-wa-wa-${index}`.
- **P2** Inline error `<p>`s (`:327,355,358`) are not wired via `aria-describedby` — inputs carry `aria-invalid` but the error text is not programmatically linked (base `Input` already supports the attribute, `ui/input.tsx:15,58`). Fix: `aria-describedby={submitted && invalid ? \`err-name-${index}\` : undefined}` + matching `id` on the `<p>`.
- **P3** phone/whatsapp inputs are default `type="text"` with no `inputMode="tel"`/`autoComplete="tel"` (`:378-394`) — Arabic-locale mobile keyboards offer the wrong pad; only 2 `inputMode` usages exist app-wide (`owner/loyalty/page.tsx:253`, `PaymentDialog.tsx:331`).

**owner item form** (`ItemCoreFields.tsx`): labels/ids templated correctly ✅, price fields `type="number" min="0" step="0.5"` ✅ but no `dir="ltr"` (Arabic RTL number entry renders mirrored; `:81-102`), and status toggle missing `aria-pressed` (see §3). Modifier rows (`ModifierOptionRow.tsx:36-38`) use per-row ids ✅.

**PaymentDialog**: `inputMode="numeric"` on the amount (`PaymentDialog.tsx:331`) ✅.

## 7. Images / fonts / hero

- **next/image `sizes`**: all audited call-sites pass derived box sizes (menu hero `MenuHero.tsx:91`, gallery `GalleryCarousel.tsx:153` with in-code derivation, item grid `MenuItemCard.tsx:146`, showcase `FeaturedShowcase.tsx:240`). Live HTML confirms per-image `sizes` + full `srcSet` (27 imgs on demo menu). ✅ The only weak spot is `OptimizedImage`'s default generic `sizes` (`OptimizedImage.tsx:53`) — no current call-site relies on it (all pass explicit sizes); consider deleting the default to force intentionality.
- **P2 — LCP element stability on /menu/[slug]:** the hero logo (LCP) is an `OptimizedImage` that SSRs as `opacity-0` + shimmer and only becomes visible after hydration + `onLoad` (`OptimizedImage.tsx:91-95` `status === 'loaded' ? 'opacity-100' : 'opacity-0'`; `MenuHero.tsx:79-92` with `priority` + `fetchPriority="high"`). On the QR money-path at 3G, LCP is gated by JS download+hydration, not image bytes (the same pattern r113 fixed for home's hero-phone). Fix: when `priority`/`fetchPriority="high"`, render visible immediately (`status` initial `'loaded'` for priority images, or CSS-only fade via `img:loaded`), keep the JS fade for below-fold images.
- **Fonts**: local-first, `font-display: swap` on every face, unicode-range subsets, exactly ONE preload per family via `preload()` in both layouts (`(public)/layout.tsx:80-81`, `(protected)/layout.tsx:82-83`) — duplicate-preload issue fixed r94, verified not regressed. ✅
- Icon-only buttons: all labeled on audited components (§3). ✅

## 8. Live spot-probes (GET-only) + request-count strategy

| Probe | Result |
|---|---|
| `/terms` | 200, TTFB 0.86s cold → **0.09s warm**, `x-vercel-cache: HIT`, but browser `cache-control: public, max-age=0, must-revalidate` |
| `/privacy` | 200, same profile (0.68s → 0.12s, HIT) |
| `/subscribe` | 200, **no-store**, TTFB 1.57s cold / 0.32s warm; plan list NOT in SSR HTML (client fetch) |
| `/nonexistent-page-xyz` | **404** ✅ themed content ✅ but `<html id="__next_error__">` w/o `lang`/`dir` + homepage default `<title>` |
| `/menu/al-waha-cafe-demo` | 200, ISR ✅ (s-maxage=60, SWR), 295KB HTML, 27 imgs (6 eager/21 lazy), 24 JS chunks |
| `/cart`, `/order-confirmed` (unauth) | 200 + full bundle to anonymous visitors (client-side gate only) — P4 wasted bytes on shared links |

- **P3** `/terms` + `/privacy`: despite `revalidate = 3600` (`terms/page.tsx:8`, `privacy/page.tsx:8`), browsers get `max-age=0, must-revalidate` (live) vs `/` & `/pricing` which serve `max-age=60`. These two are linked from the Footer on **every** page → every navigation pays a revalidation round-trip for ~57KB legal HTML. Fix: add `vercel.json` headers block (`source: '/(terms|privacy)'` → `public, max-age=3600, stale-while-revalidate=86400`) or an explicit `Cache-Control` in a middleware/headers override.
- **P4 — menu 67-request reduction strategy** (current composition: 24 JS + 27 imgs + 2 fonts + fonts.css + app css + 4 icon links + manifest + analytics):
  1. **Icons 4→1**: `<link rel="icon">` ×3 + apple-touch (`(public)/layout.tsx:87-91`) — browsers need favicon.png; 192/512 are PWA-install assets already referenced by manifest.json → move them to the manifest only (−3 requests on every page, home too).
  2. **Virtualize the item list**: 21 `loading="lazy"` item images still cost a request each once scrolled into view. Render first N=12 items + IntersectionObserver "عرض المزيد" (`MenuPageClient.tsx` filtered list) → −10~15 requests on typical scroll, faster initial parse of the 295KB HTML.
  3. **Inline `fonts.css`**: the 2 preloaded `@font-face` rules (Cairo-arabic, Readex) into a `<style>` in both layouts and keep the lazy subsets in fonts.css (−1 render-adjacent request); preloads then match an in-document face.
  4. **Idle-defer PWA/analytics**: `ServiceWorkerInit`, `InstallPrompt`, `Analytics` (`(public)/layout.tsx:160-162,189`) are first-paint irrelevant — mount on `requestIdleCallback` (−3 early requests on every route incl. QR scans).
  5. Sprites don't apply to food photos (large distinct JPEG/WebP); lucide icons are already inline SVG (0 requests) — no sprite needed. Combined realistic target: menu 67→~48, home 52→~44.

---

## Priority register

### P1 (3)
1. **SubscribeForm broken/duplicate ids** — `` `w-w-desc` ``/`` `w-w-phone` `` literal-backtick ids + fixed `sub-wa-wa`; duplicates on multi-menu. `subscribe/SubscribeForm.tsx:365-366,377-378,387-388`. Fix: index-suffixed template literals.
2. **Delivery address: unlabeled + unvalidated** — label not associated (`cart/DeliveryAddressField.tsx:12-23`); empty delivery address silently submitted (`cart/page.tsx:183-185`). Fix: htmlFor/id + aria-required + submit guard with inline error.
3. **404 error shell lacks `lang="ar"`/`dir="rtl"` + wrong title** (live-proven: `<html id="__next_error__">`, title = homepage default) — WCAG 3.1.1 fail on every typo URL; the r111 wrapper div sets dir/lang on an inner div only (`(public)/not-found.tsx:47-50`). Fix: tiny inline script in the themed 404 (`document.documentElement.lang='ar'; dir='rtl'`) + export `metadata` title from `(public)/not-found.tsx` (currently only the catch-all has it — not applied when notFound() short-circuits page metadata).

### P2 (8)
1. CartUndoBanner not announced (no live region) — `cart/CartUndoBanner.tsx:13`.
2. PickupTypeSelector color-only selection (no aria-pressed/group) — `cart/PickupTypeSelector.tsx:49-58`.
3. CartLineItem non-item-scoped stepper/delete labels + unannounced quantity — `cart/CartLineItem.tsx:63-82`.
4. admin/qr loading state not SR-announced (no aria-busy/role=status) + size buttons missing aria-pressed — `admin/qr/page.tsx:106-113,218-232`.
5. ItemCoreFields status toggle no aria-pressed — `owner/item-dialog/ItemCoreFields.tsx:110-126`.
6. Menu hero LCP image opacity-0 until hydration (QR money path) — `ui/OptimizedImage.tsx:91-95` + `menu/MenuHero.tsx:79-92`.
7. /subscribe worst-in-funnel LCP: no-store + full CSR + 2 post-hydrate fetches — `subscribe/page.tsx:1,78,121` (perf; SSR the plan list or at least the header/step chrome).
8. SubscribeForm inline errors not associated (aria-invalid without aria-describedby) — `SubscribeForm.tsx:327,355,358` (Input already supports it: `ui/input.tsx:15,58`).

### P3 (7)
1. /terms + /privacy browser revalidation on every visit (`max-age=0, must-revalidate` live) — add vercel.json headers.
2. premiumToast `role="alert"`+`aria-live="polite"` downgrade for errors — `lib/premium-toast.tsx:76-77`.
3. Lightbox no focus-restore on close — `menu/GalleryCarousel.tsx:76-79`.
4. Owner QR: blank (no skeleton/aria-busy) while settings fetch — `owner/qr/page.tsx:123,139`.
5. Toast close button 32px target (project standard 44px) — `lib/premium-toast.tsx:89`.
6. admin/qr restaurant chips no flex-wrap → clipped/unreachable at 320px — `admin/qr/page.tsx:169`; SelfHostedQR aspect distortion at narrow widths (`SelfHostedQR.tsx:58`).
7. Subscribe phone/whatsapp missing inputMode="tel"/autocomplete — `SubscribeForm.tsx:377-394`.

### P4 (6)
1. JS smooth-scroll not gated by reduced-motion — `CategoryTabs.tsx:100`, `ScrollToTop.tsx:45`.
2. Request-count reduction plan (menu 67→~48, home 52→~44) — §8 strategy (icons 4→1, virtualize items, inline fonts.css, idle-defer SW/analytics).
3. admin/qr download button renders Latin digits `({qrSize}x{qrSize})` vs app-wide Arabic numerals — `admin/qr/page.tsx:268`.
4. Owner desktop nav `<nav>` without aria-label (admin has one) — `owner/layout.tsx:57` vs `admin/layout.tsx:53`.
5. /cart + /order-confirmed serve 200 + full bundle to anonymous users (client-gate only) — wasted bytes on shared links.
6. OrderStepper decorative div with aria-label + never-advancing highlight — `cart/OrderStepper.tsx:10-31`.

### Verified-good (do not re-audit)
Skip-link + main landmark (both layouts) · global focus-visible · Header mobile-menu trap/Esc/restore · Base UI Dialog/Sheet modal semantics · OrderDialog radiogroup/fieldsets/live-total · GalleryCarousel dots/arrows/pause + reduced-motion autoplay opt-out · CategoryTabs filter pattern · StepIndicator aria-current/labels · LoginForm full form semantics · NavLink aria-current + sr-only current-page · fonts (swap, subsets, single preloads) · next/image sizes at every audited call-site · extensive aria-live coverage on admin/owner list pages (20 files) · reduced-motion global CSS + MotionConfig.
