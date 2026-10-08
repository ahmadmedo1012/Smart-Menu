import { Network } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"

/* r128 Stage B (F1b) — Chapter 01 «الاكتشاف»: the categories constellation
 * (products→categories per the Smart-Menu slot mapping), adapted from the
 * golden Smart-Link ProductsSection (commit 7a1fac7). Server component: the
 * sky chart is a static SVG (dashed hairline rings) + DOM overlay dots with
 * CSS-only tooltips; the real names live in the focusable dots, the mobile
 * chips strip and the note. Content = the platform's REAL default category
 * registry (the auto-seeded set every new menu starts with —
 * subscription-decisions.ts / demo route) with REAL item examples from the
 * public demo menu (مقهى الواحة، /menu/al-waha-cafe), nothing invented. */

const LIME_DOT = "var(--ln-lime)"

/** The demo menu every pin opens — the real categories live there. */
const DEMO_MENU_URL = "/menu/al-waha-cafe"

/** The four real default categories — lime nodes on the inner orbits. */
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
  dot: LIME_DOT,
}))

export function CategoriesSection() {
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
        <div className="ln-constellation">
          {/* the sky chart — dashed hairline rings, flat violet heart */}
          <div className="ln-constellation-stage">
            <svg className="ln-constellation-svg" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 0 }} cx={500} cy={320} r={130} />
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 1 }} cx={500} cy={320} r={200} />
              <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 2 }} cx={500} cy={320} r={270} />
            </svg>

            {/* the real categories — focusable pins that open the demo menu */}
            {LIVE.map((p, i) => (
              <a
                key={p.name}
                href={p.href}
                className="ln-constellation-dot"
                style={{ left: p.left, top: p.top, ["--dot" as string]: LIME_DOT, ["--ln-ci" as string]: i }}
                aria-label={`${p.name} — شاهد الفئة في منيو مقهى الواحة`}
              >
                <span className="ln-constellation-tip">
                  <b>{p.name}</b>
                  <i>{p.sub}</i>
                </span>
              </a>
            ))}
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
