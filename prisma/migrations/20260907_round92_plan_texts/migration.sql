-- round92-A3+A4 (agent 2-c): SubscriptionPlan feature-text data migration.
--
-- Live production evidence (menu.smart-link.ly /api/plans, agent 1-a):
--   Basic      «طلقات غير محدودة» (typo)            vs maxOrders=500
--   Premium    «أصناف غير محدودة»                    vs maxItems=100
--   Pro        «200 صنف» / «طلبات غير محدودة»        vs maxItems=9999 / maxOrders=99999
--   Enterprise «منيوهات/أصناف/طلبات غير محدودة»      vs maxMenus=10 / maxItems=9999 / maxOrders=99999
-- The subscription-guard enforces the caps (PlanLimitError) — customers hit a
-- block the pricing page promised them was unlimited (confirmed disputes).
--
-- DECISION (round92): the TEXT follows the ENFORCEMENT, never the reverse —
-- we never loosen a live cap from a marketing string. Every new text names
-- the real number («حتى N» style, matching existing entries like
-- «حتى 3 منيوهات» / «50 صنف»).
--
-- SAFETY CONTRACT (all statements):
--   * keyed by the portable plan `name` slug (Basic/Premium/Pro/Enterprise) —
--     never by environment-specific numeric ids (prod ids 86-90 ≠ local 1-2);
--   * guarded by the cap actually equalling the number we write — a future
--     plan-limit change makes the statement a no-op instead of writing a
--     wrong number;
--   * guarded by a LIKE on the affected text — fully IDEMPOTENT: re-running
--     on a fixed DB (or `migrate deploy` on a fresh seed) touches 0 rows;
--   * replace() runs on the jsonb text form; Arabic strings contain no JSON
--     metacharacters, so the round-trip ::text → replace → ::jsonb is safe.

-- (1) Basic — pure spelling fix: «طلقات» → «طلبات». Runs BEFORE (2) so the
--     typo'd line also receives the corrected limit text below.
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'طلقات غير محدودة', 'طلبات غير محدودة')::jsonb,
    "updatedAt" = now()
WHERE name = 'Basic'
  AND "features"::text LIKE '%طلقات غير محدودة%';

-- (2) Basic — orders promise ↔ enforced maxOrders=500
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'طلبات غير محدودة', 'طلبات حتى 500')::jsonb,
    "updatedAt" = now()
WHERE name = 'Basic'
  AND "maxOrders" = 500
  AND "features"::text LIKE '%طلبات غير محدودة%';

-- (3) Premium (production row) — items promise ↔ enforced maxItems=100
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'أصناف غير محدودة', 'أصناف حتى 100')::jsonb,
    "updatedAt" = now()
WHERE name = 'Premium'
  AND "maxItems" = 100
  AND "features"::text LIKE '%أصناف غير محدودة%';

-- (3b) Premium (seeded rows: ci-seed / /api/seed use the 9999 sentinel) —
--      the same lie at a different number.
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'أصناف غير محدودة', 'أصناف حتى 9999')::jsonb,
    "updatedAt" = now()
WHERE name = 'Premium'
  AND "maxItems" = 9999
  AND "features"::text LIKE '%أصناف غير محدودة%';

-- (4) Pro — «200 صنف» understates the enforced maxItems=9999
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, '200 صنف', 'أصناف حتى 9999')::jsonb,
    "updatedAt" = now()
WHERE name = 'Pro'
  AND "maxItems" = 9999
  AND "features"::text LIKE '%200 صنف%';

-- (5) Pro — orders promise ↔ enforced maxOrders=99999
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'طلبات غير محدودة', 'طلبات حتى 99999')::jsonb,
    "updatedAt" = now()
WHERE name = 'Pro'
  AND "maxOrders" = 99999
  AND "features"::text LIKE '%طلبات غير محدودة%';

-- (6) Enterprise — menus promise ↔ enforced maxMenus=10
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'منيوهات غير محدودة', 'منيوهات حتى 10')::jsonb,
    "updatedAt" = now()
WHERE name = 'Enterprise'
  AND "maxMenus" = 10
  AND "features"::text LIKE '%منيوهات غير محدودة%';

-- (7) Enterprise — items promise ↔ enforced maxItems=9999
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'أصناف غير محدودة', 'أصناف حتى 9999')::jsonb,
    "updatedAt" = now()
WHERE name = 'Enterprise'
  AND "maxItems" = 9999
  AND "features"::text LIKE '%أصناف غير محدودة%';

-- (8) Enterprise — orders promise ↔ enforced maxOrders=99999
UPDATE "SubscriptionPlan"
SET "features" = replace("features"::text, 'طلبات غير محدودة', 'طلبات حتى 99999')::jsonb,
    "updatedAt" = now()
WHERE name = 'Enterprise'
  AND "maxOrders" = 99999
  AND "features"::text LIKE '%طلبات غير محدودة%';
