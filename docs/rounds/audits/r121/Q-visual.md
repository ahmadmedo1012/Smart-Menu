# r121 — Auditor Q: Visual Regression (REAL browser vs production build)

**Scope:** browser-driven verification of sibling code-level findings (J-1, H-3, G-1) + new visual
defect sweep. **Zero product code written** — throwaway Playwright scripts + screenshots only
(`test-screenshots/r121/*.cjs`, gitignored dir).

**Environment:** standalone production build from HEAD `74ef578f` (`.next/standalone/server.js`),
local PG :5434 (seed `al-waha-cafe-demo`, 25 items), server started per-call via the r121 recipe
(killed every call). Browser: Playwright chromium (chromium-1243, real Chrome binary), always
`http://localhost:3000` (CSP nonce binds to localhost). Viewports 375×667 + 1440×900, dark theme
default, locale ar-LY. Admin surfaces tested with `admin/smart123`; **owner surfaces NOT tested**
(no owner credentials seeded — per round instructions; anonymous + admin only).

**Method notes:** every defect claim below carries a screenshot path + a DOM measurement
(`getBoundingClientRect` / `elementFromPoint` / computed z-index via `page.evaluate`). VLM
(`z-ai vision`) was used to review 13 key screenshots; **every VLM impression was re-checked
against DOM measurements** — 4 impressions were DISPROVEN and are listed in §VLM so no false
positive leaks into the ledger.

---

## 1. Sibling-finding verdicts

### J-1 [P1 — VERIFIED, browser-proven, including the tap-hijack] Floating z-band (60/61/63) paints above the modal band (40/50) and hijacks money-path CTA corners at 375px

**Verdict: CONFIRMED on every surface J named, with measured overlap geometry and hit-test proof.**

All measurements at 375×667, RTL (`dir=rtl`), dark theme, real production build:

| Surface (screenshot) | Floating control (z) | Modal/CTA (z) | Measured overlap | Hit-test at overlap center (`elementFromPoint`) |
|---|---|---|---|---|
| OrderDialog bottom sheet, CTA «أضف إلى السلة» after in-sheet scroll (`j1-orderdialog-scrolled-375.png`) | WhatsApp float x=16,y=595,56×56 (z=60) | CTA x=21,y=567.7,333×48; sheet z=50 (y=66.7–667, full width) | **51×20.7px** of the CTA's leading corner | **«تواصل عبر واتساب»** — tap opens WhatsApp, not add-to-cart |
| CartSlideOver footer CTA «إتمام الطلب» (`j1-cartslideover-375.png`) | float x=16,y=595,56×56 (z=60) | CTA (Link→/cart) x=16,y=603,285.8×48; sheet z=50 (318.8×667) | **56×48px — the CTA's FULL height × 56px width (~20% of the button)** | **«تواصل عبر واتساب»** |
| /cart page CTA «مراجعة الطلب وإرساله» (`j1-cart-page-375.png`) | float x=16,y=595,56×56 (z=60) | CTA x=16,y=611.5,343×56 | **56×39.5px** | **«تواصل عبر واتساب»** |
| ReviewSheet (menu reviews, bottom sheet) (`j1-reviewsheet-375.png`) | float (z=60) | sheet y=100–667, 375×567 (z=50) | **56×56px** over the sheet's list area | (same geometry class as above) |
| OrderDialog open + cart non-empty (`j1-orderdialog-withfab-375.png`) | cart FAB (z-[63] wrapper) x=16,y=459,56×56 **and** float | sheet z=50 | **both fully inside the sheet rect (56×56 each)** — FAB floats over the sheet's item-controls region | float at (44,623) inside sheet → hits «تواصل عبر واتساب» |
| ScrollToTop after >400px page scroll + OrderDialog open (`j1-scrolltotop-over-dialog-375.png`) | ScrollToTop x=315,y=615,44px (z=61) | sheet z=50 | button remains visible & top-most over the dimmed sheet | **«العودة للأعلى»** — intercepts taps over the modal |
| ReviewDialog (centered, `j1-reviewdialog-375.png`) | float (z=60) | dialog x=16,y=161,343×345 (z=50) | no panel overlap (float sits below the centered panel) — but the float still paints ABOVE the z-40 overlay | n/a (visual layering only) |

Supporting facts measured live: `FloatingWhatsApp` mounts 3s after page load (deferred mount,
`FloatingWhatsApp.tsx:13-19`) — the overlap applies from t+3s onward, i.e. for any dialog opened
after the first 3 seconds on the page (the normal browsing case). The float anchor href is
`https://wa.me/218900000000` (env number) — a hijacked tap navigates the user to a WhatsApp chat.
VLM independently confirmed the visual: the orange bubble is painted on top of the open bottom
sheet over the notes/CTA region (`j1-orderdialog-375.png`).

J-1's arithmetic («~56×48px corner of the add-to-cart button») is confirmed within measurement
rounding (51×20.7 on the OrderDialog CTA once scrolled into view; 56×48 on the slide-over CTA —
the worst case). Note one nuance J did not mention: at initial open the OrderDialog CTA is not
even visible (see Q-3 below), so the hijack window opens once the user scrolls the sheet.

**Conclusion: fix J-1 as proposed (drop the floating band to z-30 or hide on modal-open). The
tap-hijack on three money-path CTAs is real and reproducible.**

### H-3 [P2 — VERIFIED, and materially worse under throttle than the code-level estimate] /cart hard-load paints «السلة فارغة» before the persisted cart rehydrates

**Verdict: CONFIRMED — SSR empty state + 0.4s flash unthrottled / 1.5–2.3s flash at 6× CPU throttle.**

Method: seeded `localStorage['cart-storage']` pre-navigation (`page.addInitScript`) with the real
persisted shape learned from `src/store/cart.ts:238-257` (name `cart-storage`, `version: 1`,
state.items[] with a 2× إسبريسو line); rAF-loop observer recording when `document.body.innerText`
first contains «السلة فارغة» vs «إسبريسو».

| Scenario (screenshots) | First paint | «السلة فارغة» seen | Items visible | False-empty duration |
|---|---|---|---|---|
| No throttle, 375×667 (`h3-unthrottled-early/-settled.png`) | 728ms | t=760ms | t=1149ms | **~390ms** |
| CPU 6× throttle (`h3-cpu6x-emptyflash.png` / `h3-cpu6x-hydrated.png`) | 1068ms | t=1599ms | t=3136ms | **~1.54s** |
| CPU 6× throttle, poll-capture run (same dir) | — | t=2236ms | t=4573ms | **~2.34s** |

SSR mechanism confirmed: raw HTML of GET /cart contains «السلة فارغة» + «أضف بعض الأصناف» and
does NOT contain the item name — the server itself renders the empty state (status 200).
VLM confirmed the captured flash screenshot shows the full empty-cart state (big heading + browse
CTAs) while the settled screenshot shows the espresso line + checkout button.

A customer refreshing /cart mid-checkout on a throttled phone sees «سلتك فارغة» for up to ~2.3
seconds. H-3's fix (gate the empty state on hydration) is the right minimal fix; browser evidence
supports P2 (arguably the frightening-ness justifies the P2 as-is).

### G-1 [P1 — VERIFIED on the local build] ~429 KB raw / ~128 KB gzip orphan polyfill chunk ships on the customer menu + login + subscribe + cart + order-confirmed; not on / or /pricing

**Verdict: CONFIRMED — same chunk, same size class, same route blast radius as G-1's live measurement (local build hash differs).**

- Local orphan chunk: `/_next/static/chunks/45b08jpy-zb6l.js` (= the local-twin of live `22h-0s9vlekd5.js`; G-1's local-manifest name matches exactly).
- Wire size, curl-verified: `Accept-Encoding: gzip` → **131,541 B (128.5 KB gz)**; identity → **439,315 B raw**. Polyfill fingerprints present in the chunk body (`rg 'red works only with positives|fromByteArray|utf16le'` → match; crypto-browserify/bn.js/Buffer strings).
- Browser network log per route (fresh context, load + 3.5s settle):

| Route | JS files loaded | JS decompressed total | polyfill chunk loaded? |
|---|---|---|---|
| `/` | 22 | 943.7 KB | **NO** |
| `/pricing` | 22 | 943.7 KB | **NO** |
| `/login` | 25 | 1421.7 KB | **YES (439.3 KB)** |
| `/subscribe` | 26 | 1450.6 KB | **YES** |
| `/menu/al-waha-cafe-demo` | 30 | 1523.2 KB | **YES** |
| `/cart`, `/order-confirmed` | 52/56 (double-counted listener run) | — | **YES** (first run, per-response log) |

The chunk is **28.8% of all JS parsed on the flagship menu page** (439.3/1523.2 KB decompressed) —
consistent with G-1's live 26%-of-first-load-JS claim (page-total measurement methods differ
slightly; both ≈ a quarter-plus of the page's JS). G-1's fix (dynamic `import('qrcode')` in
`SelfHostedQR` per the `ReferralQR.tsx` precedent) stands; the browser confirms the payload is
actually transferred on exactly the routes G-1 listed.

---

## 2. New findings

### Q-1 [P3] `/_vercel/insights/script.js` 404s on EVERY page in standalone/local serving — `@vercel/analytics` script is injected with no endpoint behind it
- Type: FACT (browser-measured; environment-scoped — Vercel prod serves this endpoint)
- Evidence: console error on all 19 audited page loads (/, /menu, /pricing, /subscribe, /login, /cart, /order-confirmed, /admin*, 404 page): `Refused to execute script from 'http://localhost:3000/_vercel/insights/script.js' because its MIME type ('text/html') is not executable` + `[Vercel Web Analytics] Failed to load script…`. Both trees mount `<Analytics />` (`(public)/layout.tsx`, `(protected)/layout.tsx:165`). Secondary anonymous probe: `/subscribe` fires `GET /api/auth/me` → 401 (benign anonymous-auth check, no UI error).
- Impact: technical/local-only — one guaranteed console error per page in every standalone e2e/local QA run (noise that trains devs to ignore consoles); no user-facing impact on Vercel.
- Fix (minimal): in the standalone/e2e env only, disable via `NEXT_PUBLIC_VERCEL_ANALYTICS_DISABLED` or mock `/_vercel/insights/script.js` in the e2e server. Do NOT touch the production mount.
- Risk: none. Tests: existing e2e suites get a cleaner console baseline.
- Screenshots: n/a (console) — reproducible on any page; see sweep JSON in this dir.

### Q-2 [P3] /admin dashboard ships the generic root document title («الربط الذكي | Smart Menu — منيو رقمي…») instead of an admin-specific one
- Type: FACT (browser-measured)
- Evidence: after admin login (admin/smart123) → `/admin`: `document.title` = «الربط الذكي | Smart Menu — منيو رقمي للمطاعم والمقاهي» (the root default) while the page's own `h1` is «لوحة التحكم» (`admin-dashboard-1440.png`). Every other audited page has a page-specific title (menu, pricing, subscribe, login, cart, order-confirmed, 404 all correct — verified in sweep).
- Impact: user-facing minor (browser tab/bookmark/history for the dashboard is indistinguishable from the marketing landing); tab-grouping/closing the wrong tab when both are open.
- Fix (minimal): `export const metadata = { title: 'لوحة التحكم' }` (or `title: { absolute }`) in `src/app/(protected)/admin/page.tsx` — one line, inherits the existing template.
- Risk: none. Tests: none (metadata unit pin if L-auditor wants one).
- Note: metadata is L-auditor's domain — logged here because it surfaced in the browser sweep; not re-reporting beyond this.

### Q-3 [P3] OrderDialog's primary CTA is below the visible fold when the sheet opens at 375×667 — users must scroll inside the sheet to reach «أضف إلى السلة»
- Type: FACT (browser-measured)
- Evidence: at initial open of the espresso OrderDialog (bottom sheet, `max-h-[90dvh]` = 600.3px, y=66.7–667): CTA rect y=717.7–765.7 — i.e. **the CTA top sits 50.7px BELOW the sheet's visible bottom edge** (sheet content ≈699px tall vs 600px visible; `overflow-y-auto` swallows the rest). Screenshot `j1-orderdialog-375.png` (CTA absent from the first viewport of the sheet); `j1-orderdialog-scrolled-375.png` (after in-sheet scroll the CTA appears — and immediately meets the J-1 overlap).
- Impact: user-facing on the primary order action at the most common mobile viewport: every item open requires an extra in-sheet scroll before the money CTA is even visible; combined with J-1 the CTA then lands under the WhatsApp bubble.
- Fix (minimal, judgment): trim the mobile sheet's pre-CTA content (compact image header on <sm, or `max-h-[92dvh]` + reduced paddings) so the CTA is visible at 667px height. Needs design call — flagging measurement, not prescribing pixels.
- Risk: of fixing — layout regression risk on short items; of not fixing — friction on every order at 667px-class phones (iPhone SE/8 class).
- Tests: gstack 375×667: open item dialog → CTA visible without in-sheet scroll.

### Q-4 [UNVERIFIED — one occurrence, no stack, not reproducible] Full-page error boundary («حدث خطأ غير متوقع») rendered once immediately after add-to-cart on /menu
- Type: UNVERIFIED observation (1 occurrence in ~10 add-to-cart runs across this session)
- Evidence: during an early J-1 tracing run (375×667, dialog → «أضف إلى السلة»), the page swapped to the app error boundary — body text: «حدث خطأ غير متوقع / يرجى المحاولة مرة أخرى / إعادة المحاولة / العودة للرئيسية» (matches `src/app/error.tsx:21` / `global-error.tsx:39` wording). No `pageerror`/console stack was captured in that run (listeners were attached only in later runs). 3 targeted reproduction attempts (identical flow, full console capture) all succeeded normally (landed on /cart with the item intact, zero JS errors). The localStorage cart survived in the failing case.
- Impact: if real, a rare client crash on the money path. Currently unproven — treat as a watch-item for M-auditor's e2e runs, NOT as a confirmed defect.
- Fix: none proposed (no repro). Suggest M-auditor add a repeated add→/cart e2e (10 iterations) with `pageerror` capture.

---

## 3. Defect sweep matrix (Task 4 — dark default)

19 page-loads audited (console errors, `document.scrollWidth > innerWidth`, broken images
(`naturalWidth===0`), CLS via PerformanceObserver layout-shift, viewport-clipped elements):

| Page (375 / 1440) | overflowX | broken imgs | CLS | clipped elements | console errors (excl. Q-1) |
|---|---|---|---|---|---|
| home | 0 / 0 | 0 / 0 | 0.0011 / 0 | none | none |
| menu top+mid | 0 / 0 | 0 / 0 | 0.0227 / 0.0064 | tabs-strip snap buttons partially offscreen **(by design — scroll-snap strip)** | none |
| pricing | 0 / 0 | 0 / 0 | 0.0009 / 0.0001 | none | none |
| subscribe | 0 / 0 | 0 / 0 | 0.0004 / 0.0002 | none | 401 `/api/auth/me` (benign anonymous probe) |
| login | 0 / 0 | 0 / 0 | 0 / 0 | none | none |
| cart (seeded) | 0 / 0 | 0 / 0 | 0 / 0 | none | none |
| order-confirmed (fake №) | 0 / 0 | 0 / 0 | 0 / 0 | none | none |
| /admin (login→dashboard) | 0 (1440) | 0 | 0.0051 | none | none |
| /admin/restaurants | 0 (1440) | 0 | 0 | none | none |
| 404 page | 0 / 0 | 0 / 0 | 0 / 0 | none | none |

- **Zero horizontal overflow at 375 and 1440 on every audited page** — the r113/r120 zero-overflow claims HOLD at HEAD (J-3's "collapse, not overflow" caveat remains the exception, untestable without owner login).
- **No broken images anywhere** (all menu/hero/admin images resolve).
- CLS ≤ 0.0227 everywhere (menu-375's two small shifts trace to the category strip + a header link — consistent with the known-deferred StickyMenuHeader SSR-mount ledger item, NOT a new finding).
- The r111/r112 themed-404 fix renders correctly (`notfound-375.png` / `notfound-1440.png`, title «404 - الصفحة غير موجودة | المنيو الذكي»).
- Observation (product domain, not visual): `/order-confirmed?orderNo=ORD-FAKE123` renders the full success UI («تم تأكيد الطلب!» + WhatsApp send + referral) for an arbitrary non-existent order number — no validation against the DB (`order-confirmed-375.png`). P-auditor's call.
- Owner surfaces (`/owner/*`) NOT audited — no owner credentials in the local seed (per round instructions: anonymous + admin only). J-3's owner-menu-row squeeze therefore stays UNVERIFIED-by-browser this round.

## 4. Dark/light parity spot-check (Task 5)

Theme toggle («الوضع النهاري») works on home + menu: `html.dark` true→false on click; light body
bg ≈ near-white (lab L* 98.3) vs near-black text (L* 1.6) — sane polarity, no flash observed.
Screenshots: `theme-light-home-375.png`, `theme-light-menu-375.png` (VLM: clean, no light-mode
regressions spotted). Consistent with r111's dual-lightness parity verdict.

## 5. Reduced motion (Task 6)

`page.emulateMedia({ reducedMotion: 'reduce' })` on home + menu: the global guard
(`globals.css:721-730` and `:1190-1204` — `animation-duration: 0.2s !important;
animation-iteration-count: 1 !important`) collapses all infinite animations (orb-float,
pulse-dot, ping, shimmer, float-slow, hero-glow-pulse) to a single 0.2s pass. A 300ms position-
drift probe over every still-attached animation found **0 elements still moving** after settle on
both pages. Verdict: reduced-motion is respected (WCAG-pass pattern); no finding.
Screenshots: `reduced-motion-home-375.png`, `reduced-motion-menu-375.png`.

## 6. VLM leads raised and DISPROVEN by DOM measurement (kept out of the ledger)

1. «WhatsApp widget heavily overlaps home hero CTAs (تسجيل الدخول/تصفح القائمة)» — DOM: CTAs y=372–428 vs float y=595–651 at 375px → **167px vertical gap, no overlap** (float overlaps only static hero art below the CTAs — standard FAB behavior).
2. «cart notes input cut off horizontally» — viewport boundary in a viewport-sized screenshot; page scrolls; not clipping.
3. «pricing order-summary table clipped at bottom» — same viewport-boundary artifact (page scrolls; pricing page has no order summary).
4. «menu card description cut off at container bottom» — the card description `line-clamp` is the designed truncation.

VLM-only impressions above are UNVERIFIED/rejected; none are counted as findings.

## 7. Solid areas (evidence-backed)

1. **Zero horizontal overflow / zero broken images / CLS ≤0.023 across 19 loads at 375+1440** — the r113/r115/r120 responsive claims hold at HEAD in a real browser.
2. **Themed 404 boundary works** (r112 F12 re-implementation verified live).
3. **Light theme + reduced motion guards behave** (§4, §5).
4. Admin dashboard + restaurants render clean at 1440 (VLM: clean; no console errors beyond Q-1).
5. J-auditor's z-index arithmetic is exactly right in the browser — the sibling's code-reading can be trusted for the surfaces I could reach.

**Counts: 3 sibling verdicts (J-1 VERIFIED P1 · H-3 VERIFIED P2 · G-1 VERIFIED P1) + 3 new findings (Q-1..Q-3, all P3) + 1 UNVERIFIED observation (Q-4). 44 screenshots under `test-screenshots/r121/`.**
