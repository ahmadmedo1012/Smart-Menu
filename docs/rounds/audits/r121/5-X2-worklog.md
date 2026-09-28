# 5-X2 — r121 cross-check worklog (money/security P2 verification)

Task ID: 5-X2 (X2 CROSS-CHECKER) — adversarial verification of the r121 money-path/security P2 findings before fixing.
READ-ONLY: no code modified, no servers started; only this worklog + X2-money-security-verification.md written.

- Verified 10 finding-clusters (C-2/D-1, C-3, C-4/H-4, D-2, E-2, E-3, C-5, A-1, D-3, P-4/P-5) by full re-read of every
  cited file, git archaeology (4ba875a2 r120 diff vs b5cfa07c pre-r120 state — proved OrderItem.price stored base
  pre-r120, effective since; zz_round120 migration = maxMenus only, no backfill), live local-PG queries, and one
  read-only `prisma migrate diff` run.
- All 10 verdicts: 8 CONFIRMED, 1 CONFIRMED-with-narrowing (D-2), 1 PARTIAL (D-3 — drift real, but its "migrate diff
  drift gate flags these" impact claim is REFUTED: live `prisma migrate diff --from-config-datasource --to-schema`
  returns "No difference detected" because Prisma's diff engine cannot see array nullability).
- Mapped ALL six OrderItem.price consumers; exactly one (whatsapp/generate:132 `+ deltaSum`) still assumes base
  price; the other five assume effective. No test pins the old arithmetic (whatsapp-generate fixture is
  modifier-less; orders-create:138-160 pins the r120 writer). Backfill is load-bearing (createdAt cutoff at the
  4ba875a2 deploy, else it double-adds); no aggregate consumes Σ OrderItem.price (stats read Order.total).
- D-2 correction: the web order-detail timeline dots DO allow backward transitions (completed→ready pinned by
  order-lifecycle.test.ts:300 as deliberate); only `cancelled` is terminal in both web surfaces → minimal fix =
  cancelled-terminal guard only (survives :283/:300/:314 pins, doesn't break mobile's non-cancelled chips).
- C-3 nuance: the pending-payment dead-end has an admin-mediated escape (reject → resubmit) but no payer
  self-service; all 3 snipe paths confirmed (restaurants/[id] PUT, owner/restaurants POST, settings slug branch —
  the latter also lacks even a Restaurant-uniqueness pre-check and returns name-conflict copy on P2002).
- E-3 premise strengthened: local seeded DB HAS role='admin' id=1 username='admin' (live query); PROD Neon still
  UNVERIFIED (seed is production-hard-blocked) — flagged in report as the pre-priority check.
- A-1 trap documented: telegram-broadcast gatherTargets() is a DIFFERENT audience (linked users, no admin ids, no
  env fallbacks) — consolidating onto it would leak approval keyboards to all Telegram-linked owners. Safe path =
  new parameterized helper (msg/approveLabel/logPrefix; labels + '[upgrade]' log prefix are test-pinned).
- P-4/P-5 mechanics all verified (15s poll gated on sseOpen; banner handles rejected-only while approved events
  already flow through /api/user/events — banner fix needs zero API change; owner dead-end retry no-ops at
  owner/page.tsx:188; /api/auth/me lacks planEnd; owner/menu/page.tsx:131 generic catch vs use-item-save.ts:127
  message-surfacing on the same page).
- Interaction analysis included (8 items): C-2 fix × legacy population, D-2 × cancel-race/:300 pin, C-3+C-4 fold,
  shared restaurantFieldSchema for C-4/C-5/H-4, E-2+E-3 compound chain, A-1 consolidation trap, P-4/P-5 same
  component, D-3 zero-risk (0 NULL rows live in all 4 columns).
- Output: docs/rounds/audits/r121/X2-money-security-verification.md (10 verdicts + citations + fix approaches +
  risks + interaction map). No code changed.
