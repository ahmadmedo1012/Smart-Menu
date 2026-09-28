# 5-X1 — r121 cross-check worklog (P1 findings verification)

Task ID: 5-X1 (X1 CROSS-CHECKER) — adversarial verification of the 8 r121 P1 findings before fixing.
READ-ONLY on code; only this worklog + X1-p1-verification.md written. Two one-session standalone-server
probes (started + killed inside the same bash call, M-6 pattern) for live M-1/M-3 evidence.

- Verified all 8 P1 claims by full re-read of the cited routes/components plus their callers/callees:
  6 CONFIRMED, 1 CONFIRMED-with-correction (P-1 — one evidence line refuted), 1 PARTIAL (M-3 — core
  confirmed, the "same class of bug across routes" claim refuted).
- C-1 CONFIRMED at reviews/route.ts:199-205: delete runs before the menuItemId scope check and a
  resolved $transaction callback COMMITS — cross-tenant destructive delete + 404 + victim counter
  drift. C-1's "zero test coverage" is inaccurate (r103-fixes.test.ts:289-299 pins the surface with
  commit-invisible mocks — M-4's correction verified); fix = deleteMany({id, menuItemId}) + M-4's
  mock update in the same change-set.
- E-1 CONFIRMED at items/[id]/route.ts:92/153-159/220-224 (destination category never validated;
  POST's ladder at items/route.ts:196-228 is the correct pattern; category ids enumerable via the
  public menu payload — public/menu/[slug]/route.ts:74). Nuance: image still validated against the
  CURRENT tenant — A-controlled but not a foreign blob.
- G-1 CONFIRMED: chunk 45b08jpy-zb6l.js = 439,315 B raw / 131,926 B gz; polyfill module ids
  (230/872/686/854/5944/763/7984/7016) referenced by ZERO modules across all 118 chunks (my own
  scan reproduces the orphan claim); exactly 28 manifests load it, / + /pricing clean; qrcode is the
  ONLY client dep with node-builtin requires; the executed browser core is the self-contained
  35s8 chunk; the loyalty page's ReferralQR dynamic import demonstrably loads the clean async chunk
  with no polyfill chain — strong evidence the dynamic-import fix drops the sync-chunk polyfills
  (rebuild verification still mandatory). NEW FLAG: G-1's resolveAlias fallback would break the
  print page's server-side QRCode.toDataURL unless browser-condition-scoped.
- J-1 CONFIRMED: floats mounted permanently in both layouts inside non-transforming MotionProvider
  (root stacking context); Base UI dialogs portal to body; no hide-when-open mechanism exists;
  CartSlideOver FAB renders while its own sheet is open. Fix assessment: (a) z-30/31/33 (3 one-line
  edits) recommended — full z-census checked for side effects; (b) needs a new modal-open marker
  across ≥4 modal surfaces; (c) too big.
- P-1 CONFIRMED end-to-end (toggle ×10 client-side → CTA has no billing param → wizard shows/charges
  monthly → server rejects amount ≠ plan.price → approval grants periodDays=30; live DB: all plans
  periodDays=30, no yearly price anywhere). REFUTED sub-claim: /api/plans DOES expose periodDays
  (full-row spread; PricingClient:63 consumes it). Minimal honest fix = remove the toggle (no test
  pins it); making yearly real is a ~7-touch-point product feature (annual-plan-row path needs zero
  decision-logic change thanks to r119-S2-P2-2).
- P-2 CONFIRMED: PickupType enum = inside/takeaway/delivery only; grep for reservation/waitlist/حجز
  and otp/phone-login/برقم الجوال across src+schema+API.md hits ONLY the marketing lines. Nit: the
  r82 honesty comment sits below the features array, not above.
- M-1 CONFIRMED live + static: POST /api/auth/login {} → 422 «يرجى إدخال اسم المستخدم وكلمة
  المرور» (standalone one-session probe). Exactly 7 stale pins (api-smoke:47, api-sweep:68-helper×4,
  full-sweep:298, auth-fix-verification:41); other 400 pins (referral-claim ×5, loyalty-redeem ×2,
  round86 [400,404]) verified NOT stale. Fix = 400→422 + api-sweep inner `=== 400` guards → 422.
- M-3 PARTIAL: login malformed/empty body → 500 reproduced live (custom catch at :195-198 bypasses
  handleError). But the "same class of bug" is REFUTED: of 40 request.json() call sites, 38 are
  already covered — handleError (api-helpers.ts:110-113) maps JSON-parse messages to 400 «بيانات
  غير صالحة — خطأ في صيغة JSON» (orders/validate/register verified by read), referrals/claim has
  an inline .catch, webhook pre-checks content-type. Only auth/login (public) + admin/events/trigger
  (auth-gated) 500. Minimal fix = inline parse guard in login only, keeping the generic-500 for the
  rest (preserves no-leak hardening).
- Interaction map (9 items) written into the report — headline: C-1×M-4 mock coupling, M-1×M-3
  same-file batching, G-1 resolveAlias×print-page server QR (NEW hazard), J-1(a)×P-6 compatible,
  no fix removes any r118-r120 hardening (round-tags checked per touched file).
- Output: docs/rounds/audits/r121/X1-p1-verification.md (8 verdicts + own line citations + fix
  recommendations + risks + interaction map). No code changed.
