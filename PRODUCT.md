# PRODUCT.md — «الربط الذكي | Smart Menu»

> Context file for design/UX work (impeccable `init` output, r121). Product truths only — no
> invented data (r82 honesty policy is absolute). Update when the product changes.

## What this is

RTL-first Arabic SaaS for the Libya market: restaurants get a QR-table digital menu, diners order
through WhatsApp, owners run everything from a dashboard. Currency: د.ل (Libyan dinar).
Order rails: WhatsApp (customer invoice) + Telegram (payment approval by staff). No Stripe —
payment is bank-transfer + human approval by design.

## Who uses it

- **Diner** (العربية، الهاتف أولاً): scans a QR at the table, browses, orders. No account, no
  login — name + phone at checkout only. The product must be instant on a 3G phone.
- **Restaurant owner** (العربية، قد لا يملك حاسوباً): manages menus/items/prices/availability
  from the owner dashboard, watches orders arrive (chime + polling), prints menus with QR,
  runs loyalty + referrals. Daily driver is the phone.
- **Platform staff** (admin panel): approves subscription payments (Telegram keyboard or panel),
  manages users/restaurants, configures Telegram.

## Surfaces → design modes (impeccable)

| Surface | Mode | Rule of thumb |
|---|---|---|
| Landing `/` + `/pricing` | **Persuade** | Earn attention and action; distinct committed identity (dark flame world, QR-corner motif); every claim must be TRUE |
| Public menu `/menu/[slug]` | **Operate-with-brand** | Scannability + speed first; brand lives in the flame CTA, QR-corner, showcase |
| Owner `/owner/**` + Admin `/admin/**` | **Operate** | Density, consistency, native expectations; marketing ambience only as a thin header accent |
| `/subscribe` | **Persuade → Operate** | Sells the plan, then behaves like a form |

## Product contracts that must never drift

- **Money format (r120)**: `formatPrice` smart default — `12 → «12 د.ل»`, `7.25 stays «7.25»`.
  Explicit `decimals` is reserved for receipts (2) and sanctioned documents. Never round a
  price for display.
- **Prices are server-truth**: every order total is re-priced server-side; client prices are
  display-only. `OrderItem.price` stores the EFFECTIVE unit price (base + modifier deltas, r120+).
- **Quantity cap 99** per item, enforced at API + store + DB CHECK (r121).
- **Cancelled orders are terminal** (r121): status transitions among live statuses are free
  (including deliberate backward fixes), but `cancelled` is one-way.
- **Language**: Arabic-first, real Arabic copy (never machine-stiff), Western digits
  (`format.ts` canon), Arabic pluralization via the CLDR classifier (no `Intl.PluralRules` —
  Hermes). English appears only in proper nouns.
- **No fabricated anything**: no invented stats, no fake testimonials, no invented brand names,
  no features that don't exist (r82 policy; r121 removed the last violations).

## The honest capability list (as shipped)

Digital QR menus · WhatsApp order receiving with full Arabic invoice · pickup types
(داخل المكان / سفري / توصيل) · item modifiers (groups, required/optional, min/max) ·
loyalty stamp cards + redeem · referral program · subscription plans (monthly, 4 tiers,
plan-capped menus/items) · bank-transfer payment + Telegram approval · owner dashboard with
live orders + stats + QR printing · admin panel · PWA (installable, offline shell) ·
public marketing site with a **scannable demo QR** (hero → `/menu/al-waha-cafe-demo`).

NOT shipped (never claim): reservations/table booking · diner accounts or phone login ·
online card payments · English UI.
