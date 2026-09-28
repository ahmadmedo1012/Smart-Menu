# r121 — Auditor J: Responsive / RTL (READ-ONLY audit)

**Scope:** `src/components/**` + `src/app/**` (web only; `mobile/` PROTECTED). Breakpoint
discipline (fixed widths, tables, grids at 320–430px and 768–1024px), logical-vs-physical
properties, mixed-direction content (phones/URLs/emails/prices/dates/order numbers),
truncation/wrapping (line-clamp, min-w-0, whitespace-nowrap), sticky/fixed/z-index/viewport
units, print page. Prior-round baselines honored: r110 RTL rotation, r113 zero-overflow
320/375/390 (landing), r115 zoom/forced-colors, r120 35-file batch — re-reporting known
ledger items is avoided; they are re-verified where in-domain (§Ledger).

**HEAD audited:** `74ef578f` (r120 final = production).
**Method:** file reads + greps only (no build, no browser — viewport-math findings are marked
arithmetic-FACT / visual effect UNVERIFIED where applicable).

---

## Domain sweep (what was measured)

- **Fixed widths:** only `w-[75%] max-w-[540px] md:w-[55%]` (FeaturedShowcase:218) and
  `max-w-*` caps — no `w-[NNNpx]` that can overflow 320px. `min-w-[600px]` exists only on the
  audit-logs table, inside `overflow-x-auto` (audit-logs:275-276). All other admin/owner lists
  are card-based (orders/users/restaurants/subscriptions) — they stack, not clip.
- **Grids:** every multi-col grid collapses (`grid-cols-1/2` base → `sm:/md:/lg:`), except
  deliberate 2-col field pairs in dialogs (fields ~113px at 320px — inputs scroll internally).
  The r120 menu grid `sm:2 → lg:3 → xl:4` with container `max-w-4xl xl:max-w-6xl`
  (MenuClientSection.tsx:87, MenuPageClient.tsx:410/460) keeps card width ~276px at both
  lg and xl — no dead band or column jump between 1024–1920.
- **Physical-vs-logical classes:** grep for `ml-/mr-/pl-/pr-/space-x-/border-l-/border-r-/
  rounded-l-/rounded-r-/left-*/right-*` (positional) → **zero matches in `src/`**. The only
  `left-1/2 -translate-x-1/2` usages are symmetric centering (dialog/carousel dots), which is
  direction-safe; asymmetric RTL centering correctly uses `start-1/2 + rtl:translate-x-1/2`
  (ShareAfterOrder.tsx:169, NewOrdersBar.tsx:105). `text-left` appears 17× — **always** on
  `dir="ltr"` inputs/spans (verified per-file: admin settings, telegram config, restaurant
  form, subscribe, payment dialog, cart, order dialog) — the correct pattern for LTR content.
- **Directional icons:** `rtl:rotate-180` (HeroSection:123, FinalCTASection:68,
  FeaturedRestaurantsSection:236 + mirrored hover nudge, AdminSidebar:108) and
  `rtl:-scale-x-100` (GalleryCarousel:174/185/292/301, FeaturedShowcase:314/322) cover every
  forward-pointing icon; keyboard arrows are mirrored to match (FeaturedShowcase:110-117,
  OrderDialog:467-482). Pagination and carousel prev/next are directionally correct
  everywhere (prev=ChevronRight, next=ChevronLeft: users:282/316, RestaurantTable:173/191,
  subscriptions:366/393, ClientsSection:160/172). **Exceptions → J-2.**
- **Mixed-direction content:** `format.ts` is a single source of truth — Western digits only
  (`toArabicNumber`), Arabic month names, smart `formatPrice` (r120); zero
  `toLocaleDateString` leftovers (grep: only migration comments remain). Order numbers are
  `<bdi dir="ltr">`-wrapped on 4 of 5 list/detail surfaces (→ J-6). Phone/URL/email/token
  inputs are `dir="ltr"` + `text-left` (+`font-mono`) throughout. Exceptions → J-4, J-5.
- **Truncation:** `line-clamp` only on genuine clamps (card name/desc, modifiers summary);
  `truncate` always inside `overflow:hidden` (flex min-width:auto resolves to 0 — the classic
  flex-overflow bug is absent: `flex-1 min-w-0` in StickyMenuHeader:104, CategoriesList:173,
  MenuToolbar:279, CartSlideOver:150). `whitespace-nowrap` only on table cells (inside
  `overflow-x-auto`), badges, chart tooltips, and price blocks — all bounded.
- **Viewport units:** base dialog `max-h-[90dvh]`, `min-h-dvh` on login/owner-layout/menu
  page, `100dvh` on not-found — with two `vh` outliers (→ J-7).

---

## Findings

### J-1 [P1] Floating-control z-band (60/61/63) stacks ABOVE the modal band (40/50) — WhatsApp bubble + scroll button + cart FAB render on top of open dialogs/sheets and overlap money-path CTAs
- Type: FACT (code-proven stacking; overlap geometry arithmetic)
- Evidence:
  - `src/components/shared/FloatingWhatsApp.tsx:26` — `fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] end-4 sm:end-6 z-[60]`; mounted on EVERY page of both trees: `src/app/(public)/layout.tsx:163-168` and `src/app/(protected)/layout.tsx:143-148`. No hide-when-modal logic (only a 3s deferred mount, :13-19).
  - `src/components/shared/ScrollToTop.tsx:47` — `fixed bottom-[...] start-4 z-[61]`; visibility is scroll-driven only (:33-40), so it stays visible over modals whenever the page behind was scrolled >400px.
  - `src/components/menu/CartSlideOver.tsx:67` — cart FAB `fixed bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] end-4 z-[63]`, rendered whenever the cart has items — including while its own sheet is open.
  - Modal band: `src/components/ui/dialog.tsx:34` (overlay z-40) / `:60` (content z-50); `src/components/ui/sheet.tsx:31` (overlay z-40) / `:58` (content z-50); `src/components/menu/ReviewSheet.tsx:190-201` (overlay z-40, bottom sheet z-50); landing mobile menu `src/components/layout/Header.tsx:113` (backdrop z-40) / `:127` (panel z-50).
  - All are position:fixed in the root stacking context (MotionProvider applies no transform — comment at (public)/layout.tsx:159-161); 60/61/63 > 40/50 → the floating band paints above every overlay AND panel.
  - Worst case (mobile money path): on mobile the OrderDialog IS a bottom sheet (`OrderDialog.tsx:606-615`, `side="bottom"`, z-50) whose primary CTA «أضف إلى السلة» is `w-full h-12` at the content bottom (`:568-584`, inside `p-5`). At 375px: sheet bottom = viewport bottom; CTA spans ~20–68px from bottom; the WhatsApp bubble spans 16–72px from bottom × 56px at the end edge → it covers a ~56×48px corner of the add-to-cart button, and taps there open WhatsApp support instead. Same geometry over the CartSlideOver footer CTA «إتمام الطلب» (`CartSlideOver.tsx:206-221`), the cart ReviewDialog action row (`ReviewDialog.tsx:159-174`), and the ReviewSheet list (`ReviewSheet.tsx:201` — bottom-anchored, full-width). The cart FAB (z-63, 9.5rem up the end edge) floats over the open sheet's item rows and the OrderDialog's quantity/type controls.
- Impact: user-facing — modal illusion broken on every dialog/sheet open (buttons visibly floating above the dim + panel); partial tap-hijack of primary CTAs (add-to-cart, checkout) on small/short viewports (worst in landscape, 360px height). Prior QA passes (r110–r120 item→cart→order at 375px) tapped button centers and missed the corner overlap — consistent with this surviving to HEAD.
- Fix (minimal, root-cause): pick ONE — (a) drop the floating band below the modal band (`z-30` for the three controls; lightbox z-100/banner z-90 unaffected), or (b) keep z and hide the controls while any modal is open (a shared `data-modal-open` on `<html>` + `body:data-[modal-open] &` CSS is ~3 lines given dialogs already manage scroll-lock).
- Risk: of fixing — (a) risks the buttons sitting under a future full-height sticky element; low. of not fixing — continued tap-hijack on the core order flow; visual polish reads as broken layering.
- Tests required: gstack at 375×667 + 740×360: open OrderDialog/CartSlideOver/ReviewSheet/PaymentDialog → assert floating controls are either behind the overlay or hidden; tap the CTA end-corner → must hit the CTA.

### J-2 [P2] Back-affordance arrow direction is inconsistent: 4 surfaces point LEFT («عودة» in RTL should point right — the codebase's own documented convention)
- Type: FACT
- Evidence: The codebase documents and uses ArrowRight/ChevronRight for «عودة»: `print/page.tsx:150` («سهم العودة في RTL يشير يميناً»), `BackButton.tsx:20/29`, `LoginForm.tsx:132` («العودة للرئيسية»), `admin/orders/[id]/page.tsx:98`, `owner/loyalty/page.tsx:407`, `owner/qr/page.tsx:108`, `owner/reviews/page.tsx:101`; the subscribe wizard gets both directions right (`SubscribeForm.tsx:577` رجوع=ArrowRight, `:590` التالي=ArrowLeft). Violations (leftward arrows on back affordances, i.e. pointing "forward" in RTL):
  - `src/app/(protected)/cart/CartPageHeader.tsx:16-22` — «العودة إلى القائمة» link with `MotionArrowLeft`.
  - `src/app/(protected)/cart/CartEmptyState.tsx:29-34` — «العودة إلى القائمة» primary CTA with `MotionArrowLeft`.
  - `src/app/(protected)/order-confirmed/page.tsx:111-119` («العودة للرئيسية») and `:167-172` («العودة إلى القائمة») — `MotionArrowLeft`.
  - `src/app/(protected)/owner/orders/[id]/page.tsx:130-135` — back-to-orders icon button with `MotionChevronLeft`.
- Impact: user-facing — directional semantics inverted on the cart/checkout cluster (the flow right before sending an order): the arrow points deeper into the flow instead of back; same app shows both conventions on adjacent screens.
- Fix (minimal): swap to `MotionArrowRight`/`MotionChevronRight` on the 5 call sites (one-line each; the icons already exist in motion-icons.tsx:74-79).
- Risk: trivial; of not fixing — persistent RTL wayfinding confusion on the checkout path.
- Tests required: none beyond visual (optionally a grep-pin test that no `MotionArrowLeft` sits inside a «عودة»-labeled element).

### J-3 [P2] Owner menu item rows: fixed trailing controls ≈330–340px leave ~0px for the item name at ≤390px (name collapses to an unreadable sliver; no overflow — which is why prior "no-overflow" checks passed)
- Type: FACT (arithmetic from code); visual effect UNVERIFIED (no browser run allowed this session)
- Evidence: `src/app/(protected)/owner/menu/CategoriesList.tsx:154-256` — item row `flex items-center gap-3 px-5 py-3` children: grip icon 16px (`:159`, `opacity-0` on touch but still occupies layout), 40px thumb (`:160-172`), name block `flex-1 min-w-0` (`:173-203`), price block `shrink-0 whitespace-nowrap` ~45–60px (`:204-219`), Switch sm 24px + `gap-2` + `w-14` (56px) status label (`:220-236`), two 40px icon buttons + 2px gap (`:237-256`); plus 5×12px row gaps. Fixed total ≈ 330–340px. Available width: 390 − 32 (`main p-4`, owner/layout.tsx:150) − 40 (`px-5`) = **318px** → deficit ≥20px. `flex-1 min-w-0` absorbs it: the **item name column collapses to ~0px** (wraps one word per line in a sliver) and the `w-14` status label shrinks/wraps. At 430px the name gets ~40px; the squeeze zone is the whole 320–430px band. Because `min-w-0` prevents horizontal overflow, both r120-U7's "mobile-390 no overflow" and r113's checks hold — the failure mode is invisible-name, not scrollbars.
- Impact: user-facing — owners (mobile-first market) cannot read item names in their own menu manager on phones; the row's primary content is sacrificed to controls that are all reachable elsewhere (edit dialog).
- Fix (minimal, root-cause): make the trailing cluster adaptive — hide the `w-14` status word below `sm` (`hidden sm:inline` — the Switch already communicates state, `aria-label` carries it for AT), and drop the grip below `md` (`hidden md:block` — drag-reorder is a pointer-affordance anyway). That returns ~72px to the name at 390px. No JS.
- Risk: of fixing — low (pure class additions); of not fixing — core management surface unusable on common phones.
- Tests required: gstack at 375/390: expand a category → item name visible on one line with ellipsis-capable width.

### J-4 [P3] PaymentDialog bank rows force the ARABIC bank name into a `dir="ltr" text-left truncate` span (same treatment as IBAN), and long account/IBAN values ellipsize
- Type: FACT
- Evidence: `src/components/shared/PaymentDialog.tsx:352-371` — all three rows (المصرف / رقم الحساب / IBAN) render through one template: `<span className="font-mono text-sm font-bold text-left truncate" dir="ltr">{row.value}</span>`. `BANK_NAME` comes from config (`bank_transfer_bank_name`, `:99`) — an Arabic value (e.g. «مصرف الجمهورية») renders left-aligned inside an LTR-isolated, `font-mono` span in an otherwise RTL card; a mixed-script value would reorder segments. The money-critical `BANK_ACCOUNT`/`BANK_IBAN` (LY IBAN = 25 chars) also `truncate` inside a row shared with label + copy button (~220px at 375px) — digits can be ellipsized (mitigated by the copy button at `:362-369`, but a user read-verifying the number before transferring sees `…`).
- Impact: user-facing (subscribe money path) — cosmetic misalignment for Arabic bank names; partial occlusion of transfer-critical digits.
- Fix (minimal): `dir="auto"` + `text-start` on the span (per-row LTR stays correct for digits/IBAN since they're Latin runs; Arabic names get RTL alignment), or split the template: name row `dir="auto"`, number rows keep `dir="ltr"`.
- Risk: low. Tests: unit snapshot of the three rows with Arabic name + 25-char IBAN at 375px.

### J-5 [P3] MenuHero WhatsApp pill renders the raw stored number without `dir="ltr"` while the adjacent phone pill has it
- Type: FACT
- Evidence: `src/components/menu/MenuHero.tsx:146-156` — phone pill `<a href="tel:…" dir="ltr">` ✓; `:160-177` — WhatsApp pill renders `{restaurant.whatsapp}` with no `dir`. Local «09…» values render fine (single digit run), but a stored «+218912345678» places the leading «+» on the far side of the run (leading neutral resolves to paragraph direction), displaying the number with a detached sign; inconsistent with the sibling pill one gap away.
- Impact: user-facing, cosmetic; hits restaurants whose stored number is in international format.
- Fix (minimal): add `dir="ltr"` to the WhatsApp `<a>` (`:163`).
- Risk: none. Tests: visual with a «+218…» value.

### J-6 [P3] OwnerOrdersList renders order numbers without the `<bdi dir="ltr">` wrapper used on every sibling surface
- Type: FACT
- Evidence: `src/app/(protected)/owner/OwnerOrdersList.tsx:44` — `<p className="text-sm font-medium">{order.orderNo}</p>` (owner dashboard recent-orders). All four sibling surfaces wrap: `admin/orders/page.tsx:354`, `owner/orders/OrdersTable.tsx:168`, `admin/orders/[id]/page.tsx:101`, `owner/orders/[id]/page.tsx:137` (`<bdi dir="ltr">#{order.orderNo}</bdi>`).
- Impact: none today — `ORD-XXXX` is a pure Latin run and survives bidi — but the isolation wrapper is the house pattern (added round94 for exactly this); any future prefix/suffix/punctuation or an Arabic-segmented order number would scramble here first.
- Fix (minimal): wrap in `<bdi dir="ltr">` (one line).
- Risk: none. Tests: none.

### J-7 [P3] Viewport-height outliers: ReviewSheet and RestaurantFormDialog use `85vh` while the design system standardized on `dvh` (iOS Safari URL-bar trap)
- Type: FACT
- Evidence: `src/components/menu/ReviewSheet.tsx:201` — bottom-anchored sheet `fixed bottom-0 inset-x-0 z-50 max-h-[85vh]` (vh = LARGE viewport on iOS; a bottom sheet sized by large-vh can push its handle/header under the visible top when the URL bar is shown). `src/app/(protected)/admin/restaurants/RestaurantFormDialog.tsx:167` — `max-h-[85vh]` override (via cn/twMerge) replaces the base dialog's `max-h-[90dvh]` (`ui/dialog.tsx:60`). The system otherwise uses dynamic units: `OrderDialog.tsx:610/619` (90dvh), `LoginForm.tsx:117` (`min-h-dvh`), `owner/layout.tsx:123` (`min-h-dvh`), `not-found.tsx:60` (100dvh). Secondary: full-viewport centering still on `min-h-screen` (100vh) on `order-confirmed/page.tsx:95,133,192`, `subscribe/page.tsx:347,354,452`, `global-error.tsx:34` — centered content can sit partially in the URL-bar region on iOS.
- Impact: user-facing on iOS Safari only; sheet header/close and the dialog's top rows partially obscured until scroll.
- Fix (minimal): `max-h-[85dvh]` on both outliers; optional sweep of the `min-h-screen` centerers to `min-h-dvh` (login already proves the pattern).
- Risk: none (dvh support = the same browsers already targeted by the base dialog). Tests: iOS Safari manual spot-check.

### J-8 [P3] Print page: an item's name/price row can split from its description across a page break; oversized categories force a near-empty preceding page
- Type: FACT
- Evidence: `src/app/(public)/menu/[slug]/print/page.tsx:105` — only `.cat { page-break-inside: avoid }`; `:171-194` — each item renders as a bare wrapper `<div>` (`.item` flex row at `:173` + optional `.desc` at `:191-193`) with no `break-inside: avoid`, so a page boundary can fall between a dish name and its description. `.cat`-level `avoid` on a category taller than one page also forces a page break BEFORE it (browser must try), leaving a mostly blank page after short categories (inherent to the pattern, but avoidable per-item).
- Impact: user-facing (printed menus are a shipped feature — QR on paper, r120): occasional orphaned descriptions; wasted paper on long menus.
- Fix (minimal): add `page-break-inside: avoid` to the per-item wrapper (`:172`), keep `.cat` avoid for short categories only if desired.
- Risk: none. Tests: print preview of the demo menu (5 categories, 25 items).

### J-9 [P3] ScrollToTop's ProgressBar shares `z-[90]` with ConnectivityBanner — two unrelated full-width top strips in one band (registration, not a defect today)
- Type: SUGGESTION (judgment call)
- Evidence: `src/components/shared/ScrollToTop.tsx:21` (`fixed top-0 inset-x-0 z-[90] h-0.5`) and `ConnectivityBanner.tsx:68` (`fixed inset-x-0 top-0 z-[90]` — whose comment calls z-[90] "the overlay band of the z-index registry"). The 2px progress bar renders UNDER/OVER the banner depending on DOM order (banner is after ScrollToTop in both layouts → banner wins where they overlap); a 2px bar behind a ~40px offline banner is invisible exactly when navigation also stalls offline.
- Impact: cosmetic/informational — progress feedback lost under the offline banner (rare co-occurrence).
- Fix (minimal): document the band (progress = 90a, banner = 90b → give the bar `z-[91]`).
- Risk: none. Tests: none.

---

## Ledger / prior-round verifications (in-domain)

1. **r110 RTL rotation correctness — LEDGER-VERIFIED.** `rtl:rotate-180` (HeroSection:123,
   FinalCTASection:68, FeaturedRestaurantsSection:236 + mirrored `rtl:group-hover/link:-translate-x-1`,
   AdminSidebar:108) and `rtl:-scale-x-100` (GalleryCarousel ×4, FeaturedShowcase ×2) cover all
   forward-directional icons; r115's VLM false-positive («arrow backwards») was indeed correct code.
2. **r113 zero-overflow 320/375/390 — HOLDS, with a caveat that becomes J-3.** Overflow guards are
   systemic (`overflow-x-clip` on HomePage:84, menu page:333, owner layout:145, admin orders:227;
   `min-w-0`+`truncate`/`line-clamp` on every dynamic flex child). J-3 shows why "no overflow" can
   coexist with an unreadable column — `min-w-0` converts overflow into collapse.
3. **r115 400% zoom / forced-colors — spot-check of NEW r120 components only (as instructed):**
   `animate-rise-in` is transform-only (`globals.css:1070-1071`) — no opacity-gated reflow hazard;
   `xl:grid-cols-4` + container widening keeps card width ≈ constant across lg/xl (no new
   reflow cliff); print QR `<img>` carries explicit `width/height` (print/page.tsx:203-209). Clean.
4. **r120 print fixes — VERIFIED HOLDING:** single «د.ل» per price (print/page.tsx:179-188 uses one
   `formatPrice` per price — the double-currency bug is gone); QR present with `pageBreakInside:
   'avoid'` wrapper.
5. **r120 dialog timing / cart slide-over blur / hero rise-in — code-consistent** with the r120
   ledger claims (300ms transitions, `backdrop-blur-md` on the sheet, transform-only hero).
   Known-open deferred items (StickyMenuHeader SSR mount, subscribe SSR shell, orb-float gating,
   Arabic display line-heights, alpha-muted sweep) are NOT re-reported here — ledger stands.

## Solid areas (evidence-backed)

1. **Logical-properties migration is complete**: zero physical `ml-/mr-/pl-/pr-/space-x-/
   border-l-/border-r-/rounded-l-/` and zero positional `left-*/right-*` classes in `src/`
   (grep-proven); `ms/me/ps/pe/start/end/text-start/rounded-s-full/first:rounded-s-full` used
   everywhere, including tricky spots (`-end-2.5` cart badge, `me-10` timeline connectors,
   `ps-10 pe-12` icon inputs, `origin-left rtl:origin-right` progress bar).
2. **LTR-in-RTL input discipline**: all 17 `text-left` sites are `dir="ltr"` inputs (phones,
   URLs, emails, slugs, tokens, IBAN, usernames) — verified file-by-file; `font-mono` on digit
   fields; `dir="auto"` on free-text notes (CustomerInfoCard:28).
3. **Bidi isolation of order numbers** on 4/5 surfaces (`<bdi dir="ltr">`), `dir="ltr"` on
   audit-log IPs (audit-logs:312-317) and on the JSON `<pre>` with `break-words` (:348-353).
4. **Table component**: every `<Table>` is auto-wrapped in `overflow-x-auto` with `text-start`
   heads and `whitespace-nowrap` cells (ui/table.tsx:11,73,86); the one wide table
   (`min-w-[600px]`, audit-logs:276) scrolls, and its IP/date columns progressively hide
   (`hidden md:table-cell` / `hidden sm:table-cell`).
5. **Number/date/price canon**: `format.ts` — Western digits everywhere, Arabic month names,
   one `formatPrice` (r120 smart trim); no `toLocaleDateString`/`toLocaleString` rendering paths
   remain (r93-W2a/round90-F4 migrations complete, comments only).
6. **Sticky/fixed layering below the modal band is coherent**: StickyMenuHeader z-30 →
   CategoryTabs `md:sticky md:top-14 md:z-20`; sort dropdown overlay z-40/panel z-50 above the
   header; ConnectivityBanner z-90; gallery lightbox z-100; skip-links `focus:z-[100]`;
   safe-area insets on all bottom-fixed controls; `NewOrdersBar` reserves layout space
   (`h-20` spacer, NewOrdersBar.tsx:99-102) so the fixed bar never hides the last card.
7. **RTL-aware primitives**: sheet sides use start/end with explicit `rtl:` translate-x
   overrides + explanatory comment (sheet.tsx:58-64); switch thumb carries `rtl:-translate-x-…`
   variants (switch.tsx:26); OrderDialog's mobile path is a bottom sheet, desktop a centered
   dialog (OrderDialog.tsx:606-625).
8. **Menu grid breakpoints** (r120): 1 → 2(sm) → 3(lg) → 4(xl) with the container stepping
   4xl→6xl at the same xl point — column width ≈276px on both sides of 1280px; no 768–1024
   anomaly found (tabs strip scrolls with snap, toolbar wraps).
9. **Print page architecture**: RTL-native, styles scoped to `.print-sheet`, app chrome hidden
   via visibility, `@page { margin: 1.5cm }`, `color-scheme: light !important` canvas fix,
   AA-tuned ink variables — only J-8's item-level break control is missing.

**Counts: 9 findings — 1×P1, 2×P2, 6×P3 (J-9 is a SUGGESTION).**
