# S11 — Documentation & Organization Completeness Audit (r119)

**Agent:** S11 · **Round:** r119 · **Scope:** docs accuracy, env docs, onboarding, repo hygiene, API docs, licensing, agent-context, bilingual policy, artifact archival policy.
**Baseline:** repo @ `92611477` (= origin/main = production; `/api/health` commitSha verified live `92611477…`, db connected — README:7 production claim ACCURATE and current).
**Method:** every claim below verified against the working tree, git, live production, or filesystem counts. READ-ONLY — no repo files modified.

---

## Verdict in one paragraph

The doc *system* is unusually good (docs/rounds archive discipline, golden rule, indexed reference layer, excellent tests/README.md) but the **reference layer itself is 22 rounds stale**: PROJECT.md froze at r97 and doesn't know the mobile app exists; README quality-table numbers mix r97 and r118 measurements and contradict themselves; docs/README.md's index predates ENGINEERING_STATE.md and all 5 mobile docs; and 4 ENGINEERING_STATE round entries cite evidence directories that were **destroyed in container resets** (r115/r116/r117/r118). 19 verified stale/wrong statements + 3 undocumented mobile env vars; zero real "dead" env vars.

---

## 1. ACCURACY AUDIT (per document)

### 1.1 README.md — 8 findings

| # | Sev | Claim (file:line) | Reality | Fix |
|---|-----|-------------------|---------|-----|
| A1 | P2 | Vitest row `README.md:55` "1991 اختبارات في 142 ملفًا (قياس r97)" | (a) misattributed — r97 measured 1908/131 (README:145, PROJECT.md:351); 1991/142 is the r118 figure; (b) file count wrong: vitest include is `tests/unit/**/*.test.ts` only (vitest.config.ts:6) → **139 files on disk**. Test-count 1991 plausible (grep ≈1888 line-anchored cases) but unverifiable here (no node_modules) | Re-measure once (`pnpm test`), state single number + round tag |
| A2 | P2 | `README.md:55` vs `:145` | Internal contradiction: 1991 tests/142 files vs 1908 tests/131 files in the SAME file | Same as A1 |
| A3 | P2 | `README.md:56` "42 ملف سيناريو (40 e2e + 2 أمن)" | **43** files: tests/e2e = 41 (36 `.spec.ts` + 5 `.test.ts`) + tests/security = 2. r110 added `r110-payment-rejection-retry.spec.ts` (playwright.config.ts:115) after the r97 count | 41 + 2 = 43; re-run `playwright test --list` for the check count |
| A4 | P2 | `README.md:124` "Prisma 7 (24 هجرة … آخرها `20260909_round96_demo_menu`)" | **25** migration dirs; `zz_round109_required_minselect_sync` (r109) is chronologically later | "25 هجرة" |
| A5 | P2 | `README.md:136` "65 مسار API" | **66** `route.ts` files under src/app/api (matches r113's own "66-route matrix", ENGINEERING_STATE r113 entry) | 66 |
| A6 | P3 | `README.md:60` CI = "prisma migrate deploy + بذر + build + unit + E2E + انحدار QA" | ci.yml now has **4 jobs** (triage [r118], lint-build-test, mobile [r103-D6], prod-qa) + 2 more workflows (keep_alive, nightly-flake) — README omits mobile + triage entirely | Update the CI line |
| A7 | P3 | `README.md:134` `(public)/` includes "الاشتراك" | `subscribe/` lives in `(protected)/` (also login, cart, order-confirmed); `(public)/` = menu, pricing, terms, privacy, landing, [...notfound] | Fix the structure blurb |
| A8 | P4 | `.env.example:1` "# Created by Vercel CLI" | Cosmetic; file is now a curated doc with rich round-tagged comments | Replace header with a purpose line |

**Verified CORRECT (no action):** production URL live+healthy (README:7); Node 24+/pnpm 11+ web (README:67 = .nvmrc `24`, engines `>=24`, packageManager `pnpm@11.9.0`); all quick-start commands exist in package.json (`db:migrate`,`db:seed`,`test`,`test:e2e`); env constraint table matches `src/lib/env.ts` exactly (postgresql:// prefix :15, JWT≥64 :22, AUTH≥32 :29, DOMAIN z.url :23, WHATSAPP min 1 :24-26, TELEGRAM optional-default-'' :27-28, DATABASE_SCHEMA default public :30); components "~150" = 151; owner 10 pages / admin 13 pages verified; `public/demo` 28 webp ✓ (README:143); scripts/archive 35 files ✓ (docs/README:50); `pnpm db:seed` = ci-seed.mjs ✓; no screenshot links to rot ✓; admin/admin123456 seed creds ✓ (README:113-118).

### 1.2 PROJECT.md — 7 findings (the big one)

| # | Sev | Claim | Reality | Fix |
|---|-----|-------|---------|-----|
| B1 | **P1** | `PROJECT.md:3` "آخر تحديث: الجولة 97" — the whole "authoritative" reference (CLAUDE.md:7,30 delegates to it) | **22 rounds stale.** Missing entirely: the **mobile app** (Expo SDK 53/RN 0.79.6, own CI job since r103, full parity proven r114), r100-r119 history (Telegram payment-approval incident r116, deploy root-causes r117-r119, Actions billing block), CI job changes, coverage numbers | Full refresh to r119 (or split PROJECT-MOBILE.md; see §4) |
| B2 | P2 | Data Model section lists models (PROJECT.md:101-129) | Heading says 25 ✓ but **only 23 listed** — missing `UserRestaurant` (multi-menu links, r118 tenant isolation) and `SubscriptionPlan` (core of the subscription engine) — both in prisma/schema.prisma (25 `model` decls verified) | Add both with one-liners |
| B3 | P2 | Live Scripts table "23 ملفًا" (PROJECT.md:359-397) | **27 files** in scripts/ root; table missing `ci-triage.mjs` (r118, wired into ci.yml triage job) and `migrate-deploy.mjs` (r98, wired into `pnpm build` via package.json) | +2 rows, count 27 |
| B4 | P3 | "58 ملف مكتبة" (PROJECT.md:206) | src/lib = **60** files | 60 |
| B5 | P3 | `sharp@0.35.3` (PROJECT.md:345) | package.json: `^0.35.4` | bump |
| B6 | P3 | Directory tree places login/subscribe/cart/order-confirmed under "(public pages)" (PROJECT.md:150-156) | All four live under `(protected)/` (verified tree) | Redraw tree |
| B7 | P3 | Tests block "131 ملف، 1908 حالة — قياس r97 … 42 e2e" (PROJECT.md:348-357, :236) | 139 unit files / 43 e2e+security files (see A1/A3) | refresh |

**Verified CORRECT:** "لا يوجد `prisma db seed`" (PROJECT.md:78) — true, prisma.config.ts has no seed; stack/lib versions next 16.3.4, react 19.2.8, prisma ^7.8, zod 4.3.6, motion ^12, tailwind ^4 ✓; roles/auth description matches ENGINEERING_STATE stable reference; 24h session + PBKDF2 600k consistent with code claims.

### 1.3 CLAUDE.md — currency for an AI agent resuming work

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| C1 | P2 | **No pointer to `docs/ENGINEERING_STATE.md`** — the file that declares itself "the cross-session source of truth" (ENGINEERING_STATE.md:3-5). An agent starting at CLAUDE.md never learns the round history, honest ledger, deploy state, or next actions exist | CLAUDE.md:5-7 lists only PROJECT.md |
| C2 | P2 | **No mention of `mobile/`** — stack blurb (CLAUDE.md:5-6) is web-only; mobile is a blocking CI job since r103-D6 | ci.yml `mobile:` job |
| C3 | P3 | No gates commands (web tsc/lint/unit/build + mobile typecheck/lint/expo-doctor) and no worklog/audit-outside-repo protocol | gates live only in ENGINEERING_STATE "Environment / verification recipes" |
| C4 | P3 | Container-specific tool inventories embedded as repo docs: the r97-X5 "not installed" checks (CLAUDE.md:11-27, 135-160) were true for THAT container and are false for others (this container HAS gstack/agent-browser skills) — they rot on every reset | — |

### 1.4 docs/README.md (the index) — 2 findings

| # | Sev | Finding |
|---|-----|---------|
| D1 | P2 | Index predates the mobile era + ENGINEERING_STATE: header says "129 ملفًا" (actual **130** files in docs/); the "المرجعية الحية" table omits **6 files**: `ENGINEERING_STATE.md`, `mobile-deployment-status.md`, `mobile-final-report.md`, `mobile-progress.md`, `web-to-mobile/2026-09-11-web-to-mobile-plan.md` (+ its dir). A reader using the index cannot discover the mobile app's existence or the engineering log |
| D2 | P3 | `docs/mobile-progress.md:3` references `docs/web-to-mobile/smart-menu-audit.md` — **file does not exist** and was never committed (no deletion commit in history). Dangling reference |

### 1.5 docs/ENGINEERING_STATE.md — current through r119, 3 findings

| # | Sev | Finding |
|---|-----|---------|
| E1 | **P1** | **4 round entries cite destroyed evidence dirs** (container resets): r115 (`audit/r115/` a1-a6 + lighthouse, line 163), r116 (`audit/r116/`, line 195), r117 (`audit/r117/benchmark-baseline.json`, line 266), r118 (`/home/z/my-project/audit/r118/A{1..9}-findings.md`, line 200). Verified: `/home/z/my-project/audit/` contains only r105-r114 + r119. The r118 9-agent fleet's raw findings are **gone forever**; the r118 ENGINEERING_STATE record is now the only surviving digest. → §9 policy |
| E2 | P2 | "Current snapshot" CI row says "3 jobs" — ci.yml has **4** (triage, lint-build-test, mobile, prod-qa) |
| E3 | P3 | Snapshot unit-tests row "(r118 env: 137→142 files)" — vitest's only include path yields **139** files today; the 142 basis is unreproducible (likely counted pre-B5-sweep or incl. security). Pin the count basis |

**Verified CORRECT:** r119 entry (author-email root cause) matches git (`92611477` authored `Ahmed Medo <ahmadmedo1012@gmail.com>`); production now serves it (health commitSha match) — the doc is *current*, which is exactly why the reference layer below it must catch up.

---

## 2. ENV DOCUMENTATION MATRIX

### 2.1 Web (`src/` — 26 vars used; `.env.example` has 28 keys)

**Fully documented and accurate (19):** `DATABASE_URL` (env.ts:5), `JWT_SECRET` (:22), `AUTH_SECRET` (:29), `NEXT_PUBLIC_DOMAIN` (:23), `NEXT_PUBLIC_WHATSAPP_NUMBER` (:24), `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` (:27-28), `TELEGRAM_ADMIN_IDS`, `TELEGRAM_GROUP_IDS`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` (exemplary e2e-skip comment, .env.example:10-14), `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `RATE_LIMIT_RELAX` + `RATE_LIMIT_TEST_RELAX` (best-in-class comments, .env.example:36-47), `DATABASE_SCHEMA`, `DATABASE_POOL_MAX`, `SKIP_ENV_CHECK`, `TRUST_PROXY_DEPTH` (.env.example:62-72), `GIT_COMMIT_SHA` (:73-77).

**Script/test/config-only, correctly documented (6):** `ADMIN_PASSWORD` + `ALLOW_SEED` (api/seed + ci-seed), `SEED_ADMIN_USER`/`SEED_ADMIN_PASS` (scripts), `WEBHOOK_URL` (register-webhook.mjs), `SHADOW_DATABASE_URL` (prisma.config.ts:15), `E2E_SERVER_MODE` (4 e2e specs), `BASE_URL` (playwright.config.ts:30 + README:107).

**Platform-injected, no doc needed:** `NODE_ENV`, `VERCEL`, `VERCEL_GIT_COMMIT_SHA`, `GITHUB_*`, `GH_TOKEN`.

| Var | Used in | Documented | Req/Opt | Quality | Finding |
|---|---|---|---|---|---|
| `SENTRY_DSN` | src/instrumentation.ts:9 — **commented-out code only** | ❌ not in .env.example | inert | n/a | P4: delete the dead comment or document as "reserved" |
| `PORT` | nowhere in code (Next built-in) | ✓ .env.example:20 | opt | thin | P4: add "(next dev/start built-in)" note — otherwise looks dead |
| `PERF_DB_NAME` | scripts/archive/round88-perf only | ❌ (not in example) | inert | n/a | OK — archived script, no action |

**Web verdict: 0 truly undocumented live vars · 0 truly dead documented vars.** The `.env.example` is the best-maintained doc in the repo.

### 2.2 Mobile — THE GAP (P2)

`mobile/` has **no `.env.example` and no README**. Three live vars, all with hard-coded production defaults:

| Var | Used in | Documented | Default |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | mobile/src/services/api/client.ts:14 | ❌ only baked in mobile/eas.json:7,12,16 | `https://menu.smart-link.ly` |
| `EXPO_PUBLIC_DOMAIN` | OrderConfirmedScreen.tsx:19, OwnerScreens.tsx:417 | ❌ nowhere | `https://menu.smart-link.ly` |
| `EXPO_PUBLIC_WHATSAPP_NUMBER` | LoginScreen.tsx:17, FloatingWhatsApp.tsx:6 | ❌ nowhere | `+218910089975` |

Consequence: a dev cannot discover how to point a local build at `http://<LAN-IP>:3000` — the single most common mobile-onboarding need. **3 undocumented env vars.**

---

## 3. ONBOARDING PATH (clone → run → understand in 30 min?)

**Web: ~45-60 min as documented; the DB step is the dead end.**

- ✅ `pnpm install` → `cp .env.example .env` → edit (README:66-74); command names all real.
- ❌ **P2 — the local-PostgreSQL bootstrap is missing from BOTH quick-starts.** README:67 says "قاعدة PostgreSQL محلية" as a *requirement* but never says how; the answer (`bash scripts/pg-local-start.sh`, embedded-postgres, port 5434, no root/docker) lives only in PROJECT.md's scripts *table* (:374) and ENGINEERING_STATE recipes. A fresh dev stalls at `pnpm db:migrate`.
- ✅ Seeding is excellent: ci-seed (admin/admin123456), round83-seed (waha_owner/waha123456), qa-seed — documented with creds in README:113-118, PROJECT.md:71-78, and each script has a header.
- ✅ tests/README.md is the best onboarding doc in the repo (localhost-not-127.0.0.1 CSP gotcha :38, RATE_LIMIT_RELAX semantics :39-40, teams-must-serialize rule :42-45, CI job map :79-89).
- ❌ **P2 — Mobile onboarding is impossible from the docs**: no mobile/README, no root-README mention, pnpm version split (web `pnpm@11.9.0` vs mobile `pnpm@10.34.5` — intentional per ci.yml mobile-job comment, but documented only in a YAML comment), no EXPO_PUBLIC_* docs (§2.2), no "how to run against local web".
- ⚠️ P3 — Telegram webhook locally: the *route* is testable (tests/security/webhook-security + TELEGRAM_WEBHOOK_SECRET comments) and `pnpm webhook:register` exists, but there is no recipe for interactive local bot testing (webhook needs a public URL; no polling-mode/ngrok note anywhere).
- P4 — Dockerfile exists (round87-D6, node:24-alpine, well-commented) but no doc mentions a Docker path.

---

## 4. REPO STRUCTURE HYGIENE

**Root inventory (22 files / 12 dirs): fundamentally healthy.** Positives: clean git status; `.env` NOT tracked (gitignored :21,102) and contains no committed secrets in tree; `tsconfig.tsbuildinfo` untracked+ignored (:86); mobile `android/` prebuild not tracked (0 files); scripts/archive discipline (35 files, matches docs/README:50); CODEOWNERS with written rationale; workflows pinned by SHA.

| # | Sev | Finding |
|---|-----|---------|
| H1 | P3 | **docs/ root is drifting back toward pre-r96 sprawl**: 7 loose files at docs/ root, of which 5 postdate the r96 reorganization (ENGINEERING_STATE.md + 3 mobile-*.md) + web-to-mobile/ — none indexed (D1). Not broken, but the "index is the entry point" contract is broken |
| H2 | P3 | **ENGINEERING_STATE.md structural drift (274 lines)**: per its own convention, round narratives belong in `docs/rounds/closures/` — yet r112/r116/r118/r119 exist as long H2 blocks appended *after* the "Verification log" section, while the "Round history" list above them carries one-liners. Two organizing schemes coexist |
| H3 | P4 | Dual pnpm-workspace.yaml (root web config vs mobile) — intentional, but the *rationale* lives only in a ci.yml comment (mobile job, `Multiple versions of pnpm specified` trap). One line in PROJECT.md would preserve the lesson |
| H4 | P4 | `.env` and `tsconfig.tsbuildinfo` sit in the working tree (untracked/ignored) — fine; no action beyond noting the fresh-clone won't have them |
| H5 | ✅ | mobile/ IS self-contained for builds: own package.json/packageManager/lockfile/workspace/tsconfig/metro/babel/eas.json + scripts/generate-icons.py; android/ untracked. The only external dependencies are docs (in root docs/, acceptable centralization) and the root repo identity |

**docs/ org proposal (lightest-touch):** keep ENGINEERING_STATE.md as the single cross-session file (do NOT split — grep-ability beats tidiness for a working log), but (1) move the 4 long round-narrative blocks into `docs/rounds/closures/` and leave ≤5-line summaries + links in the state file; (2) add `docs/rounds/audits/` for committed fleet evidence (§9); (3) refresh docs/README.md index (D1) with a "الجوال" section; (4) fold docs/mobile-progress.md + mobile-deployment-status.md into one `docs/mobile-status.md` (both are r101-era snapshots — historical value only) or move them to rounds/history/.

---

## 5. API DOCUMENTATION (mandate: none exists — evaluate lightest path)

**Current state:** 66 route.ts files, **99 exported handlers** (GET 41 · POST 34 · DELETE 11 · PUT 10 · PATCH 3). No docs/API.md, no OpenAPI spec, no route inventory table anywhere. Zod request schemas are **inline per route** (e.g. src/app/api/orders/route.ts:28-60), not exported → runtime OpenAPI generation would require a mechanical refactor of ~66 files.

**Key enabler already in-repo:** `scripts/check-api-auth.mjs` *already* brace-parses every exported handler and classifies each as session-gated / PUBLIC_ALLOWLIST / VERB_PUBLIC_ALLOWLIST / SECRET_GATED (its header, lines 1-33, documents exactly this). The parser exists and is CI-proven.

**Proposal (P2, ~1 day):**
1. `scripts/gen-api-inventory.mjs` — fork check-api-auth's walker; emit `docs/API.md`: one table row per handler — Method | Path | Auth class (role/permission for session-gated) | Rate-limit (parse `createDbRateLimiter({…})` args) | Request schema location (file:line) | Notes.
2. Three convention sections at the top: the auth ladder (session cookie → requireAuth/requireAdmin/requirePermission; Bearer for mobile; CRON_SECRET/webhook-secret for machine routes), the response envelope (`success`/`error`/`paginated` from src/lib/api-helpers.ts), pagination helper.
3. Wire into CI as a drift gate (regenerate → `git diff --exit-code docs/API.md`), same pattern as the migration-parity gate.
4. Full OpenAPI only if an external consumer ever needs it — the inventory + inline zod covers internal needs at 5% of the cost.

---

## 6. LICENSE + ATTRIBUTION

| # | Sev | Finding |
|---|-----|---------|
| L1 | P2 | **Fonts redistributed without their license.** `public/fonts/` ships 9 woff2 subsets — Cairo (3 subsets), Readex Pro (2), Noto Naskh Arabic (2), Noto Sans Arabic (2) — all SIL OFL 1.1 fonts. No `OFL.txt` or attribution file exists anywhere in the repo (verified: no license-matching files; fonts.css has no attribution header). OFL requires the license text to accompany redistribution. **Fix:** add `public/fonts/OFL-ATTRIBUTION.md` (per-font copyright line + OFL 1.1 text/link) — 15 minutes of work |
| L2 | P3 | No LICENSE file at root. README:152-153 declares proprietary/all-rights-reserved/owner `ahmadmedo1012` (repo is private — verified remote). Internally consistent; adding a 1-line LICENSE file would make the intent tooling-visible (GitHub otherwise shows "no license") |
| L3 | ✅ | Demo food images (public/demo, 28 webp): AI-generated via the z-ai CLI — source and pipeline fully documented in-repo at scripts/r96-generate-demo-images.sh:1-25. No third-party attribution owed. P4 nicety: one line in README's structure blurb "صور مولّدة آليًا (r96)" to preempt provenance questions. (The 3 dead unsplash URLs are production *data* on al-aseel, an owner action already ledgered r110-F7 — not a repo asset issue.) |

---

## 7. CLAUDE.md UPDATE PROPOSAL (agent-resume protocol)

Add one section (~20 lines) replacing none of the existing rules:

```markdown
# Session Resume Protocol (read this before any work)
1. Read docs/ENGINEERING_STATE.md FIRST — snapshot, honest ledger, deploy state,
   next actions. It is the cross-session source of truth; PROJECT.md is the
   architecture reference (web + mobile).
2. Gates (web): pnpm typecheck && pnpm lint && pnpm test && pnpm build.
   Gates (mobile): cd mobile && pnpm typecheck && pnpm lint && npx expo-doctor.
3. Deploy = push to main → Vercel git-integration. Commit author email MUST be
   the account's verified email (r119: agent@smart-menu.dev blocked 6 commits).
4. Session artifacts (worklog.md, audit/, ad-hoc scripts/) live OUTSIDE the repo
   at /home/z/my-project/ and DIE with the container. Commit anything that must
   survive: findings → docs/rounds/audits/rN/, closures → docs/rounds/closures/.
5. Tool inventories are container-specific — verify PATH/filesystem before
   relying on any tool named below; do not trust absence claims from old rounds.
```

Plus: mention mobile/ in the stack blurb (C2), and demote the r97-X5 environment checks to a one-line "verify per container" note (C4).

---

## 8. BILINGUAL POLICY

**Current de facto:** user/owner-facing docs Arabic (README.md, docs/README.md, tests/README.md) ✓ · engineering logs English (ENGINEERING_STATE.md, ops-runbook.md) ✓ · PROJECT.md **mixed** (English skeleton + Arabic prose) — functional but inconsistent · code comments mostly English with round tags, **but 564 Arabic comment lines across 82 src files** (e.g. src/lib/env.ts:7-16, api/orders/route.ts:30-31, playwright.config.ts:60-70). Zod messages Arabic by design (they surface in the UI) ✓ correct and should stay.

**Recommendation (P3 — codify, don't rewrite):** add a 3-line policy to CLAUDE.md:
> User-visible strings, Zod messages, and owner-facing docs (README*, docs/README, tests/README): **Arabic**. Engineering state/runbooks/round records + code comments: **English**; Arabic permitted in comments only when quoting user-facing copy or explaining an Arabic-Ux decision. No mass rewrite of the existing 564 Arabic comment lines — they overwhelmingly explain Arabic-UX rationale and are fine as-is; the policy governs new writing.

---

## 9. ROUND-ARTIFACT ARCHIVAL POLICY (the r118-loss problem)

**Facts:** `audit/` and ad-hoc `scripts/` live outside the repo (`/home/z/my-project/`), tied to container lifetime. Verified today: r105-r114 + r119 survive; **r115, r116, r117, r118 are GONE** — including the entire r118 9-agent fleet's raw findings, which ENGINEERING_STATE.md:200 still cites. Only git-pushed docs survived those rounds. The container resets are not hypothetical — they are recurring (r112: "lost to the container reset"; r119 worklog: fresh container, repo 13 commits behind).

**Proposed policy (P2 — adopt as docs/README.md "اتفاقية الجولات القادمة" rule #5 + CLAUDE.md resume-protocol item 4):**

1. **Commit text evidence at round close** into `docs/rounds/audits/r{N}/` (new sibling to inspections/): agent findings .md, live-sweep outputs, gate logs, benchmark JSONs. Each file gets a 5-line header (round, date, agent, baseline commit). Text only — these files are KB-scale; the r118 fleet's 9 findings would have been ~100KB total.
2. **Heavy binaries stay OUT of the repo** (APKs, screenshots, emulator images, videos): commit SHA-256 + size + the regenerating script (the scripts are already archived in-repo — the asset is reproducible).
3. **Fix the 4 dangling references** (E1) at the next docs batch: r115/r116/r117/r118 entries should point to committed digests or explicitly read "evidence lost to container reset — this record is the surviving digest" (honest-ledger style).
4. **worklog.md** stays outside as the live session scratchpad, but its per-round Stage Summary already has a commit-home via closure reports — keep that convention and note it in the policy.
5. **Rejected alternative:** an `evidence` orphan branch — invisible to readers, adds clone complexity; acceptable only for oversized artifacts that can't be regenerated.

---

## PRIORITY REGISTER

**P1 (wrong info / lost knowledge — fix next batch):**
1. B1 — PROJECT.md 22 rounds stale; mobile app invisible in the "authoritative" reference (+B2 models, B3 scripts, B6 tree).
2. E1 — 4 ENGINEERING_STATE round entries cite destroyed evidence dirs (r115-r118); r118 fleet findings lost forever.
3. A1+A2 — README quality table self-contradictory numbers (1991/142 vs 1908/131; actual 139 files).

**P2 (gaps):**
4. §2.2 — 3 undocumented EXPO_PUBLIC_* vars; mobile/ has no README/.env.example (M-onboarding).
5. §3 — local-PG bootstrap (pg-local-start.sh) missing from both quick-starts.
6. D1 — docs/README.md index omits ENGINEERING_STATE + all mobile docs; count stale.
7. C1+C2 — CLAUDE.md lacks ENGINEERING_STATE pointer + mobile mention.
8. §5 — no API documentation; gen-api-inventory.mjs proposal.
9. L1 — OFL attribution missing for 9 redistributed font files.
10. §9 — adopt the archival policy (audits into docs/rounds/audits/).
11. A3/A4/A5 — stale counts: e2e 42→43, migrations 24→25, API routes 65→66 (README + PROJECT + tests/README:3).
12. E2 — ENGINEERING_STATE CI snapshot 3→4 jobs.

**P3 (polish):** B4 (58→60 lib files) · B5 (sharp version) · A6 (CI description) · A7 (public/protected blurb) · C3 (gates in CLAUDE.md) · C4 (container-specific tool checks) · D2 (dangling smart-menu-audit.md ref) · E3 (unit-file-count basis) · H1/H2 (docs root drift; ENGINEERING_STATE narrative blocks → closures/) · H3 (pnpm workspace rationale) · L2 (one-line LICENSE) · §8 (codify bilingual policy) · Telegram-local recipe.

**P4 (ideas):** A8 (.env.example header) · PORT/SENTRY_DSN notes · Docker path docs · README "AI-generated demo images" line · qa-cross-browser-webkit naming in README:111 · fold mobile-progress/deployment-status into one status doc.
