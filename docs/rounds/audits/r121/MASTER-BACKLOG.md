# r121 MASTER BACKLOG — deduped, verified, ordered

> Source: 18 auditors (A–R) + 3 cross-checkers (X1–X3). ~55 raw P1/P2 findings → 30 ordered fix
> items after dedupe. Verification verdicts live in X1/X2/X3 files. Every item below is
> CONFIRMED unless marked otherwise.

## Implementation batches (file-scope isolated; batches in the same round are parallel-safe)

### ROUND A (parallel)

**IMPL-1a — cross-tenant + authz hardening** [files: src/app/api/**, src/lib/**, tests/**]
1. C-1 reviews DELETE: move menuItemId scope check BEFORE delete; scoped deleteMany; update r103-fixes F5b mocks; + cross-tenant regression test (victim counters intact)
2. E-1 PUT items categoryId: mirror POST's destination-category ownership ladder; + test
3. E-2 panel payment self-approval: load payment.userId, 403 if === auth.userId (role-blind, webhook-twin); + test
4. E-3 reset-password: extend target guard to staff/admin targets (not just super_admin); + test
5. M-3 login non-JSON body: inline parse guard → 400 Arabic (only login + admin/events/trigger exposed; 38/40 sites already safe via handleError)
6. D-2 order-status: cancelled-TERMINAL guard ONLY (web allows deliberate backward transitions — pinned by order-lifecycle:283/300/314); + tests (cancelled→X rejected; non-cancelled backward still allowed)

**IMPL-2 — cart/checkout/menu client UX + perf** [files: src/components/cart|menu|**, (public)/cart/**]
7. J-1 z-band: FloatingWhatsApp z-60→30, ScrollToTop z-61→31, cart FAB z-63→33 (X1 full z-census verified safe)
8. G-1 SelfHostedQR: dynamic import('qrcode') with BROWSER-CONDITION scope (print page server QR must survive — X1 hazard); verify chunk gone in build (expected −127KB gz × 28 routes)
9. H-2 checkout latch: move composed-notes guard PRE-latch (PaymentDialog r120 precedent); brick → clean 422 toast
10. H-3 cart hydration: hasHydrated gate + skeleton (cart noindex; zero SEO cost)
11. H-1 decimals sweep: 8 cart-family sites + 10 owner/admin drift sites → smart formatPrice; receipts keep decimals:2; receipt.ts:108 share-text align
12. J-2 back arrows: 5 sites → ArrowRight (RTL convention); CartSlideOver:122 close-button borderline → fix
13. Q-3 OrderDialog CTA fold: bring CTA above initial fold (reduce sheet initial max-h/padding)
14. Q-1 /_vercel/insights 404: load Analytics only on Vercel (env-gate)

**IMPL-3 — dashboard shell + a11y + SEO** [files: layouts, admin/**, owner/** components, (protected)/**]
15. B-2/A-2/E-4 dashboard shell: server-side requireAuth() gate in (protected) owner/admin layouts (r113-F114 login pattern) — kills null-shell on 23-24 routes, 2-3× /me calls, cookie-presence gating
16. K-1/K-2 nested main + aria-live: inner <main> → <div> (owner/admin layouts + order-confirmed); drop aria-live=polite from dashboard main; pair with K-6 heading/landmark fixes
17. K-3 skip-link: make target the actual first main content (reorder or retarget)
18. K-4 lightbox focus: add dot buttons to trap list; focus return on close; arrow nav (ReviewSheet model)
19. K-5 admin charts: SR summary (mirror owner charts' approach)
20. J-3 owner menu rows: hidden sm:inline status word + hidden md:block grip (frees ~92px for name)
21. L-1 (protected)/layout.tsx robots: index:false, follow:true (server component — can export metadata)
22. L-2 print page: noindex + self-canonical; trim robots.ts disallow of print (keep crawlable-canonical? — X3: noindex+canonical then robots disallow trimmed)
23. L-3 servesCuisine 'Libyan': delete (invented data on Italian pizzerias)
24. L-4 title template: strip page-level brands (5 one-line edits); keep '%s | المنيو الذكي'; delete dead login/layout title
25. L-5 404 double robots: drop (public) layout robots field (default index,follow = same behavior)

### ROUND B (parallel; after A merges)

**IMPL-1b — validation/slug/money/DB** [files: src/app/api/**, src/lib/validation.ts, prisma/migrations/**, tests/**]
26. C-3 slug reservation: extract pending-slug guard → lib/validation.ts; apply restaurants/[id] PUT + owner/restaurants POST + settings slug branch (+ settings missing uniqueness pre-check with honest 409 copy)
27. C-4/C-5/H-4 restaurantFieldSchema: shared schema in lib/validation.ts; wire PUT settings + POST restaurants (coerce legacy form → array; cap legacy name); owner settings form maxLengths
28. C-2/D-1 invoice truth: whatsapp/generate drop +deltaSum (price now effective) + cutoff-guarded backfill migration (pre-r120 rows: add modifiersJson deltas; post: untouched) + test with modifier fixture
29. D-3 drift migration: SET NOT NULL ×4 (Restaurant.gallery, User.permissions, MenuItem.dietaryTags/allergens)
30. D-4 CHECK constraints: price>=0, qty 1-99, rating 1-5, points>=0 (hand-written migration; Prisma diff blind)
31. D-6/D-7 delete-path: Blob cleanup on owner restaurant DELETE (admin-parity); category DELETE P2003 → honest 409 Arabic
32. M-1 e2e red: 7 stale pins 400→422 (api-smoke:47, api-sweep ×4 + inner if-guards, full-sweep:298, auth-fix-verification:41)

**IMPL-5 — marketing/landing (scroll-craft + impeccable)** [files: (public) landing sections]
33. P-2 remove fabricated claims: «حزر وانتظار» + «تسجيل دخول العملاء برقم الجوال» (verified nonexistent)
34. P-1 yearly toggle: REMOVE (server rejects amount≠plan.price; yearly is fiction; nothing pins toggle)
35. P-3 testimonials: remove real brand names + invented quotes (r82 honesty policy; legal risk)
36. Hero signature: decorative QR → real scannable QR to live demo menu (menu.smart-link.ly/menu/al-waha-cafe-demo)
37. Scroll-craft pass: journey coherence, restraint check, mobile composition — improve, don't rebuild

### ROUND C (after B; touches admin/owner files settled by IMPL-3)

**IMPL-4 — dedup/dead-code/docs/infra**
38. A-1 Telegram notify dedup: NEW shared helper (NOT gatherTargets — different audience!); parameterize test-pinned labels
39. A-3/I-1 order-status SSOT: admin adopts lib/order-status.ts (3 bespoke maps die)
40. O-1 pickup labels ×7 → getPickupTypeMeta
41. O-3 AnimatedIconHandle imperative API removal (~105 lines, 1 consumer)
42. O-2+F-2 dead exports (~260 lines): motion-icons ×18 + dup 'use client', fadeUp×2, ANALYTICS_RANGES, debug, RevealImage, StaggeredReveal, SectionHeader dead props, BackButton empty import + dead branch, NavLink.exact, intervalMs, BroadcastResult, slug schema swap
43. I-2 dead shadow tokens (~35 declarations + 13 utilities; 197 sites use Tailwind defaults)
44. A-10 restaurant-DELETE guard dedup + unified 409 copy
45. I-8 landing CTA broken class one-char fix (size-[m...)
46. I-13 create PRODUCT.md + DESIGN.md (I's draft inventory)
47. R-1 archive r96 scripts (2 files + 3 path edits)
48. R-2 README + tests/README numeric refresh
49. N-2/R-3 ops-runbook: keep-alive 19/day, --to-schema flag fix, deploy-block playbook, Vercel crons
50. N-4 nightly-flake .nvmrc alignment
51. N-1 check-git-author.mjs tripwire + CLAUDE.md protocol line
52. R-4 .gitattributes (LF for *.sh)
53. X3-10 DELETE Dockerfile + .dockerignore (dead since r98; unbuildable; untested escape hatch = liability)
54. B-6 next.config.ts stale comment (loading-boundary invariant)
55. B-1/N-6 cache ownership: proxy.ts owns browser caching; terms/privacy → 3600 in proxy; DELETE vercel.json:23-42 headers; ENGINEERING_STATE.md:~260 fix; 1 header test

### P3 backlog (Wave 6/7 — batch if time allows)
K P3s (NewOrdersBar announce, admin tabs color-only, settings tablist, OwnerCharts radios, premiumToast assertive, English aria labels, lightbox dots 22px) · G-3 image cache rules (/demo/* + upload cacheControl) · G-6/7 orb-float gating + StickyMenuHeader gate narrowing · G-5 /subscribe SSR shell (≈−2.1s LCP) · B-3 print meta · B-5 menu doc 292KB diet (small wins: JSON-LD hasMenu trim, class attr diet) · J-4 PaymentDialog bank rows dir · J-7 vh→dvh ×2 · C P3s (output consistency) · M-2 seed-hostage specs + M-6/7/8 test-infra docs · F-3/4/5 config debt · L-6/7/8/9 · Q watch-item (error boundary after add-to-cart 1/~10) · D-5/etc.

## Known conflicts (from X1/X2/X3 — do NOT violate)
- C-1 fix flips r103-fixes F5b mocks — same commit
- D-2 must NOT be a full forward-only map — only cancelled is terminal (order-lifecycle pins backward transitions)
- G-1 alias fallback must be browser-condition-scoped (print QR server-side)
- A-1 must NOT consolidate onto gatherTargets (audience leak)
- C-2 fix REQUIRES the backfill (else pre-r120 rows break) with createdAt cutoff
- L-5 robots removal + L-1 addition — same batch (meta snapshots)
- M-9/M-5: tests for fixes land WITH fixes, not after
- I-2 shadow tokens: removing declarations is safe (0 consumers in compiled CSS) but DO NOT touch the 197 usages
