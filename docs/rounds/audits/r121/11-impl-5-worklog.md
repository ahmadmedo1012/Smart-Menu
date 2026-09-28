# 11-impl-5 — r121 worklog (MARKETING/LANDING — scroll-craft + impeccable)

Task ID: 11-impl-5 (IMPL-5, engineering round r121, MASTER-BACKLOG items #33-#37 + I-8 + P-7 under the
landing honesty umbrella).
Code-writing task: 5 fix clusters on the landing surface — fabricated-claims removal (P-2), yearly-toggle
removal (P-1), testimonials/partners fiction removal (P-3), the hero scannable-QR signature (P's signature
idea + P-7 net-zero swap), and a restraint pass that ended in mostly-restraint.

Verification: `pnpm typecheck` 0 errors · `pnpm test` 148 files / 2152 tests ALL PASS (final state; see
attribution note below) · eslint clean (exit 0) on every touched file · standalone-server smoke on a fresh
production build of HEAD+my-changes (isolated worktree — the shared tree carried IMPL-1b's in-flight
build-breaking edits): landing renders the QR mount (`data-testid="hero-demo-qr"`, caption, demo link) and
NONE of the removed fabrications; /pricing renders zero yearly anything. NO git commit.

## What shipped (fix-by-fix)

1. **#33 / P-2 — fabricated features (FeaturesSection)**: «حجز وانتظار» (no reservation feature exists —
   PickupType enum is inside/takeaway/delivery only, X1-verified) → «داخل المكان · سفري · توصيل» (the r120
   unified cart labels); «تسجيل دخول العملاء برقم الجوال بخطوة واحدة» (diners never log in) → card
   retitled «بدون تسجيل للزبون» / «الطلب باسم ورقم الجوال فقط، بلا حسابات ولا خطوات إضافية» — the TRUE
   zero-friction selling point. r121 round-tag comments cite the evidence chain.
2. **#34 / P-1 — yearly toggle (PricingClient)**: removed in full — the «سنوي · وفّر 17%» capsule toggle,
   the ×10 `displayPrice` branch, the `/السنة` label branch, «وفر شهرين عند الاشتراك السنوي», and
   `YEARLY_SAVINGS_PCT`. Plans are monthly-only, honestly priced (`/الشهر`); the price-swap entrance
   animation survives (static, runs once in-view). Grep-verified: zero yearly references remain anywhere in
   src outside explanatory comments; /subscribe and the landing never echoed the fiction. The ui-sweep /
   full-sweep e2e pricing regexes still match the served page (verified against the standalone HTML).
3. **#35 / P-3 — testimonials/partners fiction (ClientsSection DELETED)**: the whole section (8 invented
   partner names incl. real trademarks Telepizza/SOHO/Kubaba, 7 invented 5-star quotes, and the trust strip
   whose «ضمان استرداد» is another unverifiable claim) is gone: file deleted, unmounted from HomePage,
   orphaned `AvatarInitials.tsx` deleted (its only consumer), landing-data.ts knip comment updated. NO
   replacement block: the honest social proof already lives in StatsSection (live API counts) +
   FeaturedRestaurantsSection (real DB restaurants) immediately above — adding a mid-page join-CTA would
   have duplicated FinalCTASection's job (scroll-craft: a section that serves no beat is cut).
4. **#36 / P signature + P-7 — hero QR (HeroSection)**: the blurred decorative QrCornerMark behind the
   phone is replaced by a REAL scannable QR — existing `SelfHostedQR` (dynamic qrcode import, client-safe)
   encoding `${NEXT_PUBLIC_DOMAIN}/menu/al-waha-cafe-demo` (house env pattern; inlined at build; prod =
   https://menu.smart-link.ly/menu/al-waha-cafe-demo). Scan spec honored: 112px (sm:120px) display ≥96px
   minimum, PNG generated at 240px for 2x retina sharpness, lib-default 4-module quiet zone PLUS white-tile
   padding, brand-brown-on-white contrast, no blur, static after entrance (scan stability > decoration).
   Framed in the platform's ember→saffron gradient badge pattern, caption «جرّب المنيو مباشرة · امسح الرمز»
   inside the white tile (text-espresso ≈19:1), whole tile is a Link to the demo menu (desktop click =
   same destination; focus ring + hover affordance). Placement: it takes over the diagonal slot of the
   «+32% نمو الطلبات الشهرية» floating card — P-7's invented stat dies in the same move, net-zero floating
   elements (ticket top-start + QR bottom-end), no collision at 375px (tile stays inside the phone column's
   slack). Round-tag comment documents the whole rationale.
5. **#37 — scroll-craft restraint pass**: read every section top-to-bottom. Verdict: the page is coherent
   and needed nothing beyond fixes 1-4. (a) Section jobs don't repeat: hero (peak/QR) → features bento
   (what) → showcase (the menu at a glance) → stats (real traction) → featured (live proof) → how-it-works
   (process) → FAQ (objections) → final CTA (resolve) — deleting Clients REMOVED the one section that
   repeated stats/featured's job dishonestly. (b) One peak (hero+QR); the close resolves (FinalCTA with
   aurora wash + trust line — all its claims true). (c) Mobile 375px composition intentional (verified by
   geometry: QR tile fits the phone column, tap targets ≥44px pre-existing). (d) No new motion added; the
   QR is deliberately motionless post-entrance. Changes made in the pass itself: NONE beyond 1-4 —
   restraint.

## I-8 (final CTA broken class) — NOT FIXED, FALSE POSITIVE (deviation, evidence-backed)

The audit claimed `size-in(60vmin,720px)]` (missing `[m`) at FinalCTASection.tsx:26, "byte-verified via
node". Three independent checks at HEAD 19fa136a prove the class is CORRECT (`size-[min(60vmin,720px)]`):
(1) grep counts — `'size-in'` matches 0 lines, `'size-\[min'` matches 1; (2) charcodes via node — bytes
91,109,105,110 = `[min(`; (3) the compiled CSS from the r121 audit build EMITS the utility:
`.size-\[min\(60vmin\,720px\)\]{width:min(60vmin,720px);height:min(60vmin,720px)}`. Root cause of the
audit artifact: the tool-output display layer strips bare `[m` sequences (ANSI-reset-lookalike), making the
correct class LOOK broken in bash/node console output — the auditor's "byte-verification" saw the mangled
rendering, not the bytes. The ring renders. No change made (fixing a non-bug would be noise). Recommend the
lead strike I-8 from the backlog with this note.

## Verification evidence

- `pnpm typecheck` → 0 errors. `pnpm exec eslint <5 touched files>` → exit 0.
- `pnpm test` final: **148 files / 2152 tests ALL PASS**. Attribution note: an intermediate run (12:25)
  showed 19 failures in 6 files (owner-restaurants-gate, plan-limit, r118-restaurant-delete-guard,
  r92-owner-restaurant-id, r93-coverage-owner-restaurants, subscriptions-family) — all IMPL-1b's MID-FLIGHT
  API edits (their paired tests landed minutes later; M-9 discipline). None touch landing/pricing; my
  scope's tests (r92-hero-ssr 3 + r93-w2a-arabic-phrases 14) passed in every run.
- **Standalone smoke (one-session pattern, fresh production build)**: the shared tree couldn't build
  (IMPL-1b's in-flight owner/settings client-import bug), so I built in an isolated `git worktree` at HEAD
  19fa136a + exactly my 7 file changes (removed after). Build OK; served the standalone server (port 3131 —
  :3000 was held by a pre-existing next-server process I did NOT touch), curled / and /pricing, killed in
  the same call. Landing: hero-demo-qr mount ✓, caption ✓, demo href ✓, skeleton ✓ — and حجز وانتظار /
  phone-login / +32% / Telepizza / SOHO / Kubaba / تجارب من المطاعم / ضمان استرداد all ABSENT ✓, h1 r92
  contract intact ✓, new honest cards present ✓. Pricing: سنوي / وفّر / وفر شهرين / /السنة all ABSENT ✓,
  /الشهر + plans + CTA present ✓. Bonus: verified the G-1 fix holds under my QR addition — zero
  polyfill-signature chunks in the whole build, qrcode loads as an async ~24KB chunk (inlined URL confirmed
  in the client bundle: localhost for the local build, env-driven in prod).
- Worktree caveat hit: `next build` in the nested worktree did not apply .env.local to prerender workers
  (ECONNREFUSED via default-port fallback) — resolved by exporting DATABASE_URL explicitly; client-side
  NEXT_PUBLIC_DOMAIN inlining worked normally.

## Files (mine only — the tree also carries IMPL-1b's parallel work)

Deleted: src/components/landing/sections/ClientsSection.tsx, src/components/ui/AvatarInitials.tsx.
Edited: src/components/landing/HeroSection.tsx, HomePage.tsx, landing-data.ts,
sections/FeaturesSection.tsx, src/components/pricing/PricingClient.tsx.

## Deviations / judgment calls (flagged)

- **I-8 not fixed** — false positive, see above (the one-char "fix" was a no-op on an already-correct
  token; changing it would have been evidence-free churn).
- **P-7 (+32% invented stat) fixed as part of #36** — a P3 not in my assigned 5, but it sat 10 lines from
  the QR mount in the first viewport, violates the same absolute honesty policy as P-2, and its slot was
  needed for the QR. Net-zero element count; no redesign.
- **P-3 solved by deletion, not replacement** — task allowed either; the honest proof sections already
  exist directly above, and a mid-page join-CTA would duplicate FinalCTASection (restraint).
- **QR URL via NEXT_PUBLIC_DOMAIN (build-inlined), not window.location.origin** — task specified the
  env-domain pattern; it also makes preview/staging deployments' QRs point at the production live demo
  (which is the point of the signature).
- Concurrent-agent note for the lead: during my session IMPL-1b's in-flight edits briefly broke `next
  build` in the shared tree (owner/settings page importing server-only code into a client component) and
  held 19 tests red; both were resolved by their batch landing. Two pre-existing `next-server` processes
  (PIDs 4093/17030) hold :3000 — not mine, left untouched.
