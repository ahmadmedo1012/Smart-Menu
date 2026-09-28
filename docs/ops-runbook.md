# Ops Runbook — Smart-Menu (menu.smart-link.ly)

> round86-D10: the project had zero data-resilience documentation. This runbook
> covers backup/restore, migration rollback, incident tools, and monitoring
> posture. It lives in docs/ and is indexed from docs/README.md.

## 1. Topology

| Layer | Provider | Notes |
|---|---|---|
| Hosting | Vercel (`smart-menu` project) | push-to-main auto-deploy; build = `db-unstick → prisma migrate deploy → prisma generate → next build` |
| Database | Neon Postgres (pooler endpoint in `DATABASE_URL`) | single logical DB `smartmenu` |
| Assets | Vercel Blob (`BLOB_READ_WRITE_TOKEN`, account-scoped) | tenant-marked paths `restaurants/{id}/…` since round86 |
| Domain | menu.smart-link.ly | HSTS + CSP live |
| Uptime | GitHub Actions `keep_alive.yml` — **19 runs/day since r117-F3** (hourly 07:00-23:00 UTC + canaries; was every-12-min until r117). ⚠️ **Actions billing-blocked since Sep 19** — see §6 deploy-block playbook | warnings surface in the Actions page summary |

## 2. Backups & restore

**Current state:** Neon Free/Standard plans include point-in-time restore
(PITR) windows — verify the current retention window in the Neon console
(Project → Settings → PITR) and record it here:

- PITR window: ___ (owner to confirm; typical: 7 days free tier / 30 days standard)
- Logical backups: NOT automated yet.

**Quarterly restore drill (owner task):**
1. Create a branch in the Neon console from a point ≥24h ago.
2. Point a local `.env` at the branch connection string.
3. Run `pnpm build && node .next/standalone/server.js`; log in as an owner
   account and place a test order.
4. Record result (date, issues) in this file.

**Recommended next step (owner decision):** a scheduled logical dump
(`pg_dump` via Neon's scheduled backups or a weekly cron) stored OUTSIDE Neon —
PITR covers logical corruption only within its window.

## 3. Migration rollback

Migrations are forward-only; `prisma migrate deploy` runs in the build chain.

**If a deploy ships a bad migration:**
1. `vercel rollback` — restores the PREVIOUS deployment's functions/statics,
   but the DB schema is already migrated. Rollback is safe only when the
   migration was additive (new column/index/table) — additive changes are the
   repo's convention (see migration 13: indexes only).
2. For a destructive-bad migration: write a NEW forward migration that undoes
   the change; never `migrate resolve` backwards in production.
3. The last-known-good deployment URL is visible in the Vercel dashboard
   (Deployments → READY, before the incident).

**Useful commands:**
```bash
DATABASE_URL=… npx prisma migrate status    # applied vs pending
DATABASE_URL=… npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma --shadow-database-url … # drift check (r121-N2: Prisma 7 flag — the old --to-schema-datamodel is Prisma 4)
```

## 4. Incident tools

| Tool | When | Command |
|---|---|---|
| `scripts/db-unstick.mjs` | P1002 advisory-lock stuck builds | `DATABASE_URL=… node scripts/db-unstick.mjs` (best-effort + non-fatal since round86; terminates only IDLE lock holders) |
| Neon console → branches | Restore drill / isolation | — |
| `scripts/qa-cleanup-check.mjs` | Verify prod test-user cleanup after QA runs | `node scripts/qa-cleanup-check.mjs` |
| Vercel logs | API 500s — structured JSON via `handleError`/logger | dashboard → Deployments → Functions logs |

## 5. Secrets rotation (owner-pending backlog)

- `TELEGRAM_BOT_TOKEN` — rotate via BotFather, update Vercel env, restart.
- `DATABASE_URL` — rotate via Neon (reset password), update Vercel env.
- `CRON_SECRET` — regenerate, update Vercel env + any cron callers.
- `BLOB_READ_WRITE_TOKEN` — regenerate in Vercel Blob settings.
After rotation: redeploy and verify `/api/health`, a Telegram broadcast test,
and one cron endpoint 401 (fail-closed).

## 6. Error tracking (currently: NONE — owner decision pending)

round86-D3 prepared the code seam: `src/instrumentation.ts` `register()` is
the hook point for Sentry (server) and `src/app/global-error.tsx` for client.
**Enabling requires a Sentry DSN** (owner account decision — no dependency was
added without a key). To activate:
1. Create the Sentry project (sentry.io) → get the DSN.
2. `pnpm add @sentry/nextjs` and run its wizard (it wires `instrumentation.ts`
   and `global-error.tsx` automatically).
3. Set `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN`) in Vercel env.
4. Until then: API 500s are visible in Vercel function logs (structured JSON).

## 7. Production data hygiene

- CI prod-QA (team1) registers throwaway users on every push to main.
  Cleanup is verified manually via `scripts/qa-cleanup-check.mjs` — wire it
  to a scheduled job when volumes grow.
- Seeding is guarded: `ci-seed.mjs` + `round83-seed.mjs` both refuse when
  `NODE_ENV=production` unless `ALLOW_SEED=true` (round86-D9).

## 8. Deploy-block playbook (r121 — the r118/r119 lessons, codified)

**Symptom**: commits pushed to `main` but production keeps serving the old SHA
(`/api/health` → `commitSha`), or the Vercel dashboard shows "Deployment was blocked".

**Cause 1 — commit author email not account-associated (the r118/r119 incident):**
Vercel's git integration refuses to identify commits authored by an email that belongs
to no GitHub account and silently blocks each deployment. Valid identities for this
repo: `ahmadmedo1012@gmail.com` and `ahmadmedo1012@users.noreply.github.com`.
Prevention: `node scripts/check-git-author.mjs` before any push (wired into the
CLAUDE.md session-resume protocol). Fix: `git config user.email ahmadmedo1012@gmail.com`
+ `git commit --amend --reset-author` for the blocked commits, then push.

**Cause 2 — account-level usage/spend limit (r114):** fix in the Vercel dashboard
(Billing → Spending limit), then redeploy `main` from Deployments.

**Cause 3 — stale concurrency entry (r102):** create a fresh deployment via the
Vercel API, then cancel the stale one.

**While GitHub Actions is billing-blocked** (since Sep 19): local gates are the ONLY
gate — `pnpm verify:fast` per batch, `pnpm verify` (+ build) before push, plus
`pnpm verify:mobile` for mobile changes. CI parity is preserved: `ci.yml` runs the
same checks and will re-engage when billing is restored.

## 9. Vercel cron jobs (vercel.json — platform-run, independent of GitHub Actions)

- `0 3 * * 0` → `/api/cron/cleanup` (weekly maintenance, maxDuration 60s)
- `0 1 * * *` → `/api/cron/subscription-expiry` (daily EXPIRED flips, maxDuration 60s)

Both are fail-closed on `CRON_SECRET`. These run on Vercel's scheduler — the GitHub
Actions billing block does NOT affect them.

## 10. Migration naming (r121 note)

`zz_round121_*` migrations sort lexicographically BEFORE `zz_round90/91/93_*`.
Harmless today (Prisma applies only pending migrations; order among pending is what
matters, and the r121 set is self-consistent — verified applied cleanly on a fresh
local DB). Future hand-written migrations should use a prefix that sorts after all
existing ones (e.g. `zzz_round122_…`) to keep the "name order == apply order" intuition.
