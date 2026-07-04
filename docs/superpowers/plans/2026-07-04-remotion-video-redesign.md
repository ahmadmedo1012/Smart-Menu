# Remotion Video Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite Remotion promo video from static images/linear transitions to AI B-roll Video backgrounds, spring physics Arabic typography, and animated subscription/checkout/Telegram flow.

**Architecture:** Single composition (SmartMenuPromo, 540f@30fps). PromoVideo.tsx orchestrates 3 scenes via useCurrentFrame() frame math (no TransitionSeries). Scene 2 splits into 4 sub-scene components receiving frameOffset prop. Shared constants module for video URLs and spring configs.

**Tech Stack:** Remotion 4.0.484, React 19, Tajawal font (@remotion/google-fonts), spring() physics, No @remotion/transitions.

## Global Constraints

- Composition: 1080×1920, 30fps, 540 frames exactly
- All background images → `<Video>` with `objectFit: "cover"`, muted
- All text: Tajawal font, `dir="rtl"`, Arabic copy from spec
- All entry motion: Remotion `spring()` — no linear transitions for text
- No `TransitionSeries` or `@remotion/transitions` imports
- All video URLs: HTTPS placeholder defaults, configurable AI asset slot
- Outfit font (Scene1_Brand) → Tajawal across all scenes

---
### Task 1: Root composition, shared utils, delete old scenes

**Files:**
- Modify: `src/video/Root.tsx`
- Create: `src/video/shared.ts` (new)
- Delete: `src/video/scenes/Scene1_Brand.tsx`
- Delete: `src/video/scenes/Scene2_FoodMontage.tsx`
- Delete: `src/video/food-icon.json`

- [ ] **Step 1: Create shared constants + spring helper**

```tsx
// src/video/shared.ts
import { spring, useVideoConfig, interpolate } from "remotion"
import type { SpringConfig } from "remotion"

export const FPS = 30
export const DURATION = 540 // 18s

// Default placeholder videos (swap with AI renders)
export const VIDEO_URLS = {
  scene1: "https://remotion-assets.s3.eu-west-1.amazonaws.com/example-videos/restaurant.mp4",
  scene2: "https://remotion-assets.s3.eu-west-1.amazonaws.com/example-videos/particles.mp4",
  scene3: "https://remotion-assets.s3.eu-west-1.amazonaws.com/example-videos/ambient.mp4",
}

// Audio assets
export const AUDIO_URLS = {
  whoosh: "https://remotion.media/whoosh.wav",
  ding: "https://remotion.media/ding.wav",
  notification: "https://remotion.media/ding.wav", // placeholder — replace with Telegram ping
}

// Orange brand palette
export const O = "#f97316"
export const TXT = "#ffffff"
export const TXT_MUTED = "rgba(255,255,255,0.45)"
export const GLOW = `${O}44`
export const GRAD_BTN = `linear-gradient(145deg, ${O}, #fb923c)`

// Spring config presets
export const SPRING_CONFIGS = {
  title: { damping: 14, mass: 0.6, stiffness: 120 } as SpringConfig,
  tagline: { damping: 12, mass: 0.4, stiffness: 100 } as SpringConfig,
  badge: { damping: 10, mass: 0.3, stiffness: 80 } as SpringConfig,
  cta: { damping: 12, mass: 0.5, stiffness: 100 } as SpringConfig,
  card: { damping: 14, mass: 0.7, stiffness: 110 } as SpringConfig,
}

// Reusable spring entry effect: returns { opacity, scale, translateY }
export function springEntry(
  frame: number,
  entranceFrame: number,
  config: SpringConfig = SPRING_CONFIGS.title,
) {
  const p = spring({
    frame: frame - entranceFrame,
    fps: FPS,
    config,
  })
  return {
    opacity: p,
    scale: interpolate(p, [0, 1], [0.85, 1]),
    translateY: interpolate(p, [0, 1], [30, 0]),
  }
}

export function fadeIn(frame: number, entranceFrame: number, duration = 15) {
  return interpolate(frame, [entranceFrame, entranceFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
}

export function fadeOut(frame: number, exitFrame: number, duration = 15) {
  return 1 - interpolate(frame, [exitFrame - duration, exitFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
}
```

- [ ] **Step 2: Update Root.tsx** (no change needed — already matches spec)

```tsx
import { Composition } from "remotion"
import { PromoVideo } from "./PromoVideo"
import { DURATION, FPS } from "./shared"

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SmartMenuPromo"
    component={PromoVideo}
    durationInFrames={DURATION}
    fps={FPS}
    width={1080}
    height={1920}
  />
)
```

- [ ] **Step 3: Delete old scene files + unused Lottie**

```bash
rm src/video/scenes/Scene1_Brand.tsx
rm src/video/scenes/Scene2_FoodMontage.tsx
rm src/video/food-icon.json
```

- [ ] **Step 4: Commit**

```bash
git add src/video/Root.tsx src/video/shared.ts
git rm src/video/scenes/Scene1_Brand.tsx src/video/scenes/Scene2_FoodMontage.tsx src/video/food-icon.json
git commit -m "feat(video): add shared utils, remove old scenes + unused lottie"
```

---
### Task 2: Scene 1 — Intro

**Files:**
- Create: `src/video/scenes/Scene1_Intro.tsx`

- [ ] **Step 1: Write Scene1_Intro.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, Video, Audio, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { VIDEO_URLS, AUDIO_URLS, springEntry, fadeIn, fadeOut, SPRING_CONFIGS, O, TXT, TXT_MUTED, GLOW } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"] })

export const Scene1_Intro: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })
  const overlayOp = interpolate(f, [0, 20], [0.6, 0.3], { extrapolateRight: "clamp" })
  const fade = fadeOut(f, 120)

  const titleS = springEntry(f, 10, SPRING_CONFIGS.title)
  const taglineS = springEntry(f, 25, SPRING_CONFIGS.tagline)
  const lineW = interpolate(f, [45, 60], [0, 40], { extrapolateRight: "clamp", easing: (t) => t * (2 - t) })

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily, opacity: fade }}>
      <Video src={VIDEO_URLS.scene1} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: videoOp,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)",
        opacity: overlayOp,
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: `linear-gradient(0deg, ${O}22, transparent)`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {/* Logo icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: `linear-gradient(145deg, ${O}, #fb923c)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18,
          opacity: titleS.opacity,
          transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`,
          boxShadow: `0 0 50px ${GLOW}`,
        }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
            <path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" /><circle cx="12" cy="12" r="8" /><path d="M8 12l2 2 4-4" />
          </svg>
        </div>

        {/* Smart Menu title */}
        <div style={{
          fontSize: 56, fontWeight: 700, color: TXT,
          letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 4,
          opacity: titleS.opacity,
          transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`,
        }}>
          Smart Menu
        </div>

        {/* Arabic tagline */}
        <div dir="rtl" style={{
          fontSize: 16, fontWeight: 400, color: TXT_MUTED,
          marginTop: 6, opacity: taglineS.opacity,
          transform: `translateY(${taglineS.translateY}px)`,
        }}>
          مدعوم بالذكاء الاصطناعي
        </div>

        {/* Accent line */}
        <div style={{
          width: `${lineW}px`, height: 3, borderRadius: 2, background: O,
          marginTop: 10, boxShadow: `0 0 10px ${GLOW}`,
        }} />

        {/* Tech badges */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, opacity: fadeIn(f, 60) }}>
          {["QR Menu", "AI", "Telegram"].map((t, i) => (
            <div key={i} style={{
              padding: "4px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 11, fontWeight: 600, color: TXT_MUTED,
              opacity: fadeIn(f, 60 + i * 5),
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      <Audio src={AUDIO_URLS.whoosh} volume={0.25} />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/video/scenes/Scene1_Intro.tsx
git commit -m "feat(video): add Scene1_Intro with video bg + spring Arabic typography"
```

---
### Task 3: Scene 2a — Plan Select

**Files:**
- Create: `src/video/scenes/Scene2A_PlanSelect.tsx`

- [ ] **Step 1: Write Scene2A_PlanSelect.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { FPS, O, TXT, TXT_MUTED, GLOW } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"] })

const PLANS = [
  { name: "Basic", price: "49", period: "شهرياً", popular: false },
  { name: "Pro", price: "99", period: "شهرياً", popular: true },
  { name: "Enterprise", price: "199", period: "شهرياً", popular: false },
]

interface Props { frameOffset: number }

export const Scene2A_PlanSelect: React.FC<Props> = ({ frameOffset }) => {
  const f = useCurrentFrame() - frameOffset
  const op = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })
  const fade = interpolate(f, [65, 75], [0, 1], { extrapolateLeft: "clamp" })

  return (
    <AbsoluteFill style={{ fontFamily, opacity: op * (1 - fade) }}>
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center" }}>
        <div dir="rtl" style={{
          fontSize: 28, fontWeight: 700, color: TXT, marginBottom: 6,
        }}>
          اختر خطتك
        </div>
        <div style={{ width: 30, height: 2, borderRadius: 1, background: O, margin: "0 auto 20px" }} />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 170 }}>
        {PLANS.map((plan, i) => {
          const p = spring({
            frame: f - (10 + i * 5),
            fps: FPS,
            config: { damping: 14, mass: 0.7, stiffness: 110 },
          })
          const isPopular = plan.popular
          return (
            <div key={i} style={{
              width: 100, borderRadius: 16,
              padding: "14px 8px",
              background: isPopular ? `linear-gradient(145deg, ${O}33, #fb923c22)` : "rgba(255,255,255,0.04)",
              border: isPopular ? `1.5px solid ${O}` : "1px solid rgba(255,255,255,0.08)",
              transform: `scale(${p}) translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
              opacity: p,
              textAlign: "center",
              boxShadow: isPopular ? `0 0 20px ${GLOW}` : undefined,
            }}>
              {isPopular && <div style={{
                fontSize: 8, fontWeight: 700, color: O,
                letterSpacing: "0.1em", marginBottom: 4,
              }}>✓ الأفضل</div>}
              <div style={{ fontSize: 13, fontWeight: 700, color: TXT }}>{plan.name}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: O, marginTop: 4 }}>
                ${plan.price}
              </div>
              <div style={{ fontSize: 9, color: TXT_MUTED }}>{plan.period}</div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/video/scenes/Scene2A_PlanSelect.tsx
git commit -m "feat(video): add Scene2A plan select with spring cards"
```

---
### Task 4: Scene 2b — Payment

**Files:**
- Create: `src/video/scenes/Scene2B_Payment.tsx`

- [ ] **Step 1: Write Scene2B_Payment.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { springEntry, SPRING_CONFIGS, O, TXT, TXT_MUTED } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"] })

interface Props { frameOffset: number }

export const Scene2B_Payment: React.FC<Props> = ({ frameOffset }) => {
  const f = useCurrentFrame() - frameOffset
  const op = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })
  const fade = interpolate(f, [70, 75], [0, 1], { extrapolateLeft: "clamp" })
  const headerS = springEntry(f, 5, SPRING_CONFIGS.title)
  const cardS = springEntry(f, 15, SPRING_CONFIGS.card)
  const CheckS = interpolate(f, [55, 65], [0, 1], { extrapolateRight: "clamp" })

  return (
    <AbsoluteFill style={{ fontFamily, opacity: op * (1 - fade) }}>
      <div style={{
        position: "absolute", top: 130, left: 0, right: 0, textAlign: "center",
        opacity: headerS.opacity, transform: `translateY(${headerS.translateY}px)`,
      }}>
        <div dir="rtl" style={{ fontSize: 28, fontWeight: 700, color: TXT }}>معلومات الدفع</div>
      </div>

      {/* Payment card mockup */}
      <div style={{
        position: "absolute", top: 190, left: 60, right: 60,
        borderRadius: 20, padding: 24,
        background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.1)",
        opacity: cardS.opacity, transform: `scale(${cardS.scale}) translateY(${cardS.translateY}px)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: O, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
              <rect x="3" y="8" width="18" height="12" rx="2" /><path d="M8 4h8" /><path d="M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2" />
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TXT }}>•••• 4242</div>
        </div>

        {["اسحب لإتمام الدفع", "جاري التأكيد...", "✓ تم الدفع"].map((t, i) => {
          const itemOp = interpolate(f, [15 + i * 12, 25 + i * 12], [0, 1], { extrapolateRight: "clamp" })
          return (
            <div key={i} style={{
              padding: "8px 14px", borderRadius: 10, marginBottom: 6,
              background: i === 2 ? `${O}22` : "rgba(255,255,255,0.04)",
              border: i === 2 ? `1px solid ${O}44` : "1px solid rgba(255,255,255,0.06)",
              opacity: itemOp, fontSize: 12, color: i === 2 ? O : TXT, fontWeight: 600,
              dir: "rtl" as any,
            }}>
              {t}
            </div>
          )
        })}

        {/* Spinner → checkmark */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", margin: "0 auto",
            border: `2px solid rgba(255,255,255,0.1)`,
            borderTopColor: O,
            transform: `rotate(${interpolate(f, [0, 70], [0, 360])}deg)`,
            opacity: interpolate(f, [55, 65], [1, 0]),
          }} />
          {CheckS > 0 && <div style={{
            fontSize: 28, marginTop: -34, opacity: CheckS,
          }}>✓</div>}
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/video/scenes/Scene2B_Payment.tsx
git commit -m "feat(video): add Scene2B payment card with spinner-check"
```

---
### Task 5: Scene 2c — Validation Gate

**Files:**
- Create: `src/video/scenes/Scene2C_Validation.tsx`

- [ ] **Step 1: Write Scene2C_Validation.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { springEntry, SPRING_CONFIGS, O, TXT } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"] })

interface Props { frameOffset: number }

export const Scene2C_Validation: React.FC<Props> = ({ frameOffset }) => {
  const f = useCurrentFrame() - frameOffset
  const op = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" })
  const fade = interpolate(f, [55, 60], [0, 1], { extrapolateLeft: "clamp" })
  const shieldS = springEntry(f, 5, SPRING_CONFIGS.cta)
  const textS = springEntry(f, 15, SPRING_CONFIGS.tagline)
  const pulse = 1 + 0.08 * Math.sin(f * 0.08)
  const status = f < 40 ? "جاري التحقق" : "✓ تم التحقق"
  const statusColor = f < 40 ? TXT : O
  const badgeS = springEntry(f, f < 40 ? 5 : 40, SPRING_CONFIGS.badge)

  return (
    <AbsoluteFill style={{ fontFamily, opacity: op * (1 - fade) }}>
      <div style={{ position: "absolute", top: 180, left: 0, right: 0, textAlign: "center" }}>
        {/* Shield icon */}
        <div style={{
          width: 70, height: 70, borderRadius: "50%", margin: "0 auto 16px",
          background: `${O}15`, border: `2px solid ${O}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${shieldS.scale * pulse})`,
          opacity: shieldS.opacity,
          boxShadow: `0 0 30px ${O}33`,
        }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={O} strokeWidth={2}>
            <path d="M12 2l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V6l9-4z" />
          </svg>
        </div>

        {/* Status text */}
        <div dir="rtl" style={{
          fontSize: 20, fontWeight: 700, color: statusColor,
          opacity: badgeS.opacity,
          transform: `translateY(${badgeS.translateY}px)`,
          transition: "color 0.3s",
        }}>
          {status}
        </div>

        {/* Subtext */}
        <div dir="rtl" style={{
          fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6,
          opacity: textS.opacity,
        }}>
          {f < 40 ? "يتم التحقق من بيانات الاشتراك" : "تم تفعيل الاشتراك بنجاح"}
        </div>

        {/* Progress bar */}
        <div style={{
          width: 120, height: 3, borderRadius: 2, margin: "14px auto 0",
          background: "rgba(255,255,255,0.08)", overflow: "hidden",
        }}>
          <div style={{
            width: `${f < 40 ? interpolate(f, [0, 40], [0, 90]) : 100}%`,
            height: "100%", borderRadius: 2, background: O,
            transition: "width 0.3s",
          }} />
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/video/scenes/Scene2C_Validation.tsx
git commit -m "feat(video): add Scene2C validation gate shield"
```

---
### Task 6: Scene 2d — Telegram Chat

**Files:**
- Create: `src/video/scenes/Scene2D_Telegram.tsx`

- [ ] **Step 1: Write Scene2D_Telegram.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { springEntry, SPRING_CONFIGS, O, TXT, TXT_MUTED } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "700"] })

interface Props { frameOffset: number }

const BOT_BLUE = "#2AABEE"

export const Scene2D_Telegram: React.FC<Props> = ({ frameOffset }) => {
  const f = useCurrentFrame() - frameOffset
  const op = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" })
  const fade = interpolate(f, [85, 90], [0, 1], { extrapolateLeft: "clamp" })

  return (
    <AbsoluteFill style={{ fontFamily, opacity: op * (1 - fade) }}>
      {/* Telegram header */}
      <div style={{
        position: "absolute", top: 100, left: 50, right: 50,
        background: "rgba(255,255,255,0.06)", borderRadius: 16,
        padding: 12, border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: BOT_BLUE,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
          }}>S</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>SmartMenuBot</div>
            <div style={{ fontSize: 9, color: TXT_MUTED }}>بوت • نشط الآن</div>
          </div>
        </div>
      </div>

      {/* Chat bubbles */}
      <div style={{ position: "absolute", top: 170, left: 50, right: 50 }}>
        {/* Bot: confirmation request */}
        <ChatBubble
          frame={f}
          entrance={5}
          text="طلب تأكيد الاشتراك في خطة Pro"
          isBot
        />
        {/* Bot: price */}
        <ChatBubble
          frame={f}
          entrance={30}
          text="المبلغ: $99/شهرياً"
          isBot
        />
        {/* Bot: approve/reject buttons */}
        <div style={{
          display: "flex", gap: 8, marginTop: 10,
          opacity: springEntry(f, 50, SPRING_CONFIGS.card).opacity,
          transform: `translateY(${interpolate(springEntry(f, 50, SPRING_CONFIGS.card).scale, [0.85, 1], [20, 0])}px)`,
        }}>
          <div style={{
            flex: 1, padding: "10px 0", borderRadius: 12,
            background: `${O}22`, border: `1px solid ${O}55`,
            textAlign: "center", fontSize: 13, fontWeight: 700, color: O,
          }}>✓ تأكيد</div>
          <div style={{
            flex: 1, padding: "10px 0", borderRadius: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center", fontSize: 13, fontWeight: 600, color: TXT_MUTED,
          }}>✕ رفض</div>
        </div>
        {/* Bot: confirmation */}
        <ChatBubble
          frame={f}
          entrance={65}
          text="✓ تم التفعيل! مطعمك جاهز الآن."
          isBot
          highlight
        />
      </div>

      <Sequence from={25}>
        <Audio src={AUDIO_URLS.notification} volume={0.15} />
      </Sequence>
    </AbsoluteFill>
  )
}

function ChatBubble({
  frame, entrance, text, isBot, highlight,
}: {
  frame: number; entrance: number; text: string; isBot: boolean; highlight?: boolean
}) {
  const s = springEntry(frame, entrance, { damping: 14, mass: 0.6, stiffness: 110 })
  if (s.opacity <= 0) return null
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 16,
      borderTopLeftRadius: isBot ? 4 : 16,
      borderTopRightRadius: isBot ? 16 : 4,
      marginBottom: 6, maxWidth: "80%",
      background: highlight ? `${O}22` : isBot ? "rgba(255,255,255,0.06)" : BOT_BLUE,
      border: highlight ? `1px solid ${O}44` : "1px solid rgba(255,255,255,0.06)",
      opacity: s.opacity,
      transform: `translateY(${s.translateY}px)`,
      alignSelf: isBot ? "flex-start" : "flex-end",
      dir: "rtl",
    }}>
      <div style={{
        fontSize: 12, fontWeight: highlight ? 600 : 400,
        color: highlight ? O : isBot ? TXT : "#fff",
      }}>
        {text}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/video/scenes/Scene2D_Telegram.tsx
git commit -m "feat(video): add Scene2D Telegram chat with spring bubbles"
```

---
### Task 7: Scene 2 Checkout orchestrator

**Files:**
- Create: `src/video/scenes/Scene2_Checkout.tsx`

- [ ] **Step 1: Write Scene2_Checkout.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, Video, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { VIDEO_URLS, O } from "../shared"
import { Scene2A_PlanSelect } from "./Scene2A_PlanSelect"
import { Scene2B_Payment } from "./Scene2B_Payment"
import { Scene2C_Validation } from "./Scene2C_Validation"
import { Scene2D_Telegram } from "./Scene2D_Telegram"

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] })

// Frame offsets for each sub-scene within the 300f Scene 2 budget
const SUBSCENES = [
  { start: 0, end: 75, Component: Scene2A_PlanSelect },       // 120-195
  { start: 75, end: 150, Component: Scene2B_Payment },        // 195-270
  { start: 150, end: 210, Component: Scene2C_Validation },    // 270-330
  { start: 210, end: 300, Component: Scene2D_Telegram },      // 330-420
] as const

export const Scene2_Checkout: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily }}>
      <Video src={VIDEO_URLS.scene2} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: videoOp,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.4) 100%)",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: `linear-gradient(0deg, ${O}11, transparent)`,
      }} />

      {SUBSCENES.map(({ start, end, Component }) => (
        <div key={start} style={{
          position: "absolute", inset: 0,
          opacity: f >= start && f < end ? 1 : 0,
        }}>
          <Component frameOffset={start} />
        </div>
      ))}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/video/scenes/Scene2_Checkout.tsx
git commit -m "feat(video): add Scene2 checkout orchestrator with sub-scene routing"
```

---
### Task 8: Scene 3 — CTA

**Files:**
- Modify: `src/video/scenes/Scene3_CTA.tsx` (rewrite existing)

- [ ] **Step 1: Rewrite Scene3_CTA.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, Video, Audio, interpolate } from "remotion"
import { loadFont } from "@remotion/google-fonts/Tajawal"
import { VIDEO_URLS, AUDIO_URLS, springEntry, fadeIn, fadeOut, SPRING_CONFIGS, O, TXT, TXT_MUTED, GLOW, GRAD_BTN } from "../shared"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"] })

export const Scene3_CTA: React.FC = () => {
  const f = useCurrentFrame()
  const videoOp = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" })
  const fade = fadeOut(f, 120)
  const badgeS = springEntry(f, 5, SPRING_CONFIGS.badge)
  const titleS = springEntry(f, 20, SPRING_CONFIGS.title)
  const ctaS = springEntry(f, 35, SPRING_CONFIGS.cta)
  const msgOp = fadeIn(f, 50)
  const chipS = fadeIn(f, 55)
  const btnPulse = 1 + 0.04 * Math.sin(f * 0.07)

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily, opacity: fade }}>
      <Video src={VIDEO_URLS.scene3} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: videoOp,
        filter: "brightness(0.7) contrast(1.05)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.3) 100%)",
      }} />
      <div style={{
        position: "absolute", bottom: "30%", left: "50%",
        transform: "translateX(-50%)",
        width: 400, height: 400, borderRadius: "50%",
        background: `radial-gradient(circle, ${O}22, transparent 70%)`,
        filter: "blur(60px)",
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        paddingBottom: 140,
      }}>
        {/* Badge */}
        <div style={{
          padding: "5px 18px", borderRadius: 20,
          background: `${O}22`, border: `1px solid ${O}44`,
          fontSize: 11, fontWeight: 600, color: O,
          letterSpacing: "0.15em", marginBottom: 12,
          opacity: badgeS.opacity,
          transform: `scale(${badgeS.scale}) translateY(${badgeS.translateY}px)`,
        }}>
          انطلق الآن
        </div>

        {/* Headline */}
        <div dir="rtl" style={{
          fontSize: 36, fontWeight: 700, color: TXT,
          lineHeight: 1.15, textAlign: "center",
          opacity: titleS.opacity,
          transform: `scale(${titleS.scale}) translateY(${titleS.translateY}px)`,
        }}>
          مطعمك جاهز للانطلاق <span style={{ color: O }}>الرقمي</span>
        </div>

        {/* Accent line */}
        <div style={{
          width: 40, height: 3, borderRadius: 2, background: O,
          margin: "12px auto", boxShadow: `0 0 10px ${GLOW}`,
          opacity: fadeIn(f, 42),
        }} />

        {/* CTA Button */}
        <div style={{
          padding: "13px 44px", borderRadius: 50,
          background: GRAD_BTN,
          transform: `scale(${ctaS.scale * btnPulse})`,
          opacity: ctaS.opacity,
          boxShadow: `0 0 30px ${GLOW}`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
            ابدأ مجاناً
          </span>
        </div>

        {/* Subtext */}
        <div dir="rtl" style={{
          fontSize: 12, color: TXT_MUTED, marginTop: 8,
          opacity: msgOp,
        }}>
          مجاناً • بدون بطاقة • دعم فني متكامل
        </div>

        {/* Chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, opacity: chipS }}>
          {["QR سريع", "تقارير", "دعم 24/7"].map((t, i) => (
            <div key={i} style={{
              padding: "4px 12px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 10, fontWeight: 500, color: TXT_MUTED,
              opacity: fadeIn(f, 55 + i * 3),
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      <Audio src={AUDIO_URLS.ding} volume={0.12} />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/video/scenes/Scene3_CTA.tsx
git commit -m "feat(video): rewrite Scene3_CTA with video bg + spring typography"
```

---
### Task 9: Rewrite PromoVideo orchestrator

**Files:**
- Modify: `src/video/PromoVideo.tsx` (scrap TransitionSeries, manual frame routing)

- [ ] **Step 1: Rewrite PromoVideo.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion"
import { Scene1_Intro } from "./scenes/Scene1_Intro"
import { Scene2_Checkout } from "./scenes/Scene2_Checkout"
import { Scene3_CTA } from "./scenes/Scene3_CTA"

const SCENES = [
  { start: 0, end: 120, Component: Scene1_Intro },
  { start: 120, end: 420, Component: Scene2_Checkout },
  { start: 420, end: 540, Component: Scene3_CTA },
] as const

export const PromoVideo: React.FC = () => {
  const f = useCurrentFrame()

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map(({ start, end, Component }) => (
        <div
          key={start}
          style={{
            position: "absolute",
            inset: 0,
            opacity: f >= start && f < end ? 1 : 0,
            pointerEvents: "none",
          }}
        >
          <Component />
        </div>
      ))}

      {/* Crossfade between scenes */}
      <CrossfadeOverlay />
    </AbsoluteFill>
  )
}

function CrossfadeOverlay() {
  const f = useCurrentFrame()
  // Fade between scene 1→2 at f=115-120
  // Fade between scene 2→3 at f=415-420
  const fade1 = sceneCrossfade(f, 115)
  const fade2 = sceneCrossfade(f, 415)

  return (
    <>
      <div style={{
        position: "absolute", inset: 0, background: "#000",
        opacity: fade1 * 0.5, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0, background: "#000",
        opacity: fade2 * 0.5, pointerEvents: "none",
      }} />
    </>
  )
}

function sceneCrossfade(frame: number, startFrame: number) {
  return interpolate(frame, [startFrame, startFrame + 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
}
```

- [ ] **Step 2: Remove unused imports from package.json** (soft: verify no other imports)

The `@remotion/transitions` dep is only used in the old `PromoVideo.tsx` — now safe to remove.

- [ ] **Step 3: Commit**

```bash
git add src/video/PromoVideo.tsx
git commit -m "feat(video): rewrite PromoVideo with manual scene routing, remove transitions"
```

---
### Task 10: Remove unused dep + final timing verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove @remotion/transitions from package.json deps**

Find and remove the line `"@remotion/transitions": "4.0.484",` from the `dependencies` section.

- [ ] **Step 2: Verify composition timing**

Run preview:
```bash
npx remotion preview src/video/index.ts
```

Manual check:
- Scene 1 plays f=0→120 (4s) with video bg + spring text
- Scene 2 plays f=120→420 (10s) with 4 sub-scenes
- Scene 3 plays f=420→540 (4s) with CTA
- Total = 540f, no overrun
- All text RTL, Arabic legible
- Crossfade at scene boundaries works

- [ ] **Step 3: Render test**

```bash
npx remotion render src/video/index.ts SmartMenuPromo public/video/promo.mp4
```
Expected: no errors, playable MP4 at `public/video/promo.mp4`

- [ ] **Step 4: Commit final cleanup**

```bash
git add package.json
git commit -m "chore: remove unused @remotion/transitions dep"
```
