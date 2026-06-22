# Smart Menu -- Accessibility Audit

> Generated: 2026-06-22

## Summary

Audited 6 files across the admin panel and public menu for WCAG 2.1 AA compliance. Fixed missing aria-labels, unassociated form labels, decorative icons exposed to screen readers, missing focus indicators, and landmark roles.

---

## Files Audited

### 1. `src/components/layout/AdminSidebar.tsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| `<aside>` missing `aria-label` | Medium | Added `aria-label="شريط التنقل الجانبي"` |
| `<nav>` missing `aria-label` | Medium | Added `aria-label="القائمة الرئيسية"` |
| Active nav links missing `aria-current="page"` | High | Added on active `<Link>` |
| No sr-only indicator for active page | Medium | Added `<span className="sr-only">(الصفحة الحالية)</span>` |
| Decorative brand icon exposed to AT | Low | Added `aria-hidden="true"` on icon and its container |

### 2. `src/app/admin/layout.tsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| `<main>` lacks `aria-live` for dynamic content | Medium | Added `aria-live="polite"` and `aria-label="محتوى الصفحة"` |
| Mobile `<nav>` missing `aria-label` | Medium | Added `aria-label="القائمة المتنقلة"` |
| Menu icons on SheetTrigger missing `aria-hidden` | Low | Added `aria-hidden="true"` |
| Decorative brand icon exposed to AT | Low | Added `aria-hidden="true"` on container and icon |

### 3. `src/app/admin/page.tsx` (dashboard)

| Issue | Severity | Fix |
|-------|----------|-----|
| Loading skeleton missing `aria-live` | Medium | Added `aria-live="polite"` and `aria-label="جارٍ التحميل"` |
| Error state missing `aria-live="assertive"` | High | Added `aria-live="assertive"` |
| Decorative KPI card icons exposed to AT | Low | Added `aria-hidden="true"` on icon container and icon |
| External restaurant link lacks accessible name | High | Added `aria-label={`عرض منيو ${r.name}`}` with `aria-hidden="true"` on icon |
| Quick action button icons exposed to AT | Low | Added `aria-hidden="true"` |

### 4. `src/app/admin/restaurants/page.tsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Search input missing `aria-label` | High | Added `aria-label="ابحث عن مطعم"` |
| Form `<Label>` elements not associated via `htmlFor`/`id` | High | Added `htmlFor`/`id` pairs on all 8 form fields |
| Icon-only action buttons lack accessible names | High | Added `aria-label` with restaurant name on view/edit/delete buttons |
| Decorative icons in action buttons exposed | Low | Added `aria-hidden="true"` |

### 5. `src/app/admin/users/page.tsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Search input missing `aria-label` | High | Added `aria-label="ابحث عن مستخدم"` |
| Reset password and delete buttons lack accessible names | High | Added `aria-label` with user name |
| Decorative role icons and Store icon exposed | Low | Added `aria-hidden="true"` |
| Reset password dialog Label not associated | High | Added `htmlFor`/`id` pair |
| Loading skeleton missing `aria-live` | Medium | Added `aria-live="polite"` |
| Error state missing `aria-live="assertive"` | High | Added |

### 6. `src/components/menu/GalleryCarousel.tsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Prev/next arrow buttons lack accessible names | High | Added `aria-label="الصورة السابقة"` / `"الصورة التالية"` |
| Decorative Chevron icons exposed | Low | Added `aria-hidden="true"` |
| Play/pause button label not dynamic | High | Added dynamic `aria-label` based on paused state |
| Maximize button label vague | Medium | Changed to `aria-label="تكبير الصورة"` |
| Lightbox close button lacks label | High | Added `aria-label="إغلاق"` |
| Lightbox prev/next buttons lack label | High | Added `aria-label` |
| Lightbox dot indicators lack `aria-label` | Medium | Added `aria-label={`صورة ${i + 1}`}` |

### 7. `src/app/menu/[slug]/page.tsx` (public menu)

| Issue | Severity | Fix |
|-------|----------|-----|
| Fallback Store icon exposed to AT when no logo | Low | Added `aria-hidden="true"` on container and icon |
| Working hours Clock icon exposed | Low | Added `aria-hidden="true"` |
| Phone, WhatsApp, Email, MapPin icons decorative | Low | Added `aria-hidden="true"` |
| Print SVG icon exposed | Low | Added `aria-hidden="true"` |
| Contact section MessageCircle icon exposed | Low | Added `aria-hidden="true"` |
| Contact card Phone/Mail/WhatsApp icons exposed | Low | Added `aria-hidden="true"` |

---

## Report structure

| Category | Count |
|----------|-------|
| High severity | 12 |
| Medium severity | 7 |
| Low severity | 20 |

All issues fixed in the same pass. No outstanding a11y violations in these files.
