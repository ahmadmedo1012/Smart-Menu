# r121 — Auditor N: Deployment / Vercel / CI (read-only)

**Scope:** `.github/workflows/*` (all 3 + CODEOWNERS) · `vercel.json` · build chain (`package.json` scripts, `scripts/db-unstick.mjs`, `scripts/migrate-deploy.mjs`, `postbuild`) · `Dockerfile` + `.dockerignore` · env contract (`.env.example` ↔ `src/lib/env.ts` ↔ all `process.env` reads) · `docs/ops-runbook.md` · header-layer precedence (`next.config.ts` ↔ `src/proxy.ts` ↔ `vercel.json`) · `.gitignore`/`.gitattributes`/hooks · git-identity durability of the r119 deploy-block fix.
**Method:** full file reads (no sampling), YAML/JSON parse verification, git-log/config inspection, fixture-usage greps for the unblock simulation. No code written, no servers started, no API calls to GitHub/Vercel.

**Parse verification:** all three workflows parse as valid YAML (python `yaml.safe_load`; jobs: `ci.yml` → triage/lint-build-test/mobile/prod-qa · `keep_alive.yml` → ping · `nightly-flake.yml` → flake-detection). `vercel.json` and `package.json` are valid JSON.

---

## 0. Billing-unblock simulation (explicit task question: does everything UNBLOCK correctly if billing is restored tomorrow?)

**Answer: YES — all three workflows resume correctly, with one documented precondition and two minor drift caveats (N-4, N-6).**

1. **ci.yml** — the first post-restore push triggers `triage`; classification uses that push's own `github.event.before` (valid SHA — failed runs during the block don't corrupt it), compare-API semantics unchanged (`scripts/ci-triage.mjs`, fail-open toward running everything: ci-triage.mjs:15-18, 44-51). `workflow_dispatch` (ci.yml:8) allows an immediate full verification run without waiting for a push. Failed runs during the block do NOT retro-execute (no backlog surprise).
2. **keep_alive.yml** — cron resumes automatically (schedules stay armed: GitHub only auto-disables schedules after 60 days of repo inactivity; pushes continued through Sep 25). `workflow_dispatch` (keep_alive.yml:35) is the r117-prescribed verification path.
3. **nightly-flake.yml** — resumes at 02:30 UTC. Verified its security+api projects have **zero references to `r93_sim`/`testmulti1568` fixtures** (grep of `tests/security`, `tests/e2e/api-sweep.test.ts`, `round86-security.spec.ts` — none), so the missing `r93-sim-seed.mjs` step (present in ci.yml:289-291, absent from nightly) does **not** break it — comment inaccuracy only (N-4). Node `24.x` == `.nvmrc` `24` today (drift risk = N-4).
4. **Vercel crons** (`/api/cron/cleanup` weekly, `/api/cron/subscription-expiry` daily — vercel.json:2-11) were never affected (Vercel platform, not GitHub Actions) and keep running through the block.
5. **Precondition (LEDGER-VERIFIED, USER ACTION pending):** keep_alive.yml:3-14 warns restoring billing **without** an explicit Actions spending limit + usage emails re-triggers the block on a cadence spike; the two scheduled workflows alone burn ~74% of the Free 2,000-min quota (keep_alive ~578/mo at 19 runs/day + nightly ~900/mo).
6. **Residual while dead (worth saying plainly):** with Actions dead since Sep 19, `keep_alive` (the only external uptime probe) is dead and Sentry is absent (ops-runbook §6: "Error tracking: NONE") — **production currently has zero automated monitoring**; an outage is invisible until a human notices. This is a consequence of the KNOWN ledger billing item, not a new finding.

**Ledger verifications in my domain:**
- GitHub Actions billing-blocked since Sep 19 — LEDGER-VERIFIED (structurally: all workflows intact, budget policy in place; live billing state not checkable from sandbox).
- keep_alive 96→19 runs/day (r117-F3) — LEDGER-VERIFIED: `'0 7-23 * * *'` (17 runs) + `'0 1,4 * * *'` (2 canaries) = 19/day (keep_alive.yml:31-32).
- Deploy history r114-r120 healthy except the author-email incident — LEDGER-VERIFIED: last 10 commits authored `ahmadmedo1012@gmail.com` / `ahmadmedo1012@users.noreply.github.com` (both account-associated); Vercel git-integration deploys per r119/r120 records.
- r119-B3 claim "`/terms` cache-control `public, max-age=3600` LIVE" (ENGINEERING_STATE.md:260) — **LEDGER-STALE**: live value is 60s since r120-W1 (cross-ref B-1; see N-6).
- Ops runbook exists and covers PITR/rollback/incidents — LEDGER-VERIFIED existing, **LEDGER-STALE in content** (N-2).

---

## Findings

### N-1 [P2] The r119 author-email deploy-block fix is manual-only: unversioned repo-local git config + a CLAUDE.md rule — no automated tripwire for the most-recurring deploy-killer
- Type: FACT (state) / SUGGESTION (guard)
- Evidence:
  - `git config --local user.email` in this clone = `ahmadmedo1012@gmail.com` (the r119 fix) — but `git config --global` in this very sandbox = `z@container`, i.e. **any fresh clone or new agent session without the repo-local override commits with a non-account-associated email and Vercel silently blocks every deployment authored by it**. The fix lives in `.git/config`, which is not versioned.
  - The only guard is the manual rule CLAUDE.md:22-26 ("Deploy rule (r119, cost: days of blocked deploys)… Verify with `git config user.email` before committing") — effective only for agents that read it, never for a human contributor or a CI-time check.
  - No hooks exist at all (`.husky/`, `lefthook.yml`, `.pre-commit-config.yaml` all absent), and no CI step validates commit authorship (moot today — CI is billing-blocked — but it would also be post-hoc: the deploy is already blocked by the time CI sees the push).
  - History: this exact class blocked deploys in r114, r116 and r118 (5 commits, days of freeze) before r119 root-caused it (ENGINEERING_STATE.md:237-239).
- Impact: technical, high-consequence — a silent full deploy freeze (production keeps serving old code while the team believes changes are live; each occurrence cost days).
- Fix (minimal, root-cause): one `scripts/check-git-author.mjs` (compare `git config user.email` against the two known-good addresses; exit 1 with the r119 story on mismatch) invoked from (a) a `prepush` npm script and (b) a documented one-liner in CLAUDE.md:22-26 next to the existing rule. Keeps the doc rule, adds an executable tripwire with zero workflow changes.
- Risk: of fixing — none (additive check). Of not fixing — recurrence in every new sandbox/clone; the incident has already repeated 3×.
- Tests required: none (script + hook wiring; verify by temporarily setting a bad email locally).

### N-2 [P2] docs/ops-runbook.md — the designated deploy-safety doc is stale on deploy-critical facts, including a broken command in the migration-rollback section
- Type: FACT (supersedes/extends R-3, which caught only the keep-alive line; the Prisma flag, deploy-block playbook and cron gaps are deploy-domain and new)
- Evidence (file last touched round86-D, 2026-09-05 — `git log` — never updated since):
  - `docs/ops-runbook.md:15` — "Uptime | GitHub Actions `keep_alive.yml` (every 12 min)". Reality: hourly since r97-X4, **19 runs/day since r117-F3** (keep_alive.yml:31-32). Two revisions stale.
  - `docs/ops-runbook.md:53-56` — the drift-check command uses `--to-schema-datamodel`, the **Prisma ≤4 flag**; Prisma 7.8 (this repo) uses `--to-schema` — the working incantation lives in ci.yml:246-248 ("documented in docs/ops-runbook.md §3" claims that comment at ci.yml:241, which is now false). An operator following §3 during an incident gets a CLI flag error.
  - No section for the **deploy-block incident class** (r114/r116/r118/r119): no detection loop guidance, no Vercel-dashboard check, no API-deploy workaround (the latter exists only in ENGINEERING_STATE.md:137).
  - No mention of the **two Vercel cron jobs** (vercel.json:2-11 — subscription-expiry runs daily 01:00 and flips PAID→EXPIRED; an operator reading the runbook's topology table wouldn't know this automation exists).
  - (Also no header-precedence doc — see N-6.)
- Impact: technical — the runbook is the incident-time source of truth (round86-D10 rationale, indexed from docs/README.md); its monitoring topology is wrong, one command is broken, and its top incident class is undocumented.
- Fix (minimal): doc-only update — §1 line 15 (19 runs/day + "currently dead pending billing fix", = R-3's fix), §3 flag fix (`--to-schema`, mirroring ci.yml:246-248), + two short sections (deploy-block playbook incl. the author-email root cause; Vercel crons table). ~30 lines, no code.
- Risk: none (documentation). Of not fixing — wrong recovery actions during the next incident.
- Tests required: none.

### N-3 [P3] Dockerfile is a dead deploy path: it cannot build since r98 moved `migrate-deploy` into the build chain (no env plumbing), and nothing but docs references it
- Type: FACT
- Evidence:
  - `Dockerfile:21` — `RUN npx prisma generate && npm run build`. `npm run build` = `db-unstick → migrate-deploy → prisma generate → next build` (package.json:7). In the Docker builder stage there is **no `DATABASE_URL`** (no `ARG`/`ENV` declares any env; `.dockerignore:15-17` excludes `.env`/`.env.*`): `prisma.config.ts:10` (`env("DATABASE_URL")`) throws at config load → `migrate-deploy.mjs` exits non-zero (non-transient, migrate-deploy.mjs:99-102) → `docker build` fails. Even with a DB URL, `next build` would next fail `validateEnv()` — `JWT_SECRET`(64)/`AUTH_SECRET`(32)/`NEXT_PUBLIC_DOMAIN`/`NEXT_PUBLIC_WHATSAPP_NUMBER` are required in production mode (env.ts:22-29, 52-59; db.ts:25) and none are plumbed.
  - Last touched round87-D (2026-09-06, `git log`); referenced only by 7 docs files (rg `Dockerfile`), never by CI or Vercel. Vercel git-integration is the real deploy path (ENGINEERING_STATE).
  - **Disagreement with R-auditor noted:** R's clean-bill line calls the Dockerfile "maintained r87-D6 escape hatch (S11-P4 LEDGER-VERIFIED)" — true only for its base-image/pnpm pinning; r98's build-chain change postdates the Dockerfile's last touch and broke buildability (no env plumbing, above). "Maintained" ≠ "buildable" — buildability is the deploy-relevant test, and it fails.
  - `.dockerignore:1-19` also misses `db/` (local embedded-PG data dirs), `mobile/` (large RN tree), `download/`, `screenshots/`, `test-screenshots/` — `COPY . .` (Dockerfile:20) would pull all of them into the builder context. And `.dockerignore:3` lists `.gitattributes` — a file that does not exist (see N-8).
- Impact: technical — 38 lines of dead-but-buildable-looking infra; the ledger even notes "/api/upload chunked bypass… a self-hosted Docker deployment would need a stream limit" (ledger #13), i.e. Docker is a *contemplated* future path that currently ships broken.
- Fix (minimal, root-cause = decide): either delete `Dockerfile` + `.dockerignore` (with a runbook/ledger note "self-hosted path removed; revisit as a project"), or wire `ARG DATABASE_URL/JWT_SECRET/AUTH_SECRET/NEXT_PUBLIC_DOMAIN/NEXT_PUBLIC_WHATSAPP_NUMBER` + `ENV` passthrough and fix the ignore list. Deletion is the smaller diff; wiring is the honest option only if self-host is actually planned.
- Risk: of deleting — loses a starting point for self-hosting (recoverable from git history). Of keeping broken — someone trusts it during an emergency (e.g. Vercel outage) and burns time.
- Tests required: if kept — one clean-context `docker build` with dummy build-args in a sandbox round.

### N-4 [P3] nightly-flake.yml drifted from ci.yml's conventions: Node pin not migrated to `.nvmrc`, and its "IDENTICAL seed set" claim is stale
- Type: FACT
- Evidence:
  - `nightly-flake.yml:45-46` defines `NODE_VERSION: "24.x"` and `:78-80` uses `node-version: ${{ env.NODE_VERSION }}` — the pre-r97-X4 pattern. ci.yml migrated to `node-version-file: .nvmrc` (ci.yml:206-209, 534-537; r97-X4). nightly-flake.yml was last touched 2026-09-08 (git log), *before* that migration — it was simply missed. Same major today (`.nvmrc` = `24`), so no immediate break; a future `.nvmrc` bump silently leaves the nightly (and any Node-version-sensitive flake verdicts) on the old major.
  - `nightly-flake.yml:107-111` claims "IDENTICAL seed set as ci.yml's e2e leg" — but ci.yml seeds four fixtures (ci-seed, round83-seed, qa-seed, **r93-sim-seed** — ci.yml:285-291) and the nightly runs only the first three (nightly-flake.yml:112-120). Verified harmless for its suites (no `r93_sim`/`testmulti1568` references in the security/api projects' files), but the comment overstates parity and the drift will bite if a security/api spec ever needs an r93 fixture.
  - Same pattern, third instance: the mobile job hardcodes `node-version: 24` (ci.yml:490) instead of `node-version-file: .nvmrc` (its siblings at ci.yml:208/536).
- Impact: technical — version-drift risk + a false in-file claim (the file's own methodology depends on baseline parity being true).
- Fix (minimal): nightly-flake.yml: replace the `env.NODE_VERSION` indirection with `node-version-file: .nvmrc` (one step edit, delete the env block); ci.yml:490 → `node-version-file: .nvmrc`; fix the nightly comment to "same seed set as ci.yml's security/api baseline (r93 fixtures are qa-teams-only)".
- Risk: none (same resolved version today; .nvmrc is the documented single source of truth).
- Tests required: one dispatch run of each workflow after the edit (billing-dependent — fold into the post-restore verification).

### N-5 [P3] SKIP_ENV_CHECK bypasses env validation with no production tripwire — the only thing stopping it on Vercel is a comment
- Type: SUGGESTION (hardening; semantics verified)
- Evidence:
  - `src/lib/db.ts:25` — `if (!process.env.SKIP_ENV_CHECK) validateEnv();` — the sole call site of `validateEnv()`. The bypass runs **regardless of `NODE_ENV` or `VERCEL`**: the production-mode hard-throw lives *inside* the skipped function (env.ts:52-59), so `SKIP_ENV_CHECK=true` on a Vercel environment would let a misconfigured deploy (short/missing `JWT_SECRET`, missing `AUTH_SECRET`) build and boot silently, then fail at runtime in `keys.ts:8` derivations with far worse error messages.
  - The only guard is documentation: `.env.example:60-61` ("CI/embedded-postgres local runs only — NEVER in production"). Nothing code-level prevents the variable from being set on Vercel (settings are the sole path — it cannot "leak" by itself; verified no workflow or script exports it: only ci/e2e set `RATE_LIMIT_TEST_RELAX`, never `SKIP_ENV_CHECK`).
  - Contrast: `RATE_LIMIT_TEST_RELAX` got an explicit, code-reviewed gating story (rate-limit.ts:55-56 + a 9-line warning in .env.example:39-47); `SKIP_ENV_CHECK` — which disables *all* validation including the production throw — has none.
- Impact: technical — low probability (requires a human setting it on Vercel), medium consequence (config errors surface at runtime instead of build time, exactly the failure mode round90-F6 built the early-throw to prevent).
- Fix (minimal): one line at db.ts:25 — e.g. `if (process.env.SKIP_ENV_CHECK) { if (process.env.VERCEL) logWarn('SKIP_ENV_CHECK is set on a Vercel deployment — env validation disabled (never intended for production)'); } else validateEnv();` (additive warning, keeps the documented local/CI escape hatch fully intact; no validation deleted).
- Risk: none (a log line). Of not fixing — a copy-paste from CI env into Vercel settings ships an unvalidated production.
- Tests required: one unit test asserting the warning path (or none, if the team prefers log-only).

### N-6 [P3] vercel.json's only header rules are dead config since r120-W1 — and the r119 ledger records them as live (deploy-side cross-check of B-1)
- Type: FACT (cross-ref B-1 — not double-counted; my layers: vercel.json + ledger accuracy + precedence documentation)
- Evidence:
  - `vercel.json:23-42` — the file's entire `headers` block is `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` for `/terms` + `/privacy` (added r119-B3, commit b1a1a1a0).
  - `src/proxy.ts:47-56` — r120-W1 added both paths to `isCacheablePage`; `proxy.ts:156-159` stamps every such response `public, max-age=60, s-maxage=60, stale-while-revalidate=86400`. B-auditor live-proved the middleware value wins on production (`curl -I /terms` → 60s) — the vercel.json rules have been **dead config for both of the only routes they cover** since 4ba875a2 (r120).
  - The routes themselves still `export const revalidate = 3600` (terms/privacy page.tsx:8) — so the ISR cadence (1h) and the served header (60s) now disagree with both vercel.json (1h) and ENGINEERING_STATE.md:260 ("LIVE VERIFICATION… `/terms` cache-control `public, max-age=3600`" — **LEDGER-STALE**).
  - Precedence across the three header layers (next.config.ts `headers()` ↔ proxy.ts ↔ vercel.json) is documented only in scattered code comments (next.config.ts:88-91 for the security-header overlap; proxy.ts:149-155 for Vercel-vs-dynamic Cache-Control) — never in one place, and the vercel.json↔proxy.ts interaction is documented nowhere (JSON cannot carry comments; the runbook doesn't cover it — ties to N-2).
- Impact: technical — three sources claim three stories for the same two routes; the next round touching caching (or a self-hosted deploy where the middleware header sticks differently, cf. B-7) starts from wrong documentation.
- Fix (minimal, root-cause): land whichever side B-1's fix chooses, then sync the other two: (a) if 3600 wins → per-path value in the proxy branch AND keep vercel.json; (b) if 60s wins → delete the two vercel.json rules and correct ENGINEERING_STATE.md:260. Either way, add a 5-line "header layers & precedence" note to the runbook (or next.config.ts's existing header comment) naming the three layers and who wins on Vercel.
- Risk: none (config/comment sync). Of not fixing — continued drift; dead rules get cargo-culted to new routes.
- Tests required: the /terms cache-control e2e assertion B-1 already proposes (one test covers both findings).

### N-7 [P3] Env contract gap: `NEXT_PUBLIC_APP_URL` is read by the print page but documented nowhere
- Type: FACT
- Evidence:
  - `src/app/(public)/menu/[slug]/print/page.tsx:66` — `process.env.NEXT_PUBLIC_APP_URL ?? 'https://menu.smart-link.ly'` (QR target on the printable sheet). Absent from `.env.example` (all 77 lines read) and from the `envSchema` (env.ts:4-35, which validates neither it nor documents its existence).
  - Full sweep of every `process.env.*` read in `src/` (60+ hits): **every other variable is documented in `.env.example`** (DATABASE_*, JWT/AUTH_SECRET, NEXT_PUBLIC_DOMAIN/WHATSAPP_NUMBER, TELEGRAM_* family incl. ADMIN_IDS/WEBHOOK_SECRET/GROUP_IDS/BOT_USERNAME, CRON_SECRET, BLOB_READ_WRITE_TOKEN, SEED_*/ALLOW_SEED/ADMIN_PASSWORD, WEBHOOK_URL, SHADOW_DATABASE_URL, RATE_LIMIT_*, E2E_SERVER_MODE, DATABASE_POOL_MAX, TRUST_PROXY_DEPTH, GIT_COMMIT_SHA) — this is the single gap. (L-auditor independently flagged the same var from the SEO/origin-fallback angle — noted as L's URL-origin landmine; not double-counted here, this is the env-contract/deploy view.)
  - Build-time vs runtime split verified correct: `NEXT_PUBLIC_DOMAIN`/`NEXT_PUBLIC_WHATSAPP_NUMBER` are inlined into the client bundle at build (Footer.tsx:11, FloatingWhatsApp.tsx:18) AND validated at server boot (env.ts) — CI correctly supplies them at both build and standalone-server runtime (ci.yml:343-344 vs 371-372), which is exactly why the standalone e2e server works.
- Impact: technical — a self-hoster or staging deploy can't discover the QR-origin override without reading source; the fallback masks it in production (so no user-facing bug).
- Fix (minimal): one commented line in `.env.example` (optional var, fallback documented), next to the NEXT_PUBLIC_ group. Optionally add to envSchema as `.optional()`.
- Risk: none.
- Tests required: none.

### N-8 [P3] Deploy-surface hygiene: no `.gitattributes` (54 tracked binaries, phantom `.dockerignore` reference), triage `.env`-guard filename coverage, zero commit hooks
- Type: FACT (cross-ref R-4 — same missing file from the CRLF angle; my slice is binary-diff policy + the phantom reference + CI-guard coverage; not double-counted)
- Evidence:
  - `.gitattributes` **does not exist** (verified: `wc` ENOENT) while `git ls-files` tracks **54 binary assets** (`.ttf/.woff2/.png/.webp/.mp4/.ico/.avif`) — no binary merge/diff policy and no EOL normalization; `.dockerignore:3` even lists the nonexistent file. (Low-stakes: Linux-only contributors, single-branch flow — but the file is referenced as if it existed.)
  - ci.yml's committed-env guard checks only 4 filenames — `git ls-files '.env' '.env.local' '.env.prod' '.env.development'` (ci.yml:66) — missing `.env.production`/`.env.staging`/`.env.test`. `.gitignore:102` (`.env*`) blocks accidental adds, and `check-secrets.mjs` content-scans every git-known file for token/DB-URL patterns — but a force-added `.env.production` containing, say, a raw `JWT_SECRET` (no pattern match) would slip the guard. Defense-in-depth polish only.
  - No commit hooks of any kind (`.husky/`, `lefthook.yml`, `.pre-commit-config.yaml` absent; package.json has no prepare/hook scripts) — the N-1 author-email tripwire and the local-gate discipline (`verify`/`verify:fast`, package.json:22-24) are entirely opt-in commands.
- Impact: technical — latent hygiene risk; no user-facing effect.
- Fix (minimal): add a 3-line `.gitattributes` (`*.ttf/*.woff2/*.png/*.webp/*.mp4/*.ico -diff` + `* text=auto`), extend the ci.yml guard glob list with `.env.production` `.env.staging` (2 tokens), drop `.gitattributes` from `.dockerignore` (or create the file). Hooks: covered by N-1's proposed script (don't add a hook framework for one check).
- Risk: none.
- Tests required: none.

---

## Solid areas (verified with evidence — keep as-is)

1. **ci.yml triage architecture (r118-A8-P1/r119-B5):** job-level concurrency on all three heavy jobs (ci.yml:162-164, 469-471, 524-526) + skipped-jobs-never-enter-groups — the r112/r113 self-cancel incident is structurally impossible; docs-only pushes cost ~1 min; both classifiers fail-open toward *running* (ci-triage.mjs:15-18, 44-51; mobile inline mirror ci.yml:119-151 with the same 250-commit/300-file truncation guards).
2. **Supply-chain hardening:** every `uses:` across both install-bearing workflows is full-SHA-pinned with the tag + a documented upgrade recipe (`git ls-remote … ^{}`) at ci.yml:182-191; keep_alive uses zero actions.
3. **Least privilege + secrets:** `permissions: contents: read` on all three workflows (ci.yml:41-42, keep_alive.yml:38-39, nightly-flake.yml:42-43); the only secret referenced anywhere is `secrets.GITHUB_TOKEN` (triage compare); every CI dummy value is annotated as public/non-secret (ci.yml:374-382, 389-388 region; nightly-flake.yml:147-151). No literal secrets in any workflow.
4. **Budgets/timeouts/retention:** timeout-minutes on every job (5/45/20/25/5/45); artifacts 7d (coverage, playwright ×2, prod-qa) and 14d nightly (documented cross-night comparison rationale); keep_alive budget-policy header is exemplary ops documentation.
5. **Caching:** pnpm store via `setup-node cache: pnpm` in all install jobs (mobile correctly uses `cache-dependency-path: mobile/pnpm-lock.yaml`, ci.yml:492); Playwright browsers cached with a shared key scheme so prod-qa hits the same entry (ci.yml:539-547).
6. **Build-chain resilience (the r97/r98 deploy-fix chain):** `db-unstick.mjs` is non-fatal by design (91-96: catch → "UNSTICK SKIPPED", letting `migrate deploy` own real failures) and **still needed** — the stale-advisory-lock scenario it treats (killed builds holding P1002 locks, incl. the refined idle-in-transaction ≥5-min rule, lines 55-68) remains real while the 8.1-pushes/day cadence keeps cancelling in-flight Vercel builds; `migrate-deploy.mjs` retries only genuinely transient codes (43-62), aborts fast on schema drift/SQL errors (99-102) — correct fail-closed semantics for Neon cold-start (documented r97 root cause) without masking real migration bugs.
7. **Failed-migration deploy safety:** the `&&` chain (package.json:7) means a failed migration fails the *build* → Vercel marks the deployment ERROR → **the previous production deployment keeps serving** (zero-downtime by construction); rollback story is forward-only + `vercel rollback` guidance (runbook §3, still accurate on this point).
8. **Vercel crons:** exactly 2 (within Hobby limits), both routes fail-closed on `CRON_SECRET` with timing-safe bearer compare (subscription-expiry route:11-17); `maxDuration: 60` consistent in both vercel.json:12-18 and the route exports; webhook `maxDuration: 15` (r119-B3) LEDGER-VERIFIED.
9. **vercel.json is minimal and healthy otherwise:** no framework/regions overrides (auto-detect fine), no build settings clobbering package.json, valid JSON, no secrets.
10. **Git integration:** push-to-main deploys; author identity fixed r119 and verified account-associated at HEAD (last 10 commits); `output: standalone` correctly disabled on Vercel to dodge the 16.3.x onBuildComplete bug (next.config.ts:4-16) while local/e2e keep standalone.
11. **Env contract breadth:** `.env.example` is 77 lines documenting every required/optional/runtime/test var with per-var rationale comments — the single gap is N-7; the `env -u DATABASE_URL` unit-test isolation (package.json:13-15) and the two env-gated test files are known and intentional (r116 note).

## Cross-references to other auditors
- **B-1 (terms/privacy 60s, live-proven):** confirmed from the deploy side — vercel.json rules dead since r120-W1, r119 ledger claim LEDGER-STALE (N-6). No double-count; fix must sync 3 places (proxy value ↔ vercel.json ↔ ENGINEERING_STATE:260).
- **R-3 (runbook keep-alive line):** N-2 absorbs it and adds the Prisma-flag fix, deploy-block playbook and cron-doc gaps (deploy-domain).
- **R-4 (no .gitattributes):** N-8 cross-refs; adds the 54-binary diff-policy angle + the `.dockerignore:3` phantom reference.
- **R's "Dockerfile = maintained escape hatch":** contested by N-3 with build-chain evidence (env plumbing missing since r98) — flagging explicitly so the lead doesn't ship R's clean-bill claim unqualified.
- **G-3 (upload/demo images max-age=0):** next.config.ts headers layer has no rule for those paths — consistent with G's finding; nothing in vercel.json conflicts.
- **L (NEXT_PUBLIC_APP_URL origin landmine):** same variable as N-7 — env-contract view vs SEO view; fix is one `.env.example` line either way.
- **B-4/B-7 (dead `/landing` entry; print-route cache prefix):** proxy-layer items; noted, no deploy-layer duplication.

## Not verifiable from sandbox (marked, not guessed)
- Branch protection on `main` (needs GitHub API — explicitly out of scope per round rules). Given push-to-main auto-deploys + dead CI, branch protection status is the one repo-side setting that would matter most once billing returns — recommend the user confirm "Require status checks" is OFF while CI is dead (or accept blocked merges) and revisit after restore.
- Whether production `DATABASE_URL` is the Neon pooler or direct endpoint (runbook:12 claims pooler). Advisory-lock semantics (`pg_advisory_lock` session locks in db-unstick.mjs:83-86, Prisma migrate) through a transaction-mode pooler are unreliable by design; 20 rounds of clean migrate-deploys suggest it works in practice (likely session-mode or direct), but the runbook claim is UNVERIFIED — worth a one-line confirmation next Neon-console visit. (No action asked of this round.)
- Live Vercel dashboard state (deploy concurrency, env vars actually set) — token invalid per r117/r118; git-integration behavior is the only observable, and it is healthy.
