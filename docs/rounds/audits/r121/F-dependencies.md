# Auditor F — Dependencies/Packages (r121)

**Scope:** web workspace (`/home/z/my-project/Smart-Menu`, pnpm 11.9.0, root lockfile only). `mobile/` PROTECTED (own lockfile, pnpm 10.34.5) — not audited; mobile-adjacent notes only.
**Commands run (read-only):** `pnpm knip` (exit 1 — advisory by policy, ci.yml:299-309 `continue-on-error`), `pnpm audit --prod`, `pnpm audit`, `pnpm why` (per-override), lockfile-vs-manifest programmatic diff, registry `pnpm view` for pinned packages.
**Baseline honored:** ledger dep pins (TS 7, eslint 10, motion 13, knip 6, expo 54, zod 4.6) and mobile image-size/uuid advisories are KNOWN/DEFERRED — verified at HEAD, NOT re-proposed.

**Headline: 5 findings, all P3 (0×P0/P1/P2). `pnpm audit` and `pnpm audit --prod`: 0 vulnerabilities. Zero unused dependencies. Lockfile consistent 38/38 specifiers. The dependency posture of this repo is genuinely strong; findings below are polish/debt, nothing user-facing.**

---

## Findings

### F-1 [P3] `qrcode` statically imported in SelfHostedQR — ~45KB gz ships in `/owner/qr` + `/admin/qr` client chunks, violating the repo's own round86-B8 lazy-load precedent
- Type: FACT (code-proven)
- Evidence: `src/components/shared/SelfHostedQR.tsx:1-4` — `'use client'` module with **static** `import QRCode from 'qrcode'` (used by the component at :37 and by the exported download helper `qrPngDataUrl` at :82-88). Consumers: `src/app/(protected)/owner/qr/page.tsx:19,165,273` and `src/app/(protected)/admin/qr/page.tsx:20,78,198`. Contrast — the repo already solved this exact problem once: `src/app/(protected)/owner/loyalty/ReferralQR.tsx:4-17` documents *"the qrcode lib (~45KB gz) used to ship in this page's client bundle for a single static QR render — load it on mount instead"* and does `import('qrcode')` inside `useEffect`. SelfHostedQR (r106-N2, later than round86-B8) reintroduced the static import. Verified: the public customer menu path does **not** import qrcode anywhere (only owner/loyalty, owner/qr, admin/qr, and the server-side `print/page.tsx:3`).
- Impact: technical — ~45KB gz (the repo's own measurement) added to the first-load JS of the two dashboard QR pages; `/owner/qr` is the owner's primary QR-generation flow. Not customer-facing.
- Fix (minimal, root-cause): apply the ReferralQR pattern inside SelfHostedQR's `useEffect` (`import('qrcode')` instead of the top-level import) and make `qrPngDataUrl` dynamic-import too (it is only called from user-initiated download handlers). Rendering is already post-mount async (data URL arrives via promise), so zero UX change; `data-testid="qr-code"` and e2e hooks unchanged.
- Risk: of fixing — low (import timing only); of not fixing — dashboard bundle stays inflated on a page owners open to generate their table QR codes.
- Tests required: existing e2e QR specs (match `data-testid="qr-code"`, r109 N2 evidence) + owner/qr and admin/qr page renders.

### F-2 [P3] knip: 24 fully-dead exports (zero references anywhere incl. tests) — defensible removals; the other 36 of 60 are export-keyword-redundant or shadcn surface (do NOT remove)
- Type: FACT (list) + SUGGESTION (removal)
- Evidence: knip reports 60 unused exports + 48 unused exported types. Grep-verified triage (every symbol checked across `src/`, `tests/`, `scripts/`):
  - **Fully dead — 22 unambiguous removals:**
    - 18 × `Motion*` wrappers — `src/components/ui/motion-icons.tsx:63-73,76,81-87`: `MotionPhone`, `MotionMapPin`, `MotionStore`, `MotionCrown`, `MotionAward`, `MotionGift`, `MotionMedal`, `MotionSettings`, `MotionTrendingUp`, `MotionActivity`, `MotionBarChart3`, `MotionSmartphone`, `MotionAlertTriangle`, `MotionBuilding2`, `MotionLandmark`, `MotionCreditCard`, `MotionLightbulb`, `MotionStethoscope` — zero import sites (only `MotionCheck/Plus/Minus/Search/Arrow*/Chevron*/Menu` are consumed anywhere; verified 0 matches in tests/ and mobile/).
    - `fadeUp`, `fadeUpSpring` — `src/lib/motion.ts:14-21` — zero importers; the file's own header (`:4-6`, round85-C7: "trimmed to the exports actually consumed") is now a stale claim — consumers were removed later (e.g. `SectionHeader.tsx:18-23` defines its own local `fadeUpSpring`/`fadeUpSnappy`).
    - `ANALYTICS_RANGES` — `src/lib/chart-stats.ts:3` — zero references (the `AnalyticsRange` *type* is used; the array constant is not).
    - `debug` — `src/lib/logger.ts:40-42` — zero callers (every logger import in src/ is `error`/`warn`; `log` itself is used internally at :44-52).
  - **Fully dead — 2 judgment-calls (kit surface, removal requires doc update):** `RevealImage` — `src/components/ui/clip-path-reveal.tsx:145` (referenced only by its own doc comment); `StaggeredReveal` — `src/components/ui/scroll-reveal.tsx:137` (referenced only by `src/components/ui/SCROLLCRAFT.md:23-79` as part of the documented scroll-craft kit — either delete both + update SCROLLCRAFT.md, or keep as documented kit; SUGGESTION).
  - **NOT dead — 18 flagged exports are used IN-FILE** (knip objects to the `export` keyword, not the symbol): `stepIndex` (StepIndicator.tsx:31), `useDebouncedCallback` (MenuToolbar.tsx:96), `DIETARY_LUCIDE`/`FALLBACK_DIETARY_ICON` (dietary-icons.tsx:45), `badgeVariants` (badge.tsx:45), `OwnerKpiGridSkeleton` (OwnerKpiGrid.tsx:48), `CSRF_EXEMPT` (csrf.ts:57 — **do not touch**, security config), `log` (logger.ts:44), `sendToChat` (telegram-broadcast.ts:95), `modifierOptionSchema` (modifier-schema.ts:31), `SLUG_RE` (validation.ts:97), `normalizeSlug` (validation.ts:92), `PICKUP_TYPE_META` (order-status.ts:94), `normalizeDigits` (payment-schema.ts:28), `polarToCartesian` (chart-geometry.ts:87-90), `startOfDay`/`addDays`/`eachDateKey` (chart-stats.ts:40-115). Un-exporting these is optional cosmetic polish.
  - **NOT dead — 18 are standard shadcn/base-nova compound API** (kept by upstream convention; removal = divergence for zero benefit): `CardFooter/CardTitle/CardAction`, `DialogClose/Overlay/Portal/Trigger`, `SelectGroup/Label/ScrollUpButton/ScrollDownButton/Separator`, `SheetTrigger/Close/Footer`, `TableFooter/TableCaption`, `DEFAULT_STROKE_WIDTH`.
  - The 48 unused exported **types** are prop-interface types (React convention, zero runtime/bundle cost) — noise, no action.
- Impact: technical only — dead exports are tree-shaken out of bundles; this is source hygiene + a misleading file header.
- Fix: delete the 22 unambiguous symbols; decide RevealImage/StaggeredReveal vs SCROLLCRAFT.md; optionally un-export the 18 in-file symbols.
- Risk: near-zero — all 24 verified unreferenced across src/tests/scripts/mobile.
- Tests required: `pnpm typecheck` + `pnpm test` (2006 baseline) — no test references any of these symbols.

### F-3 [P3] Stale dependency-config entries: unreachable `hono@4.13.3` release-age exemption, redundant knip `ignoreDependencies: sharp`, and 2 undocumented overrides
- Type: FACT
- Evidence:
  - `pnpm-workspace.yaml:17-18` — `minimumReleaseAgeExclude: [hono@4.13.3]`. The comment says the list is "ACTIVE (not inert)", but override `hono: ^4.13.7` (`:30`) forces every hono resolution to ≥4.13.7, so 4.13.3 can **never** be installed — the exemption is unreachable dead config. (hono itself is still a live transitive: prisma 7.8.0 → @prisma/dev 0.24.3 → @hono/node-server/hono — verified via `pnpm why`.)
  - `knip.config.ts:92` — knip's own output this session: *"Unused item in ignoreDependencies: sharp"*. sharp IS referenced in knip's project scope by `scripts/r96-convert-demo-images.mjs:5` and `scripts/r92-compress-og.mjs:26` (both knip entry files), so the ignore entry does nothing.
  - `pnpm-workspace.yaml:35-36` — `deepmerge-ts: ^8.0.1` and `valibot: ^1.4.2` are the only two overrides with **no rationale comment** (all others carry round-tags/advisory IDs). Both verified live transitives (`deepmerge-ts` via @prisma/config 7.8.0; `valibot` via @prisma/dev 0.24.3).
- Impact: technical — dead config misleads maintainers; undocumented pins invite accidental removal or blind re-bumping.
- Fix: drop the hono@4.13.3 exemption and the `sharp` ignore entry; add one-line comments for valibot/deepmerge-ts.
- Risk: none — both removals are verified inert; annotation-only for the other two.
- Tests required: `pnpm install --frozen-lockfile` still clean (no resolution change); `pnpm knip` hint disappears.

### F-4 [P3] Exact-pin overrides now hold patch releases back (postcss 8.5.26 vs latest 8.5.28; sharp 0.35.4 vs 0.35.5) and the sharp override silently rewrites package.json's caret
- Type: FACT + SUGGESTION
- Evidence: `pnpm-workspace.yaml:28` `postcss: 8.5.26` and `:37` `sharp: 0.35.4` are exact pins (advisory-era). Registry checked this session: postcss latest **8.5.28**, sharp latest **0.35.5**. `pnpm audit --prod` = 0 → nothing vulnerable today, but exact pins freeze ALL future patch fixes (including any future security patch) until a manual override bump. Additionally, lockfile importer records sharp's specifier as `0.35.4` while `package.json:43` declares `^0.35.4` — the override rewrites the specifier, so package.json's caret is misleading: a fresh resolve can never pick 0.35.5.
- Impact: technical — no user-facing impact; maintenance debt (patch fixes require manual round-trips; manifest suggests drift that cannot happen).
- Fix (choose one, smallest-diff first): (a) keep exact pins (matches the ledger's deliberate-pin philosophy) and add a "bump on advisory/round" comment; or (b) convert to floor ranges (`postcss: ^8.5.26`, `sharp: ^0.35.4`) which preserve the advisory floor while letting same-major patches flow. Either way align the sharp entry with package.json's stated intent.
- Risk: of fixing — low (same-major patch range; frozen lockfile + full gates bound the change). Of not fixing — future patch/security fixes stall silently on two pinned transitives.
- Tests required: `pnpm install --frozen-lockfile`, `pnpm build`, unit suite.
- Note: `zod: 4.3.6` exact pin is LEDGER-documented (coordinated 4.6 web+mobile deferred) — deliberately excluded from this finding.

### F-5 [P3] `@types/node` major lags the runtime: ^20 (resolved 20.19.43) vs engines `node >=24.0.0` / runtime v24.21.0
- Type: FACT
- Evidence: `package.json:53` `"@types/node": "^20"`; `package.json:87` `"engines": {"node": ">=24.0.0"}`; lockfile resolves `@types/node@20.19.43`; runtime this session `v24.21.0`; CI aligned on 24 (`.nvmrc` = `24`, ci.yml:208/536 `node-version-file: .nvmrc`, mobile job `node-version: 24`). Type surface is two majors behind the runtime the code actually executes on.
- Impact: technical — Node 22/24 APIs are untyped (tsc false negatives on newer APIs); typings for changed/removed APIs can drift from reality. No user-facing impact today.
- Fix: `"@types/node": "^24"` (devDependency-only, single-line).
- Risk: low — any mismatch surfaces immediately as `pnpm typecheck` errors (baseline tsc 0).
- Tests required: `pnpm typecheck` + unit suite.

---

## Notes (mobile-adjacent / observations — no action in this round)

- **knip "Unlisted binaries: expo, expo-doctor (.github/workflows/ci.yml)"** — false positive from the root perspective: the mobile CI job (ci.yml:475-510) resolves them from `mobile/`'s own install after `cd mobile`-scoped setup. Mobile-adjacent; noted only.
- **ci.yml:301 comment drift:** says "19 round-scripts are intentional audit-trail evidence"; knip now counts **29** unused files, all under `scripts/archive/**` (r95-* batch etc. added since). Archive retention is deliberate policy (knip.config.ts header, round92-D9) — only the comment's count is stale.
- **lucide-react maintenance headroom:** `^1.20.0` resolves 1.24.0; registry latest 1.48.0. Frozen lockfile holds current; fresh-install drift within 1.x is bounded by the 24h `minimumReleaseAge` gate. Not debt — routine caret headroom.
- **Overrides audit — all 15 entries verified LIVE against the tree** (`pnpm why` per target): hono + @hono/node-server (via prisma→@prisma/dev), mysql2 (via prisma), valibot (@prisma/dev), deepmerge-ts (@prisma/config), fast-uri (via ajv), browserslist (via @babel chain from eslint-config-next/styled-jsx), postcss (next/tailwindcss/vite), nanoid ^3.3.18 (via postcss — CJS-major pin, correct), zod 4.3.6 + knip>zod ^3.25.76 carve-out (round90-F6, still required while knip@5 pinned), brace-expansion ×2 + js-yaml (round88-B8, eslint dev chain), sharp. Only the two entries in F-3 are inert/redundant.

## Solid / verified areas (nothing to fix)

1. **`pnpm audit --prod`: 0 vulnerabilities · `pnpm audit` (incl. dev): 0** — LEDGER-VERIFIED (r120's "web 0 vulnerabilities" still holds at HEAD). Mobile image-size/uuid advisories live in mobile's separate lockfile — out of this tree, ledger-known.
2. **Zero unused dependencies/devDependencies** (knip reports none). All 22 deps + 16 devDeps verified used. The 5 knip-ignored deps are justified: `@prisma/client` (src/generated runtime), `sharp` (scripts + Next image optimization for standalone), `tw-animate-css` (`src/app/globals.css:18`), `tailwindcss`/`@tailwindcss/postcss` (CSS/PostCSS chain), `axe-core` (Playwright e2e). **No devDep is imported by runtime `src/`** (grep-verified; `dotenv`'s only import is `prisma.config.ts:1` — build-time, correct as devDep per r103-D5).
3. **Lockfile consistency: 38/38 root importer specifiers match package.json** (programmatic diff of `pnpm-lock.yaml` importers vs manifest; the single delta, sharp, is its own override rewriting the specifier — expected pnpm behavior). CI installs `--frozen-lockfile` (ci.yml:223); Vercel honors the lockfile — no drift path on fresh installs; the 24h release-age gate (round86-D7) additionally bounds lockfile-free recovery.
4. **engines/packageManager correct:** `packageManager: pnpm@11.9.0` = running pnpm 11.9.0; `engines.node >=24.0.0` = runtime v24.21.0 = `.nvmrc` 24 = CI node 24.
5. **Scripts sanity — every package.json script target exists and is wired:** build chain `db-unstick.mjs → migrate-deploy.mjs → prisma generate → next build` (all files present; both scripts' continued need is documented and real — Neon cold-start retry wrapper r98, advisory-lock cleanup round86-D1); `webhook:register`→register-webhook.mjs, `db:seed`→ci-seed.mjs, `knip`, `verify*`, `verify:mobile`. CI additionally wires check-secrets, ci-triage, ci-seed, round83-seed, qa-seed, r93-sim-seed, check-api-auth — **no dead scripts referencing removed files**.
6. **No duplicate-functionality dependencies:** one icon lib (lucide-react — the hand-rolled `*-icon.tsx` files are animated wrappers, not a second package), one state lib (zustand), zero date libs (hand-rolled `chart-stats.ts` date utils), no fetch-wrapper dep (native fetch + `src/lib/fetch-json.ts`), clsx + tailwind-merge + cva complementary by design, single QR lib (`qrcode`) since the qrserver.com retirement (r106-N2).
7. **Client-JS import hygiene clean:** lucide-react — 100% named imports, no `import *` from it anywhere (star imports only for React and generated code); `@base-ui/react` consumed via deep subpaths (`@base-ui/react/input|switch|select|separator|dialog|button|merge-props|use-render`) — tree-shakeable; sonner + next-themes are tiny and used in both public/protected layouts; motion's 45KB gzip floor is LEDGER-accepted (motion 13 upgrade deferred).
8. **zod version unification works as designed:** 4.3.6 everywhere except knip's own v3 subtree (`knip>zod` carve-out) — LEDGER-VERIFIED; the coordinated 4.6 upgrade stays deferred (ledger #11).
9. **Ledger dep pins verified at HEAD (not re-proposed):** typescript 5.9.3, eslint 9.39.5, motion 12.43.0, knip 5.46.4, zod 4.3.6 — all match the ledger's documented deliberate pins.

## knip raw output summary (for the record)

- Unused files: **29** — all `scripts/archive/**` (intentional audit-trail evidence; policy documented in knip.config.ts header + ci.yml:299-306).
- Unlisted binaries: **2** — expo/expo-doctor (mobile CI; see Notes).
- Unused exports: **60** → triaged in F-2 as 24 dead / 18 un-export-only / 18 shadcn surface.
- Unused exported types: **48** — prop-interface types, zero runtime cost, no action.
- Unused dependencies / devDependencies / unlisted dependencies: **0**.
- Configuration hint: **1** — "Unused item in ignoreDependencies: sharp" → F-3.
