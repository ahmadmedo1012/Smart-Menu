# 17-SM — r146 worklog (rescue continuation: live search + mount-on-open dialogs + CSS verdict)

Task ID: 17-SM — rescue of a dead agent's uncommitted tree at HEAD `ccd83a0` (r145),
adjusted by the fresh 17-PERF measurements (`phase4/17-PERF.md` §menu).
Agent: full-stack-developer (rescue). Mission: (1) verify OrderDialog state vs perf,
act only on a SAFE obvious win; (2) demo menu search live filtering (the deliverable);
(3) CSS bloat — split only if trivially safe, else document.

## Tree state found (NOT clean — audited first, per protocol)

- 4 modified (`MenuPageClient.tsx`, `MenuToolbar.tsx`, `tests/unit/debounced-callback.test.ts`,
  `docs/ENGINEERING_STATE.md`) + 2 untracked (`dialog-chunk-fallback.tsx`,
  `tests/unit/menu-toolbar-live-search.test.ts`).
- Audit verdict: **COMPLETE and internally consistent.** The live-search source pins in the
  untracked test match the modified source byte-for-byte; the mount-gate wiring matches
  OrderDialog's existing reset-on-open `useEffect` (OrderDialog.tsx:131 — notes/quantity/
  confirmed/pre-selections reset when `open` flips true, also on mount); no leftover
  direct-call site of the old callable-debounce API anywhere (`useDebouncedCallback` /
  `createDebounced` / `MenuToolbar` have exactly one consumer each). The ENGINEERING_STATE.md
  edit was the 15-SM leftover entry documenting commit `ccd83a0` itself (bookkeeping that
  missed the previous commit) — carried into the docs commit, not the code commit.
- The rescue was therefore verification + gates + the three mission verdicts + commit,
  not re-implementation.

## Mission 1 — OrderDialog / QR-path hydration graph: VERIFIED + safe win shipped

17-PERF §menu (bottleneck 3) confirmed: `OrderDialog` is already `dynamic(..., {ssr:false})`
(MenuPageClient.tsx since round86-B8) — do NOT re-do it. What remained in the initial
QR-path graph: the dynamic components were still **rendered at hydration** (closed = renders
nothing visually, but next/dynamic fetches the chunk when the element enters the client
tree) → the ~871-line OrderDialog + ~649-line ReviewSheet chunks were fetched on every
menu load even for a QR customer who never opens a dialog.

Shipped win (the safe, obvious one — already written by the dead agent, verified here):
- **Mount-on-open gates**: `orderDialogMounted` / `reviewSheetMounted` latch true on first
  real open; before first open nothing renders → zero dialog-chunk bytes at hydration.
- **Stay mounted after first close, on purpose**: close flips `open=false` inside the kept
  component so the exit animation (`data-ending-style` in ui/dialog) completes instead of
  being truncated by tree removal; reopen is instant (cached chunk); per-open state reset
  lives in OrderDialog itself (existing `useEffect` on `open`) — verified, not assumed.
- **DialogChunkFallback** (`loading:` for both dynamics): same overlay recipe as ui/dialog
  (`fixed inset-0 z-40` + 4px blur + `--overlay`), glass-strong card, `role="status"`
  + `aria-live="polite"` + `aria-busy` + sr-only announcement. Fixed overlay → **zero CLS**;
  no scroll lock / focus capture (transient state; base-ui dialog takes over both on arrival).
- **Parity safety**: the gates render nothing server-side and the closed dialogs rendered
  nothing before → baked HTML byte-identical (no bailout templates, r97-W6c/W6d doctrine).
  Proven empirically by parity 237/237 staying green.

### Documented skips (mission rule: skip anything risky)
- **GalleryCarousel below-fold lazy — SKIPPED.** It is statically imported behind a
  CLS-proof reserved box (r113-F115, exact aspect placeholder, measured CLS 0.06–0.155
  before the fix) and sits in the hero, near the fold on 390px. Lazy-loading it would
  reintroduce the `next/dynamic`-around-menu-content class of race
  (BAILOUT_TO_CLIENT_SIDE_RENDERING) that r97-W6d specifically eliminated via
  static-import + mount-guard doctrine, for a small chunk. Not a safe obvious win.
- **CategoryTabs/FeaturedShowcase split + long-menu virtualization — SKIPPED.** 17-PERF
  itself grades this Medium-Hard; FeaturedShowcase is above-fold (lazy = CLS risk).
  Future round.
- **CSS purge — SKIPPED** (see Mission 3).

## Mission 2 — demo search live filtering: SHIPPED (the deliverable)

- Every keystroke schedules the match via the debounce handle (`debouncedSearchChange.call`)
  — trailing 275ms, last-wins → the grid re-filters live while typing, no Enter needed.
  275ms kept (not 250): it is the repo's existing core constant and sits inside the
  W1-QA-MENU acceptance window 200–300ms.
- **Enter = flush** of the latest pending value in BOTH dropdown states (closed; open with
  no active option). Choosing an active suggestion keeps priority over flush
  (`Enter && activeIdx >= 0` branch untouched).
- **Clear button** = `cancel()` + direct `onSearchChange('')` — a one-click clear must not
  wait out a typing window.
- **Matcher semantics untouched**: same `normalizeArabic` in the grid filter
  (`normalizeArabic(search.trim())`) and the suggestions (`normalizeArabic(deferredSearch.trim())`
  + `nameAr||name` includes); result flows through the same `onSearchChange → updateURL({q}) →
  urlState.q`. The round88-E1 `aria-live="polite"` result-count region («عُثر على …»,
  foundItemsPhrase) already existed — it now announces every live update with no change.
- Arabic RTL: nothing in the flow is direction-dependent (Up/Down keys neutral per existing
  note); Arabic input fully covered by the existing normalizer.
- Tests: +3 `flush` semantics in `debounced-callback.test.ts` (immediate fire + no double-fire
  after timer expiry; no-op with nothing pending; silent after cancel) and +7 source pins in
  `tests/unit/menu-toolbar-live-search.test.ts` (call-on-change, no send-gate, 275ms window,
  Enter-flush in both paths, clear cancel+apply, same-matcher wiring, aria-live region).
  **No existing test weakened** — the debounced-callback rewrite is indent-only (tabs→spaces)
  on unchanged assertions.

## Mission 3 — 273KB decoded CSS: split NOT trivially safe → documented

Facts established: `globals.css` (1796 lines) imports `tailwindcss` + `tw-animate-css` and is
imported by ALL THREE layouts (root, `(public)`, `(protected)`) — the single compiled
stylesheet is the Tailwind 4 compile of the whole source tree, public and admin/owner
together. **There is no admin-only import chain to cut** — no separate admin CSS file exists;
`landing.css` is already a component-level split used only by the landing `HomePage.tsx`.
A per-route-group split would require restructuring the Tailwind entry + content scanning,
i.e. a real project with 237-parity and visual-regression risk. **Deferred to a future round**
(per mission's "else document" branch). No changes made.

## Gates (all green)

- `pnpm lint`: **0 errors** (12 known legacy warnings, none in touched files — repo baseline).
- `pnpm typecheck` (tsc --noEmit): **0**.
- `pnpm test`: **2572/2572** (164 files; baseline 2562 + 10 new) — `env -u DATABASE_URL`.
- `pnpm test:parity`: **237/237**.
- `SKIP_ENV_CHECK=1 env -u DATABASE_URL pnpm exec next build`: **exit 0, 85/85 static pages**
  (sitemap fail-open expected without local Postgres; raw `pnpm build` aborts at
  migrate-deploy P1013 fail-closed by design).

## Commits (NOT pushed)

- **`1cac5cc`** `feat(r146): إنقاذ تكملة 17-SM — التصفية الحيّة لبحث المنيو وتركيب حواراته عند الفتح`
  (5 files: MenuPageClient, MenuToolbar, +dialog-chunk-fallback, +menu-toolbar-live-search.test,
  debounced-callback.test — +328/−79).
- docs commit with this worklog + ENGINEERING_STATE.md 17-SM entry (+ the carried-over 15-SM
  entry) — hash recorded in the central worklog.
