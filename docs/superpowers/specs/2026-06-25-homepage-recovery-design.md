# Smart Menu Homepage Recovery — Design Spec

## Overview

Full visual, motion, and data-accuracy recovery of the Smart Menu homepage. Fix modal positioning, flashing, broken motion, fake metrics. Build Remotion hero demo. Replace fabricated landing stats with real DB data.

## Scope

- `src/components/ui/dialog.tsx` — modal positioning + z-index + scroll
- `src/components/ui/sheet.tsx` — mobile safe-area + z-index
- `src/components/landing/PhoneMockup.tsx` — hero video integration
- `src/components/landing/HomePage.tsx` — stats fetch from real API
- `src/components/landing/landing-data.ts` — remove fake metrics, add types
- `src/app/api/public/stats/route.ts` — new public stats endpoint
- `src/app/globals.css` — animation fixes
- Remotion directory `remotion/` — new hero demo composition

## A. Modal/Overlay System Fix

**dialog.tsx:**
- `DialogContent`: add `max-h-[85dvh] overflow-y-auto overscroll-contain`
- DialogOverlay: change `z-50` → `z-40`
- DialogContent: keep `z-50` (already correct relative to overlay)
- Scroll-lock: Base UI Dialog handles scroll-lock natively — verify it works with RTL. If not, add `overflow-hidden` to body on open.
- Close button: replace empty `<XIcon />` with `aria-label="إغلاق"` on the close button trigger

**sheet.tsx:**
- SheetOverlay: change `z-50` → `z-40`
- SheetContent: keep `z-50`, add `pb-[env(safe-area-inset-bottom,0px)]`
- Close button: same aria-label fix

## B. Animation Flashing Fix

- Dialog animations use `data-starting-style`/`data-ending-style` attributes from Base UI — these are correct for the framework. Flashing only occurs if CSS hasn't loaded when DOM paints. Content is never visibility-gated — safe.
- Sheet animations same pattern. Verified as correct.
- No change needed — the `Reveal` component already keeps content visible by default.

## C. Remotion Hero Pipeline

New directory `remotion/` at project root with:

```
remotion/
  src/
    Root.tsx          — Composition registration (1080×390, 8s @ 30fps)
    HeroDemo.tsx       — Main composition orchestrator
    scenes/
      PhoneFrame.tsx   — Phone bezel/mockup frame
      MenuScroll.tsx   — Menu items scrolling into view
      ItemSelection.tsx— Item tap animation, detail expansion
      QuantitySelect.tsx — Quantity selector animation
      WhatsAppSend.tsx — "أرسل الطلب" button + checkmark
  package.json
  remotion.config.ts
```

**Composition:** 1080×390px (3:1 hero banner). Matches hero section width.
**Storyboard (240 frames @ 30fps):**
- 0-30: Black BG → phone frame fade in, gold ambient glow
- 30-90: Menu items slide up staggered (4 items)
- 90-135: Tap animation on item 2 — gold highlight, expansion
- 135-180: Quantity selector fades in, counter increments to 2
- 180-210: WhatsApp button pulses green
- 210-240: Checkmark, success text, gold glow hold

Render → `public/hero-intro.mp4` (replaces current 536KB file).

## D. Public Stats API

**`src/app/api/public/stats/route.ts`:**
```ts
// GET /api/public/stats
// Returns real DB counts — lightweight, no auth, cached.
// Query: SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM restaurants;
// Response: { totalRestaurants: number, totalUsers: number }
// Cache: 5 minutes server-side
```

**landing-data.ts changes:**
- Remove `STATS` array with hardcoded values
- Export `fetchStats()` that calls `/api/public/stats`
- HomePage.tsx: add `useEffect` to fetch stats, pass to CountUp components
- Fallback: render section only when data loaded (no cached fakes)

**Stats display change:**
- Current: 4 stats (Store, ShoppingCart, Users, Star)
- New: 2 real stats (Store → totalRestaurants, Users → totalUsers) + Star (4.8 rating — keep if from real source, otherwise remove)
- Remove: "550+ orders/month", "1200+ active users" — replace with real counts

## E. Additional Polish

- Footer: verify RTL alignment, fix if needed
- OrderDialog: blue gradient quantity selector → use gold theme
- PhoneMockup: ensure poster image loads before video
- Remove misleading Vercel comments from landing-data.ts
- Close button aria-label in all dialog variants

## Files Changed

| File | Change |
|------|--------|
| src/components/ui/dialog.tsx | Fix z-index, add max-h/overflow, aria-label |
| src/components/ui/sheet.tsx | Fix z-index, safe-area, aria-label |
| src/components/landing/landing-data.ts | Remove fake STATS, add API types |
| src/components/landing/HomePage.tsx | Add stats fetch from /api/public/stats |
| src/app/api/public/stats/route.ts | NEW — public stats endpoint |
| remotion/ (entire dir) | NEW — Remotion hero demo |
| public/hero-intro.mp4 | REPLACE — new rendered output |
| public/hero-poster.jpg | UPDATE — new poster matching new video |

## Anti-Patterns Avoided

- No gradient text (forbidden by impeccable rules)
- No glassmorphism as default
- No side-stripe borders
- No identical card grids
- No numbered section markers
- No bounce animations
- No hardcoded colors in components (all CSS vars)
- No fake data

## Launch Readiness Criteria

- [ ] Modals centered on desktop, usable on mobile
- [ ] No flashing on initial page load
- [ ] Remotion video visible, autoplaying, looping
- [ ] Landing stats show real DB numbers
- [ ] No fabricated metrics anywhere
- [ ] Dialog/Sheet close buttons have proper aria-labels
- [ ] Reduced-motion media query respected
- [ ] RTL layout correct throughout
- [ ] Build passes (`npm run build`)
