# A11y & Performance Audit Report — Smart Menu

> Generated: 2026-07-08
> Source: docs/audit files, code analysis, CSS inspection

---

## 1. A11y — Status from Audit Docs

### 1.1 `docs/accessibility-audit.md` (2026-06-22)

| Finding | Status | Note |
|---------|--------|------|
| All 7 files audited (AdminSidebar, admin layout/dashboard/restaurants/users pages, GalleryCarousel, public menu) | ✅ Closed | 12 high, 7 medium, 20 low — all fixed |
| Remaining a11y pages need audit (owner/orders, owner/menu, subscribe, pricing, cart) | ❌ Open | Per polish-pass §2.7: "remaining pages need axe-core audit added" |

**Evidence**: `docs/accessibility-audit.md:95` — "All issues fixed in the same pass. No outstanding a11y violations in these files."

### 1.2 `docs/polish-pass-2026-07-03.md` §2.7

- **البند**: axe-core audit for 5 uncovered pages (owner/orders, owner/menu, subscribe, pricing, cart)
- **الحالة**: ❌ Open
- **الدليل**: `docs/polish-pass-2026-07-03.md:75-76`

---

## 2. A11y — CSS (globals.css)

### 2.1 `reduced-motion`

- **`@media (prefers-reduced-motion: reduce)`**: ✅ Present at 3 locations:
  - `globals.css:421` — stops marquee animation
  - `globals.css:490` — blanket `animation-duration: 0.01ms !important`, `transition-duration: 0.01ms !important`
  - `globals.css:518` — stops grain-anim
- **الدليل**: `src/app/globals.css:421,490,518`

### 2.2 `focus-visible`

- **`:focus-visible`**: ✅ Present — `outline: 2px solid var(--ring); outline-offset: 2px; border-radius: var(--radius-sm)`
- **`:focus:not(:focus-visible)`**: ✅ Present — `outline: none` (prevents mouse-focus outline)
- **الدليل**: `src/app/globals.css:349-354`

### 2.3 `::selection`

- **`::selection`**: ✅ Present — `background: oklch(0.55 0.19 45 / 0.25); color: inherit`
- **الدليل**: `src/app/globals.css:343-346`

---

## 3. A11y — Components Analysis

### 3.1 ThemeToggle.tsx

| Item | Status | Evidence |
|------|--------|----------|
| `aria-label` | ✅ Present | Line 28: dynamic Arabic label (`الوضع النهاري` / `الوضع الليلي`) |
| `aria-hidden` on empty shell | ✅ Present | Line 22: placeholder div during SSR |
| `useReducedMotion()` | ✅ Present | Line 14: framer-motion hook |
| focus-visible ring | ✅ Present | Line 33: `focus-visible:ring-2 focus-visible:ring-orange/50` |
| SVG icons labeled | ✅ Acceptable | SVGs are children of labeled button, AT reads button label, not children |

### 3.2 button.tsx (shadcn/ui base-nova)

| Item | Status | Evidence |
|------|--------|----------|
| `focus-visible:ring-3` | ✅ Present | Line 7 of button.tsx |
| `aria-invalid:*` styling | ✅ Present | Line 7: red border+ring on validation error |
| Native `<button>` semantics | ✅ Present | Uses `@base-ui/react/button` with native element |
| `outline-none` paired with focus ring | ✅ Correct | Outline removed but focus ring replaces it |

### 3.3 Shared components — aria attributes scan

| Component | aria attribute | Status |
|-----------|---------------|--------|
| `AreaChart.tsx:60` | `role="img" aria-label="Area chart"` | ✅ |
| `ScrollToTop.tsx:50` | `aria-label="العودة للأعلى"` | ✅ |
| `LottieAnimation.tsx:40` | `aria-hidden="true"` | ✅ |
| `MiniSparkline.tsx:41` | `role="img" aria-label` | ✅ |
| `FloatingWhatsApp.tsx:22` | `aria-label="تواصل عبر واتساب"` | ✅ |
| `ThemeToggle.tsx:22` | `aria-hidden="true"` | ✅ |
| `Confetti.tsx:76` | `aria-hidden="true"` | ✅ |
| `NavLink.tsx:27` | `aria-current="page"` | ✅ |

### 3.4 Menu components — aria-label scan (17 instances)

| Component | Line | Label |
|-----------|------|-------|
| `CartFloatingButton.tsx` | 32 | Arabic cart label with item count |
| `GalleryCarousel.tsx` | 114,119,125,136,144,154,170,176,184 | Arabic — prev/next/play/toggle/zoom/close/dots |
| `MenuItemCard.tsx` | 124,174,194,207 | Arabic — rating/add/sub/increase |
| `MenuPageClient.tsx` | 141,153,169 | Arabic — search clear/sort/options |
| `ReviewSheet.tsx` | 137 | Arabic — close |
| **إجمالي**: All 17 ✅ | All present | |

### 3.5 Menu — raw `<img>` tags and `alt`

| File | Line | alt | Notes |
|------|------|-----|-------|
| `MenuClientSection.tsx` | 53 | `alt={restaurant.name}` ✅ | But uses raw `<img>` (no next/image) — performance gap |
| `GalleryCarousel.tsx` | 162 | `alt=…` ✅ | Documented ponytail exception (lightbox needs object-contain) |

**Additionally**: `OptimizedImage` wrapper components in `MenuItemCard.tsx`, `OrderDialog.tsx`, `StickyMenuHeader.tsx` all pass `alt` prop correctly.

### 3.6 Keyboard navigation

- `MenuItemCard.tsx:54` — `tabIndex={0}` ✅ (interactive card)
- No `tabindex` mismatches detected in menu/shared scan

---

## 4. Performance — Status from Audit Docs

### 4.1 Original performance items (from `docs/performance-recommendations.md`)

| Finding | Original | Current (polish-pass) | Evidence |
|---------|----------|----------------------|----------|
| No `next/image` (10 files) | ❌ Open | ✅ Partially (4 migrated, 4 documented exceptions, 2 prior) | `docs/polish-pass-2026-07-03.md:81-82` |
| Missing width/height on imgs | ❌ Open | ⏳ Partially | Fixed where next/image used; remaining raw `<img>` tags still lack dimensions |
| `"use client"` sprawl | ❌ Open | ❌ Still open | `docs/polish-pass-2026-07-03.md:84` |
| Missing `memo()` | ❌ Open | ❌ Still open | `docs/polish-pass-2026-07-03.md:85` |
| No fetch deduplication | ❌ Open | ❌ Still open | `docs/polish-pass-2026-07-03.md:86` |
| Dialog state re-renders | ❌ Open | ❌ Still open | `docs/polish-pass-2026-07-03.md:87` |
| `dynamic()` for 48-line BarChart | ❌ Open | ❌ Still open | Not mentioned as fixed |

### 4.2 Remaining raw `<img>` tags (5 total)

| File | Line | Reason | Impact |
|------|------|--------|--------|
| `MenuClientSection.tsx` | 53 | **NOT** documented — this is a miss from polish pass | CLS from no width/height, no lazy loading, no WebP |
| `GalleryCarousel.tsx` | 162 | ponytail: lightbox needs object-contain | Acceptable exception |
| `owner/qr/page.tsx` | 99 | ponytail: external QR API | Acceptable exception |
| `owner/loyalty/page.tsx` | 367 | ponytail: data: URL | Acceptable exception |
| `admin/qr/page.tsx` | 130 | ponytail: external QR API | Acceptable exception |

> **⚠️ `MenuClientSection.tsx:53`** — Raw `<img>` for restaurant logo, not using `OptimizedImage`. Migrated images in `StickyMenuHeader.tsx` (same logo) but the hero logo here was missed. No `width`/`height` attributes → CLS.

---

## 5. WCAG Color Contrast Verification

### 5.1 Primary orange on dark background

- **--primary**: `oklch(0.55 0.19 45)` (lightness 0.55)
- **--background**: `oklch(0.035 0.003 30)` (lightness 0.035)
- **Approximate contrast ratio**: (0.55 + 0.05) / (0.035 + 0.05) ≈ **7.06:1**
- **WCAG AA requirement**: 4.5:1 (normal text), 3:1 (large text)
- **Status**: ✅ Exceeds AA, exceeds AAA (7:1)
- **Evidence**: `globals.css:114` — comment confirms "orange darkened from 0.68->0.55 for 4.5:1 contrast"

### 5.2 Primary orange on light background

- **--primary**: `oklch(0.55 0.19 45)` (lightness 0.55)
- **Light --background**: `oklch(0.985 0 0)` (lightness 0.985)
- **Approximate contrast ratio**: (0.985 + 0.05) / (0.55 + 0.05) ≈ **1.73:1**
- **Status**: ⚠️ **FAILS** WCAG AA if primary is used as **text color** on white background (needs 4.5:1)
- **Mitigation**: `--primary` is used for backgrounds/accents/rings, not body text. Body text uses `--foreground: oklch(0.11 0 0)` (~8.6:1 against white). Border-only uses pass WCAG (non-text contrast 3:1 minimum).
- **Risk**: 1.73:1 is below even WCAG non-text contrast 3:1 threshold. If primary is used for icons, input borders, or other meaningful UI elements in light mode, it **fails** non-text contrast requirements.

### 5.3 Comment on line 114-115

- **الدليل**: `src/app/globals.css:114-115` — точно соответствует: `/* WCAG AA: orange darkened from 0.68→0.55 for 4.5:1 contrast vs white text */`
- **Verification**: Contrast vs `--primary-foreground: oklch(0.98 0 0)` ≈ (0.98+0.05)/(0.55+0.05) ≈ 1.72:1? Wait — 0.98 is the foreground (text on orange button), 0.55 is background (orange button). So text-on-orange = 1.72:1. That's **below** 4.5:1 AA.
- **Wait — that comment says "vs white text"**: `--primary-foreground: oklch(0.98 0 0)` is used for text on orange buttons. 0.98 lightness vs 0.55 lightness ≈ 1.72:1. This **fails** WCAG AA for normal text on orange buttons.
- **Re-check**: The comment says "for 4.5:1 contrast vs white text" but the calculation shows orange (0.55) on white (0.98) = ~1.72:1 which is not 4.5:1. Something is off — perhaps the comment refers to the ORIGINAL value (0.68) vs 0.55, meaning they adjusted it to meet contrast for the dark theme (where primary is used as accent, not background). The dark theme background is oklch(0.035) vs orange (0.55) = 7.06:1.
- **Conclusion**: The comment was written about dark-theme contrast (primary on dark background), not about `--primary-foreground`. It's misleading. The actual issue is **light-theme primary-foreground contrast** (orange button with near-white text = ~1.72:1).
- **⚠️ Finding**: Orange buttons with white text (`--primary` + `--primary-foreground`) have only ~1.72:1 contrast ratio. This affects all orange variant buttons (`button.tsx:12` — `bg-orange text-orange-foreground`). Exceeds WCAG for large text (3:1) if text is 18px+ bold or 24px+ regular, but **fails AA for normal-sized text**.

---

## 6. overflow-check.cjs Analysis

### 6.1 `scripts/overflow-check.cjs`

- **What it does**: Puppeteer script that navigates 11 app routes at 320px (mobile) and 1280px (desktop), measuring `scrollWidth` vs `innerWidth`. Flags any route where content overflows horizontally. Takes screenshots of failing pages.
- **Routes**: `/login`, `/menu`, `/cart`, `/order-confirmed`, `/pricing`, `/subscribe`, `/privacy`, `/terms`, `/demo`, `/owner`, `/`
- **Complexity**: Includes client-side navigation settling logic (poll `readyState` up to 30s, follow auth redirects)
- **Status**: 22/22 PASS (per polish-pass verification)

### 6.2 `tests/playwright/overflow-check.cjs`

- Simpler version — 3s `setTimeout` wait, no navigation settling. Same 11 routes × 2 VPs = 22 checks.
- **Status**: Not run independently in recent report; the scripts/ version is the canonical one.

---

## 7. Summary of Open Items

| # | Item | Type | Severity | Location | Status |
|---|------|------|----------|----------|--------|
| 1 | 5 pages missing axe-core audit | A11y | Medium | docs/polish-pass-2026-07-03.md:75 | ❌ Open |
| 2 | `"use client"` on presentational subcomponents | Perf | Medium | docs/performance-recommendations.md:21-28 | ❌ Open |
| 3 | Missing `memo()` on StatCard, OrderRow, etc. | Perf | Low | docs/performance-recommendations.md:31-33 | ❌ Open |
| 4 | No fetch deduplication/caching | Perf | Medium | docs/performance-recommendations.md:79-81 | ❌ Open |
| 5 | Dialog state causes full page re-render | Perf | Medium | docs/performance-recommendations.md:119-122 | ❌ Open |
| 6 | `dynamic()` on 48-line BarChart | Perf | Low | docs/performance-recommendations.md:13 | ❌ Open |
| 7 | `MenuClientSection.tsx:53` raw `<img>` not migrated | Perf | Medium | src/components/menu/MenuClientSection.tsx:53 | ❌ Open |
| 8 | Orange `--primary-foreground` on light body text fails WCAG AA contrast (~1.72:1) | A11y | Medium | src/components/ui/button.tsx:12 + globals.css:115 | ⚠️ Needs review |
| 9 | Light theme non-text contrast for orange accents below 3:1 threshold | A11y | Low | globals.css:189 (light primary) | ⚠️ Monitor |
| 10 | GalleryCarousel raw `<img>` has `width`/`height` but only via CSS size class | Perf | Low | GalleryCarousel.tsx:162 | ⏳ Acceptable |
