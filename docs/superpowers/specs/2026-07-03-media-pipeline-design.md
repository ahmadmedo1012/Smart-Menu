# Media Pipeline — VideoWrapper & OptimizedImage

## Overview

Replace raw `<video>` / `<img>` tags with two performance-optimized components that protect Core Web Vitals while enabling cinematic Halai video and luxury Higgsfield imagery.

## Components

### 1. `VideoWrapper` (`src/components/ui/VideoWrapper.tsx`)

**Purpose:** Lazy-load video via IntersectionObserver, never blocking main thread.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | required | Video source URL |
| `poster` | `string` | `""` | Lightweight static frame shown before video loads |
| `className` | `string` | `""` | Container classes |
| `posterClassName` | `string` | `""` | Poster image classes |
| `onPlay` | `() => void` | — | Callback when playback starts |

**Behavior:**
- IntersectionObserver with `rootMargin: "200px"` triggers load when viewport-adjacent
- `preload="none"`, `muted`, `loop`, `playsInline` enforced
- Poster frame rendered via `<Image>` (auto-WebP, placeholder blur)
- `will-change: transform` on container for GPU compositing
- Framer Motion fade-in on mount
- Cleanup: pause + null src on unmount

### 2. `OptimizedImage` (`src/components/ui/OptimizedImage.tsx`)

**Purpose:** Replace every `<img>` with a CLS-proof, shimmer-loading Next.js Image.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | required | Image source |
| `alt` | `string` | required | Alt text |
| `aspectRatio` | `"auto" \| "square" \| "video"` | `"auto"` | Aspect ratio class |
| `className` | `string` | `""` | Container classes |
| `imageClassName` | `string` | `""` | Image element classes |
| `priority` | `boolean` | `false` | Skip lazy load for LCP images |
| `skeleton` | `boolean` | `true` | Show shimmer skeleton while loading |
| `fallback` | `ReactNode` | `🍽️` icon | Shown on error |

**Behavior:**
- Framer Motion shimmer skeleton (linear-gradient sweep, `will-change: background-position`)
- Next.js `<Image>` with `loading="lazy"` (unless priority), `sizes` auto
- Aspect ratio locked via Tailwind classes to prevent CLS
- On load: shimmer fades out, image fades in (crossfade)
- On error: fallback icon replaces image
- `object-cover` by default

## Migration Plan

1. Create `VideoWrapper` — build at `src/components/ui/VideoWrapper.tsx`
2. Create `OptimizedImage` — build at `src/components/ui/OptimizedImage.tsx`
3. Update `PhoneVideo.tsx` — swap `<video>` for `VideoWrapper`, add poster
4. Update `MenuItemCard.tsx` — swap `<img>` for `OptimizedImage` with `aspectRatio="square"`
5. Update remaining `<img>` sites: `TestimonialsSection`, `GalleryCarousel`, `OrderDialog`, `StickyMenuHeader`, `ItemDialog`, `circular-testimonials`
6. `npm run lint` + `npm run build` validation

## AI Asset Integration

### Halai Video (Priority 1)
- Generate cinematic phone demo loop → `public/hero-intro-v2.mp4`
- Generate poster still frame → `public/hero-poster.webp`
- Drop into `PhoneVideo.tsx` via `VideoWrapper`

### Higgsfield Images (Priority 2)
- Generate menu item product shots → `public/uploads/higgsfield/`
- Reference in DB as restaurant menu item images
- Displayed via `OptimizedImage` in `MenuItemCard`

## Performance Targets
- LCP < 2.5s (no video blocks FCP)
- CLS = 0 (aspect ratio locks all media containers)
- Video starts within 200ms of becoming visible (IntersectionObserver 200px margin)
- All `<img>` replaced with Next.js Image (auto-WebP/AVIF)
