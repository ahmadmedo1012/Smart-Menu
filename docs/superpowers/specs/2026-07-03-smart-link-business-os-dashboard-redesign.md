# Smart-Link Business OS — Dashboard Redesign

## 1. Overview

**Goal:** Transform current admin dashboard from generic admin panel to premium operating console inspired by reference image (dashboard.jpg) mood — deep dark glassmorphism, floating cards, strong center focus, premium minimalism.

**Stack:** Next.js 16, React 19, Tailwind CSS 4, framer-motion 12, @base-ui/react, lucide-react, next-themes

**RTL:** Arabic-first with full English support. All components must support both directions.

**Constraint:** Preserve all existing routes, data fetching, API contracts, and business logic. Pure visual/layout upgrade.

---

## 2. Visual System

### 2.1 Background

- Deepen dark background from `oklch(0.05 0.002 0)` → `oklch(0.035 0.003 30)` 
- Add warm radial gradient at top-center: `radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.68 0.19 45 / 0.08), transparent 70%)`
- Keep grain overlay at reduced opacity (0.02)

### 2.2 Glass Cards

- `--glass-bg`: `oklch(0.10 0.003 0 / 0.4)` — more transparent
- `--glass-bg-strong`: `oklch(0.13 0.004 0 / 0.55)`
- `backdrop-blur`: 24px → 32px
- Border: `oklch(0.55 0.19 45 / 0.06)` — more subtle oxide tint
- Shadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`

### 2.3 Typography

- Headings: Readex Pro (Arabic) / Inter (English), weight 500–600
- Body: Noto Sans Arabic / Inter, weight 400, line-height 1.6
- Scale: 12 / 14 / 16 / 18 / 24 / 32 / 48

### 2.4 Color

- **Primary (brand):** `oklch(0.58 0.19 45)` — slightly brighter orange
- **Accent glow:** orange halo behind active elements
- **Status:** emerald success, amber warning, blue info — all at 80% saturation
- **Text:** `oklch(0.92 0.005 0)` primary, `oklch(0.55 0.01 0)` secondary
- **Surface hierarchy:** raised / default / sunken with subtle OKLCH shifts

### 2.5 Radius

- `--radius-sm: 16px` (cards, panels)
- `--radius-md: 12px` (buttons, inputs)
- `--radius-lg: 24px` (large panels)
- `--radius-xl: 28px` (hero elements)

### 2.6 Elevation / Shadow

- **Card default:** `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
- **Card hover:** `0 12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`
- **Modal/Sheet:** `0 24px 64px rgba(0,0,0,0.6)`

---

## 3. Layout — 3-Zone Operating Console

### 3.1 Desktop Layout

```
┌──────────────────────────────────────────────────────────────┐
│                    Ambient Background Glow                    │
│  ┌──┐  ┌────────────────────────┐  ┌────────────────────┐   │
│  │  │  │                        │  │                    │   │
│  │ N│  │    CENTER WORKSPACE    │  │   INSIGHTS PANEL   │   │
│  │ A│  │    (active page)       │  │   - Live metrics   │   │
│  │ V│  │                        │  │   - Alerts feed    │   │
│  │  │  │    Glass card grid     │  │   - Recent events  │   │
│  │  │  │    Charts + data       │  │   - Quick actions  │   │
│  │  │  │                        │  │   - Active sessions│   │
│  │  │  │                        │  │                    │   │
│  │  │  │                        │  │                    │   │
│  └──┘  └────────────────────────┘  └────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

- **Left Nav:** 64px collapsed icon bar OR 220px expanded sidebar (user toggleable). Renders nav items as icon + label with active orange accent.
- **Center Workspace:** `flex-1` — primary content area. Uses `max-w-7xl` centered within with floating glass card containers.
- **Right Insights Panel:** 280px wide, collapsible. Shows real-time KPIs, alert feed, active sessions, and system status. Only on dashboard page; hidden on sub-pages unless toggled.

### 3.2 Mobile Layout

- Stacked single-column: Nav → Content
- Right insights panel becomes a bottom-drawer or dismissible overlay
- Nav collapses to bottom tab bar OR hamburger drawer

### 3.3 Breakpoints

- Mobile: 375px — single column, bottom nav
- Tablet: 768px — sidebar visible, no insights panel
- Desktop: 1024px+ — full 3-zone
- Wide: 1440px+ — max-width constraint with ambient padding

---

## 4. Component Map

### 4.1 New Components

| Component | Location | Purpose |
|---|---|---|
| `OperatingConsoleLayout` | `src/components/layout/OperatingConsoleLayout.tsx` | New admin layout — 3-zone flex container |
| `InsightsPanel` | `src/components/layout/InsightsPanel.tsx` | Right panel: metrics, alerts, activity |
| `WorkspaceCard` | `src/components/shared/WorkspaceCard.tsx` | Floating glass card container for page content |
| `CompactSidebar` | `src/components/layout/CompactSidebar.tsx` | Clean nav with icon + label, collapsible |
| `FloatingMetricBadge` | `src/components/shared/FloatingMetricBadge.tsx` | Mini KPI indicator for nav bar |
| `GlassCardGrid` | `src/components/shared/GlassCardGrid.tsx` | Responsive grid wrapping WorkspaceCards |

### 4.2 Modified Components

| Component | Changes |
|---|---|
| `AdminSidebar` | Refactor into `CompactSidebar` with collapsible mode, cleaner active states |
| `LayoutHeader` | Reduce height (12→10), more transparent glass, thinner border |
| `KpiCard` | Larger icon area, softer shadow, increase border-radius to 16px |
| `NavLink` | Improve active indicator — subtle glow instead of solid bar |
| `PageFade` | Faster entrance (0.3s vs 0.5s) for snappier feel |

### 4.3 Removed Components (replaced)

- `AdminSidebar.tsx` → replaced by `CompactSidebar.tsx`
- `admin/layout.tsx` → replaced by `OperatingConsoleLayout.tsx`

---

## 5. Dashboard Page (admin/page.tsx) — Full Redesign

### 5.1 Layout Sections

**Top Strip:** Floating metric bar — 4 live numbers (restaurants, users, revenue, orders today) in a single row of compact glass pills.

**Center Hero Section:** Large glass card with the primary chart (revenue trend) as the focal point. Full-width, commanding presence.

**Mid Section:** 2-column grid — order volume chart (left) + top items bar chart (right)

**Bottom Section:** 3-column grid of activity feeds (recent signups, logins, active restaurants) in consistent glass cards with matching header styles.

**Footer:** Quick actions row + live auto-refresh indicator.

### 5.2 States

- **Loading:** Shimmer skeleton matching new card sizes and radii
- **Empty:** Centered icon + message in glass card with subtle animation
- **Error:** Glass card with destructive accent, retry button, error details
- **Data:** Smooth framer-motion stagger entrance (50ms delay per card)

### 5.3 Charts

- Keep AreaChart and HorizontalBar — update their container styling
- Chart backgrounds: transparent within glass cards
- Grid lines: more subtle (`border-border/10`)
- Tooltip: glass-styled tooltip with backdrop blur

---

## 6. Sidebar

### 6.1 Navigation Items

Preserve all 11 items. Add ability to mark sections as "active" with a subtle orange glow indicator (not a solid bar).

### 6.2 Brand Area

Keep brand logo + "Smart Link" text. Make logo larger (40px), add subtle pulse glow behind icon.

### 6.3 Collapse Mode

Add toggle button to collapse sidebar to icon-only (64px) for more workspace space. Tooltip on hover for collapsed labels.

---

## 7. Animation & Motion

- **Page transitions:** 0.3s fade + micro slide-up via `PageFade`
- **Card entrance:** Staggered spring entrance (stiffness: 250, damping: 20)
- **Hover states:** Cards lift 4px with larger shadow and subtle border glow
- **Nav indicator:** Spring-based position transition
- **Insights panel:** Slide from right with 0.25s ease-out
- **All durations** respect `prefers-reduced-motion`

---

## 8. Implementation Plan

### Phase 1 — Design Tokens & Globals (1 session)
1. Update `globals.css` — background, glass tokens, radii, shadows
2. Add radial gradient background pattern
3. Update `.glass` and `.glass-strong` utility classes
4. Add new animation classes for card stagger

### Phase 2 — Layout Restructure (1 session)
1. Create `CompactSidebar.tsx` with collapsible mode
2. Create `InsightsPanel.tsx` with toggle
3. Create `OperatingConsoleLayout.tsx` — new admin layout
4. Update `LayoutHeader.tsx` — thinner, more transparent
5. Update `admin/layout.tsx` to use new layout
6. Test RTL/LTR in both collapsed/expanded states

### Phase 3 — Shared Components (1 session)
1. Create `WorkspaceCard.tsx`
2. Create `GlassCardGrid.tsx`
3. Create `FloatingMetricBadge.tsx`
4. Update `KpiCard.tsx` — new visual style

### Phase 4 — Dashboard Page (1 session)
1. Rewrite `admin/page.tsx` with new layout hierarchy
2. Implement stagger entrance animations
3. Update chart containers
4. Integrate InsightsPanel data
5. Polish loading/error/empty states

### Phase 5 — Polish & QA (1 session)
1. Mobile responsive pass
2. RTL/LTR final pass
3. Motion check — reduced-motion support
4. Screenshot comparison before/after
5. Lighthouse audit

---

## 9. Files to Create

1. `src/components/layout/CompactSidebar.tsx`
2. `src/components/layout/InsightsPanel.tsx`
3. `src/components/layout/OperatingConsoleLayout.tsx`
4. `src/components/shared/WorkspaceCard.tsx`
5. `src/components/shared/GlassCardGrid.tsx`
6. `src/components/shared/FloatingMetricBadge.tsx`

## 10. Files to Modify

1. `src/app/globals.css` — tokens, background, shadows, radii
2. `src/app/admin/layout.tsx` — use new OperatingConsoleLayout
3. `src/app/admin/page.tsx` — full rewrite
4. `src/components/layout/LayoutHeader.tsx` — thinner, more transparent
5. `src/components/layout/AdminSidebar.tsx` — keep for reference, remove from layout
6. `src/components/admin/KpiCard.tsx` — visual upgrade
7. `src/components/shared/NavLink.tsx` — better active state

---

## 11. Anti-Patterns to Avoid

- No sharp corners anywhere (minimum 12px radius)
- No heavy borders — use subtle `border-border/10` or `border-border/5`
- No flat colors — every surface needs translucency or gradient texture
- No clutter on the dashboard — max 4 KPIs in top strip, not 8
- No overlapping text on glass (test contrast on actual blur)
- No layout shift during animations (use transform, not width/height)
- No emoji as icons — use lucide-react exclusively
