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
| Uptime | GitHub Actions `keep_alive.yml` (every 12 min) | warnings surface in the Actions page summary |

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
  --to-schema-datamodel prisma/schema.prisma --shadow-database-url … # drift check
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
