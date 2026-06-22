# Performance Audit: Smart Menu

Audit date: 2026-06-22
Scope: Client bundle, image optimization, data fetching

---

## 1. Bundle Size & Code Splitting

### 1.1 Dynamic imports — underutilized (medium)

Only 3 files use `dynamic()`:
- `src/app/admin/page.tsx:11` — `BarChart` (48-line component, ~1.5KB). Not worth the lazy overhead.
- `src/app/owner/loyalty/page.tsx:19-22` — `LoyaltySettings` (good — settings panel that's hidden by default).
- `src/app/order-confirmed/page.tsx` — one import.

**Fix**: Remove `dynamic()` wrapper from BarChart (line 11 in admin/page.tsx). Replace with static import. The component is tiny and always rendered.

### 1.2 `"use client"` sprawl (medium)

All 5 audited pages are `"use client"`. The admin CRUD pages truly need it (dialogs, search, form state). But:

- `src/app/admin/page.tsx:1` — Only the data-fetching side needs client interactivity. The header, stats cards, chart, and quick-actions grid are presentational. **Split**: extract chart and stats cards into server components, wrap the data-fetching part in a small `<AdminDashboardClient>` shell.

- `src/app/owner/loyalty/page.tsx:1` — `StatCard`, `TierChart`, `ReferrersList`, `TransactionsTable` are all presentational. Only the top-level data fetch needs client. Move subcomponents to server components.

- `src/app/owner/page.tsx:1` — `StatCard`, `OrderRow`, `AnimatedCounter` are presentational subcomponents that could live as server components.

### 1.3 Missing memoization (low)

No `useMemo` calls anywhere in the 5 pages. Subcomponents (`StatCard`, `OrderRow`, `TierChart`, `ReferrersList`, `TransactionsTable`) are not wrapped in `React.memo()`. They re-render every time parent state changes.

**Fix**: Wrap presentational subcomponents in `memo()` — especially `StatCard` (used 6+ times across pages) and `OrderRow` (used in a list).

### 1.4 No heavy chart libraries (good)

BarChart is a custom 48-line component with zero dependencies—no recharts, d3, or charting library. This is excellent for bundle size.

---

## 2. Image Optimization

### 2.1 All images use `<img>`, never `next/image` (high)

10 files use `<img>` tags. Zero use `next/image` or `next/legacy/image`.

**Files affected**:
- `src/app/menu/[slug]/page.tsx:88` — restaurant logo
- `src/app/owner/settings/page.tsx:203,246` — logo + gallery
- `src/app/owner/qr/page.tsx:98` — QR preview
- `src/app/admin/settings/page.tsx:186` — logo
- `src/app/admin/qr/page.tsx:105` — QR preview
- `src/components/menu/GalleryCarousel.tsx` — gallery images
- `src/components/menu/MenuItemCard.tsx` — item images
- `src/components/menu/OrderDialog.tsx` — item images
- `src/components/menu/StickyMenuHeader.tsx` — restaurant logo
- `src/components/owner/ItemDialog.tsx` — upload preview

**Impact**: No automatic WebP/AVIF conversion, no lazy-loading, no responsive sizing, no width/height to prevent layout shift.

**Fix**: Replace `<img>` with `next/image` in:
1. Menu pages (high traffic — biggest CLS impact): `menu/[slug]/page.tsx`, `MenuItemCard.tsx`, `StickyMenuHeader.tsx`
2. Admin/owner settings (logo uploads): `admin/settings/page.tsx`, `owner/settings/page.tsx`

### 2.2 No height/width on img tags (high)

Most `<img>` tags lack explicit `width` and `height` attributes, causing cumulative layout shift (CLS).

### 2.3 Public uploads not optimized (low)

6 WebP images in `public/uploads/` uploaded by users via `/api/upload`. No server-side resize or compression.

---

## 3. Data Fetching Patterns

### 3.1 No request caching/deduplication (medium)

Every page uses raw `fetch()` inside `useEffect`. There is no SWR, TanStack Query, or React `cache()` for deduplication. If two components mount simultaneously and fetch the same endpoint, they make two network requests.

**Fix**: Wrap data fetches with Next.js built-in `cache()` from `next/cache`, or adopt a minimal `use()`-based pattern. For the highest-churn endpoint (`/api/stats` on owner dashboard, polled via WebSocket), a stale-while-revalidate cache would help.

### 3.2 Sequential fetches can be parallelized (low)

`src/app/owner/page.tsx:140-145`:
```
meRes → get restaurantId → then Promise.all(restRes, statsRes, loyaltyRes)
```
The `/api/auth/me` call blocks everything. If `restaurantId` is available from layout context or a cookie, skip this fetch entirely.

### 3.3 Re-fetch on mount always (low)

Every page re-fetches from scratch on every mount. No client cache persists across navigations. The admin restaurants page calls `fetchData()` on mount even if the data was just loaded by the admin dashboard.

**Fix**: For frequently-accessed admin pages, consider React context + stale-while-revalidate, or localStorage cache with TTL.

### 3.4 Polling (acceptable)

Two polling instances:
- `src/components/menu/GalleryCarousel.tsx:39` — 5s auto-advance (fine)
- `src/app/api/orders/stream/route.ts:22` — database poll for real-time orders (adequate for current scale; consider moving to SSE or WebSocket at higher traffic)

### 3.5 Good Promise.all usage (positive)

`admin/page.tsx:29-31` and `admin/restaurants/page.tsx:67-69` correctly use `Promise.all` for parallel fetches.

---

## 4. Re-render Optimization

### 4.1 Owner dashboard creates new functions in render (medium)

`src/app/owner/loyalty/page.tsx:280` — `<ArrowRight>` in render. Minor but avoidable.

`src/app/owner/page.tsx:237-250` — StatCard callbacks create inline arrow functions (`onClick={() => router.push(...)}`), but this is wrapped in `useCallback` at the parent level already, so it's acceptable.

### 4.2 All state lives at page level (medium)

In `admin/restaurants/page.tsx` and `admin/users/page.tsx`, the dialog open/close, form state, and delete target state all live at page top-level. If a dialog is open, the entire page re-renders on every keystroke in the form because `form` state triggers a full component update.

**Fix**: Extract dialogs into separate component files (e.g., `RestaurantDialog.tsx`, `DeleteConfirmDialog.tsx`) so their state changes don't re-render the restaurant list.

---

## Summary Table

| Finding | Severity | Files | Effort | Impact |
|---------|----------|-------|--------|--------|
| No `next/image` anywhere | High | 10 files | 2-3h | CLS fix, bandwidth -50% |
| Missing width/height on imgs | High | 10 files | 1h | CLS elimination |
| `"use client"` on presentational content | Medium | 3 pages | 2h | -150KB JS parse |
| Missing `memo()` on subcomponents | Low | 6+ components | 30m | Fewer re-renders |
| No fetch deduplication/caching | Medium | All pages | 1h | -50% API calls |
| Dialog state causes full re-render | Medium | 2 files | 1h | Smoother UX |
| Sequential auth fetch blocks dashboard | Low | 1 file | 30m | Faster owner load |
| Dynamic import of 48-line BarChart | Low | 1 file | 5m | Remove pointless lazy |

**Quick wins** (30 min total):
1. Remove `dynamic()` from BarChart import (`admin/page.tsx:11`)
2. Add `width`/`height` to `<img>` tags in menu components
3. Wrap `StatCard`, `OrderRow` in `React.memo()`

**High-impact sprint** (half-day):
1. Replace `<img>` with `next/image` in menu pages
2. Extract dialog components from admin CRUD pages
3. Move presentational subcomponents out of `"use client"`
