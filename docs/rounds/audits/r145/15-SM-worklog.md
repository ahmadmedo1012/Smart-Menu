# 15-SM — r145 worklog (rescue continuation: menu grid blowout + demo image density)

Task ID: 15-SM — rescue of a dead agent's uncommitted tree at HEAD `cd5d06f` (r143).
Agent: full-stack-developer (rescue). Scope: complete/audit the half-done r145 wave
(P1 sub-640 grid blowout · P2 demo image density · P3 demo test items), run full
gates, one coherent commit, no push.

## Tree state found

- 3 modified files (MenuItemCard / MenuPageClient / MenuSkeleton) + 1 new test
  (`tests/unit/r145-menu-grid-density.test.ts`) — audited line-by-line: the diff
  was COMPLETE and internally consistent (test strings match the source exactly),
  nothing half-done remained. The rescue work was therefore verification + gates
  + commit + P3 decision, not re-implementation.

## P1 — sub-640 card blowout: fix logic VERIFIED empirically

Mechanism confirmed: below `sm` the menu grids had NO explicit template → the
single implicit column track sized `auto` = max-content of the widest item; the
skipped (`content-visibility:auto`) wrappers contributed their two-axis
`contain-intrinsic-size: auto 480px` WIDTH fallback (480px) → every card
rendered 480px inside the 358px container. RTL pushes the overflow to the
viewport start: 16 + 358 − 480 = **x = −106 — the exact reported geometry**.

Fix in the diff (two independent layers):
1. Explicit `grid-cols-1` (`repeat(1, minmax(0,1fr))`) on BOTH MenuPageClient
   grids + the MenuSkeleton mirror — the track clamps to the container, so no
   item (long unbreakable Latin names included) can inflate it; the card root
   is `w-full overflow-hidden` and the name is `line-clamp-1`, so residual
   inner overflow clips instead of escaping.
2. `containIntrinsicSize: '0 auto 480px'` — width fallback 0, height fallback
   480px (one axis each); the 480px width contribution is gone at the source.

Standalone headless-Chromium repro (Tailwind-equivalent CSS, RTL container
`max-w-4xl px-4` at 390/360, skipped wrapper pushed 3000px down):

| viewport | OLD (template-less + `auto 480px`) | NEW (`minmax(0,1fr)` + `0 auto 480px`) |
|---|---|---|
| 390px | card **480px**, left edge **x = −106** (defect reproduced exactly) | card **358px**, 16 ≤ x ≤ 374 — fits, button in viewport |
| 360px | card 480px, left edge −136 | card **328px**, 16 ≤ x ≤ 344 — fits (360 edge passes) |

Available and unavailable (r135-B sold-out) cards share the same wrapper/grid,
so the fix covers the unavailable-item card class by construction.

## P2 — demo image density: sizes math VERIFIED arithmetically

r142 widened the container to `xl:max-w-6xl` (1152px) but the r140 sizes tails
still assumed the 896px container: normal tail `212px` for a real **268px**
slot (−21% → upscale even at DPR1) and featured `440px` for a real **552px**
slot. New tails in the diff are the measured slots:

- Normal ≥1280: (1152 − 32 padding − 3×16 gaps)/4 = **268px** → DPR1 fetches
  384 (1.43×), DPR2 536→**640** (2.39× ≥ 2× density); source is 800px
  (`scripts/r96-convert-demo-images.mjs`) → no upscale.
- Featured ≥1280: 2×268 + 16 = **552px** → DPR1 640, DPR2 1104→**1200** (2.17×).
- 1024–1279: normal slot (864−32)/3 = 277 → tail 288 covers; featured 571 →
  tail 576 covers. 640–1023: `calc(50vw − 24px)` exact for 2-col featured
  (md:col-span-2 does not apply below md) and `calc(100vw − 32px)` exact
  single-col below sm. No breakpoint under-covers; every DPR2 pick ≥ 2× slot.

The historical `naturalWidth 212` reading is the r143-documented double-`w`
CDN capping (~190–220px renditions) already healed by `stripRemoteImageQuery`
at the render boundary; this wave fixes the remaining optimizer-side
under-sizing so the srcset never serves below the slot again.

## P3 — demo test items «كابتشينو اختبار 2» / «TestLimitItem»: DOCUMENTED, skipped (time-box)

Repo-wide search: neither name exists in any seed script (`qa-seed.mjs`,
`round83-seed.mjs`, `ci-seed.mjs`) — they were created via the owner dashboard
against the DEPLOYED demo tenant (`al-waha-cafe-demo` on production). No safe
in-repo idempotent mechanism reaches that tenant:

- `qa-seed.mjs` creates the demo restaurant only when missing and never
  reconciles items; pointing it at production is a destructive,
  ALLOW_SEED-guarded prod mutation — not safe by the task's own bar.
- The only demo-repair API (`/api/demo/fix-images`) is hard-blocked in
  production (404) and auth-gated by design.

**Required admin action (owner dashboard, keeps order history intact):**
sign in as the al-waha-cafe-demo owner → الأصناف → delete (or mark غير متوفر
as the soft path) the two rows named «كابتشينو اختبار 2» and «TestLimitItem».
Recorded as ledger item #15 in `docs/ENGINEERING_STATE.md`.

## Gates (all local, pnpm)

- lint: **0 errors** (12 pre-existing warnings, none in touched files)
- tsc `--noEmit`: **0**
- unit: **2562/2562** (163 files; +7 = r145-menu-grid-density pins)
- parity: **237/237**
- build: **85/85** (`SKIP_ENV_CHECK=1 env -u DATABASE_URL next build` — no
  local Postgres per the documented recipe; sitemap fail-open expected;
  direct `pnpm build` aborts at migrate-deploy P1013 by fail-closed design)

Commit: one coherent Arabic-convention commit on `main`, NOT pushed.
