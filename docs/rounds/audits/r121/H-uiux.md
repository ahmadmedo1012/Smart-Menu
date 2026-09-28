# r121 — Auditor H: UI/UX Journeys + States (READ-ONLY audit)

**Scope:** full journey + state audit of the web app — customer menu journey
(`(public)/menu/**` + menu/cart components), checkout funnel (`/cart` → ReviewDialog → WhatsApp →
`/order-confirmed`), subscribe/signup funnel (plan → register → payment → approval), owner dashboard
(menu CRUD, orders ops, settings, QR, loyalty, reviews, stats), admin panel (users, restaurants,
subscriptions approval, telegram, menu), global state discipline (toasts, dialogs, skeletons,
empty/error states, offline, 404/500), Arabic microcopy + `formatPrice`/د.ل consistency.
**HEAD audited:** `74ef578f` (= live production). **Method:** line-by-line reads of the actual
components (cart page family, OrderDialog, CartSlideOver, cart store, PaymentDialog, subscribe
wizard, owner menu/settings/orders/QR/loyalty/reviews, admin subscriptions/users/menu/telegram),
git-diff of r120 `4ba875a2` to separate "known/deferred" from new, plus cross-reads of the r121
B/C/D auditor reports to avoid double-counting (cross-references marked).
**Ledger discipline:** r120 impeccable-UX fixes (honest CTAs, order-confirmed copy, notes cap,
network-error copy, contrast) verified HOLDING and NOT re-reported; deferred items (subscribe SSR
shell, warm-nav freeze, StickyMenuHeader SSR, owner stats empty-state polish, offline branding)
verified open and NOT re-reported as findings.

---

## Findings

### H-1 [P2] /cart still renders money with forced `decimals: 1` — «23.0» and «7.3» on the checkout page contradict the r120 smart-default used on the same journey one pixel away
- Type: FACT (code-proven; git-proven incomplete sweep)
- Evidence:
  - `src/app/(protected)/cart/CartSummaryCard.tsx:29` — line totals `formatPrice(item.price * item.quantity, { decimals: 1 })`; `:41` grand total `formatPrice(total, { decimals: 1, suffix: '' })`.
  - `src/app/(protected)/cart/CartLineItem.tsx:54` — unit price `formatPrice(item.price, { decimals: 1 })} / للواحد`.
  - `src/app/(protected)/cart/ReviewDialog.tsx:139,148` — the SAME page's review dialog uses the r120 smart default (`formatPrice(item.price * item.quantity)`, no opts) — git-verified: r120 `4ba875a2` touched ReviewDialog.tsx but NOT CartSummaryCard/CartLineItem.
  - `src/components/menu/OrderDialog.tsx:377-378,438` — modifier chips and the «شامل الخيارات» line force `decimals: 1` → a +2 د.ل option renders «+2.0», a 0.25 delta renders «0.3» (rounded). `src/components/menu/menu-types.ts:127-129` bakes the same `(+X.0 د.ل)` into `modifiersSummary`, which renders in CartLineItem, CartSlideOver and ReviewDialog.
  - Cross-dashboard drift: owner surfaces force `decimals: 1` (`owner/orders/[id]/page.tsx:280,286,318`, `orders/OrdersTable.tsx:192`, `OwnerOrdersList.tsx:49`, `OwnerKpiGrid.tsx:75`, `menu/CategoriesList.tsx:211,216`, `admin/orders/[id]/page.tsx:254,260,292`) while `admin/orders/page.tsx:372` and the whole public menu (`MenuItemCard.tsx:284-289`, `CartSlideOver.tsx:159-211`, `MenuToolbar.tsx:281`) use the smart default — the same order shows «23 د.ل» in the admin list and «23.0 د.ل» in both detail pages.
  - `src/lib/format.ts` (r120 comment): smart trim is the default and "explicit decimals stays authoritative for receipts" — receipts keep `decimals: 2` (`src/lib/receipt.ts:57-68`), which is correct and untouched by this finding.
- Impact: user-facing money-display inconsistency on the highest-stakes page (last screen before
  the customer commits the order): integer prices show a bare «.0» (the exact cosmetic r120
  removed) and 2-decimal prices (7.25 → «7.3») are silently ROUNDED on the cart page and in
  modifier summaries, diverging from the smart-default display the same customer saw on the menu
  card and will see again in the ReviewDialog and the WhatsApp receipt.
- Fix (minimal, root-cause): drop `{ decimals: 1 }` at the display sites that r120 missed —
  CartSummaryCard.tsx:29,41; CartLineItem.tsx:54; OrderDialog.tsx:377-378,438;
  menu-types.ts:127-129 (keep `suffix: ''` pairings as-is); optionally the owner/admin list sites
  for cross-dashboard consistency. Receipts (`receipt.ts`, `decimals: 2`) stay untouched.
- Risk: of fixing — near zero (pure display; existing unit tests pin the formatter, not these call
  sites). Of not fixing — the r120 money-display invariant («12 → 12, 7.25 → 7.25») is void on the
  checkout page itself.
- Tests required: extend the r120 formatPrice pins to one composed cart-summary render (integer
  price → no «.0»; 7.25 → «7.25»).

### H-2 [P2] Checkout's composed-notes >500 guard `return`s from inside the `try` without releasing the submit latch — the page is bricked in a permanent «جاري...» state until a full reload
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/cart/page.tsx:169-170` — `submittingRef.current = true; setIsSubmitting(true);` are latched BEFORE the try block; `:215-221` — inside the try, the r118-A5-F2 budget guard `if (composedNotes.length > 500) { premiumToast(...); return; }` exits `handleCheckout` without any reset. The only release points are the catch (`:274`) and the success tail (`:360`). After the guard fires, `isSubmitting` stays `true` → `ReviewDialog.tsx:162` (`disabled={isSubmitting}`, spinner «جاري...») is permanently disabled, and the `if (submittingRef.current) return` double-click guard (`:164`) blocks every future checkout attempt — even after the user shortens the notes, which is what the toast tells them to do. Recovery requires a full page reload, which first trips the `beforeunload` "leave site?" nag (`:80-88`).
  - Trigger reality check: the inputs are capped to fit (notes 120 + address 360 + prefix < 500 — `CustomerInfoCard.tsx:30`, `DeliveryAddressField.tsx:28`), so the guard fires only for a stale persisted cart/address from an older localStorage shape — the exact scenario the code's own comment names («a stale persisted cart/address (older localStorage shape) could still exceed it»). When it does, the consequence is a total flow lockout, not a retryable error.
- Impact: user-facing (money-path): an edge-path customer is told to «اختصر قليلاً ثم أعد المحاولة» but the retry can never happen — checkout on that page is dead until reload. This is the same brick-the-button class the repo fixed in PaymentDialog (validate BEFORE latching the guard, `PaymentDialog.tsx:117-133`) and subscribe (`subscribe/page.tsx:192-199`).
- Fix (minimal, root-cause): make the >500 guard fire before the latch (move it up next to the delivery-address guard at `:166-176`, which already resets correctly), or `return { ... }` via the same reset pair the catch uses (`setIsSubmitting(false); submittingRef.current = false;`) before returning.
- Risk: of fixing — none (guard semantics unchanged; only the stuck state is released). Of not
  fixing — a silent, unrecoverable checkout lockout for affected users.
- Tests required: unit/e2e — force composedNotes > 500 → confirm the toast, then re-shorten and
  assert the confirm button is enabled and a retry POST fires.

### H-3 [P2] Hard load of /cart paints «السلة فارغة» before the persisted cart rehydrates — a refresh mid-checkout tells the customer their cart is gone
- Type: FACT (code-proven; SSR + hydration sequencing)
- Evidence: `src/store/cart.ts:246` — `skipHydration: true` («rehydrated by CartHydrator in root layout»); `src/components/shared/CartHydrator.tsx:6-12` — rehydrate runs in a `useEffect` (i.e. after first paint), and only when in-memory items are empty. `src/app/(protected)/cart/page.tsx:371` — the page's first branch is `if (items.length === 0 && !confirmed)` → `CartEmptyState.tsx:23-24` renders «السلة فارغة / أضف بعض الأصناف إلى السلة» with two CTA buttons. Because `/cart` is a client page SSR'd with the empty initial store, the server HTML itself contains the empty state; the persisted items only appear after JS download + hydration + the CartHydrator effect. On a throttled phone the «your cart is empty» paint persists for the whole JS fetch window (seconds), then the cart pops in. No `hasHydrated`/`onFinishHydration` gating exists anywhere (`rg hasHydrated|onFinishHydration src` → 0 matches).
- Impact: user-facing journey defect on the exact "refresh mid-flow" scenario: a customer who
  refreshes /cart (e.g. after a network error, or via the browser back button post-confirmation)
  momentarily sees their cart "deleted" — the class of fright the r113-F114 login fix and the r120
  StickyMenuHeader deferral documented, but on the money path.
- Fix (minimal, root-cause): gate the empty state on hydration — e.g. a tiny `useCartHydrated()`
  hook from `useCart.persist.hasHydrated()` + `onFinishHydrated`, rendering the page's existing
  loading skeleton while not-yet-hydrated and `items.length === 0`. (Client-side navigations are
  unaffected — the store is already in memory.)
- Risk: of fixing — low (one conditional; keep the SSR-safe empty default for genuinely-empty
  carts). Of not fixing — every hard /cart load with items flashes a false empty state.
- Tests required: e2e — seed localStorage cart, hard-load /cart, assert «السلة فارغة» never
  appears (assert line items present after network idle).

### H-4 [P3] Owner settings form caps nothing — no maxLength, no email format check on any restaurant field (the client half of C-4's 20k-char settings PUT)
- Type: FACT (code-proven; answers this round's brief question: does the UI cap it? No)
- Evidence: `src/app/(protected)/owner/settings/page.tsx:431-516` — the «بيانات المطعم» form (name, description, phone, whatsapp, email, address, workingHours) has ZERO `maxLength` attributes and no length/format validation; `type="email"` at `:491` never fires because the save is a plain `onClick` (`save()` at `:152`), not a form submit. `save()` (`:162-180`) PUTs `restaurant_*` pairs verbatim to `/api/settings`, which C-auditor proved accepts value strings up to 20,000 chars and mirrors them onto `Restaurant` + the public menu payload (C-4, r121). The canonical restaurant PUT caps name 200 / description 1000 / phone 30 / whatsapp 30 / email 254 / address 300 / workingHours 500 — none of that is reflected here. (Same pattern, admin side: `admin/telegram` config inputs — `ConfigEditor.tsx` / `telegram/page.tsx` — carry no caps either, mirroring C-13.)
- Impact: user-facing at second order — an owner pasting a long description saves successfully and
  ships it to every customer menu load (payload bloat / layout distortion); an invalid email saves
  silently; the mismatched client contract means the owner discovers limits only via a raw 422 from
  a different surface. Client/server validation parity is the repo's own stated rule (r118-A5-F6
  capped ItemDialog inputs for exactly this reason).
- Fix (minimal): mirror the canonical bounds on the inputs — `maxLength` 200/1000/30/30/254/300/500
  per field (and reuse them in the admin telegram config for token/chatId per C-13). Server-side
  bounding belongs to C-4's fix; the UI caps are the ponytail complement.
- Risk: none (existing stored data untouched — write-time only, same policy as round97-X3).
- Tests required: none beyond existing save-path unit tests; manual check that a 1001-char
  description is truncated at input.

### H-5 [P3] Subscribe in upgrade mode with an unresolvable `?plan=` renders a blank step — the r120 dead-end escape exists only on the non-upgrade path
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/subscribe/page.tsx:55` — `?plan=` deep-links start at `step='menu'`; `:81-84` — an unresolvable value (stale id, renamed plan, typo) leaves `selectedPlan` null → `currentPlan` undefined. For an authenticated owner (`upgradeMode=true`, set at `:120-139`), after `authLoaded` NONE of the three content branches matches: `:395` requires `currentPlan`, `:404` requires `!authLoaded`, `:411` requires `!upgradeMode` → the area below the StepIndicator is completely empty. The non-upgrade path handles exactly this case with the r120 escape (`SubscribeForm.tsx:210-222` — «تعذر تحميل الخطة المحددة» + «تصفح جميع الباقات»). The only recovery for the owner is noticing that step 1 in the stepper is clickable — and it is rendered with a ✓ "completed" mark (`StepIndicator.tsx:37,75-79`) even though no plan was ever selected.
- Impact: user-facing for paying operators: an owner clicking a stale marketing link
  (`/subscribe?plan=<dead>`) lands on a header + stepper + nothing else — the exact dead-end class
  r120-U3 fixed for anonymous users.
- Fix (minimal): mirror the SubscribeForm escape for the upgrade branch — render the
  «تعذر تحميل الخطة المحددة» card + «تصفح جميع الباقات» (→ `setStep('plan')`) when
  `step !== 'plan' && authLoaded && upgradeMode && !currentPlan`.
- Risk: none.
- Tests required: unit — render with upgradeMode=true, plans loaded, `?plan=doesnotexist` →
  escape CTA present.

### H-6 [P3] Owner menu CRUD swallows the server's Arabic error envelope — a category blocked by order history surfaces as a bare «فشل الحذف»
- Type: FACT (code-proven; the user-facing half of D-7)
- Evidence: `src/app/(protected)/owner/menu/page.tsx:130-132` (saveCat), `:147-149` (delTarget), `:164-166` (toggleStatus) — all three are `catch { premiumToast('error', 'فشل الحفظ/الحذف/التحديث'); }` with the error object discarded. `csrfJson` deliberately throws the server's localized envelope (the round89-E6 contract, documented in `useOrderDetail.ts:116-124`), and sibling surfaces surface it: `admin/menu/page.tsx:144-145` uses `getErrorMessage(e, ...)`, as do owner reviews (`owner/reviews/page.tsx:87`), admin users (`admin/users/page.tsx:76`), and the settings page. Combined with D-7 (category DELETE on a category containing any ever-ordered/reviewed item → generic 400 «بيانات مرتبطة لا يمكن حذفها»), the owner's actual experience is: delete category → «فشل الحذف» — no reason, no remedy (move items / mark unavailable), retry fails identically forever.
- Impact: user-facing: an unactionable dead-end on a routine owner operation; the fix is already
  half-shipped (the message is thrown, the UI just drops it).
- Fix (minimal): `catch (e) { premiumToast('error', getErrorMessage(e, 'فشل الحذف')); }` ×3 (pairs
  with D-7's server-side 409 + actionable copy).
- Risk: none.
- Tests required: none (display-only); D-7's tests cover the contract.

### H-7 [P3] ItemDialog makes price 0 un-orderable in the UI while the API accepts it — free items cannot be created by owners
- Type: FACT (code-proven; client/server contract drift, UI side of C-7's price-0 split)
- Evidence: `src/components/owner/item-dialog/use-item-save.ts:42` — `if (!form.name.trim() || !form.price)` treats `price === 0` as missing («يرجى إدخال الاسم والسعر»); `ItemCoreFields.tsx:84` — `value={form.price || ''}` also blanks a typed 0. C-auditor verified POST /api/items accepts `price: 0` deliberately («free item — legitimate», C-7). So the UI blocks a shape the server and DB (`Decimal(10,2)`, `min="0"` on the input at `:87`) both allow. (S2-P2-6 — discountedPrice=0 POST/PUT — is a different, ledgered split and not re-reported.)
- Impact: user-facing (minor frequency, real cases exist — complimentary bread/sauce/طبق مجاني): the
  owner cannot publish a free item; the input also erases a legitimate 0 as they type it.
- Fix (minimal): `Number.isFinite(form.price) && form.price >= 0 && form.name.trim()` for the gate
  + `value={form.price === 0 ? 0 : form.price || ''}` for the display; server keeps `min(0)`.
- Risk: none (POST path already accepts 0; PUT is C-7's API-side fix).
- Tests required: unit — save with price 0 → POST body `{ price: 0 }` sent, no validation toast.

### H-8 [P3] Web cart destructive paths are asymmetric and the undo entry persists across sessions — r120-M1 fixed both on mobile only
- Type: FACT (code-proven; parity gap with the repo's own r120 mobile fix)
- Evidence:
  - Decrement-to-zero is a silent delete: `src/store/cart.ts:201-209` — `updateQuantity(id, qty<=0)` filters the item out WITHOUT setting `lastRemoved`, while `removeItem` (`:173-180`) sets it. On /cart the minus button at quantity 1 (`CartLineItem.tsx:61` — not disabled at 1, unlike OrderDialog's `disabled={quantity <= 1}`) removes the line with NO undo banner; the trash button on the same card (`:80`) removes WITH undo (`CartUndoBanner`). `CartSlideOver.tsx:165` has the same minus-at-1 silent removal. r120-M1 explicitly called this out for mobile («decrement-to-zero was the only silent path») and fixed it there; web kept the asymmetry.
  - `lastRemoved` is persisted to localStorage: `cart.ts:247-249` (`partialize` includes `lastRemoved`), so the «تم حذف: X — تراجع» banner reappears on a later session's /cart visit (ghost undo from a previous visit; clicking it resurrects a line the user removed yesterday — the restaurant guard at `:188-194` only protects cross-restaurant, not cross-session). r120-M1 dropped exactly this key from mobile AsyncStorage persistence.
- Impact: user-facing (P3): one of two destructive affordances per cart line lacks undo, and an
  undo offer can surface stale. No data loss beyond the intended removal.
- Fix (minimal): set `lastRemoved` in the `qty <= 0` branch of `updateQuantity` (one line — makes
  decrement-to-zero produce the same banner), and drop `lastRemoved` from `partialize` (matches
  mobile r120-M1).
- Risk: minimal (undo banner appears for decrement-to-zero — intended; no persisted-state migration
  needed since the key is additive).
- Tests required: unit — decrement 1→0 sets `lastRemoved`; persisted snapshot excludes
  `lastRemoved`.

### H-9 [P3] Admin subscriptions "stats" cards count the current page (≤20 rows, status-filtered), not the dataset — «تم التحقق 0» is shown under the default filter regardless of reality
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/admin/subscriptions/page.tsx:188-207` — the four KPI cards read `payments.filter((p) => p.status === 'pending'|'verified'|'cancelled').length` (`:192,198,204`), where `payments` is the current 20-row page (`pageSize = 20`, `:82`) already filtered by `statusFilter` (default `'pending'`, `:78`). Only «الإجمالي» uses the server total (`:190`). With the default filter the «تم التحقق» and «ملغى» cards ALWAYS read 0 (the list contains only pending rows) and «قيد الانتظار» caps at 20 even with 50 pending — an approval operator is shown numbers that look like platform-wide stats but are page-scoped.
- Impact: user-facing misinformation for admins on the payment-approval dashboard (the panel that
  gates paid activations).
- Fix (minimal): either derive the three counts server-side (the list route already returns
  `total`; add grouped counts) or relabel the cards as page counts («في هذه الصفحة») — the first
  matches the card design's intent.
- Risk: minimal.
- Tests required: unit on the counts source (mocked API with 30 pending → card shows 30, not 20).

### H-10 [P3] Sold-out item in a stale cart: the 400 tells the customer «حدّث السلة وحاول مجدداً» but the cart UI cannot show WHICH line is dead
- Type: FACT (code-proven) + SUGGESTION (fix direction)
- Evidence: `src/app/api/orders/route.ts:308-312` — an item missing from the re-priced map → `400 «أحد الأصناف في سلتك لم يعد متوفراً — حدّث السلة وحاول مجدداً»`; `cart/page.tsx:250-268` + `submit-error.ts:51-56` surface that envelope verbatim in the toast. But `CartLineItem` renders every line identically from localStorage — there is no availability signal per line and no way for the customer to know which item to remove; the practical recovery is trial-and-error bisection of their own cart. (Sold-out handling is otherwise a deliberate design: unavailable items are filtered out of the public menu entirely — `menu/[slug]/page.tsx:169,258` — so the customer's only encounter with a dead line is this checkout 422.)
- Impact: user-facing friction on an edge-but-real path (owner marks an item unavailable between
  add-to-cart and checkout; ISR is purged but localStorage isn't).
- Fix (minimal, root-cause): include the offending `itemIds` in the 400 envelope (the route already
  knows which lookups missed) and have the cart badge/highlight those lines (e.g. destructive
  border + «لم يعد متوفراً» tag + a remove-line action on the banner). Purely additive.
- Risk: low; keep the generic copy for callers that ignore the ids.
- Tests required: API — mixed cart with one unavailable id → 400 body contains that id; UI — line
  shows the unavailable state.

### H-11 [P3] Owner QR page renders a settings-fetch failure as «لا توجد بيانات للمطعم» with no retry — the network error is misattributed to missing data
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/owner/qr/page.tsx:60-66` — the `/api/settings` fetch `.catch(() => premiumToast('error', 'فشل تحميل إعدادات المطعم'))` leaves `url` empty and sets `loaded`; `:123-129` — `loaded && !url` then renders the empty state «لا توجد بيانات للمطعم» whose only action is «العودة للوحة التحكم». A transient network/API failure therefore shows the owner a permanent "no restaurant data" screen with no retry — the mobile twin of this exact dead-end was fixed in r103-N2 (OwnerQr retry).
- Impact: user-facing for owners on flaky connections: the QR page (the product's core artifact)
  appears broken-without-recourse; the toast contradicts the on-screen "no data" claim.
- Fix (minimal): track the failure separately (`loadError` state) and render the empty state's
  retry button (`onClick={reload}`) instead of the back-only card when the fetch failed.
- Risk: none.
- Tests required: none beyond manual (state-branch render).

---

## r120 / prior-round verification (LEDGER items in this domain — verified at HEAD, not re-reported)

| Item | Status | Evidence |
|---|---|---|
| r120 OrderDialog honest CTA «أضف إلى السلة» + `router.push('/cart')` (no hard reload) | **VERIFIED HOLDING** | `OrderDialog.tsx:546-552` (honest CTA + contrast fix), `:191-199` (800 ms success card → `router.push`), reset-on-open `:78-88` |
| r120 order-confirmed: copy-order-number, back-to-ordered-restaurant, honest copy, itemized fallback | **VERIFIED HOLDING** | `order-confirmed/page.tsx:145-151` (copy button), `:167-172` (slug-based back link), `:157` (honest copy), `:73-79` (sessionStorage receipt stash keyed by orderNo, matched before resend) |
| r120 network-error Arabic copy (checkout + subscribe) | **VERIFIED HOLDING** | `cart/page.tsx:282` + `get-error-message.ts`; `subscribe/page.tsx:266` |
| r120 notes `maxLength=500` | **VERIFIED HOLDING** | `OrderDialog.tsx:523-530` (textarea), `CartLineItem.tsx:93` (line notes input) |
| r120 cart delivery-address error closes ReviewDialog first | **VERIFIED HOLDING** | `cart/page.tsx:166-176` — and the sibling guard 40 lines down has the stuck-state defect → new H-2 |
| r110 rejected-payment retry (subscribe) | **VERIFIED HOLDING** | `PaymentDialog.tsx:117-133` (validate-before-latch), rejected step + edit-retry; `subscribe/page.tsx:154-161` (SSE rejection resets `submittedRef`); r103-F3 same-username register skip intact (`subscribe/page.tsx:242-262`) |
| r112 themed 404/500 tri-layer | **VERIFIED HOLDING** | `src/app/not-found.tsx` (self-contained inline-styles + ErrorShellLangFix), `DefaultError` on `(protected)` group + owner/admin error.tsx, `[...notfound]` catch-all present |
| offline.html exists (branding deferred) | **LEDGER-VERIFIED (present)** | `public/offline.html` + `public/sw.js`; `ConnectivityBanner.tsx` online/offline strip in both layouts |
| Owner stats empty-state polish (deferred) | **LEDGER-VERIFIED still open** | basic `EmptyState` + retry exists (`owner/page.tsx:184-192`); the polish item remains deferred |
| /subscribe SSR shell · menu warm-nav freeze · StickyMenuHeader SSR mount | **LEDGER-VERIFIED still open** | B-auditor's table (B-nextjs.md); StickyMenuHeader mount-gate re-confirmed at `MenuClientSection.tsx:78-83`; not re-reported |
| Quantity cap 99 feedback (store clamps + steppers disable) | **VERIFIED HOLDING** | `OrderDialog.tsx:445-464` (cap-disabled steppers), `CartLineItem.tsx:72`, `CartSlideOver.tsx:178`, `cart.ts:166,208` (clamps); API 422 copy pinned by r109 tests |
| r109-F2 local-number WhatsApp normalization + order-confirmed fallback link | **VERIFIED HOLDING** | `whatsapp.ts:23-36`, `order-confirmed/page.tsx:88` (share-picker deep link when `wa` absent) |

Cross-references (owned by other auditors, not counted above): B-2 dashboard null-shell (B) ·
C-2/D-1 whatsapp/generate double-count + no backfill (C/D) · C-4 settings PUT bounds (server half of
H-4) · C-7 price-0 POST/PUT split (API half of H-7) · C-12 tempRestaurants .max(5) (wizard copy
covers it) · D-2 cancelled→completed (web UI guards verified intact in this audit:
`useOrderDetail.ts:37` STATUS_FLOW + `owner/orders/[id]/page.tsx:159` disabled-on-cancelled — the
mobile chips gap is D's) · D-7 category-delete contract (server half of H-6).

---

## Solid areas (evidence-checked, no action)

1. **Double-submit protection on every money path**: checkout `submittingRef` + disabled confirm
   (`cart/page.tsx:164-170`, ReviewDialog `:162`); OrderDialog content-swap to the success card
   (`:91-93,258-273`); PaymentDialog `sentRef` with validate-BEFORE-latch (the repo's documented
   anti-brick pattern, `PaymentDialog.tsx:117-133`); subscribe `submittedRef` with the same
   ordering + explicit un-latch on every failure branch (`subscribe/page.tsx:192-276`). Idempotency
   key minted per checkout, REUSED on ambiguous-failure retry, retired on confirmed success
   (`cart/page.tsx:69-82,201-204,266-268`).
2. **Order-detail state machines (owner + admin)**: skeleton → error-with-retry («خطأ في التحميل» +
   reload) → not-found («الطلب غير موجود»), forward-only status timeline, cancelled locks all
   transitions, `window.confirm` on cancel (`owner/orders/[id]/page.tsx:94-224`, admin twin shares
   the spine). This is where D-2's mobile gap is already guarded on web.
3. **Checkout money truth**: client sends no money fields; server re-prices; the WhatsApp receipt is
   built from the SERVER echo (names/prices/notes) with the cart as fallback only for the inert
   idempotent replay (`cart/page.tsx:244-337`); error mapping splits 403-envelope (plan cap →
   "contact the restaurant") vs 403-plain (CSRF → reload) vs 429 (wait) vs server envelope
   (`submit-error.ts` — honest, non-retriable failures never advise retry).
4. **Owner reviews + loyalty redeem**: full loading/error/retry states, server envelopes surfaced,
   race-safe redeem with phase machine and eligible gating (`owner/reviews/page.tsx`,
   `owner/loyalty/page.tsx:177-296`).
5. **Admin panel state discipline** (users/restaurants/telegram/menu): `getErrorMessage` surfacing,
   LoadingAnnouncer + skeletons, empty states with filter escapes (`admin/users/page.tsx:71-76`,
   `admin/telegram/page.tsx:253-278`, `admin/subscriptions/page.tsx:147-232`, `admin/menu/page.tsx:134-160`).
6. **Cart page core journey**: pickup-type fetch has its own loading/error/retry strip
   (`PickupTypeSelector.tsx:33-46`); empty-cart state keeps the undo banner reachable when the LAST
   item is removed (r118-A5-F5 held, `cart/page.tsx:371-379`); cross-restaurant reset lands on a
   fully consistent store with a toast (r103-N3 held, `cart.ts:137-158`); undo has a
   cross-restaurant guard (r118-A5-F1, `cart.ts:181-200`).
7. **Menu journey fundamentals**: quantity caps everywhere (steppers disable at 99 + store clamps);
   modifier groups are real fieldsets with required-group `role=alert` blockers, live price region
   and the maxSelect ceiling (dimmed unselected chips); sold-out items never render (server-filtered
   design); search is a labeled combobox with debounce + deferred filtering; long names/notes are
   clamped (`line-clamp`) and capped at input (500); ReviewSheet has loading/retry/empty/star-filter
   states.
8. **Global surfaces**: sonner Toaster `dir="rtl"` in both group layouts (r120 fix held), z-index
   above dialogs; dialogs are the shared shadcn/base-ui pair (DialogTitle everywhere, escape/backdrop
   handled); skeletons are `animate-breath`/`animate-pulse` with `LoadingAnnouncer` on data-heavy
   pages; ConnectivityBanner offline strip in both trees; 404/500 tri-layer intact (r112).

---

## Counts

- **New findings: 11** — 0×P0, 0×P1, **3×P2** (H-1 cart money format drift, H-2 checkout stuck-submit
  lockout, H-3 /cart hard-load empty-state flash), **8×P3** (H-4 settings form uncapped, H-5 upgrade-mode
  blank step, H-6 CRUD error-envelope swallowing, H-7 price-0 UI gate, H-8 undo asymmetry + persisted
  lastRemoved, H-9 page-scoped admin stat cards, H-10 unidentifiable sold-out line, H-11 QR
  fetch-failure-as-empty-state)
- **Ledger/prior-round verification: 12 items** (7 verified holding, 3 ledger-verified still-open,
  2 present/deferred) + 7 cross-references to B/C/D findings (independently confirmed, not counted)
- **Solid areas: 8** with evidence
