# Smart Menu — Full-Stack Hardening & Mobile UX Audit

Date: 2026-06-30  
Scope: 3 parallel modules (A / B / C)

---

## Module A — Mobile-First Layout & Canvas Purification

**Goal:** Zero overflow/clipping at 320px+ viewports. Clean grid background rendering.

### A1. Global CLS prevention
- `html, body { overflow-x: hidden; max-width: 100vw; }` in `globals.css`
- All root `main` containers get `w-full max-w-full overflow-x-hidden`
- Enforce on all page-level layouts (`(public)`, `(owner)`, `(admin)`)

### A2. Grid background radial masks
- `.bg-grid-mask` utility: `::before` pseudo with radial gradient over `bg-grid`
- Apply behind Hero, testimonials, feature sections on landing; behind menu/owner pages
- Use `bg-grid-white/5` grid with `from-background via-background/80 to-transparent` mask

### A3. Card/button/dock viewport hardening
- Audit `MenuItemCard`, owner dashboard cards, nav dock at 320px
- Force `min-w-0`, `break-words`, `truncate` on text children
- Bottom nav: `flex-wrap` fallback, `gap-1` instead of `gap-2` below 360px
- No horizontal scroll anywhere

### A4. Motion curve unification
- All Framer Motion `transition` → spring default: `{ type: "spring", stiffness: 300, damping: 25 }`
- Keep existing overrides only where visually required (page transitions, add-to-cart burst)

### A5. WCAG AA contrast sweep
- Text on orange (`#f66d0f`): guarantee 4.5:1 on dark backgrounds
- Text on dark (`#111013`): white `#fff` only (≥13:1)
- Low-opacity elements (muted labels, placeholders) pass 3:1 minimum

**Files touched:** `globals.css`, `layout.tsx`, `(public)/layout.tsx`, `(owner)/layout.tsx`, `(admin)/layout.tsx`, `MenuItemCard.tsx`, nav components

---

## Module B — Ratings Sync (Item Reviews)

**Goal:** Customers rate menu items. Badge on card → bottom-sheet form → stored → visible to merchant.

### B1. Data layer
- Prisma `Review` model: `id, itemId, restaurantId, rating (1-5), comment, createdAt`
- Migration via Prisma schema push

### B2. API
- `POST /api/items/[id]/reviews` — create review (body: `{ rating, comment }`)
- `GET /api/items/[id]/reviews` — list reviews with avg rating
- `GET /api/owner/reviews?restaurantId=` — merchant view with item name join

### B3. Frontend
- `MenuItemCard`: show `avgRating` badge → click opens `ReviewSheet`
- `ReviewSheet`: framer bottom-drawer with 5-star selector + textarea + submit
- After submit: optimistic UI update on badge, toast confirmation
- Owner dashboard: `/owner/reviews/` table with item, rating, comment, date
- Owner layout: add "التقييمات" (Reviews) nav link

### B4. Error states
- Unauthenticated → show login prompt in sheet
- Network fail → retry toast, keep form state
- Empty reviews → "لا توجد تقييمات بعد" (No reviews yet)

**Files created:** `ReviewSheet.tsx`, `/api/owner/reviews/route.ts`  
**Files modified:** `MenuItemCard.tsx`, `schema.prisma`, `owner/layout.tsx`

---

## Module C — Code Scouring & Asset Optimization

**Goal:** Dead-free, type-safe, optimized asset delivery.

### C1. Dead-code removal
- Grep: `console.log`, `console.warn`, `console.error` in production components → remove or replace with proper logging
- Unused imports in every `.tsx`/`.ts` file → prune
- Orphaned CSS classes → remove

### C2. Typo sweep
- Scan static Arabic/English strings across `src/app` and `src/components`
- Fix mismatched quotes, broken `dangerouslySetInnerHTML`, stray `&nbsp;`

### C3. Image optimization
- All `next/image`: add `loading="lazy"`, `sizes` attribute
- Cards: provide `blurDataURL` (12x12 CSS shimmer) placeholder
- Enforce `aspect-[4/3]` or explicit `width/height` to prevent layout shift
- Migrate `<img>` → `<Image>` where found

### C4. Prisma query hardening
- Add `select` or `include` to every `prisma.model.findMany/findFirst` — stop `SELECT *`
- Add pagination (`take`, `skip`) on list endpoints without it
- Server actions: validate inputs with zod schemas at boundary

**Files touched:** global — scan all components, pages, API routes, actions, lib

---

## Implementation Plan

| Step | Action | Agent |
|------|--------|-------|
| 1 | Deploy A: globals CSS, layout fixes, viewport audit | Agent A (mobile-ui) |
| 2 | Deploy B: Prisma schema, API routes, ReviewSheet, dashboard | Agent B (ratings) |
| 3 | Deploy C: sweep imports/logs/typos, image opt, Prisma select | Agent C (scour) |
| 4 | Coordination: merge, lint, build | Lead |
| 5 | Build verification + fix any issues | All |

**Collaboration boundary per note:** Agents target distinct file trees. Where overlap (MenuItemCard.tsx), Agent B is primary; A only touches CSS/no-conflict-zone.
