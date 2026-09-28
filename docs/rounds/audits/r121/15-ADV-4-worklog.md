# 15-ADV-4 — r121 worklog (FINAL ADVERSARIAL PERFORMANCE REVIEW)

Task ID: 15-ADV-4 (final adversarial performance review of round r121, HEAD 77407604).
Fresh eyes: wrote zero r121 code. Read-only on code/product; only outputs are this worklog +
`docs/rounds/audits/r121/ADV-4-perf.md`. Every r121 perf claim re-measured from scratch
(chunk grep/gzip analysis, one-session standalone server + curl `-w`, Playwright chromium
375×667 RTL DOM/geometry probes, live psql index/count checks). Throwaway probes in
`test-screenshots/r121/adv4/*.cjs` (gitignored).

## What was measured (headline numbers — full tables in ADV-4-perf.md)

1. **Chunk audit**: 123 JS chunks / 3.32 MB raw / 1.07 MB gz (NOT the 116 claimed; pre-round was
   118/3.12/1.01). Zero crypto/bn.js signatures anywhere (the sha512 hits are zod format-regex
   strings — fingerprinted). qrcode = async 23.8 KB raw / 8.8 KB gz via 3 loader chunks. 0
   unreferenced chunk files (liveness scan). First-load JS: /menu 480→360 KB gz (−25%),
   /subscribe 433→311 (−28%), /login 446→324 (−27%) — G-1 VERIFIED at the top of its predicted
   range; / and /pricing +4–7 KB (never carried the orphan).
2. **Doc weights**: /subscribe 32.5→62.7 KB raw (SSR trade visible; LCP 316–836 ms unthrottled,
   1.1–2.7 s @6×CPU vs 4.47 s ledger — G-5 VERIFIED). **/menu 292→318.4 KB raw / 31.4 KB gz
   (+9%/+15%) — the "no regression" framing fails**: +29.8 KB SSR DOM (G-7 header 10,080 B
   measured + 15.8 KB class-attr growth); JSON-LD unchanged → B-5 small wins NOT landed →
   ADV4-3 [P3] (re-base B-5 baseline).
3. **Live behavior**: G-7 header in first paint ✓; G-6 orbs paused offscreen / resumed ✓; H-3
   skeleton 245→591 ms, zero false-empty ✓; J-1 float z-30, dialog hit-test clean ✓;
   **Q-3 ✗ — OrderDialog CTA still 44 px below the fold at initial open (3/3 items, settled) →
   ADV4-1 [P2]** (94dvh + h-28 landed but content stack 716 px > visible 625 px; the "CTA above
   fold" claim fails measurement).
4. **Server cost**: plans 5-min TTL = in-process memoization (code + cold 106.7 ms → warm
   21.8–53.9 ms), NOT Data Cache — nuance recorded. requireAuth: /admin authed 13–49 ms TTFB vs
   anon 2–3 ms vs old client /me 5.8–10.1 ms → DB work per pageview unchanged (1 session
   lookup), better time-to-content, honest "roughly equivalent" verdict.
5. **Backfill**: join fully indexed (OrderItem.orderId + Order.createdAt btree verified in
   pg_indexes); row-locks only, low table-lock risk at 10k–100k rows; no batching + 2× JSONB
   parse (EXISTS + SET) noted; local no-op verified (77 items, 0 pre-cutoff). Idempotency
   defect already ADV2-2 — confirmed, not re-reported.
6. **Gaps**: `bundle-report.mjs` never got the polyfill fingerprints G-1's fix promised →
   ADV4-2 [P3]; csrfFetch factory duplicated ×6 chunks (informational, ADV4-4).

## Verdicts

Verified clean: G-1, G-5, G-6, G-7, H-3, J-1, G-3 cache rules, backfill cost profile.
New findings: **1×P2 (ADV4-1 Q-3 CTA below fold), 3×P3 (ADV4-2 missing regression guard,
ADV4-3 menu-doc re-baseline, ADV4-4 chunk-count/dup informational)**.

## Process notes

- The standalone server renames to `next-server (v16.3.4)` at runtime — `pkill -f
  standalone/server.js` misses it (M-6's recorded pattern is incomplete); one leftover caused an
  EADDRINUSE mid-review. Every session ended with `pkill -f "next-server"` + verified port-free
  curl. Recommend updating the M-6 lesson.
- No commits, no code changes, no DB writes (backfill probe was SELECT-only; ADV-2's
  empirical double-run test already covers the UPDATE path).
