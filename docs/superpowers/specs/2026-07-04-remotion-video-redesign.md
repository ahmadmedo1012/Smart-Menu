# Smart Menu — Remotion Promo Video Redesign

**Date**: 2026-07-04
**Status**: Draft
**Goal**: Rewrite existing Remotion composition (Unsplash image placeholders, Latin font, linear transitions) to cinematic AI B-roll background video, spring-physics Arabic typography, and animated subscription/checkout lifecycle + Telegram ChatOps demo.

---

## 1. Core Composition

| Field | Value | Notes |
|-------|-------|-------|
| ID | `SmartMenuPromo` | unchanged |
| Resolution | 1080×1920 (9:16 portrait) | unchanged |
| FPS | 30 | unchanged |
| Duration | 540 frames (18s) | fix current 15f overrun |
| Codec | h264 | unchanged |
| Format | JPEG sequence → MP4 | unchanged |
| Output | `public/video/` | unchanged |

No new composition IDs. Single entry point maintained.

## 2. Asset Injection Layer

Replace `<div>` background images with Remotion `<Video />` component:

- **Scene 1** — cinematic AI-generated B-roll (restaurant kitchen / food prep / tech-ambient)
- **Scene 2** — subtle looping abstract background (data flow / dashboard particles)
- **Scene 3** — warm ambient B-roll (happy customers / phone screen interaction)

All videos use `objectFit: "cover"`, muted, with dark overlay gradients for text readability.

Asset slots (`VIDEO_URLS` constant in each scene) accept any HTTPS MP4 URL — swap when AI renders ready. No hardcoded local paths.

**Default placeholders** for development preview: public-domain cinematic MP4s from Remotion's test assets (e.g. `https://remotion-assets.s3.eu-west-1.amazonaws.com/example-videos/`) — ensures `npx remotion preview` renders immediately without AI assets present.

## 3. Arabic Typography & Spring Physics

### Font
`@remotion/google-fonts` → **Tajawal** (cleaner at small sizes, better RTL glyph distribution in Remotion, weights 400/600/700/800).

### Spring Configuration
All text entry transitions use Remotion `spring()`:
```ts
import { spring, useCurrentFrame, useVideoConfig } from "remotion"

const { fps } = useVideoConfig()
const entry = spring({
  frame: f - entranceFrame,
  fps,
  config: { damping: 12, mass: 0.5, stiffness: 100 },
})
// apply: scale={entry}, translateY={interpolate(entry, [0,1], [30, 0])}
```

Configuration per element:
| Element | damping | mass | stiffness | entrance frame |
|---------|---------|------|-----------|----------------|
| Brand title | 14 | 0.6 | 120 | f=10 |
| Tagline | 12 | 0.4 | 100 | f=25 |
| Badge/chip | 10 | 0.3 | 80 | f=5 |
| CTA button | 12 | 0.5 | 100 | f=15 |
| Telegram bubble | 14 | 0.7 | 110 | f=5 |

All text in `dir="rtl"` containers with Arabic copy lifted from existing landing/subscription flows for consistency.

## 4. Scene Breakdown

### Scene 1 — Intro (0–120f, 4s)

**Background**: AI B-roll video (tech/kitchen cinematic). `objectFit: "cover"`, dark overlay (0.6→0.3).

**Animation sequence**:
- f=0–10: video fade in
- f=10–30: spring brand icon (SVG) + "Smart Menu" title — scale up from 0.85
- f=25–45: spring tagline "مدعوم بالذكاء الاصطناعي" (AI-powered) — slides up
- f=45–60: accent line grows
- f=60–80: tech badges fade in ("QR Menu", "AI Recommendations", "Telegram Orders")
- f=105–120: crossfade out

**Audio**: Ambient whoosh at f=18 (keep existing, adjust volume)

### Scene 2 — Checkout & Telegram Flow (120–420f, 10s)

**Background**: Subtle abstract video loop (data particles or dashboard pulse). Dark with blue-orange accent glow.

**Sub-scenes** (sequential cards, no TransitionSeries — manual timing with spring per card):

| Sub-scene | Frames | Content |
|-----------|--------|---------|
| 2a. Plan select | 120–195 (2.5s) | 3 subscription plan cards (Basic/Pro/Enterprise). "اختر خطتك" header. Middle card (Pro) highlights on entrance. Spring card entrance staggered by 5f each. |
| 2b. Payment form | 195–270 (2.5s) | Animated payment card (input fields fill sequentially). Lock icon + "معلومات الدفع". Spinner → checkmark animation at end. |
| 2c. Validation gate | 270–330 (2s) | Validation shield icon + spinning check. "جاري التحقق..." → "✓ تم التحقق" spring badge. Orange glow pulse on success. |
| 2d. Telegram msg | 330–420 (3s) | Telegram chat UI: bot avatar + "SmartMenuBot" header. Animated message bubbles: "طلب تأكيد الاشتراك" → inline Approve/Reject buttons (spring pop) → "✓ تم التفعيل" confirmation. |

**Implementation**: Each sub-scene is a separate component (`Scene2_PlanSelect`, `Scene2_Payment`, etc.) receiving `frameOffset` prop for timing. Rendered with opacity switching in `Scene2_Checkout.tsx`.

### Scene 3 — CTA (420–540f, 4s)

**Background**: Warm B-roll (happy restaurant / phone with QR). Dark overlay (0.8).

**Animation sequence**:
- f=420–435: video fade in, content spring up
- f=435–450: badge "انطلق الآن" spring from above
- f=450–470: headline "مطعمك جاهز للانطلاق الرقمي" — spring scale + slide
- f=470–480: orange accent line
- f=480–495: CTA button "اطلب عرضك الآن" spring pulse
- f=495–510: feature chips spring in staggered
- f=525–540: fade out

**Audio**: Keep existing ding at reduced volume.

## 5. File Structure Changes

```
src/video/
├── index.ts                          # unchanged
├── Root.tsx                          # update durationInFrames if needed
├── PromoVideo.tsx                    # scrap TransitionSeries, linear timing → manual scene flow
├── scenes/
│   ├── Scene1_Intro.tsx              # rewrite from Scene1_Brand
│   ├── Scene2_Checkout.tsx           # new orchestrator
│   │   ├── Scene2A_PlanSelect.tsx    # new
│   │   ├── Scene2B_Payment.tsx       # new
│   │   ├── Scene2C_Validation.tsx    # new
│   │   └── Scene2D_Telegram.tsx      # new
│   └── Scene3_CTA.tsx                # rewrite from existing Scene3_CTA
└── food-icon.json                     # delete (unused Lottie)
```

`PromoVideo.tsx` — remove `@remotion/transitions` dep (no TransitionSeries/fade imports). Use raw `useCurrentFrame()` + conditional rendering with spring crossfade.

## 6. Audio

| Scene | Sound | Volume |
|-------|-------|--------|
| 1 | whoosh.wav at f=18 | 0.25 |
| 2 | ding.wav on each card entrance | 0.08 |
| 2d | notification ping at f=360 | 0.15 |
| 3 | subtle ambient pad or none | — |

## 7. Edge Cases & Constraints

- All videos must be HTTPS URLs (no local file deps) — swap-in ready for Higgsfield/Haiper output
- All Arabic text uses `<div dir="rtl">` — no CSS `direction` conflicts
- Spring animation avoids Remotion's deprecated `interpolate` for entry motion where possible
- `PromoVideo.tsx` total frame budget = 540f — Scene 2 sub-scenes total exactly 300f
- Scene 2 staggered card animations need `useVideoConfig().fps` for spring timing — no hardcoded frame multipliers
- No `TransitionSeries` — prevents the 15f overrun bug

## 8. Dependencies Removed

`@remotion/transitions` becomes unused — can be pruned from package.json after verifying no other file imports it.

## 9. Verification

Run after implementation:
```bash
npx remotion preview src/video/index.ts
```
Check: zero layout clipping, zero overlap dropouts, RTL text renders correctly, spring animations smooth, all 3 scenes visible within 540f.

```bash
npx remotion render src/video/index.ts SmartMenuPromo public/video/promo.mp4
```
Check: no render exceptions, output playable.
