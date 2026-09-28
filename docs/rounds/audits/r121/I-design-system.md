# r121 — Auditor I: Design System (Impeccable lens)

**Scope:** web only (`src/`, plus the fresh production build CSS at `.next/static/chunks/3ik2ic2sykb23.css`, built from HEAD `74ef578f` — used as ground truth for what Tailwind actually emits). Method: full read of `src/app/globals.css` (1,239 lines) + `public/fonts/fonts.css`; adoption measured by grep over `src/**/*.{ts,tsx}`; claims about compiled CSS verified against the built chunk (incl. byte-level `node` checks where tool output was suspect — two suspicious-looking classes turned out to be display artifacts and were **dropped** after byte verification; one was real, see I-8).

**Ledger discipline:** r111 (53-shot measured visual audit — contrast, nav alignment, etc.) and r120 (impeccable round) are NOT re-litigated. Ledger items in my domain were re-quantified, not re-discovered (see "Ledger verification" below).

**Token vocabulary inventory (@theme + :root/.light):** colors — 22 shadcn semantic slots + 8 status (success/warning/info/destructive × fg + 4 soft tints) + whatsapp×2 + espresso/bloom + orange×3 + showcase-1..5 + saffron-heat family ×9 + overlay + glass×5 + surface×3; radius sm 8 / md 12 / lg 18 / xl 28 (+2xl/3xl/4xl Tailwind defaults); type xs→5xl; leading 5 steps; tracking 4 steps; easing ×2 in @theme (+3 more in :root); glass shadows ×2; 4-tier shadow scale in :root/.light; z-index scale ×7; motion durations ×3; spacing `--space-xs…4xl` (8pt). Fonts: Cairo 400-800 (UI), Readex Pro 300-700 (headings), Noto Naskh 400-700 (dropped r120, orphaned), Noto Sans Arabic 300-700 (fallback only).

**Adoption headline (extraordinary discipline):** arbitrary hex utilities = **5 total** (all one value, see I-7); raw Tailwind palette classes (`text-green-600` etc.) in src = **0**; arbitrary px/rem spacing = **0**; arbitrary radii = 4 real instances (rounded-[4px] ×4 in cart, plus shadcn-internal `calc()` pair); semantic status classes heavily used (text-success 69 / text-destructive 84 / text-info 17 / text-warning 7). The drift is **not** raw values — it is (a) duplicate bespoke implementations of primitives, (b) dead tokens that were never adopted, and (c) two surfaces speaking different status languages.

---

## Findings

### I-1 [P2] Order-status color language splits by surface: admin speaks raw orange, owner speaks semantic tokens
- Type: FACT
- Evidence: `src/lib/order-status.ts:1-11` declares itself "Single source of truth for order presentation across owner **+ admin** pages" with semantic tokens (`new`→`bg-warning/15 text-warning`, `preparing`→`bg-info/15 text-info`, :43-51). But only owner pages import it (`app/(protected)/owner/orders/page.tsx`, `OrdersTable.tsx` — 2 files). Admin re-implements its own maps: `app/(protected)/admin/orders/page.tsx:27-29` (`new`/`preparing` → `text-orange bg-orange-muted`), `:380-382` (advance-to-`completed` button styled orange), `:320` (primary action = bespoke `bg-gradient-to-r from-orange to-orange/80 text-white`), `app/(protected)/admin/orders/[id]/page.tsx:105+143` (Badge overridden with the bespoke map + `scale-110` gradient), `app/(protected)/admin/subscriptions/page.tsx:50-58` (pending → `bg-orange-muted text-orange/80`). Same status, two palettes: «جديد» = amber on owner, orange on admin; «مكتمل» = green on owner, orange-bordered on admin.
- Impact: user-facing — an operator using both panels (real scenario: admin approving subscriptions, owner running the floor) sees the same lifecycle state in two colors; brand-orange doubles as "status" on admin, weakening the semantic color system (warning=amber, info=blue) the tokens encode.
- Fix (minimal): import `ORDER_STATUS_META`/`getOrderStatusMeta` in the 3 admin pages and delete the local maps; keep the admin KPI tiles' orange only if re-mapped to `warning` to match owner (`bg-warning/15` family).
- Risk: low — class swap only; visual diff on admin tables. Risk of not fixing: permanent two-language status system.
- Tests required: none functional; visual snapshot of admin orders list + detail badge states.

### I-2 [P2] The custom 4-tier shadow system is dead code — 197 `shadow-*` utility usages render Tailwind defaults
- Type: FACT
- Evidence: `src/app/globals.css:335-340` (`:root --shadow-sm/md/lg/xl` "richer depth" dark values) and `:458-464` (light variants). Compiled CSS proves they never apply: `.shadow-md{--tw-shadow:0 4px 6px -1px var(--tw-shadow-color,#0000001a)…}` — Tailwind v4 **inlines** the default theme value; `var(--shadow-md)` appears **0 times** in the built chunk. The custom values *are* emitted as CSS variables (`--shadow-md:0 4px 16px #00000059`) but nothing references them except `.card-premium` (globals.css:1127,1138) and `.qr-corner` (:835). Meanwhile components use the utilities 197× (shadow-lg 70, shadow-sm 68, shadow-md 25, shadow-xl 22, shadow-2xl 12).
- Impact: two divergent shadow languages ship — warm/deep hand-tuned shadows on `.card-premium` surfaces vs Tailwind cool-gray defaults everywhere else (dialogs, sheets, buttons, admin cards); ~14 dead declarations in every page's CSS; the design intent ("richer depth, cross-browser") silently never applied to any utility consumer.
- Fix (root cause, pick one): (a) move the scale into `@theme inline` with var indirection exactly like the colors do — `@theme inline { --shadow-sm: var(--shadow-surface-sm); … }` and rename the `:root`/`.light` vars accordingly, so `shadow-sm` picks up theme-aware values; or (b) delete the dead `:root`/`.light` shadow declarations and accept Tailwind defaults as the system.
- Risk: (a) changes elevation on 197 sites — needs one visual pass; (b) zero risk but loses the tuned depth.
- Tests required: visual regression on cards/dialogs/sheets, dark + light.

### I-3 [P2] Empty states: three competing patterns — EmptyState primitive (11 files) vs legacy `.empty-state-icon` CSS class (3 files) vs ~33 files hand-rolling bespoke blocks
- Type: FACT
- Evidence: primitive `src/components/ui/empty-state.tsx:24-53` (size-16 icon tile, py-12, `text-sm font-bold` title, `text-xs` description). Adoption: 11 files. But "لا توجد/لا يوجد" copy appears **57× across 33 files**, ≥20 of which build bespoke blocks with drifting specs — icon sizes `size-8` / `size-10` / `size-12` (vs primitive's size-16), paddings `py-4` / `py-10` / `py-12` / `py-20`, titles `text-sm` / `text-lg` / `text-xs` (counts from grep of containing classNames). A third legacy pattern survives as CSS: `.empty-state-icon` (globals.css:1180-1184) still used by `app/(protected)/admin/users/page.tsx`, `app/(protected)/owner/page.tsx`, `app/(protected)/owner/settings/page.tsx`. r120 already deferred "owner stats empty-state polish" (LEDGER-KNOWN) — this is the systemic version of that item, not a re-report of it.
- Impact: user-facing inconsistency on every list/table surface; new dashboards reinvent the block each time; three icon-radii/paddings coexist on similar screens.
- Fix: consolidate on `EmptyState` (add a `size="compact"` variant for table interiors); delete `.empty-state-icon` CSS once the 3 legacy users migrate.
- Risk: low; pure presentational.
- Tests required: render snapshots only.

### I-4 [P2] Filter/tab pill rows: no primitive, ≥7 bespoke implementations with drifting radius, padding, and active treatment
- Type: FACT
- Evidence: the same concept (scrollable status-filter pills above a table/menu) hand-rolled at: `app/(protected)/admin/orders/page.tsx:318` (`px-4 py-2 rounded-full`, active = `from-orange` gradient + `text-white`), `app/(protected)/admin/settings/page.tsx:186` and `:213` (`px-4 py-2.5 rounded-xl` + border — different radius language), `app/(protected)/owner/orders/OrdersFilters.tsx:146` (`px-4 py-2 rounded-full`), `app/(protected)/owner/reviews/page.tsx:157` (`px-3.5 py-1.5 rounded-full text-xs` — third padding scale), `components/admin/ConfigEditor.tsx:132` (`px-4 py-2 rounded-xl`), `components/menu/CategoryTabs.tsx:169` (its own system, justified — public menu brand surface), `app/(protected)/admin/system-events/client.tsx:133`. Two radii (full vs xl), three paddings, three active-state styles, focus rings re-specified each time (all `ring-orange/60` by copy-paste).
- Impact: the primary filtering control of every operational table is visually inconsistent across owner/admin — an Operate-mode consistency defect; a11y/keyboard behavior is re-derived per implementation.
- Fix: extract `ui/filter-tabs.tsx` (pill variant `rounded-full` + segmented variant `rounded-xl`) with one active treatment (suggest `bg-orange text-orange-foreground` — matches Button default), then swap the 6 dashboard call-sites.
- Risk: low-medium (6 call sites); visual pass per surface.
- Tests required: interaction tests per swapped surface (keyboard nav, active state).

### I-5 [P2] Micro-typography: ~101 arbitrary sub-scale font sizes; ledger count stale; `11px` cluster (×50) untracked
- Type: FACT (LEDGER re-quantification)
- Evidence: ledger says `text-[10px] ×92` — at HEAD the 10px family is **51** (`text-[10px]` ×43 + `text-[0.625rem]` ×7 + `text-[9px]` ×1) → LEDGER-STALE (partially fixed or originally counted with 11px). The untracked sibling: **`text-[11px]` ×50**, clustering in `components/owner/item-dialog` (4 files), `components/menu` (4), `app/(protected)/cart` (4), `components/shared` (3), `app/(protected)/owner` (3+), plus 15 more files. Same-value-different-unit inside one component: `components/menu/MenuItemCard.tsx:171` (`text-[0.625rem]`) vs `:182,:195` (`text-[10px]`) — identical 10px badges, two spellings, plus radius drift in the same card (`rounded-full` :171 vs `rounded-md` :182,:195). Scale-exact duplicates also exist: `text-[1rem]` ×3 (= `text-base`), `text-[18px]` ×1 (= `text-lg`), `text-[2.25rem]` ×1 (= `text-4xl`), `text-[0.75rem]` ×1 (= `text-xs`).
- Impact: user-facing — below the 12px token floor; per globals.css:479-480, high-contrast mode's 112.5% base does **not** scale px utilities, so the smallest text stays tiny for low-vision users exactly when they opted into larger text.
- Fix (root cause): add `--text-2xs: 0.6875rem` (11px) and `--text-3xs: 0.625rem` (10px) to `@theme` and sweep the 101 sites in one pass (natural companion to the deferred alpha-muted sweep).
- Risk: low; mechanical.
- Tests required: none functional.

### I-6 [P2] Dead token vocabulary: ~35 never-adopted declarations, 9 of which ship as dead CSS in every page
- Type: FACT
- Evidence (all zero-usage in `src/**`, adoption verified by grep):
  - `--color-success-soft/-warning-soft/-info-soft/-destructive-soft` — @theme globals.css:59-63, values :238-241 (dark) + :382-385 (light): **0 usages** (r96-W4a added them; nothing adopted; ad-hoc `bg-success/15` opacity utilities are used instead — 53×).
  - `--duration-fast/base/slow` (:190-192): **0 references** anywhere (motion code uses literal `duration-300` etc.).
  - `--z-dropdown…--z-tooltip` (:176-182) + the Z-INDEX LAYER REGISTRY comment (:1-15): **0 references**; layers are followed only by convention (9 arbitrary `z-[N]` values: z-[90]×3, z-[100]×3, z-[60], z-[61], z-[63]). The registry being unenforced is the systemic root of J-1's P1 (floating controls in the z-[60-63] band stacking above modal-band dialogs) — cross-referenced, not re-reported here.
  - `--space-xs…--space-4xl` 8pt scale (@theme :108-116): wrong namespace for Tailwind 4 (named spacing needs `--spacing-*`; numeric spacing is `calc(var(--spacing)*n)`); no `p-xs`/`gap-md`-style usage exists → 9 dead tokens.
  - Dead plain-CSS utilities that **ship in the production bundle** (verified present in the compiled chunk despite 0 TSX usage): `.glow-border` (:931-973 + `@property --glow-angle`), `.mesh-surface` (:999-1004), `.spotlight-border` (:520-523, :544-567 — superseded by `Card`'s `spotlight` prop, card.tsx:54-66), `.shimmer-press` (:530-534, :569-580), `.shimmer-ambient` (:536-540, :582-598), `.ambient-glow` (:525-528), `.card-3d` (:644-647 + the mobile guard :733-739 that targets it), `.shimmer-advanced` (:661-668). Dead `@utility` (tree-shaken, source-only): `animate-shimmer` (:608), `animate-breathe` (:614), `animate-tilt-in` (:649), `animate-scale-glow` (:657).
  - Orphaned after r120's Naskh drop: `[dir="rtl"] .font-naskh` (globals.css:679-681) + both Noto Naskh `@font-face` blocks (public/fonts/fonts.css:33-50) — zero components use `font-naskh` (only a comment in Eyebrow.tsx:10).
- Impact: technical — ~9 dead rule blocks (~100 lines) in the shipped CSS; token vocabulary misleads future contributors (a new dev reaching for `bg-warning-soft` or `--z-modal` finds silence); the registry/comment contract ("4-tier shadow system", "8pt spacing scale") is unenforced documentation.
- Fix (ponytail sweep): delete the 9 dead CSS utilities + orphaned Naskh declarations + dead tokens; for the soft tints, either adopt them in the badge/status system (they're the *correct* primitive for I-1's admin tiles) or remove; rename `--space-*` → nothing (delete).
- Risk: low — pure dead code; keep `.card-3d`'s media-query guard only if `[data-3d-tilt]` attribute is still used (grep: it is not — delete both).
- Tests required: none (CSS-only); build diff should show chunk shrink.

### I-7 [P3] WhatsApp-ink `#0b3d2e` repeated ×5 across 3 files — the codebase's only arbitrary-hex cluster, violating the project's own tokens-only rule
- Type: FACT
- Evidence: `src/components/menu/OrderDialog.tsx:570,576,581`, `src/components/loyalty/ShareAfterOrder.tsx:298`, `src/components/loyalty/ReferralCard.tsx:169` — all `text-[#0b3d2e]` (the r120 contrast fix, dark-green-on-WhatsApp-green 6.15:1). These are the **only 5 arbitrary hex utilities in the entire src tree**. The design constitution forbids it: docs/smartbot-design-spec.md §0.5 «كل الألوان عبر رموز CSS فقط — يُمنع hardcode قيم في المكونات». Bonus: the same 3 files implement 3 bespoke WhatsApp CTA buttons with drifting specs (h-12/h-12/h-11; text-base/text-sm/text-sm).
- Impact: user-facing none today; system debt — a de-facto token living as a magic string; the next WhatsApp-CTA author copies whichever variant they find.
- Fix: add `--whatsapp-ink: #0b3d2e` beside `--whatsapp`/`--whatsapp-deep` (globals.css:278-280 + @theme :65-67) → `text-whatsapp-ink`; optionally extract a shared `WhatsAppCTA` (h-12, text-sm, one focus-ring spec).
- Risk: none.
- Tests required: none.

### I-8 [P3] Broken arbitrary utility: FinalCTA decorative ring renders 0×0
- Type: FACT
- Evidence: `src/components/landing/sections/FinalCTASection.tsx:26` — class is literally `size-in(60vmin,720px)]` (byte-verified via node; intended `size-[min(60vmin,720px)]` — the `[m` is missing). Tailwind emits nothing for the invalid token, so the `rounded-full border border-accent-foreground/10` ornament div has no width/height → invisible. A repo-wide bracket-balance scan (node) found this as the **only** genuinely broken class token in src.
- Impact: user-facing — an intended Persuade-mode flourish (concentric ring behind the final CTA) is silently missing.
- Fix: one-token repair: `size-[min(60vmin,720px)]`.
- Risk: none.
- Tests required: visual check of the CTA section after fix (it will newly show a ring — confirm it's wanted).

### I-9 [P3] Easing token bypassed in the 5 most central primitives; Toaster inline radius/easing duplicate tokens
- Type: FACT
- Evidence: `ease-[cubic-bezier(0.16,1,0.2,1)]` ×5 — `src/components/ui/button.tsx:16`, `card.tsx:32`, `dialog.tsx:34,61`, `sheet.tsx:58` — the exact value of `--ease-smooth` (globals.css:152, in `@theme inline`, so the `ease-smooth` utility exists and is used 3× elsewhere). Additionally both root layouts' Toaster carries inline `borderRadius: '12px'` (= `--radius-md`) and `animation: 'slide-up 0.35s cubic-bezier(0.16,1,0.2,1)'` — `app/(public)/layout.tsx:179`, `app/(protected)/layout.tsx:159`. (`app/not-found.tsx` inline radii are exempt by design — the self-contained r112 boundary.)
- Impact: technical — the easing system has one real value and one name, but the primitives that define the site's feel hardcode it; a future easing retune must find 5 literals + 2 inline styles.
- Fix: replace the 5 class literals with `ease-smooth`; Toaster style → `borderRadius: 'var(--radius-md)'`, animation → `slide-up 0.35s var(--ease-smooth)`.
- Risk: none (identical computed values).
- Tests required: none.

### I-10 [P3] Font-weight utilities request weights the loaded variable fonts don't carry
- Type: FACT
- Evidence: `src/components/landing/HeroSection.tsx:110` — h1 `font-extrabold` (800), but headings resolve to Readex Pro (globals.css:758-769), whose variable axis is **300-700** (public/fonts/fonts.css:77) → clamps to 700; the inline comment (:106) still claims "SmartBot h1 scale — 68px/800 (spec §3)" — the 800 is unachievable. `src/components/menu/FeaturedShowcase.tsx:182,244` — `font-black` (900) on Cairo (max 800, fonts.css:9) → clamps. (StepIndicator.tsx:68 `font-extrabold` is fine — Cairo carries 800.)
- Impact: none visually (browsers clamp), but the utility lies about the rendered weight and any future font re-subset changes rendering silently; the r95 spec's 800-weight hero is not actually shipped.
- Fix: either change to `font-bold`, or re-subset Readex Pro with an 800 axis if the spec weight is a real requirement.
- Risk: none.
- Tests required: none.
- LEDGER note: r120's font-weight token fix **LEDGER-VERIFIED at HEAD** — compiled CSS shows `.font-bold{--tw-font-weight:var(--font-weight-bold);font-weight:var(--font-weight-bold)}` (weight, not family). Arabic display line-heights (showcase clip) **LEDGER-VERIFIED still deferred** — FeaturedShowcase.tsx:182 still `leading-[0.95]` on `clamp(3.5rem,14vw,9.5rem)`.

### I-11 [P3] Docs markdown leaks 3 dead utilities into the production CSS bundle
- Type: FACT
- Evidence: the built chunk contains `--color-red-500:#fb2c36;--color-green-600:#00a544;--color-purple-500:#ac4bff` and rules `.text-red-500{color:var(--color-red-500)}` etc. Repo-wide search (excluding node_modules/.next) finds these class strings only in `docs/rounds/plans/round79-master-plan.md` — Tailwind v4's automatic source detection scans non-gitignored markdown, so plan-document examples compile into the shipped CSS.
- Impact: technical — trivial bytes, but the production token vocabulary stays honest only by luck of what docs mention; every historical plan doc is a potential source of phantom utilities.
- Fix (one line): `@source not "../../docs";` in globals.css (or gitignore-respect config), keeping src + any intentional sources.
- Risk: none — verify the icon/UI utilities still compile after (build diff).
- Tests required: build + quick class-coverage diff.

### I-12 [P3] Operate surfaces carry Persuade-grade chrome (mode-judgment, not a defect)
- Type: SUGGESTION
- Evidence: every owner/admin page paints the marketing ambience: `app/(protected)/layout.tsx:121` `grain-overlay` (full-viewport fractal-noise SVG, globals.css:1169-1177) + full-viewport `GridPattern` (:125-137). Every `Button` — including dense CRUD table actions — carries the hover shine-sweep (`before:` 105° gradient, 700ms) + ambient radial glow (`after:`, 500ms) baked into the base cva class (`src/components/ui/button.tsx:16`). The landing/marking identity (Persuade) and the dashboards (Operate) currently share one motion/flourish language.
- Impact: subtle, not broken — grain and grid are static and pointer-events-none; the shine sweep is pure CSS. But r120 measured this exact class of effect (backdrop-blur on CartSlideOver) freezing low-end devices, and impeccable's Operate mode ranks scanability/speed over expression; uniform flourish also makes the landing feel less *earned* by contrast.
- Fix (policy first): record the rule in DESIGN.md — "brand ambience (grain, grid, aurora, shine-sweep) lives on marketing surfaces + the primary CTA of each surface; dense operational controls stay flat". Optional smallest code step: move the sweep/glow `before:/after:` pair out of the cva base into a `variant="flame"`-adjacent opt-in (e.g. `data-surface="marketing"` on the Button).
- Risk: of fixing — visual regressions if applied bluntly; of not fixing — dashboards keep paying (small) paint cost and the mode distinction stays undocumented.
- Tests required: visual pass on landing CTAs + one owner table.

### I-13 [P2] No PRODUCT.md / DESIGN.md — the design system's truths are fragmented across a foreign-product spec and 15+ round docs
- Type: FACT (absence) + SUGGESTION (content)
- Evidence: root has neither file (`ls` confirms). The design DNA currently lives in: `docs/smartbot-design-spec.md` (the r95 visual source of truth — itself a spec extracted from another product, SmartBot), inline globals.css archaeology (comments tagged r93-W2a, r95, r96-W4a, round83, round94, r120), and ENGINEERING_STATE.md entries.
- What the docs **must** capture (draft-ready, from this audit):
  - **PRODUCT.md (product truths):** RTL-first Arabic SaaS for the Libya market (د.ل currency, WhatsApp/Telegram order rails, QR-table menus); four surfaces with four Impeccable modes — landing = **Persuade**, public menu = **Operate-with-brand**, owner dashboard + admin panel = **Operate**; money format contract (`12 → «12 د.ل»`, `7.25` keeps decimals — r120); Arabic pluralization + Western digits convention (order-status.ts:98-105); brand «الربط الذكي | Smart Menu»; dark-first identity (#010000 background / #070503 cards / #ebe7e2 ink / #bc4700 flame) with dual-lightness tokens guaranteeing light-mode AA; high-contrast + reduced-motion as first-class modes.
  - **DESIGN.md (language rules):** tokens-only color rule (spec §0.5 — and its one sanctioned exception, whatsapp brand colors incl. the new `--whatsapp-ink`); radius scale 8/12/18/28 (+ 16/24px defaults) — `rounded-full` for pills, `rounded-xl` for cards, never ad-hoc px; type scale xs-5xl + the 2xs/3xs decision from I-5; Cairo = UI / Readex Pro = headings / **no letter-spacing on Arabic ever** (the `[class*=tracking-]` guard, globals.css:751-755); weights ≤700 (or re-subset — I-10); motion = 300-700ms, `--ease-smooth`/`--ease-out-quart`, reduced-motion honored at both CSS and MotionConfig layers; status colors = semantic tokens only (warning=amber new, info=blue preparing, success=green ready/completed, destructive=cancelled — pending I-1's fix to make this true everywhere); z-layer registry bands; the QR-corner motif as the brand signature; empty/skeleton conventions (EmptyState + one shimmer system — pending I-3/I-14); the mode rule from I-12.
- Fix: run the impeccable `init` + `document` commands (this is the mission's own task — this audit supplies the raw material above).
- Risk: none; benefit — every future round stops re-deriving the system from archaeology.
- Tests required: none.

### I-14 [P3] Two shimmer/loading languages coexist (`.skeleton` shimmer vs `animate-pulse`)
- Type: FACT
- Evidence: `ui/skeleton.tsx` renders the `.skeleton` CSS class (globals.css:1145-1150, warm gradient sweep, 1.8s) — imported by only 2 files; 9 files use the raw `.skeleton` class directly; **19 files** use `animate-pulse` (Tailwind opacity pulse, different rhythm and look) for loading placeholders. Same-purpose loaders on similar dashboard surfaces thus breathe differently.
- Impact: user-facing subtle inconsistency; no correctness issue.
- Fix: standardize: `Skeleton` component for shape placeholders (its gradient matches the warm theme), `animate-pulse` only for non-skeleton live indicators (e.g. status dot, admin/orders:234). Document the split in DESIGN.md.
- Risk: none.
- Tests required: none.

---

## Impeccable-mode judgment (per surface)

- **Landing (Persuade):** earns attention with a distinct, committed identity — SmartBot-twin dark flame world, `text-gradient-hero`, aurora final CTA, Readex Pro display, showcase accents, device mockups. Genuinely out-of-template. Deductions: the final-CTA ring is broken (I-8), display sizes bypass the token scale (text-[4.25rem]/[3.25rem]/[2.75rem] — HeroSection.tsx:110, StatsSection.tsx:51, SectionHeader.tsx:55, PricingClient.tsx:132 — the scale tops at 5xl/48px; either add display steps to @theme or use text-6xl), and the hero's declared 800 weight doesn't exist in the shipped font (I-10).
- **Menu (Operate-with-brand):** scannability holds — 4-col xl grid (r120), consistent card anatomy, category pills with live counts; brand lives in the flame CTA, QR-corner, showcase scene rotation. Micro-badges at 10px/0.625rem with intra-card drift are the main debt (I-5). Known perf items (orb-float, StickyMenuHeader SSR) remain ledger-owned.
- **Dashboards (Operate):** strong spine — unified `text-2xl font-bold tracking-normal` page h1 ×22 across owner+admin, semantic tokens widely used, Button primitive in 59 files. The Operate violations are exactly the cross-surface inconsistencies: status color split (I-1), filter-pill drift (I-4), empty-state drift (I-3), and marketing ambience on every page (I-12).

## Solid areas (no action needed)

1. **Color adoption discipline:** 5 arbitrary hexes and 0 raw palette classes in ~470 TSX files — near-perfect token fidelity; light/dark parity via dual-lightness tokens is consistently engineered (globals.css:203-241 vs :354-394 with measured AA notes).
2. **Radius & spacing:** custom radius scale applied through utilities (compiled `.rounded-lg{border-radius:18px}` proves it); zero arbitrary px spacing anywhere.
3. **r120 fixes holding at HEAD (compiled-CSS proof):** font-weight utilities emit weight (not family); dialog+sheet 300ms + `ease-[…]`; `.animate-rise-in` present and used (6 sites).
4. **Reduced motion, two layers:** CSS global clamp (globals.css:1190-1204) + `MotionConfig reducedMotion="user"` (components/shared/MotionProvider.tsx:3) — r113 verification still valid; marquee auto-pause checks `useReducedMotion()` (FeaturedRestaurantsSection.tsx:36-54).
5. **High-contrast mode:** dedicated token layer with pre-paint boot script, AAA-graded values (globals.css:467-510).
6. **Dashboard typographic spine:** h1 convention ×22 files, tabular-nums + lining-nums globally (globals.css:699-700) — right call for a numbers product.
7. **Component primitive foundation:** button/input/select/sheet/dialog/card/badge/table/switch/label/separator exist and are the default choice (59/22/5… files); `ORDER_STATUS_META` is a well-designed single source of truth (the problem is adoption, not design).

## Ledger verification (domain items)

| Ledger item | Status at HEAD |
|---|---|
| r120 font-weight token shadowing fix | **LEDGER-VERIFIED** (compiled `.font-bold{font-weight:var(--font-weight-bold)}`) |
| Arabic display line-heights (showcase clip) | **LEDGER-VERIFIED still open** (FeaturedShowcase.tsx:182 `leading-[0.95]` unchanged) — deferred, do not re-litigate |
| alpha-muted text sweep | **LEDGER-VERIFIED still open**, re-quantified: 88 sites × 10 alpha steps (`/50`×31, `/60`×24, `/40`×15, `/70`×6, `/30`×4, `/20`×3, `/80`×2, `/85-95`×3) |
| `text-[10px] ×92` | **LEDGER-STALE** — now 10px-family ×51; the untracked `text-[11px]` ×50 is the larger half (I-5) |
| dialog 300ms / rise-in / orb-float deferral | all hold as recorded |

**Counts for the round summary:** 14 findings (7×P2, 7×P3 — no P0/P1); dead declarations catalogued: ~35 tokens + 13 utilities (9 shipping in the bundle); consolidation targets: empty-states (33 files), filter pills (7), micro-typography (101 sites), status maps (3 admin pages), skeletons (2 languages).
