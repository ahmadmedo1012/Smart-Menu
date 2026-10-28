# P30 — Route Inventory (canonical verification pass)

- **Task**: P30 §4 (four-product route-inventory deliverable)
- **Repo HEAD audited**: `main @ 5cd819e8` (P29 final; unchanged in P30 so far)
- **Method**: source scan of every page under `src/app/` (route groups `(public)`/`(protected)`) + production HTTP probes on https://menu.smart-link.ly (this session) + internal-link sweep (27 links across 5 key pages, 0 broken) + sitemap reconciliation + CI battery state (triage/prod-qa/lint-build-test all green at HEAD).

## Classification legend

Valid public (VP) · Valid authenticated (VA) · Valid dynamic (VD) · Intended alias/redirect (AR) · Intentional demo/fixture (DF) · Unreachable/broken (BK) · Duplicate content (DP) · Obsolete (OB)

## Page routes

| Route | Class | Auth | Prod status | P30 verification |
|---|---|---|---|---|
| `/` (public group) | VP | none | 200 | landing — counters verified honest (P29-0: live DB counts; r82 failure-degradation policy) |
| `/pricing` | VP | none | 200 | plan ladders — unchanged |
| `/terms` `/privacy` | VP | none | 200 | cache-control contract r121 — unchanged |
| `/menu/[slug]` | VD | none | 200 known / 404 unknown | 5 real restaurants + 2 curated demos 200; unknown → 404 (the r114 soft-404 fix holds); ISR per-slug |
| `/menu/[slug]/print` | VD | none | 200 | print copy — demo titles carry تجريبي (P29-D2) |
| `/login` | VP | none | 200 | owner/admin login |
| `/owner` + 8 sub-routes | VA | session (owner) | **307 → /login?redirect=** unauth | auth gate verified on `/owner`; sub-routes (menu/menus/orders/[id]/restaurants/qr/settings/reviews/loyalty) unchanged since P19 |
| `/admin` + 11 sub-routes | VA | session (platform admin) | **307 → /login?redirect=** unauth | auth gate verified on `/admin`; admin surface (users/restaurants/orders/menu/subscriptions/telegram/audit-logs/system-events/settings/admins/qr) unchanged |
| `/cart` `/order-confirmed` `/subscribe` | VA/VP mixed | session where needed | reachable per contract | cart/order flow per P19 matrix — unchanged |
| `/[...notfound]` | BK→404 (correct) | none | 404 | verified |

## Menu-slug classification (the demo/fixture truth — P29-D1/D2 state holds)

| Slug | Class | Sitemap | Notes |
|---|---|---|---|
| `al-aseel`, `pizza-roma`, `bayane` (+2) | Real restaurants | IN | titles clean, zero demo badge (re-verified this session) |
| `al-waha-cafe` | Curated demo (landing's live demo) | IN | title «مقهى الواحة — تجريبي» + MenuHero badge (P29-D2 — re-verified in served HTML) |
| `al-waha-cafe-demo` | Curated demo (QA journey) | IN | single تجريبي (no doubling — re-verified) |
| `al-waha-cafeewewe` | **TEST FIXTURE (r96)** | **OUT** (P29-D1 gate) | page 200 by policy (exclusion = no crawl budget, never a broken link) — re-verified: sitemap 9 URLs, fixture absent |

## API routes (80+)

Grouped: auth · admin/* (admins, audit-logs, config, create-owner, events, notification-preferences, profile, reset-password, stats, subscriptions, system-events, telegram/*) · owner/* (entitlements, restaurants, reviews) · catalog (restaurants/categories/items/[id]/reviews) · orders (list/[id]/count/export) · loyalty (redeem/referral/stats) · public (featured/menu/stats) · plans · subscriptions (status/upgrade/validate) · telegram (webhook/config/test/diagnose/broadcast-targets) · whatsapp/generate · upload · media · cron (cleanup/subscription-expiry) · seed · health. — All unchanged since P19; auth/permission contracts covered by the repo's 2524-test unit battery + CI prod-qa.

## Sitemap/robots reconciliation

- `sitemap.xml` (200): exactly 9 URLs — home + pricing + terms + privacy + 3 real restaurants + 2 curated demos. **Zero unexpected entries** (the r96 fixture stays out — TEST_FIXTURE_SLUGS third gate holds).
- `robots.txt` (200): unchanged contract.

## P30 findings & gates

- **Zero new defects found** in this pass (0 broken internal links of 27 checked; auth gates verified on both `/owner` and `/admin`; the P29-D1/D2 demo/fixture truth re-verified live).
- Owner-data actions outstanding (documented, non-urgent): deactivate the prod `al-waha-cafeewewe` row entirely; purge QA orders.
- Regression gates holding: triage ✓ prod-qa ✓ lint-build-test ✓ at `5cd819e8`; sitemap fixture gates (r92-sitemap-filter) + demo-labeling pins (P29-D2) in the unit battery.
