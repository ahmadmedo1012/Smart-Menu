# r121 — Auditor P: Customer Journey / Product (READ-ONLY audit)

**Scope:** the product AS a product, not code quality — (1) the **dollar journey** (landing →
pricing → subscribe → register → bank/wallet payment + Telegram approval → owner dashboard →
menu built → QR printed → first order), (2) the **diner journey** (QR scan → menu → item →
modifiers → cart → WhatsApp handoff → order-confirmed), (3) **operator reality** (daily
orders loop, expiry, loyalty redeem, referrals), (4) **product honesty** (every user-facing
Arabic claim on landing/pricing/subscribe/order-confirmed checked against what the code
actually does), (5) **first-run experience**, (6) **competitive angle** (signature moment).
**HEAD audited:** `74ef578f`. **Method:** line-by-line reads of the actual pages/components
(HeroSection + all 8 landing sections, PricingClient, subscribe wizard family incl.
SubscribeForm/PaymentSection/PaymentDialog/ProviderPicker/ReceiptUpload, cart checkout,
order-confirmed, menu/[slug] + MenuClientSection/MenuPageClient/MenuHero, owner layout/
dashboard/menu/qr/orders/loyalty, LoyaltyWidget/ReferralCard, subscription-guard, expiry
cron, vercel.json crons, loyalty redeem API, subscriptions API) plus repo-wide greps to prove
feature claims exist nowhere. Cross-read the r121 H/I/J/L/B/R reports to avoid
double-counting (cross-refs marked).
**Ledger discipline:** r120 Journey/U3/U5 fixes verified HOLDING and NOT re-reported (OrderDialog
honest CTA «أضف إلى السلة» OrderDialog.tsx:581; order-confirmed honest copy :154-158 + copy-order-
number :145-151 + ordered-restaurant back-link :167-172; pickup labels unified cart/page.tsx:30-34;
subscribe bad-?plan escape SubscribeForm.tsx:193-210; plan ladder caps 1/1/2/3/10 displayed
PricingClient.tsx:157-164 + SubscribeForm review step; badge «الأكثر شعبية» unified
PricingClient.tsx:36/97, FeaturesSection.tsx:64-68; /menu index → demo menu). Deferred r120 items
(subscribe SSR shell, warm-nav freeze, StickyMenuHeader SSR, owner stats empty-state polish,
title-template triple, offline branding) verified open and NOT re-reported; the title-template
item's **body-copy extension** is reported here as P-8 (metadata side belongs to L-4/B).

---

## Findings

### P-1 [P1] The pricing page's yearly toggle is display-only fiction — «سنوي · وفّر 17%» / «وفر شهرين» cannot be purchased anywhere in the product
- Type: FACT (code-proven end-to-end)
- Evidence:
  - `src/components/pricing/PricingClient.tsx:61-63` — `displayPrice = yearly ? monthlyPrice * 10 : monthlyPrice`, `periodLabel = … yearly ? '/السنة' : '/الشهر'`; `:151` «وفر شهرين عند الاشتراك السنوي» under the price; `:211` `YEARLY_SAVINGS_PCT = Math.round((1 - 10/12)*100)` (17); `:259-282` the monthly/yearly capsule toggle.
  - `src/components/pricing/PricingClient.tsx:193` — the card CTA is `` `/subscribe?plan=${plan.id}` `` — **no billing-period parameter exists**. `src/app/(protected)/subscribe/PlanSelector.tsx` has zero yearly/period handling (grep: 0 hits); `src/app/api/plans/route.ts` does not even expose `periodDays`.
  - `src/app/(protected)/subscribe/PaymentSection.tsx:79` — the payment dialog receives `price={Number(currentPlan.price)}` (the monthly price); `src/components/shared/PaymentDialog.tsx:89` (`bankAmount = price`), `:301-323` (wallet flow charges `price`).
  - `src/lib/subscription-decisions.ts:144-155, 277` — approval grants `planEnd = now + plan.periodDays`, and every plan row carries the schema default 30 (`prisma/schema.prisma` `periodDays Int @default(30)`; repo has no seed/plan data with other values).
- Impact: user-facing + revenue-trust. A prospect toggles «سنوي», sees e.g. «290 د.ل/السنة» with «وفر شهرين», clicks «اشترك الآن» — and lands on a subscribe wizard that shows and **charges the monthly price for 30 days**. Either the prospect pays monthly believing they bought a year (worst case: they think they're covered for 12 months and get flipped to EXPIRED at day 31), or they notice the number change and lose trust in the funnel. This is exactly the "is pricing honest?" class the round asks about, on the money page.
- Fix (minimal, root-cause): pick ONE: (a) remove the yearly toggle + «وفر شهرين» line (smallest diff — delete the toggle state and `displayPrice` ×10 branch), or (b) make it real: pass `?billing=yearly` through the CTA, submit `amount = price×10`, and set `planEnd = now + 365` (the r119-S2-P2-2 `periodDays` honoring already supports annual plans if an annual row/param exists).
- Risk: of fixing — none for (a); (b) touches the money path (needs the Telegram approval payload to carry the term). Of not fixing — an owner who believed they paid for a year gets a dead dashboard at day 31 (see P-5) with no warning; refund/dispute exposure.
- Tests required: (a) unit: PricingClient renders no yearly toggle / no ×10 price; or (b) e2e: yearly CTA → subscribe summary shows yearly price → subscriptions POST carries the annual amount → approval sets planEnd ≈ +365d.

### P-2 [P1] The landing features grid promises two features that do not exist: «حجز وانتظار» (reservations) and one-step phone login for customers
- Type: FACT (code-proven by exhaustive grep)
- Evidence:
  - `src/components/landing/sections/FeaturesSection.tsx:11` — «طرق طلب متعددة: واتساب · استلام · توصيل · **حجز وانتظار**». The real product supports exactly three pickup types — `inside/takeaway/delivery` (`prisma/schema.prisma` enum PickupType; `cart/page.tsx:30-34`; restaurant `pickupTypes` column). Repo-wide grep for `حجز|reservation|waitlist`: the ONLY product hit is this marketing line (the other «الانتظار» hits are "pending" statuses).
  - `FeaturesSection.tsx:12` — «تسجيل العملاء: تسجيل دخول العملاء برقم الجوال بخطوة واحدة». Diners never log in: the diner journey is anonymous with a name+phone form at checkout (`CustomerInfoCard`, cart store), and the only auth is owner username+password (`src/app/api/auth/{login,register,me,logout}`). No OTP, no phone login, nothing "بخطوة واحدة".
  - Irony: `FeaturesSection.tsx:18-19` — the file carries the r82 honesty-policy comment («بلا أرقام تسويقية… سياسة الصدق r82») four lines above the fabricated feature list.
- Impact: user-facing trust. A Libyan restaurant owner choosing between this and a generic competitor subscribes partly on «حجز وانتظار» (a real pain point) — then cannot find it anywhere in the dashboard. This is a promise the product doesn't keep, in the first persuasion section.
- Fix (minimal, root-cause): rewrite the two cards to describe what exists: «داخل المكان · سفري · توصيل» (matches the unified r120 labels) and «بدون تسجيل للزبون — الطلب باسم ورقم فقط» (which is genuinely a selling point: zero-friction ordering). No backend change.
- Risk: none — copy-only. Of not fixing: every comparison-shopper who tests the claim churns with a story.
- Tests required: none (copy); optional grep-gate test asserting landing copy ⊆ real feature vocabulary.

### P-3 [P2] The testimonials/partners section is hand-written marketing fiction carrying real Libyan brand names and uniform 5-star ratings
- Type: FACT (hardcoded, no data source) + UNVERIFIED (whether any of these brands are actual clients — cannot be checked from the repo)
- Evidence:
  - `src/components/landing/sections/ClientsSection.tsx:17-21` — PARTNERS: «مقهى الواحة، مطعم الأصيل، بيتزا روما، SOHO، Telepizza، The Cheese، Empire، Kubaba». Repo-wide grep: these names appear NOWHERE else — not in seeds, not in demo migrations (the only demo restaurant is `al-waha-cafe-demo`, `prisma/migrations/20260909_round96_demo_menu/`), not in admin data, not in docs.
  - `ClientsSection.tsx:24-32` — 7 fully-voiced testimonials attributed to those brands with cities («Telepizza — مطعم بيتزا، بنغازي»), each rendered with a uniform 5-star row (`:63-67`). The quotes are authored copy in the platform's own voice («نظام المنيو الرقمي والواتساب المتكامل خلى طلبات التيك أوي أسرع»).
  - Contrast on the SAME page: `HeroSection.tsx:33-37` («Real count from fetchPublicStats — never hard-code marketing numbers — round 82») and `StatsSection.tsx:26-28` («No inflated/fabricated figures») — the platform's stated honesty policy is enforced for numbers but violated wholesale for social proof. `FeaturedRestaurantsSection` (live `/api/public/featured`) proves the honest alternative pattern exists in-repo.
- Impact: user-facing + legal. If these brands are not actual customers, this is fabricated endorsement with real trademarked names (Telepizza is an international chain) — defamation/cease-and-desist exposure and a trust collapse if a prospect asks any of these restaurants about it (Libya's restaurant scene is small and word travels). Even if some ARE clients, the quotes and 5-star ratings are invented, not collected.
- Fix (minimal, root-cause): replace the static TESTIMONIALS with real, permissioned quotes (or drop to partner logos only, verified against `Restaurant.showOnLanding`), and drive the partner grid from the same live featured-restaurants API the page already uses. Shortest honest interim: delete the testimonial carousel, keep the partner grid behind a "هؤلاء يستخدمون المنصة" heading sourced from the DB.
- Risk: of fixing — losing perceived social proof until real quotes are collected (mitigate: the live restaurant count + featured section already carry proof). Of not fixing — the single largest honesty liability on the landing page.
- Tests required: none (content); if DB-driven, unit-test the featured fallback.

### P-4 [P2] Post-payment approval is a black hole: a 24-hour SLA is promised, notification only works while the subscribe tab is open, the pre-activation owner hits a dead-end error screen, and resubmission is blocked while pending
- Type: FACT (code-proven; journey-level composition)
- Evidence:
  - The promise — `src/app/(protected)/order-confirmed/page.tsx:106-107` («ستقوم الإدارة بالتحقق من الدفع وتفعيل حسابك خلال 24 ساعة. سيتم إشعارك عند اكتمال التفعيل»); `subscribe/page.tsx:289` («سيتم إشعارك عند التفعيل»); `PaymentDialog.tsx` waiting step («بعد التحويل، انتظر موافقة الإدارة»).
  - The reality — the only approval surfaces are: the subscribe page's 15s poll, which runs **only while that tab is open** (`subscribe/page.tsx:143-181`, gated on `sseOpen`), and `UserBannerNotifier.tsx:34-37` which handles **`subscription_rejected` only** (no approved branch — and it lives in the owner layout the not-yet-PAID owner can't productively use). There is no email/SMS; Telegram notify requires the owner to have already linked a bot (`User.telegramChatId`, schema) — a fresh subscriber hasn't.
  - The dead end — an owner who closes the tab (bank transfer requires a trip to the bank!) and logs in later lands on `owner/page.tsx:132` «لم يتم تفعيل حسابك بعد. يرجى الانتظار حتى يتم تأكيد الدفع من الإدارة.» rendered via `EmptyState` whose only action is a retry that no-ops (`activeId` is null → `load` never runs, `owner/page.tsx:134-139` + the `error` branch's `activeId && load(activeId)` action) — no payment status, no pending-since date, no support link.
  - The lock — while pending, a resubmission attempt 400s: `src/app/api/subscriptions/route.ts:76-80` «لديك طلب دفع معلق بالفعل» (backed by the partial unique index) — so if the admin misses the Telegram message, the owner is stuck with no self-service remedy. `api/cron/cleanup` purges sessions/audit-logs/events only — pending payments live forever.
- Impact: user-facing, on the money path. Libya has no Stripe; the bank-transfer + manual-approval design makes "wait hours-to-days, offline" the NORM, and the product's only notification channel for the happiest moment (payment approved) requires the user to keep a browser tab open.
- Fix (minimal, root-cause): (1) handle `subscription_approved` in `UserBannerNotifier` (one more `eventType` check — the event already exists); (2) replace the owner/page.tsx dead-end with an honest "طلب دفعك قيد المراجعة منذ {date}" status card + WhatsApp-support link (the FAB number already exists); (3) drop «خلال 24 ساعة» for «سريعاً خلال أوقات الدوام» or enforce it with an escalation SystemEvent in the expiry cron.
- Risk: of fixing — low (UI + one event branch). Of not fixing — every payer who steps away experiences the approval as silence; some will conclude they were scammed.
- Tests required: unit — UserBannerNotifier renders on `subscription_approved`; owner page renders pending-status card when `!activeId` && user has pending payment (needs the me/events payload to expose it).

### P-5 [P2] Subscription expiry is a silent cliff for the operator: the cron flips status at 01:00 with no warning, the blocked save reports a generic «فشل الحفظ», and no renewal path exists — while the diner menu stays live and orders keep flowing
- Type: FACT (code-proven) — cross-ref H-6 (same error-swallow pattern on DELETE; this is the product-level journey consequence)
- Evidence:
  - Silent flip — `src/app/api/cron/subscription-expiry/route.ts:26-41` (daily 01:00 via `vercel.json` crons) flips `PAID → EXPIRED` when `planEnd < now`. No pre-expiry event, no «متبقي X يوم» anywhere: `PlanUsageBadge.tsx` (the only plan surface in the dashboard) shows items-used only — no status, no date; `UserBannerNotifier` handles rejection only.
  - Swallowed reason — `src/app/(protected)/owner/menu/page.tsx:130-131`: `catch { premiumToast('error', 'فشل الحفظ'); }` discards the server's specific 403 «اشتراكك منتهي. جدّد اشتراكك للمتابعة.» (`src/app/api/owner/restaurants/[id]/route.ts:32,96`, `owner/restaurants/route.ts:27,85`, `owner/reviews/route.ts:23`). The category editor thus shows the same generic toast for a lapsed subscription as for a network hiccup. (ItemDialog DOES surface the message — `item-dialog/use-item-save.ts:127` — inconsistent within the same page.)
  - No renewal path in the failure UX — the toast/EmptyState offers no «جدّد الآن» link; renewal requires the owner to independently think to visit `/subscribe` (which does support upgradeMode for owners).
  - Meanwhile the business keeps running — the public menu has NO subscription check (`src/app/(public)/menu/[slug]/page.tsx:129-194` queries only `isActive`/`status:'available'`), `POST /api/orders` has no subscription guard, and owner order reads/status-updates are unguarded (grep: `isOwnerSubscriptionActive` used only in owner/restaurants + owner/reviews). So diners keep ordering and the owner can still fulfill — but cannot edit a price or mark an item sold out, with no explanation of why.
- Impact: user-facing (operator). The monetization cliff of the whole SaaS is invisible until a save fails with a wrong error message. An expired owner's menu shows stale prices to diners indefinitely; the operator's first "renewal touchpoint" is a dead button.
- Fix (minimal, root-cause): (1) in `owner/menu/page.tsx` (and siblings) toast the thrown message like `use-item-save.ts:127` already does (delete the generic catch — one-line each; H-6 proposes the same for DELETE); (2) add an expiry banner: `UserBannerNotifier` already polls `/api/user/events` — emit a `subscription_expiring` SystemEvent from the expiry cron (or surface `planEnd` in `/api/auth/me` and render a «ينتهي اشتراكك في X يوم — جدّد» card with a `/subscribe` link). The live-menu-on-expiry policy is defensible (read-only grace) — keep it, but make the cliff visible.
- Risk: of fixing — low. Of not fixing — renewals depend on the owner diagnosing a wrong error message; churn at the exact moment the product should be re-selling itself.
- Tests required: unit — saveCat surfaces server error text; banner renders for `subscription_expiring`/EXPIRED status.

### P-6 [P2] The platform-support WhatsApp FAB renders on every restaurant's diner menu — a brand leak that points the diner at a third party in the restaurant's most branded moment
- Type: FACT (code-proven) — cross-ref J-1 (same FAB, z-index/overlap mechanics — NOT re-reported here)
- Evidence:
  - `src/app/(public)/layout.tsx:168` — `<FloatingWhatsApp />` with **no `phone` prop**, mounted for the whole public tree (landing, pricing, `/menu/[slug]`, print). `src/components/shared/FloatingWhatsApp.tsx:18-22` — falls back to `NEXT_PUBLIC_WHATSAPP_NUMBER` (the PLATFORM's number) and opens `wa.me/<platform>`.
  - The restaurant's own WhatsApp is already in the menu hero (`MenuHero.tsx:158-176`, green, with the restaurant's number). So a diner on «مقهى الواحة»'s QR menu sees TWO WhatsApp affordances: the restaurant's (correct) and a persistent orange FAB that opens a chat with Smart Menu support — appearing after 3s (`FloatingWhatsApp.tsx:13-17`) exactly when the diner has started scrolling the menu.
- Impact: user-facing + B2B trust. The diner journey is the product's actual job and the menu is the restaurant's branded surface (an owner pays for THIS). A diner tapping the FAB to ask «وين طلبي؟» reaches platform support, not the restaurant; an owner demoing the product sees third-party chrome inside their menu. On /cart and /order-confirmed (protected tree, `layout.tsx:148`) the same FAB competes with the order WhatsApp action (J-1 quantifies the physical overlap).
- Fix (minimal, root-cause): pass the restaurant's number on menu pages (the layout already knows nothing per-route — simplest: render the FAB only OUTSIDE `/menu/[slug]` by moving it out of the shared public layout into the marketing pages, or accept `phone` from a context the menu sets to the restaurant's whatsapp). Keep it on landing/pricing where it means "talk to the platform".
- Risk: of fixing — low (placement change). Of not fixing — brand-integrity complaints from paying owners; misdirected diner messages.
- Tests required: e2e — `/menu/[slug]` has no FAB (or FAB href = restaurant number); landing still has it.

### P-7 [P3] The hero's floating «+32% نمو الطلبات الشهرية» is an invented growth stat — contradicting the platform's own r82 honesty policy enforced two components away
- Type: FACT (hardcoded number presented as a result) + SUGGESTION (decorative-intent judgment)
- Evidence: `src/components/landing/sections/HeroSection.tsx:207-226` — the floating glass card renders `+32%` / «نمو الطلبات الشهرية» above the fold, first viewport of the money page. No data source exists (it's a JSX literal). Contrast: `HeroSection.tsx:33-37` (trust badge: real count only, "never hard-code marketing numbers — round 82") and `StatsSection.tsx:26-28` (live API numbers) — the same page enforces the policy everywhere except this card. The sibling ticket card («طلب جديد وصل — بيتزا مارغريتا ×2 — 32.00 د.ل») is a product mockup (fine); «+32% نمو» is a claim about outcomes (not fine).
- Impact: user-facing honesty; small but it's in the first viewport, and it's the kind of number a skeptical owner screens for. If the real platform-wide median is negative or flat, the card is a lie a competitor can call out.
- Fix (minimal): swap the stat for a true, verifiable micro-proof («فاتورة واتساب جاهزة» / «بدون عمولة على الطلب» — which is TRUE and is this product's sharpest differentiator vs commission apps) or derive it from real aggregate stats like the trust badge does.
- Risk: none. Tests: none.

### P-8 [P3] The funnel's body copy calls the product «الربط الذكي» while the product/README say «المنيو الذكي», and the header brand is Latin «Smart Menu» — identity split at the exact moments of commitment
- Type: FACT (code-proven) — distinct from L-4 (metadata/titles) and the deferred title-template item; this is BODY copy
- Evidence: `subscribe/page.tsx:364` — the subscribe H1 (the moment of commitment) says «انضم إلى **الربط الذكي**»; `owner/page.tsx:210` — the welcome banner greets owners with «مرحباً بك في **الربط الذكي**!»; `order-confirmed/page.tsx:103` — «شكراً لاشتراكك في **الربط الذكي**»; `Footer.tsx:114` — copyright «الربط الذكي | Smart Menu»; `Header.tsx:207-208` — the visible brand text is English «Smart Menu» (with alt «الربط الذكي») on an Arabic-first product. The prompt/brief and README call the product «المنيو الذكي»; the layout title template appends «| المنيو الذكي» (known triple, deferred).
- Impact: user-facing brand recall. A Libyan owner hears about «المنيو الذكي» from a friend, lands on a page that introduces itself as «الربط الذكي» with a Latin wordmark — three names in one funnel. Brand memorability is the cheapest moat a small SaaS has.
- Fix (minimal, root-cause): one decision (which Arabic name is canonical), then a ~6-string sweep (the four body-copy sites + Header brand text + Footer copyright). Coordinate with L-4 so the title template picks up the same token.
- Risk: none (copy). Tests: none.

### P-9 [P3] The subscribe slug field silently destroys Arabic typing — every Arabic character becomes «-» — and the latin-only rule is never stated
- Type: FACT (input behavior) + SUGGESTION (does a Libyan restaurant owner understand a URL slug at all?)
- Evidence: `src/app/(protected)/subscribe/SubscribeForm.tsx:342-345` — `onChange` runs `e.target.value.replace(/[^a-z0-9-]/gi, '-')`, so typing «مقهى» yields «----» live, with no explanation (the label «الرابط المختصر» + a latin example placeholder imply the rule for readers who know URL conventions). Same pattern at `owner/restaurants/page.tsx:169-171` (add-menu form). The word "slug" never appears user-facing (good), but nothing auto-suggests: typing the restaurant name «مقهى الواحة» gives zero help producing «al-waha-cafe».
- Impact: user-facing friction at step 2 of the paid funnel, for exactly the target persona (Arabic-first, non-technical). Some owners will type Arabic, see a field of dashes, and read it as "the site is broken".
- Fix (minimal, root-cause): (1) one hint line «بحروف إنجليزية وأرقام فقط — يظهر في رابط منيوك» under the input; (2) better: transliterate/auto-suggest — on name blur, if slug is untouched, suggest a latin slug from a small AR→EN map (مقهى→cafe…) or let the SERVER generate `menu-<random>` when left empty (the API already slugs inputs; making it optional removes the concept entirely for non-technical owners).
- Risk: of fixing — tiny (validation already server-enforced). Of not fixing — silent dead-weight friction in the wizard.
- Tests required: unit — slug input keeps latin chars, hint renders; API test if slug becomes optional.

### P-10 [P3] A diner who closes the tab loses every trace of their order: the itemized receipt lives in per-tab sessionStorage, and there is no way to look an order up again
- Type: FACT (storage/lifetime) + SUGGESTION (product model)
- Evidence: `src/app/(protected)/cart/page.tsx:341-349` — the full receipt is stashed in `sessionStorage` (`smartmenu_last_receipt`) keyed by orderNo; `order-confirmed/page.tsx:71-85` — the «إرسال عبر واتساب» fallback re-sends the stashed receipt, else a bare «طلب رقم: X — شكراً لطلبك». sessionStorage dies with the tab. The order-confirmed page is reachable later only if the diner saved the URL (`?orderNo=`); there is no diner-facing order lookup by phone anywhere (the `Order.customerPhone` index exists — `@@index([customerPhone])` — but no consumer). The WhatsApp chat IS the tracking surface when the handoff succeeded; when it didn't (popup blocked, no WhatsApp on desktop — `window.open` return value is unchecked, `cart/page.tsx:357`), the diner's only proof is a URL they didn't keep.
- Impact: user-facing, edge-but-real (desktop diners, popup blockers). The async-WhatsApp model is coherent; the gap is that its one fallback artifact is per-tab.
- Fix (minimal, root-cause): persist the last receipt to `localStorage` keyed by orderNo (same JSON, longer life + cross-tab) and have order-confirmed render the full receipt inline when the stash matches (it already re-sends it — just also DISPLAY it); optionally a minimal `/track?orderNo=` reader later.
- Risk: of fixing — negligible (localStorage instead of sessionStorage for a non-sensitive receipt; size-bounded single key). Tests: unit — receipt survives reload via localStorage; order-confirmed renders inline receipt.

### P-11 [P3] The printed-QR-before-items scenario: a diner scanning a brand-new restaurant's QR sees «لا توجد أصناف في هذه الفئة / اختر فئة أخرى» — with no categories to choose from
- Type: FACT (empty-state copy misfire on a predictable first-run path)
- Evidence: a fresh owner's natural order is: subscribe → approve → print the QR (`/owner/qr` works immediately — it only needs the slug, `owner/qr/page.tsx:50-65`) → THEN build the menu. A diner scanning that QR hits `menu/[slug]/page.tsx` with 0 categories/0 items → `MenuPageClient.tsx:435-452` renders EmptyState titled «لا توجد أصناف في هذه الفئة», description «اختر فئة أخرى» — an impossible instruction when `CategoryTabs` has nothing to render, and «هذه الفئة» implies a category was chosen. (Search-empty and category-empty share this copy path.)
- Impact: user-facing, twice: the diner concludes the restaurant is broken; the owner's first real customer had a dead experience. This is the "first impression on 3G" moment for the diner species, on the one path where the product's own onboarding order invites it.
- Fix (minimal, root-cause): branch the empty copy on `categories.length === 0` → «القائمة قيد التحضير — سيضيف المطعم أصنافه قريباً» (restaurant-branded, honest, no CTA); and on the owner side, the QR page could show a gentle «أضف أول صنف قبل طباعة الرمز» nudge when item count is 0 (the PlanUsageBadge already fetches the count).
- Risk: none. Tests: unit — zero-category menu renders the preparing copy; e2e optional.

### P-12 [P3] Operator daily-loop polish: completed stamp card gives the diner no claim instruction, the owner↔customer reply path is call/copy-only, and two nav items share one icon
- Type: FACT (three small gaps) + SUGGESTION (loop-coherence judgment)
- Evidence:
  - Stamp-card dead end for the diner — `src/components/loyalty/LoyaltyWidget.tsx:49-50` (`STAMP_GOAL=5`, `REWARD_LABEL='وجبة مجانية'`) and `:210-257`: at 5 orders the card renders «5/5 ← وجبة مجانية» and… nothing else. The redeem flow exists but is owner-side only (`/api/loyalty/redeem` — auth-guarded, `redeem/route.ts:37-71`; surfaced via the owner RedeemPanel, r103-F2). The diner who EARNED the reward is never told «أظهر رقمك للمطعم عند الطلب لاستبدال وجبتك» — the mechanic works only if both parties already know the ritual.
  - No one-tap WhatsApp reply to the customer — `owner/orders/[id]/page.tsx:244-249, 328-336` — the customer phone renders as `tel:` (call) links and «نسخ للواتساب» copies the order text (`:51, :300`), but there is no `wa.me/<customerPhone>` action, although the number is stored and `normalizeWaNumber` + `buildWhatsAppShareUrl` exist. In a WhatsApp-first market, "طلبك جاهز" should be one tap.
  - Duplicate icon — `owner/layout.tsx:21-22` — «المنيو» and «المنيوهات» both use the `Store` icon; at a glance the sidebar reads as the same destination twice (QR, loyalty, reviews all have distinct icons).
- Impact: user-facing (operator efficiency + loyalty-program credibility). The loyalty promise («اطلب 5 مرات واحصل على وجبة مجانية») is the product's retention hook for DINERS; leaving the claim ritual implicit halves its perceived value.
- Fix (minimal, root-cause): (1) one line under a full stamp card in LoyaltyWidget: «اطلب من المطعم وأظهر هذا الرقم لاستبدال وجبتك» + the phone number already on the card; (2) add a `wa.me` button next to the tel: links in the order detail (reuse `normalizeWaNumber(customerPhone)`); (3) swap «المنيوهات» icon to `LayoutGrid`/`List`.
- Risk: none. Tests: unit — full-card renders instruction; order detail renders wa.me href for valid phone (and none for short/invalid, mirroring the r103-F8 guard pattern).

---

## Ledger & round-120 verification notes (no findings — status only)

- **r120 Journey/U3/U5 fixes: ALL HOLDING at HEAD** (evidence cited in the header): honest add-to-cart CTA, router.push (no hard reload), unified pickup labels, notes ≤500, order-confirmed restaurant-correct back-link + copy-order-number + no fake notification promise, subscribe bad-plan escape, plan ladder 1/1/2/3/10 rendered on both pricing and the subscribe review step, «الأكثر شعبية» unified across 3 surfaces, `/menu` index → demo menu (linked from Header as «منيو تجريبي», `Header.tsx:16-22`).
- **Diner-journey premium feel (r120 lens):** verified structurally — SSR hero + islands, FeaturedShowcase/gallery/scroll-craft present, modifier groups ship with the menu payload with required-group gating (OrderDialog:95, :385) — no regressions found in my reads; visual/perf polish belongs to G/I/Q.
- **Owner first-run:** the dashboard welcome banner (`owner/page.tsx:207-239`) is genuinely good — 3 CTAs (add items / get QR / view menu) exactly matching the dollar-journey next steps; menu page zero-categories state teaches («أضف تصنيفاً جديداً لبدء بناء المنيو», `CategoriesList.tsx:49-56`); analytics empty state teaches (`owner/page.tsx:386-392`). The stats-empty-state POLISH item stays deferred (ledger) — not re-reported. The P-4 pre-activation dead-end and P-11 diner-side empty-restaurant copy are the two empty states the ledger item does NOT cover.
- **Dashboard mobile-usability:** owner layout is a mobile Sheet + sticky header (`owner/layout.tsx:123-146`); r120 U7-lite verified all owner pages at 390px. No new mobile-usable-for-restaurateur finding beyond P-12's icon nit.
- **Fake urgency check:** no countdown timers, no «متبقي 2 مقعد» patterns anywhere on landing/pricing/subscribe. The dishonesty class here is fabricated FEATURES (P-2), fabricated PROOF (P-3), an unpurchasable PRICE (P-1), one invented STAT (P-7), and one unenforceable SLA (P-4) — not urgency.
- **English leftovers:** swept — only legitimate latin (slug/URL placeholders, «Smart Menu» wordmark covered by P-8). The word «slug» never reaches users. Arabic copy quality is generally strong (correct Libyan register: «ليبيانا/مدار», د.ل, «سفري»).

## Competitive angle (product judgment, SUGGESTION — not a numbered finding)

The one thing a Libyan restaurant owner would remember is already on the page: **«الطلبات تصل على واتساب»** — no commission, no app install, orders land in the app the whole country already uses, with an itemized Arabic invoice (money-truth fixed r120). The hero's floating WhatsApp ticket is a genuine signature moment — but it's currently a *claim*, not a *demonstration*: the phone mockup shows a static wallpaper (`hero-phone.webp`), the QR corner mark is deliberately blurred decoration (`HeroSection.tsx:160-162`, `opacity-25 blur-[1px]`), and the real demo menu («منيو تجريبي», `al-waha-cafe-demo`) hides in the top nav instead of the hero. The highest-leverage marketing move in this codebase is to make the hero QR REAL and scannable (pointing at the demo menu) — an owner standing in traffic scans it, orders a coffee, watches the invoice appear, and the product demos itself. Everything else on the landing is well-executed but section-order generic (features bento → stats → how-it-works → testimonials → FAQ); the scan-to-try moment is the differentiation a template competitor cannot copy.
