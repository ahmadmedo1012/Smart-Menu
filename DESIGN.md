# DESIGN.md — the Smart Menu design language

> Context file for design/UX work. These are the system's laws as verified in
> code — follow them; change them only deliberately and update this file in the
> same commit.
>
> **Upstream source:** the Madarek design system (`madarek/frontend/src/styles/
> tokens.css` — the sibling-family single source of truth). **Token SSOT in this
> repo:** `src/app/globals.css` (`:root` = night layer, `.light` = cream layer,
> `@theme inline` = Tailwind bridge). Fonts: `public/fonts/fonts.css`. If this
> file and globals.css disagree, globals.css wins — fix the doc.

## Identity

Madarek night world (default theme): ground `#070B16` night-indigo, surfaces
`#0D1428 / #121A36 / #182142`, ink `#F2EFE6` warm sand, accent `#E9B44C` gold
(hover `#F5D48A` · strong `#C9962F` · soft `#2C2312` · on-accent ink `#05070F`),
hairlines `#1B2444 / #263052`. Light mode is a first-class parity mode: cream
ground `#FBFAF9`, ink `#191918`, copper accent `#B57438` (hover `#9A5F25` ·
strong `#5C3416` · soft `#F4E4D2` · fg `#1A0F06`), hairlines `#E9E7E2 / #D9D6D0`.
All as **dual-lightness tokens** (both layers AA-verified). The old flame system
(`#010000` ground / `#bc4700` flame / Cairo + Readex Pro) is RETIRED — do not
reintroduce it; only "was ..." migration comments may mention those hexes.

**Brand signature**: the QR-corner motif (`.qr-corner`) carrying the canonical
gold-metal gradient `linear-gradient(145deg, #E9B44C, #C9962F)` (Madarek
`--btn-primary-bg`), glyph in void ink. `text-gradient-orange` rides the same
pair at 145° (copper `#B57438 → #9A5F25` in light). Raster brand assets
(favicon/icon-192/icon-512/apple-touch-icon/brand-icon + `src/app/favicon.ico`)
are night+gold; the social card (`public/og-default.png`) is rendered from
`scripts/og-template.html` — night ground, sand ink, gold metal mark, IBM Plex
Sans Arabic (regenerate via `scripts/render-og.mjs` or playwright `file://`).

## Color

- **Tokens only.** Raw palette classes and arbitrary hexes are banned outside
  the token files (sanctioned raw-hex sites exist — WhatsApp brand colors,
  recharts selectors, device-mockup materials; audit before adding any).
- **9 pastel families** × {bg, ink, deep} in BOTH modes: peach · mint ·
  lavender · sky · yellow · rose · sand · grey · copper (`--c-*-bg/-ink/-deep`).
  Dark = space-tinted deep bgs + luminous inks; light = pastel bgs + saturated
  inks + deep text shades.
- **Status language = semantic tokens** via `lib/order-status.ts` (SSOT):
  `warning` yellow = new/pending · `info` sky = preparing/in-progress ·
  `success` mint = ready/completed · `destructive` rose = cancelled. Canonical
  split (r8-a): base = the family ink (fill/stroke), `-soft` = pastel bg tint,
  `-ink` = the family deep for TEXT; fill foregrounds = `#191918` on the mids
  (dark block: `#191918` on the luminous night inks). Never raw green/red/blue.

## Typography

- **IBM Plex Sans Arabic is THE family** (body + display + headings),
  self-hosted 400/500/600/700 × {arabic, latin} subsets, `font-display: swap`,
  two arabic subsets preloaded in both root layouts. Accent cuts: Plex Serif
  italic (latin), Plex Mono (latin) for codes/IDs. Legacy `--font-cairo` name
  is a shim that resolves to "IBM Plex Sans Arabic" (zero-churn flip); Cairo /
  Readex Pro / Noto Naskh Arabic woff2 stay registered as resilience fallbacks
  (Naskh also serves `.font-naskh` editorial voice).
- Weights ≤ 700 (Plex Sans Arabic ships 400-700 only; `--fw-black` = 700).
- **No letter-spacing on Arabic, ever** — the `[class*=tracking-]` guard in
  globals.css enforces it; tracking is legal only on Latin-safe runs (mono,
  `dir="ltr"` URLs). No synthetic italics on Arabic either (upright weight +
  accent ink instead).
- Numbers everywhere: `tabular-nums` + `lining-nums` globally (this is a
  numbers product).

## Shape, space, elevation

- Radius ladder (Madarek "Notion-soft"): **6 / 8 / 10 / 12 / 16 / 20 / 28**
  (+ `9999` pills) via `rounded-*` (`--r-xs … --r-full` / `@theme --radius-xs …
  --radius-3xl`). Cards `rounded-xl` (16), never ad-hoc px radii.
- Spacing: Tailwind scale only (zero arbitrary px — keep it that way).
- Elevation: `--elev-1..5` dual grammar — light = soft two-layer black; dark =
  fill-led + 1px inset white top-light (`--shadow-card/-h/-pop/-modal/-mockup`
  compose on top). Glass: 16px blur + theme hairline (`--glass-*`).
- Under `prefers-contrast: more` (r8-a): elevations collapse to solid rings,
  borders strengthen, glass goes solid — ported from Madarek tokens.css.

## Components

- Primitives (`src/components/ui/*`: button, input, select, sheet, dialog,
  card, badge, table, switch, label, separator) are the default choice — never
  re-implement a primitive.
- **Empty states**: use the `EmptyState` component — don't add hand-rolled ones.
- **Loading**: `Skeleton` (shimmer) for shape placeholders; `animate-pulse`
  only for live status indicators — two jobs, two looks, never interchangeable.
- Filter pills / segmented rows: the shared pattern — one radii/padding/active
  treatment.
- Icons: lucide named imports only. Directional icons in RTL get
  `rtl:rotate-180`; **back affordances use ArrowRight/ChevronRight** (RTL
  convention, documented at print/page.tsx).

## Motion

Madarek motion ladder: `--t-micro 80 / --t-fast 160 / --t-base 240 / --t-slow
380 / --t-slower 520 / --t-cinema 720ms` + semantic layer (page 320 · reveal
360 · stat 700 · skeleton 1200ms) + easings and spring curves (`--ease-spring`,
`--ease-bounce`…). Press register: buttons `scale(0.97)`, cards `scale(0.995)`
with 80ms snap-back; hover lift only on real pointers. Above-fold hero uses
`animate-rise-in` (transform-only — never gate CTA visibility on animation
clocks). Infinite ambient motion (orbs) is viewport-gated + reduced-motion-
hidden. No scroll-hijacking on operational surfaces.

## Layout & z-layers

- z-band registry lives at the top of globals.css (base → sticky → dropdown →
  drawer/header → modal → toast → popover → live-toast → overlay → max).
  Sticky/float band lives at z-30/31/33; dialog/sheet band at z-40/50 — floats
  NEVER cover modals (the r121 J-1 tap-hijack lesson: a float over a money CTA
  is a revenue bug).
- Sheets use `dvh` (not `vh`) — iOS URL-bar safe.
- Numeric/bidi content (phones, IBAN, order numbers) gets `dir="ltr"` or `bdi`
  isolation; Arabic labels render `dir="auto" text-start`.

## Accessibility layers

- **High-contrast mode** (manual opt-in, round88-E2): `html.high-contrast`
  token layer + pre-paint boot script (AAA text, 3:1+ borders, 112.5% base
  type, 3px focus outlines) — `html.light.high-contrast` covers the cream side.
- **prefers-contrast: more** (r8-a): automatic OS-level support — solid-ring
  elevations, strengthened borders, solid glass (see Shape, space, elevation).
- **Reduced motion**: two-layer belt — universal 0.01ms clamp + token zeroing
  (page/reveal keep an 80ms affordance) + per-class off-switches; framer-motion
  rides `MotionConfig reducedMotion="user"`.

## Mode rule (I-12)

Persuade surfaces may carry the full gold identity (gradients, glow, showcase).
Operate surfaces get a thin header accent AT MOST. Never port marketing
ambience into CRUD density.

## SEO/metadata conventions

Title template `%s | المنيو الذكي`; page titles never repeat the brand suffix.
Per-restaurant menus get unique meta + Restaurant JSON-LD (real data only —
`servesCuisine` was removed because it was invented). Auth surfaces + print
are noindex. Social cards point at `/og-default.png` (1200×630, Madarek
identity — regenerate after any template change).
