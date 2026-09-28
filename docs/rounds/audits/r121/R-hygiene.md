# r121 — Auditor R: Repository Hygiene / Organization

**HEAD:** `74ef578f` (r120 final) · **Mode:** read-only (no code written) · **Scope:** git state, root cleanliness, `scripts/`, `docs/` organization, `public/` assets, codebase cruft, web↔mobile boundary. `mobile/` protected — boundary checks only.

**Method:** `git status`/`check-ignore`/`ls-files` forensics; full root + `scripts/` + `public/` inventory; per-script reference trace (package.json · `.github/workflows/*.yml` · `playwright.config.ts` · knip.config.ts · tests · PROJECT.md § Live Scripts); per-asset reference trace (src · seeds · migration SQL · manifest · fonts.css); docs claim verification against measured counts at HEAD; ledger cross-check against r119-S11 findings and ENGINEERING_STATE.

**Counts: 6 findings — 0 P0 · 0 P1 · 2 P2 · 4 P3** + clean-bill list. Zero cruft found in `src/` (no stray console.log, no TODO debt, no .bak/temp, no dead duplicates). The repo is in the best hygiene shape of any round audited; every finding below is organizational polish or docs-count drift, not rot.

---

## Findings

### R-1 [P2] `scripts/` root: two r96 one-off migration harnesses are historical, kept alive only by exact-path allowlist entries
- Type: FACT (classification) + SUGGESTION (move set)
- Evidence:
  - `scripts/r96-test-migration.mjs` + `scripts/r96-test-migration-prod-sim.mjs` — one-off local proof of the `20260909_round96_demo_menu` migration (PGlite harness + prod-scenario sim). Last touched in the round96 closing commit `9fdc621b` — **25 rounds ago**, no reference from any workflow, npm script, test, or e2e spec; referenced only by `knip.config.ts:73-74` (a whitelist, not a usage) and closed-round docs.
  - The only reason they are not in `scripts/archive/` (per docs/README.md convention #3 / W5 rule) is documented in `PROJECT.md:418-423` (r97-X5 note): their exact paths are hardcoded in `FILE_ALLOWLIST` at `scripts/check-secrets.mjs:170-180` (`file: 'scripts/r96-test-migration.mjs'` / `…-prod-sim.mjs`, `id: 'pg'`, dev-only embedded-postgres default) — moving them without a paired edit would fail the CI secrets gate.
  - Contrast: the other 11 round-tagged scripts at `scripts/` root are genuinely live (full table below) — e.g. `r93-sim-seed.mjs` runs in `ci.yml:289`, `r92-e2e-local.sh` is the documented local-e2e entry point in 7+ spec headers, `r96-generate-demo-images.sh` + `r96-convert-demo-images.mjs` are the deliberately-live demo-asset pipeline (r97-X5, `PROJECT.md:413-414`).
- Impact: technical only — 2 of 27 `scripts/` root files are noise in the "live inventory" that PROJECT.md § Live Scripts maintains; the r96 migration they prove is long shipped and replayability-guaranteed (README.md:58).
- Fix (minimal, move-never-delete honored via `git mv`): the **minimal move set is exactly 2 files**, with 3 paired path edits in the same commit (precedent: the round96-W5 path updates already sitting at `check-secrets.mjs:155,161`):
  1. `git mv scripts/r96-test-migration.mjs scripts/r96-test-migration-prod-sim.mjs scripts/archive/`
  2. Update `scripts/check-secrets.mjs:170,177` file paths → `scripts/archive/…` (same `id`/`reason`)
  3. Update `knip.config.ts:73-74` entry paths (or drop the two entries — archived scripts are outside knip's `project` glob pattern `scripts/**` … note `scripts/archive/**` still matches `scripts/**`; keep entries with new paths)
  4. Update `PROJECT.md` § Live Scripts rows (:415-416) + the r97-X5 note (:418-423) to record the move
- Risk: of fixing — near-zero; the only consumer is the secrets scanner itself and both edits ship together. Of not fixing — the live-inventory doc keeps carrying dead weight and the next hygiene pass re-litigates it.
- Tests required: `node scripts/check-secrets.mjs` (local, fast) must PASS; `pnpm knip` advisory diff clean.

### R-2 [P2] README.md + tests/README.md numeric claims: r119-S11 items A1–A6/B7 still open at HEAD and drifted further in r119–r120
- Type: FACT
- Evidence (claim at HEAD vs measured at HEAD, this session):
  | Location | Claim | Measured r121 |
  |---|---|---|
  | `README.md:55` | Vitest "1991 اختبارات في 142 ملفًا (قياس r97)" | **2006 tests / 141 files** (round baseline; `find tests/unit -name '*.test.ts'` = 141) |
  | `README.md:54` | ESLint "10 تحذيرات (6+4)" | r121 baseline: **11 legacy warnings** |
  | `README.md:56` + `:145` + `tests/README.md:3` | "42 ملف سيناريو (40 e2e + 2 أمن)" | **43** = 36 `.spec.ts` + 5 `.test.ts` under `tests/e2e` + 2 `tests/security` |
  | `README.md:124` + `:144` | "24 هجرة … آخرها `20260909_round96_demo_menu`" | **27** migration dirs; chronologically last = `zz_round120_premium_maxmenus_ladder` (then `zz_round119_hotpath…`, `zz_round109…`) |
  | `README.md:136` | "65 مسار API" | **66** `route.ts` (matches docs/API.md:4 ✓) |
  | `README.md:145` + `tests/README.md:3` | "131 ملف unit (1908 اختبارًا — قياس r97)" | **141 files / 2006 tests** |
  - These are **LEDGER-VERIFIED still-open**: r119 `S11-findings.md:21-26` (A1–A6) and `:37` (B7) flagged every one of them; no fix batch has touched them since (r120 was impeccable-UX only). New drift since S11's measurement: migrations 25→27 (two `zz_` dirs added r119/r120), unit files 139→141, tests 1991→2006.
- Impact: technical — README.md is the entry doc every new engineer/agent reads first (CLAUDE.md chain); three claims in it now contradict docs/API.md and the round baseline in the same repo.
- Fix (minimal): one refresh pass at r121 close: re-measure (`find`/`playwright test --list`/`pnpm test`) and stamp every number "قياس r121" — the repo's existing as-of convention (README already stamps r97). Do NOT delete the quality-gate table; numbers only.
- Risk: of fixing — trivial (docs-only diff; `ci-triage.mjs` classifies docs-only pushes as non-code). Of not fixing — the drift compounds every round (already 5 claims × 2 files).
- Tests required: none (docs-only). Note: this is a *known* S11 item — reported here as still-open + further-drifted, not as a new discovery.

### R-3 [P3] docs/ops-runbook.md §1 Uptime row is stale on two counts (cadence + liveness)
- Type: FACT
- Evidence: `docs/ops-runbook.md:15` — "Uptime | GitHub Actions `keep_alive.yml` (every 12 min)". But (a) r117-F3 throttled keep_alive to **19 runs/day** (hourly 07:00–23:00 UTC + 01:00/04:00 canaries) — `ENGINEERING_STATE.md:301`; (b) GitHub Actions are **billing-blocked/dead since Sep 19** — every job fails in 2–3s — `ENGINEERING_STATE.md:240,294`. So the runbook's sole uptime row describes neither the current schedule nor the current reality. Not in S11's fixed/verified list (S11 verified README/PROJECT claims; ops-runbook §1 was not re-checked).
- Impact: technical — during an incident, §1 is the first table an operator reads; it points at a monitor that is not running.
- Fix (minimal): update the one row: "keep_alive.yml (hourly 07–23 UTC + 2 canaries, r117-F3) — **currently NOT running: GitHub Actions billing-blocked since 2026-09-19 (ledger, USER ACTION)**; interim monitoring = Vercel/UptimeRobot-less: `/api/health` manual + Neon self-wake (~30–40ms cold)". Keep the PITR blank line as-is (owner action, already marked).
- Risk: of fixing — none (docs-only). Of not fixing — operator confusion during the exact scenario the runbook exists for.
- Tests required: none.

### R-4 [P3] No `.gitattributes` in a cross-platform repo — 5 bash scripts exposed to CRLF corruption on Windows checkouts
- Type: FACT (absence) + SUGGESTION
- Evidence: `.gitattributes` does not exist (repo root, `ls -la`). `.editorconfig:8` declares `end_of_line = lf` — but that binds editors only, **not git checkout**. Git-for-Windows defaults `core.autocrlf=true`, which would materialize `scripts/r92-e2e-local.sh`, `scripts/r93-sim-hostile.sh`, `scripts/pg-local-start.sh`, `scripts/r95-standalone-prepare.sh`, `scripts/r96-generate-demo-images.sh` with CRLF on a Windows clone → `bash: /r: No such file` style breakage of the local e2e chain. The repo already carries Windows-history signals (`Thumbs.db`, `.idea/` ignores in `.gitignore:84,30`), so Windows clones are a real scenario.
- Impact: technical — latent; only bites a Windows contributor running the local e2e chain or producing phantom whole-file diffs.
- Fix (minimal): 3-line `.gitattributes`:
  ```
  * text=auto
  *.sh text eol=lf
  *.png binary
  ```
  then `git add --renormalize .` (expected no-op — tree is already LF per .editorconfig) and commit empty if clean.
- Risk: of fixing — low; renormalize must be verified no-op first. Of not fixing — environment-dependent breakage of documented tooling.
- Tests required: none beyond the renormalize no-op check.

### R-5 [P3] `.gitignore` blanket `*.png`/`*.svg` ignores: documented r100 sharp edge, one negation gap remains
- Type: FACT + SUGGESTION
- Evidence: `.gitignore:45` `*.png` and `:75` `*.svg` are blanket ignores; negations exist only for `public/**/*.png` (:55), `public/**/*.svg` (:57), `mobile/assets/images/*.png` (:48, added r100 after the blanket swallowed the app icons — comment :46-48). Remaining exposure: a future source PNG/SVG placed anywhere else (e.g. `src/assets/`, `docs/`, `mobile/assets/icons/`) is **silently dropped by `git add -A`** — the inverse of the classic cruft risk, and the sneakier one (no error, file just never lands). Also `.env.example` survives only because it is already tracked: `.gitignore:102` `.env*` matches it (`git check-ignore .env.example` = NOT IGNORED only because tracked; a deleted+re-added copy would be silently ignored).
- Impact: technical — latent data-loss-on-commit for future assets; already bit once (r100, documented).
- Fix (minimal, judgment): keep the blanket (it has earned its keep blocking screenshot cruft — clean status today proves it) and extend negations **when** new source-asset dirs are introduced, not speculatively. Optional 1-line hardening: `!.env.example` after :102 so the template can never be silently untracked. Not urgent.
- Risk: of fixing — negligible. Of not fixing — repeat of the r100 incident class.
- Tests required: none.

### R-6 [P3] docs/README.md index counts will be stale at r121 close (procedural reminder, per convention #5)
- Type: FACT (mid-round state) — closure action item, not a defect today
- Evidence: `docs/README.md:3` "145 ملفًا" (docs total) · `:35` "rounds/ (124 ملفًا)" · `:42` audits row "14 ملفًا". Measured now: docs = **158** files, rounds/ = **137**, audits/ = **27** (r119: 14 + r121 in-flight: 13) — the entire delta is r121's live evidence dir `docs/rounds/audits/r121/` (`.md` only, text-only per policy #5 ✓). The index header itself says "آخر تحديث للفهرس: r119" — accurate; r120 correctly added no rounds/ files (its record lives in ENGINEERING_STATE only). Also note `docs/README.md:42` says r119 = "S1–S12 + B2-M" = 14 files but the dir holds 15 (`README.md` uncounted) — off-by-one to fold into the same edit.
- Impact: technical — the index is the docs entry point; a closed round with stale counts erodes trust in it.
- Fix (minimal): at r121 close, one edit: bump the three counts + add "r121 (A–R …)" to the audits row scope column. This is the existing convention (#5), just needs a named owner in the closure batch.
- Risk: none.
- Tests required: none.

---

## scripts/ classification (27 files at root — matches PROJECT.md:383 "27 ملفًا، قياس r119" ✓; `scripts/archive/` = 35 files — matches docs/README.md:56 ✓)

**LIVE-CRITICAL — build/CI chain (9).** Breaking any = red CI or broken deploy.

| Script | Connected via |
|---|---|
| `db-unstick.mjs` | `package.json` build step 1 |
| `migrate-deploy.mjs` | `package.json` build step 2 (prod migration channel) |
| `ci-seed.mjs` | `ci.yml:266` + `nightly-flake.yml:112` + `pnpm db:seed` |
| `round83-seed.mjs` | `ci.yml:275` + `nightly-flake.yml:115` + e2e fixture contract (al-waha-cafe) |
| `qa-seed.mjs` | `ci.yml:281` + `nightly-flake.yml:118` |
| `r93-sim-seed.mjs` | `ci.yml:289` + r93-sim specs |
| `check-secrets.mjs` | `ci.yml:62` + `nightly-flake.yml:92` (first gate) |
| `ci-triage.mjs` | `ci.yml:84` (triage job, r118-A8) |
| `check-api-auth.mjs` | `ci.yml:314` (auth-guard gate) |

**LIVE-USEFUL — local tooling/ops contracts (16).**

| Script | Connected via |
|---|---|
| `r92-e2e-local.sh` | THE documented local-e2e entry (spec headers ×7, ENGINEERING_STATE, tests/README) |
| `r93-sim-hostile.sh` | real-budget local runs (`tests/e2e/r93-sim-abuser.spec.ts:14,58,79`) |
| `r95-standalone-prepare.sh` | called by `r92-e2e-local.sh` (standalone asset sync, r95-D) |
| `pg-local-start.sh` | ENGINEERING_STATE (embedded PG :5434 startup) |
| `register-webhook.mjs` | `pnpm webhook:register` |
| `qa-cleanup-check.mjs` | docs/ops-runbook.md (prod QA-residue sweep; hardened `--ids` r119) |
| `render-og.mjs` + `og-template.html` | OG regeneration pair (`render-og.mjs:33` reads the template via `import.meta.url`) |
| `r92-compress-og.mjs` | pairs with render-og (recompress og-default.png; r121-F references it) |
| `r94-db-reset.mjs` | local e2e state reset between batches (PROJECT.md:403) |
| `r97-db-check.mjs` | local mirror inspection (PROJECT.md:404) |
| `r97-admin-pass.mjs` | local mirror SEED_ADMIN_PASS alignment (PROJECT.md:405; referenced r119-S7) |
| `bundle-report.mjs` | bundle-size report (r121-G ran it this round) |
| `image-health.mjs` | image-link health checker (round91 F-C) |
| `r96-generate-demo-images.sh` + `r96-convert-demo-images.mjs` | deliberately-live demo-asset pipeline (r97-X5, PROJECT.md:413-414,418-420) |

**HISTORICAL — archive candidates (2) → R-1.**

| Script | Why historical |
|---|---|
| `r96-test-migration.mjs` | one-off proof of shipped+replayable r96 migration; untouched since `9fdc621b` (round96); only consumer = FILE_ALLOWLIST path |
| `r96-test-migration-prod-sim.mjs` | same (`ci`-nothing, workflow-nothing, test-nothing) |

## public/ assets — orphan table (46 files, 2.2 MB total; demo/ 1.4M · fonts/ 468K · images 288K)

| Asset(s) | Referenced by | Status |
|---|---|---|
| `demo/*.webp` ×28 | `prisma/migrations/20260909_round96_demo_menu/migration.sql` (28 distinct paths, exact set match — comm diff empty) | LIVE (DB-seeded demo restaurant data) |
| `fonts/*.woff2` ×9 | `public/fonts/fonts.css` `url(…)` ×9 (all) | LIVE |
| `fonts/OFL-LICENSES.md` | `README.md:159` licenses section | LIVE (license compliance) |
| `fonts/fonts.css` | `src/app/(protected)/layout.tsx` + `src/proxy.ts` | LIVE |
| `icon-192.png`/`icon-512.png` | `public/manifest.json` `src` entries | LIVE |
| `favicon.png` | `src/proxy.ts:247` allowlist + convention | LIVE |
| `apple-touch-icon.png` | `(protected)/layout.tsx` + persona-runner | LIVE |
| `brand-icon.png` | `src/components/layout/Header.tsx` + regression.test | LIVE |
| `hero-phone.webp` | `src/components/landing/HeroSection.tsx` | LIVE |
| `main21.webp` | `src/components/landing/sections/ShowcaseSection.tsx` | LIVE (name is a P4 nit — descriptive rename is churn; leave) |
| `og-default.png` | `(protected)/layout.tsx` metadata | LIVE |
| `manifest.json` | layout metadata + proxy | LIVE |
| `sw.js` | `src/components/shared/ServiceWorkerInit.tsx:8` register | LIVE |
| `offline.html` | sw fallback + `src/lib/brand.ts` sync contract | LIVE |
| `.well-known/assetlinks.json` | no code ref — Android App Links convention file (fetched at `/.well-known/assetlinks.json`, pkg `ly.smartlink.smartmenu`, 2 SHA-256 certs) | LIVE (convention-served, mobile-adjacent) |

**Orphans: 0.** No png-where-webp-exists leftovers (all demo/ is webp; remaining pngs are icon/favicon/OG by necessity). Weight: 2.2 MB total is healthy for a PWA; heaviest single = demo/ at 1.4 MB across 28 files.

## Root inventory (22 files / 15 dirs) — every entry justified

Configs: `next.config.ts` · `prisma.config.ts` (Prisma CLI autoload, knip-documented) · `knip.config.ts` · `components.json` (shadcn) · `eslint.config.mjs` · `postcss.config.mjs` · `vitest.config.ts` · `playwright.config.ts` · `tsconfig.json` · `package.json` + `pnpm-lock.yaml` + `pnpm-workspace.yaml` (allowBuilds/age-gate/overrides — no `packages:` field, so mobile stays a separate project ✓) · `vercel.json` · `.nvmrc`/`.npmrc`/`.prettierrc`/`.editorconfig` · `.env.example` (tracked template) · `.gitignore` · `.dockerignore`+`.vercelignore` · `.vscode/extensions.json` (tracked; rest of `.vscode` ignored by design) · docs: `README.md`/`PROJECT.md`/`CLAUDE.md` (all accurate in structure; numeric drift = R-2) · `Dockerfile` — maintained container escape hatch (round87-D6: node:24-alpine, pinned pnpm, non-root user, `/api/health` HEALTHCHECK); not referenced by CI/Vercel; r119-S11:116 already logged the "no documented Docker path" P4 — **LEDGER-VERIFIED, unchanged, keep as-is**. Untracked-but-present: `.env.local` (ignored ✓, local dummies), `tsconfig.tsbuildinfo` (ignored ✓), `.next/` (ignored ✓), `node_modules/` (ignored ✓). **Stray/orphaned root files: none.**

## Clean bill (verified this session)

1. **Git state pristine**: `git status` = only `?? docs/rounds/audits/r121/` (intentional, text-only per policy #5). A careless `git add -A` today would commit **nothing it shouldn't** — `.env.local`, `tsconfig.tsbuildinfo`, `.next`, `node_modules` all verified ignored; no `test-screenshots/`, `playwright-report/`, `test-results/`, `audit/`, `download/` exist inside the repo (the latter two are container-local at `/home/z/my-project/`, documented as dying with the container — docs/README.md:72-73 ✓).
2. **Zero src cruft**: 0 stray `console.log`/`debugger` (only `src/lib/logger.ts:33,36` — the structured logger itself); 0 real TODO/FIXME/HACK (only `09XXXXXXXX` phone-placeholder false-positives); 0 commented-out code blocks (the `src/instrumentation.ts:9-10` Sentry snippet is the documented round86-D3 env-gated seam); 0 `.bak/.tmp/.orig/.old/DS_Store`; 0 empty tracked files (mobile `.gitkeep` scaffolds intentional); duplicate filenames are deliberate (Next conventions + the 6-line documented `admin/KpiCard.tsx` re-export shim, round79 Stage D).
3. **Docs organization matches its own policy**: `rounds/audits/r119/` (14 findings files + README) in place ✓; r121 evidence dir in place ✓; live-reference set (ENGINEERING_STATE/API.md/ops-runbook/mobile docs/round90/reports) intact ✓; scripts/archive 35 ✓; scripts root 27 ✓; `docs/API.md` header claim "66 routes · 99 handlers" verified exact at HEAD (66 `route.ts`, 99 exported handlers) ✓.
4. **Mobile boundary tight**: no `mobile/` path references anywhere in web `src/`; no reverse web imports from `mobile/`; separate pnpm project (no workspace `packages:`); parity twins documented, not path-coupled. `.vscode/extensions.json` shared, rest ignored.
5. **Load-bearing docs accurate in structure**: `mobile/README.md` header (Expo 53 · RN 0.79.6 · Hermes) ✓; `CLAUDE.md` ✓; `PROJECT.md` § Live Scripts table = ground truth for all 27 scripts ✓ (only the 2 R-1 candidates are "live in name only"); `docs/README.md` golden rule (move-never-delete) honored — zero deleted-history evidence found, all relocations were `git mv` with paired allowlist updates (precedent at `check-secrets.mjs:155,161`).

## Ledger cross-checks

- r119-S11 A1–A6/B7 (README/PROJECT/tests-README stale counts): **LEDGER-STILL-OPEN** + further drift (R-2).
- r119-S11 P4 Dockerfile note: **LEDGER-VERIFIED holding** (unchanged, acceptable).
- ENGINEERING_STATE Actions billing-blocked + keep_alive r117-F3: **LEDGER-VERIFIED** — surfaces the R-3 runbook gap (new, not in S11's list).
- r100 `.png` blanket-ignore incident: **LEDGER-VERIFIED** documented in `.gitignore:46-48`; residual exposure assessed in R-5.

**Recommended fix order (all small, all docs/config):** R-2 + R-3 (one docs commit at close, alongside R-6 index bump) → R-1 (one move commit, 2 `git mv` + 3 path edits) → R-4 (one 3-line file + renormalize check) → R-5 (optional 1-line negation).
