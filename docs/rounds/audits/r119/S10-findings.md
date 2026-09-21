# S10 — CI/CD + Build Pipeline Deep Audit (r119)

Agent: S10 · Scope: `.github/workflows/*`, vercel.json, build health, keep-alive, versioning, branch protection, local gates · READ-ONLY.
Repo state audited: `92611477` (origin/main, first validly-authored commit post r119 email fix). GitHub Actions billing-blocked since Sep 19 — this audit is the "what happens the second billing is restored" readiness review.

---

## 0. Executive summary

The r118-B1 triage design is **correct but only 1/3 wired**: `lint-build-test` is gated on `triage.outputs.code`, but **`mobile` and `prod-qa` run on EVERY push, docs-only included** — contradicting the ci.yml header claim that "the three heavy jobs need triage" (ci.yml:17). Combined with the current audit-fleet cadence (8.1 pushes/day in Sep), restoring billing today burns **~340 Linux-minutes/day (~10,000/month)** and re-triggers the spending block in **~6-9 days** on the Free/Pro allotment (2,000/3,000 min). The other structural gap: **Vercel functions run in the default US-East (iad1) region** — ~110-130ms RTT from Tripoli — and a region move is only safe if paired with a Neon region migration (evidenced same-region co-location: warm dbLatency 3-4ms). Recommended: fra1 for both, never sin1. CI supply-chain posture (SHA-pinned actions, least-privilege tokens, timeouts everywhere) is **exemplary** — the problems are pure economics + 2 ungated jobs.

---

## 1. Workflow-by-workflow verdicts

### 1.1 `ci.yml` — CI (469 lines)

| Property | State | Evidence |
|---|---|---|
| Triggers | push[main], pull_request[main], workflow_dispatch | ci.yml:3-8 |
| Permissions | `contents: read` (least-privilege) | ci.yml:30-31 |
| Actions pinning | **ALL 5 actions SHA-pinned with tag comments** (checkout, pnpm/action-setup, setup-node, cache, upload-artifact) — excellent supply-chain posture | ci.yml:42, 112, 122-124, 138, 249, 366, 386, 394-396, 429-431, 443, 462 |
| Secrets referenced | **Only `secrets.GITHUB_TOKEN`** (ci.yml:69); all other values are inline dummies, documented as non-secrets (ci.yml:240-241, 302) | ✅ |
| Caching | `cache: pnpm` on every setup-node (ci.yml:129, 399); Playwright browsers cached with shared lockfile-hash key across LBT/prod-qa/nightly (ci.yml:137-141, 442-446, nightly:83-87) | ✅ |
| Timeouts | triage 5m (ci.yml:38), lint-build-test 45m (:86), mobile 20m (:381), prod-qa 25m (:425) — **no job lacks a timeout** | ✅ |
| Matrix | none (Playwright "projects" serve as the test matrix inside one job — no redundant legs) | ✅ |
| Artifacts | coverage 7d (:247-253), playwright-report 7d (:364-372), prod-qa 7d (:460-468), nightly 14d (nightly:250-258) — short retention, bounded storage | ✅ |

**r118 claim verification:**
- ✅ **Triage always-run**: the `triage` job has no `if` — secrets scan (ci.yml:49-50) + committed-.env guard (:52-59) fire on every push/PR, docs-only included.
- ✅ **Mixed docs+code push runs heavy jobs**: `ci-triage.mjs:80-86` classifies `code=true` if ANY file is outside `docs/` or not `*.md` → lint-build-test runs (correct fail-open design; unusable base → run everything, ci-triage.mjs:44-51; large diff ≥300 files → run everything, :75-78).
- ✅ **Self-cancel fix is structurally sound**: job-level concurrency `ci-lint-build-test-<ref>` + cancel-in-progress (ci.yml:82-84); a skipped job never joins a concurrency group, so docs-only pushes can no longer kill an in-flight code run; a superseded code run still gets cancelled.
- ❌ **"Heavy jobs skipped on docs-only pushes" is only true for 1 of 3 heavy jobs** (see P1-1 below).

### 1.2 `keep_alive.yml` — Keep Website Alive (56 lines)

- Schedule: `'0 7-23 * * *'` (17 hourly runs) + `'0 1,4 * * *'` (2 canaries) = 19/day + workflow_dispatch (keep_alive.yml:17-21). Matches the r117 claim.
- Target: `https://menu.smart-link.ly/api/health` (DB-backed — actually wakes Neon, r98-deploy-fix), `curl --max-time 30`, **fails the job on non-200** so the badge reflects reality (keep_alive.yml:43-55).
- timeout-minutes 5 (:34), concurrency `keep-alive` + cancel-in-progress (:27-29), permissions read (:24-25), no checkout (fast start). All correct.
- **Verdict**: mechanically sound; strategically mis-specified — see §5 (warmth math + no-alerting P2-1).

### 1.3 `nightly-flake.yml` — Nightly Flake Detection (259 lines)

- Schedule daily 02:30 UTC (:30-33); timeout 45m (:51); concurrency `nightly-flake` with **cancel-in-progress: false** — deliberate and documented (a superseding dispatch queues; the 2-iteration comparison IS the data) (:35-39) ✅.
- SHA-pinned actions ✅ (:73-87); secrets scan duplicated standalone (:91-92) ✅; rate-limit-bucket wipe between iterations (:185-189); verdict step can never mask a red iteration (:211-246).
- **Verdict**: well-engineered, but at ~25-35 min/day it is the **second-largest fixed minutes consumer** (~900/month) — a budget decision, not a defect (P2-3). Minor: `NODE_VERSION: "24.x"` env (:45-46) is a third, hard-coded Node source of truth (P4-3).

---

## 2. Billing-restore readiness (the simulation)

### 2.1 What runs the moment billing is fixed

Cadence evidence: 171 pushes to main Sep 1-21 (**8.1/day**; last 30 days: 189); subject split ≈ **22% docs-only / 78% code** (41 docs vs 148 non-docs in 30d).

Per-run estimates (ubuntu-latest = 1× Linux multiplier; jobs bill rounded-up-to-minute, min 1):

| Job | Trigger today | Est. billed min/run |
|---|---|---|
| triage | every push/PR | 1 |
| lint-build-test | code pushes (gated ✅) | 20-25 (install, audit, prisma parity gate, 4 seeds, lint, tsc, knip, coverage w/ ratchet, build, e2e core + deep) |
| **mobile** | **EVERY push — docs-only included (bug P1-1)** | 8-12 (full RN pnpm install hoisted + tsc + eslint + `expo export` android bundle) |
| **prod-qa** | **EVERY push to main — docs-only included (bug P1-1)** | 6-10 (install + 5 prod specs, workers=1, network-bound) |
| nightly-flake | daily | 25-35 |
| keep-alive | 19×/day | 1 each |

**Current-cadence burn**: 6.3 code × ~41 + 1.8 docs × ~19 + 30 (nightly) + 19 (keep-alive) ≈ **~340 min/day ≈ ~10,200/month**.
→ Re-block in **~6 days** on GitHub Free (2,000 included), **~9 days** on Pro (3,000). **Insta-burn confirmed** — even the two *fixed* workflows alone (keep-alive 578 + nightly ~900 ≈ 1,478) consume 74% of the Free allotment before a single CI run.

September actuals corroborate the model: 4,374 min total, of which keep-alive alone was ~2,880 (96/day × 30) — keep_alive.yml:5-7 documents this history.

### 2.2 Recommended minutes-budget policy

**Target: ≤ 1,800 min/month** (10% headroom under the 2,000 Free allotment; if on Pro 3,000, target 2,500 and keep nightly daily).

1. **Gate ALL heavy jobs on `needs: triage` + `code == 'true'`** (mobile, prod-qa — P1-1). Docs-only push cost drops from ~19 min to 1 min.
2. **Path-split web/mobile**: extend `ci-triage.mjs` to emit `web`/`mobile` outputs — most audit-round pushes are web-only; skipping mobile on web-only pushes saves ~10 min × ~80% of code pushes. (Inverse: skip web e2e on mobile-only pushes.)
3. **Execute the documented r98 split** (ci.yml:74-76 TODO): quick gates (lint/tsc/unit/audit/parity ~10 min) on every code push; build+e2e (~15-18 min) only on PRs, nightly, and manual dispatch — the fleet's direct-push model can instead run e2e on a **cap**: e.g., a `workflow_dispatch` "full CI" once per round instead of per push.
4. **Keep-alive**: external free uptime monitor (0 Actions minutes) or the 7-8/day schedule in §5 (≈ 210-240/month vs 578).
5. **Nightly-flake → weekly** (Mon 02:30 UTC): ~130/month vs ~900. The flake signal is per-commit-ish, not per-night; a weekly run still catches drift.
6. **Cadence cap**: fleet rounds already batch; keep ≤4 pushes/day target. Each avoided push saves ~40 min.
7. **Guardrails (user action)**: fix the payment method, then set an explicit **Actions spending limit** (e.g., $10 ≈ 1,250 extra Linux min at $0.008/min) so a cadence spike can never re-block the account, and enable the 75%/90% usage emails. **Do not** restore billing during an active fleet round without first landing items 1-2 — day 1 would burn ~340 min.
8. Strategic option (business decision only): public repos get free unlimited standard runners; the repo is private and carries a leaked-DB-URL history (r118 A4-P1 — rotate first regardless).

---

## 3. Vercel configuration

`vercel.json` (20 lines) contains **only**: 2 crons — `/api/cron/cleanup` Sun 03:00 UTC, `/api/cron/subscription-expiry` daily 01:00 UTC (vercel.json:2-11) — and `maxDuration: 60` for those two cron routes (:12-19). Both cron routes are correctly CRON_SECRET-gated with constant-time bearer compare (src/app/api/cron/cleanup/route.ts:8-17, subscription-expiry/route.ts:9-18). Note: Vercel only injects the Bearer if `CRON_SECRET` is set in the project env — unset ⇒ crons 401 silently (fail-closed; verify once in dashboard).

**Missing / recommendations:**

- **P2-4 Regions: absent → default `iad1` (US East)**. For Tripoli users that's ~110-130ms function RTT (static assets are edge-served regardless). **Optimal for Libya: `fra1` (Frankfurt), ~40-60ms from Tripoli** (Libyan international transit lands via Italy → Frankfurt/Marseille). `sin1` would be ~180-250ms — **do NOT use Singapore for Libya**. ⚠️ **Co-location trap**: warm `dbLatencyMs 3-4` (r117, ENGINEERING_STATE) proves Neon sits in the same region as the functions (almost certainly `aws-us-east-1`). Moving functions to fra1 **without** migrating Neon adds ~80ms to *every* DB query — a net regression for this DB-heavy app. Correct sequence: (1) verify Neon region in console (user action — not visible from repo), (2) if us-east: either stay (current ~130ms Libyan TTFB is acceptable for a menu app; assets already cached) or migrate Neon → `eu-central-1` **and** add `"regions": ["fra1"]` to vercel.json **in the same change window** → expected ~50-80ms TTFB. Never split the pair.
- **P3-2 Telegram webhook has no `maxDuration`** (src/app/api/telegram/webhook/route.ts — only `export async function POST`, :195). It performs multiple outbound Telegram API calls (each 10s-bounded per r116/r117) + DB writes; under a callback burst the default (60s under Fluid compute, 10s legacy default) is implicit and plan-dependent. Recommend explicit `export const maxDuration = 30` (or 60) for determinism, matching the cron routes' explicitness. Memory: default 1024MB is fine — no server-side sharp/qrcode anywhere in `src/app/api` (QR is client-side; upload streams to Vercel Blob with a 5MB pre-guard, upload/route.ts:10-25).
- Framework/build/install commands: intentionally absent — Vercel auto-detects Next.js and pnpm (via `packageManager: pnpm@11.9.0`, package.json:82) ✓. Build script runs `db-unstick → migrate-deploy → prisma generate → next build` (package.json:7).
- **P2-5 `prisma migrate deploy` runs against production inside every Vercel build** (package.json:7 + scripts/migrate-deploy.mjs). Two risks while CI is dead: (a) rapid successive pushes → two concurrent builds can race on `_prisma_migrations`; (b) schema edits ship to prod untested by the migration-parity gate (that gate lives only in ci.yml:163-172, currently unrunnable). Mitigation: land P1-1 + keep the parity check in the local `verify` chain (§8) until CI is restored.

---

## 4. Build health

| Check | State | Evidence |
|---|---|---|
| `.nvmrc` | `24` (major-only) | .nvmrc:1 |
| engines (root) | `>=24.0.0` | package.json:83-85 |
| CI web jobs | `node-version-file: .nvmrc` ✅ aligned | ci.yml:128, 435 |
| CI mobile job | hard-coded `node-version: 24` — duplicate source of truth (P4-4) | ci.yml:398 |
| Nightly | `NODE_VERSION: "24.x"` env — third variant (P4-3) | nightly-flake.yml:45-46 |
| Vercel build node | reads `.nvmrc` (24) — verify once in dashboard (Functions runtime may default to 22) | — |
| pnpm pinning | `packageManager: pnpm@11.9.0` (root) / `pnpm@10.34.5` (mobile) — deliberate dual-major, corepack-pinned in Dockerfile:4-6; CI action-setup reads packageManager (ci.yml:388-394) ✅ | package.json:82, mobile/package.json:6 |
| Lockfiles | exactly two: root `pnpm-lock.yaml` + `mobile/pnpm-lock.yaml`; **zero package-lock/yarn remnants** ✅ | repo scan |
| Local↔CI script parity | CI runs the same `npm run lint/typecheck/build` (ci.yml:213-217, 258); CI uses `test:coverage` (ratchet enforced) vs local `test` — the ratchet only bites in CI (P4-5) | ci.yml:238 vs package.json:13 |
| Root `.npmrc` | `legacy-peer-deps=true` — an npm-ism; pnpm ignores it, only affects `npx` calls (inert-ish, P4-6) | .npmrc:1 |
| Standalone/standalone-server | correctly conditional: `output: 'standalone'` only off-Vercel (next.config.ts:16) — e2e uses `.next/standalone/server.js`, Vercel uses native deploy (r98 fix for vercel/next.js#96646) | ✅ |

**Verdict**: alignment is strong (single Node major, pinned pnpm, single lockfile family). The drift is only in the two hard-coded Node pins (P4s) and the coverage-ratchet parity gap.

---

## 5. Keep-alive strategy — the honest math

**Goal as stated** (keep_alive.yml:12-14): "wake Neon before the first potential visitor" during Libyan peak 07:00-23:00 UTC.

**The math**: Neon autosuspend = 5 min idle. One hourly ping warms the DB for ~5 of each 60 minutes → 17 pings × 5 min = **85 warm minutes out of the 960-min peak window = 8.9% coverage**. A visitor at :06 past any hour still hits a cold DB. To truly keep it warm you'd need 12 pings/hour ≈ 192 runs/day ≈ 5,760 min/month — 2.9× the entire Free allotment. **Conclusion: 19/day is NOT effective as a warming strategy — and it doesn't need to be**: r117 measured cold self-wake at 30-40ms vs 3-4ms warm (keep_alive.yml:8-10). The warming goal is worth ~35ms on the first request of each idle gap; hourly pings buy almost nothing.

**What 19/day IS effective at**: availability monitoring (it now fails the badge on non-200, r97-X4). But **a red badge alerts nobody** — there is no notification step, and this is a private repo (P2-1).

**Recommendation (choose one):**
- **A (recommended)**: move detection to a free external uptime monitor (UptimeRobot/BetterStack — 5-min granularity, email/Telegram webhooks, 0 Actions minutes) and **delete the workflow**; optionally keep a single daily `0 6 * * *` pre-warm+canary (≈ 30 min/month) so the DB is warm for the start of the Libyan day. Saves ~578 → ~30/month *and* upgrades detection from "hourly badge nobody watches" to "5-min alerts".
- **B (stay in Actions)**: pre-heat before the actual Libyan usage blocks — breakfast/brunch 07-09 UTC, lunch 11-14 UTC, dinner/café 18-21 UTC — with `55 6,10,14,17,20 * * *` (5 pre-warms at :55) + `0 0,3 * * *` (2 canaries) = **7 runs/day ≈ 210 min/month** (−63%), each ping landing ≤5 min before a block starts. If hourly monitoring granularity is wanted more than pre-warmth, keep the current 19 but **add a failure-notification step** (e.g., a Telegram message via a new `ACTIONS_NOTIFY_TOKEN` secret — the bot infra already exists).

---

## 6. Release & versioning — current state + lightweight policy

Current: **0 git tags, 0 GitHub releases, no CHANGELOG** (verified). `package.json` version `0.1.0` (never bumped; it feeds `/api/health`'s `version` field, src/app/api/health/route.ts:66). Mobile: `version 1.0.0` in both mobile/package.json and mobile/app.json:5. Day-to-day traceability already exists and is good: `/api/health` returns `commitSha` from `VERCEL_GIT_COMMIT_SHA` (r92 deploy determinism, health/route.ts:52-67).

**Proposed lightweight policy (fits the agent-fleet cadence, zero new tooling):**
1. **Traceability = commitSha** (already live in /api/health). No per-push version churn.
2. **Milestone tags**: `git tag -a v0.2.0 -m "…" && git push --tags` at user-visible milestones only (e.g., first paying subscriber, mobile store release). GitHub auto-offers release notes from commits.
3. **Bump `package.json` version only at those tags** (it's user-visible in /api/health monitoring) — semver-ish: 0.x while pre-1.0.
4. **Mobile**: bump `mobile/app.json` `version` (+ android versionCode) on every APK/EAS release — the version is what users see in stores/support.
5. Optional: generate CHANGELOG at tag time from `git log vPrev..vHead` — no per-round maintenance.
Rationale: a full changesets/semantic-release flow would generate PRs + CI runs (minutes!) for near-zero benefit at this team size.

---

## 7. CODEOWNERS & branch protection

`CODEOWNERS` (23 lines): default rule `* @ahmadmedo1012` (everything, :9) + explicit high-blast-radius paths `/.github/workflows/`, `/scripts/`, `/prisma/` (:20-22) — matching the CSO-audit F3/F5 rationale in its header. Well-formed. **Note**: it is currently **inert** — the file itself documents that it needs branch protection ("Require review from Code Owners") to be enforceable, and the audit fleet pushes directly to main.

**Branch protection cannot be verified via API without admin** (S10 had no admin token — noted, not checked). Exact recommended settings for `main`:

*Now (zero workflow disruption — do today):*
- ☑ Block force pushes
- ☑ Block deletions
(These prevent history rewrites that would also re-trigger the Vercel author-identification class of problems.)

*Once billing is restored and CI is green on 2-3 consecutive pushes:*
- ☑ Require a pull request before merging → 1 approving review + **Require review from Code Owners**
- ☑ Require status checks to pass: `triage` + `lint-build-test` (add `mobile` if mobile work resumes cadence)
- ☑ Require branches to be up to date before merging
- ☐ Do NOT enable "require conversation resolution"/lock branch yet (solo owner + fleet friction)
- ⚠️ Budget note: switching the fleet to PRs doubles CI runs per change (PR + merge push). Either keep direct-push until human collaborators arrive (acceptable: required-checks value then comes from push-time gating), or budget ~2× CI minutes (§2).

---

## 8. Local gates — the only gate while CI is dead

CI being dead makes `lint → typecheck → test → build` the ONLY quality gate. There is **no single command chaining them** (package.json:5-22 has them separate; no Makefile; no `verify`/`gate` script — verified). The r118/r119 "Gates (local, CI parity)" lines in ENGINEERING_STATE were run manually step-by-step.

**Proposed fix for the main agent to land (one-line scripts + optional doc note):**

```json
"verify": "npm run lint && npm run typecheck && npm run test && node scripts/check-api-auth.mjs && npm run build",
"verify:fast": "npm run lint && npm run typecheck && npm run test && node scripts/check-api-auth.mjs",
"verify:mobile": "cd mobile && pnpm typecheck && pnpm lint"
```

- `verify:fast` = everything that needs no DB/network (~3-4 min) — the fleet's per-batch gate.
- `verify` adds `next build` (needs local `DATABASE_URL` — package.json:7 runs `migrate-deploy`; document that it targets the dev DB).
- `check-api-auth.mjs` is included because its CI home (ci.yml:234) is unreachable — it is offline and fast.
- Consciously NOT in the chain: `pnpm audit --prod` (network), knip (advisory), e2e (needs running server — already scripted at scripts/r92-e2e-local.sh), coverage ratchet (P4-5: consider `test:coverage` in `verify` once CI is back to keep the ratchet local too).

---

## Findings index

**P1**
1. **mobile + prod-qa jobs are NOT triage-gated — run on docs-only pushes** (ci.yml:379-385 mobile has no `needs`/`if`; ci.yml:427 prod-qa's only condition is push+main). ci.yml:17 header claim "the three heavy jobs need triage" is false for 2 of 3. Cost: ~18 wasted min per docs-only push (~1.8/day at current cadence ≈ 1,000 min/month). Fix: `needs: triage` + `if: needs.triage.outputs.code == 'true'` on both (+ path-split web/mobile per §2.2 item 2).
2. **Billing-restore insta-burn**: ~340 min/day at current cadence → re-block in ~6-9 days (§2.1). Restore billing ONLY together with P1-1 + a spending limit; apply §2.2 policy.

**P2**
1. **keep-alive failure alerts nobody** — red badge in a private repo, no notification step (keep_alive.yml:43-55). Add Telegram notify or move to external monitor (§5).
2. **Keep-alive warmth goal is mathematically ineffective** (8.9% warm coverage; cold penalty only 30-40ms) — reframe as monitoring or reschedule to pre-heat blocks (§5).
3. **Nightly-flake = ~900 min/month fixed cost** — second-largest consumer; weekly recapture saves ~770 (§2.2 item 5).
4. **No Vercel `regions` → iad1 default, ~110-130ms RTT from Libya**; correct fix is fra1 **paired with** a Neon eu-central-1 migration — never move one without the other; sin1 is wrong for Libya (§3).
5. **Production migrations run inside every Vercel build** (package.json:7) with the CI parity gate currently dead — concurrent-build race + untested-migration risk until CI returns (§3).

**P3**
1. **mobile + prod-qa lack job-level concurrency groups** — superseded runs of these two jobs always run to completion (waste); lint-build-test's group (ci.yml:82-84) should be replicated.
2. **Telegram webhook lacks explicit `maxDuration`** (route has only POST, webhook/route.ts:195) — implicit plan-dependent default for a multi-outbound-call handler; set 30-60s explicitly (§3).
3. **lint-build-test is a 20+ step monolith** (documented TODO r98, ci.yml:74-76) — any late-stage failure re-runs install/build on retry; split also enables the budget policy (§2.2 item 3).
4. **Vercel cron silently no-ops if `CRON_SECRET` env is unset** (routes fail-closed 401) — one-time dashboard verification (§3).

**P4**
1. ops-runbook.md:15 still documents keep-alive as "every 12 min" (pre-r117 schedule) — stale ops doc.
2. No CHANGELOG/tags/release policy — lightweight proposal in §6.
3. nightly-flake.yml:45-46 hard-codes `NODE_VERSION: "24.x"` instead of `.nvmrc` (third Node source of truth).
4. ci.yml:398 hard-codes `node-version: 24` in the mobile job (use `.nvmrc` or a comment-locked pin).
5. Coverage ratchet (vitest thresholds 80/74/75/83, vitest.config.ts) runs only in CI (`test:coverage`) — local `npm test` never enforces it.
6. Root `.npmrc: legacy-peer-deps=true` is npm-only config; pnpm ignores it (inert; affects only npx invocations).
7. No Dependabot config — **fine for the minutes budget** (every Dependabot PR would trigger CI); pnpm audit gate + `minimumReleaseAge: 1440` (pnpm-workspace.yaml) already cover the supply chain.
8. Verify once in Vercel dashboard: build Node = 24 (`.nvmrc`), Functions runtime, `CRON_SECRET` set, Neon region (user action — not checkable from repo).

---

## Top-3 pipeline fixes (for the main agent to land)

1. **Gate mobile + prod-qa behind triage (+ web/mobile path-split)** — the one edit that makes the r118 claim true and cuts docs-only push cost 19→1 min (P1-1).
2. **Minutes budget policy + spending limit before billing restore** (§2.2): gate heavy jobs, r98-split or cap e2e, keep-alive→external/7-per-day, flake→weekly, alert at 75%; target ≤1,800/month (P1-2, P2-1/2/3).
3. **Land `verify` / `verify:fast` / `verify:mobile` scripts** (§8) — the only gate while Actions is dead, and permanent CI parity afterward.
