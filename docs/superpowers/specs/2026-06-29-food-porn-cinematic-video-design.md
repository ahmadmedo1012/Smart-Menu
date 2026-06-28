# Food Porn Cinematic Video — Smart Menu Promo

## Format
- Resolution: 1080 × 1920 (portrait, mobile-optimized)
- FPS: 30
- Total: 540 frames (18 seconds)
- Codec: H.264 MP4
- Max size: <5MB
- Font: Outfit (loaded via @remotion/google-fonts)
- Primary color: #f97316 (warm orange)

## Scene Architecture

### S1 — Brand Reveal (120 frames / 4s)
- Full-bleed food image as background (dark, moody)
- Image slowly scales from 1.0→1.05 (subtle parallax drift)
- Smart Menu logo + tagline fades in center after 0.5s
- Linear gradient darkening overlay
- Whoosh sound at frame 20
- Fade to black in last 15 frames

### S2 — Food Montage (300 frames / 10s)
- 5 food images in sequence, each 60 frames (2s)
- Each image: full-bleed, dark vignette overlay
- Text overlay: dish name (Arabic, 36px, white) + price (22px, orange)
- Each card animates in with slight scale-up (0.92→1.0) over 15 frames
- Transition between images: crossfade, 15 frames overlap
- Subtle sparkle/dust particles on each image
- Ding sound on each new image reveal

### S3 — Final CTA (120 frames / 4s)
- One last hero food image (the most impressive dish)
- Text: "جهّز مطعمك للانطلاق الرقمي" (44px, 2 lines)
- Subtitle: "مجاناً • بدون بطاقة • دعم فني متكامل"
- CTA button: "ابدأ مجاناً" (pill shape, orange gradient, pulse animation)
- Ambient orange glow orb breathing
- Ding sound at frame 30

## Visual Rules
- ALL images are full-bleed (width: 1080px, fill entire screen)
- No empty space at any frame
- Dark overlay gradient at bottom for text readability
- Text always appears with entrance animation (fade-up or scale-in)
- Images sourced from Unsplash food photography
- Each image used only once

## Technical Requirements
- Each scene uses `useCurrentFrame()` — no frame prop
- TransitionSeries for crossfade transitions between scenes
- Audio from @remotion/media
- Lottie integration: animated food icon in S1 background

## Anti-Patterns (Banned)
- [ ] No phone mockups or UI screenshots
- [ ] No card grids or multiple images visible at once
- [ ] No particle effects that distract from food
- [ ] No QR codes or tech imagery
- [ ] No text-heavy layouts
- [ ] No horizontal or vertical scrolling
