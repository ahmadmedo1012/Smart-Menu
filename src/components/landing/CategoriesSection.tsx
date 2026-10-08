"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { Network } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"

/* r129 — Chapter 01 «الاكتشاف»: the categories constellation, re-aligned to
 * the canonical Madarek CollegeConstellation.tsx:150/:211-240 mechanics
 * (audit r129-A5 P1 roster + P2 resting-life):
 * · lime-roster discipline — idle pins are ONE uniform cream at 0.65
 *   alpha; lime is reserved for the single hovered/focused pin (one
 *   pop). No permanently-lime idle pins.
 * · idle dot geometry — an 8×8px pin (inline DOT_SIZE) with a
 *   guaranteed 44×44 hit span; the CSS class keeps the 13px hit-dot box
 *   and the ::before 45px halo.
 * · resting life (P2) — one category gently lit at a time on a ~4s
 *   cycle (is-resting: scale 1.45 + flat ring). Gated by
 *   prefers-reduced-motion (never starts) and paused offscreen via the
 *   stage's own IntersectionObserver.
 * Content stays the platform's REAL default category registry (the
 * auto-seeded set every new menu starts with) with REAL item examples
 * from the public demo menu (مقهى الواحة، /menu/al-waha-cafe), nothing
 * invented. */

/** Hover pop — var()-chained to the Orbit Ink lime token with hex fallback. */
const DOT_LIME = "var(--ln-lime, #DFEDB2)"
/** Idle paint — flat cream (canonical P2-13: 0.65 alpha — findable at rest). */
const DOT_IDLE = "rgba(245,243,231,0.65)"
/** Resting-cycle paint — the one gently lit category (near-full cream). */
const DOT_REST = "rgba(245,243,231,0.95)"

/** Idle dot geometry — an 8×8px pin (canonical CollegeConstellation
 * DOT_SIZE), overriding the 13px CSS hit-dot box; the CSS class keeps
 * the invisible 44px hit span. */
const DOT_SIZE: CSSProperties = { inlineSize: 8, blockSize: 8 }

/** Guaranteed ≥44px touch target around each dot (canonical HIT_STYLE). */
const HIT_STYLE: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  inlineSize: 44,
  blockSize: 44,
  transform: "translate(-50%, -50%)",
  borderRadius: "50%",
}

/** Resting-highlight cadence — one category every ~4s (canonical). */
const REST_CYCLE_MS = 4000

/** The demo menu every pin opens — the real categories live there. */
const DEMO_MENU_URL = "/menu/al-waha-cafe"

/** The four real default categories — pins on the sky chart (roster:
 * idle cream, hover/focus lime one-pop, resting near-full cream). */
const LIVE = [
  { name: "مشروبات ساخنة", sub: "قهوة تركي، إسبريسو، كابتشينو", href: DEMO_MENU_URL, left: "40.8%", top: "35.6%" },
  { name: "مشروبات باردة", sub: "ليموناضة، سموثي، موهيتو", href: DEMO_MENU_URL, left: "68.1%", top: "36.8%" },
  { name: "حلويات", sub: "تشيز كيك، كنافة، بسبوسة", href: DEMO_MENU_URL, left: "24.6%", top: "57.3%" },
  { name: "وجبات خفيفة", sub: "برجر، ساندويتش، بطاطس مقلية", href: DEMO_MENU_URL, left: "74.6%", top: "67.7%" },
]

/** The full registry for the mobile chips strip (all 4, accessible). */
const CHIPS = LIVE.map((c, i) => ({
  name: c.name,
  count: String(i + 1).padStart(2, "0"),
  dot: DOT_LIME,
}))

export function CategoriesSection() {
  /** Single hovered/focused pin (the one lime pop). */
  const [active, setActive] = useState<number | null>(null)
  /** Index of the resting-highlight pin (-1 = none) — canonical P2-13 life. */
  const [restIdx, setRestIdx] = useState(-1)
  const stageRef = useRef<HTMLDivElement | null>(null)

  /* Resting-highlight cycle: rotate one gently lit pin every ~4s so the
     sky reads as alive without hover. NEVER runs under
     prefers-reduced-motion; paused while the stage is offscreen (IO);
     fully torn down on unmount. (Faithful port of the canonical
     CollegeConstellation.tsx:211-240 effect.) */
  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const stage = stageRef.current
    if (!stage || typeof IntersectionObserver === "undefined") return
    let inView = false
    let timer = 0
    const start = () => {
      if (timer) return
      timer = window.setInterval(() => {
        setRestIdx((i) => (i + 1) % Math.max(1, LIVE.length))
      }, REST_CYCLE_MS)
    }
    const stop = () => {
      window.clearInterval(timer)
      timer = 0
    }
    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting)
      if (visible === inView) return
      inView = visible
      if (visible) start()
      else stop()
    })
    io.observe(stage)
    return () => {
      io.disconnect()
      stop()
    }
  }, [])

  return (
    <section id="categories" className="ln-chapter ln-categories">
      <div className="ln-chapter-head">
        <span className="ln-label">{"01 — الاكتشاف"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          فئات منيوك في <em>مدارٍ واحد</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          أربع فئات جاهزة في كل منيو جديد منذ اللحظة الأولى — وفئاتك الخاصة
          تُضاف من لوحة التحكم، بالأصناف والأسعار والصور.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div className="ln-constellation" data-count={LIVE.length}>
          {/* the sky chart — dashed hairline rings, flat violet heart.
              NOT aria-hidden while the pins are focusable (canonical P2-13
              axe rule: hiding focusable content is a violation). */}
          <div className="ln-constellation-stage" ref={stageRef}>
            <svg className="ln-constellation-svg" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 0 }} cx={500} cy={320} r={130} />
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 1 }} cx={500} cy={320} r={200} />
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 2 }} cx={500} cy={320} r={270} />
            </svg>

            {/* the real categories — focusable pins that open the demo
                menu. Roster: idle cream 0.65 · hover/focus lime (one pop) ·
                resting near-full cream + is-resting ring. */}
            {LIVE.map((p, i) => {
              const resting = active === null && restIdx === i
              const dot = active === i ? DOT_LIME : resting ? DOT_REST : DOT_IDLE
              return (
                <a
                  key={p.name}
                  href={p.href}
                  className={`ln-constellation-dot${resting ? " is-resting" : ""}`}
                  style={
                    {
                      left: p.left,
                      top: p.top,
                      "--dot": dot,
                      "--ln-ci": i,
                      ...DOT_SIZE,
                    } as CSSProperties
                  }
                  aria-label={`${p.name} — شاهد الفئة في منيو مقهى الواحة`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onBlur={() => setActive(null)}
                >
                  <span className="ln-constellation-hit" aria-hidden style={HIT_STYLE} />
                  <span className="ln-constellation-tip">
                    <b>{p.name}</b>
                    <i>{p.sub}</i>
                  </span>
                </a>
              )
            })}
          </div>

          {/* the domain strip — carries the registry accessibly
              (desktop keeps the sky chart; phones get these chips) */}
          <ul className="ln-constellation-strip">
            {CHIPS.map((c) => (
              <li key={c.name} className="ln-constellation-chip">
                <span className="ln-constellation-chip-dot" style={{ background: c.dot }} aria-hidden="true" />
                <span className="ln-constellation-chip-label">{c.name}</span>
                <span className="ln-constellation-chip-count">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </RevealCssClass>

      <RevealCssClass as="p" className="ln-categories-note" delay={3}>
        <Network size={14} aria-hidden="true" />
        منيو يشرح نفسه — تجربة رقمية واضحة تعرض أصنافك وتوصل الطلب إلى واتساب
        دون خطوات مربكة.
      </RevealCssClass>
    </section>
  )
}
