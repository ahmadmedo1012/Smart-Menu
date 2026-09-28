# 15-ADV-2 — r121 worklog (FINAL ADVERSARIAL SECURITY REVIEW)

Task ID: 15-ADV-2 (final adversarial review of the r121 diff, round r121, HEAD 77407604).
Read-only task: attacked `git diff 74ef578f..HEAD` on src/app/api, src/lib, src/proxy.ts, (protected)
layouts + the r121 migrations. Only file written: `docs/rounds/audits/r121/ADV-2-security.md`.

## What was attacked (all seven headline guards + the refactor)

1. Reviews deleteMany scope — foreign-tenant reviewId on owned item, reverse direction via ladder,
   type coercion, recompute drift → **no bypass**.
2. Items destination-category guard — same-id path, undefined path, string coercion, staff path,
   POST parity, categories-move surface → **no bypass** (same-id skip is a semantic no-move).
3. Panel self-approval 403 — both verify+cancel covered (status-agnostic guard placement), panel
   UI path, both resolveSubscriptionPayment callers enumerated → **panel complete**; found the
   WEBHOOK twin still keys on the payer's linked telegram chat → **ADV2-1 [P2]** (identity split:
   approver with unlinked payer account self-approves via Telegram).
4. Reset-password staff guard — every password-writing route enumerated (users PATCH, admins
   POST/PUT, profile, seed) → **no sibling reaches a staff password**; noted users/[id] PATCH
   staff-target asymmetry → ADV2-5 [P3].
5. Login parse guard + cancelled-terminal order guard + slug reservation ×6 paths → parse guard
   clean; slug TOCTOU backstopped by unique index (fail-safe); cancelled guard has a narrow
   plain-update race → ADV2-3 [P3].
6. Server-gate refactor — requireAuth→validateSession is genuinely DB-backed (Session join User,
   expiry + 7d absolute cap): r120's E-4 fake-cookie finding CONFIRMED FIXED for /admin + /owner;
   AccessGateMeContext leaks only the caller's own post-gate role/permissions; redirects leak
   nothing to third parties.
7. csrf-shared split (byte-identical constants, zero behavior change) + VercelAnalytics gating
   (loads iff on Vercel; both layouts swapped) → clean.

## Migration audit (DB-touched, rollback-only, zero residue verified)

- CHECK/NOT NULL DDL uses full-lock form (no NOT VALID) and check_constraints runs BEFORE the
  backfill → lock/abort risk on prod Neon → ADV2-4 [P3] (pre-flight + accept, or NOT VALID pattern
  next time).
- Backfill empirically proven NON-idempotent despite its comment claiming otherwise
  (10.00→12.50→15.00 double-run, rolled back) → ADV2-2 [P3].
- Local pre-flight re-run: 0 violations for all 5 surviving CHECKs, 0 NULL arrays,
  RewardTransaction drop verified necessary (6 legit negative redeem rows).
- CHECK-vs-flows audit: every bound matches its zod twin; no legitimate flow trips them.

## Weakening sweep vs r120

None found — notes guard moved (not removed), chart-stats whitespace-only (`diff -w` proof),
proxy diff is /terms+/privacy Cache-Control only, robots index:false and denied-viewer fetch-skip
are hardening, csrfFetch retained on all mutations.

## Verification

`npx vitest run` on the three r121 security suites → 29/29 pass. Rollback-only DB scripts left
zero rows (ADV2-TEST count = 0 re-checked). No code changed, no commits.

## Output

`docs/rounds/audits/r121/ADV-2-security.md` — 0×P0 · 0×P1 · 1×P2 (ADV2-1) · 5×P3
(ADV2-2..ADV2-6), 13 guards-attacked-and-held entries, clean areas, residual accepted risks.
Recommended next actions: (1) close ADV2-1 by making the webhook self-approval check userId-aware
or routing staff-filed payments to panel-only approval; (2) fix the backfill's idempotency
comment before anyone re-applies it by hand; (3) Neon pre-flight including the negative-sum
backfill probe before the r121 deploy.
