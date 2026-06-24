# Smart Menu — Design System

> Single source of truth for all visual, interactive, and motion decisions.
> Brand: **Warm · Premium · Trusted** | Register: **product** (with brand marketing surface)

---

## 1. Brand Identity

### DNA
- **Warmth** — amber/gold tones carry hospitality warmth. Not beige, not cream — true gold with purpose.
- **Premium** — refined glass surfaces, subtle shadows, generous spacing. Quiet confidence in every pixel.
- **Trusted** — consistent affordances, bank-grade form controls, no dark patterns.

### Voice
- Arabic-first, bilingual-ready. Brand name: **الربط الذكي | Smart Menu**
- Tone: confident but not loud, premium but not pretentious, warm without being casual
- Micro-copy: polite, instructive, never "Oops!" or "Uh-oh" — always helpful

### Logo
- **File:** `/brand-icon.png`
- **Placement:** header (start), footer (start), sidebar (top), login card (center)
- **Sizing:** landing header = h-8, sidebar = max-h-9, login = fit
- **No text logo** exists — brand icon stands alone. Favicon is `/favicon.ico`

---

## 2. Color System

### 2.1 Semantic Tokens (OKLCH)

All colors use **OKLCH** for perceptual uniformity. Two modes: light (`:root`) and dark (`.dark`).

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--background` | `oklch(0.98 0.015 75)` | `oklch(0.14 0.015 75)` | Page / app bg |
| `--foreground` | `oklch(0.2 0.02 85)` | `oklch(0.95 0.01 85)` | Body text |
| `--card` | `oklch(1 0 0)` | `oklch(0.17 0.015 70)` | Elevated surfaces |
| `--card-foreground` | `oklch(0.2 0.02 85)` | `oklch(0.95 0.01 85)` | Text on card |
| `--primary` | `oklch(0.62 0.14 55)` | `oklch(0.72 0.16 65)` | Key CTA, brand accent |
| `--primary-foreground` | `oklch(0.98 0 0)` | `oklch(0.15 0 0)` | Text on primary |
| `--secondary` | `oklch(0.94 0.04 75)` | `oklch(0.23 0.03 75)` | Muted surfaces |
| `--secondary-foreground` | `oklch(0.3 0.03 75)` | `oklch(0.85 0.02 85)` | Text on secondary |
| `--muted` | `oklch(0.96 0.02 70)` | `oklch(0.2 0.02 70)` | Low-emphasis surfaces |
| `--muted-foreground` | `oklch(0.55 0.02 85)` | `oklch(0.65 0.02 85)` | Secondary text |
| `--accent` | `oklch(0.62 0.14 55 / 0.1)` | `oklch(0.72 0.16 65 / 0.15)` | Subtle highlight |
| `--accent-foreground` | `oklch(0.45 0.10 55)` | `oklch(0.78 0.14 65)` | Text on accent |
| `--destructive` | `oklch(0.58 0.2 25)` | `oklch(0.6 0.22 25)` | Errors, deletion |
| `--border` | `oklch(0.9 0.03 75)` | `oklch(0.26 0.03 75)` | Borders, dividers |
| `--input` | `oklch(0.9 0.03 75)` | `oklch(0.26 0.03 75)` | Form input borders |
| `--ring` | `oklch(0.62 0.14 55)` | `oklch(0.72 0.16 65)` | Focus rings |
| `--radius` | `0.75rem` | `0.75rem` | Base radius |

### 2.2 Amber Palette (OKLCH)

| Scale | Light | Dark |
|-------|-------|------|
| 50 | `oklch(0.97 0.04 70)` | `oklch(0.22 0.04 40)` |
| 100 | `oklch(0.92 0.06 72)` | `oklch(0.28 0.05 45)` |
| 200 | `oklch(0.85 0.09 74)` | `oklch(0.35 0.07 48)` |
| 300 | `oklch(0.75 0.12 72)` | `oklch(0.45 0.10 55)` |
| 400 | `oklch(0.68 0.16 60)` | `oklch(0.60 0.14 55)` |
| 500 | `oklch(0.62 0.14 55)` | `oklch(0.72 0.16 65)` |
| 600 | `oklch(0.52 0.12 50)` | `oklch(0.78 0.14 68)` |
| 700 | `oklch(0.38 0.08 50)` | `oklch(0.80 0.10 70)` |
| 800 | `oklch(0.30 0.06 45)` | `oklch(0.88 0.07 72)` |
| 900 | `oklch(0.22 0.04 40)` | `oklch(0.94 0.04 70)` |

### 2.3 Surface Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--surface-raised` | `oklch(1 0 0)` | `oklch(0.2 0.02 75)` | Modals, dropdowns |
| `--surface-overlay` | `oklch(1 0 0)` | `oklch(0.19 0.02 78)` | Sheets, drawers |
| `--surface-sunken` | `oklch(0.97 0.012 78)` | `oklch(0.12 0.012 72)` | Content sections |
| `--warm-bg` | `oklch(0.98 0.015 75)` | `oklch(0.13 0.015 75)` | Brand content area |
| `--warm-surface` | `oklch(0.96 0.015 80)` | `oklch(0.17 0.02 75)` | Brand cards |
| `--warm-border` | `oklch(0.88 0.02 80)` | `oklch(0.24 0.03 75)` | Brand borders |

### 2.4 Gradients

- **`--gradient-warm`**: `linear-gradient(135deg, primary@0.08, amber-400@0.05)` — subtle brand wash
- **`--gradient-card`**: `linear-gradient(180deg, card, background)` — card depth
- **`--gradient-amber`**: `linear-gradient(135deg, amber-400, amber-600)` — primary CTAs
- **`--gradient-gold`**: `linear-gradient(135deg, amber-300, primary)` — premium CTAs
- **Button gradient**: `from-amber-500 to-amber-600` on `variant="gradient"`
- **Gradient text** (`text-gradient-amber`, `text-gradient-animated`): used sparingly on hero only — banned elsewhere per impeccable rules

### 2.5 Glass Tokens

- `--glass-bg` / `--glass-bg-strong`: semi-transparent surface
- `--glass-border` / `--glass-border-strong`: blurred border
- Classes: `.glass` (blur-16), `.glass-strong` (blur-20), `.glass-card` (hover glow), `.glass-interactive`

### 2.6 Shadows

```css
--shadow-sm:   0 1px 3px rgba(0,0,0,0.04)
--shadow-md:   0 4px 12px rgba(0,0,0,0.06)
--shadow-lg:   0 10px 30px rgba(0,0,0,0.08)
--shadow-xl:   0 20px 50px rgba(0,0,0,0.1)
--shadow-glow: 0 0 20px primary@0.25
```

### 2.7 Color Rules

1. **Body text** must hit ≥4.5:1 contrast against bg. Current `--foreground` on `--background` = ~15:1 — passes.
2. **Muted text** must be ≥4.5:1. Current `--muted-foreground` on `--background` = ~6:1 — passes.
3. **Placeholder text** = `--muted-foreground` — keep same contrast requirement.
4. Gray text on colored bg → use a darker shade of the bg's own hue, not a gray.
5. **Accent color** used for primary actions, current selection, and state indicators only — not decoration.
6. Gradient text only on hero headings. Never on cards, buttons, or body text.

---

## 3. Typography System

### 3.1 Font Stack

| Role | Font | Weight | Fallback |
|------|------|--------|----------|
| Display/Heading | **Readex Pro** | 600 (bold) | Noto Sans Arabic, system-ui, sans-serif |
| Body/Sans | **Noto Sans Arabic** | 400, 500, 600, 700 | system-ui, sans-serif |
| Arabic/Serif | **Noto Naskh Arabic** | 400, 700 | Traditional Arabic, serif |
| Mono | **Noto Naskh Arabic** | — | Courier New, monospace |

### 3.2 Font Variables

```css
--font-sans:    "Noto Sans Arabic", system-ui, sans-serif;
--font-mono:    "Noto Naskh Arabic", "Courier New", monospace;
--font-display: "Readex Pro", "Noto Sans Arabic", system-ui, sans-serif;
--font-arabic:  "Noto Naskh Arabic", "Traditional Arabic", serif;
--font-heading: "Readex Pro", "Noto Sans Arabic", system-ui, sans-serif;
--font-body:    "Noto Sans Arabic", system-ui, sans-serif;
```

### 3.3 Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| h1 (hero) | `text-5xl md:text-7xl` | bold | 0.95 | -0.03em |
| h1 (page) | `text-3xl md:text-4xl` | bold | 1.15 | -0.03em |
| h2 | `text-2xl md:text-3xl` | bold | 1.15 | -0.025em |
| h3 | `text-lg` | bold | 1.15 | -0.02em |
| h4 | `text-base` | semibold | 1.15 | -0.02em |
| Body | `text-sm` (14px) | 400 | 1.7 | 0.01em |
| Large body | `text-lg` (18px) | 400 | 1.7 | 0.01em |
| Helper | `text-xs` (12px) | 400 | — | — |
| Small | `text-[11px]` | — | — | — |

For RTL: `letter-spacing: 0` on headings (Arabic doesn't track well).

### 3.4 Typography Rules

1. **One display font** (Readex Pro) carries all headings. No body/heading pairing needed — product UI.
2. **7ch–75ch** body line length. For prose: `max-w-prose` (~65ch). For dense UI: wider is fine.
3. **`text-wrap: balance`** on h1–h3 for even lines.
4. **`text-wrap: pretty`** on long prose to reduce orphans.
5. Display heading ceiling: `clamp()` max ≤ 6rem (~96px). Hero currently `text-5xl md:text-7xl` ≈ 48px–72px — GOOD.
6. No display fonts in UI labels, buttons, or data.
7. Buttons: `text-sm font-medium` (14px).
8. System font stack is acceptable for product surfaces.

---

## 4. Spacing System

### 4.1 Layout
- **Max content width**: `max-w-6xl` (1152px)
- **Sidebar**: w-60 (240px)
- **Page padding**: `p-4 md:p-6 lg:p-8` on `<main>`
- **Header height**: h-16 (64px) — fixed/top on landing
- **Layout header height**: h-14 (56px) — sticky on app surfaces

### 4.2 Card Spacing
- **Default card**: `[--card-spacing:--spacing(4)]` = 16px
- **Card sm**: `[--card-spacing:--spacing(3)]` = 12px
- **Card header**: gap-1 (4px) between title/description
- **Card footer**: `border-t bg-muted/50 p-(--card-spacing)`
- **Card content**: `px-(--card-spacing)`

### 4.3 Section Spacing
- **Landing sections**: `py-20` or `py-24`
- **Pricing sections**: `pb-24`
- **Stats section**: `py-16`
- **Grid gaps**: `gap-5` or `gap-6` between cards, `gap-8` between columns

### 4.4 Spacing Rules
1. **4px base unit** — all spacing derives from Tailwind spacing scale (multiples of 4).
2. **Generous** on marketing surfaces, **tighter** on product surfaces (admin dashboard).
3. No negative margins between sections. Each section is self-contained with its own padding.
4. Card grids: `gap-5` for 4-column, `gap-6` for 3-column.

---

## 5. Component Standards

### 5.1 Button

Built on `@base-ui/react/button` + `class-variance-authority`.

**Variants:**
| Variant | Usage | Style |
|---------|-------|-------|
| `default` | Primary action | `bg-primary text-primary-foreground` |
| `outline` | Secondary action | `border bg-background hover:bg-muted` |
| `secondary` | Less emphasis | `bg-secondary text-secondary-foreground` |
| `ghost` | Subtle action | `hover:bg-muted` |
| `destructive` | Delete/remove | `bg-destructive/10 text-destructive` |
| `link` | Text link | `underline-offset-4 hover:underline` |
| `gradient` | Premium CTA | `from-amber-500 to-amber-600 text-white shadow-lg` |
| `gradient-outline` | Premium secondary CTA | `border-amber-300/40 from-amber-500/10` |

**Sizes:** `xs` (h-6), `sm` (h-7), `default` (h-8), `lg` (h-9), `icon` (size-8), `icon-xs/sm/lg`

**States:** default, hover, focus-visible, active, disabled, loading, aria-invalid
**Active:** `translate-y-px`, `scale-[0.97]`
**Disabled:** `pointer-events-none opacity-50`

### 5.2 Card

Built on `<div>` with `data-*` attributes for variants.

**Variants:** `default` (bg-card), `glass` (glass-card styles), `gradient` (brand gradient wash)
**Elevations:** `elevated` (hover lift + glow), `flat` (no transform), `outlined` (border-2)
**Sizes:** `default` (spacing-4), `sm` (spacing-3)

Sub-components: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`

### 5.3 Input

Built on `@base-ui/react/input`.

- **Height:** h-9 (36px)
- **Radius:** rounded-xl (12px)
- **Border:** `border-input` with `focus-visible:border-amber-400` + `ring-3 ring-amber-500/20`
- **Disabled:** `bg-input/50 opacity-50 pointer-events-none`
- **Aria-invalid:** `border-destructive ring-destructive/20`

Input wrapper pattern (login form): `glow-within` class provides focus-within glow on parent.

### 5.4 Dialog

Built on `@base-ui/react/dialog` (uses Popover API — no z-index clipping).

- **Overlay:** `fixed inset-0 z-50 bg-black/20 backdrop-blur-sm`
- **Content:** `fixed top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-xl`
- **Animation:** `data-open:animate-in` / `data-closed:animate-out` (Base UI built-in)
- **Close button:** top-2 end-2, ghost variant, icon-sm

### 5.5 Select / Dropdown

Built on `@base-ui/react`.

- Uses native `<dialog>` / popover API to avoid clipping in overflow containers.
- Follows same border/sizing/radius conventions as Input.

### 5.6 Other UI Components

All in `src/components/ui/`: badge, label, separator, sheet, switch, table, textarea.
All share: `rounded-xl`, `border-input`, `focus-visible:border-amber-400`, same Font/color tokens.

### 5.7 Component Rules

1. Every interactive component has: default, hover, focus, active, disabled, loading, error.
2. **Skeleton** loading, not spinners in middle of content (spinner OK for full-page loading).
3. **Empty states** should teach the interface — not "nothing here."
4. Same button shape, same form-control vocabulary, same icon style across all surfaces.
5. **Modal as last resort** — exhaust inline/progressive alternatives first.

---

## 6. Header Rules

### 6.1 Landing Header (`Header.tsx`)

- **Position:** `fixed top-0 inset-x-0 z-30 h-16`
- **Background:** `bg-background/60 backdrop-blur-2xl border-b border-border/30`
- **Content:** max-w-6xl mx-auto, flex between logo+nav and ThemeToggle+CTA button
- **Mobile:** `<Sheet>` drawer from right — w-72, brand icon + nav links
- **Desktop nav:** hidden on mobile (`lg:flex`), inline links with `hover:bg-muted`
- **CTA:** `Button variant="gradient" size="sm" rounded-xl` — "ابدأ الآن مجاناً"
- **Logo:** `/brand-icon.png`, h-8, linked to `/`

### 6.2 App Header (`LayoutHeader.tsx`)

- **Position:** `sticky top-0 z-40`
- **Background:** `bg-background/60 backdrop-blur-xl border-b border-border/50`
- **Height:** h-14
- **Hide-on-scroll:** hides when scrolling down past 50px, shows when scrolling up
- **Left side:** hamburger button (mobile only, `lg:hidden`) + page title
- **Right side:** ThemeToggle

### 6.3 Header Rules

1. Landing header = glass with full border. App header = glass with hide-on-scroll.
2. Single source of truth for nav links in `landingLinks` array.
3. Mobile sheet always includes brand icon + all nav links.
4. No duplicate headers on any page. If page uses landing Header, it does NOT use LayoutHeader.

---

## 7. Footer Rules

### 7.1 Landing Footer (`Footer.tsx`)

- **Layout:** `border-t border-border/40 py-12 bg-background`
- **Grid:** `md:grid-cols-4` — two-span brand intro, "روابط سريعة" links, "تواصل معنا" contact info
- **Logo:** brand icon, h-8
- **Bottom bar:** `border-t border-border/30 pt-6 text-center` — copyright line
- **Content width:** max-w-6xl

### 7.2 Footer Rules

1. Present on all marketing pages (landing, pricing, etc.).
2. Absent from app pages (admin, owner, menu reader, cart).
3. Links: الاشتراك, منيو تجريبي, تسجيل الدخول.

---

## 8. Sidebar / Navigation Rules

### 8.1 Admin Sidebar (`AdminSidebar.tsx`)

- **Width:** w-60 (240px), fixed-height, `lg:flex` only
- **Background:** `bg-card backdrop-blur-lg border-s border-border/40`
- **Top:** brand icon + logo (72px)
- **Nav items:** 10 items — لوحة التحكم, المطاعم, المستخدمون, المينيو, الطلبات, QR, المدفوعات, التليجرام, سجل التدقيق, الإعدادات
- **Each nav item:** `NavLink` component with icon + label + active indicator
- **Active indicator:** gradient amber bar on end (end-0, w-1, rounded-full) + amber gradient bg
- **Bottom:** "العودة للموقع" link

### 8.2 Owner Sidebar (`owner/layout.tsx`)

- **Width:** w-60, border-s, `bg-card/80 backdrop-blur-lg`
- **Nav items:** 6 items — لوحة التحكم, الطلبات, المينيو, رمز QR, الولاء, الإعدادات
- **Bottom:** LogoutButton — `hover:bg-destructive/10 hover:text-destructive`
- **Mobile:** `<Sheet>` drawer same as admin

### 8.3 NavLink Component

- **Props:** href, label, icon, onClick, exact
- **Active detection:** `pathname === href || pathname.startsWith(href)` (unless exact=true)
- **Active style:** `bg-gradient-to-r from-amber-500/15 to-amber-600/10` + amber bar indicator
- **Hover:** `hover:bg-accent/50 hover:text-foreground`
- **Icon turns amber-600 when active**, scales up on hover when inactive

### 8.4 Sidebar Rules

1. Same `NavLink` component used in admin and owner layouts.
2. Sidebar hidden on mobile (<lg) — replaced by sheet drawer.
3. Active bar indicator always on the end (RTL: right side).
4. No nested sub-menus — all items visible at once.
5. Admin sidebar includes more items (10) than owner sidebar (6).

---

## 9. Dashboard Rules

### 9.1 Admin Dashboard

- **Layout:** sidebar (static) + LayoutHeader (sticky) + main content area
- **Main area:** `bg-subtle-pattern p-4 md:p-6 lg:p-8 animate-page-enter`
- **Content area gradient:** `linear-gradient(180deg, transparent 0%, transparent calc(100% - 200px), primary@0.03 100%)`
- **Common pattern:** `<Card>` + `<CardHeader>` + `<CardTitle>` + `<CardContent>` with data tables or stat grids

### 9.2 Owner Dashboard

- **Layout:** sidebar (glass) + LayoutHeader (sticky, hide-on-scroll) + main content area
- **Main area:** `bg-subtle-pattern content-area` with same padding as admin
- **Data display:** cards with stats, order lists, menu management forms

### 9.3 Dashboard Rules

1. `animate-fade-in` on main content wrapper, `animate-page-enter` on main content.
2. Subtle pattern bg (`bg-subtle-pattern`) across all app surfaces.
3. Consistent padding padding: `p-4 md:p-6 lg:p-8`.
4. Data tables use `Table` component from `ui/table.tsx`.

---

## 10. Homepage (Landing) Rules

### Architecture
```
<HomePage>
  <Header />                → fixed glass header with nav
  <Hero>                    → full-screen hero with animated phone + floating badges
  <Demo Preview>            → partner restaurant cards (3 column)
  <Showcase>                → "لماذا الربط الذكي؟" glass-card grid (4 column)
  <Stats>                   → CountUp animated stats (4 column)
  <Benefits>                → benefit cards (3 column) with hover gradients
  <How It Works>            → 3-step numbered process
  <Pricing>                 → 3-column pricing cards with popular badge
  <Partners>                → partner profile cards (3 column)
  <Testimonials>            → review cards (3 column) with star ratings
  <CTA>                     → final conversion section with gradient bg
  <Footer />                → 4-column footer
```

### Hero rules
- Gradient mesh blobs (`.hero-mesh .blob`) — 3 blobs, 60px blur, 6% opacity, float animation
- `text-gradient-animated` heading only on hero — never elsewhere
- Hero phone mockup: `HeroVideo.tsx` (mp4 fallback to `HeroAnimation.tsx`)
- "اسحب لأسفل" scroll indicator with breating dot

### Reveal Animation
- Each section wrapped in `<Reveal>` — intersection observer triggers slide-up + fade
- Delay staggered per section: identical delay per row, staggered by card index
- Duration: 700ms ease-out, 100ms–400ms delay range

---

## 11. Responsive Rules

### Breakpoints
| Size | Tailwind | Target |
|------|----------|--------|
| Mobile | `<sm` / `<640px` | Phone portrait |
| Tablet | `sm`–`lg` / `640px–1024px` | Tablet/phone landscape |
| Desktop | `lg+` / `1024px+` | Desktop |

### Behavior
1. **Nav**: Header hamburger `<lg`. Desktop nav `lg:flex`.
2. **Sidebar**: Hidden `<lg`. Sheet drawer replacement.
3. **Grids**: 4-col → 2-col → 1-col (or `auto-fit, minmax(280px, 1fr)`).
4. **Landing grids**: `lg:grid-cols-4` → `sm:grid-cols-2` → `grid-cols-1`.
5. **Pricing**: `md:grid-cols-2` → `grid-cols-1` (2 plans max).
6. **Footer**: `md:grid-cols-4` → single column.
7. **Page padding**: `p-4 md:p-6 lg:p-8`.
8. **Hero**: `lg:grid-cols-2` → stacked on mobile (phone mockup first, text second).
9. **Dialog**: `max-w-[calc(100%-2rem)]` on mobile, `sm:max-w-sm` on larger.
10. **Body text**: `text-base` on mobile, `text-sm` on desktop.
11. **Buttons**: full-width on mobile in forms, auto-width on desktop.

---

## 12. Motion System

### 12.1 Keyframes

All animation keyframes in `globals.css` (lines 367–389). Single source of truth.

| Name | Purpose | Duration |
|------|---------|----------|
| `float` | Gentle lift (hero badges, blobs) | 3s ease-in-out infinite |
| `float-delayed` | Slower float with slight rotation | 4s ease-in-out infinite |
| `shimmer` | Loading skeleton | 2s linear infinite |
| `pulse-glow` | CTA glow pulse | 2s ease-in-out infinite |
| `scale-in` | Dialog/page entry | 0.35s ease-out |
| `slide-down` | Dropdown/notification | 0.3s ease-out |
| `slide-up` | Staggered children | 0.5s ease-out |
| `reveal` | Intersection observer reveals | 0.6s ease-out |
| `fade-in` | Standard entry | 0.4s ease-out |
| `spinner-slow` | Decorative rotation | 8s linear infinite |
| `breath` | Status dot pulse | 2.5s ease-in-out infinite |
| `wiggle` | Theme toggle animation | 0.5s ease-in-out |
| `magnetic-float` | Subtle hover magnet | 3s ease-in-out infinite |
| `confetti` | Celebration emoji rain | configurable |
| `gradient-shift` | Animated gradient text | 4s ease infinite |
| `page-enter` | Page transition | 0.4s ease-out |
| `fade-in-down` | Badge entrance | 0.5s ease-out |

### 12.2 Motion Rules

1. **150–250ms** on most UI transitions (buttons, hover states, dialog enter/exit).
2. **Motion conveys state, not decoration.** Loading, feedback, reveal: everything else is suspect.
3. **Reveal animations** must enhance an already-visible default — never gate content on intersection observer (Reveal defaults to opacity-0 + translate-y-8).
4. **Reduced motion** (`prefers-reduced-motion: reduce`) kills all animations, transforms, and transitions. Implemented globally.
5. **No bounce, no elastic.** Ease-out quart/quint/expo only.
6. **No orchestrated page-load sequences.** Product loads into task, not choreography.
7. **Stagger children** pattern: incrementing 60ms delays per child, max 10 children.
8. **Magnetic hover**: `magnetic-btn` class with `scale(1.04)` and `box-shadow` on hover.
9. **Dialog Animation** uses Base UI's `data-open`/`data-closed` with Tailwind animate-in/out.

---

## 13. Remotion Usage Guidelines

- **Remotion project:** `/remotion/` — separate package with its own `package.json`.
- **Purpose:** cinematic scenes, explainer videos, interactive demonstrations, promotional content.
- **Integration:** rendered videos placed in `/public/hero-intro.mp4` and served from `<video>` elements.
- **When to use:**
  - Replace static mockup animations with real recorded interactions
  - Create onboarding/walkthrough videos for feature marketing
  - Generate programmatic video content for restaurant showcases
- **When NOT to use:**
  - Simple UI transitions and animations (use CSS)
  - Micro-interactions (use CSS/JS in main app)
  - Content that changes per restaurant (use live components)

---

## 14. LottieFiles MCP Usage Guidelines

- **Tool:** `lottie-react` package (v2.4.1) and LottieFiles MCP.
- **Purpose:** lightweight, scalable vector animations for micro-interactions and loading states.
- **Usage:**
  - Scan `/public/lottie/` for existing Lottie files before creating new ones.
  - Use LottieFiles creator API (`mcp__lottiefiles-creator__*` tools) to generate or modify animations.
  - Always call `get_api_doc` (all pages) and `get_rules` from the MCP before writing scripts.
- **When to use:**
  - Loading spinners and skeleton enhancers
  - Success/confirmation micro-animations
  - Empty state illustrations
  - Small decorative elements that enhance brand feel
- **When NOT to use:**
  - Full-screen hero animations (use video or CSS)
  - Complex interactive components (use CSS/JS)
  - Critical UI feedback that must work without JS

---

## 15. Logo and Icon Usage

### Logo
| Context | File | Size | Placement |
|---------|------|------|-----------|
| Landing header | `/brand-icon.png` | `h-8 w-auto` | Start (left in LTR, right in RTL) |
| Footer | `/brand-icon.png` | `h-8 w-auto`, loading="lazy" | Start |
| Admin sidebar | `/brand-icon.png` | `max-h-9 w-auto` | Top center |
| Owner sidebar | `/brand-icon.png` | `max-h-9 w-auto` | Top center |
| Login page | `/brand-icon.png` | `h-full w-full object-contain` | Card center, 64px box |
| Mobile nav | `/brand-icon.png` | `h-8 w-auto` | Sheet header |

### Icons
- **Library:** lucide-react (v1.20.0) — consistent outline style.
- **Size convention:** `size-4` (16px) default, `size-5` (20px) for buttons, `size-6` (24px) for stats, `size-7` (28px) for showcase cards, `size-9` (36px) for partner cards.
- **Color:** `text-primary` for interactive icons, `text-muted-foreground` for decorative, `text-amber-500`/`text-amber-600` for active nav icons.
- **Gradient icon containers:** `size-10 rounded-2xl bg-gradient-to-br` for feature cards.

### Icon Rules
1. All icons from lucide-react — consistent outline family.
2. Icon containers use `flex items-center justify-center` with gradient bg.
3. Decorative icons on landing → `text-primary` from within gradient container.
4. Form/UI icons → lucide-react with `size-4`.
5. No emoji as icons — all converted to SVG.

---

## 16. Accessibility Standards

### Target: WCAG 2.2 AA

### Contrast
- Body text ≥4.5:1 against background — verified for all semantic tokens.
- Large text (≥18px or bold ≥14px) ≥3:1.
- Focus ring: `outline: 2.5px solid var(--ring)` with `outline-offset: 3px`.
- Placeholder text: `--muted-foreground` — maintain 4.5:1 minimum.

### RTL
- Root: `dir="rtl"` with `lang="ar"`.
- `letter-spacing: 0` on RTL headings (Arabic doesn't use letter-spacing well).
- All `left`/`right` → `start`/`end` for RTL. `-translate-x-1/2` is safe (it's centered).
- Icons/arrows: no hardcoded rotation for RTL — they flip naturally with dir.

### Keyboard
- All interactive elements focusable and activatable.
- `focus-visible` ring on all interactive elements.
- Dialog: Base UI handles focus trap automatically.
- Close dialog with Escape.

### Screen Readers
- `aria-label` on icon-only buttons (hamburger menu, theme toggle, dialog close).
- `aria-current="page"` on active nav links.
- `aria-live="polite"` on main content area.
- `sr-only` text for decorative-only visual elements.
- Loading state includes spinner + text description.

### Reduced Motion
- `@media (prefers-reduced-motion: reduce)` kills all animations, transitions, transforms.
- Dialog/overlay animations still fade (reduced opacity change is acceptable).
- Scroll behavior set to `auto`.

### Touch
- Minimum touch target: 44px (achieved via h-8+ buttons, h-14 CTAs).
- Adequate spacing between touch targets (`gap-3` in nav items).
- No hover-only interactions on mobile.

---

## 17. UX Consistency Rules

### Page Transition
- `animate-fade-in` on main wrapper + `animate-page-enter` on content.
- View transitions API (`@view-transition { navigation: auto }`) for native-like SPA feel.

### Loading States
- **Full page:** centered spinner (`Loader2 animate-spin`) + descriptive text.
- **Partial content:** skeleton shimmer (`.skeleton` class).
- **CTA button:** inline spinner + "جاري..." text, disabled state.

### Empty States
- `.empty-state-icon` pattern: center 56px rounded icon container + description text.
- Should teach what to do, not show "nothing here."
- Error states: message + retry button.

### Error Handling
- **Form validation:** field-level `aria-invalid` with red border + ring.
- **API errors:** `sonner` toast — `toast.error()` with server message.
- **Network errors:** "خطأ في الاتصال بالخادم" toast.
- **404 page:** custom `/not-found` with navigation back to home.

### Form Patterns
- Input wrapper `glow-within` for focus-visible glow.
- Labels always present (`<Label>` component).
- Required fields indicated by semantic `required` attribute.
- Password fields: show/hide toggle button.
- Submit buttons: `magnetic-btn` hover effect.

### Confirmation
- Destructive actions: confirm dialog first.
- Successful operations: success toast (`toast.success`).
- Form submission: button disabled + loading state during API call.

---

## 18. Anti-patterns and Forbidden Design Behaviors

### Forbidden (absolute bans)

1. **Gradient text** — no `background-clip: text` + gradient combo. Exception: hero heading only.
2. **Glassmorphism as default** — glass cards only where they serve a purpose (hero badges, modals).
3. **Side-stripe borders** — no `border-left`/`border-right` colored accent strips.
4. **Nested cards** — a card inside a card is always wrong.
5. **Tiny uppercase tracked eyebrow above every section** — one deliberate badge per page max.
6. **Numbered section markers (01/02/03)** as default scaffolding — only where sequence carries information.
7. **Text overflow** — test headings at every breakpoint; overflow is a design failure.
8. **Identical card grids with icon+heading+text** — vary card patterns across sections.
9. **The hero-metric template** — big number + small label + stats as default hero = SaaS cliché.
10. **`z-index: 9999`** — use semantic z-index scale.

### Forbidden (product register)

11. **Display fonts in UI labels, buttons, data.**
12. **Decorative motion that doesn't convey state.**
13. **Inconsistent component vocabulary across screens** — if save button looks different in two places, one is wrong.
14. **Reinventing standard affordances** — custom scrollbars, weird form controls, non-standard modals.
15. **Modal as first thought** — exhaust inline/progressive alternatives.
16. **Heavy color or full-saturation accents on inactive states.**

### Forbidden (visual rules)

17. **Gray text on colored background** — use darker shade of the same hue.
18. **`animate-bounce`** — no CSS bounce animations.
19. **Identical entrance animation on every section** — vary reveal timing per section type.
20. **Emoji as icons** — all decorative icons must be lucide-react SVGs.
21. **Hardcoded colors** — every color value must come from CSS variables. No `#hex` or `rgb()` in component files.

### Permitted with caution

- Gradient buttons (`variant="gradient"`) — CTAs only, not decorative.
- Glass cards — hero badges, modals, premium feature cards. Not for data/forms.
- CountUp animations — stats sections only.
- Floating icons — hero/login only, not general decoration.
- Text gradient animated — hero H1 only, no other location.

---

## 19. Live Config Reference

Live mode (`/impeccable live`) uses `.impeccable/live/config.json` with the following settings for this Next.js App Router project:

- Next.js App Router → served HTML entries are browser-rendered pages; `insertBefore: "</body>"`, comment syntax `<!--`
- Default URL: `http://localhost:3000`

---

*Last updated: 2026-06-24*
*Maintained by: Smart Menu team*
