# Smart Menu Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Smart Menu landing page to black/white/gold cinematic design per refrence2.png. Purge all blue, minimize visual variety, make phone standalone featured section, deploy to Vercel.

**Architecture:** Flat component hierarchy via HomePage.tsx. CSS tokens in globals.css. All landing components in `src/components/landing/`. Single-page app with SSR.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 (`@import "tailwindcss"`), framer-motion, OKLCH color space, Remotion video, Lucide icons.

---

### Task 1: Purge All Blue Tokens + Update globals.css

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/badge.tsx` — fix blue → gold
- Modify: `src/app/admin/audit-logs/page.tsx` — fix blue → gold
- Modify: `src/app/admin/orders/[id]/page.tsx` — fix blue → gold
- Modify: `src/app/owner/loyalty/page.tsx` — fix blue → gold/neutral

- [ ] **Step 1: Purge blue from globals.css and DESIGN.md**

In `globals.css`:
- Delete lines defining `--color-blue-*`, `--gradient-blue`, `--gradient-brand`, `text-gradient-animated` if any
- Ensure all `--accent` uses gold hue (85), not blue
- Replace `--ring: oklch(0.62 0.16 253)` → `--ring: var(--gold)` if any remain
- Remove `hero-mesh` class, `.blob` classes (lines 515-533) — blue-toned legacy
- Keep gold tokens — they're correct

In `DESIGN.md`: Replace all blue palette references with gold. Remove section 2.2 (Blue Palette) entirely.

- [ ] **Step 2: Fix badge.tsx — replace blue with gold**

In `src/components/ui/badge.tsx`, fix lines 22-24:
```tsx
// OLD (lines 22-24):
amber: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
emerald: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",

// NEW:
amber: "bg-gold/15 text-gold dark:text-gold border-gold/20",
emerald: "bg-gold/15 text-gold dark:text-gold border-gold/20",
blue: "bg-gold/15 text-gold dark:text-gold border-gold/20",
```

- [ ] **Step 3: Fix admin audit-logs page.tsx**

In `src/app/admin/audit-logs/page.tsx`, line 46:
```tsx
// OLD: login: { label: "دخول", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
// NEW: login: { label: "دخول", color: "text-gold", bg: "bg-gold/10" },
```

- [ ] **Step 4: Fix admin orders/[id]/page.tsx**

In `src/app/admin/orders/[id]/page.tsx`, replace `bg-blue-100 dark:bg-blue-900/30` → `bg-gold/10` (3 occurrences, lines 29, 30, 263).

- [ ] **Step 5: Fix owner loyalty/page.tsx**

In `src/app/owner/loyalty/page.tsx`, replace `bg-blue-500`, `bg-blue-500/10`, `bg-blue-500/15`, `text-blue-500`, `border-blue-300/30`, `bg-blue-100`, `dark:bg-blue-900/40` → `bg-gold`, `bg-gold/10`, `bg-gold/15`, `text-gold`, `border-gold/30`, `bg-gold/10`, `dark:bg-gold/20` (8+ occurrences)

- [ ] **Step 6: Verify zero blue remains in codebase**

Run: `grep -rn 'blue\|#3b82\|#2563\|#1d4e\|from-blue\|to-blue\|gradient-blue\|border-blue\|bg-blue\|text-blue\|ring-blue' src/ --include="*.tsx" --include="*.ts" --include="*.css"`
Expected: No matches (admin pages might still have legitimate blue in unrelated features — exclude those)

---

### Task 2: Rebuild HomePage — Simplify Section Flow

**Files:**
- Modify: `src/components/landing/HomePage.tsx`
- Delete: `src/components/landing/ScrollStorytelling.tsx`
- Delete: `src/components/landing/PartnersSection.tsx`
- Delete: `src/components/landing/TestimonialsSection.tsx`
- Delete: `src/components/landing/PricingSection.tsx`

- [ ] **Step 1: Remove ScrollStorytelling, Partners, Testimonials, Pricing from content**

Delete these 4 files entirely (root cause: too many visual varieties → remove). They still exist in project history via git if needed later.

- [ ] **Step 2: Rewrite HomePage.tsx**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { fetchPublicStats, type PublicStats } from "./landing-data";
import HeroSection from "./HeroSection";
import PhoneShowcaseSection from "./PhoneShowcaseSection";
import StatsSection from "./StatsSection";
import HowItWorksSection from "./HowItWorksSection";
import DisplayCards from "./DisplayCards";
import CTASection from "./CTASection";

export default function HomePage() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetchPublicStats().then(setStats);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <HeroSection stats={stats} />
      <PhoneShowcaseSection />
      {stats && <StatsSection stats={stats} />}
      <HowItWorksSection />
      <DisplayCards />
      <CTASection />
      <Footer />
    </div>
  );
}
```

---

### Task 3: Rebuild Hero — Typographic, No Phone

**Files:**
- Modify: `src/components/landing/HeroSection.tsx`

- [ ] **Step 1: Rewrite HeroSection.tsx**

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARTNERS, type PublicStats } from "./landing-data";

const CINEMATIC_EASE = [0.16, 1, 0.2, 1] as const;

export default function HeroSection({ stats }: { stats: PublicStats | null }) {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
      {/* Subtle gold ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold/[0.03] to-background pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[70vmin] rounded-full bg-gold/[0.04] blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Kicker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: CINEMATIC_EASE }}
          className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-gold border border-gold/20 rounded-full mb-8"
        >
          <span className="size-1.5 rounded-full bg-gold" />
          منيو رقمي • طلب فوري
        </motion.div>

        {/* Headline — gold on near-black */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.15, ease: CINEMATIC_EASE }}
          className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[0.92] tracking-[-0.03em] text-balance mb-6"
        >
          حوّل مطعمك
          <br />
          إلى <span className="text-gold">تجربة رقمية</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: CINEMATIC_EASE }}
          className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed"
        >
          منيو رقمي احترافي مع طلب عبر واتساب. يعمل على كل الأجهزة بدون تطبيق.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.45, ease: CINEMATIC_EASE }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <Link href="/subscribe">
            <Button className="bg-gold text-gold-foreground hover:opacity-90 px-10 h-14 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 text-base" size="lg">
              ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
            </Button>
          </Link>
          <Link href={`/menu/${PARTNERS[0].slug}`}>
            <Button variant="outline" size="lg" className="px-10 h-14 border-2 hover:border-gold/40 hover:text-foreground text-base">
              عرض منيو تجريبي
            </Button>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 start-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1.2 }}
        >
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase">اسحب لأسفل</span>
          <div className="size-4 rounded-full border border-muted-foreground/20 flex items-center justify-center">
            <div className="size-1.5 rounded-full bg-gold/50" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify hero builds without errors**

Run: `npx tsc --noEmit src/components/landing/HeroSection.tsx`
Expected: No type errors

---

### Task 4: Create Phone Showcase — Standalone Full-Viewport Section

**Files:**
- Create: `src/components/landing/PhoneShowcaseSection.tsx`
- Modify: `src/components/landing/PhoneMockup.tsx` — adjust for standalone usage

- [ ] **Step 1: Create PhoneShowcaseSection.tsx**

```tsx
"use client";

import { motion } from "framer-motion";
import { PhoneMockup } from "./PhoneMockup";

export default function PhoneShowcaseSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
      {/* Gold ambient glow behind phone */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold/[0.03] to-background pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[60vmin] rounded-full bg-gold/[0.06] blur-[140px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Tag above phone */}
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.2, 1] }}
          className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold"
        >
          شاهد المنيو الذكي
        </motion.span>

        {/* Phone — giant, centered, golden */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.2, 1] }}
          className="w-[75vw] max-w-[400px]"
        >
          <PhoneMockup tilt className="w-full" />
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update PhoneMockup.tsx to accept `className` prop**

The file already has `className?: string` — verify it passes `className` to the outer container div. If not, add:
```tsx
// Line 31 — ensure className is used
<div className={cn("relative mx-auto max-w-[280px] w-[75vw] lg:w-[22vw]", className)}>
```

- [ ] **Step 3: Build check**

Run: `npx tsc --noEmit src/components/landing/PhoneShowcaseSection.tsx`
Expected: No type errors

---

### Task 5: Uniform Visual Rhythm — Consistent Section Templates

**Files:**
- Verify: `src/components/landing/StatsSection.tsx` — exists, check gold usage
- Verify: `src/components/landing/HowItWorksSection.tsx` — gold already, check
- Verify: `src/components/landing/DisplayCards.tsx` — gold accent cards
- Verify: `src/components/landing/CTASection.tsx` — dark bg + gold CTA

- [ ] **Step 1: Verify all sections use gold tokens, not blue**

Run: `grep -rn 'blue\|from-blue\|to-blue\|bg-blue\|text-blue\|ring-blue' src/components/landing/`
Expected: Zero results

- [ ] **Step 2: Verify uniform section rhythm**

Check each section has:
- Same vertical padding: `py-24 md:py-32`
- Same heading style: gold-accent, centered
- Same scroll-reveal pattern: framer-motion `fadeUp` or `whileInView`

Adjust any outlier.

---

### Task 6: Motion System — Cinematic Timing

**Files:**
- Modify: `src/app/globals.css` — animation keyframes section
- Verify: `src/components/landing/animations.ts`

- [ ] **Step 1: Verify animations use cinematic timing**

Check `globals.css` keyframes (last ~80 lines). Ensure all landing animations use:
- `--ease-smooth: cubic-bezier(0.16, 1, 0.2, 1)` — only ease
- Duration ≥800ms for entrance animations
- No `bounce`, no `elastic`

- [ ] **Step 2: Remove `hero-mesh` and `.blob` animation classes**

Delete from `globals.css`:
```
.hero-mesh { ... }
.hero-mesh .blob { ... }
```

- [ ] **Step 3: Verify reduced-motion kill switch**

Ensure `@media (prefers-reduced-motion: reduce)` block kills all transforms and animations except opacity.

---

### Task 7: QA + Playwright

**Files:**
- Run: existing playwright tests

- [ ] **Step 1: Run playwright smoke tests**

Run: `npx playwright test tests/playwright/smoke.spec.ts --project=chromium`
Expected: All pass

- [ ] **Step 2: Run hero-polish test**

Run: `npx playwright test tests/playwright/hero-polish.spec.ts --project=chromium`
Expected: All pass

- [ ] **Step 3: Visual check — build and screenshot**

Run: `npm run build`
Expected: Build succeeds with no errors

---

### Task 8: Deploy to Vercel

- [ ] **Step 1: Deploy preview**

Run: `npx vercel --prod`
Expected: Build succeeds, URL returned

- [ ] **Step 2: Verify live site**

Visit the Vercel URL. Confirm:
- No blue on landing page
- Hero is pure typographic (no phone)
- Phone showcase is standalone section
- All gold accents render correctly
- Mobile responsive, no overlap

---

## Success Criteria Checklist

- [ ] Zero blue tokens in globals.css — gold only
- [ ] Zero `blue-*` Tailwind classes in admin/badge files
- [ ] Hero: typographic, centered, gold heading, dark bg — no phone
- [ ] Phone: standalone full-viewport section, gold bezel, tilt, Remotion video
- [ ] HomePage flow: Header → Hero → Phone → Stats → HowItWorks → DisplayCards → CTA → Footer (7 sections, not 10)
- [ ] All sections have same vertical rhythm (`py-24 md:py-32`)
- [ ] All headings gold-accent and centered
- [ ] Motion: slow (≥800ms), `ease-smooth` only
- [ ] Playwright tests pass
- [ ] Build succeeds, Vercel deploy succeeds
