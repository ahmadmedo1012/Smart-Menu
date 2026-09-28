# Auditor O — Code Quality + Ponytail over-engineering (r121)

**Scope:** whole-web Ponytail audit — `src/` (app, components, hooks, lib, store), configs. `mobile/` PROTECTED (web↔mobile lib twins are documented deliberate parity — never flagged). Read-only; every claim below was verified with ripgrep at HEAD this session (full-output greps, no head-truncation — see O-12's near-miss for why that matters).

**Method:** caller census for all 63 `src/lib` modules + 5 `src/hooks` + feature-local hooks; fresh `pnpm knip` run (matches F's numbers); cross-referenced `F-dependencies.md` (F-2's 24 dead exports — sampled and extended, not re-enumerated); every wrapper judged against its round-tag rationale in code comments + `ENGINEERING_STATE.md`.

**Headline: 12 findings — 1×P2, 11×P3, 0×P0/P1. This repo's abstraction discipline is genuinely strong (see "Checked clean"); what remains is a residue of speculative props/options, one duplicated label-map family, and F-2's dead exports re-verified. ~195 deletable lines unique to this audit; ~260–280 combined with F-2's list.**

---

## Findings

### O-1 [P2] Pickup-type Arabic label map duplicated at 7 inline sites despite the canonical `PICKUP_TYPE_META` / `getPickupTypeMeta`
- Type: FACT (code-proven)
- Evidence: canonical source `src/lib/order-status.ts:87-95` (`PICKUP_TYPE_META` = inside «داخل المكان» / takeaway «سفري» / delivery «توصيل», + `getPickupTypeMeta()` fallback). Its importers: only 2 files (`owner/orders/OrdersTable.tsx:11,134,180`, `owner/orders/page.tsx:13,228`). Meanwhile the SAME three labels are hand-inlined at 7 other sites:
  - `src/lib/receipt.ts:27` (`const labels: Record<string,string> = { inside: "داخل المكان", takeaway: "سفري", delivery: "توصيل" }`) and `receipt.ts:112` (inline ternary)
  - `src/components/menu/OrderDialog.tsx:508` (inline ternary)
  - `src/app/(protected)/cart/ReviewDialog.tsx:17` (inline map)
  - `src/app/(protected)/cart/page.tsx:31` (options list)
  - `src/app/(protected)/owner/settings/page.tsx:394` (options list + desc)
  - `src/app/(protected)/owner/orders/[id]/page.tsx:260` and `src/app/(protected)/admin/orders/[id]/page.tsx:235` (inline ternaries)
  This is the exact drift class r120's journey pass fixed at the VALUE level («الطلبات داخل المكان/سفري/توصيل» unified) — but the SOURCE was never unified; a future label edit at one site re-splits the copy (receipt would tell the customer «سفري» while the owner dashboard says something else).
- Impact: technical (copy-drift risk on a money-adjacent surface — the WhatsApp receipt).
- Fix (minimal, root-cause): in the 5 pure-label sites (receipt ×2, OrderDialog, owner/orders/[id], admin/orders/[id]) replace the inline map/ternary with `getPickupTypeMeta(type).label`. The 3 options-list sites (cart page, ReviewDialog, owner settings) can derive `label` from `PICKUP_TYPE_META[k].label` while keeping their own value/icon/desc structure. `order-status.ts` imports lucide icons as values — receipt is client-shared and lucide is already universal in client bundles, so no new weight.
- Risk: of fixing — low (pure label reads; `getPickupTypeMeta` has the same inside-fallback the ternaries hardcode); of not fixing — the next pickup-copy change silently forks 8 surfaces again.
- Tests required: `receipt-whatsapp-format.test.ts` (pins receipt labels) + existing owner/admin order-detail tests.

### O-2 [P3] `motion-icons.tsx`: 18 dead `Motion*` wrappers + duplicate `'use client'` directive (extends F-2 with the exact removal list)
- Type: FACT (grep-verified zero callers across `src/`, `tests/`, `scripts/`, `mobile/`)
- Evidence: `src/components/ui/motion-icons.tsx` exports 29 `Motion*` wrappers; 11 are live (verified refs): `MotionPlus`(29) `MotionCheck`(32) `MotionMinus`(8) `MotionSearch`(10) `MotionArrowLeft`(17) `MotionArrowRight`(23) `MotionMenu`(4) `MotionChevronLeft`(15) `MotionChevronRight`(15) `MotionChevronDown`(7) `MotionLogIn`(admin/page.tsx:19,391,424). **Dead 18** (zero external refs): `MotionPhone`, `MotionMapPin`, `MotionStore`, `MotionCrown`, `MotionAward`, `MotionGift`, `MotionMedal`, `MotionSettings`, `MotionTrendingUp`, `MotionActivity`, `MotionBarChart3`, `MotionSmartphone`, `MotionAlertTriangle`, `MotionBuilding2`, `MotionLandmark`, `MotionCreditCard`, `MotionLightbulb`, `MotionStethoscope` (lines 63–87). Also **lines 1–2 are a duplicated directive**: `"use client";` followed by `'use client';` — a leftover from an edit; harmless at runtime but a lint-invisible defect. F-2 listed the 18; this adds the directive defect and the import-coupling below.
- Impact: technical — dead exports tree-shake out of bundles; the cost is source noise + the misleading file surface ("drop-in replacement" kit that is 62% unused).
- Fix (removal list, ready to execute):
  1. Delete the 18 export lines (`motion-icons.tsx:63-64,65,66,67,68,69,70,71,72,73,76,81,82,83,84,86,87` — i.e. every export EXCEPT lines 59,60,61,62,74,75,77,78,79,80,85).
  2. Prune line 4's lucide import to only the 11 live icons: keep `Plus, Check, Minus, Search, ArrowLeft, ArrowRight, Menu as MenuIcon, ChevronLeft, ChevronRight, ChevronDown, LogIn`; delete `Phone, MapPin, Store, Crown, Award, Gift, Medal, Settings, TrendingUp, Activity, BarChart3, Smartphone, AlertTriangle, Building2, Landmark, CreditCard, Lightbulb, Stethoscope`.
  3. Delete one of the two `'use client'` lines (1–2).
- Risk: near-zero — all 18 verified unreferenced anywhere including tests.
- Tests required: `pnpm typecheck && pnpm test` (2006 baseline); no test references any of these symbols.

### O-3 [P3] `AnimatedIconHandle` imperative ref API carried by all 23 hand-rolled icons, consumed by exactly one call site; `stopAnimation` has zero external callers
- Type: FACT + SUGGESTION
- Evidence: `src/components/ui/types.ts:67-70` defines `AnimatedIconHandle { startAnimation, stopAnimation }`; all 23 `src/components/ui/*-icon.tsx` files wrap themselves in `forwardRef<AnimatedIconHandle, …>` + `useImperativeHandle` (~5 boilerplate lines each). The ONLY consumer of the handle in the entire repo: `src/lib/premium-toast.tsx:52-59` — `AnimatedCartToastIcon` refs `ShoppingCartIcon` and calls `ref.current?.startAnimation()` once on mount (the cart-toast bounce). `stopAnimation`: zero external call sites (grep across src/tests). Every other icon (incl. `AnimatedX`, used in 6+ files) is rendered without a ref.
- Impact: technical — ~5 lines of dead runtime wiring per icon that ships in client bundles (the icons themselves are used, so the boilerplate is not tree-shaken); interface with effectively one consumer = unrequested abstraction per the ladder.
- Fix (minimal): keep the handle in `shopping-cart-icon.tsx` only (it has the one real consumer); in the other 22 icon files drop `forwardRef`/`useImperativeHandle` (plain function components keep `AnimatedIconProps`) — or, when modernizing, React 19's ref-as-prop makes the deletion free. Alternative one-liner per the ponytail ladder: give `ShoppingCartIcon` an `autoPlay` boolean and delete the handle interface entirely — but that ADDS a prop for one caller; the 22-file boilerplate deletion is the smaller net diff.
- Risk: low — verified no other ref is ever passed to an icon (the only `ref={scope}` hits are the icons' internal motion scopes).
- Tests required: typecheck + unit suite; no test exercises the imperative handle.

### O-4 [P3] `SectionHeader`: 4 speculative props used by zero of its 7 callers
- Type: FACT
- Evidence: `src/components/ui/SectionHeader.tsx:9-16` declares `eyebrow?`, `title?`, `subtitle?`, `className?`, `icon?`, `align?: "center" | "start"`. Grep of all 7 callers (`FeaturedRestaurantsSection` ×2, `FaqSection`, `ShowcaseSection`, `FinalCTASection`, `FeaturesSection`, `HowItWorksSection`, `ClientsSection`): every single one passes only `title` + `subtitle`. `eyebrow=`, `icon=`, `align=`, and `className=` on `<SectionHeader>` — zero matches. The `centered` branch machinery (lines 29, 38-42, 46, 54, 67) therefore always takes the `true` path; the eyebrow block (44-50) is unreachable in practice.
- Impact: technical — ~20 dead lines and a component API that advertises variants it never renders (`Eyebrow` itself stays: used directly in `HeroSection.tsx:102`).
- Fix (removal list): reduce `SectionHeaderProps` to `{ title?: string; subtitle?: ReactNode }`; delete `align`/`centered` (hardcode `text-center`/`mx-auto`), the `eyebrow`/`icon` prop + its render block (44-50), and the `className` prop.
- Risk: near-zero (7 callers verified to pass nothing else).
- Tests required: landing-page renders (visual sanity); no unit test pins these props.

### O-5 [P3] `BackButton`: empty lucide import + dead no-`href` branch (all 3 callers pass `href="/owner"`)
- Type: FACT
- Evidence: `src/components/shared/BackButton.tsx:6` — `import {} from 'lucide-react';` — a fully EMPTY import statement (leftover from an icon swap; the only one in src/ — grep `import \{\} from` = 1 hit). Callers: `owner/orders/page.tsx:315`, `owner/settings/page.tsx:208`, `owner/menu/page.tsx:234` — **all three pass `href="/owner"`**, so the `router.back()` fallback branch (lines 8, 21-30) never executes in practice; `useRouter` is imported solely for it.
- Impact: technical (dead branch + dead import; `use client` could even drop if the branch goes — MotionArrowRight/Button remain client components regardless).
- Fix (removal list): delete line 6; make `href: string` required; delete the `useRouter` import and the no-href branch (lines 20-30 collapse to the `<Link>` variant).
- Risk: near-zero — verified 3/3 callers pass href.
- Tests required: typecheck (callers typed); owner pages render.

### O-6 [P3] `lib/motion.ts`: dead `fadeUp`/`fadeUpSpring` + a header claim that is now false + a near-duplicate local variant in `SectionHeader`
- Type: FACT
- Evidence: `src/lib/motion.ts:14-21` exports `fadeUp` and `fadeUpSpring` — zero importers anywhere (verified; the only other `fadeUp` hit is a comment in `MenuPageClient.tsx:401`). The file's own header (`:4-6`, round85-C7) claims it was "trimmed to the exports actually consumed" — the consumers were removed later, so the claim is stale. Meanwhile `src/components/ui/SectionHeader.tsx:18-26` defines its OWN local `fadeUpSpring` (y:16) and `fadeUpSnappy` instead of using the lib one — same concept, two homes, drifting values (lib y:30 vs local y:16). (F-2 listed the two dead exports; the stale header + local near-duplicate is the new context.)
- Impact: technical — a misleading doc-comment on a design-token file invites future misuse of the dead variants.
- Fix (removal list): delete `fadeUp`, `fadeUpSpring`, and the now-unused local `easeOutQuart` (`motion.ts:12`) — the three `spring*` exports stay (used by 6+ files); rewrite the header comment to "spring presets only — variants are defined per-component".
- Risk: near-zero.
- Tests required: typecheck.

### O-7 [P3] `payment-schema.ts` re-inlines the slug field that `validation.ts` says it unified
- Type: FACT + SUGGESTION
- Evidence: `src/app/api/subscriptions/route`'s schema `src/lib/payment-schema.ts:43-48` hand-writes `slug: z.string().min(3, 'الرابط…').max(100, 'الرابط…').regex(/^[a-z0-9-]+$/, 'الرابط…')` — byte-identical bounds/regex/messages to `slugField` in `src/lib/validation.ts:91-98`, whose header (62-68) explicitly says the inline copies ("restaurants, subscriptions/validate, restaurants/[id], settings, payment-schema") were unified into one export. payment-schema imports `usernameOptional` from validation already (:15) — the slug was simply missed. Parity is test-pinned (`payment-schema-caps.test.ts`), so the swap is provable.
- Impact: technical — the next slug-policy edit (say, length 3→2) forks the subscription path silently.
- Fix: `slug: slugField` (import from `@/lib/validation`) inside `tempRestaurants`. Note `slugField` also trims whitespace via `z.preprocess(normalizeSlug)` — strictly more lenient on trailing spaces only; the pinned tests assert messages, not trim behavior, and stay green.
- Risk: low; the 422 contract for genuinely bad slugs (charset/length) is unchanged.
- Tests required: `payment-schema-caps.test.ts` + subscriptions route tests.

### O-8 [P3] `BroadcastResult` type defined twice (identical shape, two files)
- Type: FACT
- Evidence: `src/lib/telegram-broadcast.ts:6-9` `interface BroadcastResult { sent: number; failed: { chatId: string; reason: string }[] }` (private) and `src/lib/telegram.ts:14` an identical `type BroadcastResult = { sent: number; failed: { chatId: string; reason: string }[] }` (private). Two private copies of the same money-path-adjacent result shape.
- Impact: technical — a field added to one (e.g. a `retryAfter`) won't reach the other.
- Fix: `export interface BroadcastResult` in telegram-broadcast.ts; `import type { BroadcastResult }` in telegram.ts (one-line each).
- Risk: none.
- Tests required: typecheck.

### O-9 [P3] Two speculative options with zero call-site usage: `NavLink.exact`, `usePaymentStatusPoll.intervalMs`
- Type: FACT
- Evidence: `src/components/shared/NavLink.tsx:15,18,20-22` — `exact?: boolean` changes active-state matching; all 3 consumers (`AdminSidebar.tsx:97` via nav items, `owner/layout.tsx`, `admin/layout.tsx`) never pass it. `src/hooks/usePaymentStatusPoll.ts:23,25` — `intervalMs?: number` (default 5000); its single caller (`PaymentDialog.tsx`) never passes it.
- Impact: technical (dead config surface; `intervalMs` also implies a configurability nobody asked for).
- Fix: delete `exact` + its ternary (always use the prefix-match branch); delete `intervalMs` and hardcode 5000.
- Risk: near-zero.
- Tests required: typecheck.

### O-10 [P3] `IconEasing` is fully dead — F-2 under-classified it as a "no-action prop-interface type"
- Type: FACT
- Evidence: `src/components/ui/types.ts:12-24` — an 11-member string-literal union (`"linear" | "easeIn" | … | "anticipate"`), zero references anywhere in src/tests/scripts (verified full-output grep). F-2's triage put the 48 unused exported types under "prop-interface types, zero runtime/bundle cost — noise, no action"; `IconEasing` is not a prop interface — it's a dead helper union that nothing ever type-annotates.
- Impact: technical only.
- Fix: delete `types.ts:12-24` (13 lines). While there: `DEFAULT_STROKE_WIDTH` (`types.ts:4`) also has zero users (F kept it as "kit surface" — shadcn convention doesn't apply, this is a hand-written types.ts; deleting is safe either way).
- Risk: none.
- Tests required: typecheck.

### O-11 [P3] F-2 dead-export verification: 8/8 confirmed dead; one refinement — `MotionLogIn` is LIVE
- Type: FACT (verification record)
- Evidence: full-output greps (src/ + tests/ + scripts/ + mobile/) this session: `MotionPhone`, `MotionCrown`, `MotionStethoscope`, `fadeUp`, `fadeUpSpring`, `ANALYTICS_RANGES`, `debug` (only defensive `vi.fn()` mock entries in 18 test files — zero production calls), `IconEasing` — all confirmed zero real callers. Refinement to F-2's prose: F said "only MotionCheck/Plus/Minus/Search/Arrow*/Chevron*/Menu are consumed" — `MotionLogIn` is ALSO consumed (`admin/page.tsx:19,391,424`); F's 18-symbol dead list is nonetheless exactly correct (it excluded LogIn). `needsRehash` ALMOST became a false finding here: a truncated grep showed only test hits, but reading the login route proved it live (`src/app/api/auth/login/route.ts:154` — the round85-A3 transparent rehash). Ledger note: the r118 "24 unused exports" headline and F-2's numbers agree with my fresh knip run (60 unused exports / 48 types / 29 archived files).
- Impact: none (verification).
- Fix: none — F-2's removal list stands, now independently confirmed.
- Tests required: n/a.

### O-12 [P3] Consistency residue: ui/ filename case-mixing, a UI component in `src/lib`, a one-line double statement in `format.ts`, and an identity helper with a misleading name
- Type: FACT (observations) + SUGGESTION (no bulk action)
- Evidence:
  - `src/components/ui/` mixes PascalCase (`OptimizedImage`, `SectionHeader`, `AvatarInitials`…), shadcn-generated kebab-case (`button.tsx`, `dialog.tsx`…), AND hand-written kebab-case (`*-icon.tsx` ×23, `scroll-reveal`, `empty-state`, `search-input`) — three conventions in one dir. Not a clean shadcn-vs-custom split.
  - `src/lib/premium-toast.tsx` — the only UI component living in `src/lib` (45 importers). It's a deliberate client-primitive placement, but it breaks the "lib = non-UI" mental model.
  - `src/lib/format.ts:47` — `const m = ARABIC_MONTHS[date.getMonth()];  const y = date.getFullYear();` — two statements crammed on one line (edit leftover; harmless).
  - `toArabicNumber` (`format.ts:8-13`) is functionally `String(n)` (numbers → `toString`, strings → identity) — it never produces Arabic numerals despite the name; its value is carrying the "Western digits only" convention at 10+ call sites. Keep (renaming/inlining churns 10+ files for zero behavior change), but its doc-comment — not the name — is what carries the meaning.
- Impact: technical/cosmetic.
- Fix: none this round (renames = import churn with zero user value — the anti-ponytail move). Optional one-liners: split `format.ts:47`; that's it.
- Risk: n/a.
- Tests required: n/a.

---

## Deletion tally (unique to this audit; F-2's 24 symbols counted separately)

| Finding | Lines deletable |
|---|---|
| O-2 motion-icons (18 exports + dup directive + import prune) | ~21 |
| O-3 AnimatedIconHandle boilerplate (22 files × ~5) | ~105 |
| O-4 SectionHeader speculative props | ~20 |
| O-5 BackButton dead branch + empty import | ~12 |
| O-6 motion.ts dead variants + stale header | ~12 |
| O-10 IconEasing (+DEFAULT_STROKE_WIDTH) | ~14 |
| O-9 NavLink.exact + intervalMs | ~6 |
| O-7/O-8/O-1 (dedup refactors, net ~0) | ~6 net |
| **Total (O)** | **≈195** |
| + F-2's 24 dead exports (verified O-11) | ~60–90 |
| **Combined program** | **≈260–280** |

## False-alarm-prone areas checked and found CLEAN (with evidence)

1. **`sendTelegramNotification` (telegram.ts:16-21) is a pure forward to `broadcastToAll`** — flagged by the wrapper heuristics, judged KEEP: it is the stable mock seam for 10+ test files and 3 call sites in subscription-decisions; deleting it re-touches ~11 test mocks for −6 lines. Documented judgment, not debt.
2. **All "suspiciously small" lib wrappers carry live round-tag rationales and multi-consumer value**: `fetchJson` (hardened timeout+retry+content-type, documented cold-start fix), `bg-task.runAfterResponse` (r119 request-scope/test fallback), `logout.performLogout` (round87-C1 dedup of 3 copies), `chime` (round86-C3 + r118 AudioContext-cap fix), `csrf-client.csrfJson` (13 callers), `keys` (HKDF), `brand` (meta/manifest literal constraint), `list-counts` (round88-A2 measured perf), `blob` (tenant-guard security), `menu-queries` (React cache() per-request memoization).
3. **Hooks are exemplary**: `usePollWhenVisible` — 7 consumers, unified from 8 copy-pasted skeletons (round86-C3), and ALL THREE of its options (`enabled`/`immediate`/`inFlightGuard`) are used by a real caller (usePaymentStatusPoll:56). `useAccessGate` — 11 consumers, round87-C1 dedup, fail-closed. `useConfig`'s TTL+inflight cache serves a remounting dialog with 6 config keys.
4. **zod `.nullable().optional()` chains (10 sites)** — all map to genuinely nullable DB columns (`nameAr`, `discountedPrice`, `featuredRank`…) on PATCH/PUT routes; partial-update semantics, NOT over-general schemas. No feature flags exist (`isDev` ×2, both meaningful). No dead `isX` constant branches found.
5. **`createDbRateLimiter` factory** — 36 instantiations across routes; a factory with many products (the ladder's complaint is one-product factories).
6. **Chart family** (6 chart components + `chart-geometry` + `chart-stats`) — deliberate zero-dependency hand-rolled kit (F-auditor's "solid" list); every component has ≥1 real consumer; `polarToCartesian`/`startOfDay`/`addDays`/`eachDateKey` are used in-file (export-key-only knip noise, per F-2).
7. **TS quality is near-pristine**: `as any` = 0 (one comment MENTIONS the phrase), `@ts-ignore`/`@ts-expect-error` = 0, `debugger` = 0, `console.*` = 1 (`global-error.tsx:21` — correct: the global error boundary cannot assume the logger module is loadable). Non-null assertions audited where concentrated (`restaurants/route.ts:279-290` `primary!` — guaranteed by the menus loop + zod `.min(1)`; guarded-by-construction, acceptable). zod `z.infer` used properly (3 sites, incl. `ProcessEnv` global augmentation); no schema↔manual-interface duplication found.
8. **Zero real TODO/FIXME/HACK comments** in src (the only `XXX` hits are `09XXXXXXXX` phone placeholders). No commented-out code blocks (the `instrumentation.ts:9-11` Sentry snippet is a DOCUMENTED env-gated seam, round86-D3 — deliberate). Comment language is coherent bilingual (~19% Arabic of 3,081 `//` lines): Arabic carries domain/UX rationale, English carries technical mechanics — consistent, not chaotic.
9. **Configs are lean and every deviation is round-tagged**: `knip.config.ts` (per-entry justifications; the two inert entries are F-3's, not re-reported), `eslint.config.mjs` (each rule-off has a rationale except `jsx-a11y/alt-text`/`no-html-link-for-pages` — cosmetic comment gap only; a11y itself is K's domain), `vitest.config.ts` (documented raise-only coverage ratchet 80/74/75/83), `tsconfig.json` (strict, noUnusedLocals/Parameters, tight excludes). No duplicated lint rules, no dead settings found beyond F-3.
10. **`needsRehash` (hash.ts:62)** — appeared dead under a truncated grep; LIVE at `login/route.ts:154` (transparent rehash). Recorded here as a grep-methodology warning: full-output verification is mandatory in this repo.

## Recommended execution order (smallest risk first)

1. O-2 + O-6 + O-10 (pure deletions, zero callers — one commit, typecheck-gated).
2. O-5, O-9, O-4 (dead branches/props with verified-3/3 and 0/7 caller evidence).
3. O-7, O-8 (two-file dedups, test-pinned).
4. O-1 (label-map unification — the only one touching behavior surfaces; run receipt tests).
5. O-3 (22-file boilerplate sweep — mechanical, do last, or fold into a React-19 ref-as-prop modernization pass).
