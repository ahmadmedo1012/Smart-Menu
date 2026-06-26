export const meta = {
  name: 'visual-layer-rebuild',
  description: 'Rebuild Smart Menu visual layer — hero, phone, modals, scroll, motion, Remotion video',
  phases: [
    { title: 'Foundation', detail: 'CSS tokens, design system, globals' },
    { title: 'Hero & Phone', detail: 'Cinematic hero + phone mockup rebuild' },
    { title: 'Sections', detail: 'All landing section rebuilds' },
    { title: 'Modals', detail: 'Dialog/overlay system fix' },
    { title: 'Remotion', detail: 'Hero video rebuild' },
    { title: 'QA', detail: 'Build check, verify no errors' },
  ],
};

// ============================================================
// PHASE 0: Read reference files agents will need
// ============================================================
phase('Foundation');

// Determine what to keep and what to rebuild
const existingCSS = await agent('Read /home/ahmed/UTILITIES/smart-menu/src/app/globals.css and identify all CSS custom properties, animation keyframes, utility classes, and motion tokens. Output as structured list.', {
  phase: 'Foundation',
  label: 'read-existing-css',
});

const existingHero = await agent('Read /home/ahmed/UTILITIES/smart-menu/src/components/landing/HeroSection.tsx and /home/ahmed/UTILITIES/smart-menu/src/components/landing/PhoneMockup.tsx. Output summary of current structure, props, data flow, and any visual bugs visible in the code.', {
  phase: 'Foundation',
  label: 'read-existing-hero',
});

const existingDialog = await agent('Read /home/ahmed/UTILITIES/smart-menu/src/components/ui/dialog.tsx and /home/ahmed/UTILITIES/smart-menu/src/components/shared/PaymentDialog.tsx. Output the full component code identifying z-index, positioning, overflow issues.', {
  phase: 'Foundation',
  label: 'read-existing-dialogs',
});

const existingRemotion = await agent('Read all files in /home/ahmed/UTILITIES/smart-menu/remotion/src/ including scenes directory. Output full architecture and each scene content.', {
  phase: 'Foundation',
  label: 'read-existing-remotion',
});

const existingSections = await agent('Read /home/ahmed/UTILITIES/smart-menu/src/components/landing/ScrollStorytelling.tsx, DisplayCards.tsx, PricingSection.tsx, TestimonialsSection.tsx, StatsSection.tsx, CTASection.tsx, HowItWorksSection.tsx, PartnersSection.tsx, Header.tsx, Footer.tsx. Output summary of each. Identify any overlapping issues, broken motion, or poor hierarchy.', {
  phase: 'Foundation',
  label: 'read-existing-sections',
});

// ============================================================
// PHASE 1: CSS Foundation Rebuild
// ============================================================
phase('Foundation');

// Rebuild globals.css with enhanced black/gold design system
await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/src/app/globals.css entirely.

RULES:
- Keep existing black/gold color tokens (--gold, --foreground, --background, etc.)
- KEEP these existing keyframes: phone-float, shimmer, pulse-glow, scale-in, fade-in, reveal, slide-up, float-gentle, breath, fade-in-down, fade-in-left, fade-in-right
- KEEP glass utilities, card-premium, hero-mesh, stagger-children, magnetic classes
- KEEP scrollbar styling, selection, focus-visible
- KEEP reduced motion media query
- KEEP existing @utility, @theme, --font-* declarations

ADD these improvements:
1. Add motion tokens: --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1); --ease-smooth-out: cubic-bezier(0.16, 1, 0.3, 1); --duration-slow: 1200ms; --duration-premium: 1500ms
2. Add --radius-full: 9999px; --radius-squircle: 2rem; to radius scale
3. Add .text-balance { text-wrap: balance; } utility
4. Add @keyframes ken-burns { from { transform: scale(1); } to { transform: scale(1.05); } }
5. Add .animate-ken-burns class
6. Add .noise-overlay { position: fixed; inset: 0; opacity: 0.02; pointer-events: none; z-index: 50; ... }
7. Add .double-bezel { ... } and .double-bezel-inner { ... } classes per "Double-Bezel" architecture pattern
8. Ensure all z-index tokens are respected: --z-dropdown: 10; --z-sticky: 20; --z-nav: 30; --z-modal-backdrop: 40; --z-modal: 50; --z-toast: 60; --z-tooltip: 70

IMPORTANT: Output the COMPLETE globals.css file content. Do NOT truncate or summarize.`, {
  phase: 'Foundation',
  label: 'rebuild-globals-css',
});

// ============================================================
// PHASE 2: Hero + Phone System
// ============================================================
phase('Hero & Phone');

await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/src/components/landing/HeroSection.tsx completely.

CONTEXT: This is the hero of a SaaS product called Smart Menu — a digital restaurant menu platform. Arabic-first (RTL). Luxury black/gold brand.

REQUIREMENTS:
1. Full-screen cinematic hero with min-h-[90dvh] (not 100vh — avoid safari issues)
2. Layout: 2-column grid (lg:grid-cols-2), text on right (RTL), phone mockup on left
3. Text column:
   - Kicker/badge: gold pill with dot "منيو رقمي • طلب فوري"
   - H1 headline: "حوّل مطعمك إلى تجربة رقمية" with gold highlight span underline
   - Sub-text: feature description
   - Two CTAs: gold primary "ابدأ مجاناً" with ArrowLeft icon + outline "عرض منيو تجريبي"
   - Social proof line: Star icon + "يثق بنا أكثر من X مطعماً ومقهى"
4. Phone column: <PhoneMockup tilt /> component
5. Add ambient gold glow blobs (animated opacity, slow breath)
6. Add subtle dot grid pattern on background
7. Scroll indicator at bottom: "اسحب لأسفل" text + gold bouncing dot
8. Motion: use framer-motion with containerVariants/childVariants at stagger 0.2s, 1.2s duration, ease [0.16,1,0.3,1]
9. Import: { motion } from "framer-motion", { ArrowLeft, Star } from "lucide-react", Button from @/components/ui/button, PhoneMockup from ./PhoneMockup, PARTNERS and type PublicStats from ./landing-data

Keep the EXACT same props, types, data flow. Only rebuild the visual markup and styling.`, {
  phase: 'Hero & Phone',
  label: 'rebuild-hero',
});

await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/src/components/landing/PhoneMockup.tsx completely.

REQUIREMENTS:
1. Props: { tilt?: boolean; className?: string } — keep same interface
2. Frame: max-w-[280px], w-[75vw] lg:w-[80vw]
3. Double-Bezel architecture: outer shell (rounded-[3rem], p-[3px], frame-gradient background, frame-shadow-premium) + inner screen (aspect-[9/19.5], rounded-[2.8rem])
4. Screen content:
   - Dynamic Island notch at top (120px wide, 28px tall, black, rounded-full, with camera dot)
   - Status bar: time on one side, signal/battery icons on other
   - Restaurant header: avatar placeholder (gold "م"), name "مطعم مذاق الشام", green "مفتوح الآن" pulse indicator
   - Featured dish card: rounded-2xl, bg-neutral-900, icon + label
   - Category pills: horizontal row of pills (gold active "مشاوي", others muted)
   - Menu items: 4 items with image placeholder, name, desc, price in gold
   - Bottom CTA: "ابدأ الطلب" gold button
5. Glass reflection overlay: linear-gradient inside screen
6. Video: /hero-intro.mp4 autoplay loop muted, fades in over static content with 1.2s transition
7. Video fallback: if video errors, show /hero-poster.jpg
8. Loading state: static content is always visible, video crossfades on top
9. Tilt wrapper: ~15deg left tilt (rotateY), perspective 1000px, 7s float animation on Y axis
10. Cast shadow: soft radial gradient under tilted phone
11. Ambient glow: radial gradient behind phone, animated opacity breath
12. ALL transitions use cubic-bezier(0.19, 1, 0.22, 1) or (0.16,1,0.3,1)

Use: { motion } from "framer-motion", { cn } from "@/lib/utils", { useRef, useCallback, useState, type ReactNode } from "react"

Keep exact same prop types and exports.`, {
  phase: 'Hero & Phone',
  label: 'rebuild-phone-mockup',
});

// ============================================================
// PHASE 3: Scroll Storytelling
// ============================================================
phase('Sections');

await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/src/components/landing/ScrollStorytelling.tsx completely.

REQUIREMENTS:
1. True scroll-driven narrative using framer-motion useScroll + useTransform
2. Sticky container — section text sticks to viewport during scroll
3. 4 steps (from STEPS data in component):
   - Menu: Smartphone icon — "منيو رقمي تفاعلي" + desc + detail
   - WhatsApp: MessageCircle icon — "طلب عبر واتساب" + desc + detail
   - Analytics: BarChart3 icon — "تحليلات ذكية" + desc + detail
   - Loyalty: Gift icon — "ولاء ومكافآت" + desc + detail
4. Layout: 2-column grid, phone visuals on one side, text steps on the other
5. Each step text fades/slides in based on scroll progress (useTransform on abs value diff)
6. Visual phone screen changes content per step (StepPanel pattern):
   - Step 0: Menu items skeleton
   - Step 1: WhatsApp order notifications
   - Step 2: Analytics dashboard mini
   - Step 3: Loyalty points + rewards
7. Phone frame: same premium style as PhoneMockup but inline (doesn't use PhoneMockup component)
8. Scroll spacer: height based on step count * 100vh
9. Motion values: phoneScale, phoneY, phoneOpacity interpolated across scroll progress
10. All transitions: cubic-bezier(0.16, 1, 0.3, 1), 1+ second duration
11. Section badge: "اكتشف القصة" pill at top
12. Arabic RTL layout

KEEP same imports (useRef, motion, useScroll, useTransform, framer-motion, lucide-react icons). Keep same component structure but enhance all styling, motion, and visual quality.`, {
  phase: 'Sections',
  label: 'rebuild-scroll-storytelling',
});

await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/src/components/landing/DisplayCards.tsx completely.

REQUIREMENTS:
1. DisplayCards shows BENEFITS from landing-data.ts (6 items with icon, title, desc)
2. Layout: Grid of cards — use asymmetrical bento pattern (not uniform grid)
   - e.g., first card spans 2 columns, others vary col-span
3. Each card: Double-bezel architecture (outer shell with border + inner content)
4. Icon in gold circle at top of each card
5. Title in bold, desc in muted-foreground
6. CTA: "اكتشف المزيد" button at bottom linking to /demo
7. Section label: "مميزات Smart Menu" pill
8. H2 heading: "كل ما تحتاجه لإدارة مطعمك رقمياً"
9. Motion: stagger children fade-up with whileInView
10. Full-width, generous padding (py-24 md:py-32)
11. Subtle background gradient
12. RTL layout
13. Use { motion } from "framer-motion", icons from "lucide-react", Button from @/components/ui/button`, {
  phase: 'Sections',
  label: 'rebuild-display-cards',
});

await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/src/components/landing/PricingSection.tsx completely.

REQUIREMENTS:
1. Two plans from PRICING_PLANS data (landing-data.ts):
   - "مجاني" — 0 د.ل, "دائماً", features: 4 items, not popular
   - "المدفوعة" — 29 د.ل, "شهرياً", features: 7 items, popular
2. Layout: horizontal card layout, not table — popular one visually prominent
3. Plan card: Double-bezel for premium feel, gold border for popular
4. "الأكثر شعبية" badge on popular plan (pill, gold bg, absolute positioned)
5. Features: Check icons in gold
6. CTA button per plan: primary gold for popular, outline for free
7. Section label: "خطط و أسعار" pill
8. H2: "اختر خطتك وابدأ فوراً"
9. Motion: fade-up stagger
10. Keep exact same data/type usage`, {
  phase: 'Sections',
  label: 'rebuild-pricing',
});

await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/src/components/landing/TestimonialsSection.tsx, StatsSection.tsx, CTASection.tsx, HowItWorksSection.tsx, PartnersSection.tsx with premium styling.

TESTIMONIALS: 3 testimonial cards from TESTIMONIALS data. Each: quote card with &ldquo; decoration, quote text, avatar initial circle, name/role, star rating in gold. Editorial layout with accent border variations (border-start-gold, border-end-gold, border-top-gold).

STATS: { totalRestaurants, totalUsers } from stats prop. Display as two large counter numbers with labels. Gold icon + number + label. Animated count-up effect using CountUp component.

CTA: Full-width section. Gradient background. Strong heading "جهّز مطعمك للانطلاق الرقمي" + subtext + primary gold CTA button "ابدأ مجاناً" linking to /subscribe. ArrowLeft icon.

HOW IT WORKS: 3 STEPS from data. Visual step numbering. Icon + title + desc. Horizontal on desktop, vertical on mobile. Step connectors or dividers between them.

PARTNERS: 3 partners from PARTNERS data. Logo placeholder (first letter) + name + desc. Simple horizontal scroll or grid.

ALL sections:
- RTL layout
- py-24 md:py-32 spacing
- Section label pills
- motion fade-up with whileInView
- Gold accent consistency
- Black/gold color tokens`, {
  phase: 'Sections',
  label: 'rebuild-sections',
});

await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/src/components/layout/Header.tsx with premium styling.

REQUIREMENTS:
1. Logo/brand on one side, nav links in center, "ابدأ مجاناً" CTA button on other side
2. Glass-effect background (backdrop-blur, semi-transparent)
3. Fixed position, z-index: var(--z-nav)
4. White/gold color scheme, consistent with design system
5. Mobile: hamburger menu with Fluid Island animation — floating glass pill in center top
6. Hamburger morphs to X on open
7. Menu overlay: glass, full-screen, backdrop-blur
8. Nav links staggered fade-in on open
9. Active link indicator
10. RTL layout`, {
  phase: 'Sections',
  label: 'rebuild-header',
});

// ============================================================
// PHASE 4: Modal/Overlay Fix
// ============================================================
phase('Modals');

await agent(`Fix /home/ahmed/UTILITIES/smart-menu/src/components/ui/dialog.tsx to ensure zero modal positioning issues.

CURRENT ISSUES TO FIX:
1. Ensure dialog is always centered: fixed top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2
2. Ensure no overflow: max-h-[85dvh] overflow-y-auto overscroll-contain
3. Ensure proper z-index isolation: z-50 for content, z-40 for backdrop
4. Backdrop: fixed inset-0 bg-black/20 backdrop-blur-sm, transitions opacity
5. Content: rounded-xl bg-popover, ring-1 ring-foreground/10, shadow-lg
6. Animation: transition-all duration-200, scale-95 -> scale-100 on open
7. Close button: absolute top-2 end-2
8. Ensure DialogPortal wraps content + overlay
9. Keep all Base UI DialogPrimitive structure intact
10. Ensure no scroll jumping on body when open (no missing scrollbar gutter)

DO NOT change component API or prop types. Only fix visual/positioning bugs.`, {
  phase: 'Modals',
  label: 'fix-dialog',
});

await agent(`Fix /home/ahmed/UTILITIES/smart-menu/src/components/shared/PaymentDialog.tsx.

ISSUES TO FIX:
1. Ensure the DialogContent max-width is appropriate (max-w-sm sm:max-w-md) with mx-2 for small screens
2. Ensure max-h-[90dvh] overflow-y-auto to prevent off-screen content
3. Ensure the PaymentDialog is fully responsive — no overflow on small screens
4. Verify all button styles use gold theme consistently
5. Ensure tab focus works correctly through the form
6. Add missing closing X button for accessibility
7. Ensure the dialog transitions smoothly (scale/opacity)
8. Fix any RTL alignment issues in form fields

DO NOT change component logic, API calls, or props. Only fix visual/positioning/UX issues.`, {
  phase: 'Modals',
  label: 'fix-payment-dialog',
});

// ============================================================
// PHASE 5: Remotion Video Rebuild
// ============================================================
phase('Remotion');

await agent(`Rebuild /home/ahmed/UTILITIES/smart-menu/remotion/src/HeroDemo.tsx
and all scenes in /home/ahmed/UTILITIES/smart-menu/remotion/src/scenes/.

REQUIREMENTS:
1. Total duration: 450 frames @ 30fps = 15 seconds — SLOW, cinematic, readable
2. Global Ken Burns: subtle zoom from 1 to 1.05 over full duration
3. Vignette: dark edges pulsing subtly
4. 5 scenes with ~10 frame transitions:
   - PhoneFrame (0-100): Show premium phone frame with dynamic island, empty menu screen
   - MenuScroll (90-190): Menu items appear one by one with stagger
   - ItemSelection (180-270): Item highlight + "أضف إلى الطلب" CTA appears
   - QuantitySelect (260-345): Quantity selector + price updates
   - WhatsAppSend (335-450): WhatsApp message "طلب جديد" appears with order details
5. Each scene in own file under /src/scenes/
6. Background: deep black with gold ambient glow (radial gradients)
7. Film grain overlay: subtle noise texture
8. Gold accent elements throughout
9. Arabic text content consistent with Smart Menu brand
10. Readable frame durations — no fast cuts
11. Export types properly for Remotion

Use: { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Easing } from "remotion", React

EXISTING FILES TO OVERWRITE (read them first):
- HeroDemo.tsx
- Root.tsx
- scenes/PhoneFrame.tsx
- scenes/MenuScroll.tsx
- scenes/ItemSelection.tsx
- scenes/QuantitySelect.tsx
- scenes/WhatsAppSend.tsx`, {
  phase: 'Remotion',
  label: 'rebuild-remotion',
  isolation: 'worktree',
});

// ============================================================
// PHASE 6: Build & QA
// ============================================================
phase('QA');

// Run TypeScript check
const tsCheck = await agent('Run npx tsc --noEmit in /home/ahmed/UTILITIES/smart-menu/ and report any TypeScript errors. Output ALL errors with file paths and line numbers.', {
  phase: 'QA',
  label: 'tsc-check',
});

// Run build
const buildResult = await agent('Run npm run build in /home/ahmed/UTILITIES/smart-menu/ — if it fails, read the full error output. Report whether build passes or fails with specific errors.', {
  phase: 'QA',
  label: 'build-check',
});

return {
  status: buildResult?.includes('success') || buildResult?.includes('ready') ? 'PASS' : 'NEEDS_FIX',
  tsErrors: tsCheck,
  buildOutput: buildResult,
};
