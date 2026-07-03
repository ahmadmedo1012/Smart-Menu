# Media Pipeline Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Build VideoWrapper (IntersectionObserver lazy video) + OptimizedImage (Framer Motion shimmer + Next.js Image), migrate all `<img>` and `<video>` tags across the codebase.

**Architecture:** Two reusable UI primitives at `src/components/ui/`. VideoWrapper wraps raw `<video>` with IntersectionObserver lazy-load, poster fallback, and GPU-accelerated CSS. OptimizedImage wraps Next.js `<Image>` with aspect-ratio locking, skeleton shimmer via Framer Motion, and auto-fallback. Then migrate consumers one by one.

**Tech Stack:** Next.js 16.2.9, React 19, Tailwind CSS 4, Framer Motion 12, Next.js Image

## Global Constraints
- All new components are `"use client"`
- Arabic/RTL context: use logical properties (start/end) not left/right
- Tailwind 4 class order: layout, sizing, spacing, visuals, interactions
- Framer Motion `spring` defaults: stiffness 80-500, damping 15-30
- All `<img>` tags must become `<OptimizedImage>`
- All `<video>` tags must become `<VideoWrapper>` where feasible

---

### Task 1: VideoWrapper Component

**Files:**
- Create: `src/components/ui/VideoWrapper.tsx`

**Interfaces:**
- Produces: `VideoWrapper` component export

- [ ] **Step 1: Create VideoWrapper component**

`src/components/ui/VideoWrapper.tsx`:
```tsx
"use client";

import { useRef, useEffect, useState, memo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

type VideoWrapperProps = {
  src: string;
  poster?: string;
  className?: string;
  posterClassName?: string;
  onPlay?: () => void;
};

const VideoWrapper = memo(function VideoWrapper({
  src,
  poster = "",
  className = "",
  posterClassName = "",
  onPlay,
}: VideoWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  // IntersectionObserver: load when 200px from viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Track play state
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !shouldLoad) return;
    const onPlay = () => { setHasPlayed(true); };
    el.addEventListener("play", onPlay);
    return () => el.removeEventListener("play", onPlay);
  }, [shouldLoad]);

  // Fire onPlay callback when first play happens
  useEffect(() => {
    if (hasPlayed && onPlay) onPlay();
  }, [hasPlayed, onPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const el = videoRef.current;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ willChange: "transform" }}
    >
      {!shouldLoad && poster ? (
        <Image
          src={poster}
          alt=""
          fill
          className={cn("object-cover", posterClassName)}
          sizes="100vw"
          priority
        />
      ) : !shouldLoad ? (
        <div className="absolute inset-0 bg-card skeleton" />
      ) : null}

      {shouldLoad && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="size-full"
        >
          <video
            ref={videoRef}
            src={src}
            muted
            loop
            playsInline
            preload="none"
            autoPlay
            className="size-full object-cover"
          />
        </motion.div>
      )}
    </div>
  );
});

export { VideoWrapper, type VideoWrapperProps };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/VideoWrapper.tsx
git commit -m "feat: add VideoWrapper with IntersectionObserver lazy loading

- IntersectionObserver triggers load at 200px viewport margin
- Poster frame via Next.js Image (auto-WebP) before load
- preload=none, muted, loop, playsInline enforced
- will-change:transform for GPU compositing
- Cleanup on unmount: pause + null src

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: OptimizedImage Component

**Files:**
- Create: `src/components/ui/OptimizedImage.tsx`

**Interfaces:**
- Produces: `OptimizedImage` component export

- [ ] **Step 1: Create OptimizedImage component**

`src/components/ui/OptimizedImage.tsx`:
```tsx
"use client";

import { useState, memo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AspectRatio = "auto" | "square" | "video";

type OptimizedImageProps = {
  src: string;
  alt: string;
  aspectRatio?: AspectRatio;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  skeleton?: boolean;
  fallback?: ReactNode;
};

const aspectMap: Record<AspectRatio, string> = {
  auto: "aspect-auto",
  square: "aspect-square",
  video: "aspect-video",
};

const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  aspectRatio = "auto",
  className = "",
  imageClassName = "",
  priority = false,
  skeleton = true,
  fallback,
}: OptimizedImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[4px]",
        aspectMap[aspectRatio],
        className,
      )}
    >
      {/* Shimmer skeleton */}
      <AnimatePresence>
        {skeleton && status === "loading" && (
          <motion.div
            key="shimmer"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 shimmer"
            style={{
              background: "linear-gradient(90deg, transparent 0%, oklch(0.2 0 0 / 0.15) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              willChange: "background-position",
            }}
          />
        )}
      </AnimatePresence>

      {/* Image */}
      {status !== "error" ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn(
            "object-cover transition-opacity duration-500",
            status === "loaded" ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading={priority ? undefined : "lazy"}
          priority={priority}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-muted/40 to-transparent">
          {fallback || <span className="text-2xl text-orange/40">🍽️</span>}
        </div>
      )}
    </div>
  );
});

export { OptimizedImage, type OptimizedImageProps, type AspectRatio };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/OptimizedImage.tsx
git commit -m "feat: add OptimizedImage with shimmer skeleton + Next.js Image

- Framer Motion shimmer gradient skeleton on load
- aspectRatio prop locks layout (auto/square/video)
- Next.js Image with auto-sizes, lazy loading, WebP
- Smooth crossfade from shimmer → image
- Fallback icon on error

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Migrate PhoneVideo to VideoWrapper

**Files:**
- Modify: `src/components/landing/PhoneVideo.tsx`

**Interfaces:**
- Consumes: `VideoWrapper` from `@/components/ui/VideoWrapper`

- [ ] **Step 1: Rewrite PhoneVideo.tsx**

Replace entire file content:

```tsx
"use client"

import { motion } from "framer-motion"
import { VideoWrapper } from "@/components/ui/VideoWrapper"

const BG = "#070708"

export function PhoneVideo() {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 15 }}
      className="size-full relative overflow-hidden"
      style={{ borderRadius: "2.3rem", background: BG, minWidth: 0 }}
    >
      <VideoWrapper
        src="/hero-intro.mp4"
        poster="/hero-poster.webp"
        className="size-full"
        posterClassName="object-cover"
      />
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/PhoneVideo.tsx
git commit -m "refactor: migrate PhoneVideo to VideoWrapper component

- Replace raw <video> with VideoWrapper (IntersectionObserver lazy)
- Poster frame for instant static display before video loads
- Cleaner, smaller component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Migrate MenuItemCard img to OptimizedImage

**Files:**
- Modify: `src/components/menu/MenuItemCard.tsx`

**Interfaces:**
- Consumes: `OptimizedImage` from `@/components/ui/OptimizedImage`

- [ ] **Step 1: Replace `<img>` in MenuItemCard**

Import `OptimizedImage` at the top. Replace the `<img>` block (lines 60-73) with `OptimizedImage`.

Change the import section to add `OptimizedImage`:
```tsx
import { OptimizedImage } from "@/components/ui/OptimizedImage";
```

Replace the image container div block (lines 59-78):
```tsx
      {/* Image container */}
      <div className="relative shrink-0 size-24 md:size-28 rounded-[4px] overflow-hidden shadow-sm ring-1 ring-foreground/5 group-hover:ring-orange/30 group-hover:shadow-lg group-hover:shadow-orange-muted transition-all duration-300">
        {item.image && !imageError ? (
          <OptimizedImage
            src={item.image}
            alt={displayName}
            aspectRatio="square"
            skeleton
            fallback={<span className="text-2xl text-orange/40">🍽️</span>}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-muted/40 to-transparent">
            <span className="text-2xl text-orange/40">🍽️</span>
          </div>
        )}
        ...
```

Remove the `imageLoaded` state and `setImageLoaded` — `OptimizedImage` handles its own loading state.

- [ ] **Step 2: Commit**

```bash
git add src/components/menu/MenuItemCard.tsx
git commit -m "refactor: migrate MenuItemCard img to OptimizedImage

- Replace raw <img> with OptimizedImage (shimmer, aspect lock, lazy)
- Remove manual imageLoaded state (handled by component)
- Preserve fallback icon on error

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Migrate Remaining `<img>` Tags

**Files:**
- Modify: `src/components/landing/sections/TestimonialsSection.tsx` (line 151)
- Modify: `src/components/landing/sections/FinalCTASection.tsx` (line 14)
- Modify: `src/components/menu/GalleryCarousel.tsx` (lines 97, 159)
- Modify: `src/components/menu/OrderDialog.tsx` (lines 123, 155)
- Modify: `src/components/menu/StickyMenuHeader.tsx` (line 45)
- Modify: `src/components/owner/ItemDialog.tsx` (line 86)
- Modify: `src/components/ui/circular-testimonials.tsx` (lines 70, 228)

**Pattern:** Each `<img>` that is purely presentational (no Next.js fill needed) gets converted to `<OptimizedImage>`. Background images that are CSS-only remain unchanged.

- [ ] **Step 1: Migrate TestimonialsSection.tsx avatar img**

Line 151: `<img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />`

Replace with:
```tsx
<OptimizedImage
  src={t.avatar}
  alt={t.name}
  className="size-full"
  skeleton={false}
/>
```

Add import to top of file.

- [ ] **Step 2: Migrate FinalCTASection.tsx background img**

Line 14-19: Replace `<img>` block with:
```tsx
<OptimizedImage
  src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1600&q=80"
  alt=""
  className="absolute inset-0"
  imageClassName="object-cover opacity-[0.03]"
  skeleton={false}
/>
```

Add import to top of file.

- [ ] **Step 3: Migrate GalleryCarousel.tsx img tags**

Line 97-102: Replace `<img>` with OptimizedImage:
```tsx
<OptimizedImage
  src={img}
  alt={`${restaurantName || "صورة"} ${i + 1}`}
  className="size-full"
  skeleton={false}
  priority={i === 0}
/>
```

Line 159-161: Lightbox img — keep as `<img>` since Next.js Image in a fixed overlay with `max-w-full max-h-[85vh]` doesn't benefit from fill layout. Mark with a `/* ponytail: lightbox img, Next.js fill doesn't suit overlay layout */` comment.

- [ ] **Step 4: Migrate OrderDialog.tsx img tags**

Line 123: Replace `<img>` with:
```tsx
<OptimizedImage
  src={item.image}
  alt={displayName}
  className="size-full"
  aspectRatio="video"
  skeleton
/>
```

Line 155: Replace `<img>` with:
```tsx
<OptimizedImage
  src={restaurantLogo}
  alt=""
  className="size-full"
  skeleton={false}
/>
```

- [ ] **Step 5: Migrate StickyMenuHeader.tsx img tag**

Line 45: Replace `<img>` with:
```tsx
<OptimizedImage
  src={logo}
  alt=""
  className="size-full"
  skeleton={false}
/>
```

- [ ] **Step 6: Migrate ItemDialog.tsx img tag**

Line 86: Replace `<img>` with:
```tsx
<OptimizedImage
  src={form.image}
  alt=""
  className="size-full"
  skeleton={false}
/>
```

- [ ] **Step 7: Migrate circular-testimonials.tsx img tags**

Lines 70 and 228: Replace each with `<OptimizedImage>`:
```tsx
<OptimizedImage
  src={/* .avatar or .image */}
  alt={/* .name */ ""}
  className="size-full"
  skeleton={false}
/>
```

- [ ] **Step 8: Commit all remaining migrations**

```bash
git add src/components/landing/sections/TestimonialsSection.tsx \
        src/components/landing/sections/FinalCTASection.tsx \
        src/components/menu/GalleryCarousel.tsx \
        src/components/menu/OrderDialog.tsx \
        src/components/menu/StickyMenuHeader.tsx \
        src/components/owner/ItemDialog.tsx \
        src/components/ui/circular-testimonials.tsx
git commit -m "refactor: migrate remaining <img> tags to OptimizedImage

- TestimonialsSection, FinalCTASection, GalleryCarousel thumbnails
- OrderDialog, StickyMenuHeader, ItemDialog, circular-testimonials
- Lightbox in GalleryCarousel kept as native img (Next.js fill incompatible)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Build Validation

**Files:**
- Check: all modified files

- [ ] **Step 1: Run linter**

```bash
npm run lint
```
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: compiled successfully, 0 errors, 0 warnings.

- [ ] **Step 3: Commit any lint fixes if needed**

If lint found issues, fix and:
```bash
git add -A
git commit -m "chore: lint fixes after media pipeline migration"
```
