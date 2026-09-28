# DESIGN.md — the Smart Menu design language

> Context file for design/UX work (impeccable `document` output, r121). These are the system's
> laws as verified in code (I-audit r121) — follow them; change them only deliberately and
> update this file in the same commit.

## Identity

Dark-first flame world (extracted from the SmartBot spec, r95): background `#010000`,
cards `#070503`, ink `#ebe7e2`, flame accent `#bc4700` — all as **dual-lightness tokens**
(`globals.css` light/dark layers, both AA-verified). Light mode is a first-class parity mode,
not an afterthought. High-contrast mode has its own token layer + pre-paint boot script (AAA).
Reduced motion is honored at BOTH layers (global CSS clamp + `MotionConfig reducedMotion="user"`).

**Brand signature**: the QR-corner motif. The hero's live demo QR is the Persuade-mode anchor.

## Color

- **Tokens only.** Raw palette classes and arbitrary hexes are banned outside the token files
  (5 sanctioned hex sites exist; audit before adding any). The ONE sanctioned exception:
  WhatsApp brand colors (incl. `--whatsapp-ink`) on WhatsApp CTAs.
- **Status language = semantic tokens** via `lib/order-status.ts` (SSOT — every surface adopts
  it, r121): `warning` amber = new/pending · `info` blue = preparing/in-progress ·
  `success` green = ready/completed · `destructive` = cancelled. Never raw orange/red/green.

## Typography

- Families: **Cairo** = UI text · **Readex Pro** = display/headings. Nothing else ships.
- **No letter-spacing on Arabic, ever** — the `[class*=tracking-]` guard in globals.css
  enforces it; don't fight it.
- Scale: `xs → 5xl` tokens. Display sizes above 5xl use Tailwind steps (`text-6xl`), never
  arbitrary px. Weights ≤ 700 (no 800 — the shipped Cairo subset has no 800; see I-10).
- Micro-type debt is known and tracked: `text-[10px]`/`text-[11px]` family (r121 ledger ~100
  sites) — don't add new ones; prefer `text-xs` tokens.
- Numbers everywhere: `tabular-nums` + `lining-nums` globally (this is a numbers product).

## Shape, space, elevation

- Radius scale: **8 / 12 / 18 / 28** (+16/24 component defaults) via `rounded-*` utilities —
  pills `rounded-full`, cards `rounded-xl`. Never ad-hoc px radii.
- Spacing: Tailwind scale only (zero arbitrary px in the codebase — keep it that way).
- Shadows: Tailwind defaults (`shadow-md` etc.). The old custom 4-tier shadow token system was
  dead code and was removed (r121) — do not resurrect it; if a warm shadow is ever needed,
  design it as a token and USE it.

## Components

- Primitives (`src/components/ui/*`: button, input, select, sheet, dialog, card, badge,
  table, switch, label, separator) are the default choice — never re-implement a primitive.
- **Empty states**: use the `EmptyState` component (r121 consolidation; legacy patterns are
  being retired — don't add hand-rolled ones).
- **Loading**: `Skeleton` (warm gradient shimmer) for shape placeholders; `animate-pulse` only
  for live status indicators — two jobs, two looks, never interchangeable.
- Filter pills / segmented rows: the shared pattern (r121) — one radii/padding/active treatment.
- Icons: lucide named imports only. Directional icons in RTL get `rtl:rotate-180`; **back
  affordances use ArrowRight/ChevronRight** (RTL convention, documented at print/page.tsx).

## Motion

Durations 300–700ms (`--ease-smooth`, `--ease-out-quart`). Dialogs/sheets 300ms (r120).
Above-fold hero uses `animate-rise-in` (transform-only — never gate CTA visibility on
animation clocks). Infinite ambient motion (orbs) is viewport-gated + reduced-motion-hidden.
No scroll-hijacking on operational surfaces.

## Layout & z-layers

- Sticky/float band lives at z-30/31/33; dialog/sheet band at z-40/50 — floats NEVER cover
  modals (the r121 J-1 tap-hijack lesson: a float over a money CTA is a revenue bug).
- Sheets use `dvh` (not `vh`) — iOS URL-bar safe.
- Numeric/bidi content (phones, IBAN, order numbers) gets `dir="ltr"` or `bdi` isolation;
  Arabic labels render `dir="auto" text-start`.

## Mode rule (I-12)

Persuade surfaces may carry the full flame identity (gradients, glow, showcase). Operate
surfaces get a thin header accent AT MOST. Never port marketing ambience into CRUD density.

## SEO/metadata conventions

Title template `%s | المنيو الذكي`; page titles never repeat the brand suffix (r121).
Per-restaurant menus get unique meta + Restaurant JSON-LD (real data only — `servesCuisine`
was removed because it was invented). Auth surfaces + print are noindex.
