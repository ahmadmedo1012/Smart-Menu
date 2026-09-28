# r121 — Auditor K: Accessibility (web; mobile/ PROTECTED)

**Scope:** NEW angles on top of the verified baselines (r115 axe-core 4.13 zero violations on 9 public pages WCAG A/AA+BP; r113 touch targets ≥44px + 0 infinite animations under reduced-motion; r120 U8 contrast/focus-visibility batch): the **axe-untested owner/admin dashboards** (21 routes), keyboard journeys of every interactive surface, focus management depth, screen-reader announcement logic, landmark/heading structure, and new-target/motion drift since r120. Read-only, code-level (no server running); every claim cites lines actually read. Where Bash output could corrupt bracket sequences (tooling note in A-architecture.md), citations were re-verified with the Read tool.

**Method:** full reads of the dialog/sheet primitives (base-ui 1.6.0 wrappers + node_modules source for modal/returnFocus defaults), cart slide-over, OrderDialog (both breakpoints), ReviewSheet, PaymentDialog, GalleryCarousel, MenuToolbar, CategoryTabs, StickyMenuHeader + landing Header/LayoutHeader, both group layouts + root layout, globals.css (focus-visible/reduced-motion blocks); representative dashboard pages (owner: orders/page + OrdersTable + NewOrdersBar + page.tsx tabs, OwnerCharts, menu, ItemDialog family, settings; admin: users, restaurants + table, subscriptions, orders, settings, audit-logs, page.tsx charts); sweeps for role=radio/role=tablist implementations, aria-label language, outline-only focus indicators, sub-24px targets, infinite animations, live regions, unlabeled inputs, h1-per-page.

**Base-ui foundation (why most dialogs are already solid):** `src/components/ui/dialog.tsx:11` forces `modal` and `sheet.tsx:10` wraps Base UI `Dialog.Root` whose `modal` default is `true` (`node_modules/@base-ui/react/dialog/root/useRenderDialogRoot.js:23,31`) and whose popup sets `returnFocus` (`popup/DialogPopup.js:111`). Every shadcn-style Dialog/Sheet in the repo therefore inherits focus trap + focus return + Escape for free.

---

## Findings

### K-1 [P2] Nested `<main>` landmarks on every owner/admin dashboard page and /order-confirmed (~21 routes)
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/layout.tsx:142` renders `<main id="main-content">` around `{children}` for the WHOLE (protected) group; nested inside it, `src/app/(protected)/owner/layout.tsx:147-154` and `src/app/(protected)/admin/layout.tsx:126-132` each render a second `<main aria-live="polite" aria-label="محتوى الصفحة">`; `src/app/(protected)/order-confirmed/page.tsx:95,133` likewise render `<main className="min-h-screen …">` inside the group main. DOM = main > … > main. The public menu page deliberately avoids this (`src/app/(public)/menu/[slug]/page.tsx:330` comment: "a second `<main>` here triggered…" — fixed there, never applied to the dashboard layouts that got their own `<main>`s).
- Impact: user-facing — screen-reader "jump to main" lands on the outer main (which contains the sidebar + header) and exposes TWO "main" landmarks per page; axe `landmark-no-duplicate-main` (BP) would fail on all 21 dashboard routes — exactly the surface the 9-page axe sweep never covered.
- Fix (minimal, root-cause): in owner/admin layouts change the inner `<main>` to `<div className="…" id="dashboard-content">` (keep the skip link pointing at the outer `#main-content`), and in order-confirmed change `<main>` → `<div>`; OR move the group main out — smallest diff is renaming the inner elements.
- Risk: of fixing — near zero (visual no-op, `main` styling is class-based); of not fixing — SR landmark navigation stays broken on the primary work surfaces.
- Tests required: axe sweep (BP rules) on /owner, /owner/orders, /admin, /admin/users, /order-confirmed before/after; unit/DOM assert exactly one `<main>` per dashboard route.

### K-2 [P2] `aria-live="polite"` wraps the ENTIRE dashboard main — polling re-announces page content
- Type: FACT (code-proven; severity judgment)
- Evidence: `src/app/(protected)/owner/layout.tsx:147-151` and `src/app/(protected)/admin/layout.tsx:126-130` — `<main aria-live="polite" aria-label="محتوى الصفحة">` wraps all page children. The owner orders page polls inside this element on a 5–15s loop (`owner/orders/use-orders-polling.ts` + `LivePollIndicator` cadence), optimistically flips order-card status text (`owner/orders/page.tsx:134-170`), and swaps skeletons → content; every added/changed node inside a live region is a candidate polite announcement in Chrome/NVDA/VoiceOver.
- Impact: user-facing — SR users on their primary screen hear repeated, unpredictable chunks of order cards/KPI text; live-region semantics are meant for small status nodes (the repo already does this correctly elsewhere: `CartUndoBanner.tsx:15-18`, `LivePollIndicator.tsx:34-35`, `LoadingAnnouncer`), and nested live regions inside a live ancestor behave browser-dependently.
- Fix (minimal, root-cause): drop `aria-live` from both `<main>`s (K-1's div-rename removes it in the same edit). If route-change announcement was the goal, add the standard visually-hidden live region that announces the new `h1` on mount (one tiny component mounted once per layout).
- Risk: of fixing — losing the accidental announcement of new order cards (see K-6 — must be fixed together); of not fixing — chatty/unpredictable SR experience on every dashboard.
- Tests required: SR manual pass (NVDA/VoiceOver) on /owner/orders with a seeded new order; assert no re-announcement on time-ago refresh ticks.

### K-3 [P2] Skip link targets `#main-content`, but the page nav is INSIDE the target — the bypass is non-functional
- Type: FACT (code-proven)
- Evidence: both group layouts render the skip link to `#main-content` (`src/app/(public)/layout.tsx:135-140,162` and `src/app/(protected)/layout.tsx:115-120,142`), and the main landmark's first tabbable children are the repeated nav: on public pages every page renders `<Header />` as first child of main (`landing/HomePage.tsx:85`, `pricing/PricingClient.tsx:243`, `cart/page.tsx`, `subscribe/page.tsx`, `order-confirmed/page.tsx:94,131`) and menu pages render `StickyMenuHeader` inside main (`MenuPageClient` → main#main-content); on dashboards the whole sidebar precedes page content inside the outer main. After activating the skip link, the next Tab lands back in the header nav / sidebar links.
- Impact: user-facing — WCAG 2.4.1 (Bypass Blocks): the mechanism exists (axe passes `skip-link`) but bypasses nothing; keyboard users still tab through the full nav on every page.
- Fix (minimal, root-cause): render the Header/brand strip OUTSIDE (before) `<main>` in the group layouts (hoist like ScrollToTop), or point the skip link at a dedicated `id` on the actual content wrapper (e.g. the page-level `div` after the header) — the layout-level fix is the root-cause one.
- Risk: of fixing — layout/CSS churn in two layouts (position:fixed headers unaffected by DOM order, per the existing round84 comment at `(protected)/layout.tsx:139-141`); of not fixing — the site's keyboard story is "first Tab = skip link, second Tab = the nav again".
- Tests required: Playwright keyboard journey: focus skip link → activate → Tab once → assert focus is past the header/sidebar on /, /menu/[slug], /cart, /owner.

### K-4 [P2] Gallery lightbox: focus trap misses the dot buttons, no focus return, no arrow keys
- Type: FACT (code-proven)
- Evidence: `src/components/menu/GalleryCarousel.tsx` — the custom lightbox (`role="dialog" aria-modal="true"`, lines 249-257) hand-rolls a trap whose focusable list is only `[closeRef, lightboxPrevRef, lightboxNextRef]` (lines 87-89); the lightbox dot buttons (lines 304-317) are real `<button>`s inside the dialog but excluded from the trap, so Tab from a dot moves focus OUT of the "modal" into the page behind it (the background is neither `inert` nor `aria-hidden` — it sits under a black/85 overlay, i.e. focus goes to invisible content). `closeLightbox` (lines 76-79) unmounts the dialog without restoring focus to the opener (focus falls to `<body>`). No ArrowLeft/Right image navigation despite prev/next semantics. Contrast with the correct hand-rolled pattern in `ReviewSheet.tsx:81-146` (trap + document-level Escape + explicit focus return) and base-ui's `returnFocus` used by every other dialog.
- Impact: user-facing — keyboard users can escape an `aria-modal` dialog into obscured content (WCAG 2.4.3 + modal contract), and after closing, keyboard position is lost to document start; SR users get no arrow-key pattern the prev/next labels imply.
- Fix (minimal, root-cause): (a) build the trap list from `dialogEl.querySelectorAll('button:not([disabled])')` instead of three refs (covers the dots), (b) save `document.activeElement` on open and `.focus()` it in `closeLightbox`, (c) add ArrowLeft/ArrowRight handlers on the dialog div (RTL: left = next, matching the repo's OrderDialog radiogroup comment at `OrderDialog.tsx:474-477`).
- Risk: of fixing — low (contained component, r120 already touched its animation); of not fixing — the only focus-escaping modal in the repo.
- Tests required: keyboard e2e on the gallery: open lightbox → Tab cycles close→prev→next→dots→close; Escape returns focus to the opener; arrows change `lightboxIdx`.

### K-5 [P2] Admin dashboard charts expose zero data to screen readers (generic "مخطط مساحي" label)
- Type: FACT (code-proven)
- Evidence: `src/components/shared/AreaChart.tsx:60-66` — the SVG hardcodes `role="img" aria-label="مخطط مساحي"` with no data in the name and no per-point hotspots; `src/app/(protected)/admin/page.tsx:246-252,270-275` renders two of these (revenue trend, order volume trend) inside plain `div` cards — no `ChartCard` wrapper, so no `sr-only` summary either (the summary pattern exists at `ChartCard.tsx:85`). The newer owner charts do it right: `SplineAreaChart.tsx:131-132,190-196` and `ColumnChart.tsx:103-104,134-138` (role=img + data aria-label + focusable per-point rects with full value labels), `DoughnutChart.tsx:71-72,93-94` (slice list with values/pcts).
- Impact: user-facing — an SR admin hears "مخطط مساحي, image" twice and cannot access the 30-day revenue/order data at all (the visible numbers elsewhere don't cover the trend shape).
- Fix (minimal, root-cause): pass a data-bearing `ariaLabel` prop into AreaChart (e.g. `اتجاه الإيرادات ٣٠ يومًا: من X إلى Y د.ل`) or render these two charts through the existing `ChartCard` with `summary={…}`; per-point hotspots are the follow-up, not the minimal fix.
- Risk: of fixing — none (additive attribute); of not fixing — admin analytics invisible to SR users.
- Tests required: axe on /admin (label exists), unit test on the summary string builder if extracted.

### K-6 [P3] New-order arrival on /owner/orders is not announced (NewOrdersBar is role="region", not a live region; OrderNotifier only mounts on /owner)
- Type: FACT (code-proven)
- Evidence: `src/components/orders/NewOrdersBar.tsx:103-110` — the fixed bar for newly polled orders uses `role="region" aria-label="طلبات جديدة"` with no `aria-live`; the only SR announcement of new orders is `OrderNotifier.tsx:9-24` (`role="status" aria-live="polite"` toast + chime), and its sole consumer is the dashboard (`owner/page.tsx:138` — `useOrderNotifier(restaurant?.id)`); grep confirms no usage on the orders page. Today the accidental `aria-live` on the whole main (K-2) may mask this on some browsers — unreliable and chatty, not a substitute.
- Impact: user-facing — on the exact screen owners watch for incoming orders, an SR user learns of a new order only via the audio chime (no SR announcement) — this is order-receiving, the product's core promise.
- Fix (minimal, root-cause): add a visually-hidden `role="status"` region on the orders page that announces `acceptedOrdersPhrase`-style copy («وصل طلب جديد») when `newOrderIds` grows (the count-growth effect already exists at `NewOrdersBar.tsx:63-66`), or add `aria-live="polite"` to the bar container itself.
- Risk: of fixing — double announcement if K-2's live main is left in place (fix together); of not fixing — SR owners miss orders on the orders screen.
- Tests required: unit test on the announce-on-growth logic (reuse the r92 plural test pattern); manual SR pass.

### K-7 [P3] Admin orders status filter tabs: active state is color-only (no aria-pressed/aria-current)
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/admin/orders/page.tsx:314-324` — the TABS buttons carry the active state purely via `bg-gradient-to-r from-orange…` classes; no `aria-pressed`, `aria-current`, or `aria-selected`. The owner twin already does it right: `owner/orders/OrdersFilters.tsx:144` (`aria-pressed={filter === tab.value}`). This is the r119 "aria-pressed on color-only toggles" class of fix, missed on this page.
- Impact: user-facing — SR users cannot tell which status filter is active (screen announces 5 identical buttons).
- Fix (minimal, root-cause): copy the owner pattern — `aria-pressed={filter === tab.value}` on the button (one line).
- Risk: none.
- Tests required: none beyond a snapshot/DOM assert.

### K-8 [P3] admin/settings tablist: half-implemented ARIA tabs (no arrow keys, no aria-controls, no tabpanel, no roving tabindex)
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/admin/settings/page.tsx:175-194` — `role="tablist"` + `role="tab"` + `aria-selected` only; no `onKeyDown` (grep: 0 in file), no `aria-controls`/panel ids, all tabs remain tabbable. SR announces "tab, 1 of 3" and users expect ArrowLeft/Right per the APG. The repo already contains the full reference implementation: `owner/page.tsx:245-330` (ids + `aria-controls` + `tabIndex` roving + keydown + `role="tabpanel"` panels).
- Impact: user-facing — broken tabs contract on a settings page (operable via Tab+Enter, so not a hard block, but semantics promise what isn't implemented — WCAG 4.1.2 spirit).
- Fix (minimal, root-cause): port the owner/page.tsx tab block (it's a copy-paste of the same UI shape) or downgrade to the CategoryTabs filter-button pattern (`role="group"` + `aria-pressed`, `CategoryTabs.tsx:104-128`) — the downgrade is the smaller diff.
- Risk: of fixing — low; of not fixing — inconsistent with the owner dashboard's correct tabs.
- Tests required: keyboard e2e (arrows move, Tab exits to panel).

### K-9 [P3] OwnerCharts date-range "radiogroup": role=radio without arrow keys or roving tabindex
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/owner/OwnerCharts.tsx:77-107` — `role="radiogroup" aria-label="نطاق التاريخ"` with `role="radio" aria-checked` buttons, but no `onKeyDown` (grep over file: 0) and no `tabIndex` roving — arrows do nothing and every "radio" is individually tabbable. SR users hear "radio" and try arrow navigation (APG radio contract). The in-repo correct pattern is `OrderDialog.tsx:472-510` (roving tabindex + ArrowLeft/Right/Up/Down + RTL-commented direction, focus moved via `data-order-type` lookup).
- Impact: user-facing — misleading role semantics on the stats page's range picker; operable via Tab, so polish-grade.
- Fix (minimal, root-cause): either add the OrderDialog roving-tabindex keydown block, or drop the radio roles for `aria-pressed` toggles in a named group (same downgrade as K-8).
- Risk: none.
- Tests required: keyboard e2e if radio roles are kept.

### K-10 [P3] premiumToast fires role="alert" (assertive) for every toast kind, including routine success confirmations
- Type: FACT (code-proven; fix is a judgment call)
- Evidence: `src/lib/premium-toast.tsx:73-76` — every `toast.custom` renders `role="alert"` (r119-S5-P2 removed the contradicting `aria-live="polite"`, correctly resolving the contradiction but choosing assertive for all kinds). Callers use it for trivial confirmations: `owner/orders/page.tsx:154` («تم تغيير الحالة إلى …»), `NewOrdersBar.tsx:86` («تم قبول …»), copy/save toasts across dashboards (`admin/restaurants/page.tsx:100` etc.), alongside genuine errors (`page.tsx:161` rollback error).
- Impact: user-facing — assertive announcements interrupt the SR user mid-task for non-urgent confirmations; APG guidance: alert = "important, time-sensitive"; success/info should be `role="status"` (polite). The r119 fix direction was right for error toasts; the blanket application over-announces.
- Fix (minimal, root-cause): `role={icon === 'error' || icon === 'trash' ? 'alert' : 'status'}` at the single render point (one line, keeps the unambiguous-role principle from r119).
- Risk: of fixing — behavior-only change for SR, no visual impact; of not fixing — SR users interrupted on every save/copy.
- Tests required: extend `tests/unit/premium-toast.test.ts` to pin the role per icon kind.

### K-11 [P3] MiniSparkline carries the only English aria-labels in the app
- Type: FACT (code-proven)
- Evidence: `src/components/shared/MiniSparkline.tsx:41` — `aria-label={isUp ? "Trending up" : "Trending down"}` (rendered on owner stats KPI cards via `KpiCard.tsx:118`). Repo-wide sweep for Latin-script aria-labels/title found no other English leftovers (all other 100+ labels are Arabic).
- Impact: user-facing — an Arabic-first SR experience suddenly announces English on the owner stats page.
- Fix (minimal, root-cause): `اتجاه صاعد` / `اتجاه هابط` (or make it aria-hidden + let the KPI number carry the meaning).
- Risk: none.
- Tests required: none (string swap).

### K-12 [P3] Lightbox pagination dots ≈22×26px hit area — the r115 24px fix covered the carousel dots only
- Type: FACT (code-proven)
- Evidence: `src/components/menu/GalleryCarousel.tsx:306-315` — lightbox dots are `h-1.5 w-1.5` (6px) with `after:-inset-x-2 after:-inset-y-2.5` padding ≈ 22×26px inactive hit area. The r115-F121 fix (comment at lines 207-210) upgraded the CAROUSEL dots to `h-6 w-6` (line 218) but the lightbox's separate dot row kept the pre-fix pattern.
- Impact: user-facing — WCAG 2.5.8 (AA, 24×24 floor): inactive lightbox dots fall ~2px short; minor but the exact rule r115 was enforcing.
- Fix (minimal, root-cause): apply the same `flex h-6 w-6 items-center justify-center` wrapper + inner visual dot pattern from lines 211-229.
- Risk: none.
- Tests required: target-size check in the existing Lighthouse/axe-adjacent sweep.

---

## Solid areas (verified, no action)

1. **Dialog/sheet focus management** — base-ui 1.6.0 `modal=true` + `returnFocus` defaults (verified in node_modules source) give CartSlideOver, OrderDialog (desktop + mobile bottom-sheet), PaymentDialog, admin/owner destructive confirms, and both dashboard mobile-nav sheets a real focus trap, focus return, and Escape. Destructive confirms are proper dialogs with Title+Description (`admin/restaurants/page.tsx:207-218`, `admin/users/page.tsx:324-355`); bulk delete uses native `confirm()` (accessible by construction).
2. **ReviewSheet** — the best hand-rolled dialog in the repo: document-level Escape, Tab trap with body-focus re-entry guard, explicit focus return to opener with the r119-corrected cleanup (`ReviewSheet.tsx:81-146`), `role=alert` submit errors (line 319), aria-live error/loading regions (lines 353).
3. **OrderDialog internals** — fieldset+aria-label modifier groups, `aria-pressed` chips, required-group blocker as `role=alert` (line 387), aria-live price total (line 556), sr-only DialogTitle (line 224), and a textbook RTL-correct roving-tabindex radiogroup with arrow keys (lines 472-510).
4. **MenuToolbar search** — full APG combobox: `aria-expanded/controls/activedescendant`, ArrowUp/Down walk, Enter picks, Escape collapses, scroll-into-view without focus theft (lines 141-173, 208-213); the sort dropdown is a real `menu`/`menuitemradio` with arrow-key roving focus and Escape (lines 294-355).
5. **CategoryTabs** — correct documented decision to use a named group + `aria-pressed` filter buttons instead of fake tabs, with an sr-only hint (`CategoryTabs.tsx:104-128`).
6. **Owner dashboard tabs** — full APG tablist: ids, `aria-controls`, roving tabindex, keydown, `role=tabpanel` panels with `tabIndex=0` (`owner/page.tsx:245-330,374-377`) — the model K-8 should copy.
7. **Focus visibility baseline** — global `:focus-visible` ring (`globals.css:905-910`), stronger 3px ring in high-contrast mode (`globals.css:507-510`); icon-only buttons across dashboards carry specific Arabic aria-labels with per-row names (حذف/تعديل X) at 44px (`size-11`) targets; Button `icon` size is 48px (`button.tsx:39`); pagination buttons 36px with `aria-current="page"`. Only weak spot: a handful of dashboard filter inputs rely on a 1px border-color change instead of the standard ring (`admin/orders/page.tsx:303-307`, `OrdersFilters.tsx:69`) — noted as P4-grade polish, not filed.
8. **Motion** — `MotionConfig reducedMotion="user"` (`MotionProvider.tsx:15`) + two global reduced-motion blocks forcing `animation-iteration-count: 1 !important` (`globals.css:721-729,1190-1203`); every infinite animation found (orb-float `:1092-1093`, shimmer `:608-665`, aurora `:992`, breathe/float `:1077-1093`) is gated. KpiCard count-up skips straight to the final value under reduced motion (`KpiCard.tsx:32-38`). No NEW infinite animations since r113.
9. **Live-region discipline outside dashboards** — CartUndoBanner `role=status` (`CartUndoBanner.tsx:15-18`), ConnectivityBanner `role=status`, LoadingAnnouncer `role=status`, LivePollIndicator `role=status`, OrderNotifier toast `role=status` — all correct.
10. **Forms** — label/id wiring verified across admin settings (`htmlFor="rs-*"`), owner item dialog (r119-B3 batch holds: `ItemCoreFields` 6 labels, `ModifierOptionRow` per-option indexed ids), subscribe wizard (labels + `aria-invalid` + per-field Arabic errors + toast on invalid submit), PaymentDialog (`useId` labels), LoginForm (`htmlFor` + show-password toggle label). Gap (P4-grade, not filed): error `<p>`s are not linked via `aria-describedby` — errors ARE announced at submit via toasts, and `aria-invalid` marks the fields.
11. **Status chips** — order status badges are icon+text (`OrdersTable.tsx:169-172`), subscription statuses are text Badges (`admin/subscriptions/page.tsx:255`), chart legend toggles carry `aria-pressed` — no color-only state found outside K-7.
12. **Heading/landmark structure per page** — one h1 per page type verified (menu via MenuHero:105, home HeroSection:109, pricing:254, subscribe:363, owner sr-only h1:200, admin:183, orders/users/restaurants pages); item dialogs use DialogTitle (h2-equivalent); tables: `admin/audit-logs` uses a real `<table>` with `<th>` headers (implicit column scope; explicit `scope="col"` would be polish). One structural note folded into K-1; the LayoutHeader's static `<h1>لوحة التحكم</h1>` (`LayoutHeader.tsx:31`) duplicates every page's real h1 on desktop — fixing is a one-line `<h1>`→`<span>` (P4-grade, noted here rather than filed; fix alongside K-1).

## Ledger / prior-round verifications (this round's domain)

- **r120 U8 batch — ALL LEDGER-VERIFIED at HEAD:** ScrollToTop `invisible` when hidden (`ScrollToTop.tsx:48-51`); FloatingWhatsApp deferred 3s mount (`FloatingWhatsApp.tsx:9-19`); Toaster `dir="rtl"` in both layouts (`(protected)/layout.tsx:155`, `(public)/layout.tsx` Toaster); combobox `aria-label` (`MenuToolbar.tsx:197`); WhatsApp CTA dark-green-on-green 6.15:1 classes (`OrderDialog.tsx:570` `text-[#0b3d2e]` on `bg-whatsapp`).
- **r113 motion/targets — LEDGER-VERIFIED:** reduced-motion zero-infinite holds (see Solid #8); touch targets ≥24px hold everywhere except K-12's lightbox dots.
- **r119 fixes holding:** toast role contradiction resolved (`premium-toast.tsx:76-80` — follow-up K-10); CartUndoBanner live region (`CartUndoBanner.tsx:13-18`); aria-pressed on chart legends (`DoughnutChart.tsx:129`, `SplineAreaChart.tsx:107`, `ColumnChart.tsx:79`); r119-B3 label batch verified (Solid #10); r119-S5-P1-3 root layout gives every render path `<html lang="ar" dir="rtl">` (`src/app/layout.tsx:23`).

## Cross-references (not double-counted)

- B (Next.js) independently found the dashboard SSR null-shell until /me (`owner/admin layouts render null` — same layouts as K-1/K-2; a11y impact is focus/landmark churn on auth-gated loads, noted there, not filed here).
- The r120-deferred "owner stats empty-state polish" (ledger) is adjacent to K-5 but distinct (data exposure vs. visual polish).
