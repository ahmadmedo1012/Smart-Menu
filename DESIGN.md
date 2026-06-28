# Smart Menu — Design System

> Single source of truth for all visual, interactive, and motion decisions.
> Brand: **Orange · Premium · Bold** | Register: **product** (with brand marketing surface)

---

## 1. Brand Identity

### DNA
- **Energy** — bold orange (#f66d0f) signals action, hospitality, and digital confidence. Not aggressive — a warm, purposeful orange with appetite appeal.
- **Dark foundation** — near-black surfaces (#111013) create a premium stage for content. The dark canvas makes the orange glow and the content breathe.
- **Trusted** — consistent affordances, bank-grade form controls, no dark patterns.

### Voice
- Arabic-first, bilingual-ready. Brand name: **الربط الذكي | Smart Menu**
- Tone: confident but not loud, premium but not pretentious, warm without being casual
- Micro-copy: polite, instructive, never "Oops!" or "Uh-ah" — always helpful

### Logo
- **File:** `/brand-icon.png`
- **Placement:** header (start), footer (start), sidebar (top), login card (center)
- **Sizing:** landing header h-8, sidebar max-h-9, login fit
- **No text logo** exists — brand icon stands alone. Favicon is `/favicon.ico`

---

## 2. Color System

### 2.1 Semantic Tokens (OKLCH)

Dark mode is the default theme. Light mode is a .light override on the same tokens.

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--background` | `oklch(0.07 0.002 0)` | `oklch(0.985 0 0)` | Page / app bg |
| `--foreground` | `oklch(0.93 0.005 0)` | `oklch(0.11 0 0)` | Body text |
| `--card` | `oklch(0.09 0.003 0)` | `oklch(1 0 0)` | Elevated surfaces |
| `--card-foreground` | `oklch(0.93 0.005 0)` | `oklch(0.11 0 0)` | Text on card |
| `--popover` | `oklch(0.09 0.003 0)` | `oklch(1 0 0)` | Dropdowns, popovers |
| `--popover-foreground` | `oklch(0.93 0.005 0)` | `oklch(0.11 0 0)` | Text on popover |
| `--primary` | `oklch(0.55 0.19 45)` | `oklch(0.55 0.19 45)` | Key CTA, brand accent (AA-compliant) |
| `--primary-foreground` | `oklch(0.98 0 0)` | `oklch(0.98 0 0)` | Text on primary |
| `--secondary` | `oklch(0.14 0.005 0)` | `oklch(0.92 0.005 0)` | Muted surfaces |
| `--secondary-foreground` | `oklch(0.72 0.005 0)` | `oklch(0.2 0 0)` | Text on secondary |
| `--muted` | `oklch(0.14 0.005 0)` | `oklch(0.94 0.003 0)` | Low-emphasis surfaces |
| `--muted-foreground` | `oklch(0.5 0.01 0)` | `oklch(0.52 0.01 0)` | Secondary text |
| `--accent` | `oklch(0.55 0.19 45 / 0.15)` | `oklch(0.55 0.19 45 / 0.12)` | Subtle highlight |
| `--accent-foreground` | `oklch(0.55 0.19 45)` | `oklch(0.55 0.19 45)` | Text on accent |
| `--destructive` | `oklch(0.6 0.22 25)` | `oklch(0.58 0.2 25)` | Errors, deletion |
| `--success` | `oklch(0.62 0.18 145)` | `oklch(0.62 0.18 145)` | Success states |
| `--success-foreground` | `oklch(0.98 0 0)` | `oklch(0.98 0 0)` | Text on success |
| `--warning` | `oklch(0.7 0.16 80)` | `oklch(0.7 0.16 80)` | Warning states |
| `--warning-foreground` | `oklch(0.1 0 0)` | `oklch(0.1 0 0)` | Text on warning |
| `--info` | `oklch(0.55 0.14 240)` | `oklch(0.55 0.14 240)` | Info states |
| `--info-foreground` | `oklch(0.98 0 0)` | `oklch(0.98 0 0)` | Text on info |
| `--border` | `oklch(0.22 0.005 0)` | `oklch(0.85 0.005 0)` | Borders, dividers |
| `--input` | `oklch(0.22 0.005 0)` | `oklch(0.85 0.005 0)` | Form input borders |
| `--ring` | `oklch(0.55 0.19 45)` | `oklch(0.55 0.19 45)` | Focus rings |
| `--radius` | `0.5rem` | `0.5rem` | Base radius |

### 2.2 Orange Palette (OKLCH)

| Token | Dark | Light |
|-------|------|-------|
| `--orange` | `oklch(0.68 0.19 45)` | `oklch(0.68 0.19 45)` |
| `--orange-foreground` | `oklch(0.98 0 0)` | `oklch(0.98 0 0)` |
| `--orange-muted` | `oklch(0.68 0.19 45 / 0.15)` | `oklch(0.68 0.19 45 / 0.12)` |

### 2.3 Surface Tokens

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--surface-raised` | `oklch(0.12 0.005 0)` | `oklch(1 0 0)` | Modals, dropdowns |
| `--surface-overlay` | `oklch(0.09 0.003 0)` | `oklch(1 0 0)` | Sheets, drawers |
| `--surface-sunken` | `oklch(0.05 0.002 0)` | `oklch(0.97 0.003 0)` | Content sections |

### 2.4 Gradients

- **`--gradient-orange`**: `linear-gradient(135deg, oklch(0.68 0.19 45 / 0.12), oklch(0.62 0.19 45 / 0.06))` — subtle orange wash
- **`--gradient-shine`**: `linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.06) 50%, transparent 100%)` — shimmer overlay

### 2.5 Glass Tokens

- `--glass-bg`: `oklch(0.09 0.003 0 / 0.55)` dark / `oklch(1 0 0 / 0.6)` light
- `--glass-bg-strong`: `oklch(0.12 0.005 0 / 0.7)` dark / `oklch(1 0 0 / 0.8)` light
- `--glass-border`: `oklch(0.22 0.008 0 / 0.5)` dark / `oklch(0.85 0.005 0 / 0.5)` light
- Classes: `.glass` (blur-16), `.glass-strong` (blur-20)

### 2.6 Shadows

```css
--shadow-sm:   0 1px 3px oklch(0 0 0 / 0.3), 0 1px 2px oklch(0 0 0 / 0.22)
--shadow-md:   0 4px 16px oklch(0 0 0 / 0.35), 0 2px 4px oklch(0 0 0 / 0.25)
--shadow-lg:   0 12px 40px oklch(0 0 0 / 0.4), 0 4px 8px oklch(0 0 0 / 0.3)
--shadow-xl:   0 24px 60px oklch(0 0 0 / 0.45), 0 8px 16px oklch(0 0 0 / 0.35)
--shadow-glow: 0 0 25px oklch(0.68 0.19 45 / 0.25)
```

### 2.7 Color Rules

1. **Body text** must hit 4.5:1 contrast against bg.
2. **Muted text** must be 4.5:1 minimum.
3. **Placeholder text** = `--muted-foreground`.
4. Gray text on colored bg → use darker shade of bg's own hue.
5. **Orange** used for primary actions, current selection, state indicators only — not decoration.
6. No gradient text anywhere. Orange is bold enough.

---

## 3. Typography System

### 3.1 Font Stack

| Role | Font | Weight | Fallback |
|------|------|--------|----------|
| Display/Heading | **AloaaxB** | 500 | Readex Pro, Noto Sans Arabic, system-ui, sans-serif |
| Body/Sans | **Aloaax** | 500 | Noto Sans Arabic, system-ui, sans-serif |
| Arabic | **Noto Naskh Arabic** | 400, 700 | Noto Sans Arabic, Readex Pro, system-ui, sans-serif |

### 3.2 Font Variables

```css
--font-sans:    "Aloaax", "Noto Sans Arabic", system-ui, sans-serif;
--font-display: "AloaaxB", "Readex Pro", "Noto Sans Arabic", system-ui, sans-serif;
--font-heading: "AloaaxB", "Readex Pro", "Noto Sans Arabic", system-ui, sans-serif;
--font-body:    "Aloaax", "Noto Sans Arabic", system-ui, sans-serif;
--font-arabic:  "Noto Naskh Arabic", "Noto Sans Arabic", "Readex Pro", system-ui, sans-serif;
```

### 3.3 Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Display (hero) | `text-4xl md:text-6xl lg:text-[4.5rem]` | 500 | 1.15 |
| h1 | `text-3xl md:text-4xl` | 500 | 1.2 |
| h2 | `text-2xl md:text-3xl` | 500 | 1.2 |
| h3 | `text-lg` | 500 | 1.2 |
| Body | `text-sm` (14px) | 500 | 1.5 |
| Large body | `text-lg` (18px) | 500 | 1.5 |
| Small | `text-xs` (12px) | 500 | 1.5 |

For RTL: `letter-spacing: 0` on headings.

### 3.4 Typography Rules

1. **One display font** (AloaaxB) carries all headings.
2. **text-wrap: balance** on h1-h3.
3. Display heading ceiling: clamp() max 6rem (96px).
4. Buttons: `text-sm font-medium` (14px).
5. Body: `max-w-prose` (65ch) for reading sections.

---

## 4. Spacing System

### 4.1 Layout
- **Max content width**: `max-w-6xl` (1152px) → uses standard 1220px by using px-4
- **Sidebar**: w-60 (240px)
- **Header height**: h-12 (48px) — fixed floating header
- **Section vertical padding**: py-20 (80px) — PlanPOS signature spacing

### 4.2 Section Structure
- Sections separated by `border-t border-border/50` or natural 80px spacing
- **One theme per page**: all sections share same dark bg; light sections never interpolated
- **Stats section**: py-20
- **Grid gaps**: gap-6 between cards

### 4.3 Spacing Rules
1. 4px base unit.
2. Generous, consistent. No negative margins between sections.

---

## 5. Component System

### 5.1 Buttons
- **3 variants**: `orange` (solid), `outline` (bordered), `ghost` (text only)
- **3 sizes**: sm (h-8), default (h-10), lg (h-14)
- no gradient variants, no secondary/default/destructive variants
- Rounding: `rounded-sm` (var(--radius-sm, 2px))

### 5.2 Radius System
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 12px | Buttons, inputs, pill elements |
| `--radius-md` | 6px | Cards, containers |
| `--radius-lg` | 12px | Large containers, hero image wells |
| `--radius-xl` | 14px | Header glass nav |

### 5.3 Cards
- Background: var(--card)
- Radius: var(--radius-md, 6px)
- Border: 1px solid var(--border)
- Hover: lift 3px + shadow-lg + shadow-glow + border-orange

### 5.4 Navigation
- Fixed floating header, glass-strong
- 3 links max: الخطط والأسعار, منيو تجريبي, لوحة التحكم
- Desktop: inline links; Mobile: hamburger dropdown
- Active state: `text-orange font-medium`
- Hover state: `opacity-65` (PlanPOS spec)

### 5.5 Menu Item Card
Core product card for displaying menu items in public menu view.

**Location:** `src/components/menu/MenuItemCard.tsx`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `item.id` | `number` | Unique item ID |
| `item.name` | `string` | Item name (fallback) |
| `item.nameAr` | `string \| null` | Arabic name (preferred) |
| `item.description` | `string` | English description |
| `item.descriptionAr` | `string` | Arabic description |
| `item.price` | `number` | Base price |
| `item.discountedPrice` | `number \| null` | Discounted price (optional) |
| `item.image` | `string` | Image URL |
| `item.isPopular` | `boolean` | Show "Most Popular" badge |
| `item.isNew` | `boolean` | Show "New" badge |

**States:**
- **Default** — image, name (Arabic priority), description, price, CTA
- **Out of stock** — fallback icon (`UtensilsCrossed`) when image fails to load
- **In cart** — quantity counter replaces CTA button (`+` / `-` controls)
- **Has discount** — original price shows line-through; badge `-{N}%`
- **Loading** — skeleton shimmer on image before it loads
- **Empty image** — muted placeholder with utensil icon

**Layout:**
- Horizontal card: image (96px square) + content column
- RTL-aware: badges positioned with `start`/`end` logical properties
- Hover: lift -1.5px, shadow-xl, orange-muted shadow, border-orange/30

**Interactive elements:**
- Entire card clickable → opens OrderDialog (keyboard: Enter/Space)
- "Add to Cart" button → `onAddToCart`, spring animation
- Quantity stepper → `onDecrementCart` / `onAddToCart`
- `aria-label` on all buttons with Arabic item name

### 5.6 Badge System
In-menu badges for status indicators on MenuItemCard images.

**Types:**
| Badge | Color | Condition | Text |
|-------|-------|-----------|------|
| Most Popular | `bg-amber-500 text-white` | `item.isPopular === true` | الأكثر طلباً |
| New | `bg-emerald-500 text-white` | `item.isNew === true && !isPopular` | 🆕 جديد |
| Discount | `bg-destructive text-destructive-foreground` | `item.discountedPrice < item.price` | `-{N}%` |

**Behavior:**
- Most Popular and New: spring animation (stiffness: 500, damping: 25)
- New badge hidden when item is also Popular (priority: Popular wins)
- Discount badge shows calculated percentage one-time
- RTL-aware positioning: badges at `start`, discount at `end`

---

## 6. Motion System

### 6.1 Timing
- `--duration-fast: 0.2s` — hover, micro-interactions
- `--duration-base: 0.4s` — transitions, reveals
- `--duration-slow: 0.7s` — section entries

### 6.2 Easing
- `--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1)`
- `--ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1)`
- `--ease-smooth: cubic-bezier(0.16, 1, 0.2, 1)`

### 6.3 Keyframes (limited to essential)
- `fade-in` — translates up 18px
- `slide-up` — translates up 24px
- `scale-in` — scale 0.94 to 1
- `shimmer` — skeleton/bg sweep
- `pulse-glow` — orange shadow pulse
- `hero-glow-pulse` — radial glow animation
- `marquee` — infinite logo scroll

### 6.4 Reduced Motion
- All animations collapse under `prefers-reduced-motion: reduce`
- Durations set to 0.01ms

---

## 7. Page Theme Lock

**One theme per page.** Sections do not invert.

- Default: dark mode (all sections use `var(--background)`)
- Light mode: `.light` override available via ThemeToggle
- No light-warm sections sandwiched between dark sections
- Section-level bg variations within the same theme are fine (`bg-card` vs `bg-background`)

---

## 8. Design Rules

### Do's
- Use orange (#f66d0f) for all primary CTAs
- Use surface-dark (#111013) for content sections
- Use spacing scale: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 80
- Apply radius-md (6px) to cards and containers
- Apply radius-sm (2px) to buttons and inputs
- Use body text at 4.5:1 min contrast

### Don'ts
- Do not use blue-centric themes (migrated to orange)
- Do not mix light and dark section backgrounds on one page
- Do not use gradient text or decorative glassmorphism
- Do not embed duplicate CTAs
- Do not use white text on orange (#f66d0f) fills for body content
- Do not use em-dashes (—) anywhere

---

## 9. Reference

Based on PlanPOS design system analysis:
- https://planpos.com/ — live reference (full extracted spec)
- globals.css — canonical token definitions
